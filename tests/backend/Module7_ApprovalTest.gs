/**
 * Module7_ApprovalTest.gs - Regression Test for Approval Workflow State Machine (Module 7)
 * Scope: ApprovalService.gs, RequisitionApi.gs
 */

function runModule7ApprovalTest() {
  const results = {
    suite: 'Module 7: Approval Workflow Service',
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

    // Create item and requisition
    ItemService.createItem({
      item_code: 'OFF-001',
      item_name: 'กระดาษ A4',
      category: 'วัสดุสำนักงาน',
      unit: 'รีม',
      unit_price: 110.0,
      min_stock: 10,
      current_stock: 100
    });

    Auth.setMockSessionUser('teacher@school.ac.th');
    const req1 = RequisitionService.createRequisition({
      purpose: 'จัดทำเอกสารหลักสูตร',
      items: [{ item_code: 'OFF-001', quantity_requested: 10 }]
    });

    // 1. Teacher cannot approve
    let teacherApproveThrew = false;
    try {
      ApprovalService.approveRequisition(req1.requisition_id);
    } catch (e) {
      teacherApproveThrew = true;
      assert(e.code === ErrorService.ERROR_CODES.FORBIDDEN, 'Teacher blocked with FORBIDDEN');
    }
    assert(teacherApproveThrew, 'Approval requires APPROVER role');

    // 2. Approver approves requisition
    Auth.setMockSessionUser('director@school.ac.th'); // APPROVER role
    const approved = ApprovalService.approveRequisition(req1.requisition_id, 'อนุมัติตามระเบียบ');
    assert(approved.status === 'APPROVED', 'Status transitioned to APPROVED');
    assert(approved.approved_by && approved.approved_by.includes('director@school.ac.th'), 'approved_by recorded');
    assert(approved.items[0].quantity_approved === 10, 'line item quantity_approved is set to 10');

    // 3. Rejecting an already approved requisition throws INVALID_STATE_TRANSITION
    let rejectApprovedThrew = false;
    try {
      ApprovalService.rejectRequisition(req1.requisition_id, 'เปลี่ยนใจไม่อนุมัติ');
    } catch (e) {
      rejectApprovedThrew = true;
      assert(e.code === ErrorService.ERROR_CODES.INVALID_STATE_TRANSITION, 'Throws INVALID_STATE_TRANSITION');
    }
    assert(rejectApprovedThrew, 'State machine blocks transition from APPROVED to REJECTED');

    // 4. Create second requisition to test rejection
    Auth.setMockSessionUser('teacher@school.ac.th');
    const req2 = RequisitionService.createRequisition({
      purpose: 'โครงการพิเศษ',
      items: [{ item_code: 'OFF-001', quantity_requested: 5 }]
    });

    Auth.setMockSessionUser('director@school.ac.th');
    // Rejecting without reason should fail
    let emptyReasonThrew = false;
    try {
      ApprovalService.rejectRequisition(req2.requisition_id, '');
    } catch (e) {
      emptyReasonThrew = true;
    }
    assert(emptyReasonThrew, 'Rejection requires a reason');

    const rejected = ApprovalService.rejectRequisition(req2.requisition_id, 'งบประมาณโครงการหมด');
    assert(rejected.status === 'REJECTED', 'Status transitioned to REJECTED');
    assert(rejected.reject_reason === 'งบประมาณโครงการหมด', 'reject_reason recorded');
    assert(rejected.items[0].quantity_approved === 0, 'Line item quantity_approved is 0');

  } catch (error) {
    results.testsFailed++;
    results.details.push({ status: 'ERROR', error: error.message, stack: error.stack });
  }

  return results;
}
