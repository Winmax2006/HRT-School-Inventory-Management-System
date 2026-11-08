/**
 * ==============================================================================
 * HRT School Inventory Management System - Central Database Engine
 * File: Database.gs
 * Description: Google Sheets Data Access Layer, CRUD Abstraction & Audit Trail
 * ==============================================================================
 * 
 * Rules:
 * 1. Sheet Row Numbers are never exposed to business logic
 * 2. Concurrency-safe operations via withLock()
 * 3. Immutable append-only behavior for Stock Ledger (08) & Audit Log (09)
 * 4. Automatic timestamp management (created_at, updated_at in GMT+7)
 */

var Database = (function () {
  'use strict';

  /**
   * Concurrency-safe lock wrapper
   * @param {Function} callback Function to execute inside critical section
   * @param {number} [timeoutMs] Timeout in milliseconds (default: 30000)
   * @returns {*} Result of the callback
   */
  function withLock(callback, timeoutMs) {
    timeoutMs = timeoutMs || parseInt(Config.getProperty('LOCK_TIMEOUT_MS', '30000'), 10);
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(timeoutMs);
      return callback();
    } catch (e) {
      Logger.log('Lock error: ' + e.message);
      throw new Error('CONCURRENCY_LOCK_TIMEOUT: Operation timed out waiting for database lock (' + e.message + ')');
    } finally {
      try {
        lock.releaseLock();
      } catch (err) {
        // Ignored
      }
    }
  }

  /**
   * Retrieves a sheet by its standard table name
   * @param {string} sheetName Name of the sheet (e.g., '01_Users')
   * @returns {GoogleAppsScript.Spreadsheet.Sheet}
   */
  function getSheet(sheetName) {
    var ss = Config.getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error('DATABASE_SHEET_NOT_FOUND: Table sheet "' + sheetName + '" does not exist. Run setupDatabase() first.');
    }
    return sheet;
  }

  /**
   * Retrieves column headers from Row 1
   * @param {string} sheetName
   * @returns {string[]}
   */
  function getHeaders(sheetName) {
    var sheet = getSheet(sheetName);
    var lastCol = sheet.getLastColumn();
    if (lastCol === 0) return [];
    return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
      return String(h).trim();
    });
  }

  /**
   * Reads all records from a table into an array of plain JavaScript objects
   * @param {string} sheetName
   * @param {Function} [filterFn] Optional predicate function (record => boolean)
   * @returns {Object[]}
   */
  function getRecords(sheetName, filterFn) {
    var sheet = getSheet(sheetName);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (lastRow <= 1 || lastCol === 0) {
      return [];
    }

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    var results = [];

    for (var r = 0; r < data.length; r++) {
      var row = data[r];
      var record = {};
      var isEmptyRow = true;

      for (var c = 0; c < headers.length; c++) {
        var key = String(headers[c]).trim();
        if (key) {
          var val = row[c];
          // Handle Date objects formatting
          if (val instanceof Date) {
            val = Utilities.formatDate(val, 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
          }
          record[key] = val;
          if (val !== '' && val !== null && val !== undefined) {
            isEmptyRow = false;
          }
        }
      }

      if (!isEmptyRow) {
        if (!filterFn || filterFn(record)) {
          results.push(record);
        }
      }
    }

    return results;
  }

  /**
   * Finds a single record matching primary key value
   * @param {string} sheetName
   * @param {string} pkValue
   * @returns {Object|null}
   */
  function getRecordByPk(sheetName, pkValue) {
    var tableDef = Schema.TABLES[sheetName];
    var pkField = tableDef ? tableDef.pkField : getHeaders(sheetName)[0];

    var matches = getRecords(sheetName, function (rec) {
      return String(rec[pkField]) === String(pkValue);
    });

    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Inserts a single record into the specified table
   * Automatically assigns timestamps (created_at, updated_at)
   * @param {string} sheetName
   * @param {Object} recordData Key-value record
   * @returns {Object} Complete inserted record with all fields
   */
  function insertRecord(sheetName, recordData) {
    return withLock(function () {
      var sheet = getSheet(sheetName);
      var headers = getHeaders(sheetName);
      var nowIso = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');

      // Auto-populate timestamps
      if (headers.indexOf('created_at') !== -1 && !recordData['created_at']) {
        recordData['created_at'] = nowIso;
      }
      if (headers.indexOf('updated_at') !== -1 && !recordData['updated_at']) {
        recordData['updated_at'] = nowIso;
      }

      var rowValues = [];
      for (var i = 0; i < headers.length; i++) {
        var field = headers[i];
        var val = recordData[field];
        if (val === undefined || val === null) {
          val = '';
        }
        rowValues.push(val);
      }

      sheet.appendRow(rowValues);
      return recordData;
    });
  }

  /**
   * Bulk insert multiple records into a table (optimized batch write)
   * @param {string} sheetName
   * @param {Object[]} recordsArray Array of record objects
   * @returns {number} Number of inserted records
   */
  function insertRecords(sheetName, recordsArray) {
    if (!recordsArray || recordsArray.length === 0) return 0;

    return withLock(function () {
      var sheet = getSheet(sheetName);
      var headers = getHeaders(sheetName);
      var nowIso = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
      var rowsToAppend = [];

      for (var r = 0; r < recordsArray.length; r++) {
        var recordData = recordsArray[r];
        if (headers.indexOf('created_at') !== -1 && !recordData['created_at']) {
          recordData['created_at'] = nowIso;
        }
        if (headers.indexOf('updated_at') !== -1 && !recordData['updated_at']) {
          recordData['updated_at'] = nowIso;
        }

        var rowValues = [];
        for (var c = 0; c < headers.length; c++) {
          var field = headers[c];
          var val = recordData[field];
          if (val === undefined || val === null) {
            val = '';
          }
          rowValues.push(val);
        }
        rowsToAppend.push(rowValues);
      }

      var startRow = sheet.getLastRow() + 1;
      var numRows = rowsToAppend.length;
      var numCols = headers.length;

      sheet.getRange(startRow, 1, numRows, numCols).setValues(rowsToAppend);
      return numRows;
    });
  }

  /**
   * Updates an existing record identified by primary key
   * Prevents overwriting PK field and maintains updated_at
   * @param {string} sheetName
   * @param {string} pkValue
   * @param {Object} updates Key-value updates
   * @returns {Object} Updated record object
   */
  function updateRecord(sheetName, pkValue, updates) {
    return withLock(function () {
      var sheet = getSheet(sheetName);
      var tableDef = Schema.TABLES[sheetName];
      var pkField = tableDef ? tableDef.pkField : getHeaders(sheetName)[0];

      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow <= 1) {
        throw new Error('DATABASE_RECORD_NOT_FOUND: Table is empty, cannot update PK ' + pkValue);
      }

      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
        return String(h).trim();
      });
      var pkColIdx = headers.indexOf(pkField);
      if (pkColIdx === -1) {
        throw new Error('DATABASE_PK_NOT_FOUND: PK column "' + pkField + '" not found in sheet ' + sheetName);
      }

      // Find the row index (2-indexed)
      var pkRange = sheet.getRange(2, pkColIdx + 1, lastRow - 1, 1).getValues();
      var targetRowIdx = -1;

      for (var r = 0; r < pkRange.length; r++) {
        if (String(pkRange[r][0]) === String(pkValue)) {
          targetRowIdx = r + 2; // Row number in sheet (1-based, +header)
          break;
        }
      }

      if (targetRowIdx === -1) {
        throw new Error('DATABASE_RECORD_NOT_FOUND: Record with PK "' + pkValue + '" not found in ' + sheetName);
      }

      // Fetch current row values
      var currentRowValues = sheet.getRange(targetRowIdx, 1, 1, lastCol).getValues()[0];
      var nowIso = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
      var updatedRecord = {};

      for (var c = 0; c < headers.length; c++) {
        var fld = headers[c];
        if (fld === pkField) {
          // Never change PK
          updatedRecord[fld] = currentRowValues[c];
        } else if (fld === 'updated_at') {
          updatedRecord[fld] = nowIso;
          currentRowValues[c] = nowIso;
        } else if (updates.hasOwnProperty(fld)) {
          updatedRecord[fld] = updates[fld];
          currentRowValues[c] = updates[fld];
        } else {
          updatedRecord[fld] = currentRowValues[c];
        }
      }

      // Write back updated row
      sheet.getRange(targetRowIdx, 1, 1, lastCol).setValues([currentRowValues]);
      return updatedRecord;
    });
  }

  /**
   * System Audit Logger: Records event into 09_Audit_Log
   * @param {string} action CREATE, UPDATE, DELETE, APPROVE, POST, etc.
   * @param {string} entityName Target table name
   * @param {string} entityId Primary key of target entity
   * @param {Object} [beforeData] Snapshot before modification
   * @param {Object} [afterData] Snapshot after modification
   * @param {string} [userId] Acting user ID
   * @param {string} [ipAddress] Client IP address
   * @param {string} [details] Human-readable description
   * @returns {string} audit_id
   */
  function logAudit(action, entityName, entityId, beforeData, afterData, userId, ipAddress, details) {
    try {
      var auditId = IdService.generateAuditId();
      var nowIso = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');

      var entry = {
        audit_id: auditId,
        timestamp: nowIso,
        user_id: userId || 'USR-001',
        action: action,
        entity_name: entityName,
        entity_id: String(entityId || ''),
        old_values: beforeData ? JSON.stringify(beforeData) : '',
        new_values: afterData ? JSON.stringify(afterData) : '',
        ip_address: ipAddress || '127.0.0.1',
        user_agent: 'AppsScript-Engine',
        status: 'SUCCESS',
        details: details || ''
      };

      // Append directly without throwing to protect calling business logic
      var sheet = getSheet(Config.SHEET_NAMES.AUDIT_LOG);
      var headers = getHeaders(Config.SHEET_NAMES.AUDIT_LOG);
      var row = headers.map(function (h) {
        return entry[h] !== undefined ? entry[h] : '';
      });
      sheet.appendRow(row);
      return auditId;
    } catch (e) {
      Logger.log('Audit Log Warning: Failed to record audit log: ' + e.message);
      return 'AUD-FALLBACK-' + Date.now();
    }
  }

  return {
    withLock: withLock,
    getSheet: getSheet,
    getHeaders: getHeaders,
    getRecords: getRecords,
    getRecordByPk: getRecordByPk,
    insertRecord: insertRecord,
    insertRecords: insertRecords,
    updateRecord: updateRecord,
    logAudit: logAudit
  };
})();
