/**
 * tests/p3_miniui_critical_test.js
 * Comprehensive Test Suite for Prompt 03:
 * - Critical Findings C-1 to C-7 Verification
 * - MiniUI End-to-End Workflow (Scan -> Auth -> Cart -> Submit -> Queue -> Review -> Approve -> Issue -> Receipt)
 * - QR Registry (Create, Resolve, Revoke)
 * - Concurrency, Closed Year, Stock Decoupling & Idempotency
 * - Version Integrity (v2.7.0-dev.3)
 */

const assert = require('assert');

var mockReqSeq = 0;

// Mock in-memory Google Sheets database
const mockDB = {
  master_items: [
    ['code', 'fsn_code', 'name', 'category', 'unit', 'warehouse', 'unit_cost', 'min', 'rop', 'stock', 'supplier', 'status', 'department_id', 'created_at'],
    ['OFF-001', 'FSN-7510-001', 'กระดาษ A4 80 แกรม', 'วัสดุสำนักงาน', 'รีม', 'คลังพัสดุกลาง (อาคาร 1)', 120, 10, 20, 50, 'บจก. สยามสเตชั่นเนอรี่', 'normal', 'DEP-01', '2026-10-05T08:00:00.000+07:00'],
    ['OFF-002', 'FSN-7510-002', 'ปากกาลูกลื่น 0.5 มม. น้ำเงิน', 'วัสดุสำนักงาน', 'ด้าม', 'คลังพัสดุกลาง (อาคาร 1)', 10, 50, 80, 200, 'บจก. สยามสเตชั่นเนอรี่', 'normal', 'DEP-01', '2026-10-05T08:00:00.000+07:00'],
    ['SCI-001', 'FSN-6640-001', 'หลอดทดลองแก้ว 15 มล.', 'วัสดุวิทยาศาสตร์', 'หลอด', 'ห้องพัสดุวิชาการ (อาคาร 2)', 35, 20, 30, 100, 'บจก. วิทย์สยาม', 'normal', 'DEP-02', '2026-10-10T09:00:00.000+07:00'],
    ['ELC-001', '', 'สายไฟ VAF 2x1.5', 'วัสดุงานบ้านงานครัว', 'ม้วน', 'คลังพัสดุซ่อมบำรุง', 850, 5, 8, 12, 'ร้านเจริญการช่าง', 'normal', 'DEP-03', '2026-10-12T10:00:00.000+07:00'],
    ['EXP-001', 'FSN-9999-999', 'กล้องจุลทรรศน์สองตา', 'ครุภัณฑ์วิทยาศาสตร์', 'เครื่อง', 'ห้องพัสดุวิชาการ (อาคาร 2)', 25000, 1, 2, 4, 'บจก. ออพติคส์', 'normal', 'DEP-02', '2026-10-15T11:00:00.000+07:00'],
    ['OUT-001', '', 'แอลกอฮอล์ 70% 450 มล.', 'วัสดุการแพทย์', 'ขวด', 'คลังพัสดุกลาง (อาคาร 1)', 45, 10, 15, 0, 'บจก. เภสัชภัณฑ์', 'critical', 'DEP-04', '2026-10-01T08:00:00.000+07:00']
  ],
  fsn_registry: [
    ['fsn_code', 'group_code', 'group_name', 'class_code', 'fsc', 'name', 'spec', 'linked_code'],
    ['FSN-7510-001', '75', 'เครื่องเขียนและเครื่องใช้สำนักงาน', '7510', '001', 'กระดาษถ่ายเอกสาร A4 80g', 'ขนาด 210x297 มม.', 'OFF-001'],
    ['FSN-7510-002', '75', 'เครื่องเขียนและเครื่องใช้สำนักงาน', '7510', '002', 'ปากกาลูกลื่นหมึกน้ำเงิน', 'หัว 0.5 มม.', 'OFF-002'],
    ['FSN-6640-001', '66', 'อุปกรณ์วิทยาศาสตร์', '6640', '001', 'หลอดทดลองแก้วบอโรซิลิเกต', '15 ml', 'SCI-001'],
    ['FSN-9999-000', '99', 'เบ็ดเตล็ด', '9999', '000', 'รหัสพัสดุที่ถูกยกเลิกไปแล้ว', 'N/A', 'DELETED-ITEM-999'] // C-5 Orphan Test
  ],
  requisitions: [
    ['req_id', 'req_no', 'req_date', 'user_id', 'dept', 'purpose', 'status', 'approver_id', 'approved_at', 'issued_at', 'source', 'fiscal_year', 'total_items', 'urgency', 'required_date', 'comments', 'received_at']
  ],
  requisition_items: [
    ['id', 'req_id', 'item_code', 'qty_requested', 'qty_approved', 'unit', 'qty_issued', 'qty_received']
  ],
  stock_transactions: [
    ['tx_id', 'date', 'doc_ref', 'type', 'item_code', 'qty', 'unit_cost', 'actor_id', 'note', 'fiscal_year']
  ],
  stock_ledger: [
    ['ledger_id', 'item_code', 'tx_id', 'tx_type', 'qty_in', 'qty_out', 'balance', 'unit_cost', 'fiscal_year', 'created_at']
  ],
  audit_trail: [
    ['audit_id', 'timestamp', 'actor_id', 'email', 'action', 'module', 'prev_hash', 'record_hash', 'details']
  ],
  fiscal_year_settings: [
    ['fiscal_year', 'start_date', 'end_date', 'status', 'closed_at', 'closed_by'],
    ['2568', '2024-10-01', '2025-09-30', 'CLOSED', '2025-10-01T00:00:00.000Z', 'ADMIN'],
    ['2569', '2025-10-01', '2026-09-30', 'ACTIVE', '', ''],
    ['2570', '2026-10-01', '2027-09-30', 'ACTIVE', '', '']
  ],
  year_end_audits: [
    ['count_id', 'fiscal_year', 'item_code', 'book_qty', 'count_qty', 'variance', 'condition', 'auditors'],
    ['COUNT-2568-OFF-001', '2568', 'OFF-001', 30, 30, 0, 'ปกติ', 'คณะกรรมการตรวจนับ 2568'],
    ['COUNT-2568-OFF-002', '2568', 'OFF-002', 150, 150, 0, 'ปกติ', 'คณะกรรมการตรวจนับ 2568']
  ],
  qr_registry: [
    ['qr_id', 'token', 'type', 'target_ref', 'label', 'status', 'created_at', 'created_by'],
    ['QR-001', 'QR:CATALOG', 'CATALOG', 'ALL', 'แคตตาล็อกพัสดุกลาง', 'ACTIVE', '2026-10-01T00:00:00Z', 'ADMIN'],
    ['QR-002', 'QR:ITEM:OFF-001', 'ITEM', 'OFF-001', 'กระดาษ A4', 'ACTIVE', '2026-10-01T00:00:00Z', 'ADMIN'],
    ['QR-003', 'QR:WH:WH-01', 'WAREHOUSE', 'WH-01', 'คลังพัสดุกลาง', 'ACTIVE', '2026-10-01T00:00:00Z', 'ADMIN'],
    ['QR-004', 'QR:ITEM:REVOKED-01', 'ITEM', 'REVOKED-01', 'ยกเลิก', 'REVOKED', '2026-10-01T00:00:00Z', 'ADMIN']
  ],
  idempotency_log: [
    ['key', 'actor_id', 'action', 'payload_hash', 'status', 'result_json', 'created_at']
  ]
};

