const fs = require('fs');

// 1. Patch Config.gs getSS
let configContent = fs.readFileSync('Config.gs', 'utf8');

const oldGetSSRegex = /function getSS\(\) \{[\s\S]*?return SpreadsheetApp\.getActiveSpreadsheet\(\);\s*\}/;

const newGetSS = `function getSS() {
  if (typeof SpreadsheetApp === 'undefined') {
    const err = new Error('DATABASE_ACCESS_ERROR: SpreadsheetApp is not available in the current runtime environment.');
    err.code = 'DATABASE_ACCESS_ERROR';
    throw err;
  }
  if (CONFIG.SPREADSHEET_ID) {
    try {
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      if (!ss) {
        const err = new Error('DATABASE_ACCESS_ERROR: Could not open spreadsheet with ID "' + CONFIG.SPREADSHEET_ID + '".');
        err.code = 'DATABASE_ACCESS_ERROR';
        throw err;
      }
      return ss;
    } catch (e) {
      const err = new Error('DATABASE_ACCESS_ERROR: Failed to open configured spreadsheet "' + CONFIG.SPREADSHEET_ID + '": ' + e.message);
      err.code = 'DATABASE_ACCESS_ERROR';
      throw err;
    }
  }
  const activeSS = SpreadsheetApp.getActiveSpreadsheet();
  if (!activeSS) {
    const err = new Error('DATABASE_ACCESS_ERROR: No active spreadsheet found and SPREADSHEET_ID is not configured.');
    err.code = 'DATABASE_ACCESS_ERROR';
    throw err;
  }
  return activeSS;
}`;

if (oldGetSSRegex.test(configContent)) {
  configContent = configContent.replace(oldGetSSRegex, newGetSS);
  fs.writeFileSync('Config.gs', configContent, 'utf8');
  new Function(configContent);
  console.log('[OK] Config.gs getSS updated successfully');
} else {
  console.error('[FAIL] Could not match getSS in Config.gs');
}

// 2. Patch Api.gs
let apiContent = fs.readFileSync('Api.gs', 'utf8');

// 2.1 Update handler names in ACTION_REGISTRY
const handlerMap = {
  "'apiBootstrap'": "'hrtBootstrap_'",
  "'apiGetItems'": "'hrtGetItems_'",
  "'apiGetItemDetail'": "'hrtGetItemDetail_'",
  "'apiGetDashboardMetrics'": "'hrtGetDashboardMetrics_'",
  "'apiGetDashboard'": "'hrtGetDashboardMetrics_'",
  "'apiGetFsnList'": "'hrtGetFsnList_'",
  "'apiGetRequisitions'": "'hrtGetRequisitions_'",
  "'apiGetRequisitionDetail'": "'hrtGetRequisitionDetail_'",
  "'apiResolveQr'": "'hrtResolveQr_'",
  "'apiListQrCodes'": "'hrtListQrCodes_'",
  "'apiCheckIdempotency'": "'hrtCheckIdempotency_'",
  "'apiGetItemLedger'": "'hrtGetItemLedger_'",
  "'apiGetDashboardKPIs'": "'hrtGetDashboardMetrics_'",
  "'apiGetAuditLogs'": "'hrtGetAuditLogs_'",
  "'apiVerifyAuditIntegrity'": "'hrtVerifyAuditIntegrity_'",
  "'apiGetYearEndAudit'": "'hrtGetYearEndAudit_'",
  "'apiGetPdReport'": "'hrtGetPdReport_'",
  "'apiGetCurrentUser'": "'hrtGetCurrentUser_'",
  "'apiGetUsers'": "'hrtGetUsers_'",
  "'apiGetSettings'": "'hrtGetSettings_'",
  "'apiCheckHealth'": "'hrtCheckHealth_'",
  "'apiBackupFull'": "'hrtBackupFull_'",
  "'getAllDepartments'": "'hrtGetAllDepartments_'",
  "'apiValidateImportItems'": "'hrtValidateImportItems_'",
  "'apiGetSettingsSection'": "'hrtGetSettingsSection_'",
  "'getAllFiscalYears'": "'hrtGetAllFiscalYears_'",
  "'apiGetMasterData'": "'hrtGetMasterData_'",
  "'apiPreviewQr'": "'hrtPreviewQr_'",
  "'apiListBackups'": "'hrtListBackups_'",
  "'apiValidateRestore'": "'hrtValidateRestore_'",
  "'getAllCategories'": "'hrtGetAllCategories_'",
  "'getAllWarehouses'": "'hrtGetAllWarehouses_'",
  "'apiCreateItem'": "'hrtCreateItem_'",
  "'apiUpdateItem'": "'hrtUpdateItem_'",
  "'apiImportItems'": "'hrtImportItems_'",
  "'apiCreateRequisition'": "'hrtCreateRequisition_'",
  "'apiCancelRequisition'": "'hrtCancelRequisition_'",
  "'apiReviewRequisition'": "'hrtReviewRequisition_'",
  "'apiApproveRequisition'": "'hrtApproveRequisition_'",
  "'apiRejectRequisition'": "'hrtRejectRequisition_'",
  "'apiIssueStock'": "'hrtIssueStock_'",
  "'apiConfirmReceipt'": "'hrtConfirmReceipt_'",
  "'apiReceiveStock'": "'hrtReceiveStock_'",
  "'apiAdjustStock'": "'hrtAdjustStock_'",
  "'apiReconcileStockBalances'": "'hrtReconcileStockBalances_'",
  "'apiAddFsn'": "'hrtAddFsn_'",
  "'apiLinkFsnToItem'": "'hrtLinkFsnToItem_'",
  "'apiCreateQrCode'": "'hrtCreateQrCode_'",
  "'apiRevokeQrCode'": "'hrtRevokeQrCode_'",
  "'apiStartYearEndAudit'": "'hrtStartYearEndAudit_'",
  "'apiSaveYearEndAudit'": "'hrtSaveYearEndAudit_'",
  "'apiCloseFiscalYear'": "'hrtCloseFiscalYear_'",
  "'apiUpdateSettings'": "'hrtUpdateSettings_'",
  "'apiUpdateSettingsSection'": "'hrtUpdateSettingsSection_'",
  "'apiCreateUser'": "'hrtCreateUser_'",
  "'apiUpdateUser'": "'hrtUpdateUser_'",
  "'apiSuspendUser'": "'hrtSuspendUser_'",
  "'apiSetupInitialFiscalYear'": "'hrtSetupInitialFiscalYear_'",
  "'apiUpsertMasterData'": "'hrtUpsertMasterData_'",
  "'apiDeactivateMasterData'": "'hrtDeactivateMasterData_'"
};

