const fs = require('fs');

const allFns = [
  'apiBootstrap', 'apiGetItems', 'apiGetItemDetail', 'apiGetFsnList', 'apiGetDashboardMetrics',
  'apiGetRequisitions', 'apiGetRequisitionDetail', 'apiResolveQr', 'apiListQrCodes', 'apiCheckIdempotency',
  'apiGetCurrentUser', 'apiGetUsers', 'apiGetSettings', 'apiGetSettingsSection', 'apiGetMasterData',
  'apiPreviewQr', 'apiListBackups', 'apiValidateRestore', 'getAllDepartments', 'getAllCategories',
  'getAllWarehouses', 'getAllFiscalYears', 'apiGetPdReport', 'apiCheckHealth', 'apiGetItemLedger',
  'apiCreateItem', 'apiUpdateItem', 'apiCreateRequisition', 'apiCancelRequisition', 'apiReviewRequisition',
  'apiApproveRequisition', 'apiRejectRequisition', 'apiIssueStock', 'apiConfirmReceipt', 'apiReceiveStock',
  'apiAdjustStock', 'apiAddFsn', 'apiLinkFsnToItem', 'apiValidateImportItems', 'apiImportItems',
  'apiCloseFiscalYear', 'apiSetupInitialFiscalYear', 'apiBackupFull', 'apiUpdateSettings',
  'apiUpdateSettingsSection', 'apiUpsertMasterData', 'apiDeactivateMasterData', 'apiCreateUser',
  'apiUpdateUser', 'apiSuspendUser', 'apiReconcileStockBalances', 'apiCreateQrCode', 'apiRevokeQrCode',
  'apiGetAuditLogs', 'apiVerifyAuditIntegrity', 'apiGetYearEndAudit', 'apiStartYearEndAudit', 'apiSaveYearEndAudit'
];

['Read.gs', 'Write.gs', 'Audit.gs', 'Api.gs'].forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  console.log(`=== References in ${file} ===`);
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    allFns.forEach(fn => {
      // Find occurrences that are NOT "function fn("
      const regex = new RegExp(`\\b${fn}\\b`);
      if (regex.test(line) && !line.includes(`function ${fn}`)) {
        console.log(`  ${file}:${idx + 1}: ${line.trim()}`);
      }
    });
  });
});