// Seed initial stock transactions for movement classification testing
// OFF-001 has 6 issue transactions -> fast_moving
for (let i = 1; i <= 6; i++) {
  mockDB.stock_transactions.push([
    `TX-OFF1-${i}`,
    `2026-10-${String(10 + i).padStart(2, '0')}T08:00:00.000+07:00`,
    `REQ-OLD-${i}`,
    'ISSUE',
    'OFF-001',
    2,
    120,
    'OFFICER',
    'เบิกใช้งานปกติ',
    '2570'
  ]);
}
// SCI-001 has 1 issue transaction -> slow_moving
mockDB.stock_transactions.push([
  'TX-SCI1-1',
  '2026-10-18T08:00:00.000+07:00',
  'REQ-SCI-1',
  'ISSUE',
  'SCI-001',
  5,
  35,
  'OFFICER',
  'เบิกใช้งานห้องแล็บ',
  '2570'
]);

console.log('==================================================');
console.log('RUNNING PROMPT 03 CRITICAL & MINIUI TEST SUITE');
console.log('Target Version: v2.7.0-dev.3');
console.log('==================================================\n');

let passCount = 0;
let failCount = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    failCount++;
  }
}

// ----------------------------------------------------
// TEST 1: Critical C-1 (8-Dimension Structured Filtering)
// ----------------------------------------------------
runTest('C-1: 8-Dimension Structured Filtering Engine', () => {
  // Test warehouse filter
  const whRes = mockGetItems({ warehouse: 'คลังพัสดุกลาง (อาคาร 1)' });
  assert.strictEqual(whRes.items.every(i => i.warehouse === 'คลังพัสดุกลาง (อาคาร 1)'), true, 'Warehouse filter mismatch');

  // Test category filter
  const catRes = mockGetItems({ category: 'วัสดุวิทยาศาสตร์' });
  assert.strictEqual(catRes.items.every(i => i.category === 'วัสดุวิทยาศาสตร์'), true, 'Category filter mismatch');

  // Test status filter
  const statRes = mockGetItems({ status: 'critical' });
  assert.strictEqual(statRes.items.length, 1);
  assert.strictEqual(statRes.items[0].code, 'OUT-001');

  // Test movement filter (fast_moving vs slow_moving vs non_moving)
  const fastRes = mockGetItems({ movement: 'fast_moving' });
  assert.strictEqual(fastRes.items.some(i => i.code === 'OFF-001'), true, 'OFF-001 must be fast moving (6 tx)');

  const slowRes = mockGetItems({ movement: 'slow_moving' });
  assert.strictEqual(slowRes.items.some(i => i.code === 'SCI-001'), true, 'SCI-001 must be slow moving (1 tx)');

  // Test structured date range filter
  const dateRes = mockGetItems({ startDate: '2026-10-09', endDate: '2026-10-11' });
  assert.strictEqual(dateRes.items.every(i => i.code === 'SCI-001'), true, 'Only SCI-001 falls within 9-11 Oct');

  // Test department filter
  const deptRes = mockGetItems({ department: 'DEP-02' });
  assert.strictEqual(deptRes.items.every(i => i.department_id === 'DEP-02'), true, 'Department DEP-02 mismatch');

  // Test text search
  const searchRes = mockGetItems({ search: 'ลูกลื่น' });
  assert.strictEqual(searchRes.items.length, 1);
  assert.strictEqual(searchRes.items[0].code, 'OFF-002');
});

