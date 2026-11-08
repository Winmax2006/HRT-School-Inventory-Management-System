/**
 * ==============================================================================
 * HRT School Inventory Management System - Central Database Engine
 * File: ValidateMigration.gs
 * Description: Data Quality Validator, Schema Verifier & Error Reporting Engine
 * ==============================================================================
 * 
 * Non-Negotiable Rule:
 * Never import invalid records silently. Every rejected record must be logged
 * with row number, entity key, field name, rejected value, and specific reason.
 */

var ValidateMigration = (function () {
  'use strict';

  // Master Category Thai Name to Category ID Mapping (ตาม ว ๙๖)
  var CATEGORY_MAP = {
    'วัสดุสำนักงาน': 'CAT-OFF',
    'วัสดุการศึกษา': 'CAT-EDU',
    'วัสดุคอมพิวเตอร์': 'CAT-COM',
    'วัสดุกีฬา': 'CAT-SPT',
    'วัสดุงานบ้านงานครัว': 'CAT-JAN',
    'วัสดุวิทยาศาสตร์หรือการแพทย์': 'CAT-MED',
    'วัสดุไฟฟ้าและวิทยุ': 'CAT-ELE',
    'วัสดุก่อสร้าง': 'CAT-CON'
  };

  // Master Location Thai Name to Location ID Mapping
  var LOCATION_MAP = {
    'ห้องพัสดุกลาง ชั้น 1': 'LOC-MAIN',
    'ห้องพัสดุกลาง': 'LOC-MAIN',
    'ห้องเซิร์ฟเวอร์ อาคาร 2': 'LOC-SRV2',
    'ห้องเซิร์ฟเวอร์': 'LOC-SRV2',
    'ห้องปฏิบัติการคอมพิวเตอร์ 1': 'LOC-LAB1',
    'ห้องปฏิบัติการคอมพิวเตอร์': 'LOC-LAB1',
    'ห้องพักครูพลศึกษา / โรงยิม': 'LOC-GYM',
    'โรงยิม': 'LOC-GYM',
    'ห้องเก็บอุปกรณ์แม่บ้าน': 'LOC-JAN',
    'ห้องพยาบาล อาคาร 1': 'LOC-MED',
    'ห้องพยาบาล': 'LOC-MED'
  };

  // Transaction Type Mapping
  var TXN_TYPE_MAP = {
    'เบิกใช้งาน': 'ISSUE',
    'จ่ายออก': 'ISSUE',
    'ISSUE': 'ISSUE',
    'รับเข้าสต็อก': 'RECEIVE',
    'รับเข้า': 'RECEIVE',
    'RECEIVE': 'RECEIVE',
    'ปรับยอด': 'ADJUSTMENT',
    'ADJUSTMENT': 'ADJUSTMENT'
  };

  /**
   * Validates a batch of parsed Master Item rows
   * @param {Object[]} rows Array of row objects from Master_Items.csv
   * @returns {Object} Validation report
   */
  function validateItems(rows) {
    var report = {
      isValid: true,
      entity: 'Master_Items',
      totalChecked: rows.length,
      validCount: 0,
      errorCount: 0,
      errors: [],
      seenItemCodes: {}
    };

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var rowNum = i + 2; // +1 header, 1-based row
      var itemErrors = [];

      // 1. Validate item_code
      var code = String(row.item_code || '').trim();
      if (!code) {
        itemErrors.push({ field: 'item_code', value: row.item_code, reason: 'Item code is missing or empty' });
      } else if (report.seenItemCodes[code]) {
        itemErrors.push({ field: 'item_code', value: code, reason: 'Duplicate item_code detected in CSV (first seen at row ' + report.seenItemCodes[code] + ')' });
      } else {
        report.seenItemCodes[code] = rowNum;
      }

      // 2. Validate item_name
      var name = String(row.item_name || '').trim();
      if (!name) {
        itemErrors.push({ field: 'item_name', value: row.item_name, reason: 'Item name is required' });
      }

      // 3. Validate category mapping
      var cat = String(row.category || '').trim();
      if (!cat) {
        itemErrors.push({ field: 'category', value: row.category, reason: 'Category is missing' });
      } else if (!CATEGORY_MAP[cat] && !Schema.TABLES[Config.SHEET_NAMES.CATEGORIES]) {
        itemErrors.push({ field: 'category', value: cat, reason: 'Unknown category "' + cat + '" does not map to 8 official categories' });
      }

      // 4. Validate unit
      var unit = String(row.unit || '').trim();
      if (!unit) {
        itemErrors.push({ field: 'unit', value: row.unit, reason: 'Unit of measure is missing' });
      }

      // 5. Validate unit_price
      var price = parseFloat(row.unit_price);
      if (isNaN(price) || price < 0) {
        itemErrors.push({ field: 'unit_price', value: row.unit_price, reason: 'Unit price must be a non-negative number' });
      }

      // 6. Validate min_stock
      var minStock = parseInt(row.min_stock, 10);
      if (isNaN(minStock) || minStock < 0) {
        itemErrors.push({ field: 'min_stock', value: row.min_stock, reason: 'Min stock must be a non-negative integer' });
      }

      // 7. Validate current_qty
      var curQty = parseInt(row.current_qty, 10);
      if (isNaN(curQty) || curQty < 0) {
        itemErrors.push({ field: 'current_qty', value: row.current_qty, reason: 'Current quantity must be a non-negative integer' });
      }

      // 8. Validate mathematical consistency (unit_price * current_qty ~= total_value)
      if (!isNaN(price) && !isNaN(curQty) && row.total_value !== undefined) {
        var statedVal = parseFloat(row.total_value);
        var calcVal = Math.round(price * curQty * 100) / 100;
        if (!isNaN(statedVal) && Math.abs(statedVal - calcVal) > 1.0) {
          itemErrors.push({
            field: 'total_value',
            value: statedVal,
            reason: 'Total value (' + statedVal + ') does not match price * qty (' + calcVal + ')'
          });
        }
      }

      if (itemErrors.length > 0) {
        report.errorCount++;
        for (var e = 0; e < itemErrors.length; e++) {
          report.errors.push({
            rowNumber: rowNum,
            entity: 'ITEM',
            code: code || 'UNKNOWN',
            field: itemErrors[e].field,
            value: itemErrors[e].value,
            reason: itemErrors[e].reason
          });
        }
      } else {
        report.validCount++;
      }
    }

    report.isValid = (report.errorCount === 0);
    return report;
  }

  /**
   * Validates a batch of parsed Transaction rows
   * @param {Object[]} rows Array of row objects from Transactions.csv
   * @param {Object} validItemCodes Map of valid item codes
   * @returns {Object} Validation report
   */
  function validateTransactions(rows, validItemCodes) {
    var report = {
      isValid: true,
      entity: 'Transactions',
      totalChecked: rows.length,
      validCount: 0,
      errorCount: 0,
      errors: [],
      seenTxnIds: {}
    };

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var rowNum = i + 2;
      var txnErrors = [];

      // 1. Validate transaction_id
      var txnId = String(row.transaction_id || '').trim();
      if (!txnId) {
        txnErrors.push({ field: 'transaction_id', value: row.transaction_id, reason: 'Transaction ID is required' });
      } else if (report.seenTxnIds[txnId]) {
        txnErrors.push({ field: 'transaction_id', value: txnId, reason: 'Duplicate transaction_id detected (row ' + report.seenTxnIds[txnId] + ')' });
      } else {
        report.seenTxnIds[txnId] = rowNum;
      }

      // 2. Validate date
      var dateStr = String(row.date || '').trim();
      if (!dateStr) {
        txnErrors.push({ field: 'date', value: row.date, reason: 'Transaction date is required' });
      } else {
        var parsedDate = new Date(dateStr);
        if (isNaN(parsedDate.getTime())) {
          txnErrors.push({ field: 'date', value: dateStr, reason: 'Invalid date format' });
        }
      }

      // 3. Validate item_code exists in master items
      var code = String(row.item_code || '').trim();
      if (!code) {
        txnErrors.push({ field: 'item_code', value: row.item_code, reason: 'Item code is missing' });
      } else if (validItemCodes && !validItemCodes[code]) {
        txnErrors.push({ field: 'item_code', value: code, reason: 'Item code "' + code + '" does not exist in Master Catalog' });
      }

      // 4. Validate transaction_type mapping
      var tType = String(row.transaction_type || '').trim();
      if (!tType) {
        txnErrors.push({ field: 'transaction_type', value: row.transaction_type, reason: 'Transaction type is missing' });
      } else if (!TXN_TYPE_MAP[tType]) {
        txnErrors.push({ field: 'transaction_type', value: tType, reason: 'Unknown transaction type "' + tType + '"' });
      }

      // 5. Validate quantity
      var qty = parseInt(row.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        txnErrors.push({ field: 'quantity', value: row.quantity, reason: 'Quantity must be a positive integer (> 0)' });
      }

      // 6. Validate user_name
      var user = String(row.user_name || '').trim();
      if (!user) {
        txnErrors.push({ field: 'user_name', value: row.user_name, reason: 'User name is required for audit trail' });
      }

      if (txnErrors.length > 0) {
        report.errorCount++;
        for (var e = 0; e < txnErrors.length; e++) {
          report.errors.push({
            rowNumber: rowNum,
            entity: 'TRANSACTION',
            id: txnId || 'UNKNOWN',
            field: txnErrors[e].field,
            value: txnErrors[e].value,
            reason: txnErrors[e].reason
          });
        }
      } else {
        report.validCount++;
      }
    }

    report.isValid = (report.errorCount === 0);
    return report;
  }

  return {
    CATEGORY_MAP: CATEGORY_MAP,
    LOCATION_MAP: LOCATION_MAP,
    TXN_TYPE_MAP: TXN_TYPE_MAP,
    validateItems: validateItems,
    validateTransactions: validateTransactions
  };
})();
