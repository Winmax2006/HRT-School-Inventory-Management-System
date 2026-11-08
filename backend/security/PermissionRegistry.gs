/**
 * PermissionRegistry.gs - Declarative Role-Based Action Matrix
 * Layer: Security Layer
 * Standard: Least Privilege & Auditable Access Control
 */

const PermissionRegistry = (function() {
  const ACTIONS = {
    // Inventory Items
    ITEM_VIEW: 'ITEM_VIEW',
    ITEM_CREATE: 'ITEM_CREATE',
    ITEM_UPDATE: 'ITEM_UPDATE',
    ITEM_DELETE: 'ITEM_DELETE',

    // Requisitions
    REQUISITION_CREATE: 'REQUISITION_CREATE',
    REQUISITION_VIEW_OWN: 'REQUISITION_VIEW_OWN',
    REQUISITION_VIEW_ALL: 'REQUISITION_VIEW_ALL',
    REQUISITION_APPROVE: 'REQUISITION_APPROVE',
    REQUISITION_REJECT: 'REQUISITION_REJECT',
    REQUISITION_ISSUE: 'REQUISITION_ISSUE',

    // Stock & Ledger
    STOCK_RECEIVE: 'STOCK_RECEIVE',
    STOCK_ADJUST: 'STOCK_ADJUST',
    STOCK_LEDGER_VIEW: 'STOCK_LEDGER_VIEW',

    // Reports & Analytics
    DASHBOARD_VIEW: 'DASHBOARD_VIEW',
    REPORTS_VIEW: 'REPORTS_VIEW',
    REPORTS_GENERATE: 'REPORTS_GENERATE',

    // Audit & Governance
    AUDIT_VIEW: 'AUDIT_VIEW',
    FISCAL_YEAR_CLOSE: 'FISCAL_YEAR_CLOSE',
    SETTINGS_MANAGE: 'SETTINGS_MANAGE',
    USER_MANAGE: 'USER_MANAGE'
  };

  // Matrix: Action -> Array of Allowed Roles
  const PERMISSIONS = {
    [ACTIONS.ITEM_VIEW]: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'REQUESTER'],
    [ACTIONS.ITEM_CREATE]: ['ADMIN', 'OFFICER'],
    [ACTIONS.ITEM_UPDATE]: ['ADMIN', 'OFFICER'],
    [ACTIONS.ITEM_DELETE]: ['ADMIN'],

    [ACTIONS.REQUISITION_CREATE]: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'REQUESTER'],
    [ACTIONS.REQUISITION_VIEW_OWN]: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'REQUESTER'],
    [ACTIONS.REQUISITION_VIEW_ALL]: ['ADMIN', 'OFFICER', 'APPROVER'],
    [ACTIONS.REQUISITION_APPROVE]: ['ADMIN', 'APPROVER'],
    [ACTIONS.REQUISITION_REJECT]: ['ADMIN', 'APPROVER'],
    [ACTIONS.REQUISITION_ISSUE]: ['ADMIN', 'OFFICER'],

    [ACTIONS.STOCK_RECEIVE]: ['ADMIN', 'OFFICER'],
    [ACTIONS.STOCK_ADJUST]: ['ADMIN', 'OFFICER'],
    [ACTIONS.STOCK_LEDGER_VIEW]: ['ADMIN', 'OFFICER', 'APPROVER'],

    [ACTIONS.DASHBOARD_VIEW]: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'REQUESTER'],
    [ACTIONS.REPORTS_VIEW]: ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'REQUESTER'],
    [ACTIONS.REPORTS_GENERATE]: ['ADMIN', 'OFFICER', 'APPROVER'],

    [ACTIONS.AUDIT_VIEW]: ['ADMIN', 'OFFICER'],
    [ACTIONS.FISCAL_YEAR_CLOSE]: ['ADMIN', 'OFFICER'],
    [ACTIONS.SETTINGS_MANAGE]: ['ADMIN'],
    [ACTIONS.USER_MANAGE]: ['ADMIN']
  };

  function getAllowedRoles(action) {
    return PERMISSIONS[action] || [];
  }

  function isPermitted(role, action) {
    if (!role || !action) return false;
    const cleanRole = String(role).toUpperCase().trim();
    const allowed = PERMISSIONS[action];
    if (!allowed) return false;
    return allowed.includes(cleanRole);
  }

  return {
    ACTIONS,
    getAllowedRoles,
    isPermitted
  };
})();