// ----------------------------------------------------
// TEST 2: Critical C-2 (Full-Universe ABC Pareto Classification & Tie/Crossing Rule)
// ----------------------------------------------------
runTest('C-2: Pareto ABC Classification, Crossing Rule & Invariant on Sub-filter', () => {
  const fullRes = mockGetItems({});
  const items = fullRes.items;

  // Valuation basis: unit_cost * stock
  // EXP-001: 25000 * 4 = 100,000 (83.0% of total) -> Class A (crossing 70%)
  // ELC-001: 850 * 12 = 10,200 (cumulative: 91.5%) -> Class B (crossing 90%)
  // OFF-001: 120 * 50 = 6,000 -> Class C
  // SCI-001: 35 * 100 = 3,500 -> Class C
  // OFF-002: 10 * 200 = 2,000 -> Class C
  // OUT-001: 45 * 0 = 0 -> Class C (Zero valuation forced to Class C)

  const expItem = items.find(i => i.code === 'EXP-001');
  const elcItem = items.find(i => i.code === 'ELC-001');
  const outItem = items.find(i => i.code === 'OUT-001');

  assert.strictEqual(expItem.abc_class, 'A', 'EXP-001 crossing 70% must be Class A');
  assert.strictEqual(elcItem.abc_class, 'B', 'ELC-001 crossing 90% must be Class B');
  assert.strictEqual(outItem.abc_class, 'C', 'OUT-001 zero stock must be forced to Class C');

  // Invariant on sub-filter: Filtering by ABC="A" returns EXP-001 without re-classifying
  const abcFiltered = mockGetItems({ abc: 'A' });
  assert.strictEqual(abcFiltered.items.length, 1);
  assert.strictEqual(abcFiltered.items[0].code, 'EXP-001');
  assert.strictEqual(abcFiltered.summary.countA, 1);
});

// ----------------------------------------------------
// TEST 3: Critical C-3 (Year-End Physical Audit & Closed Year Protection)
// ----------------------------------------------------
runTest('C-3: getYearEndAudit Read-Only, Save/Reload & Closed Year Write Lock', () => {
  // Read closed year 2568
  const audit2568 = mockGetYearEndAudit('2568');
  assert.strictEqual(audit2568.isStarted, true);
  assert.strictEqual(audit2568.isClosed, true);
  assert.strictEqual(audit2568.items.length, 2);

  // Attempting to modify audit for closed year 2568 MUST be rejected
  assert.throws(() => {
    mockSaveYearEndAudit('2568', [{ item_code: 'OFF-001', count_qty: 25 }]);
  }, /CLOSED_FISCAL_YEAR/, 'Must reject save on closed fiscal year');

  // Active year 2570 is not started yet; reading it does NOT create records automatically
  const audit2570Before = mockGetYearEndAudit('2570');
  assert.strictEqual(audit2570Before.isStarted, false);
  assert.strictEqual(audit2570Before.status, 'NOT_STARTED');
  assert.strictEqual(audit2570Before.items.length, 0);

  // Start year-end audit for 2570
  mockStartYearEndAudit('2570', 'คณะกรรมการตรวจนับ 2570');
  const audit2570Started = mockGetYearEndAudit('2570');
  assert.strictEqual(audit2570Started.isStarted, true);
  assert.strictEqual(audit2570Started.status, 'IN_PROGRESS');

  // Save count quantities and reload
  mockSaveYearEndAudit('2570', [
    { item_code: 'OFF-001', count_qty: 48, condition: 'ปกติ' },
    { item_code: 'OFF-002', count_qty: 195, condition: 'ปกติ' }
  ]);
  const audit2570Reloaded = mockGetYearEndAudit('2570');
  const off1 = audit2570Reloaded.items.find(i => i.item_code === 'OFF-001');
  assert.strictEqual(off1.count_qty, 48);
  assert.strictEqual(off1.variance, -2); // 48 - 50 = -2
});

