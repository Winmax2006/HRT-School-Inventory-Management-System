const fs = require('fs');

console.log('=== Step 1: Patching Audit.gs ===');
let auditContent = fs.readFileSync('Audit.gs', 'utf8');

// 1. Enhanced Sanitizer
const oldSanitizer = `function hrtSanitizeAuditDetails_(details) {
  if (typeof details !== 'string') details = String(details || '');
  return details
    .replace(/Bearer\\s+[A-Za-z0-9._-]+/gi, 'Bearer [MASKED]')
    .replace(/ey[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}/g, '[MASKED_JWT]')
    .replace(/(password|token|secret|auth|id_token)=([^&\\s,]+)/gi, '$1=[MASKED]');
}`;

const newSanitizer = `function hrtSanitizeAuditDetails_(details) {
  if (typeof details !== 'string') details = String(details || '');
  return details
    .replace(/Bearer\\s+[A-Za-z0-9._-]+/gi, 'Bearer [MASKED_TOKEN]')
    .replace(/Basic\\s+[A-Za-z0-9+/=]+/gi, 'Basic [MASKED_CREDENTIALS]')
    .replace(/ya29\\.[0-9A-Za-z-_]+/g, '[MASKED_OAUTH_TOKEN]')
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[MASKED_API_KEY]')
    .replace(/ey[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}/g, '[MASKED_JWT]')
    .replace(/-----BEGIN [A-Z ]+ PRIVATE KEY-----[\\s\\S]*?-----END [A-Z ]+ PRIVATE KEY-----/g, '[MASKED_PRIVATE_KEY]')
    .replace(/(password|token|secret|auth|id_token|client_secret)=([^&\\s,]+)/gi, '$1=[MASKED]');
}`;

if (auditContent.includes(oldSanitizer)) {
  auditContent = auditContent.replace(oldSanitizer, newSanitizer);
  console.log('[OK] Enhanced audit sanitizer in Audit.gs');
} else {
  console.warn('[WARN] Could not find exact oldSanitizer in Audit.gs');
}

// 2. Private logAudit_ with write-failure policy
const oldLogAuditRegex = /function logAudit\(action, module, details, caller\) \{[\s\S]*?Logger\.log\('Warning: Failed to append audit trail log: ' \+ err\.message\);\s*\}\s*\}/;

const newLogAudit = `function logAudit_(action, module, details, caller, isMandatory) {
  try {
    const sheet = getSheet('audit_trail');
    const now = new Date();
    const nowIso = now.toISOString();
    const auditId = 'AUD-' + now.getTime() + '-' + Math.floor(Math.random() * 1000);

    const actorId = (caller && typeof caller === 'object')
      ? (caller.id || caller.userId || caller.email || 'SYSTEM')
      : 'SYSTEM';
    const email = (caller && typeof caller === 'object')
      ? (caller.email || '')
      : '';

    // Retrieve previous record hash for cryptographic chaining
    const lastRow = sheet.getLastRow();
    let prevHash = 'GENESIS_HASH_HRT_v2_6_0';

    if (lastRow > 1) {
      const lastHashVal = sheet.getRange(lastRow, 8).getValue();
      if (lastHashVal) {
        prevHash = String(lastHashVal).trim();
      }
    }

    // Sanitize details to ensure zero secrets/tokens in immutable chain
    const cleanDetails = hrtSanitizeAuditDetails_(details);

    // Hash computation string
    const payloadToHash = \`\${auditId}|\${nowIso}|\${actorId}|\${email}|\${action}|\${module}|\${cleanDetails}|\${prevHash}\`;
    const recordHash = hrtComputeSha256_(payloadToHash);

    // 11_Audit_Trail Columns:
    // audit_id, timestamp, actor_id, email, action, module, prev_hash, record_hash, details
    sheet.appendRow([
      auditId,
      nowIso,
      actorId,
      email,
      action,
      module,
      prevHash,
      recordHash,
      sanitizeCellValue(cleanDetails)
    ]);

  } catch (err) {
    Logger.log('[Audit Logging Error] ' + err.message);
    if (isMandatory === true) {
      const auditErr = new Error(\`AUDIT_PERSISTENCE_FAILED: Failed to record mandatory audit trail for action "\${action}". Mutation cannot be certified.\`);
      auditErr.code = 'AUDIT_PERSISTENCE_FAILED';
      throw auditErr;
    }
  }
}`;

