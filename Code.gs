/**
 * Code.gs - Google Apps Script Master Entry Point & HTTP Gateway
 * Layer: Root / Entry Point
 * Standard: HTML WebApp Server, doPost REST Gateway & google.script.run Facade
 */

/**
 * Serves the Single-Page Application (SPA) shell
 */
function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.view === 'mini') {
      const template = HtmlService.createTemplateFromFile('MiniUI.html');
      return template.evaluate()
        .setTitle('HRT MiniUI — ขอเบิกพัสดุ (โรงเรียนหรเทพฯ)')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    const template = HtmlService.createTemplateFromFile('index.html');
    return template.evaluate()
      .setTitle(typeof CONFIG !== 'undefined' ? CONFIG.APP_NAME + ' v' + (CONFIG.APP_VERSION || CONFIG.VERSION || '2.7.0-rc.5') : 'HRT School Inventory System')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    // Fallback if index.html is loaded from frontend/main/
    try {
      const fallback = HtmlService.createTemplateFromFile('frontend/main/index.html');
      return fallback.evaluate()
        .setTitle('HRT School Inventory System')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (e2) {
      return HtmlService.createHtmlOutput(`<h3>Error initializing Web App: ${err.message}</h3>`);
    }
  }
}

/**
 * Handles incoming HTTP POST requests (REST API Gateway)
 */
function doPost(e) {
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

    responseData = ApiRouter.routeRequest(action, payload, requestId);
  } catch (err) {
    responseData = {
      success: false,
      error: { code: 'HTTP_PARSE_ERROR', message: err.message },
      timestamp: new Date().toISOString()
    };
  }

  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Server-Side Template Includer for Apps Script HTMLService
 */
function include_(filename) {
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
}

/**
 * Universal google.script.run Action Dispatcher
 */
function apiCall(action, payload) {
  return ApiRouter.routeRequest(action, payload);
}

/**
 * Universal RPC Gateway Alias for HRT Systems
 */
function HRT_rpc(action, payload) {
  return ApiRouter.routeRequest(action, payload);
}

function apiGetDashboardKPIs(filters) {
  const res = ApiRouter.routeRequest('dashboard.metrics', filters);
  if (res && res.success) {
    const m = (res.data && typeof res.data === 'object') ? res.data : res;
    res.metrics = m;
    res.kpis = {
      totalSKU: (typeof m.totalSKUs === 'number') ? m.totalSKUs : (m.totalItems || 0),
      totalStockQty: (typeof m.totalStockUnits === 'number') ? m.totalStockUnits : 0,
      totalAssetValue: (typeof m.totalValue === 'number') ? m.totalValue : (typeof m.filteredValue === 'number' ? m.filteredValue : 0),
      lowStockCount: (typeof m.lowCount === 'number') ? m.lowCount : (m.lowStockCount || 0),
      criticalStockCount: (typeof m.criticalCount === 'number') ? m.criticalCount : (m.criticalStockCount || 0),
      healthyCount: (typeof m.normalCount === 'number') ? m.normalCount : 0
    };
  }
  return res;
}

function apiSubmitRequisition(payload) {
  if (typeof payload === 'string' || !payload || typeof payload !== 'object') throw new Error('VALIDATION_ERROR: apiSubmitRequisition requires a requisition payload object with line items. To review an existing requisition, call apiReviewRequisition.');
  return ApiRouter.routeRequest('requisitions.create', payload);
}

function apiGetItemLedger(payload) {
  return ApiRouter.routeRequest('stock.ledger', typeof payload === 'string' ? { item_code: payload } : payload);
}

function apiReconcileBalance(payload) {
  return ApiRouter.routeRequest('stock.reconcile', typeof payload === 'string' ? { item_code: payload } : payload);
}

function apiGetAuditTrail(filters) {
  const res = ApiRouter.routeRequest('audit.list', filters);
  if (res && res.logs) {
    res.audit = res.logs;
  }
  return res;
}

function apiUpdateSettingsSection(payload) {
  return ApiRouter.routeRequest('settings.updateSection', payload);
}