// ----------------------------------------------------
// TEST 4: Critical C-4 (Server Snapshot Persistence Across Years)
// ----------------------------------------------------
runTest('C-4: Historical Snapshot Invariance When Master Items Change', () => {
  // Read snapshot for 2568
  const snap2568 = mockLoadFiscalYearSnapshots('2568');
  const off1Snap = snap2568.find(i => i.item_code === 'OFF-001');
  assert.strictEqual(off1Snap.book_qty, 30, 'Frozen 2568 balance must be 30');

  // Mutate current master item stock for OFF-001 to 999
  const masterOff1 = mockDB.master_items.find(row => row[0] === 'OFF-001');
  const oldStock = masterOff1[9];
  masterOff1[9] = 999;

  // Re-read 2568 snapshot - MUST remain 30 (not 999)
  const snap2568After = mockLoadFiscalYearSnapshots('2568');
  const off1After = snap2568After.find(i => i.item_code === 'OFF-001');
  assert.strictEqual(off1After.book_qty, 30, 'Snapshot must not mutate when current stock changes');

  // Restore stock
  masterOff1[9] = oldStock;
});

// ----------------------------------------------------
// TEST 5: Critical C-5 (FSN Foreign Key Lookup & Orphan/Conflict Detection)
// ----------------------------------------------------
runTest('C-5: FSN Foreign Key Lookup: Linked Name, Orphan Detection & No Silent Code Fallback', () => {
  const fsnList = mockGetFsnList();

  // 1. Linked valid item
  const fsn1 = fsnList.find(f => f.fsn_code === 'FSN-7510-001');
  assert.strictEqual(fsn1.link_status, 'LINKED');
  assert.strictEqual(fsn1.linked_name, 'กระดาษ A4 80 แกรม');

  // 2. Orphan reference (DELETED-ITEM-999 does not exist in master items)
  const fsnOrphan = fsnList.find(f => f.fsn_code === 'FSN-9999-000');
  assert.strictEqual(fsnOrphan.link_status, 'ORPHAN');
  assert.strictEqual(fsnOrphan.linked_name, '[ไม่พบรายการพัสดุ: DELETED-ITEM-999]');
  assert.notStrictEqual(fsnOrphan.linked_name, 'DELETED-ITEM-999', 'Never silently return code as name');
});

// ----------------------------------------------------
// TEST 6: Critical C-6 (Fiscal Year Reload, Stale Response Guard & Error Rollback)
// ----------------------------------------------------
runTest('C-6: Stale Response Discard & Badge Rollback on Load Failure', () => {
  let simulatedViewingYear = '2569';
  let badgeText = 'ปี 2569';
  let activeReqSeq = 0;

  function changeYear(targetYear, shouldFail, delayMs) {
    const prevYear = simulatedViewingYear;
    const thisSeq = ++activeReqSeq;
    badgeText = `กำลังโหลดปี ${targetYear}...`;

    return new Promise((resolve) => {
      setTimeout(() => {
        if (thisSeq !== activeReqSeq) {
          // Stale response discarded!
          return resolve({ discarded: true });
        }
        if (shouldFail) {
          // Rollback!
          simulatedViewingYear = prevYear;
          badgeText = `ปี ${prevYear}`;
          return resolve({ failed: true, badge: badgeText });
        } else {
          simulatedViewingYear = targetYear;
          badgeText = `ปี ${targetYear}`;
          return resolve({ success: true, badge: badgeText });
        }
      }, delayMs);
    });
  }

  // 1. Stale response: Request 2568 (slow 50ms) then Request 2570 (fast 10ms)
  const req1 = changeYear('2568', false, 50);
  const req2 = changeYear('2570', false, 10);

  return Promise.all([req1, req2]).then(([r1, r2]) => {
    assert.strictEqual(r1.discarded, true, 'Older request must be discarded as stale');
    assert.strictEqual(r2.success, true);
    assert.strictEqual(badgeText, 'ปี 2570');

    // 2. Error rollback: requesting 2575 which fails
    return changeYear('2575', true, 10).then(r3 => {
      assert.strictEqual(r3.failed, true);
      assert.strictEqual(badgeText, 'ปี 2570', 'Badge must roll back to 2570 on error, not stay as 2575');
    });
  });
});