if (oldLogAuditRegex.test(auditContent)) {
  auditContent = auditContent.replace(oldLogAuditRegex, newLogAudit);
  console.log('[OK] Renamed logAudit to logAudit_ with write-failure policy');
} else {
  console.warn('[WARN] Could not match oldLogAuditRegex in Audit.gs');
}

// Replace any remaining internal calls to logAudit(...) within Audit.gs
auditContent = auditContent.replace(/\blogAudit\(/g, 'logAudit_(');

fs.writeFileSync('Audit.gs', auditContent, 'utf8');
new Function(auditContent);
console.log('[OK] Audit.gs valid JS!');

console.log('=== Step 2: Patching Config.gs ===');
let configContent = fs.readFileSync('Config.gs', 'utf8');

// Rename setConfig to setConfig_
configContent = configContent.replace(/function setConfig\(/g, 'function setConfig_(');
// Rename invalidateCache to invalidateCache_
configContent = configContent.replace(/function invalidateCache\(/g, 'function invalidateCache_(');
// Update internal call to invalidateCache
configContent = configContent.replace(/\binvalidateCache\(/g, 'invalidateCache_(');

fs.writeFileSync('Config.gs', configContent, 'utf8');
new Function(configContent);
console.log('[OK] Config.gs valid JS!');

console.log('=== Step 3: Patching Write.gs ===');
let writeContent = fs.readFileSync('Write.gs', 'utf8');

// Update calls to setConfig -> setConfig_
writeContent = writeContent.replace(/\bsetConfig\(/g, 'setConfig_(');
// Update calls to invalidateCache -> invalidateCache_
writeContent = writeContent.replace(/\binvalidateCache\(/g, 'invalidateCache_(');
// Update calls to logAudit -> logAudit_ (pass true as isMandatory for mutation audits)
writeContent = writeContent.replace(/\blogAudit\(([^)]+)\)/g, 'logAudit_($1, true)');

fs.writeFileSync('Write.gs', writeContent, 'utf8');
new Function(writeContent);
console.log('[OK] Write.gs valid JS!');

console.log('=== Step 4: Patching Api.gs ===');
let apiContent = fs.readFileSync('Api.gs', 'utf8');

// Update logAudit calls in catch blocks (isMandatory = false)
apiContent = apiContent.replace(/logAudit\('API_REJECTED', action, `Code: \${code}, Reason: \${msg}`, null\);/g,
  "logAudit_('API_REJECTED', action, `Code: ${code}, Reason: ${msg}`, caller, false);");

// Fix requisitions.submit route to point to hrtCreateRequisition_ instead of recursing to apiSubmitRequisition
apiContent = apiContent.replace(
  "'requisitions.submit': { handler: 'apiSubmitRequisition', minRole: 'REQUESTER', permission: 'CREATE_REQUISITION', isWrite: true }",
  "'requisitions.submit': { handler: 'hrtCreateRequisition_', minRole: 'REQUESTER', permission: 'CREATE_REQUISITION', isWrite: true }"
);

// Add explicit allowlisted handler resolver function inside ApiRouter
const handlerResolverCode = `  /**
   * Explicit allowlisted function resolver.
   * Maps allowlisted handler identifiers directly to their concrete private function references.
   * Evaluated lazily to ensure all project script files are fully loaded.
   * Eliminates dynamic globalThis/global string lookups, eval, and arbitrary execution.
   */
  function resolveAllowlistedHandler(handlerName) {
    if (typeof handlerName === 'function') return handlerName;

    const HANDLER_ALLOWLIST = {
      // --- Read Operations ---
      'hrtBootstrap_': typeof hrtBootstrap_ === 'function' ? hrtBootstrap_ : null,
      'hrtGetItems_': typeof hrtGetItems_ === 'function' ? hrtGetItems_ : null,
      'hrtGetItemDetail_': typeof hrtGetItemDetail_ === 'function' ? hrtGetItemDetail_ : null,
      'hrtGetDashboardMetrics_': typeof hrtGetDashboardMetrics_ === 'function' ? hrtGetDashboardMetrics_ : null,
      'hrtGetFsnList_': typeof hrtGetFsnList_ === 'function' ? hrtGetFsnList_ : null,
      'hrtGetRequisitions_': typeof hrtGetRequisitions_ === 'function' ? hrtGetRequisitions_ : null,
      'hrtGetRequisitionDetail_': typeof hrtGetRequisitionDetail_ === 'function' ? hrtGetRequisitionDetail_ : null,
      'hrtResolveQr_': typeof hrtResolveQr_ === 'function' ? hrtResolveQr_ : null,
      'hrtListQrCodes_': typeof hrtListQrCodes_ === 'function' ? hrtListQrCodes_ : null,
      'hrtCheckIdempotency_': typeof hrtCheckIdempotency_ === 'function' ? hrtCheckIdempotency_ : null,
      'hrtGetItemLedger_': typeof hrtGetItemLedger_ === 'function' ? hrtGetItemLedger_ : null,
      'hrtGetAuditLogs_': typeof hrtGetAuditLogs_ === 'function' ? hrtGetAuditLogs_ : null,
      'hrtVerifyAuditIntegrity_': typeof hrtVerifyAuditIntegrity_ === 'function' ? hrtVerifyAuditIntegrity_ : null,
      'hrtGetYearEndAudit_': typeof hrtGetYearEndAudit_ === 'function' ? hrtGetYearEndAudit_ : null,
      'hrtGetPdReport_': typeof hrtGetPdReport_ === 'function' ? hrtGetPdReport_ : null,
      'hrtGetCurrentUser_': typeof hrtGetCurrentUser_ === 'function' ? hrtGetCurrentUser_ : null,
      'hrtGetUsers_': typeof hrtGetUsers_ === 'function' ? hrtGetUsers_ : null,
      'hrtGetSettings_': typeof hrtGetSettings_ === 'function' ? hrtGetSettings_ : null,
      'hrtCheckHealth_': typeof hrtCheckHealth_ === 'function' ? hrtCheckHealth_ : null,
      'hrtBackupFull_': typeof hrtBackupFull_ === 'function' ? hrtBackupFull_ : null,
      'hrtGetAllDepartments_': typeof hrtGetAllDepartments_ === 'function' ? hrtGetAllDepartments_ : null,
      'hrtValidateImportItems_': typeof hrtValidateImportItems_ === 'function' ? hrtValidateImportItems_ : null,
      'hrtGetSettingsSection_': typeof hrtGetSettingsSection_ === 'function' ? hrtGetSettingsSection_ : null,
      'hrtGetAllFiscalYears_': typeof hrtGetAllFiscalYears_ === 'function' ? hrtGetAllFiscalYears_ : null,
      'hrtGetMasterData_': typeof hrtGetMasterData_ === 'function' ? hrtGetMasterData_ : null,
      'hrtPreviewQr_': typeof hrtPreviewQr_ === 'function' ? hrtPreviewQr_ : null,
      'hrtListBackups_': typeof hrtListBackups_ === 'function' ? hrtListBackups_ : null,
      'hrtValidateRestore_': typeof hrtValidateRestore_ === 'function' ? hrtValidateRestore_ : null,
      'hrtGetAllCategories_': typeof hrtGetAllCategories_ === 'function' ? hrtGetAllCategories_ : null,
      'hrtGetAllWarehouses_': typeof hrtGetAllWarehouses_ === 'function' ? hrtGetAllWarehouses_ : null,

      // --- Write Operations ---
      'hrtCreateItem_': typeof hrtCreateItem_ === 'function' ? hrtCreateItem_ : null,
      'hrtUpdateItem_': typeof hrtUpdateItem_ === 'function' ? hrtUpdateItem_ : null,
      'hrtImportItems_': typeof hrtImportItems_ === 'function' ? hrtImportItems_ : null,
      'hrtCreateRequisition_': typeof hrtCreateRequisition_ === 'function' ? hrtCreateRequisition_ : null,
      'hrtCancelRequisition_': typeof hrtCancelRequisition_ === 'function' ? hrtCancelRequisition_ : null,
      'hrtReviewRequisition_': typeof hrtReviewRequisition_ === 'function' ? hrtReviewRequisition_ : null,
      'hrtApproveRequisition_': typeof hrtApproveRequisition_ === 'function' ? hrtApproveRequisition_ : null,
      'hrtRejectRequisition_': typeof hrtRejectRequisition_ === 'function' ? hrtRejectRequisition_ : null,
      'hrtIssueStock_': typeof hrtIssueStock_ === 'function' ? hrtIssueStock_ : null,
      'hrtConfirmReceipt_': typeof hrtConfirmReceipt_ === 'function' ? hrtConfirmReceipt_ : null,
      'hrtReceiveStock_': typeof hrtReceiveStock_ === 'function' ? hrtReceiveStock_ : null,
      'hrtAdjustStock_': typeof hrtAdjustStock_ === 'function' ? hrtAdjustStock_ : null,
      'hrtReconcileStockBalances_': typeof hrtReconcileStockBalances_ === 'function' ? hrtReconcileStockBalances_ : null,
      'hrtAddFsn_': typeof hrtAddFsn_ === 'function' ? hrtAddFsn_ : null,
      'hrtLinkFsnToItem_': typeof hrtLinkFsnToItem_ === 'function' ? hrtLinkFsnToItem_ : null,
      'hrtCreateQrCode_': typeof hrtCreateQrCode_ === 'function' ? hrtCreateQrCode_ : null,
      'hrtRevokeQrCode_': typeof hrtRevokeQrCode_ === 'function' ? hrtRevokeQrCode_ : null,
      'hrtStartYearEndAudit_': typeof hrtStartYearEndAudit_ === 'function' ? hrtStartYearEndAudit_ : null,
      'hrtSaveYearEndAudit_': typeof hrtSaveYearEndAudit_ === 'function' ? hrtSaveYearEndAudit_ : null,
      'hrtCloseFiscalYear_': typeof hrtCloseFiscalYear_ === 'function' ? hrtCloseFiscalYear_ : null,
      'hrtUpdateSettings_': typeof hrtUpdateSettings_ === 'function' ? hrtUpdateSettings_ : null,
      'hrtUpdateSettingsSection_': typeof hrtUpdateSettingsSection_ === 'function' ? hrtUpdateSettingsSection_ : null,
      'hrtCreateUser_': typeof hrtCreateUser_ === 'function' ? hrtCreateUser_ : null,
      'hrtUpdateUser_': typeof hrtUpdateUser_ === 'function' ? hrtUpdateUser_ : null,
      'hrtSuspendUser_': typeof hrtSuspendUser_ === 'function' ? hrtSuspendUser_ : null,
      'hrtSetupInitialFiscalYear_': typeof hrtSetupInitialFiscalYear_ === 'function' ? hrtSetupInitialFiscalYear_ : null,
      'hrtUpsertMasterData_': typeof hrtUpsertMasterData_ === 'function' ? hrtUpsertMasterData_ : null,
      'hrtDeactivateMasterData_': typeof hrtDeactivateMasterData_ === 'function' ? hrtDeactivateMasterData_ : null
    };

    return HANDLER_ALLOWLIST.hasOwnProperty(handlerName) ? HANDLER_ALLOWLIST[handlerName] : null;
  }`;

// Replace the dispatch block in routeRequest
const oldDispatchBlock = `      // 5. Dispatch to Business Handler
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

      result = handlerFn(payload, caller, reqId);`;

const newDispatchBlock = `      // 5. Dispatch to Allowlisted Business Handler
      let result = null;
      const handlerFn = resolveAllowlistedHandler(route.handler);

      if (typeof handlerFn !== 'function') {
        const err = new Error('INTERNAL_ERROR: Business handler function "' + route.handler + '" is not defined or permitted in allowlist.');
        err.code = 'INTERNAL_ERROR';
        throw err;
      }

      result = handlerFn(payload, caller, reqId);`;

if (apiContent.includes(oldDispatchBlock)) {
  // Insert resolveAllowlistedHandler right before routeRequest
  const insertMarker = '  function routeRequest(action, rawPayload, reqId) {';
  apiContent = apiContent.replace(insertMarker, handlerResolverCode + '\n\n' + insertMarker);
  apiContent = apiContent.replace(oldDispatchBlock, newDispatchBlock);
  console.log('[OK] Installed explicit allowlisted function registry in Api.gs');
} else {
  console.warn('[WARN] Could not find oldDispatchBlock in Api.gs');
}

fs.writeFileSync('Api.gs', apiContent, 'utf8');
new Function(apiContent);
console.log('[OK] Api.gs valid JS!');

console.log('=== Step 5: Patching Code.gs ===');
let codeContent = fs.readFileSync('Code.gs', 'utf8');

// 1. Rename include to include_ with allowlist
const oldIncludeRegex = /function include\(filename\) \{[\s\S]*?return `<!-- Failed to include: \${filename} -->`;\s*\}\s*\}/;

const newInclude = `function include_(filename) {
  const ALLOWLISTED_TEMPLATES = ['index.html', 'MiniUI.html'];
  const safeFilename = String(filename || '').trim();

  if (!ALLOWLISTED_TEMPLATES.includes(safeFilename)) {
    Logger.log('Security Warning: Unauthorized template inclusion request for "' + safeFilename + '".');
    return '<!-- Security Alert: Template "' + safeFilename + '" is not permitted -->';
  }

  try {
    return HtmlService.createHtmlOutputFromFile(safeFilename).getContent();
  } catch (err) {
    Logger.log('Warning: Failed to include file "' + safeFilename + '": ' + err.message);
    return '<!-- Failed to include: ' + safeFilename + ' -->';
  }
}`;

if (oldIncludeRegex.test(codeContent)) {
  codeContent = codeContent.replace(oldIncludeRegex, newInclude);
  console.log('[OK] Replaced include with secure allowlisted include_ in Code.gs');
} else {
  console.warn('[WARN] Could not match oldIncludeRegex in Code.gs');
}

// 2. Harden doPost against client-supplied spoofing
const oldDoPostRegex = /function doPost\(e\) \{[\s\S]*?responseData = ApiRouter\.routeRequest\(action, payload, requestId\);/;

const newDoPost = `function doPost(e) {
  let responseData;
  try {
    const postData = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const action = postData.action;
    const payload = postData.payload || {};
    const requestId = postData.requestId || (typeof IdService !== 'undefined' ? IdService.generateRequestId() : null);

    // Strips client-supplied spoofed identity fields from top-level payload before routing
    if (payload && typeof payload === 'object') {
      delete payload.caller;
      delete payload._serverActor;
      delete payload.userRole;
      delete payload.callerRole;
    }

    responseData = ApiRouter.routeRequest(action, payload, requestId);`;

if (oldDoPostRegex.test(codeContent)) {
  codeContent = codeContent.replace(oldDoPostRegex, newDoPost);
  console.log('[OK] Hardened doPost against client identity spoofing in Code.gs');
} else {
  console.warn('[WARN] Could not match oldDoPostRegex in Code.gs');
}

// 3. Remove public initDatabase facade so client cannot invoke via google.script.run, keeping only initDatabase_
const oldInitDatabaseFacade = `function initDatabase() {
  const caller = ApiRouter.resolveAuthenticatedUser(true);
  if (!caller || caller.role !== 'ADMIN') {
    const err = new Error('FORBIDDEN: initDatabase requires ADMIN role.');
    err.code = 'FORBIDDEN';
    throw err;
  }
  return initDatabase_();
}

function initDatabase_() {`;

const newInitDatabase = `function initDatabase_() {
  const caller = ApiRouter.resolveAuthenticatedUser(true);
  if (!caller || caller.role !== 'ADMIN') {
    const err = new Error('FORBIDDEN: initDatabase requires ADMIN role.');
    err.code = 'FORBIDDEN';
    throw err;
  }
  return _runInitDatabaseSchema();
}

function _runInitDatabaseSchema() {`;

if (codeContent.includes(oldInitDatabaseFacade)) {
  codeContent = codeContent.replace(oldInitDatabaseFacade, newInitDatabase);
  console.log('[OK] Removed public initDatabase facade; kept private initDatabase_ in Code.gs');
} else {
  console.warn('[WARN] Could not find oldInitDatabaseFacade in Code.gs');
}

fs.writeFileSync('Code.gs', codeContent, 'utf8');
new Function(codeContent);
console.log('[OK] Code.gs valid JS!');