// -------------------------------------------------------------
// Direct RPC Facade Functions (for seamless google.script.run calls)
// -------------------------------------------------------------
function apiBootstrap(payload) { return ApiRouter.routeRequest('bootstrap', payload); }
function bootstrap(payload) { return ApiRouter.routeRequest('bootstrap', payload); }

function apiGetItems(params) { return ApiRouter.routeRequest('items.list', params); }
function getItems(params) { return ApiRouter.routeRequest('items.list', params); }

function apiGetItemDetail(itemCode) {
  const code = (itemCode && typeof itemCode === 'object') ? (itemCode.item_code || itemCode.code || itemCode.id) : itemCode;
  return ApiRouter.routeRequest('items.get', { item_code: code });
}
function getItemDetail(itemCode) {
  const code = (itemCode && typeof itemCode === 'object') ? (itemCode.item_code || itemCode.code || itemCode.id) : itemCode;
  return ApiRouter.routeRequest('items.get', { item_code: code });
}

function apiCreateItem(payload) { return ApiRouter.routeRequest('items.create', payload); }
function apiUpdateItem(payload) { return ApiRouter.routeRequest('items.update', payload); }
function apiImportItems(payload) { return ApiRouter.routeRequest('items.import', payload); }
function importItems(payload) { return ApiRouter.routeRequest('items.import', payload); }
function apiValidateImportItems(payload) { return ApiRouter.routeRequest('items.validateImport', payload); }
function validateImportItems(payload) { return ApiRouter.routeRequest('items.validateImport', payload); }

function apiGetFsnList(params) { return ApiRouter.routeRequest('fsn.list', params); }
function getFsn(params) { return ApiRouter.routeRequest('fsn.list', params); }
function apiAddFsn(payload) { return ApiRouter.routeRequest('fsn.add', payload); }
function addFsn(payload) { return ApiRouter.routeRequest('fsn.add', payload); }
function apiLinkFsnToItem(payload) { return ApiRouter.routeRequest('fsn.link', payload); }
function linkFsnToItem(payload) { return ApiRouter.routeRequest('fsn.link', payload); }

function apiGetRequisitions(filters) { return ApiRouter.routeRequest('requisitions.list', filters); }
function getRequisitions(filters) { return ApiRouter.routeRequest('requisitions.list', filters); }
function apiGetRequisitionDetail(reqId) {
  const id = (reqId && typeof reqId === 'object') ? (reqId.requisition_id || reqId.req_id || reqId.id) : reqId;
  return ApiRouter.routeRequest('requisitions.get', { requisition_id: id });
}
function getRequisitionDetail(reqId) {
  const id = (reqId && typeof reqId === 'object') ? (reqId.requisition_id || reqId.req_id || reqId.id) : reqId;
  return ApiRouter.routeRequest('requisitions.get', { requisition_id: id });
}

function apiCreateRequisition(payload) { return ApiRouter.routeRequest('requisitions.create', payload); }
function createRequisition(payload) { return ApiRouter.routeRequest('requisitions.create', payload); }
function apiCancelRequisition(payload) { return ApiRouter.routeRequest('requisitions.cancel', payload); }
function cancelRequisition(payload) { return ApiRouter.routeRequest('requisitions.cancel', payload); }

function apiReviewRequisition(payload) { return ApiRouter.routeRequest('requisitions.review', payload); }
function reviewRequisition(payload) { return ApiRouter.routeRequest('requisitions.review', payload); }

function apiApproveRequisition(payload) { return ApiRouter.routeRequest('requisitions.approve', payload); }
function approveRequisition(payload) { return ApiRouter.routeRequest('requisitions.approve', payload); }
function apiRejectRequisition(payload) { return ApiRouter.routeRequest('requisitions.reject', payload); }
function rejectRequisition(payload) { return ApiRouter.routeRequest('requisitions.reject', payload); }

function apiIssueStock(payload) { return ApiRouter.routeRequest('requisitions.issue', payload); }
function issueStock(payload) { return ApiRouter.routeRequest('requisitions.issue', payload); }
function apiIssueRequisition(payload) { return ApiRouter.routeRequest('requisitions.issue', payload); }
function issueRequisition(payload) { return ApiRouter.routeRequest('requisitions.issue', payload); }