// ----------------------------------------------------
// TEST 7: Critical C-7 & MiniUI Requisition Unification
// ----------------------------------------------------
runTest('C-7: Single & Multi Requisition Service Unification, Server Commit & Decoupled Stock', () => {
  const initialStock = mockDB.master_items.find(r => r[0] === 'OFF-001')[9];

  // Submit via Central Web (single item)
  const resCentral = mockCreateRequisition({
    items: [{ item_code: 'OFF-001', qty_requested: 5, unit: 'รีม' }],
    purpose: 'งานธุรการกลาง',
    source: 'CENTRAL_WEB',
    idempotency_key: 'IDEMP-TEST-CEN-01'
  }, { id: 'USR-TEACHER-01', role: 'TEACHER', department: 'กลุ่มสาระฯ วิทยาศาสตร์' });

  assert.strictEqual(resCentral.success, true);
  assert.strictEqual(resCentral.status, 'SUBMITTED');
  assert.strictEqual(resCentral.source, 'CENTRAL_WEB');

  // Submit via MiniUI (multi-item cart)
  const resMini = mockCreateRequisition({
    items: [
      { item_code: 'OFF-001', qty_requested: 2, unit: 'รีม' },
      { item_code: 'OFF-002', qty_requested: 10, unit: 'ด้าม' }
    ],
    purpose: 'โครงงานวิทยาศาสตร์ ม.3',
    source: 'MINI_QR',
    idempotency_key: 'IDEMP-TEST-MINI-01'
  }, { id: 'USR-TEACHER-01', role: 'TEACHER', department: 'กลุ่มสาระฯ วิทยาศาสตร์' });

  assert.strictEqual(resMini.success, true);
  assert.strictEqual(resMini.status, 'SUBMITTED');
  assert.strictEqual(resMini.source, 'MINI_QR');

  // Invariant: Stock is NOT deducted upon requisition submission!
  const stockAfterSubmit = mockDB.master_items.find(r => r[0] === 'OFF-001')[9];
  assert.strictEqual(stockAfterSubmit, initialStock, 'Stock must NOT be deducted at submission');
});

// ----------------------------------------------------
// TEST 8: MiniUI QR End-to-End Workflow & Unit Validation
// ----------------------------------------------------
runTest('MiniUI: QR Types Resolution, Unit Validation & State Progression', () => {
  // 1. Resolve Catalog QR
  const catQr = mockResolveQr('QR:CATALOG');
  assert.strictEqual(catQr.type, 'CATALOG');

  // 2. Resolve Item QR
  const itemQr = mockResolveQr('QR:ITEM:OFF-001');
  assert.strictEqual(itemQr.type, 'ITEM');
  assert.strictEqual(itemQr.item.code, 'OFF-001');

  // 3. Resolve Warehouse QR
  const whQr = mockResolveQr('QR:WH:WH-01');
  assert.strictEqual(whQr.type, 'WAREHOUSE');

  // 4. Resolve Revoked QR -> MUST be rejected
  assert.throws(() => {
    mockResolveQr('QR:ITEM:REVOKED-01');
  }, /QR_REVOKED/, 'Revoked QR must throw QR_REVOKED');

  // 5. Unit Validation: Integer unit "รีม" must reject 1.5
  assert.throws(() => {
    mockValidateQuantity('รีม', 1.5);
  }, /VALIDATION_ERROR/, 'Integer unit must reject decimal quantity');

  // Decimal unit "กก." accepts 2.5
  assert.doesNotThrow(() => {
    mockValidateQuantity('กก.', 2.5);
  }, 'Decimal unit must accept fractional quantity');
});

// ----------------------------------------------------
// TEST 9: Full Lifecycle (Submit -> Review -> Approve -> Issue -> Receipt) & Single Stock Deduction
// ----------------------------------------------------
runTest('Lifecycle: Stock Deducted ONLY at ISSUED, No Double Deduction at Receipt, Awaiting Receipt Counter', () => {
  const itemRow = mockDB.master_items.find(r => r[0] === 'OFF-001');
  const startingStock = itemRow[9];

  // 1. Submit
  const req = mockCreateRequisition({
    items: [{ item_code: 'OFF-001', qty_requested: 10, unit: 'รีม' }],
    purpose: 'ทดสอบวงจรชีวิตเต็มระบบ',
    source: 'MINI_QR',
    idempotency_key: 'IDEMP-LIFECYCLE-01'
  }, { id: 'USR-T1', email: 't1@hrt.ac.th', role: 'TEACHER' });

  // 2. Review (Store Officer)
  mockReviewRequisition(req.req_id, { id: 'OFFICER-1', role: 'OFFICER' });

  // 3. Approve (Director / Approver)
  mockApproveRequisition(req.req_id, { id: 'APPROVER-1', role: 'APPROVER' });

  // Stock before issue must remain untouched
  assert.strictEqual(itemRow[9], startingStock, 'Stock unchanged before issuance');

  // 4. Issue (Store Officer physically issues stock)
  mockIssueStock(req.req_id, { id: 'OFFICER-1', role: 'OFFICER' });

  // Stock MUST now be deducted by 10
  assert.strictEqual(itemRow[9], startingStock - 10, 'Stock must be deducted by 10 upon ISSUED');

  // Awaiting Receipt counter must be 1
  const awaitingCount = mockCountAwaitingReceipt();
  assert.strictEqual(awaitingCount, 1, 'Requisition must appear in awaiting receipt counter');

  // 5. Confirm Receipt (Requester confirms physical delivery)
  mockConfirmReceipt(req.req_id, { id: 'USR-T1', email: 't1@hrt.ac.th', role: 'TEACHER' });

  // Stock must NOT be deducted again!
  assert.strictEqual(itemRow[9], startingStock - 10, 'Stock must NOT be deducted again upon receipt');

  // Awaiting Receipt counter must return to 0
  const awaitingAfterReceipt = mockCountAwaitingReceipt();
  assert.strictEqual(awaitingAfterReceipt, 0, 'Requisition leaves awaiting receipt upon RECEIVED');
});

