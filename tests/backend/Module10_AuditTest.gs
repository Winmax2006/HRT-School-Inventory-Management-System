/**
 * Module10_AuditTest.gs - Regression Test for Audit Trail & Hash Integrity (Module 10)
 * Scope: AuditService.gs, AuditApi.gs
 */

function runModule10AuditTest() {
  const results = {
    suite: 'Module 10: Audit Trail & Integrity Chain',
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
    // Reset Database Mock Store
    Database.resetMockStore();
    Database.appendRow(Schema.TABLES.AUDIT_TRAIL, Schema.getHeaders(Schema.TABLES.AUDIT_TRAIL));
    Database.appendRow(Schema.TABLES.USERS, Schema.getHeaders(Schema.TABLES.USERS));
    AuthService.ensureDefaultUsers();

    Auth.setMockSessionUser('officer@school.ac.th');

    // 1. Log sequential actions
    AuditService.logAction({
      action: 'STOCK_RECEIVE',
      module: 'STOCK',
      entityType: 'ITEM',
      entityId: 'OFF-001',
      newValue: { qty: 50 }
    });

    AuditService.logAction({
      action: 'REQUISITION_APPROVE',
      module: 'REQUISITION',
      entityType: 'REQUISITION',
      entityId: 'REQ-2567-0001',
      newValue: { status: 'APPROVED' }
    });

    const logs = AuditService.getAuditLogs();
    assert(logs.length === 2, 'Audit logs recorded 2 entries');
    assert(logs[0].integrity_hash && logs[1].integrity_hash, 'Both entries have integrity hashes');

    // 2. Verify Valid Chain
    const checkValid = AuditService.verifyIntegrityChain();
    assert(checkValid.verified === true && checkValid.count === 2, 'verifyIntegrityChain passes for untampered log');

    // 3. Detect Tampering
    // Intentionally mutate an entry's action in the mock store
    const store = Database.getMockStoreData(Schema.TABLES.AUDIT_TRAIL);
    // Row 0 is header, Row 1 is first log, Row 2 is second log
    // Modify action column in row 1
    store[1][4] = 'TAMPERED_ACTION';
    Database.resetMockStore({ [Schema.TABLES.AUDIT_TRAIL]: store });

    const checkTampered = AuditService.verifyIntegrityChain();
    assert(checkTampered.verified === false, 'verifyIntegrityChain detects tampered record');

    // 4. AuditApi Permission Gate
    Auth.setMockSessionUser('teacher@school.ac.th'); // Teacher cannot view audit logs
    const teacherDenied = AuditApi.apiGetAuditLogs({}, 'REQ-AUD-001');
    assert(teacherDenied.success === false && teacherDenied.error.code === 'FORBIDDEN',
      'AuditApi blocks Teacher from viewing audit trail with FORBIDDEN');

  } catch (error) {
    results.testsFailed++;
    results.details.push({ status: 'ERROR', error: error.message, stack: error.stack });
  }

  return results;
}