for (const [oldH, newH] of Object.entries(handlerMap)) {
  apiContent = apiContent.split(oldH).join(newH);
}

// 2.2 Update token check and dev mode in resolveAuthenticatedUser
const oldDevMode = `    // 3. Environment Mock / Dev Mode fallback (Strictly gated)
    const isMockEnv = !email && (
      (typeof PropertiesService !== 'undefined' && PropertiesService.getScriptProperties().getProperty('DEV_MODE') === 'true') ||
      (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test')
    );`;

const newDevMode = `    // 3. Environment Mock fallback (Strictly gated to automated test suites)
    const isMockEnv = !email && (
      (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test')
    );`;

if (apiContent.includes(oldDevMode)) {
  apiContent = apiContent.replace(oldDevMode, newDevMode);
  console.log('[OK] Api.gs DEV_MODE elevation removed from live runtime');
} else {
  console.warn('[WARN] Could not find exact oldDevMode block in Api.gs');
}

// 2.3 Require GOOGLE_CLIENT_ID for token validation
const oldIdTokenBlock = `    // 2. Check for passed ID token if direct session email is blank
    const idToken = (rawPayload && (rawPayload.id_token || rawPayload.idToken || rawPayload.authToken)) || '';
    if (!email && idToken) {
      const verifiedProfile = verifyGoogleIdToken(idToken);
      if (verifiedProfile && verifiedProfile.email) {
        email = verifiedProfile.email;
        isTokenVerified = true;
      }
    }`;

const newIdTokenBlock = `    // 2. Check for passed ID token if direct session email is blank
    const idToken = (rawPayload && (rawPayload.id_token || rawPayload.idToken || rawPayload.authToken)) || '';
    if (!email && idToken) {
      if (!CONFIG.GOOGLE_CLIENT_ID) {
        const err = new Error('CONFIGURATION_ERROR: GOOGLE_CLIENT_ID is not configured in Script Properties for token validation.');
        err.code = 'CONFIGURATION_ERROR';
        throw err;
      }
      const verifiedProfile = verifyGoogleIdToken(idToken);
      if (verifiedProfile && verifiedProfile.email) {
        email = verifiedProfile.email;
        isTokenVerified = true;
      }
    }`;

if (apiContent.includes(oldIdTokenBlock)) {
  apiContent = apiContent.replace(oldIdTokenBlock, newIdTokenBlock);
  console.log('[OK] Api.gs CONFIGURATION_ERROR requirement added for token validation');
} else {
  console.warn('[WARN] Could not find exact oldIdTokenBlock in Api.gs');
}

// 2.4 Update dispatch and response envelope in routeRequest
const oldDispatchRegex = /\/\/ 5\. Dispatch to Business Handler[\s\S]*?result = handlerFn\(payload, caller, reqId\);[\s\S]*?\/\/ 6\. Structure Standard Success Response[\s\S]*?timestamp: new Date\(\)\.toISOString\(\)\s*\};/;

const newDispatchBlock = `// 5. Dispatch to Business Handler
      let result = null;
      let handlerFn = typeof route.handler === 'function' ? route.handler : null;
      if (!handlerFn && typeof route.handler === 'string') {
        if (typeof globalThis !== 'undefined' && typeof globalThis[route.handler] === 'function') {
          handlerFn = globalThis[route.handler];
        } else if (typeof global !== 'undefined' && typeof global[route.handler] === 'function') {
          handlerFn = global[route.handler];
        }
      }

      if (typeof handlerFn !== 'function') {
        const err = new Error('INTERNAL_ERROR: Business handler function "' + route.handler + '" is not defined.');
        err.code = 'INTERNAL_ERROR';
        throw err;
      }

      result = handlerFn(payload, caller, reqId);

      // 6. Structure Standard Success Response (Enveloped + Legacy Direct Properties)
      const response = Object.assign(
        {
          success: true,
          action: action,
          data: result,
          requestId: reqId,
          executionMs: Date.now() - startTime,
          timestamp: new Date().toISOString()
        },
        (typeof result === 'object' && result !== null && !Array.isArray(result)) ? result : {}
      );`;

if (oldDispatchRegex.test(apiContent)) {
  apiContent = apiContent.replace(oldDispatchRegex, newDispatchBlock);
  console.log('[OK] Api.gs handler dispatch and response envelope updated');
} else {
  console.warn('[WARN] Could not match oldDispatchRegex in Api.gs');
}

fs.writeFileSync('Api.gs', apiContent, 'utf8');
new Function(apiContent);
console.log('[OK] Api.gs syntax verified and valid!');
