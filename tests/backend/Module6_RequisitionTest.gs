/**
 * Module6_RequisitionTest.gs - Regression Test for Requisition Service & API (Module 6)
 * Scope: RequisitionService.gs, RequisitionApi.gs
 */

function runModule6RequisitionTest() {
  const results = {
    suite: 'Module 6: Requisition Service & Requisition API',
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
    Database.appendRow(Schema.TABLES.MASTER_ITEMS, Schema.getHeaders(Schema.TABLES.MASTER_ITEMS));
    Database.appendRow(Schema.TABLES.REQUISITIONS, Schema.getHeaders(Schema.TABLES.REQUISITIONS));
    Database.appendRow(Schema.TABLES.REQUISITION_ITEMS, Schema.getHeaders(Schema.TABLES.REQUISITION_ITEMS));
    Database.appendRow(Schema.TABLES.USERS, Schema.getHeaders(Schema.TABLES.USERS));
    AuthService.ensureDefaultUsers();

    // Seed master item with 50 stock
    ItemService.createItem({
      item_code: 'OFF-001',
      item_name: 'กระดาษ A4 70 แกรม',
      category: 'วัสดุสำนักงาน',
      unit: 'รีม',
      unit_price: 110.0,
      min_stock: 10,
      current_stock: 50
    });

    ItemService.createItem({
      item_code: 'OFF-002',
      item_name: 'ปากกาไวท์บอร์ด',
      category: 'วัสดุการศึกษา',
      unit: 'ด้าม',
      unit_price: 20.0,
      min_stock: 10,
      current_stock: 30
    });

    Auth.setMockSessionUser('teacher@school.ac.th');

    // 1. Empty Basket Rejection
    let emptyBasketThrew = false;
    try {
      RequisitionService.createRequisition({
        purpose: 'สอนหนังสือ',
        items: []
      });
    } catch (e) {
      emptyBasketThrew = true;
    }
    assert(emptyBasketThrew, 'createRequisition rejects empty items basket');

    // 2. Insufficient Stock Rejection
    let overStockThrew = false;
    try {
      RequisitionService.createRequisition({
        purpose: 'สอบกลางภาค',
        items: [
          { item_code: 'OFF-001', quantity_requested: 999 }
        ]
      });
    } catch (e) {
      overStockThrew = true;
      assert(e.code === ErrorService.ERROR_CODES.INSUFFICIENT_STOCK, 'Throws INSUFFICIENT_STOCK');
    }
    assert(overStockThrew, 'createRequisition blocks requested quantity exceeding stock');

    // 3. Valid Multi-Item Basket Creation
    const createdReq = RequisitionService.createRequisition({
      purpose: 'จัดกิจกรรมวันภาษาไทย',
      urgency: 'ด่วน',
      items: [
        { item_code: 'OFF-001', quantity_requested: 5 },  // 5 * 110 = 550
        { item_code: 'OFF-002', quantity_requested: 10 }  // 10 * 20 = 200
      ]
    });

    assert(createdReq.status === 'PENDING', 'Requisition status is PENDING');
    assert(createdReq.total_items === 15, 'Total items count is 15 (5 + 10)');
    assert(createdReq.total_cost === 750, 'Total cost is 750 (550 + 200)');
    assert(createdReq.items && createdReq.items.length === 2, 'Line items attached');

    // 4. Retrieve Detail with items
    const fetched = RequisitionService.getRequisitionById(createdReq.requisition_id);
    assert(fetched && fetched.items.length === 2, 'getRequisitionById retrieves header and line items');

    // 5. RequisitionApi Ownership Filter Check
    const teacherListRes = RequisitionApi.apiGetRequisitions({}, 'REQ-601');
    assert(teacherListRes.success === true && teacherListRes.data.length === 1,
      'Teacher sees their own submitted requisition');

  } catch (error) {
    results.testsFailed++;
    results.details.push({ status: 'ERROR', error: error.message, stack: error.stack });
  }

  return results;
}
