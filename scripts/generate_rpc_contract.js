const fs = require('fs');

const contracts = [
  // 1. Dashboard & KPIs
  {
    consumer: "index.html:DashboardApi.getKPIs",
    public_facade: "apiGetDashboardKPIs",
    action: "dashboard.metrics",
    args: "filters (Object)",
    canonical_payload: "{ fiscalYear, dept, category, warehouse, status }",
    handler: "hrtGetDashboardMetrics_",
    data_shape: "Object { fiscalYear, totalItems, totalSKUs, totalStockUnits, totalValue, filteredValue, normalCount, lowCount, criticalCount, kpis: { totalSKU, totalStockQty, totalAssetValue, lowStockCount, criticalStockCount, healthyCount } }",
    permission: "VIEW_INVENTORY",
    effects: "Pure read with 120s script cache; computes universe metrics"
  },
  {
    consumer: "index.html:ApiService.call('apiGetDashboardMetrics')",
    public_facade: "apiGetDashboardMetrics",
    action: "dashboard.metrics",
    args: "filters (Object)",
    canonical_payload: "{ fiscalYear, dept }",
    handler: "hrtGetDashboardMetrics_",
    data_shape: "Object { fiscalYear, totalItems, totalValue, normalCount, lowCount, criticalCount, monthlyTrends, recentTransactions }",
    permission: "VIEW_INVENTORY",
    effects: "Pure read with 120s script cache"
  },

  // 2. Items & Master Catalog
  {
    consumer: "index.html:ItemApi.getItems",
    public_facade: "apiGetItems",
    action: "items.list",
    args: "filter (Object)",
    canonical_payload: "{ fiscalYear, page, limit, category, warehouse, status, search, abc }",
    handler: "hrtGetItems_",
    data_shape: "Object { items: Array<Item>, totalCount, totalUniverseCount, totalUniverseValue, filteredValue, filteredQuantity, page, limit, totalPages, summary: { countA, countB, countC, lowStockCount, criticalStockCount, normalCount } }",
    permission: "VIEW_INVENTORY",
    effects: "Pure read; movement classification; Pareto ABC tiering"
  },
  {
    consumer: "index.html:ItemApi.getItemDetail",
    public_facade: "apiGetItemDetail",
    action: "items.get",
    args: "code (string/object)",
    canonical_payload: "{ item_code: '...' }",
    handler: "hrtGetItemDetail_",
    data_shape: "Object { code, fsn_code, name, category, unit, warehouse, unit_cost, min, rop, stock, supplier, status, ledger: Array }",
    permission: "VIEW_INVENTORY",
    effects: "Pure read"
  },
  {
    consumer: "index.html:ItemApi.createItem",
    public_facade: "apiCreateItem",
    action: "items.create",
    args: "payload (Object)",
    canonical_payload: "{ code, name, category, unit, warehouse, unit_cost, min, stock, supplier }",
    handler: "hrtCreateItem_",
    data_shape: "Object { success: true, item: Object, code: '...' }",
    permission: "MANAGE_ITEMS",
    effects: "Appends 03_Master_Items; records initial stock ledger; mandatory audit log"
  },
  {
    consumer: "index.html:ItemApi.updateItem",
    public_facade: "apiUpdateItem",
    action: "items.update",
    args: "payload (Object)",
    canonical_payload: "{ code, name, category, unit, warehouse, unit_cost, min, rop, supplier }",
    handler: "hrtUpdateItem_",
    data_shape: "Object { success: true, item: Object }",
    permission: "MANAGE_ITEMS",
    effects: "Updates row in 03_Master_Items; busts cache; mandatory audit log"
  },
  {
    consumer: "index.html:ItemApi.importItems",
    public_facade: "apiImportItems",
    action: "items.import",
    args: "payload (Object)",
    canonical_payload: "{ items: Array<Object>, mode: 'APPEND'|'REPLACE', dryRun: boolean }",
    handler: "hrtImportItems_",
    data_shape: "Object { success: true, importedCount: number, errors: Array }",
    permission: "IMPORT_ITEMS",
    effects: "Batch upserts 03_Master_Items; formula sanitization; mandatory audit log"
  },

  // 3. Requisitions Lifecycle
  {
    consumer: "index.html:RequisitionApi.getRequisitions / App.js:loadRequisitionsQueue",
    public_facade: "apiGetRequisitions",
    action: "requisitions.list",
    args: "filters (Object)",
    canonical_payload: "{ status, dept, fiscalYear }",
    handler: "hrtGetRequisitions_",
    data_shape: "Array<Requisition> [ { req_id, req_no, req_date, user_id, dept, purpose, status, approver_id, approved_at, issued_at, source, fiscal_year, total_items, urgency, required_date, items: Array } ]",
    permission: "VIEW_OWN_REQUISITIONS",
    effects: "Scoped query (Requesters view own; Officers view all)"
  },
  {
    consumer: "index.html:RequisitionApi.getRequisitionDetail",
    public_facade: "apiGetRequisitionDetail",
    action: "requisitions.get",
    args: "payload (Object)",
    canonical_payload: "{ requisition_id: '...' }",
    handler: "hrtGetRequisitionDetail_",
    data_shape: "Object { req_id, req_no, req_date, user_id, dept, purpose, status, approver_id, approved_at, issued_at, source, fiscal_year, total_items, urgency, required_date, items: Array }",
    permission: "VIEW_OWN_REQUISITIONS",
    effects: "Ownership check; returns lines with current item_name"
  },
  {
    consumer: "index.html:RequisitionApi.createRequisition / MiniUI:submitCart",
    public_facade: "apiCreateRequisition",
    action: "requisitions.create",
    args: "payload (Object)",
    canonical_payload: "{ items: Array, purpose, dept, source: 'CENTRAL_WEB'|'MINI_QR', urgency, required_date }",
    handler: "hrtCreateRequisition_",
    data_shape: "Object { success: true, req_id, req_no, status: 'SUBMITTED', source, itemsCount }",
    permission: "CREATE_REQUISITION",
    effects: "Appends 07_Requisitions & 08_Requisition_Items; doc sequence lock; mandatory audit log"
  },
  {
    consumer: "index.html:RequisitionApi.submitRequisition",
    public_facade: "apiSubmitRequisition",
    action: "requisitions.submit",
    args: "payload (Object containing items)",
    canonical_payload: "{ items: Array, purpose, dept, urgency, required_date }",
    handler: "hrtCreateRequisition_",
    data_shape: "Object { success: true, req_id, req_no, status: 'SUBMITTED' }",
    permission: "CREATE_REQUISITION",
    effects: "Explicit creation/submission; rejects ambiguous string reqId without items"
  },
  {
    consumer: "index.html:OfficerReviewModal",
    public_facade: "apiReviewRequisition",
    action: "requisitions.review",
    args: "payload (Object)",
    canonical_payload: "{ requisition_id, comments, adjusted_items }",
    handler: "hrtReviewRequisition_",
    data_shape: "Object { success: true, req_id, status: 'REVIEWED' }",
    permission: "REVIEW_REQUISITION",
    effects: "Transitions SUBMITTED -> REVIEWED; updates quantities; mandatory audit log"
  },
  {
    consumer: "index.html:RequisitionApi.approveRequisition",
    public_facade: "apiApproveRequisition",
    action: "requisitions.approve",
    args: "payload (Object)",
    canonical_payload: "{ requisition_id, approver_note }",
    handler: "hrtApproveRequisition_",
    data_shape: "Object { success: true, req_id, status: 'APPROVED' }",
    permission: "APPROVE_REQUISITION",
    effects: "Transitions REVIEWED -> APPROVED; mandatory audit log"
  },
  {
    consumer: "index.html:RequisitionApi.rejectRequisition",
    public_facade: "apiRejectRequisition",
    action: "requisitions.reject",
    args: "payload (Object)",
    canonical_payload: "{ requisition_id, reason }",
    handler: "hrtRejectRequisition_",
    data_shape: "Object { success: true, req_id, status: 'REJECTED' }",
    permission: "REJECT_REQUISITION",
    effects: "Transitions to REJECTED; mandatory audit log"
  },

  // 4. Stock Mutations & Ledger
  {
    consumer: "index.html:StockApi.issueStock",
    public_facade: "apiIssueStock",
    action: "stock.issue",
    args: "payload (Object)",
    canonical_payload: "{ requisition_id, items: Array }",
    handler: "hrtIssueStock_",
    data_shape: "Object { success: true, tx_id, status: 'ISSUED', itemsIssued: Array }",
    permission: "ISSUE_STOCK",
    effects: "Deducts physical stock in 03_Master_Items; double-entry ledger in 10_Stock_Ledger; mandatory audit log"
  },
  {
    consumer: "index.html:StockApi.receiveStock",
    public_facade: "apiReceiveStock",
    action: "stock.receive",
    args: "payload (Object)",
    canonical_payload: "{ item_code, qty, unit_cost, supplier, doc_ref }",
    handler: "hrtReceiveStock_",
    data_shape: "Object { success: true, tx_id, new_balance, new_unit_cost }",
    permission: "RECEIVE_STOCK",
    effects: "Increases stock; recalculates moving average unit cost; 10_Stock_Ledger; mandatory audit log"
  },
  {
    consumer: "index.html:StockApi.getItemLedger",
    public_facade: "apiGetItemLedger",
    action: "stock.ledger",
    args: "itemId (string), options (Object)",
    canonical_payload: "{ item_code: '...', fiscalYear }",
    handler: "hrtGetItemLedger_",
    data_shape: "Array<LedgerEntry> [ { ledger_id, item_code, tx_id, tx_type, qty_in, qty_out, balance, unit_cost, created_at } ]",
    permission: "VIEW_INVENTORY",
    effects: "Pure read from 10_Stock_Ledger"
  },
  {
    consumer: "index.html:StockApi.reconcileBalance",
    public_facade: "apiReconcileBalance",
    action: "stock.reconcile",
    args: "itemId (string)",
    canonical_payload: "{ item_code: '...' }",
    handler: "hrtReconcileStockBalances_",
    data_shape: "Object { item_code, master_stock, ledger_balance, in_sync: boolean, adjusted: boolean }",
    permission: "MANAGE_SETTINGS",
    effects: "Reconciles 03_Master_Items against 10_Stock_Ledger transactions; mandatory audit log"
  },

  // 5. Audit Trail & Integrity
  {
    consumer: "index.html:StockApi.getAuditTrail",
    public_facade: "apiGetAuditTrail",
    action: "audit.list",
    args: "filter (Object)",
    canonical_payload: "{ module, actor_id, startDate, endDate, limit }",
    handler: "hrtGetAuditLogs_",
    data_shape: "Array<AuditLog> [ { audit_id, timestamp, actor_id, email, action, module, prev_hash, record_hash, details } ]",
    permission: "VIEW_AUDIT_LOG",
    effects: "Pure read from 11_Audit_Trail with sanitized output"
  },
  {
    consumer: "index.html:StockApi.verifyAuditIntegrity",
    public_facade: "apiVerifyAuditIntegrity",
    action: "audit.verify",
    args: "none",
    canonical_payload: "{}",
    handler: "hrtVerifyAuditIntegrity_",
    data_shape: "Object { valid: boolean, verifiedRecords: number, unbrokenChain: boolean, brokenRecordId: string|null }",
    permission: "VERIFY_AUDIT_LOG",
    effects: "Cryptographic SHA-256 genesis hash chain recalculation"
  },

  // 6. QR Code Services
  {
    consumer: "index.html:QrScanner / MiniUI:scanQr",
    public_facade: "apiResolveQr",
    action: "qr.resolve",
    args: "payload (Object)",
    canonical_payload: "{ qr_token: '...' } (supports qr_data, code, ref)",
    handler: "hrtResolveQr_",
    data_shape: "Object { type: 'ITEM'|'WAREHOUSE'|'TRACKING'|'CATALOG', ref, item?: Object, warehouse?: Object, requisition?: Object }",
    permission: "QR_RESOLVE",
    effects: "Pure read; rejects revoked/invalid tokens without opening resource"
  },
  {
    consumer: "index.html:QrManager.listQrs",
    public_facade: "apiListQrCodes",
    action: "qr.list",
    args: "filters (Object)",
    canonical_payload: "{ type, status }",
    handler: "hrtListQrCodes_",
    data_shape: "Array<QRCode> [ { qr_id, token, type, target_ref, label, status, created_at, created_by } ]",
    permission: "MANAGE_QR",
    effects: "Pure read from 14_QR_Registry"
  },
  {
    consumer: "index.html:QrManager.createQr",
    public_facade: "apiCreateQrCode",
    action: "qr.create",
    args: "payload (Object)",
    canonical_payload: "{ type: 'ITEM'|'WAREHOUSE'|'TRACKING'|'CATALOG', target_ref, label }",
    handler: "hrtCreateQrCode_",
    data_shape: "Object { success: true, qr_id, token, status: 'ACTIVE' }",
    permission: "MANAGE_QR",
    effects: "Appends 14_QR_Registry; mandatory audit log"
  },
  {
    consumer: "index.html:QrManager.revokeQr",
    public_facade: "apiRevokeQrCode",
    action: "qr.revoke",
    args: "payload (Object)",
    canonical_payload: "{ qr_id, token }",
    handler: "hrtRevokeQrCode_",
    data_shape: "Object { success: true, qr_id, status: 'REVOKED' }",
    permission: "MANAGE_QR",
    effects: "Updates status to REVOKED in 14_QR_Registry; mandatory audit log"
  },

  // 7. Identity & User Management
  {
    consumer: "index.html:UserApi.getCurrentUser / MiniUI:initApp",
    public_facade: "apiGetCurrentUser",
    action: "users.current",
    args: "none",
    canonical_payload: "{}",
    handler: "hrtGetCurrentUser_",
    data_shape: "Object { id, username, name, email, role, department, status, permissions: Array }",
    permission: "VIEW_INVENTORY",
    effects: "Pure read from Session/Token against 01_Users"
  },
  {
    consumer: "index.html:UserManagement.getUsers",
    public_facade: "apiGetUsers",
    action: "users.list",
    args: "filters (Object)",
    canonical_payload: "{ role, department, status }",
    handler: "hrtGetUsers_",
    data_shape: "Array<User> [ { user_id, username, name, email, role, department, status } ]",
    permission: "MANAGE_USERS",
    effects: "Pure read from 01_Users (ADMIN only)"
  },
  {
    consumer: "index.html:UserManagement.createUser",
    public_facade: "apiCreateUser",
    action: "users.create",
    args: "payload (Object)",
    canonical_payload: "{ email, name, role, department }",
    handler: "hrtCreateUser_",
    data_shape: "Object { success: true, user: Object }",
    permission: "MANAGE_USERS",
    effects: "Enforces email as username; appends 01_Users; mandatory audit log"
  },
  {
    consumer: "index.html:UserManagement.updateUser",
    public_facade: "apiUpdateUser",
    action: "users.update",
    args: "payload (Object)",
    canonical_payload: "{ user_id, email, name, role, department }",
    handler: "hrtUpdateUser_",
    data_shape: "Object { success: true, user: Object }",
    permission: "MANAGE_USERS",
    effects: "Last-Admin protection; updates 01_Users; mandatory audit log"
  },
  {
    consumer: "index.html:UserManagement.suspendUser",
    public_facade: "apiSuspendUser",
    action: "users.suspend",
    args: "payload (Object)",
    canonical_payload: "{ user_id, status: 'SUSPENDED'|'ACTIVE' }",
    handler: "hrtSuspendUser_",
    data_shape: "Object { success: true, user_id, status }",
    permission: "MANAGE_USERS",
    effects: "Last-Admin protection; updates status in 01_Users; mandatory audit log"
  },

  // 8. Settings & Configuration
  {
    consumer: "index.html:SettingsManager.loadSettings",
    public_facade: "apiGetSettings",
    action: "settings.get",
    args: "none",
    canonical_payload: "{}",
    handler: "hrtGetSettings_",
    data_shape: "Object { schoolProfile: Object, documents: Object, masterData: Object, rules: Object, connection: Object, revisionId: string }",
    permission: "VIEW_INVENTORY",
    effects: "Pure read; role-scoped sections; includes revisionId"
  },
  {
    consumer: "index.html:SettingsManager.saveCurrentSectionChanges",
    public_facade: "apiUpdateSettingsSection",
    action: "settings.updateSection",
    args: "payload (Object)",
    canonical_payload: "{ section: string, data: Object, expectedRevisionId: string }",
    handler: "hrtUpdateSettingsSection_",
    data_shape: "Object { success: true, section, updatedCount, revisionId, timestamp }",
    permission: "MANAGE_SETTINGS",
    effects: "Field alias mapping; optimistic concurrency check; preserves false and 0; bumps revisionId; mandatory audit log"
  },
  {
    consumer: "index.html:SettingsManager.updateSettings",
    public_facade: "apiUpdateSettings",
    action: "settings.update",
    args: "payload (Object)",
    canonical_payload: "{ settings: Object, expectedRevisionId: string }",
    handler: "hrtUpdateSettings_",
    data_shape: "Object { success: true, section, updatedCount, revisionId, timestamp }",
    permission: "MANAGE_SETTINGS",
    effects: "Global settings update; preserves false and 0; bumps revisionId; mandatory audit log"
  }
];

const headers = ['consumer', 'public_facade', 'action', 'args', 'canonical_payload', 'handler', 'data_shape', 'permission', 'effects'];
const rows = [headers.join(',')];

contracts.forEach(c => {
  rows.push([
    `"${c.consumer}"`,
    `"${c.public_facade}"`,
    `"${c.action}"`,
    `"${c.args}"`,
    `"${c.canonical_payload}"`,
    `"${c.handler}"`,
    `"${c.data_shape.replace(/"/g, '""')}"`,
    `"${c.permission}"`,
    `"${c.effects}"`
  ].join(','));
});

fs.writeFileSync('docs/repair/RPC_CONTRACT.csv', rows.join('\n'), 'utf8');
console.log('Successfully generated docs/repair/RPC_CONTRACT.csv with ' + contracts.length + ' contract specifications.');
