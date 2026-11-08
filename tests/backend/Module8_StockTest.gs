/**
 * Module8_StockTest.gs - Regression Test for Stock Movements & Mutex (Module 8)
 * Scope: StockService.gs, StockApi.gs
 */

function runModule8StockTest() {
  const results = {
    suite: 'Module 8: Stock Movements & Mutex',
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
    Database.appendRow(Schema.TABLES.STOCK_LEDGER, Schema.getHeaders(Schema.TABLES.STOCK_LEDGER));
    Database.appendRow(Schema.TABLES.TRANSACTIONS, Schema.getHeaders(Schema.TABLES.TRANSACTIONS));
    Database.appendRow(Schema.TABLES.REQUISITIONS, Schema.getHeaders(Schema.TABLES.REQUISITIONS));
    Database.appendRow(Schema.TABLES.REQUISITION_ITEMS, Schema.getHeaders(Schema.TABLES.REQUISITION_ITEMS));
    Database.appendRow(Schema.TABLES.USERS, Schema.getHeaders(Schema.TABLES.USERS));
    AuthService.ensureDefaultUsers();

    // 1. Setup Item with 0 stock
    ItemService.createItem({
      item_code: 'OFF-001',
      item_name: 'กระดาษ A4',
      category: 'วัสดุสำนักงาน',
      unit: 'รีม',
      unit_price: 100.0,
      min_stock: 10,
      current_stock: 0
    });

    // 2. Stock Receive Test
    Auth.setMockSessionUser('officer@school.ac.th'); // Officer role
    const recResult = StockService.receiveStock({
      item_code: 'OFF-001',
      quantity: 50,
      unit_cost: 110.0,
      supplier: 'บจก. สมาร์ท ออฟฟิศ'
    });

    assert(recResult.new_stock === 50, 'Master item stock increased to 50');
    const itemAfterRec = ItemService.getItemByCode('OFF-001');
    assert(itemAfterRec.current_stock === 50 && itemAfterRec.unit_price === 110.0, 'Item current_stock is 50 and price updated to 110');

    // 3. Requisition & Issue Flow Test
    Auth.setMockSessionUser('teacher@school.ac.th');
    const req = RequisitionService.createRequisition({
      purpose: 'ใช้งานประจำสัปดาห์',
      items: [{ item_code: 'OFF-001', quantity_requested: 20 }]
    });

    // Issuing unapproved requisition should fail
    Auth.setMockSessionUser('officer@school.ac.th');
    let unapprovedIssueThrew = false;
    try {
      StockService.issueRequisitionStock(req.requisition_id);
    } catch (e) {
      unapprovedIssueThrew = true;
      assert(e.code === ErrorService.ERROR_CODES.INVALID_STATE_TRANSITION, 'Throws INVALID_STATE_TRANSITION');
    }
    assert(unapprovedIssueThrew, 'Cannot issue stock for PENDING requisition');

    // Approve Requisition
    Auth.setMockSessionUser('director@school.ac.th');
    ApprovalService.approveRequisition(req.requisition_id);

    // Issue Stock
    Auth.setMockSessionUser('officer@school.ac.th');
    const issueRes = StockService.issueRequisitionStock(req.requisition_id);
    assert(issueRes.requisition.status === 'ISSUED', 'Requisition status is ISSUED');

    const itemAfterIssue = ItemService.getItemByCode('OFF-001');
    assert(itemAfterIssue.current_stock === 30, 'Master item stock reduced from 50 to 30 (50 - 20)');

    // 4. Physical Count Adjustment Test
    const adjRes = StockService.adjustStock({
      item_code: 'OFF-001',
      actual_quantity: 35,
      reason: 'นับยอดคงคลังประจำสัปดาห์ พบเกิน 5 รีม'
    });
    assert(adjRes.new_stock === 35 && adjRes.delta === 5, 'Adjusted stock to 35 (delta +5)');

    const itemAfterAdj = ItemService.getItemByCode('OFF-001');
    assert(itemAfterAdj.current_stock === 35, 'Master item stock matches adjusted count (35)');

    // 5. StockApi Check
    const apiAdjRes = StockApi.apiAdjustStock({
      item_code: 'OFF-001',
      actual_quantity: 35,
      reason: 'ยอดตรงกัน ไม่มีการปรับเปลี่ยน'
    }, 'REQ-STOCK-001');
    assert(apiAdjRes.success === true, 'StockApi.apiAdjustStock returns success envelope');

  } catch (error) {
    results.testsFailed++;
    results.details.push({ status: 'ERROR', error: error.message, stack: error.stack });
  }

  return results;
}
