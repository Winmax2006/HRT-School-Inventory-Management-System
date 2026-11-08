/**
 * Repository.gs - Generic Typed CRUD Repository Layer
 * Layer: Data Layer
 * Standard: Double-Entry Immutable Enforcement & Dynamic Column Binding
 */

const Repository = (function() {
  function getTableData(tableName) {
    const rawRows = Database.readAllRows(tableName);
    if (!rawRows || rawRows.length === 0) {
      return { headers: Schema.getHeaders(tableName), rows: [] };
    }
    const headers = rawRows[0].map(h => String(h || '').trim().toLowerCase());
    const dataRows = rawRows.slice(1);
    return { headers, rows: dataRows };
  }

  function findAll(tableName, filterFn) {
    const { headers, rows } = getTableData(tableName);
    const results = [];

    rows.forEach((row, idx) => {
      // Skip completely empty rows
      if (!row || row.every(cell => cell === '' || cell === null || cell === undefined)) {
        return;
      }
      const item = Schema.mapRowToObject(tableName, row, headers);
      item._rowIndex = idx + 2; // 1-indexed, accounting for header row
      if (!filterFn || filterFn(item)) {
        results.push(item);
      }
    });

    return results;
  }

  function findById(tableName, idValue, idFieldOverride) {
    const idField = (idFieldOverride || Schema.getPrimaryKey(tableName)).toLowerCase();
    const cleanId = String(idValue || '').trim().toLowerCase();
    const items = findAll(tableName, item => {
      const val = String(item[idField] || '').trim().toLowerCase();
      return val === cleanId;
    });
    return items.length > 0 ? items[0] : null;
  }

  function findBy(tableName, fieldName, value) {
    const cleanField = String(fieldName).trim().toLowerCase();
    const cleanVal = String(value || '').trim().toLowerCase();
    return findAll(tableName, item => {
      const val = String(item[cleanField] || '').trim().toLowerCase();
      return val === cleanVal;
    });
  }

  function insert(tableName, entity) {
    const { headers } = getTableData(tableName);
    const rowValues = Schema.mapObjectToRow(tableName, entity, headers);
    const rowIndex = Database.appendRow(tableName, rowValues);
    return {
      ...entity,
      _rowIndex: rowIndex
    };
  }

  function insertBatch(tableName, entities) {
    if (!entities || entities.length === 0) return [];
    const { headers } = getTableData(tableName);
    const rowsArray = entities.map(item => Schema.mapObjectToRow(tableName, item, headers));
    Database.appendRows(tableName, rowsArray);
    return entities;
  }

  function update(tableName, idValue, updates, idFieldOverride) {
    // Immutable rule: Never allow direct updates on Stock_Ledger
    if (tableName === Schema.TABLES.STOCK_LEDGER) {
      throw new Error('Double-Entry Violation: Stock_Ledger is strictly append-only. Updates are prohibited.');
    }

    const idField = (idFieldOverride || Schema.getPrimaryKey(tableName)).toLowerCase();
    const existing = findById(tableName, idValue, idField);
    if (!existing) {
      throw new Error(`Record not found in ${tableName} with ${idField}=${idValue}`);
    }

    const merged = { ...existing, ...updates };
    const { headers } = getTableData(tableName);
    const updatedRow = Schema.mapObjectToRow(tableName, merged, headers);

    Database.updateRow(tableName, existing._rowIndex, updatedRow);
    return merged;
  }

  function deleteRecord(tableName, idValue, idFieldOverride) {
    // Immutable rule: Never allow delete on Stock_Ledger or Audit_Trail
    if (tableName === Schema.TABLES.STOCK_LEDGER || tableName === Schema.TABLES.AUDIT_TRAIL) {
      throw new Error(`Audit / Ledger Violation: Direct deletion from ${tableName} is strictly forbidden.`);
    }

    const idField = (idFieldOverride || Schema.getPrimaryKey(tableName)).toLowerCase();
    const existing = findById(tableName, idValue, idField);
    if (!existing) {
      throw new Error(`Record not found in ${tableName} with ${idField}=${idValue}`);
    }

    return Database.deleteRow(tableName, existing._rowIndex);
  }

  function count(tableName, filterFn) {
    return findAll(tableName, filterFn).length;
  }

  return {
    findAll,
    findById,
    findBy,
    insert,
    insertBatch,
    update,
    deleteRecord,
    count
  };
})();
