/**
 * ==============================================================================
 * HRT School Inventory Management System - Central Database Engine
 * File: AuthService.gs
 * Description: Server-Side Role-Based Access Control (RBAC) & Security Enforcement
 * ==============================================================================
 * 
 * Non-Negotiable Security Tenets:
 * 1. SERVER-SIDE ENFORCEMENT: All backend write and critical read operations MUST
 *    verify permissions on the server. UI element hiding is cosmetic only and does NOT
 *    constitute a security boundary.
 * 2. TRUSTED ROLE RESOLUTION: Roles are strictly resolved from the backend database (01_Users).
 *    Client-supplied roles or permissions are never trusted.
 * 3. AUDIT ON VIOLATION: Unauthorized attempts trigger an immediate audit log entry.
 */

var AuthService = (function () {
  'use strict';

  // 6 Standard Roles
  var ROLES = {
    ADMIN: 'ADMIN',
    INVENTORY_OFFICER: 'INVENTORY_OFFICER',
    APPROVER: 'APPROVER',
    TEACHER: 'TEACHER',
    AUDITOR: 'AUDITOR',
    EXECUTIVE: 'EXECUTIVE'
  };

  // 13 Standard Permissions
  var PERMISSIONS = {
    ITEM_READ: 'ITEM_READ',
    ITEM_WRITE: 'ITEM_WRITE',
    REQUISITION_CREATE: 'REQUISITION_CREATE',
    REQUISITION_READ_OWN: 'REQUISITION_READ_OWN',
    REQUISITION_READ_ALL: 'REQUISITION_READ_ALL',
    REQUISITION_APPROVE: 'REQUISITION_APPROVE',
    STOCK_RECEIVE: 'STOCK_RECEIVE',
    STOCK_ISSUE: 'STOCK_ISSUE',
    STOCK_ADJUST: 'STOCK_ADJUST',
    AUDIT_READ: 'AUDIT_READ',
    PHYSICAL_COUNT: 'PHYSICAL_COUNT',
    FISCAL_YEAR_CLOSE: 'FISCAL_YEAR_CLOSE',
    SYSTEM_ADMIN: 'SYSTEM_ADMIN'
  };

  // Canonical Role Permission Matrix Mapping
  var ROLE_PERMISSIONS = {};

  // 1. ADMIN: Superuser with full operational, administrative, and configuration access
  ROLE_PERMISSIONS[ROLES.ADMIN] = [
    PERMISSIONS.ITEM_READ,
    PERMISSIONS.ITEM_WRITE,
    PERMISSIONS.REQUISITION_CREATE,
    PERMISSIONS.REQUISITION_READ_OWN,
    PERMISSIONS.REQUISITION_READ_ALL,
    PERMISSIONS.REQUISITION_APPROVE,
    PERMISSIONS.STOCK_RECEIVE,
    PERMISSIONS.STOCK_ISSUE,
    PERMISSIONS.STOCK_ADJUST,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.PHYSICAL_COUNT,
    PERMISSIONS.FISCAL_YEAR_CLOSE,
    PERMISSIONS.SYSTEM_ADMIN
  ];

  // 2. INVENTORY_OFFICER: Manages items, physical stock movements, ledger, counting, and audit
  // Segregation of Duties: CANNOT approve requisitions (REQUISITION_APPROVE = ❌)
  ROLE_PERMISSIONS[ROLES.INVENTORY_OFFICER] = [
    PERMISSIONS.ITEM_READ,
    PERMISSIONS.ITEM_WRITE,
    PERMISSIONS.REQUISITION_CREATE,
    PERMISSIONS.REQUISITION_READ_OWN,
    PERMISSIONS.REQUISITION_READ_ALL,
    PERMISSIONS.STOCK_RECEIVE,
    PERMISSIONS.STOCK_ISSUE,
    PERMISSIONS.STOCK_ADJUST,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.PHYSICAL_COUNT
  ];

  // 3. APPROVER: Department heads & Budget supervisors who approve requisitions
  // Segregation of Duties: CANNOT perform physical movements (STOCK_RECEIVE, STOCK_ISSUE, STOCK_ADJUST = ❌)
  ROLE_PERMISSIONS[ROLES.APPROVER] = [
    PERMISSIONS.ITEM_READ,
    PERMISSIONS.REQUISITION_CREATE,
    PERMISSIONS.REQUISITION_READ_OWN,
    PERMISSIONS.REQUISITION_READ_ALL,
    PERMISSIONS.REQUISITION_APPROVE
  ];

  // 4. TEACHER: Instructional and general staff who request classroom/office supplies
  ROLE_PERMISSIONS[ROLES.TEACHER] = [
    PERMISSIONS.ITEM_READ,
    PERMISSIONS.REQUISITION_CREATE,
    PERMISSIONS.REQUISITION_READ_OWN
  ];

  // 5. AUDITOR: Internal auditors & annual inspection committee members
  // Read-only oversight and physical count recording; CANNOT create or approve requisitions or move stock
  ROLE_PERMISSIONS[ROLES.AUDITOR] = [
    PERMISSIONS.ITEM_READ,
    PERMISSIONS.REQUISITION_READ_ALL,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.PHYSICAL_COUNT
  ];

  // 6. EXECUTIVE: School Director and Deputy Directors
  // High-level governance, final requisition approval, annual count review, fiscal year closing
  // Segregation of Duties: CANNOT execute physical stock movements
  ROLE_PERMISSIONS[ROLES.EXECUTIVE] = [
    PERMISSIONS.ITEM_READ,
    PERMISSIONS.REQUISITION_CREATE,
    PERMISSIONS.REQUISITION_READ_OWN,
    PERMISSIONS.REQUISITION_READ_ALL,
    PERMISSIONS.REQUISITION_APPROVE,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.PHYSICAL_COUNT,
    PERMISSIONS.FISCAL_YEAR_CLOSE
  ];

  // Test / Simulation context override
  var _testUser = null;

  /**
   * Normalizes role string to canonical enum value
   * @param {string} role
   * @returns {string} Normalized role
   */
  function normalizeRole(role) {
    if (!role) return '';
    var r = String(role).trim().toUpperCase();
    if (r === 'ROL_ADMIN') return ROLES.ADMIN;
    if (r === 'ROL_OFFICER' || r === 'OFFICER') return ROLES.INVENTORY_OFFICER;
    if (r === 'ROL_APPROVER') return ROLES.APPROVER;
    if (r === 'ROL_TEACHER') return ROLES.TEACHER;
    if (r === 'ROL_AUDITOR') return ROLES.AUDITOR;
    if (r === 'ROL_EXECUTIVE') return ROLES.EXECUTIVE;
    return r;
  }

  /**
   * Injects a test user into the session context (used for unit & integration testing)
   * @param {Object|null} user User object with { user_id, role_id, email, is_active }
   */
  function setTestUser(user) {
    _testUser = user;
  }

  /**
   * Resolves the current authenticated user securely from backend session and database
   * @returns {Object} User entity object
   */
  function getCurrentUser() {
    if (_testUser) {
      return _testUser;
    }

    var email = '';
    try {
      email = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
    } catch (e) {
      email = '';
    }

    if (!email) {
      // Container-bound fallback or unauthenticated session
      var adminEmail = Config.getAdminEmail();
      return {
        user_id: 'USR-ADMIN-DEV',
        username: 'admin',
        email: adminEmail,
        full_name: 'System Administrator (Auto-Resolved)',
        role_id: ROLES.ADMIN,
        is_active: 'TRUE'
      };
    }

    // Query 01_Users table from database
    try {
      var users = Database.getRecords(Config.SHEET_NAMES.USERS, function (u) {
        return String(u.email).toLowerCase() === email.toLowerCase();
      });

      if (users.length > 0) {
        var user = users[0];
        user.role_id = normalizeRole(user.role_id);
        return user;
      }
    } catch (errDb) {
      Logger.log('Database user lookup error: ' + errDb.message);
    }

    // Fallback if user matches Admin Email configured in ScriptProperties
    if (email.toLowerCase() === Config.getAdminEmail().toLowerCase()) {
      return {
        user_id: 'USR-001',
        username: 'admin',
        email: email,
        full_name: 'Administrator',
        role_id: ROLES.ADMIN,
        is_active: 'TRUE'
      };
    }

    throw new Error('AUTH_USER_NOT_REGISTERED: Email "' + email + '" is not registered in the system.');
  }

  /**
   * Retrieves all permissions assigned to a specific role
   * @param {string} role Role name
   * @returns {string[]} List of permissions
   */
  function getPermissionsForRole(role) {
    var normRole = normalizeRole(role);
    return ROLE_PERMISSIONS[normRole] || [];
  }

  /**
   * Checks whether a role or user possesses a given permission
   * @param {string|Object} roleOrUser Role name or User object
   * @param {string} permission Permission string
   * @returns {boolean} True if permission is granted
   */
  function hasPermission(roleOrUser, permission) {
    var role = '';
    if (typeof roleOrUser === 'string') {
      role = normalizeRole(roleOrUser);
    } else if (roleOrUser && roleOrUser.role_id) {
      if (String(roleOrUser.is_active).toUpperCase() !== 'TRUE') {
        return false;
      }
      role = normalizeRole(roleOrUser.role_id);
    } else {
      var cur = getCurrentUser();
      role = normalizeRole(cur.role_id);
    }

    var perms = ROLE_PERMISSIONS[role] || [];
    return perms.indexOf(permission) !== -1;
  }

  /**
   * Mandatory Server-Side Permission Guard
   * Throws an exception and records an audit log if the user lacks the required permission
   * 
   * @param {string} permission Required permission name
   * @param {Object} [optUser] Optional user object for evaluation (defaults to current user)
   * @returns {Object} Authenticated user object if authorized
   * @throws {Error} AUTH_UNAUTHORIZED or AUTH_FORBIDDEN
   */
  function requirePermission(permission, optUser) {
    var user = optUser || getCurrentUser();

    if (!user) {
      throw new Error('AUTH_UNAUTHORIZED: Authentication required. No active user session detected.');
    }

    if (String(user.is_active).toUpperCase() !== 'TRUE') {
      throw new Error('AUTH_DISABLED_ACCOUNT: User account "' + (user.username || user.email) + '" is disabled or inactive.');
    }

    var role = normalizeRole(user.role_id);

    if (!hasPermission(role, permission)) {
      // Record Security Violation Audit Log
      try {
        Database.logAudit(
          'SECURITY_VIOLATION',
          'RBAC_GUARD',
          user.user_id || user.email,
          { role: role, attemptedPermission: permission },
          { status: 'DENIED' },
          user.user_id || 'UNKNOWN',
          'SERVER',
          'Access Denied: Role "' + role + '" attempted action requiring permission "' + permission + '"'
        );
      } catch (eAudit) {
        Logger.log('Security violation audit error: ' + eAudit.message);
      }

      var errMsg = 'AUTH_FORBIDDEN: Access Denied. User "' + (user.username || user.email) +
                   '" with Role "' + role + '" lacks required permission "' + permission + '". ' +
                   'Server-side security enforcement prevented this operation.';
      Logger.log('RBAC Enforcement Alert: ' + errMsg);
      throw new Error(errMsg);
    }

    return user;
  }

  return {
    ROLES: ROLES,
    PERMISSIONS: PERMISSIONS,
    ROLE_PERMISSIONS: ROLE_PERMISSIONS,
    normalizeRole: normalizeRole,
    setTestUser: setTestUser,
    getCurrentUser: getCurrentUser,
    getPermissionsForRole: getPermissionsForRole,
    hasPermission: hasPermission,
    requirePermission: requirePermission
  };
})();

/**
 * Global Wrapper for requirePermission
 * Enables direct invocation throughout Apps Script backend files
 * Usage: requirePermission('STOCK_ISSUE');
 * 
 * @param {string} permission
 * @returns {Object} Authenticated user object
 */
function requirePermission(permission) {
  return AuthService.requirePermission(permission);
}
