/**
 * ==============================================================================
 * HRT School Inventory Management System - Central Database Engine
 * File: ImportMasterItems.gs
 * Description: Master Catalog Extraction, Transformation & Ingestion Service
 * ==============================================================================
 */

var ImportMasterItems = (function () {
  'use strict';

  /**
   * RFC-4180 compliant CSV text parser
   * @param {string} csvText
   * @returns {Object[]} Array of row objects keyed by header names
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
   * Imports Master Items from CSV content into 03_Items table
   * @param {string} csvContent Raw CSV text
   * @param {boolean} [allowPartial] If false, aborts if any validation error occurs
   * @returns {Object} Import execution result and diagnostics
   */
  function importFromCsv(csvContent, allowPartial) {
    var rawRows = parseCSV(csvContent);
    if (rawRows.length === 0) {
      throw new Error('IMPORT_ERROR: Master_Items.csv contains no valid rows.');
    }

    // Stage 1: Validation
    var validationReport = ValidateMigration.validateItems(rawRows);

    if (!validationReport.isValid && !allowPartial) {
      Logger.log('Validation Failed: ' + validationReport.errorCount + ' errors found in Master Items.');
      return {
        success: false,
        phase: 'VALIDATE',
        message: 'Master Items validation failed. Strict mode halted import.',
        errorReport: validationReport,
        importedCount: 0,
        skippedCount: rawRows.length
      };
    }

    // Stage 2: Transform & Ingest
    return Database.withLock(function () {
      var sheet = Database.getSheet(Config.SHEET_NAMES.ITEMS);
      var existingItems = Database.getRecords(Config.SHEET_NAMES.ITEMS);
      var existingCodes = {};
      for (var ex = 0; ex < existingItems.length; ex++) {
        existingCodes[existingItems[ex].item_code] = existingItems[ex].item_id;
      }

      var fy = Config.getActiveFiscalYear();
      var nowIso = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
      var itemsToInsert = [];
      var itemsMap = {}; // item_code => item_id

      for (var i = 0; i < rawRows.length; i++) {
        var row = rawRows[i];
        var code = String(row.item_code).trim();

        // If existing in sheet, preserve ID
        if (existingCodes[code]) {
          itemsMap[code] = existingCodes[code];
          continue;
        }

        var catId = ValidateMigration.CATEGORY_MAP[row.category] || 'CAT-OFF';
        var locId = ValidateMigration.LOCATION_MAP[row.location] || 'LOC-MAIN';
        var price = parseFloat(row.unit_price) || 0;
        var minStock = parseInt(row.min_stock, 10) || 5;
        var rop = Math.round(minStock * 1.5);
        var itemId = 'ITM-' + code;

        itemsMap[code] = itemId;

        itemsToInsert.push({
          item_id: itemId,
          item_code: code,
          item_name: row.item_name,
          category_id: catId,
          location_id: locId,
          fsn_code: '',
          unit: row.unit || 'ชิ้น',
          unit_cost: price,
          min_stock: minStock,
          reorder_point: rop,
          supplier_name: 'คู่สัญญาจัดจำหน่ายพัสดุสถานศึกษา',
          spec_summary: 'คุณลักษณะเฉพาะพัสดุมาตรฐานตามบัญชีคุม',
          is_active: 'TRUE',
          created_at: nowIso,
          updated_at: nowIso
        });
      }

      var insertedCount = 0;
      if (itemsToInsert.length > 0) {
        insertedCount = Database.insertRecords(Config.SHEET_NAMES.ITEMS, itemsToInsert);
      }

      Database.logAudit(
        'IMPORT',
        Config.SHEET_NAMES.ITEMS,
        'BATCH_' + Date.now(),
        null,
        { inserted: insertedCount, skipped: rawRows.length - insertedCount },
        'USR-001',
        'SERVER',
        'Master Items CSV imported successfully'
      );

      return {
        success: true,
        phase: 'IMPORT',
        totalRows: rawRows.length,
        importedCount: insertedCount,
        skippedCount: rawRows.length - insertedCount,
        errorReport: validationReport,
        itemsMap: itemsMap
      };
    });
  }

  return {
    parseCSV: parseCSV,
    importFromCsv: importFromCsv
  };
})();