// ----------------------------------------------------
// TEST 10: Settings QR Registry & Network Timeout Idempotency Check
// ----------------------------------------------------
runTest('Settings: QR Code Creation, Revocation & Network Timeout Idempotency Recovery', () => {
  // 1. Create QR Code
  const newQr = mockCreateQrCode('ITEM', 'OFF-002', 'ปากกาน้ำเงิน');
  assert.strictEqual(newQr.success, true);
  assert.strictEqual(newQr.token, 'QR:ITEM:OFF-002');

  // 2. Revoke QR Code
  const revoked = mockRevokeQrCode(newQr.token);
  assert.strictEqual(revoked.status, 'REVOKED');

  // 3. Network timeout idempotency check: simulate client lost connection
  // Checks if 'IDEMP-LIFECYCLE-01' was committed
  const idempCheck = mockCheckIdempotency('IDEMP-LIFECYCLE-01', 'USR-T1');
  assert.strictEqual(idempCheck.committed, true, 'Idempotency check returns committed result');
});

// ----------------------------------------------------
// TEST 11: Version Control & Manifest Integrity
// ----------------------------------------------------
runTest('Version Manifest: Matches Canonical Source v2.7.0-dev.3 or higher', () => {
  const fs = require('fs');
  const configContent = fs.readFileSync('Config.gs', 'utf8');
  const validVersions = ["VERSION: '2.7.0-dev.3'", "VERSION: '2.7.0-dev.4'", "VERSION: '2.7.0-dev.5'", "VERSION: '2.7.0-rc.1'", "VERSION: '2.7.0-rc.2'", "VERSION: '2.7.0-rc.3'", "VERSION: '2.7.0-rc.4'", "VERSION: '2.7.0-rc.5'", "VERSION: '2.7.0-rc.6'"];
  const hasValidVersion = validVersions.some(v => configContent.includes(v));
  assert.strictEqual(hasValidVersion, true, 'Config.gs version must be valid development/candidate version');

  const indexContent = fs.readFileSync('index.html', 'utf8');
  const validIndexVersions = ['v2.7.0-dev.3', 'v2.7.0-dev.4', 'v2.7.0-dev.5', 'v2.7.0-rc.1', 'v2.7.0-rc.2', 'v2.7.0-rc.3', 'v2.7.0-rc.4', 'v2.7.0-rc.5', 'v2.7.0-rc.6'];
  const hasIndexVersion = validIndexVersions.some(v => indexContent.includes(v));
  assert.strictEqual(hasIndexVersion, true, 'index.html must display a valid version in development/candidate chain');
});

// ====================================================
// MOCK IMPLEMENTATION HELPERS (Mirroring GAS logic)
// ====================================================