function apiConfirmReceipt(payload) { return ApiRouter.routeRequest('requisitions.receive', payload); }
function confirmReceipt(payload) { return ApiRouter.routeRequest('requisitions.receive', payload); }

function apiReceiveStock(payload) { return ApiRouter.routeRequest('stock.receive', payload); }
function receiveStock(payload) { return ApiRouter.routeRequest('stock.receive', payload); }
function restock(payload) { return ApiRouter.routeRequest('stock.receive', payload); }

function apiAdjustStock(payload) { return ApiRouter.routeRequest('stock.adjust', payload); }

function apiResolveQr(payload) { return ApiRouter.routeRequest('qr.resolve', payload); }
function resolveQr(payload) { return ApiRouter.routeRequest('qr.resolve', payload); }
function apiListQrCodes(payload) { return ApiRouter.routeRequest('qr.list', payload || {}); }
function apiCreateQrCode(payload) { return ApiRouter.routeRequest('qr.create', payload); }
function apiRevokeQrCode(payload) { return ApiRouter.routeRequest('qr.revoke', payload); }
function apiCheckIdempotency(payload) { return ApiRouter.routeRequest('idempotency.check', payload); }

function apiGetCurrentUser() { return ApiRouter.routeRequest('users.current', {}); }
function apiGetUsers() { return ApiRouter.routeRequest('users.list', {}); }
function apiCreateUser(payload) { return ApiRouter.routeRequest('users.create', payload); }
function apiUpdateUser(payload) { return ApiRouter.routeRequest('users.update', payload); }
function apiSuspendUser(payload) { return ApiRouter.routeRequest('users.suspend', payload); }

function apiGetSettings(payload) { return ApiRouter.routeRequest('settings.get', payload || {}); }
function apiUpdateSettings(payload) { return ApiRouter.routeRequest('settings.update', payload); }
function apiCheckHealth(payload) { return ApiRouter.routeRequest('settings.healthCheck', payload || {}); }
function checkHealth(payload) { return ApiRouter.routeRequest('settings.healthCheck', payload || {}); }
function apiBackupFull(payload) { return ApiRouter.routeRequest('settings.backup', payload || {}); }
function backupFull(payload) { return ApiRouter.routeRequest('settings.backup', payload || {}); }
function apiSetupInitialFiscalYear(payload) { return ApiRouter.routeRequest('fiscalYear.setupInitial', payload || {}); }
function setupInitialFiscalYear(payload) { return ApiRouter.routeRequest('fiscalYear.setupInitial', payload || {}); }
function apiGetDepartments() { return ApiRouter.routeRequest('departments.list', {}); }
function getDepartments() { return ApiRouter.routeRequest('departments.list', {}); }

function apiGetDashboardMetrics(filters) { return ApiRouter.routeRequest('dashboard.metrics', filters); }
function getDashboard(filters) { return ApiRouter.routeRequest('dashboard.metrics', filters); }

function apiGetPdReport(reportType, params) { return ApiRouter.routeRequest('reports.generate', { type: reportType, params }); }

function apiGetYearEndAudit(payload) { return ApiRouter.routeRequest('getYearEndAudit', payload); }
function getYearEndAudit(payload) { return ApiRouter.routeRequest('getYearEndAudit', payload); }
function apiStartYearEndAudit(payload) { return ApiRouter.routeRequest('startYearEndAudit', payload); }
function startYearEndAudit(payload) { return ApiRouter.routeRequest('startYearEndAudit', payload); }
function apiSaveYearEndAudit(payload) { return ApiRouter.routeRequest('saveYearEndAudit', payload); }
function saveYearEndAudit(payload) { return ApiRouter.routeRequest('saveYearEndAudit', payload); }

function apiCloseFiscalYear(payload) { return ApiRouter.routeRequest('fiscalYear.close', payload); }
function closeFiscalYear(payload) { return ApiRouter.routeRequest('fiscalYear.close', payload); }

function apiGetAuditLogs(filters) { return ApiRouter.routeRequest('audit.list', filters); }
function apiVerifyAuditIntegrity() { return ApiRouter.routeRequest('audit.verify', {}); }

/**
 * Provisions or verifies the 16-sheet canonical schema in Google Sheets (Strictly ADMIN authorized)
 */
