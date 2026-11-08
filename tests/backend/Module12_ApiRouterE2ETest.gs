/**
 * Module12_ApiRouterE2ETest.gs - End-to-End & API Router Regression Test (Module 12)
 * Scope: ApiRouter.gs, Setup.gs, Migration.gs, Code.gs, Config.gs
 */

function runModule12ApiRouterE2ETest() {
  const results = {
    suite: 'Module 12: API Router & End-to-End Integration',
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
    // 1. Reset Database & Run Full Setup
    Database.resetMockStore();
    const setupResult = Setup.initDatabase();
    assert(setupResult.success === true, 'Setup.initDatabase completes successfully');

    // 2. Migration Check
    const migResult = Migration.runMigration();
    assert(migResult.success === true && migResult.current_version === '2.0.0', 'Migration.runMigration upgrades to 2.0.0');

    // 3. ApiRouter Route Dispatching
    // Test Unknown Route
    const unknownRes = ApiRouter.routeRequest('non.existent.action', {}, 'REQ-ERR-001');
    assert(unknownRes.success === false && unknownRes.error.code === 'NOT_FOUND',
      'ApiRouter returns NOT_FOUND for unknown action');

    // Test items.list
    Auth.setMockSessionUser('officer@school.ac.th');
    const itemsRes = ApiRouter.routeRequest('items.list', {}, 'REQ-E2E-001');
    assert(itemsRes.success === true && itemsRes.data.length >= 100,
      'ApiRouter "items.list" returns all 100 seeded items');

    // Test items.get
    const itemGetRes = ApiRouter.routeRequest('items.get', { item_code: 'OFF-001' }, 'REQ-E2E-002');
    assert(itemGetRes.success === true && itemGetRes.data.item_name.includes('Double A'),
      'ApiRouter "items.get" fetches OFF-001');

    // 4. Complete End-to-End Transaction Flow via ApiRouter
    // A: Teacher creates requisition
    Auth.setMockSessionUser('teacher@school.ac.th');
    const reqCreateRes = ApiRouter.routeRequest('requisitions.create', {
      purpose: 'โครงการแข่งขันทักษะวิชาการ',
      items: [
        { item_code: 'OFF-001', quantity_requested: 5 }, // stock 45 -> 40
        { item_code: 'OFF-004', quantity_requested: 10 } // stock 120 -> 110
      ]
    }, 'REQ-E2E-003');
    assert(reqCreateRes.success === true, 'ApiRouter "requisitions.create" succeeds');
    const reqId = reqCreateRes.data.requisition_id;

    // B: Approver approves requisition
    Auth.setMockSessionUser('director@school.ac.th');
    const approveRes = ApiRouter.routeRequest('requisitions.approve', {
      requisition_id: reqId,
      notes: 'อนุมัติให้ดำเนินการ'
    }, 'REQ-E2E-004');
    assert(approveRes.success === true && approveRes.data.status === 'APPROVED',
      'ApiRouter "requisitions.approve" transitions to APPROVED');

    // C: Officer issues stock
    Auth.setMockSessionUser('officer@school.ac.th');
    const issueRes = ApiRouter.routeRequest('stock.issue', {
      requisition_id: reqId
    }, 'REQ-E2E-005');
    assert(issueRes.success === true && issueRes.data.requisition.status === 'ISSUED',
      'ApiRouter "stock.issue" completes physical issue and updates ledger');

    // D: Verify Deducted Balances
    const itemOff1 = ItemService.getItemByCode('OFF-001');
    assert(itemOff1.current_stock === 40, 'OFF-001 stock reduced from 45 to 40');
    const itemOff4 = ItemService.getItemByCode('OFF-004');
    assert(itemOff4.current_stock === 110, 'OFF-004 stock reduced from 120 to 110');

    // E: Dashboard Metrics via ApiRouter
    const dashRes = ApiRouter.routeRequest('dashboard.metrics', {}, 'REQ-E2E-006');
    assert(dashRes.success === true && dashRes.data.total_items >= 100,
      'ApiRouter "dashboard.metrics" aggregates whole catalog');

    // F: Audit Integrity Check
    const auditRes = ApiRouter.routeRequest('audit.verify', {}, 'REQ-E2E-007');
    assert(auditRes.success === true && auditRes.data.verified === true,
      'ApiRouter "audit.verify" confirms audit hash chain is unbroken');

  } catch (error) {
    results.testsFailed++;
    results.details.push({ status: 'ERROR', error: error.message, stack: error.stack });
  }

  return results;
}
