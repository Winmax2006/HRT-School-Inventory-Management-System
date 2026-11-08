/**
 * Database.gs - Low-level Sheet Reader / Writer & In-Memory Store Adapter
 * Layer: Data Layer
 * Standard: Fast batching, formula protection, zero business logic
 */

const Database = (function() {
  // In-memory fallback database for local execution and unit tests
  const _mockStore = {};

  function isSpreadsheetAppAvailable() {
    try {
      return typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp !== null;
    } catch (e) {
      return false;
    }
  }

  function getSpreadsheet() {
    if (!isSpreadsheetAppAvailable()) return null;

    // Check Config if present
    if (typeof CONFIG !== 'undefined' && CONFIG.SPREADSHEET_ID) {
      return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    }

    try {
      const active = SpreadsheetApp.getActiveSpreadsheet();
      if (active) return active;
    } catch (e) {
      // Fallback to property service if configured
      try {
        const props = PropertiesService.getScriptProperties();
        const id = props.getProperty('SPREADSHEET_ID');
        if (id) return SpreadsheetApp.openById(id);
      } catch (err) {}
    }
    return null;
  }

  function getSheet(sheetName) {
    if (!sheetName) throw new Error('Sheet name is required');

    if (!isSpreadsheetAppAvailable()) {
      if (!_mockStore[sheetName]) {
        _mockStore[sheetName] = [];
      }
      return null; // Signals mock mode
    }

    const ss = getSpreadsheet();
    if (!ss) return null;

    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      if (typeof Schema !== 'undefined') {
        try {
          const headers = Schema.getHeaders(sheetName);
          sheet.appendRow(headers);
          sheet.setFrozenRows(1);
        } catch (e) {}
      }
    }
    return sheet;
  }

  function readAllRows(sheetName) {
    const sheet = getSheet(sheetName);
    if (!sheet) {
      // Mock store mode
      if (!_mockStore[sheetName]) {
        _mockStore[sheetName] = [];
      }
      return _mockStore[sheetName].map(r => [...r]);
    }

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < 1 || lastCol < 1) return [];

    return sheet.getRange(1, 1, lastRow, lastCol).getValues();
  }

  function appendRow(sheetName, rowArray) {
    const sheet = getSheet(sheetName);
    if (!sheet) {
      if (!_mockStore[sheetName]) _mockStore[sheetName] = [];
      _mockStore[sheetName].push([...rowArray]);
      return _mockStore[sheetName].length;
    }

    sheet.appendRow(rowArray);
    return sheet.getLastRow();
  }

  function appendRows(sheetName, rowsArray) {
    if (!rowsArray || !rowsArray.length) return 0;
    const sheet = getSheet(sheetName);
    if (!sheet) {
      if (!_mockStore[sheetName]) _mockStore[sheetName] = [];
      rowsArray.forEach(r => _mockStore[sheetName].push([...r]));
      return _mockStore[sheetName].length;
    }

    const startRow = sheet.getLastRow() + 1;
    const numCols = rowsArray[0].length;
    sheet.getRange(startRow, 1, rowsArray.length, numCols).setValues(rowsArray);
    return sheet.getLastRow();
  }

  function updateRow(sheetName, rowIndex, rowArray) {
    if (rowIndex < 1) throw new Error(`Invalid row index: ${rowIndex}`);
    const sheet = getSheet(sheetName);
    if (!sheet) {
      if (!_mockStore[sheetName]) _mockStore[sheetName] = [];
      // rowIndex is 1-indexed (1 is header, 2 is index 1 in mock)
      const zeroIdx = rowIndex - 1;
      _mockStore[sheetName][zeroIdx] = [...rowArray];
      return true;
    }

    sheet.getRange(rowIndex, 1, 1, rowArray.length).setValues([rowArray]);
    return true;
  }

  function deleteRow(sheetName, rowIndex) {
    if (rowIndex < 1) throw new Error(`Invalid row index: ${rowIndex}`);
    const sheet = getSheet(sheetName);
    if (!sheet) {
      if (!_mockStore[sheetName]) return false;
      const zeroIdx = rowIndex - 1;
      _mockStore[sheetName].splice(zeroIdx, 1);
      return true;
    }

    sheet.deleteRow(rowIndex);
    return true;
  }

  // Helper for mock store manipulation in tests
  function resetMockStore(initialData) {
    for (let k in _mockStore) {
      delete _mockStore[k];
    }
    if (initialData) {
      for (let table in initialData) {
        _mockStore[table] = initialData[table].map(row => [...row]);
      }
    }
  }

  function getMockStoreData(sheetName) {
    return _mockStore[sheetName] ? _mockStore[sheetName].map(r => [...r]) : null;
  }

  return {
    isSpreadsheetAppAvailable,
    getSpreadsheet,
    getSheet,
    readAllRows,
    appendRow,
    appendRows,
    updateRow,
    deleteRow,
    resetMockStore,
    getMockStoreData
  };
})();
