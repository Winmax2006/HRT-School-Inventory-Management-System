const fs = require('fs');

let apiContent = fs.readFileSync('Api.gs', 'utf8');

// Aliases to ensure in ACTION_REGISTRY
const aliasesToAdd = {
  'apiBootstrap': { handler: 'hrtBootstrap_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
  'apiGetItems': { handler: 'hrtGetItems_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
  'apiGetItemDetail': { handler: 'hrtGetItemDetail_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
  'apiGetDashboardMetrics': { handler: 'hrtGetDashboardMetrics_', minRole: 'OFFICER', permission: 'VIEW_INVENTORY', isWrite: false },
  'apiGetDashboardKPIs': { handler: 'hrtGetDashboardMetrics_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
  'apiGetFsnList': { handler: 'hrtGetFsnList_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
  'apiGetRequisitions': { handler: 'hrtGetRequisitions_', minRole: 'REQUESTER', permission: 'VIEW_OWN_REQUISITIONS', isWrite: false },
  'apiGetRequisitionDetail': { handler: 'hrtGetRequisitionDetail_', minRole: 'REQUESTER', permission: 'VIEW_OWN_REQUISITIONS', isWrite: false },
  'apiCreateRequisition': { handler: 'hrtCreateRequisition_', minRole: 'REQUESTER', permission: 'CREATE_REQUISITION', isWrite: true },
  'apiCancelRequisition': { handler: 'hrtCancelRequisition_', minRole: 'REQUESTER', permission: 'CANCEL_OWN_REQUISITION', isWrite: true },
  'apiReviewRequisition': { handler: 'hrtReviewRequisition_', minRole: 'OFFICER', permission: 'REVIEW_REQUISITION', isWrite: true },
  'apiApproveRequisition': { handler: 'hrtApproveRequisition_', minRole: 'APPROVER', permission: 'APPROVE_REQUISITION', isWrite: true },
  'apiRejectRequisition': { handler: 'hrtRejectRequisition_', minRole: 'APPROVER', permission: 'REJECT_REQUISITION', isWrite: true },
  'apiIssueStock': { handler: 'hrtIssueStock_', minRole: 'OFFICER', permission: 'ISSUE_STOCK', isWrite: true },
  'apiConfirmReceipt': { handler: 'hrtConfirmReceipt_', minRole: 'REQUESTER', permission: 'CREATE_REQUISITION', isWrite: true },
  'apiReceiveStock': { handler: 'hrtReceiveStock_', minRole: 'OFFICER', permission: 'RECEIVE_STOCK', isWrite: true },
  'apiAdjustStock': { handler: 'hrtAdjustStock_', minRole: 'OFFICER', permission: 'ADJUST_STOCK', isWrite: true },
  'apiReconcileStockBalances': { handler: 'hrtReconcileStockBalances_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: true },
  'apiResolveQr': { handler: 'hrtResolveQr_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
  'apiListQrCodes': { handler: 'hrtListQrCodes_', minRole: 'OFFICER', permission: 'MANAGE_QR', isWrite: false },
  'apiCreateQrCode': { handler: 'hrtCreateQrCode_', minRole: 'OFFICER', permission: 'MANAGE_QR', isWrite: true },
  'apiRevokeQrCode': { handler: 'hrtRevokeQrCode_', minRole: 'OFFICER', permission: 'MANAGE_QR', isWrite: true },
  'apiGetCurrentUser': { handler: 'hrtGetCurrentUser_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
  'apiGetUsers': { handler: 'hrtGetUsers_', minRole: 'ADMIN', permission: 'MANAGE_USERS', isWrite: false },
  'apiCreateUser': { handler: 'hrtCreateUser_', minRole: 'ADMIN', permission: 'MANAGE_USERS', isWrite: true },
  'apiUpdateUser': { handler: 'hrtUpdateUser_', minRole: 'ADMIN', permission: 'MANAGE_USERS', isWrite: true },
  'apiSuspendUser': { handler: 'hrtSuspendUser_', minRole: 'ADMIN', permission: 'MANAGE_USERS', isWrite: true },
  'apiGetSettings': { handler: 'hrtGetSettings_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
  'apiUpdateSettings': { handler: 'hrtUpdateSettings_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: true },
  'apiUpdateSettingsSection': { handler: 'hrtUpdateSettingsSection_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: true },
  'apiCheckHealth': { handler: 'hrtCheckHealth_', minRole: 'OFFICER', permission: 'VIEW_AUDIT_LOG', isWrite: false },
  'apiBackupFull': { handler: 'hrtBackupFull_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: false },
  'apiGetPdReport': { handler: 'hrtGetPdReport_', minRole: 'OFFICER', permission: 'VIEW_AUDIT_LOG', isWrite: false },
  'apiGetAuditLogs': { handler: 'hrtGetAuditLogs_', minRole: 'OFFICER', permission: 'VIEW_AUDIT_LOG', isWrite: false },
  'apiVerifyAuditIntegrity': { handler: 'hrtVerifyAuditIntegrity_', minRole: 'ADMIN', permission: 'VERIFY_AUDIT_LOG', isWrite: false },
  'apiGetYearEndAudit': { handler: 'hrtGetYearEndAudit_', minRole: 'OFFICER', permission: 'YEAR_END_AUDIT', isWrite: false },
  'apiStartYearEndAudit': { handler: 'hrtStartYearEndAudit_', minRole: 'OFFICER', permission: 'YEAR_END_AUDIT', isWrite: true },
  'apiSaveYearEndAudit': { handler: 'hrtSaveYearEndAudit_', minRole: 'OFFICER', permission: 'YEAR_END_AUDIT', isWrite: true },
  'apiCloseFiscalYear': { handler: 'hrtCloseFiscalYear_', minRole: 'ADMIN', permission: 'CLOSE_FISCAL_YEAR', isWrite: true },
  'apiSetupInitialFiscalYear': { handler: 'hrtSetupInitialFiscalYear_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: true },
  'apiGetItemLedger': { handler: 'hrtGetItemLedger_', minRole: 'OFFICER', permission: 'VIEW_INVENTORY', isWrite: false }
};

let addedCount = 0;
let linesToAdd = [];

for (const [actionName, def] of Object.entries(aliasesToAdd)) {
  if (!apiContent.includes("'" + actionName + "':")) {
    linesToAdd.push(`    '${actionName}': { handler: '${def.handler}', minRole: '${def.minRole}', permission: '${def.permission}', isWrite: ${def.isWrite} },`);
    addedCount++;
  }
}

if (linesToAdd.length > 0) {
  const insertTarget = "    'backups.create': { handler: 'hrtBackupFull_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: true }";
  if (apiContent.includes(insertTarget)) {
    apiContent = apiContent.replace(
      insertTarget,
      insertTarget + ',\n\n    // Direct api* Method Aliases for Seamless RPC Bridge\n' + linesToAdd.join('\n')
    );
    fs.writeFileSync('Api.gs', apiContent, 'utf8');
    new Function(apiContent);
    console.log(`[OK] Added ${addedCount} direct api* aliases to ACTION_REGISTRY in Api.gs`);
  } else {
    console.error('[FAIL] Could not locate insertion point in Api.gs');
  }
} else {
  console.log('[OK] All api* aliases are already present in ACTION_REGISTRY');
}