function initDatabase_() {
  const caller = ApiRouter.resolveAuthenticatedUser(true);
  if (!caller || caller.role !== 'ADMIN') {
    const err = new Error('FORBIDDEN: initDatabase requires ADMIN role.');
    err.code = 'FORBIDDEN';
    throw err;
  }
  return _runInitDatabaseSchema_();
}

function _runInitDatabaseSchema_() {
  const ss = getSS();
  const schema = [
    { name: '01_Users', cols: ['user_id', 'username', 'name', 'email', 'role', 'department', 'status'] },
    { name: '02_Departments', cols: ['dept_id', 'dept_name', 'faculty_head', 'budget_code'] },
    { name: '03_Master_Items', cols: ['code', 'fsn_code', 'name', 'category', 'unit', 'warehouse', 'unit_cost', 'min', 'rop', 'stock', 'supplier', 'status'] },
    { name: '04_Categories', cols: ['category_id', 'category_name', 'code_prefix', 'icon'] },
    { name: '05_Warehouses', cols: ['warehouse_id', 'warehouse_name', 'building', 'room'] },
    { name: '06_FSN_Catalog', cols: ['fsn_code', 'group_code', 'group_name', 'class_code', 'fsc', 'name', 'spec', 'linked_code'] },
    { name: '07_Requisitions', cols: ['req_id', 'req_no', 'req_date', 'user_id', 'dept', 'purpose', 'status', 'approver_id', 'approved_at', 'issued_at'] },
    { name: '08_Requisition_Items', cols: ['id', 'req_id', 'item_code', 'qty_requested', 'qty_approved', 'unit'] },
    { name: '09_Stock_Transactions', cols: ['tx_id', 'date', 'doc_ref', 'type', 'item_code', 'qty', 'unit_cost', 'actor_id', 'note'] },
    { name: '10_Stock_Ledger', cols: ['ledger_id', 'item_code', 'tx_id', 'tx_type', 'qty_in', 'qty_out', 'balance', 'unit_cost', 'fiscal_year', 'created_at'] },
    { name: '11_Audit_Trail', cols: ['audit_id', 'timestamp', 'actor_id', 'email', 'action', 'module', 'prev_hash', 'record_hash', 'details'] },
    { name: '12_Fiscal_Years', cols: ['fiscal_year', 'start_date', 'end_date', 'status', 'closed_at', 'closed_by'] },
    { name: '13_Year_End_Audits', cols: ['count_id', 'fiscal_year', 'item_code', 'book_qty', 'count_qty', 'variance', 'condition', 'auditors'] },
    { name: '14_Disposal_Records', cols: ['disposal_id', 'fiscal_year', 'item_code', 'qty', 'method', 'committee', 'approval_date'] },
    { name: '15_Settings_Config', cols: ['key', 'value', 'description', 'updated_at'] },
    { name: '16_Idempotency_Log', cols: ['key', 'actor_id', 'action', 'payload_hash', 'status', 'result_json', 'created_at'] }
  ];

  const results = [];

  schema.forEach(sheetDef => {
    let sheet = null;
    try {
      sheet = getSheet(sheetDef.name);
    } catch (e) {
      sheet = ss.insertSheet(sheetDef.name);
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(sheetDef.cols);
      sheet.setFrozenRows(1);
      // [FIX-AUTH-03] Seed initial Primary Administrator account (winmax2006@gmail.com)
      if (sheetDef.name === '01_Users') {
        const primaryAdmin = (typeof CONFIG !== 'undefined' && CONFIG.PRIMARY_ADMIN_EMAIL) ? CONFIG.PRIMARY_ADMIN_EMAIL : 'winmax2006@gmail.com';
        sheet.appendRow(['USR-001', primaryAdmin, 'ผู้ดูแลระบบ (Admin)', primaryAdmin, 'ADMIN', 'งานบริหารทั่วไปและพัสดุ', 'ACTIVE']);
      }
      results.push(`Created sheet "${sheetDef.name}" with ${sheetDef.cols.length} columns.`);
    } else {
      results.push(`Sheet "${sheetDef.name}" already initialized.`);
    }
  });

  return { success: true, results: results };
}
