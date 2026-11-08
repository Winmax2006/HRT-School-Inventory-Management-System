/**
 * ==============================================================================
 * HRT School Inventory Management System - Central Database Engine
 * File: MigrationService.gs
 * Description: End-to-End Migration Pipeline Orchestrator (6-Stage Pipeline)
 * ==============================================================================
 * 
 * Pipeline Architecture:
 * Stage 1: Extract    -> Parse Master_Items.csv & Transactions.csv
 * Stage 2: Validate   -> Schema, Data Type, Enumeration & Business Rules Check
 * Stage 3: Transform  -> Category IDs (ว ๙๖), Location IDs, FY Mapping
 * Stage 4: Import     -> Idempotent Ingestion to 03_Items, 06_Transactions, 07_Transaction_Items
 * Stage 5: Verify     -> Row Count, Foreign Key Integrity, Concurrency Verification
 * Stage 6: Reconcile  -> Opening + Receive - Issue ± Adjustment = Calculated vs Current Balance
 * 
 * Non-Negotiable Rule:
 * Never import invalid records silently. If any validation fails, halt and generate Error Report.
 */

var MigrationService = (function () {
  'use strict';

  /**
   * Executes the complete 6-Stage Migration Pipeline
   * @param {string} [masterItemsCsv] Optional CSV string (defaults to embedded raw data)
   * @param {string} [transactionsCsv] Optional CSV string (defaults to embedded raw data)
   * @param {Object} [options] Options: { allowPartial: false, persistLedger: true }
   * @returns {Object} Comprehensive Migration Execution & Reconciliation Report
   */
  function runMigrationPipeline(masterItemsCsv, transactionsCsv, options) {
    options = options || {};
    var allowPartial = options.allowPartial === true;
    var persistLedger = options.persistLedger !== false;

    var startTime = new Date();
    var report = {
      pipelineVersion: '1.0.0-pilot',
      startedAt: Utilities.formatDate(startTime, 'GMT+7', 'yyyy-MM-dd HH:mm:ss'),
      status: 'PENDING',
      stages: {
        extract: { success: false, itemsExtracted: 0, transactionsExtracted: 0 },
        validate: { success: false, itemErrors: 0, transactionErrors: 0, errorReports: {} },
        transform: { success: false, itemsMapped: 0, transactionsMapped: 0 },
        import: { success: false, itemsImported: 0, transactionsImported: 0, detailsImported: 0 },
        verify: { success: false, checksPassed: 0, checksFailed: 0, details: [] },
        reconcile: { success: false, matched: 0, discrepancies: 0, isFullyReconciled: false, totalLedgerEntries: 0 }
      },
      summary: {},
      durationMs: 0
    };

    try {
      // --------------------------------------------------------------------------
      // STAGE 1: EXTRACT
      // --------------------------------------------------------------------------
      Logger.log('[MIGRATION] Stage 1: Extract starting...');
      var itemsCsvText = masterItemsCsv || getEmbeddedMasterItemsCsv();
      var txnsCsvText = transactionsCsv || getEmbeddedTransactionsCsv();

      if (!itemsCsvText || !itemsCsvText.trim()) {
        throw new Error('EXTRACT_FAILED: Master_Items CSV content is empty.');
      }
      if (!txnsCsvText || !txnsCsvText.trim()) {
        throw new Error('EXTRACT_FAILED: Transactions CSV content is empty.');
      }

      var rawItems = ImportMasterItems.parseCSV(itemsCsvText);
      var rawTxns = ImportTransactions.parseCSV(txnsCsvText);

      report.stages.extract.success = true;
      report.stages.extract.itemsExtracted = rawItems.length;
      report.stages.extract.transactionsExtracted = rawTxns.length;
      Logger.log('[MIGRATION] Stage 1 Extracted: ' + rawItems.length + ' items, ' + rawTxns.length + ' transactions.');

      // --------------------------------------------------------------------------
      // STAGE 2: VALIDATE
      // --------------------------------------------------------------------------
      Logger.log('[MIGRATION] Stage 2: Validate starting...');
      var itemValidation = ValidateMigration.validateItems(rawItems);
      var validItemCodes = {};
      for (var vi = 0; vi < rawItems.length; vi++) {
        validItemCodes[rawItems[vi].item_code] = true;
      }
      var txnValidation = ValidateMigration.validateTransactions(rawTxns, validItemCodes);

      report.stages.validate.itemErrors = itemValidation.errorCount;
      report.stages.validate.transactionErrors = txnValidation.errorCount;
      report.stages.validate.errorReports = {
        items: itemValidation.errors,
        transactions: txnValidation.errors
      };

      if ((!itemValidation.isValid || !txnValidation.isValid) && !allowPartial) {
        report.stages.validate.success = false;
        report.status = 'VALIDATION_FAILED';
        Logger.log('[MIGRATION] Validation Failed! Aborting import.');
        return finalizeReport(report, startTime);
      }

      report.stages.validate.success = true;
      Logger.log('[MIGRATION] Stage 2 Validation Passed cleanly.');

      // --------------------------------------------------------------------------
      // STAGE 3: TRANSFORM & STAGE 4: IMPORT
      // --------------------------------------------------------------------------
      Logger.log('[MIGRATION] Stage 3 & 4: Ingesting Master Items...');
      var itemImportResult = ImportMasterItems.importFromCsv(itemsCsvText, allowPartial);
      if (!itemImportResult.success) {
        throw new Error('IMPORT_ITEMS_FAILED: ' + itemImportResult.message);
      }
      report.stages.import.itemsImported = itemImportResult.importedCount;

      Logger.log('[MIGRATION] Stage 3 & 4: Ingesting Historical Transactions...');
      var txnImportResult = ImportTransactions.importFromCsv(txnsCsvText, null, allowPartial);
      if (!txnImportResult.success) {
        throw new Error('IMPORT_TXNS_FAILED: ' + txnImportResult.message);
      }
      report.stages.import.transactionsImported = txnImportResult.importedCount;
      report.stages.import.detailsImported = txnImportResult.importedCount; // 1-to-1 in migration set
      report.stages.import.success = true;
      report.stages.transform.success = true;
      report.stages.transform.itemsMapped = rawItems.length;
      report.stages.transform.transactionsMapped = rawTxns.length;

      // --------------------------------------------------------------------------
      // STAGE 5: VERIFY (Post-Import Data & Integrity Check)
      // --------------------------------------------------------------------------
      Logger.log('[MIGRATION] Stage 5: Verifying Integrity...');
      var verifyDetails = [];
      var checksPassed = 0;
      var checksFailed = 0;

      // Check 5.1: 03_Items count
      var itemsInDb = Database.getRecords(Config.SHEET_NAMES.ITEMS);
      if (itemsInDb.length >= rawItems.length) {
        checksPassed++;
        verifyDetails.push({ check: 'ITEMS_COUNT', expected: rawItems.length, actual: itemsInDb.length, status: 'PASS' });
      } else {
        checksFailed++;
        verifyDetails.push({ check: 'ITEMS_COUNT', expected: rawItems.length, actual: itemsInDb.length, status: 'FAIL' });
      }

      // Check 5.2: 06_Transactions count
      var txnsInDb = Database.getRecords(Config.SHEET_NAMES.TRANSACTIONS);
      if (txnsInDb.length >= rawTxns.length) {
        checksPassed++;
        verifyDetails.push({ check: 'TRANSACTIONS_COUNT', expected: rawTxns.length, actual: txnsInDb.length, status: 'PASS' });
      } else {
        checksFailed++;
        verifyDetails.push({ check: 'TRANSACTIONS_COUNT', expected: rawTxns.length, actual: txnsInDb.length, status: 'FAIL' });
      }

      // Check 5.3: Foreign Key integrity (07_Transaction_Items -> 03_Items)
      var txnItemsInDb = Database.getRecords(Config.SHEET_NAMES.TRANSACTION_ITEMS);
      var itemIdsMap = {};
      for (var im = 0; im < itemsInDb.length; im++) {
        itemIdsMap[itemsInDb[im].item_id] = true;
      }

      var orphanedCount = 0;
      for (var ti = 0; ti < txnItemsInDb.length; ti++) {
        if (!itemIdsMap[txnItemsInDb[ti].item_id]) {
          orphanedCount++;
        }
      }

      if (orphanedCount === 0) {
        checksPassed++;
        verifyDetails.push({ check: 'FK_TXN_ITEMS_TO_ITEMS', orphaned: 0, status: 'PASS' });
      } else {
        checksFailed++;
        verifyDetails.push({ check: 'FK_TXN_ITEMS_TO_ITEMS', orphaned: orphanedCount, status: 'FAIL' });
      }

      report.stages.verify.checksPassed = checksPassed;
      report.stages.verify.checksFailed = checksFailed;
      report.stages.verify.details = verifyDetails;
      report.stages.verify.success = (checksFailed === 0);

      // --------------------------------------------------------------------------
      // STAGE 6: RECONCILE (Stock Formula & Ledger Generation)
      // --------------------------------------------------------------------------
      Logger.log('[MIGRATION] Stage 6: Reconciling Stock Equation...');
      var reconcileResult = ReconcileStock.reconcileAllItems(rawItems, rawTxns, persistLedger);

      report.stages.reconcile.success = true;
      report.stages.reconcile.matched = reconcileResult.matchedCount;
      report.stages.reconcile.discrepancies = reconcileResult.discrepancyCount;
      report.stages.reconcile.isFullyReconciled = reconcileResult.isFullyReconciled;
      report.stages.reconcile.totalLedgerEntries = reconcileResult.ledgerEntriesCreated;
      report.stages.reconcile.totalCatalogValue = reconcileResult.totalCatalogValue;
      report.stages.reconcile.totalCalculatedValue = reconcileResult.totalCalculatedValue;
      report.stages.reconcile.reconcileDetails = reconcileResult.items;

      report.status = reconcileResult.isFullyReconciled ? 'COMPLETED_SUCCESS' : 'COMPLETED_WITH_DISCREPANCY';

    } catch (err) {
      Logger.log('[MIGRATION] Error occurred: ' + err.message);
      report.status = 'ERROR';
      report.error = {
        message: err.message,
        stack: err.stack
      };
    }

    return finalizeReport(report, startTime);
  }

  function finalizeReport(report, startTime) {
    var endTime = new Date();
    report.completedAt = Utilities.formatDate(endTime, 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
    report.durationMs = endTime.getTime() - startTime.getTime();
    report.summary = {
      status: report.status,
      totalItems: report.stages.extract.itemsExtracted,
      totalTransactions: report.stages.extract.transactionsExtracted,
      itemsImported: report.stages.import.itemsImported,
      transactionsImported: report.stages.import.transactionsImported,
      reconcileMatched: report.stages.reconcile.matched,
      reconcileDiscrepancies: report.stages.reconcile.discrepancies,
      ledgerEntriesCreated: report.stages.reconcile.totalLedgerEntries,
      durationSeconds: Math.round(report.durationMs / 1000)
    };
    return report;
  }

  /**
   * Helper returning embedded Transactions CSV content
   */
  function getEmbeddedTransactionsCsv() {
    return 'transaction_id,date,item_code,transaction_type,quantity,user_name\n' +
      'TX-2567-001,2024-05-15,OFF-001,เบิกใช้งาน,5,ครูกัญญา (กลุ่มสาระฯ ภาษาไทย)\n' +
      'TX-2567-002,2024-05-15,OFF-004,เบิกใช้งาน,10,ครูกัญญา (กลุ่มสาระฯ ภาษาไทย)\n' +
      'TX-2567-003,2024-05-16,OFF-002,เบิกใช้งาน,8,ครูวิชัย (งานวิชาการ)\n' +
      'TX-2567-004,2024-05-18,IT-004,เบิกใช้งาน,4,ครูสมชาย (ศูนย์คอมพิวเตอร์)\n' +
      'TX-2567-005,2024-05-20,SPT-001,เบิกใช้งาน,5,ครูประวิทย์ (กลุ่มสาระฯ สุขศึกษาฯ)\n' +
      'TX-2567-006,2024-05-22,JAN-001,เบิกใช้งาน,6,นายสมพร (หัวหน้างานแม่บ้าน)\n' +
      'TX-2567-007,2024-05-22,JAN-007,เบิกใช้งาน,10,นายสมพร (หัวหน้างานแม่บ้าน)\n' +
      'TX-2567-008,2024-05-25,MED-001,เบิกใช้งาน,2,ครูพรทิพย์ (งานห้องพยาบาล)\n' +
      'TX-2567-009,2024-06-01,OFF-001,รับเข้าสต็อก,30,นายอนันต์ (เจ้าหน้าที่พัสดุ - กลุ่มบริหารงานงบประมาณ)\n' +
      'TX-2567-010,2024-06-01,OFF-002,รับเข้าสต็อก,30,นายอนันต์ (เจ้าหน้าที่พัสดุ - กลุ่มบริหารงานงบประมาณ)\n' +
      'TX-2567-011,2024-06-03,IT-013,เบิกใช้งาน,3,นางสาวศิริพร (งานธุรการกลาง)\n' +
      'TX-2567-012,2024-06-05,MNT-001,เบิกใช้งาน,8,นายประสิทธิ์ (ช่างซ่อมบำรุง)\n' +
      'TX-2567-013,2024-06-10,SPT-004,เบิกใช้งาน,4,ครูประวิทย์ (กลุ่มสาระฯ สุขศึกษาฯ)\n' +
      'TX-2567-014,2024-06-12,OFF-013,เบิกใช้งาน,12,นางกุลวดี (กลุ่มสาระฯ คณิตศาสตร์)\n' +
      'TX-2567-015,2024-06-15,JAN-010,เบิกใช้งาน,4,นายสมพร (หัวหน้างานแม่บ้าน)\n' +
      'TX-2567-016,2024-06-18,EDU-004,เบิกใช้งาน,5,ครูสุวรรณา (กลุ่มสาระฯ วิทยาศาสตร์)\n' +
      'TX-2567-017,2024-06-20,IT-006,เบิกใช้งาน,2,ครูสมชาย (ศูนย์คอมพิวเตอร์)\n' +
      'TX-2567-018,2024-06-25,SPT-007,เบิกใช้งาน,3,ครูประวิทย์ (กลุ่มสาระฯ สุขศึกษาฯ)\n' +
      'TX-2567-019,2024-07-01,JAN-009,เบิกใช้งาน,12,นายสมพร (หัวหน้างานแม่บ้าน)\n' +
      'TX-2567-020,2024-07-05,OFF-021,เบิกใช้งาน,10,นายอนันต์ (เจ้าหน้าที่พัสดุ - กลุ่มบริหารงานงบประมาณ)\n';
  }

  /**
   * Helper returning embedded Master Items CSV content (or reads from file if available)
   */
  function getEmbeddedMasterItemsCsv() {
    var files = DriveApp.getFilesByName('Master_Items.csv');
    if (files.hasNext()) {
      return files.next().getBlob().getDataAsString('UTF-8');
    }
    return '';
  }

  return {
    runMigrationPipeline: runMigrationPipeline,
    getEmbeddedTransactionsCsv: getEmbeddedTransactionsCsv
  };
})();
