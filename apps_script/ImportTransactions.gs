/**
 * ==============================================================================
 * HRT School Inventory Management System - Central Database Engine
 * File: ImportTransactions.gs
 * Description: Historical Transaction Extraction, Validation & Ingestion Service
 * ==============================================================================
 */

var ImportTransactions = (function () {
  'use strict';

  /**
   * RFC-4180 compliant CSV text parser
   * @param {string} csvText
   * @returns {Object[]} Array of row objects
   */
  function parseCSV(csvText) {
    if (!csvText || !csvText.trim()) return [];

    var lines = Utilities.parseCsv(csvText.trim());
    if (lines.length <= 1) return [];

    var headers = lines[0].map(function (h) {
      return String(h).trim();
    });

    var records = [];
    for (var i = 1; i < lines.length; i++) {
      var row = lines[i];
      var isAllEmpty = true;
      var obj = {};

      for (var c = 0; c < headers.length; c++) {
        var val = (row[c] !== undefined && row[c] !== null) ? String(row[c]).trim() : '';
        obj[headers[c]] = val;
        if (val !== '') isAllEmpty = false;
      }

      if (!isAllEmpty) {
        records.push(obj);
      }
    }

    return records;
  }

  /**
   * Determines fiscal year ID from date string (YYYY-MM-DD)
   * Thai fiscal year runs Oct 1 to Sep 30 (CE year + 543, +1 if month >= 10)
   * @param {string} dateStr
   * @returns {string} e.g. 'FY-2567'
   */
  function getFiscalYearFromDate(dateStr) {
    if (!dateStr) return Config.getActiveFiscalYear();
    var parts = dateStr.split('-');
    if (parts.length < 3) return Config.getActiveFiscalYear();
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10);
    var fy = year + 543;
    if (month >= 10) {
      fy += 1;
    }
    return 'FY-' + fy;
  }

  /**
   * Imports Historical Transactions from CSV content into 06_Transactions & 07_Transaction_Items
   * @param {string} csvContent Raw CSV text
   * @param {Object} [itemsCodeMap] Map of item_code => item object (or null to load from 03_Items)
   * @param {boolean} [allowPartial] If false, aborts if any validation error occurs
   * @returns {Object} Import execution result and diagnostics
   */
  function importFromCsv(csvContent, itemsCodeMap, allowPartial) {
    var rawRows = parseCSV(csvContent);
    if (rawRows.length === 0) {
      throw new Error('IMPORT_ERROR: Transactions.csv contains no valid rows.');
    }

    // Resolve Master Items if not provided
    if (!itemsCodeMap) {
      var itemsRecords = Database.getRecords(Config.SHEET_NAMES.ITEMS);
      itemsCodeMap = {};
      for (var k = 0; k < itemsRecords.length; k++) {
        var it = itemsRecords[k];
        itemsCodeMap[it.item_code] = it;
      }
    }

    // Build validItemCodes map for validator
    var validItemCodes = {};
    for (var code in itemsCodeMap) {
      validItemCodes[code] = true;
    }

    // Stage 1: Validation
    var validationReport = ValidateMigration.validateTransactions(rawRows, validItemCodes);

    if (!validationReport.isValid && !allowPartial) {
      Logger.log('Validation Failed: ' + validationReport.errorCount + ' errors found in Transactions.');
      return {
        success: false,
        phase: 'VALIDATE',
        message: 'Transactions validation failed. Strict mode halted import.',
        errorReport: validationReport,
        importedCount: 0,
        skippedCount: rawRows.length
      };
    }

    // Stage 2: Transform & Ingest
    return Database.withLock(function () {
      var existingTxns = Database.getRecords(Config.SHEET_NAMES.TRANSACTIONS);
      var existingTxnIds = {};
      for (var ex = 0; ex < existingTxns.length; ex++) {
        existingTxnIds[existingTxns[ex].transaction_id] = true;
      }

      var headersToInsert = [];
      var itemsToInsert = [];
      var skippedCount = 0;

      for (var i = 0; i < rawRows.length; i++) {
        var row = rawRows[i];
        var txnId = String(row.transaction_id).trim();

        // Idempotency: Skip if already imported
        if (existingTxnIds[txnId]) {
          skippedCount++;
          continue;
        }

        var item = itemsCodeMap[row.item_code] || {
          item_id: 'ITM-' + row.item_code,
          location_id: 'LOC-MAIN',
          unit_cost: 0
        };

        var txnType = ValidateMigration.TXN_TYPE_MAP[row.transaction_type] || 'ISSUE';
        var fyId = getFiscalYearFromDate(row.date);
        var qty = parseInt(row.quantity, 10) || 0;
        var unitCost = parseFloat(item.unit_cost) || 0;
        var totalCost = Math.round(qty * unitCost * 100) / 100;
        var timestamp = row.date + ' 09:00:00';

        // 1. Transaction Header (06_Transactions)
        headersToInsert.push({
          transaction_id: txnId,
          doc_no: txnId,
          fiscal_year_id: fyId,
          transaction_type: txnType,
          ref_doc_type: 'MANUAL',
          ref_doc_id: 'LEGACY-MIGRATION',
          transaction_date: row.date,
          performed_by: 'USR-001',
          counterparty: row.user_name || 'ผู้ขอเบิกพัสดุ',
          notes: 'นำเข้าข้อมูลย้อนหลัง (Historical Data Migration)',
          status: 'POSTED',
          created_at: timestamp,
          updated_at: timestamp
        });

        // 2. Transaction Detail (07_Transaction_Items)
        var detailId = 'TXI-' + txnId.replace(/^TX-/, '') + '-1';
        itemsToInsert.push({
          txn_item_id: detailId,
          transaction_id: txnId,
          item_id: item.item_id,
          location_id: item.location_id || 'LOC-MAIN',
          quantity: qty,
          unit_cost: unitCost,
          total_cost: totalCost,
          ref_req_item_id: '',
          notes: 'นำเข้าประวัติย้อนหลัง: ' + (row.user_name || ''),
          created_at: timestamp
        });
      }

      var insertedHeaders = 0;
      var insertedDetails = 0;

      if (headersToInsert.length > 0) {
        insertedHeaders = Database.insertRecords(Config.SHEET_NAMES.TRANSACTIONS, headersToInsert);
      }
      if (itemsToInsert.length > 0) {
        insertedDetails = Database.insertRecords(Config.SHEET_NAMES.TRANSACTION_ITEMS, itemsToInsert);
      }

      Database.logAudit(
        'IMPORT',
        Config.SHEET_NAMES.TRANSACTIONS,
        'BATCH_' + Date.now(),
        null,
        { insertedHeaders: insertedHeaders, insertedDetails: insertedDetails, skipped: skippedCount },
        'USR-001',
        'SERVER',
        'Historical Transactions CSV imported successfully'
      );

      return {
        success: true,
        phase: 'IMPORT',
        totalRows: rawRows.length,
        importedCount: insertedHeaders,
        skippedCount: skippedCount,
        errorReport: validationReport
      };
    });
  }

  return {
    parseCSV: parseCSV,
    getFiscalYearFromDate: getFiscalYearFromDate,
    importFromCsv: importFromCsv
  };
})();