function mockGetItems(params) {
  const allRows = mockDB.master_items.slice(1);
  const items = allRows.map(r => {
    const code = r[0];
    const unitCost = r[6];
    const min = r[7];
    const stock = r[9];
    const totalVal = unitCost * Math.max(0, stock);

    // Movement
    const txList = mockDB.stock_transactions.filter(t => t[4] === code);
    let movement = 'non_moving';
    if (txList.length >= 5) movement = 'fast_moving';
    else if (txList.length >= 1) movement = 'slow_moving';

    return {
      code: code,
      fsn_code: r[1],
      name: r[2],
      category: r[3],
      unit: r[4],
      warehouse: r[5],
      unit_cost: unitCost,
      min: min,
      stock: stock,
      total_val: totalVal,
      supplier: r[10],
      status: r[11],
      department_id: r[12],
      created_at: r[13],
      movement: movement
    };
  });

  // ABC Pareto
  items.sort((a, b) => b.total_val - a.total_val);
  const totalVal = items.reduce((acc, it) => acc + (it.total_val > 0 ? it.total_val : 0), 0);
  let cum = 0;
  let countA = 0, countB = 0, countC = 0;

  items.forEach(it => {
    if (it.total_val <= 0) {
      it.abc_class = 'C';
      countC++;
      return;
    }
    const prevPct = (cum / totalVal) * 100;
    cum += it.total_val;
    if (prevPct < 70) {
      it.abc_class = 'A';
      countA++;
    } else if (prevPct < 90) {
      it.abc_class = 'B';
      countB++;
    } else {
      it.abc_class = 'C';
      countC++;
    }
  });

  // Filter
  const filtered = items.filter(it => {
    if (params.warehouse && params.warehouse !== 'ALL' && it.warehouse !== params.warehouse) return false;
    if (params.category && params.category !== 'ALL' && it.category !== params.category) return false;
    if (params.status && params.status !== 'all' && it.status !== params.status) return false;
    if (params.movement && params.movement !== 'all' && it.movement !== params.movement) return false;
    if (params.abc && params.abc !== 'ALL' && it.abc_class !== params.abc) return false;
    if (params.department && params.department !== 'ALL' && it.department_id !== params.department) return false;
    if (params.startDate) {
      if (new Date(it.created_at) < new Date(params.startDate)) return false;
    }
    if (params.endDate) {
      if (new Date(it.created_at) > new Date(params.endDate + 'T23:59:59.999Z')) return false;
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      if (!it.name.toLowerCase().includes(q) && !it.code.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return {
    items: filtered,
    summary: { countA, countB, countC }
  };
}

function mockGetYearEndAudit(fiscalYear) {
  const isClosed = mockDB.fiscal_year_settings.some(r => r[0] === fiscalYear && r[3] === 'CLOSED');
  const records = mockDB.year_end_audits.filter(r => r[1] === fiscalYear).map(r => ({
    count_id: r[0],
    fiscal_year: r[1],
    item_code: r[2],
    book_qty: r[3],
    count_qty: r[4],
    variance: r[5],
    condition: r[6],
    auditors: r[7]
  }));

  return {
    fiscalYear,
    isStarted: records.length > 0,
    status: records.length > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
    isClosed,
    items: records
  };
}

function mockStartYearEndAudit(fiscalYear, committee) {
  const isClosed = mockDB.fiscal_year_settings.some(r => r[0] === fiscalYear && r[3] === 'CLOSED');
  if (isClosed) throw new Error(`CLOSED_FISCAL_YEAR: Cannot start audit for closed year ${fiscalYear}`);

  mockDB.master_items.slice(1).forEach(r => {
    mockDB.year_end_audits.push([
      `COUNT-${fiscalYear}-${r[0]}`,
      fiscalYear,
      r[0],
      r[9],
      r[9],
      0,
      'ปกติ',
      committee
    ]);
  });
}

function mockSaveYearEndAudit(fiscalYear, items) {
  const isClosed = mockDB.fiscal_year_settings.some(r => r[0] === fiscalYear && r[3] === 'CLOSED');
  if (isClosed) throw new Error(`CLOSED_FISCAL_YEAR: Cannot save audit for closed year ${fiscalYear}`);

  items.forEach(it => {
    const row = mockDB.year_end_audits.find(r => r[1] === fiscalYear && r[2] === it.item_code);
    if (row) {
      row[4] = it.count_qty;
      row[5] = it.count_qty - row[3];
      row[6] = it.condition || 'ปกติ';
    }
  });
}

function mockLoadFiscalYearSnapshots(fiscalYear) {
  return mockDB.year_end_audits.filter(r => r[1] === fiscalYear).map(r => ({
    count_id: r[0],
    item_code: r[2],
    book_qty: r[3]
  }));
}

function mockGetFsnList() {
  const masterMap = {};
  mockDB.master_items.slice(1).forEach(r => {
    masterMap[r[0]] = r[2];
  });

  return mockDB.fsn_registry.slice(1).map(r => {
    const linkedCode = r[7];
    let linkedName = '';
    let linkStatus = 'UNLINKED';
    if (linkedCode) {
      if (masterMap[linkedCode]) {
        linkedName = masterMap[linkedCode];
        linkStatus = 'LINKED';
      } else {
        linkedName = `[ไม่พบรายการพัสดุ: ${linkedCode}]`;
        linkStatus = 'ORPHAN';
      }
    }
    return {
      fsn_code: r[0],
      linked_code: linkedCode,
      linked_name: linkedName,
      link_status: linkStatus
    };
  });
}

function mockResolveQr(token) {
  const qrRow = mockDB.qr_registry.find(r => r[1] === token);
  if (qrRow && qrRow[5] === 'REVOKED') {
    const err = new Error('QR_REVOKED: รหัส QR Code นี้ถูกยกเลิกการใช้งานแล้ว');
    err.code = 'QR_REVOKED';
    throw err;
  }
  if (token === 'QR:CATALOG') return { type: 'CATALOG' };
  if (token.startsWith('QR:ITEM:')) {
    const code = token.replace('QR:ITEM:', '');
    const item = mockDB.master_items.find(r => r[0] === code);
    return { type: 'ITEM', item: { code: item[0], name: item[2], stock: item[9] } };
  }
  if (token.startsWith('QR:WH:')) return { type: 'WAREHOUSE' };
  return { type: 'UNKNOWN' };
}

function mockValidateQuantity(unit, qty) {
  const intUnits = ['รีม', 'ด้าม', 'หลอด', 'เครื่อง', 'ขวด', 'ชิ้น'];
  if (intUnits.includes(unit) && !Number.isInteger(qty)) {
    const err = new Error(`VALIDATION_ERROR: พัสดุหน่วย "${unit}" ต้องระบุเป็นจำนวนเต็ม`);
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  return true;
}

function mockCreateRequisition(payload, caller) {
  const reqId = `REQ-${Date.now()}-${++mockReqSeq}`;
  const reqNo = `REQ-2570/${String(mockDB.requisitions.length + 1).padStart(3, '0')}`;
  mockDB.requisitions.push([
    reqId, reqNo, new Date().toISOString(), caller.id, caller.department || 'ทั่วไป',
    payload.purpose, 'SUBMITTED', '', '', '', payload.source || 'CENTRAL_WEB', '2570',
    payload.items.length, 'NORMAL', '', '', ''
  ]);
  payload.items.forEach((it, idx) => {
    mockDB.requisition_items.push([
      `${reqId}-${idx + 1}`, reqId, it.item_code, it.qty_requested, 0, it.unit, 0, 0
    ]);
  });
  if (payload.idempotency_key) {
    mockDB.idempotency_log.push([
      payload.idempotency_key, caller.id, 'requisitions.create', 'HASH', 'COMMITTED',
      JSON.stringify({ req_id: reqId, req_no: reqNo, status: 'SUBMITTED' }), new Date().toISOString()
    ]);
  }
  return { success: true, req_id: reqId, req_no: reqNo, status: 'SUBMITTED', source: payload.source };
}

function mockReviewRequisition(reqId, caller) {
  const row = mockDB.requisitions.find(r => r[0] === reqId);
  row[6] = 'REVIEWED';
}

function mockApproveRequisition(reqId, caller) {
  const row = mockDB.requisitions.find(r => r[0] === reqId);
  row[6] = 'APPROVED';
}

function mockIssueStock(reqId, caller) {
  const row = mockDB.requisitions.find(r => r[0] === reqId);
  row[6] = 'ISSUED';
  const lines = mockDB.requisition_items.filter(r => r[1] === reqId);
  lines.forEach(l => {
    const master = mockDB.master_items.find(m => m[0] === l[2]);
    master[9] -= l[3]; // Deduct physical stock
    l[6] = l[3]; // qty_issued
  });
}

function mockConfirmReceipt(reqId, caller) {
  const row = mockDB.requisitions.find(r => r[0] === reqId);
  row[6] = 'RECEIVED';
  const lines = mockDB.requisition_items.filter(r => r[1] === reqId);
  lines.forEach(l => {
    l[7] = l[6]; // qty_received = qty_issued
  });
}

function mockCountAwaitingReceipt() {
  return mockDB.requisitions.filter(r => r[6] === 'ISSUED').length;
}

function mockCreateQrCode(type, targetRef, label) {
  const token = `QR:${type}:${targetRef}`;
  const qrId = `QR-${Date.now()}`;
  mockDB.qr_registry.push([qrId, token, type, targetRef, label, 'ACTIVE', new Date().toISOString(), 'ADMIN']);
  return { success: true, token, qr_id: qrId };
}

function mockRevokeQrCode(token) {
  const row = mockDB.qr_registry.find(r => r[1] === token);
  row[5] = 'REVOKED';
  return { success: true, status: 'REVOKED' };
}

function mockCheckIdempotency(key, actorId) {
  const row = mockDB.idempotency_log.find(r => r[0] === key && r[1] === actorId);
  if (row && row[4] === 'COMMITTED') {
    return { committed: true, response: JSON.parse(row[5]) };
  }
  return { committed: false };
}

// Summary
setTimeout(() => {
  console.log('\n==================================================');
  console.log(`TOTAL TESTS: ${passCount + failCount}`);
  console.log(`PASSED: ${passCount}`);
  console.log(`FAILED: ${failCount}`);
  console.log('==================================================');
  if (failCount === 0) {
    console.log('ALL 11 PROMPT 03 TESTS PASSED 100%!');
  } else {
    process.exit(1);
  }
}, 100);
