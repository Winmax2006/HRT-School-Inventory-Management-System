const fs = require('fs');

let content = fs.readFileSync('Api.gs', 'utf8');
const target = '  function routeRequest(action, rawPayload, requestId) {';
if (!content.includes(target)) {
  console.error('Target routeRequest not found in Api.gs!');
  process.exit(1);
}

// Clean up any old definition if present
content = content.replace(/\s*\/\*\*[\s\S]*?function resolveAllowlistedHandler[\s\S]*?return null;\s*\}/, '');

const resolver = `  /**
   * Explicit allowlisted function resolver.
   * Maps allowlisted handler identifiers directly to concrete function references.
   * Lazily initialized on call to prevent script initialization order issues.
   * Rejects any handler not explicitly declared in ALLOWLISTED_HANDLERS.
   */
  function resolveAllowlistedHandler(handlerName) {
    if (typeof handlerName === 'function') return handlerName;
    if (typeof handlerName !== 'string') return null;

    const ALLOWLISTED_HANDLERS = {
      'hrtBootstrap_': typeof hrtBootstrap_ === 'function' ? hrtBootstrap_ : (typeof globalThis !== 'undefined' ? globalThis.hrtBootstrap_ : null),
      'hrtGetItems_': typeof hrtGetItems_ === 'function' ? hrtGetItems_ : (typeof globalThis !== 'undefined' ? globalThis.hrtGetItems_ : null),
      'hrtGetItemDetail_': typeof hrtGetItemDetail_ === 'function' ? hrtGetItemDetail_ : (typeof globalThis !== 'undefined' ? globalThis.hrtGetItemDetail_ : null),
      'hrtGetDashboardMetrics_': typeof hrtGetDashboardMetrics_ === 'function' ? hrtGetDashboardMetrics_ : (typeof globalThis !== 'undefined' ? globalThis.hrtGetDashboardMetrics_ : null),
      'hrtGetFsnList_': typeof hrtGetFsnList_ === 'function' ? hrtGetFsnList_ : (typeof globalThis !== 'undefined' ? globalThis.hrtGetFsnList_ : null),
      'hrtGetRequisitions_': typeof hrtGetRequisitions_ === 'function' ? hrtGetRequisitions_ : (typeof globalThis !== 'undefined' ? globalThis.hrtGetRequisitions_ : null),
      'hrtGetRequisitionDetail_': typeof hrtGetRequisitionDetail_ === 'function' ? hrtGetRequisitionDetail_ : (typeof globalThis !== 'undefined' ? globalThis.hrtGetRequisitionDetail_ : null),
      'hrtResolveQr_': typeof hrtResolveQr_ === 'function' ? hrtResolveQr_ : (typeof globalThis !== 'undefined' ? globalThis.hrtResolveQr_ : null),
      'hrtListQrCodes_': typeof hrtListQrCodes_ === 'function' ? hrtListQrCodes_ : (typeof globalThis !== 'undefined' ? globalThis.hrtListQrCodes_ : null),
      'hrtCheckIdempotency_': typeof hrtCheckIdempotency_ === 'function' ? hrtCheckIdempotency_ : (typeof globalThis !== 'undefined' ? globalThis.hrtCheckIdempotency_ : null),
      'hrtGetItemLedger_': typeof hrtGetItemLedger_ === 'function' ? hrtGetItemLedger_ : (typeof globalThis !== 'undefined' ? globalThis.hrtGetItemLedger_ : null),
      'hrtGetAuditLogs_': typeof hrtGetAuditLogs_ === 'function' ? hrtGetAuditLogs_ : (typeof globalThis !== 'undefined' ? globalThis.hrtGetAuditLogs_ : null),
      'hrtVerifyAuditIntegrity_': typeof hrtVerifyAuditIntegrity_ === 'function' ? hrtVerifyAuditIntegrity_ : (typeof globalThis !== 'undefined' ? globalThis.hrtVerifyAuditIntegrity_ : null),
      'hrtGetYearEndAudit_': typeof hrtGetYearEndAudit_ === 'function' ? hrtGetYearEndAudit_ : (typeof globalThis !== 'undefined' ? globalThis.hrtGetYearEndAudit_ : null),
      'hrtGetPdReport_': typeof hrtGetPdReport_ === 'function' ? hrtGetPdReport_ : (typeof globalThis !== 'undefined' ? globalThis.hrtGetPdReport_ : null),
      'hrtGetCurrentUser_': typeof hrtGetCurrentUser_ === 'function' ? hrtGetCurrentUser_ : (typeof globalThis !== 'undefined' ? globalThis.hrtGetCurrentUser_ : null),
      'hrtGetUsers_': typeof hrtGetUsers_ === 'function' ? hrtGetUsers_ : (typeof globalThis !== 'undefined' ? globalThis.hrtGetUsers_ : null),
      'hrtGetSettings_': typeof hrtGetSettings_ === 'function' ? hrtGetSettings_ : (typeof globalThis !== 'undefined' ? globalThis.hrtGetSettings_ : null),
      'hrtCheckHealth_': typeof hrtCheckHealth_ === 'function' ? hrtCheckHealth_ : (typeof globalThis !== 'undefined' ? globalThis.hrtCheckHealth_ : null),
      'hrtBackupFull_': typeof hrtBackupFull_ === 'function' ? hrtBackupFull_ : (typeof globalThis !== 'undefined' ? globalThis.hrtBackupFull_ : null),
      'hrtGetAllDepartments_': typeof hrtGetAllDepartments_ === 'function' ? hrtGetAllDepartments_ : (typeof globalThis !== 'undefined' ? globalThis.hrtGetAllDepartments_ : null),
      'hrtValidateImportItems_': typeof hrtValidateImportItems_ === 'function' ? hrtValidateImportItems_ : (typeof globalThis !== 'undefined' ? globalThis.hrtValidateImportItems_ : null),
      'hrtGetSettingsSection_': typeof hrtGetSettingsSection_ === 'function' ? hrtGetSettingsSection_ : (typeof globalThis !== 'undefined' ? globalThis.hrtGetSettingsSection_ : null),
      'hrtGetAllFiscalYears_': typeof hrtGetAllFiscalYears_ === 'function' ? hrtGetAllFiscalYears_ : (typeof globalThis !== 'undefined' ? globalThis.hrtGetAllFiscalYears_ : null),
      'hrtGetMasterData_': typeof hrtGetMasterData_ === 'function' ? hrtGetMasterData_ : (typeof globalThis !== 'undefined' ? globalThis.hrtGetMasterData_ : null),
      'hrtPreviewQr_': typeof hrtPreviewQr_ === 'function' ? hrtPreviewQr_ : (typeof globalThis !== 'undefined' ? globalThis.hrtPreviewQr_ : null),
      'hrtListBackups_': typeof hrtListBackups_ === 'function' ? hrtListBackups_ : (typeof globalThis !== 'undefined' ? globalThis.hrtListBackups_ : null),
      'hrtValidateRestore_': typeof hrtValidateRestore_ === 'function' ? hrtValidateRestore_ : (typeof globalThis !== 'undefined' ? globalThis.hrtValidateRestore_ : null),
      'hrtCreateItem_': typeof hrtCreateItem_ === 'function' ? hrtCreateItem_ : (typeof globalThis !== 'undefined' ? globalThis.hrtCreateItem_ : null),
      'hrtUpdateItem_': typeof hrtUpdateItem_ === 'function' ? hrtUpdateItem_ : (typeof globalThis !== 'undefined' ? globalThis.hrtUpdateItem_ : null),
      'hrtImportItems_': typeof hrtImportItems_ === 'function' ? hrtImportItems_ : (typeof globalThis !== 'undefined' ? globalThis.hrtImportItems_ : null),
      'hrtCreateRequisition_': typeof hrtCreateRequisition_ === 'function' ? hrtCreateRequisition_ : (typeof globalThis !== 'undefined' ? globalThis.hrtCreateRequisition_ : null),
      'hrtCancelRequisition_': typeof hrtCancelRequisition_ === 'function' ? hrtCancelRequisition_ : (typeof globalThis !== 'undefined' ? globalThis.hrtCancelRequisition_ : null),
      'hrtReviewRequisition_': typeof hrtReviewRequisition_ === 'function' ? hrtReviewRequisition_ : (typeof globalThis !== 'undefined' ? globalThis.hrtReviewRequisition_ : null),
      'hrtApproveRequisition_': typeof hrtApproveRequisition_ === 'function' ? hrtApproveRequisition_ : (typeof globalThis !== 'undefined' ? globalThis.hrtApproveRequisition_ : null),
      'hrtRejectRequisition_': typeof hrtRejectRequisition_ === 'function' ? hrtRejectRequisition_ : (typeof globalThis !== 'undefined' ? globalThis.hrtRejectRequisition_ : null),
      'hrtIssueStock_': typeof hrtIssueStock_ === 'function' ? hrtIssueStock_ : (typeof globalThis !== 'undefined' ? globalThis.hrtIssueStock_ : null),
      'hrtConfirmReceipt_': typeof hrtConfirmReceipt_ === 'function' ? hrtConfirmReceipt_ : (typeof globalThis !== 'undefined' ? globalThis.hrtConfirmReceipt_ : null),
      'hrtReceiveStock_': typeof hrtReceiveStock_ === 'function' ? hrtReceiveStock_ : (typeof globalThis !== 'undefined' ? globalThis.hrtReceiveStock_ : null),
      'hrtAdjustStock_': typeof hrtAdjustStock_ === 'function' ? hrtAdjustStock_ : (typeof globalThis !== 'undefined' ? globalThis.hrtAdjustStock_ : null),
      'hrtReconcileStockBalances_': typeof hrtReconcileStockBalances_ === 'function' ? hrtReconcileStockBalances_ : (typeof globalThis !== 'undefined' ? globalThis.hrtReconcileStockBalances_ : null),
      'hrtAddFsn_': typeof hrtAddFsn_ === 'function' ? hrtAddFsn_ : (typeof globalThis !== 'undefined' ? globalThis.hrtAddFsn_ : null),
      'hrtLinkFsnToItem_': typeof hrtLinkFsnToItem_ === 'function' ? hrtLinkFsnToItem_ : (typeof globalThis !== 'undefined' ? globalThis.hrtLinkFsnToItem_ : null),
      'hrtCreateQrCode_': typeof hrtCreateQrCode_ === 'function' ? hrtCreateQrCode_ : (typeof globalThis !== 'undefined' ? globalThis.hrtCreateQrCode_ : null),
      'hrtRevokeQrCode_': typeof hrtRevokeQrCode_ === 'function' ? hrtRevokeQrCode_ : (typeof globalThis !== 'undefined' ? globalThis.hrtRevokeQrCode_ : null),
      'hrtStartYearEndAudit_': typeof hrtStartYearEndAudit_ === 'function' ? hrtStartYearEndAudit_ : (typeof globalThis !== 'undefined' ? globalThis.hrtStartYearEndAudit_ : null),
      'hrtSaveYearEndAudit_': typeof hrtSaveYearEndAudit_ === 'function' ? hrtSaveYearEndAudit_ : (typeof globalThis !== 'undefined' ? globalThis.hrtSaveYearEndAudit_ : null),
      'hrtCloseFiscalYear_': typeof hrtCloseFiscalYear_ === 'function' ? hrtCloseFiscalYear_ : (typeof globalThis !== 'undefined' ? globalThis.hrtCloseFiscalYear_ : null),
      'hrtUpdateSettings_': typeof hrtUpdateSettings_ === 'function' ? hrtUpdateSettings_ : (typeof globalThis !== 'undefined' ? globalThis.hrtUpdateSettings_ : null),
      'hrtUpdateSettingsSection_': typeof hrtUpdateSettingsSection_ === 'function' ? hrtUpdateSettingsSection_ : (typeof globalThis !== 'undefined' ? globalThis.hrtUpdateSettingsSection_ : null),
      'hrtCreateUser_': typeof hrtCreateUser_ === 'function' ? hrtCreateUser_ : (typeof globalThis !== 'undefined' ? globalThis.hrtCreateUser_ : null),
      'hrtUpdateUser_': typeof hrtUpdateUser_ === 'function' ? hrtUpdateUser_ : (typeof globalThis !== 'undefined' ? globalThis.hrtUpdateUser_ : null),
      'hrtSuspendUser_': typeof hrtSuspendUser_ === 'function' ? hrtSuspendUser_ : (typeof globalThis !== 'undefined' ? globalThis.hrtSuspendUser_ : null),
      'hrtSetupInitialFiscalYear_': typeof hrtSetupInitialFiscalYear_ === 'function' ? hrtSetupInitialFiscalYear_ : (typeof globalThis !== 'undefined' ? globalThis.hrtSetupInitialFiscalYear_ : null),
      'hrtUpsertMasterData_': typeof hrtUpsertMasterData_ === 'function' ? hrtUpsertMasterData_ : (typeof globalThis !== 'undefined' ? globalThis.hrtUpsertMasterData_ : null),
      'hrtDeactivateMasterData_': typeof hrtDeactivateMasterData_ === 'function' ? hrtDeactivateMasterData_ : (typeof globalThis !== 'undefined' ? globalThis.hrtDeactivateMasterData_ : null)
    };

    if (Object.prototype.hasOwnProperty.call(ALLOWLISTED_HANDLERS, handlerName)) {
      const fn = ALLOWLISTED_HANDLERS[handlerName];
      if (typeof fn === 'function') return fn;
      if (typeof global !== 'undefined' && typeof global[handlerName] === 'function') return global[handlerName];
      if (typeof globalThis !== 'undefined' && typeof globalThis[handlerName] === 'function') return globalThis[handlerName];
    }
    return null;
  }`;

content = content.replace(target, resolver + '\n\n' + target);
fs.writeFileSync('Api.gs', content, 'utf8');
new Function(content);
console.log('Successfully inserted resolveAllowlistedHandler in Api.gs');
