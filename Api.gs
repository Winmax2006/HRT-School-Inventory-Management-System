/**
 * Api.gs - Central API Router, Gateway, Security Guard & Action Dispatcher
 * Layer: Backend Gateway (HRT Inventory System v2.6.0)
 * Standard: P0 Fail-Closed Security, Persistent Idempotency Guard, Alias Normalization & RPC Routing
 */

const ApiRouter = (function() {
  'use strict';

  // Role Hierarchy Weight for Authorization Checks
  const ROLE_HIERARCHY = Object.freeze({
    'REQUESTER': 10,
    'TEACHER': 10,
    'OFFICER': 30,
    'APPROVER': 40,
    'DIRECTOR': 50,
    'ADMIN': 60
  });

  // Action to Handler & Permission Mapping
  const ACTION_REGISTRY = Object.freeze({
    // --- Read Operations ---
    'bootstrap': { handler: 'hrtBootstrap_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
    'items.list': { handler: 'hrtGetItems_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
    'getItems': { handler: 'hrtGetItems_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
    'items.get': { handler: 'hrtGetItemDetail_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
    'getItemDetail': { handler: 'hrtGetItemDetail_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
    
    'dashboard.metrics': { handler: 'hrtGetDashboardMetrics_', minRole: 'OFFICER', permission: 'VIEW_INVENTORY', isWrite: false },
    'getDashboard': { handler: 'hrtGetDashboardMetrics_', minRole: 'OFFICER', permission: 'VIEW_INVENTORY', isWrite: false },

    'fsn.list': { handler: 'hrtGetFsnList_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
    'getFsn': { handler: 'hrtGetFsnList_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },

    'requisitions.list': { handler: 'hrtGetRequisitions_', minRole: 'REQUESTER', permission: 'VIEW_OWN_REQUISITIONS', isWrite: false },
    'getRequisitions': { handler: 'hrtGetRequisitions_', minRole: 'REQUESTER', permission: 'VIEW_OWN_REQUISITIONS', isWrite: false },
    'requisitions.get': { handler: 'hrtGetRequisitionDetail_', minRole: 'REQUESTER', permission: 'VIEW_OWN_REQUISITIONS', isWrite: false },

    'qr.resolve': { handler: 'hrtResolveQr_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
    'resolveQr': { handler: 'hrtResolveQr_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
    'qr.list': { handler: 'hrtListQrCodes_', minRole: 'OFFICER', permission: 'MANAGE_QR', isWrite: false },
    'idempotency.check': { handler: 'hrtCheckIdempotency_', minRole: 'REQUESTER', permission: 'CREATE_REQUISITION', isWrite: false },
    'stock.ledger': { handler: 'hrtGetItemLedger_', minRole: 'OFFICER', permission: 'VIEW_INVENTORY', isWrite: false },
    'dashboard.kpis': { handler: 'hrtGetDashboardMetrics_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },

    'audit.list': { handler: 'hrtGetAuditLogs_', minRole: 'OFFICER', permission: 'VIEW_AUDIT_LOG', isWrite: false },
    'audit.verify': { handler: 'hrtVerifyAuditIntegrity_', minRole: 'ADMIN', permission: 'VERIFY_AUDIT_LOG', isWrite: false },
    'audit.getYearEnd': { handler: 'hrtGetYearEndAudit_', minRole: 'OFFICER', permission: 'YEAR_END_AUDIT', isWrite: false },
    'getYearEndAudit': { handler: 'hrtGetYearEndAudit_', minRole: 'OFFICER', permission: 'YEAR_END_AUDIT', isWrite: false },
    'reports.generate': { handler: 'hrtGetPdReport_', minRole: 'OFFICER', permission: 'VIEW_AUDIT_LOG', isWrite: false },

    'users.current': { handler: 'hrtGetCurrentUser_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
    'users.list': { handler: 'hrtGetUsers_', minRole: 'ADMIN', permission: 'MANAGE_USERS', isWrite: false },
    'settings.get': { handler: 'hrtGetSettings_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
    'settings.healthCheck': { handler: 'hrtCheckHealth_', minRole: 'OFFICER', permission: 'VIEW_AUDIT_LOG', isWrite: false },
    'checkHealth': { handler: 'hrtCheckHealth_', minRole: 'OFFICER', permission: 'VIEW_AUDIT_LOG', isWrite: false },
    'settings.backup': { handler: 'hrtBackupFull_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: false },
    'backupFull': { handler: 'hrtBackupFull_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: false },
    'departments.list': { handler: 'hrtGetAllDepartments_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
    'getDepartments': { handler: 'hrtGetAllDepartments_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
    'items.validateImport': { handler: 'hrtValidateImportItems_', minRole: 'OFFICER', permission: 'IMPORT_ITEMS', isWrite: false },
    'validateImportItems': { handler: 'hrtValidateImportItems_', minRole: 'OFFICER', permission: 'IMPORT_ITEMS', isWrite: false },

    // Prompt 07 Settings Logical Action Routes (Read)
    'settings.getSection': { handler: 'hrtGetSettingsSection_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
    'fiscalYears.list': { handler: 'hrtGetAllFiscalYears_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
    'masterData.list': { handler: 'hrtGetMasterData_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
    'qr.preview': { handler: 'hrtPreviewQr_', minRole: 'REQUESTER', permission: 'VIEW_INVENTORY', isWrite: false },
    'system.healthCheck': { handler: 'hrtCheckHealth_', minRole: 'OFFICER', permission: 'VIEW_AUDIT_LOG', isWrite: false },
    'imports.validate': { handler: 'hrtValidateImportItems_', minRole: 'OFFICER', permission: 'IMPORT_ITEMS', isWrite: false },
    'backups.list': { handler: 'hrtListBackups_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: false },
    'backups.validateRestore': { handler: 'hrtValidateRestore_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: false },

    // --- Write Operations (Require Lock & Persistent Idempotency) ---
    'items.create': { handler: 'hrtCreateItem_', minRole: 'OFFICER', permission: 'MANAGE_ITEMS', isWrite: true },
    'items.update': { handler: 'hrtUpdateItem_', minRole: 'OFFICER', permission: 'MANAGE_ITEMS', isWrite: true },
    'items.import': { handler: 'hrtImportItems_', minRole: 'OFFICER', permission: 'IMPORT_ITEMS', isWrite: true },
    'importItems': { handler: 'hrtImportItems_', minRole: 'OFFICER', permission: 'IMPORT_ITEMS', isWrite: true },

    'fiscalYear.setupInitial': { handler: 'hrtSetupInitialFiscalYear_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: true },
    'setupInitialFiscalYear': { handler: 'hrtSetupInitialFiscalYear_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: true },
    'fsn.link': { handler: 'hrtLinkFsnToItem_', minRole: 'OFFICER', permission: 'MANAGE_FSN', isWrite: true },
    'linkFsn': { handler: 'hrtLinkFsnToItem_', minRole: 'OFFICER', permission: 'MANAGE_FSN', isWrite: true },

    'requisitions.create': { handler: 'hrtCreateRequisition_', minRole: 'REQUESTER', permission: 'CREATE_REQUISITION', isWrite: true },
    'createRequisition': { handler: 'hrtCreateRequisition_', minRole: 'REQUESTER', permission: 'CREATE_REQUISITION', isWrite: true },
    'requisitions.submit': { handler: 'hrtCreateRequisition_', minRole: 'REQUESTER', permission: 'CREATE_REQUISITION', isWrite: true },
    'requisitions.cancel': { handler: 'hrtCancelRequisition_', minRole: 'REQUESTER', permission: 'CANCEL_OWN_REQUISITION', isWrite: true },
    'cancelRequisition': { handler: 'hrtCancelRequisition_', minRole: 'REQUESTER', permission: 'CANCEL_OWN_REQUISITION', isWrite: true },
    
    'requisitions.review': { handler: 'hrtReviewRequisition_', minRole: 'OFFICER', permission: 'REVIEW_REQUISITION', isWrite: true },
    'reviewRequisition': { handler: 'hrtReviewRequisition_', minRole: 'OFFICER', permission: 'REVIEW_REQUISITION', isWrite: true },

    'requisitions.approve': { handler: 'hrtApproveRequisition_', minRole: 'APPROVER', permission: 'APPROVE_REQUISITION', isWrite: true },
    'approveRequisition': { handler: 'hrtApproveRequisition_', minRole: 'APPROVER', permission: 'APPROVE_REQUISITION', isWrite: true },
    
    'requisitions.reject': { handler: 'hrtRejectRequisition_', minRole: 'APPROVER', permission: 'REJECT_REQUISITION', isWrite: true },
    'rejectRequisition': { handler: 'hrtRejectRequisition_', minRole: 'APPROVER', permission: 'REJECT_REQUISITION', isWrite: true },

    'requisitions.issue': { handler: 'hrtIssueStock_', minRole: 'OFFICER', permission: 'ISSUE_STOCK', isWrite: true },
    'stock.issue': { handler: 'hrtIssueStock_', minRole: 'OFFICER', permission: 'ISSUE_STOCK', isWrite: true },
    'issueStock': { handler: 'hrtIssueStock_', minRole: 'OFFICER', permission: 'ISSUE_STOCK', isWrite: true },
    'issueRequisition': { handler: 'hrtIssueStock_', minRole: 'OFFICER', permission: 'ISSUE_STOCK', isWrite: true },

    'requisitions.receive': { handler: 'hrtConfirmReceipt_', minRole: 'REQUESTER', permission: 'CREATE_REQUISITION', isWrite: true },
    'confirmReceipt': { handler: 'hrtConfirmReceipt_', minRole: 'REQUESTER', permission: 'CREATE_REQUISITION', isWrite: true },

    'stock.receive': { handler: 'hrtReceiveStock_', minRole: 'OFFICER', permission: 'RECEIVE_STOCK', isWrite: true },
    'restock': { handler: 'hrtReceiveStock_', minRole: 'OFFICER', permission: 'RECEIVE_STOCK', isWrite: true },
    'receiveStock': { handler: 'hrtReceiveStock_', minRole: 'OFFICER', permission: 'RECEIVE_STOCK', isWrite: true },

    'stock.adjust': { handler: 'hrtAdjustStock_', minRole: 'OFFICER', permission: 'ADJUST_STOCK', isWrite: true },
    'stock.reconcile': { handler: 'hrtReconcileStockBalances_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: true },

    'fsn.add': { handler: 'hrtAddFsn_', minRole: 'OFFICER', permission: 'MANAGE_FSN', isWrite: true },
    'addFsn': { handler: 'hrtAddFsn_', minRole: 'OFFICER', permission: 'MANAGE_FSN', isWrite: true },

    'qr.create': { handler: 'hrtCreateQrCode_', minRole: 'OFFICER', permission: 'MANAGE_QR', isWrite: true },
    'qr.revoke': { handler: 'hrtRevokeQrCode_', minRole: 'OFFICER', permission: 'MANAGE_QR', isWrite: true },

    'audit.startYearEnd': { handler: 'hrtStartYearEndAudit_', minRole: 'OFFICER', permission: 'YEAR_END_AUDIT', isWrite: true },
    'startYearEndAudit': { handler: 'hrtStartYearEndAudit_', minRole: 'OFFICER', permission: 'YEAR_END_AUDIT', isWrite: true },
    'audit.saveYearEnd': { handler: 'hrtSaveYearEndAudit_', minRole: 'OFFICER', permission: 'YEAR_END_AUDIT', isWrite: true },
    'saveYearEndAudit': { handler: 'hrtSaveYearEndAudit_', minRole: 'OFFICER', permission: 'YEAR_END_AUDIT', isWrite: true },
    'fiscalYear.close': { handler: 'hrtCloseFiscalYear_', minRole: 'ADMIN', permission: 'CLOSE_FISCAL_YEAR', isWrite: true },
    'closeFiscalYear': { handler: 'hrtCloseFiscalYear_', minRole: 'ADMIN', permission: 'CLOSE_FISCAL_YEAR', isWrite: true },

    'settings.update': { handler: 'hrtUpdateSettings_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: true },
    'settings.updateSection': { handler: 'hrtUpdateSettingsSection_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: true },
    'users.create': { handler: 'hrtCreateUser_', minRole: 'ADMIN', permission: 'MANAGE_USERS', isWrite: true },
    'users.update': { handler: 'hrtUpdateUser_', minRole: 'ADMIN', permission: 'MANAGE_USERS', isWrite: true },
    'users.updateAccess': { handler: 'hrtUpdateUser_', minRole: 'ADMIN', permission: 'MANAGE_USERS', isWrite: true },
    'users.suspend': { handler: 'hrtSuspendUser_', minRole: 'ADMIN', permission: 'MANAGE_USERS', isWrite: true },
    'users.deactivate': { handler: 'hrtSuspendUser_', minRole: 'ADMIN', permission: 'MANAGE_USERS', isWrite: true },
    'fiscalYears.prepare': { handler: 'hrtSetupInitialFiscalYear_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: true },
    'masterData.upsert': { handler: 'hrtUpsertMasterData_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: true },
    'masterData.deactivate': { handler: 'hrtDeactivateMasterData_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: true },
    'qr.disable': { handler: 'hrtRevokeQrCode_', minRole: 'OFFICER', permission: 'MANAGE_QR', isWrite: true },
    'imports.commit': { handler: 'hrtImportItems_', minRole: 'OFFICER', permission: 'IMPORT_ITEMS', isWrite: true },
    'backups.create': { handler: 'hrtBackupFull_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: true },

    // Direct api* Method Aliases for Seamless RPC Bridge
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
    'apiGetItemLedger': { handler: 'hrtGetItemLedger_', minRole: 'OFFICER', permission: 'VIEW_INVENTORY', isWrite: false },
  });

  /**
   * Normalizes parameter aliases and strictly rejects conflicting parameters
   * @param {Object} payload 
   * @returns {Object} normalized payload
   */
  function normalizeAndValidateAliases(payload) {
    const normalized = Object.assign({}, payload || {});

    // QR Token Aliases
    if (normalized.hasOwnProperty('qr_data') && !normalized.hasOwnProperty('qr_token')) {
      normalized.qr_token = normalized.qr_data;
    }
    if (normalized.hasOwnProperty('qrData') && !normalized.hasOwnProperty('qr_token')) {
      normalized.qr_token = normalized.qrData;
    }

    // 1. Fiscal Year Alias Check
    if (normalized.hasOwnProperty('fiscal_year') && normalized.hasOwnProperty('fiscalYear')) {
      if (String(normalized.fiscal_year).trim() !== String(normalized.fiscalYear).trim()) {
        const err = new Error('PARAM_CONFLICT: Conflicting "fiscal_year" and "fiscalYear" parameters supplied with different values.');
        err.code = 'PARAM_CONFLICT';
        throw err;
      }
    }
    const resolvedFy = normalized.fiscalYear || normalized.fiscal_year;
    if (resolvedFy !== undefined) {
      normalized.fiscalYear = String(resolvedFy).trim();
      normalized.fiscal_year = normalized.fiscalYear;
    }

    // 2. Department Alias Check
    const deptKeys = ['dept', 'department_id', 'department'];
    const presentDeptKeys = deptKeys.filter(k => normalized.hasOwnProperty(k) && normalized[k] !== undefined && String(normalized[k]).trim() !== '');
    if (presentDeptKeys.length > 1) {
      const firstVal = String(normalized[presentDeptKeys[0]]).trim();
      for (let i = 1; i < presentDeptKeys.length; i++) {
        if (String(normalized[presentDeptKeys[i]]).trim() !== firstVal) {
          const err = new Error(`PARAM_CONFLICT: Conflicting department parameters supplied: "${presentDeptKeys[0]}" (${firstVal}) vs "${presentDeptKeys[i]}" (${normalized[presentDeptKeys[i]]}).`);
          err.code = 'PARAM_CONFLICT';
          throw err;
        }
      }
    }
    const resolvedDept = normalized.dept || normalized.department_id || normalized.department;
    if (resolvedDept !== undefined) {
      normalized.dept = String(resolvedDept).trim();
      normalized.department_id = normalized.dept;
      normalized.department = normalized.dept;
    }

    // 3. Item Code Alias Check
    const codeKeys = ['itemCode', 'item_code', 'code', 'itemId'];
    const presentCodeKeys = codeKeys.filter(k => normalized.hasOwnProperty(k) && normalized[k] !== undefined && String(normalized[k]).trim() !== '');
    if (presentCodeKeys.length > 1) {
      const firstVal = String(normalized[presentCodeKeys[0]]).trim();
      for (let i = 1; i < presentCodeKeys.length; i++) {
        if (String(normalized[presentCodeKeys[i]]).trim() !== firstVal) {
          const err = new Error(`PARAM_CONFLICT: Conflicting item code parameters: "${presentCodeKeys[0]}" vs "${presentCodeKeys[i]}".`);
          err.code = 'PARAM_CONFLICT';
          throw err;
        }
      }
    }
    const resolvedCode = normalized.itemCode || normalized.item_code || normalized.code;
    if (resolvedCode !== undefined) {
      normalized.itemCode = String(resolvedCode).trim();
      normalized.item_code = normalized.itemCode;
      normalized.code = normalized.itemCode;
    }

    // 4. Requisition ID Alias Check
    const reqKeys = ['reqNumber', 'req_number', 'reqId', 'req_id', 'requisition_id', 'requisitionId'];
    const presentReqKeys = reqKeys.filter(k => normalized.hasOwnProperty(k) && normalized[k] !== undefined && String(normalized[k]).trim() !== '');
    if (presentReqKeys.length > 1) {
      const firstVal = String(normalized[presentReqKeys[0]]).trim();
      for (let i = 1; i < presentReqKeys.length; i++) {
        if (String(normalized[presentReqKeys[i]]).trim() !== firstVal) {
          const err = new Error(`PARAM_CONFLICT: Conflicting requisition identifiers supplied across alias keys.`);
          err.code = 'PARAM_CONFLICT';
          throw err;
        }
      }
    }
    const resolvedReqNo = normalized.reqNumber || normalized.req_number || normalized.reqId || normalized.req_id || normalized.requisition_id || normalized.requisitionId;
    if (resolvedReqNo !== undefined) {
      normalized.reqNumber = String(resolvedReqNo).trim();
      normalized.req_number = normalized.reqNumber;
      normalized.reqId = normalized.reqNumber;
      normalized.req_id = normalized.reqNumber;
      normalized.requisition_id = normalized.reqNumber;
      normalized.requisitionId = normalized.reqNumber;
    }

    return normalized;
  }

  /**
   * Resolves authenticated caller identity from Google Session or Verified Token
   * P0 Security: Fails closed if caller is unauthorized
   * @param {boolean} isWrite
   * @param {Object} rawPayload
   * @returns {Object} authenticated user profile
   */
  function resolveAuthenticatedUser(isWrite, rawPayload) {
    let email = '';
    let isTokenVerified = false;

    // 1. Check Session.getActiveUser().getEmail() (native GAS execution)
    try {
      if (typeof Session !== 'undefined' && Session.getActiveUser) {
        email = Session.getActiveUser().getEmail();
      }
    } catch (e) {
      email = '';
    }

    // 2. Check for passed ID token if direct session email is blank
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
      } else {
        const err = new Error('UNAUTHORIZED: Invalid or expired Google ID Token.');
        err.code = 'UNAUTHORIZED';
        throw err;
      }
    }

    // 3. Test harness authorization hook (Strictly active only in automated test runner with explicit _testCaller)
    if (!email && typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') {
      if (rawPayload && rawPayload._testCaller) {
        return rawPayload._testCaller;
      }
    }

    // P0 Fail-Closed: Anonymous or blank identity is rejected
    if (!email) {
      const err = new Error('UNAUTHORIZED: Authenticated Google identity is required. Anonymous requests are rejected.');
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    // 4. Domain & Registry Policy Check (Prompt 15 Task 5)
    // [FIX-AUTH-02] Include gmail.com in allowed domains fallback
    const allowedDomains = CONFIG.ALLOWED_DOMAINS || ['horathep.ac.th', 'hrt.ac.th', 'school.internal', 'gmail.com'];
    const emailDomain = email.split('@')[1] ? email.split('@')[1].toLowerCase() : '';
    const isPrimaryDomain = allowedDomains.includes(emailDomain);

    // 5. Lookup user in 01_Users table to verify active status and actual role
    let foundUserRow = null;
    try {
      const uSheet = getSheet('users');
      const uData = uSheet.getDataRange().getValues();
      const H = uData[0].map(h => String(h).trim().toLowerCase());
      const iId = H.indexOf('user_id');
      const iEmail = H.indexOf('email');
      const iRole = H.indexOf('role');
      const iActive = H.indexOf('status');
      const iName = H.indexOf('name');
      const iDept = H.indexOf('department');

      for (let i = 1; i < uData.length; i++) {
        const rowEmail = String(uData[i][iEmail >= 0 ? iEmail : 3]).toLowerCase().trim();
        if (rowEmail === email.toLowerCase().trim()) {
          // Explicit Active Status Check (Prompt 15 Task 10: Never default blank to active)
          const rawStatus = (iActive >= 0 && uData[i][iActive] !== undefined && uData[i][iActive] !== null)
            ? String(uData[i][iActive]).trim().toUpperCase()
            : '';

          if (rawStatus !== 'ACTIVE') {
            const err = new Error(`USER_SUSPENDED: User account "${email}" is not active (status: "${rawStatus || 'EMPTY'}"). Access denied.`);
            err.code = rawStatus === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_INACTIVE';
            throw err;
          }

          const rawRole = String(uData[i][iRole >= 0 ? iRole : 4] || 'REQUESTER').toUpperCase();
          const userId = iId >= 0 ? String(uData[i][iId] || `USR-${i}`) : `USR-${i}`;
          
          foundUserRow = {
            id: userId,
            user_id: userId,
            userId: userId,
            email: email,
            name: String(uData[i][iName >= 0 ? iName : 2] || email),
            role: rawRole,
            department: String(uData[i][iDept >= 0 ? iDept : 5] || 'ทั่วไป'),
            status: 'ACTIVE',
            isActive: true,
            isTokenVerified: isTokenVerified
          };
          break;
        }
      }
    } catch (err) {
      if (err.code === 'USER_SUSPENDED' || err.code === 'USER_INACTIVE' || err.code === 'UNAUTHORIZED' || err.code === 'FORBIDDEN_DOMAIN') throw err;
      Logger.log('Warning resolving user from sheet: ' + err.message);
    }

    // [FIX-AUTH-04] Primary Administrator Check (winmax2006@gmail.com is guaranteed ADMIN)
    const primaryAdminEmail = String((typeof CONFIG !== 'undefined' && CONFIG.PRIMARY_ADMIN_EMAIL) || 'winmax2006@gmail.com').toLowerCase().trim();
    if (email.toLowerCase().trim() === primaryAdminEmail) {
      if (!foundUserRow) {
        try {
          const uSheet = getSheet('users');
          uSheet.appendRow(['USR-001', primaryAdminEmail, 'ผู้ดูแลระบบ (Admin)', primaryAdminEmail, 'ADMIN', 'งานบริหารทั่วไปและพัสดุ', 'ACTIVE']);
        } catch (pe) {
          Logger.log('Notice: Could not append admin row to 01_Users: ' + pe.message);
        }
        foundUserRow = {
          id: 'USR-001',
          user_id: 'USR-001',
          userId: 'USR-001',
          email: primaryAdminEmail,
          name: 'ผู้ดูแลระบบ (Admin)',
          role: 'ADMIN',
          department: 'งานบริหารทั่วไปและพัสดุ',
          status: 'ACTIVE',
          isActive: true,
          isTokenVerified: isTokenVerified
        };
      } else {
        foundUserRow.role = 'ADMIN';
        foundUserRow.status = 'ACTIVE';
        foundUserRow.isActive = true;
      }
    }

    // 6. External Domain Policy Check
    // External domains (like gmail.com) require identity + active registration in 01_Users
    if (!isPrimaryDomain) {
      if (!foundUserRow) {
        const err = new Error(`FORBIDDEN_DOMAIN: Email domain "@${emailDomain}" is not permitted to access this institutional system.`);
        err.code = 'FORBIDDEN_DOMAIN';
        throw err;
      }
    }

    // 7. Unknown / Unregistered User Check (Prompt 15 Task 3 & AUTH-03: Unknown accounts cannot enter)
    if (!foundUserRow) {
      const err = new Error(`UNREGISTERED_USER: Google identity "${email}" is not registered in the personnel directory. Please contact the administrator.`);
      err.code = 'UNREGISTERED_USER';
      throw err;
    }

    return foundUserRow;
  }

  /**
   * Cryptographically verifies Google ID Token signature and claims
   * @param {string} token 
   * @returns {Object|null} Verified payload or null
   */
  function verifyGoogleIdToken(token) {
    if (!token || typeof token !== 'string') return null;

    try {
      if (typeof UrlFetchApp !== 'undefined') {
        const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), {
          muteHttpExceptions: true
        });
        if (response.getResponseCode() === 200) {
          const tokenInfo = JSON.parse(response.getContentText());
          // Verify Issuer
          if (!['accounts.google.com', 'https://accounts.google.com'].includes(tokenInfo.iss)) {
            return null;
          }
          // Verify Expiration
          const exp = parseInt(tokenInfo.exp, 10);
          if (isNaN(exp) || exp * 1000 < Date.now()) {
            return null;
          }
          // Verify Audience if configured
          if (CONFIG.GOOGLE_CLIENT_ID && tokenInfo.aud !== CONFIG.GOOGLE_CLIENT_ID) {
            return null;
          }
          // Verify Email Verification Flag
          if (tokenInfo.email_verified !== 'true' && tokenInfo.email_verified !== true) {
            return null;
          }
          return tokenInfo;
        }
      } else if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') {
        // Node test harness simulation: parse mock token without network call
        if (token.startsWith('TEST_TOKEN:')) {
          const parts = token.split(':');
          const mockEmail = parts[1];
          const mockAud = parts[2];
          const mockExp = parseInt(parts[3] || '9999999999', 10);
          const mockVerified = parts[4] !== 'unverified';
          if (mockExp * 1000 < Date.now()) return null;
          if (CONFIG.GOOGLE_CLIENT_ID && mockAud !== CONFIG.GOOGLE_CLIENT_ID) return null;
          if (!mockVerified) return null;
          return {
            iss: 'https://accounts.google.com',
            email: mockEmail,
            aud: mockAud,
            exp: mockExp,
            email_verified: 'true'
          };
        }
      }
    } catch (e) {
      Logger.log('Token verification exception: ' + e.message);
    }

    return null;
  }

  /**
   * Enforces Role-Based Access Control and Granular Permissions
   * @param {Object} user 
   * @param {string} minRequiredRole 
   * @param {string} [requiredPermission]
   */
  function enforceAuthorization(user, minRequiredRole, requiredPermission) {
    if (user.isPendingApproval) {
      const err = new Error('PENDING_APPROVAL: Your account is pending administrator role assignment.');
      err.code = 'PENDING_APPROVAL';
      throw err;
    }

    const userWeight = ROLE_HIERARCHY[user.role] || 0;
    const requiredWeight = ROLE_HIERARCHY[minRequiredRole] || 999;

    if (userWeight < requiredWeight) {
      const err = new Error(`FORBIDDEN: Role "${user.role}" does not meet minimum role "${minRequiredRole}".`);
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (requiredPermission && CONFIG.ROLE_PERMISSIONS) {
      const permissions = CONFIG.ROLE_PERMISSIONS[user.role] || [];
      if (!permissions.includes(requiredPermission)) {
        const err = new Error(`PERMISSION_DENIED: Role "${user.role}" lacks required permission "${requiredPermission}".`);
        err.code = 'PERMISSION_DENIED';
        throw err;
      }
    }
  }

  /**
   * Persistent Idempotency Check & Lock (O-4 & C-7)
   * Key is bound to: actor_id + action + sha256(payload)
   * @param {string} key 
   * @param {string} actorId
   * @param {string} action 
   * @param {Object} payload 
   * @returns {Object|null} Cached response if already committed
   */
  function canonicalizePayload(val) {
    if (val === null || val === undefined) return null;
    if (typeof val !== 'object') return val;

    if (Array.isArray(val)) {
      // Preserve array element order (semantic line item order)
      return val.map(item => canonicalizePayload(item));
    }

    // Excluded volatile / authentication / request-context fields
    const EXCLUDED_KEYS = new Set([
      'idempotency_key', 'idempotencyKey',
      'id_token', 'idToken', 'authToken', 'token', 'bearer',
      'requestId', 'reqId',
      'caller', '_serverActor',
      'timestamp', '_t'
    ]);

    const sortedObj = {};
    const keys = Object.keys(val).filter(k => !EXCLUDED_KEYS.has(k)).sort();
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      sortedObj[k] = canonicalizePayload(val[k]);
    }
    return sortedObj;
  }

  /**
   * Computes cryptographic SHA-256 hash of canonicalized JSON payload.
   * P0 Security: Fails closed if cryptographic hash calculation is unavailable or invalid.
   * Absolutely NO weak length-based or non-cryptographic fallbacks in live path (TX-11, TX-13).
   * @param {Object} payload 
   * @returns {string} 64-character lowercase hex digest
   */
  function computePayloadHash(payload) {
    const canonicalObj = canonicalizePayload(payload);
    const jsonStr = JSON.stringify(canonicalObj);

    let shaFn = null;
    if (typeof hrtComputeSha256_ === 'function') {
      shaFn = hrtComputeSha256_;
    } else if (typeof computeSha256 === 'function') {
      shaFn = computeSha256;
    } else if (typeof globalThis !== 'undefined' && typeof globalThis.hrtComputeSha256_ === 'function') {
      shaFn = globalThis.hrtComputeSha256_;
    } else if (typeof global !== 'undefined' && typeof global.hrtComputeSha256_ === 'function') {
      shaFn = global.hrtComputeSha256_;
    }

    if (!shaFn) {
      const err = new Error('HASH_UNAVAILABLE: Cryptographic hash function (hrtComputeSha256_) is not available. Fails closed.');
      err.code = 'HASH_UNAVAILABLE';
      throw err;
    }

    let digest = null;
    try {
      digest = shaFn(jsonStr);
    } catch (e) {
      const err = new Error('HASH_UNAVAILABLE: SHA-256 calculation threw an error: ' + (e.message || e));
      err.code = 'HASH_UNAVAILABLE';
      throw err;
    }

    if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/i.test(digest.trim())) {
      const err = new Error('HASH_INVALID: Cryptographic digest generation produced an invalid or non-SHA-256 output.');
      err.code = 'HASH_INVALID';
      throw err;
    }

    return digest.trim().toLowerCase();
  }

  /**
   * Idempotency verification and in-flight reservation
   * Atomic check -> in-flight reservation -> commit -> record
   * @param {string} key 
   * @param {string} actorId 
   * @param {string} action 
   * @param {Object} payload 
   * @returns {Object|null}
   */
  function checkIdempotency(key, actorId, action, payload) {
    if (!key) return null;

    const payloadHash = computePayloadHash(payload);
    const compositeKey = actorId + ':' + action + ':' + key;
    const nowIso = new Date().toISOString();

    // 1. Check Fast Cache
    try {
      if (typeof CacheService !== 'undefined') {
        const cache = CacheService.getScriptCache();
        const cachedStr = cache.get('idemp_' + compositeKey);
        if (cachedStr) {
          const record = JSON.parse(cachedStr);
          if (record.payloadHash !== payloadHash) {
            const err = new Error('IDEMPOTENCY_CONFLICT: Idempotency key "' + key + '" was previously used with a different payload.');
            err.code = 'IDEMPOTENCY_CONFLICT';
            throw err;
          }
          if (record.status === 'IN_FLIGHT') {
            const err = new Error('IDEMPOTENCY_IN_FLIGHT: An operation with idempotency key "' + key + '" is currently in progress. Please retry shortly.');
            err.code = 'IDEMPOTENCY_IN_FLIGHT';
            throw err;
          }
          if (record.status === 'COMMITTED') {
            return record.response;
          }
        }
      }
    } catch (e) {
      if (e.code === 'IDEMPOTENCY_CONFLICT' || e.code === 'IDEMPOTENCY_IN_FLIGHT') throw e;
    }

    // 2. Check Persistent 16_Idempotency_Log sheet
    try {
      const sheet = getSheet('idempotency_log');
      const data = sheet.getDataRange().getValues();
      for (let r = data.length - 1; r >= 1; r--) {
        const rowKey = String(data[r][0]).trim();
        const rowActor = String(data[r][1]).trim();
        const rowAction = String(data[r][2]).trim();
        const rowHash = String(data[r][3]).trim();
        const rowStatus = String(data[r][4]).trim();
        const rowResult = data[r][5];

        if (rowKey === key && rowActor === actorId && rowAction === action) {
          if (rowHash !== payloadHash) {
            const err = new Error('IDEMPOTENCY_CONFLICT: Idempotency key "' + key + '" was previously executed with a different payload.');
            err.code = 'IDEMPOTENCY_CONFLICT';
            throw err;
          }
          if (rowStatus === 'COMMITTED') {
            const parsed = typeof rowResult === 'string' ? JSON.parse(rowResult) : rowResult;
            // Repopulate fast cache
            try {
              if (typeof CacheService !== 'undefined') {
                CacheService.getScriptCache().put('idemp_' + compositeKey, JSON.stringify({
                  action: action,
                  actorId: actorId,
                  payloadHash: payloadHash,
                  status: 'COMMITTED',
                  response: parsed,
                  timestamp: nowIso
                }), 600);
              }
            } catch (ce) {}
            return parsed;
          }
          if (rowStatus === 'IN_FLIGHT') {
            const err = new Error('IDEMPOTENCY_IN_FLIGHT: An operation with idempotency key "' + key + '" is currently in progress in sheet log.');
            err.code = 'IDEMPOTENCY_IN_FLIGHT';
            throw err;
          }
        }
      }
    } catch (err) {
      if (err.code === 'IDEMPOTENCY_CONFLICT' || err.code === 'IDEMPOTENCY_IN_FLIGHT') throw err;
      Logger.log('Idempotency sheet check notice: ' + err.message);
    }

    // 3. Reserve key as IN_FLIGHT in Fast Cache to prevent concurrent race
    try {
      if (typeof CacheService !== 'undefined') {
        const cache = CacheService.getScriptCache();
        cache.put('idemp_' + compositeKey, JSON.stringify({
          action: action,
          actorId: actorId,
          payloadHash: payloadHash,
          status: 'IN_FLIGHT',
          timestamp: nowIso
        }), 120);
      }
    } catch (e) {}

    return null;
  }

  /**
   * Clears in-flight reservation if request fails before commit
   */
  function clearInFlightIdempotency(key, actorId, action) {
    if (!key) return;
    const compositeKey = actorId + ':' + action + ':' + key;
    try {
      if (typeof CacheService !== 'undefined') {
        CacheService.getScriptCache().remove('idemp_' + compositeKey);
      }
    } catch (e) {}
  }

  /**
   * Persists committed idempotent response
   * @param {string} key 
   * @param {string} actorId
   * @param {string} action 
   * @param {Object} payload
   * @param {Object} response 
   */
  function recordIdempotency(key, actorId, action, payload, response) {
    if (!key) return;

    const payloadHash = computePayloadHash(payload);
    const compositeKey = actorId + ':' + action + ':' + key;
    const nowIso = new Date().toISOString();

    // 1. Store in CacheService
    try {
      if (typeof CacheService !== 'undefined') {
        const cache = CacheService.getScriptCache();
        cache.put('idemp_' + compositeKey, JSON.stringify({
          action: action,
          actorId: actorId,
          payloadHash: payloadHash,
          status: 'COMMITTED',
          response: response,
          timestamp: nowIso
        }), 600);
      }
    } catch (e) {}

    // 2. Persist to 16_Idempotency_Log
    try {
      const sheet = getSheet('idempotency_log');
      sheet.appendRow([
        key,
        actorId,
        action,
        payloadHash,
        'COMMITTED',
        JSON.stringify(response),
        nowIso
      ]);
    } catch (e) {
      Logger.log('Warning saving to idempotency sheet: ' + e.message);
    }
  }

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
  }

  function routeRequest(action, rawPayload, requestId) {
    const reqId = requestId || `REQ-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const startTime = Date.now();
    let caller = null;
    let idempotencyKey = null;
    let idempotencyReserved = false;

    try {
      if (!action || typeof action !== 'string') {
        const err = new Error('INVALID_REQUEST: Action name is required.');
        err.code = 'INVALID_REQUEST';
        throw err;
      }

      const route = ACTION_REGISTRY[action];
      if (!route) {
        const err = new Error(`UNKNOWN_ACTION: Action "${action}" is not registered in API route table.`);
        err.code = 'UNKNOWN_ACTION';
        throw err;
      }

      // 1. Parameter Normalization & Alias Validation
      const payload = normalizeAndValidateAliases(rawPayload);

      // 2. Authentication & Authorization
      caller = resolveAuthenticatedUser(route.isWrite, rawPayload);
      enforceAuthorization(caller, route.minRole, route.permission);

      // 3. Server-Determined Actor & Fiscal Year Enforcement for Writes
      if (route.isWrite) {
        // Server authoritative requester: caller cannot forge another person's requisition
        payload._serverActor = caller;
        if (action.startsWith('requisitions.create') || action === 'createRequisition') {
          payload.userId = caller.id;
          payload.teacher = caller.name;
        }

        // Server authoritative transaction year: cannot write to closed or unauthorized fiscal year
        const activeTxYear = getActiveTransactionYear();
        if (payload.fiscalYear && String(payload.fiscalYear).trim() !== activeTxYear) {
          if (isFiscalYearClosed(payload.fiscalYear)) {
            const err = new Error(`CLOSED_FISCAL_YEAR: Cannot perform write transactions against closed fiscal year "${payload.fiscalYear}". Active transaction year is "${activeTxYear}".`);
            err.code = 'CLOSED_FISCAL_YEAR';
            throw err;
          }
        }
        // Force write operations to target active transaction year
        payload.fiscalYear = activeTxYear;
        payload.fiscal_year = activeTxYear;
      }

      // 4. Idempotency Check for Write Actions
      idempotencyKey = payload.idempotency_key || payload.idempotencyKey;
      idempotencyReserved = false;
      if (route.isWrite && idempotencyKey) {
        const cachedRes = checkIdempotency(idempotencyKey, caller.id, action, payload);
        if (cachedRes) {
          cachedRes.isIdempotentReplay = true;
          return cachedRes;
        }
        idempotencyReserved = true;
      }

      // 5. Dispatch to Allowlisted Business Handler
      let result = null;
      const handlerFn = resolveAllowlistedHandler(route.handler);

      if (typeof handlerFn !== 'function') {
        const err = new Error('INTERNAL_ERROR: Business handler function "' + route.handler + '" is not defined or permitted in allowlist.');
        err.code = 'INTERNAL_ERROR';
        throw err;
      }

      result = handlerFn(payload, caller, reqId);

      // 6. Structure Canonical Response Envelope with Controlled Endpoint Adapters
      const response = {
        success: true,
        action: action,
        data: result,
        requestId: reqId,
        executionMs: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      // Populate endpoint-specific convenience aliases without unconstrained Object.assign (RPC-02, RPC-03)
      if (Array.isArray(result)) {
        if (action.startsWith('requisitions')) {
          response.requisitions = result;
        } else if (action.startsWith('audit')) {
          response.audit = result;
          response.logs = result;
        } else if (action.startsWith('users')) {
          response.users = result;
        } else if (action.startsWith('fsn')) {
          response.fsn = result;
        } else if (action.startsWith('stock.ledger')) {
          response.ledger = result;
        }
      } else if (result && typeof result === 'object') {
        if (action === 'users.current') {
          response.user = result;
        } else if (action === 'items.get') {
          response.item = result;
        } else if (action === 'items.list') {
          response.items = result.items || result;
        } else if (action.startsWith('requisitions.create')) {
          response.req_id = result.req_id || result.reqId;
          response.req_no = result.req_no || result.reqNo;
          response.requisition = result;
        } else if (action === 'requisitions.get') {
          response.requisition = result;
        } else if (action === 'requisitions.list') {
          response.requisitions = result.requisitions || result;
        } else if (action === 'requisitions.issue' || action === 'stock.issue' || action === 'issueStock' || action === 'issueRequisition') {
          response.req_id = result.req_id;
          response.req_no = result.req_no;
          response.status = result.status;
          response.is_partial = result.is_partial;
          response.totalIssued = result.totalIssued;
          response.result = result;
        } else if (action === 'qr.resolve') {
          response.type = result.type;
          response.item = result.item;
          response.warehouse = result.warehouse;
          response.canonicalId = result.canonicalId;
          response.canonicalToken = result.canonicalToken;
          response.req_no = result.req_no;
          response.requisition = result.requisition;
          response.items = result.items;
          response.itemCount = result.itemCount;
        } else if (action.startsWith('dashboard')) {
          response.metrics = result;
          response.kpis = {
            totalSKU: (typeof result.totalSKUs === 'number') ? result.totalSKUs : (result.totalItems || 0),
            totalStockQty: (typeof result.totalStockUnits === 'number') ? result.totalStockUnits : 0,
            totalAssetValue: (typeof result.totalValue === 'number') ? result.totalValue : (typeof result.filteredValue === 'number' ? result.filteredValue : 0),
            lowStockCount: (typeof result.lowCount === 'number') ? result.lowCount : (result.lowStockCount || 0),
            criticalStockCount: (typeof result.criticalCount === 'number') ? result.criticalCount : (result.criticalStockCount || 0),
            healthyCount: (typeof result.normalCount === 'number') ? result.normalCount : 0
          };
        } else if (action === 'stock.reconcile') {
          response.reconcile = result;
        } else if (action === 'audit.verify') {
          response.integrity = result;
        } else if (action.startsWith('settings')) {
          response.settings = result;
        }
      }

      // 7. Record Idempotency on Successful Write
      if (route.isWrite && idempotencyKey) {
        recordIdempotency(idempotencyKey, caller.id, action, payload, response);
      }

      return response;

    } catch (error) {
      if (typeof idempotencyReserved !== 'undefined' && idempotencyReserved && idempotencyKey && caller) {
        clearInFlightIdempotency(idempotencyKey, caller.id, action);
      }
      const code = error.code || error.name || 'API_ERROR';
      const msg = error.message || 'An unknown error occurred during API execution.';
      Logger.log(`[ApiRouter Error] [${reqId}] ${action} (${code}): ${msg}`);

      // Log failure attempt in audit trail if write operation
      try {
        if (typeof logAudit === 'function') {
          logAudit_('API_REJECTED', action, `Code: ${code}, Reason: ${msg}`, caller, false);
        }
      } catch (ae) {}

      return {
        success: false,
        action: action,
        error: {
          code: code,
          message: msg,
          details: error.details || null
        },
        code: code,
        message: msg,
        requestId: reqId,
        executionMs: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  return {
    routeRequest: routeRequest,
    normalizeAndValidateAliases: normalizeAndValidateAliases,
    resolveAuthenticatedUser: resolveAuthenticatedUser,
    enforceAuthorization: enforceAuthorization,
    checkIdempotency: checkIdempotency,
    recordIdempotency: recordIdempotency,
    clearInFlightIdempotency: clearInFlightIdempotency,
    computePayloadHash: computePayloadHash,
    canonicalizePayload: canonicalizePayload
  };
})();
