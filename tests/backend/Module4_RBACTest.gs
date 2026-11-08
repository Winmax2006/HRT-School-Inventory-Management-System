/**
 * Module4_RBACTest.gs - Regression Test for RBAC & Permission Registry (Module 4)
 * Scope: PermissionRegistry.gs, RBAC.gs
 */

function runModule4RBACTest() {
  const results = {
    suite: 'Module 4: RBAC & Permission Registry',
    timestamp: new Date().toISOString(),
    testsPassed: 0,
    testsFailed: 0,
    details: []
  };

  function assert(condition, testName, message) {
    if (condition) {
      results.testsPassed++;
      results.details.push({ status: 'PASS', name: testName });
    } else {
      results.testsFailed++;
      results.details.push({ status: 'FAIL', name: testName, error: message || 'Assertion failed' });
    }
  }

  try {
    // 1. Permission Matrix Checks
    assert(RBAC.can('TEACHER', PermissionRegistry.ACTIONS.REQUISITION_CREATE), 'Teacher can create requisition');
    assert(!RBAC.can('TEACHER', PermissionRegistry.ACTIONS.STOCK_RECEIVE), 'Teacher cannot receive stock');
    assert(!RBAC.can('TEACHER', PermissionRegistry.ACTIONS.REQUISITION_APPROVE), 'Teacher cannot approve requisition');

    assert(RBAC.can('APPROVER', PermissionRegistry.ACTIONS.REQUISITION_APPROVE), 'Approver can approve requisition');
    assert(!RBAC.can('APPROVER', PermissionRegistry.ACTIONS.STOCK_RECEIVE), 'Approver cannot receive stock');

    assert(RBAC.can('OFFICER', PermissionRegistry.ACTIONS.STOCK_RECEIVE), 'Officer can receive stock');
    assert(RBAC.can('OFFICER', PermissionRegistry.ACTIONS.REQUISITION_ISSUE), 'Officer can issue stock');
    assert(!RBAC.can('OFFICER', PermissionRegistry.ACTIONS.USER_MANAGE), 'Officer cannot manage users');

    assert(RBAC.can('ADMIN', PermissionRegistry.ACTIONS.USER_MANAGE), 'Admin can manage users');
    assert(RBAC.can('ADMIN', PermissionRegistry.ACTIONS.SETTINGS_MANAGE), 'Admin can manage settings');

    // 2. checkPermission Exception Verification
    let forbiddenThrew = false;
    try {
      RBAC.checkPermission('TEACHER', PermissionRegistry.ACTIONS.FISCAL_YEAR_CLOSE);
    } catch (e) {
      forbiddenThrew = true;
      assert(e.code === ErrorService.ERROR_CODES.FORBIDDEN, 'Error code is FORBIDDEN');
    }
    assert(forbiddenThrew, 'checkPermission throws on unauthorized action');

    // 3. RBAC.enforce with Active Auth User
    Database.resetMockStore();
    Database.appendRow(Schema.TABLES.USERS, Schema.getHeaders(Schema.TABLES.USERS));
    AuthService.ensureDefaultUsers();

    Auth.setMockSessionUser('teacher@school.ac.th');
    const teacherUser = RBAC.enforce(PermissionRegistry.ACTIONS.REQUISITION_CREATE);
    assert(teacherUser.role === 'TEACHER', 'RBAC.enforce allows Teacher to create requisition');

    let enforceThrew = false;
    try {
      RBAC.enforce(PermissionRegistry.ACTIONS.STOCK_ADJUST);
    } catch (e) {
      enforceThrew = true;
    }
    assert(enforceThrew, 'RBAC.enforce blocks Teacher from stock adjustment');

  } catch (error) {
    results.testsFailed++;
    results.details.push({ status: 'ERROR', error: error.message, stack: error.stack });
  }

  return results;
}
