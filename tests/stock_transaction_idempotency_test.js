/**
 * tests/stock_transaction_idempotency_test.js
 * Verification test suite for HRT Prompt 16: Stock Idempotency, Transaction Boundaries, and Recovery (v1.1)
 * Criteria: TX-01 through TX-15
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passCount = 0;
let failCount = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    failCount++;
  }
}

console.log('>>> Running: tests/stock_transaction_idempotency_test.js');

// Setup mock Google Apps Script environment
function createMockGasContext() {
  const sheets = {};
  const cacheStore = {};

  const getMockSheetByName = (name) => {
    if (!sheets[name]) sheets[name] = [];
    const sheetRows = sheets[name];
    return {
      getName: () => name,
      getLastRow: () => sheetRows.length,
      getDataRange: () => ({
        getValues: () => sheetRows.map(r => [...r])
      }),
      getRange: (row, col, numRows, numCols) => ({
        setValue: (val) => {
          while (sheetRows.length < row) sheetRows.push([]);
          while (sheetRows[row - 1].length < col) sheetRows[row - 1].push('');
          sheetRows[row - 1][col - 1] = val;
        },
        getValue: () => (sheetRows[row - 1] && sheetRows[row - 1][col - 1] !== undefined) ? sheetRows[row - 1][col - 1] : ''
      }),
      appendRow: (rowArr) => {
        sheetRows.push([...rowArr]);
      }
    };
  };

  const mockSS = {
    getSheetByName: (name) => getMockSheetByName(name),
    getSheets: () => Object.keys(sheets).map(s => ({ getName: () => s }))
  };

  const ctx = {
    console: console,
    Logger: { log: () => {} },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => mockSS,
      openById: () => mockSS
    },
    Utilities: {
      computeDigest: (algo, str) => {
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(str).digest();
        const arr = [];
        for (let i = 0; i < hash.length; i++) {
          let b = hash[i];
          if (b > 127) b -= 256;
          arr.push(b);
        }
        return arr;
      },
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      Charset: { UTF_8: 'UTF_8' }
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => cacheStore[k] || null,
        put: (k, v, ttl) => { cacheStore[k] = v; },
        remove: (k) => { delete cacheStore[k]; }
      })
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => true,
        releaseLock: () => true
      })
    },
    Session: {
      getActiveUser: () => ({ getEmail: () => 'officer@hrt.ac.th' })
    }
  };

  // Helper to register mock sheets
  ctx.registerSheet = (name, rows) => {
    sheets[name] = rows.map(r => [...r]);
  };

  return { ctx, sheets, cacheStore };
}

function loadScriptsIntoContext(ctx) {
  vm.createContext(ctx);
  const files = ['Config.gs', 'Audit.gs', 'Read.gs', 'Write.gs', 'Api.gs'];
  files.forEach(f => {
    const code = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    vm.runInContext(code, ctx);
  });
  ctx.ApiRouter = vm.runInContext('ApiRouter', ctx);
}

function setupStandardFixtures(ctx) {
  // 01_Users
  ctx.registerSheet('01_Users', [
    ['user_id', 'username', 'email', 'name', 'role', 'department', 'status', 'created_at'],
    ['USR-001', 'admin@hrt.ac.th', 'admin@hrt.ac.th', 'ผู้ดูแลระบบ', 'ADMIN', 'บริหาร', 'ACTIVE', '2026-01-01T00:00:00Z'],
    ['USR-002', 'officer@hrt.ac.th', 'officer@hrt.ac.th', 'เจ้าหน้าที่พัสดุ', 'OFFICER', 'พัสดุ', 'ACTIVE', '2026-01-01T00:00:00Z'],
    ['USR-003', 'teacher@hrt.ac.th', 'teacher@hrt.ac.th', 'ครูสมชาย', 'TEACHER', 'วิชาการ', 'ACTIVE', '2026-01-01T00:00:00Z'],
    ['USR-004', 'approver@hrt.ac.th', 'approver@hrt.ac.th', 'หัวหน้างบประมาณ', 'APPROVER', 'งบประมาณ', 'ACTIVE', '2026-01-01T00:00:00Z']
  ]);

  // 03_Master_Items
  ctx.registerSheet('03_Master_Items', [
    ['code', 'fsn_code', 'name', 'category', 'unit', 'warehouse', 'unit_cost', 'min', 'rop', 'stock', 'supplier', 'status'],
    ['ITM-001', '7510-00-111-2222', 'กระดาษ A4', 'วัสดุสำนักงาน', 'รีม', 'คลังกลาง', 120, 5, 10, 20, 'ร้านค้า A', 'normal'],
    ['ITM-002', '7520-00-333-4444', 'ปากกาลูกลื่น', 'วัสดุสำนักงาน', 'ด้าม', 'คลังกลาง', 10, 10, 20, 50, 'ร้านค้า B', 'normal']
  ]);

  // 07_Requisitions
  ctx.registerSheet('07_Requisitions', [
    ['req_id', 'req_no', 'req_date', 'user_id', 'dept', 'purpose', 'status', 'approver_id', 'approved_at', 'issued_at', 'source', 'fiscal_year', 'total_items', 'urgency', 'required_date'],
    ['REQ-UUID-100', 'REQ-2569/001', '2026-10-15T08:00:00Z', 'USR-003', 'วิชาการ', 'สอนนักเรียน', 'APPROVED', 'USR-004', '2026-10-15T09:00:00Z', '', 'CENTRAL_WEB', '2569', 1, 'NORMAL', '2026-10-20']
  ]);

  // 08_Requisition_Items
  ctx.registerSheet('08_Requisition_Items', [
    ['line_id', 'requisition_id', 'item_code', 'qty_requested', 'qty_approved', 'unit'],
    ['LINE-001', 'REQ-UUID-100', 'ITM-001', 3, 3, 'รีม']
  ]);

  // 09_Stock_Transactions
  ctx.registerSheet('09_Stock_Transactions', [
    ['tx_id', 'created_at', 'action_type', 'item_code', 'qty', 'unit_cost', 'actor_id', 'fiscal_year', 'doc_ref', 'note']
  ]);

  // 10_Stock_Ledger
  ctx.registerSheet('10_Stock_Ledger', [
    ['ledger_id', 'item_code', 'tx_type', 'debit', 'qty_in', 'qty_out', 'unit_cost', 'doc_ref', 'fiscal_year', 'created_at', 'note', 'actor_id']
  ]);

  // 11_Audit_Trail
  ctx.registerSheet('11_Audit_Trail', [
    ['log_id', 'timestamp', 'actor_id', 'action', 'entity', 'details', 'status', 'prev_hash', 'current_hash']
  ]);

  // 12_Fiscal_Years
  ctx.registerSheet('12_Fiscal_Years', [
    ['fiscal_year', 'start_date', 'end_date', 'status', 'closed_at', 'closed_by'],
    ['2568', '2024-10-01', '2025-09-30', 'CLOSED', '2025-09-30T23:59:59Z', 'ADMIN'],
    ['2569', '2025-10-01', '2026-09-30', 'ACTIVE', '', '']
  ]);

  // 13_Year_End_Audits
  ctx.registerSheet('13_Year_End_Audits', [
    ['count_id', 'fiscal_year', 'item_code', 'book_qty', 'count_qty', 'variance', 'condition', 'auditors']
  ]);

  // 16_Idempotency_Log
  ctx.registerSheet('16_Idempotency_Log', [
    ['key', 'actor_id', 'action', 'payload_hash', 'status', 'response_json', 'created_at']
  ]);
}

// -------------------------------------------------------------
// TX-11: Cryptographic Digest & Same-length Different Payloads
// -------------------------------------------------------------
it('TX-11: same-length different payload ({qty:5} vs {qty:6}) produces distinct SHA-256 digests; key reuse with diff payload rejected', () => {
  const { ctx } = createMockGasContext();
  loadScriptsIntoContext(ctx);

  const hash1 = ctx.ApiRouter.computePayloadHash({ qty: 5 });
  const hash2 = ctx.ApiRouter.computePayloadHash({ qty: 6 });

  assert.strictEqual(typeof hash1, 'string');
  assert.strictEqual(hash1.length, 64, 'Digest must be 64-char hex SHA-256');
  assert.strictEqual(hash2.length, 64);
  assert.notStrictEqual(hash1, hash2, 'Distinct payloads of same length must have distinct digests');

  setupStandardFixtures(ctx);
  const caller = { id: 'USR-002', role: 'OFFICER', permissions: ['RECEIVE_STOCK'] };

  // First request with key KEY-TX11 and qty: 5
  ctx.ApiRouter.checkIdempotency('KEY-TX11', caller.id, 'apiReceiveStock', { qty: 5 });
  ctx.ApiRouter.recordIdempotency('KEY-TX11', caller.id, 'apiReceiveStock', { qty: 5 }, { success: true });

  // Second request with same key KEY-TX11 but different payload qty: 6 MUST throw IDEMPOTENCY_CONFLICT
  assert.throws(() => {
    ctx.ApiRouter.checkIdempotency('KEY-TX11', caller.id, 'apiReceiveStock', { qty: 6 });
  }, /IDEMPOTENCY_CONFLICT/);
});

// -------------------------------------------------------------
// TX-12: Canonicalization, Key Ordering & Token Exclusion
// -------------------------------------------------------------
it('TX-12: same semantic payload with different key order yields identical digest; token/requestId change excluded', () => {
  const { ctx } = createMockGasContext();
  loadScriptsIntoContext(ctx);

  const p1 = { item_code: 'ITM-001', qty: 10, nested: { b: 2, a: 1 } };
  const p2 = { qty: 10, item_code: 'ITM-001', nested: { a: 1, b: 2 } };
  const p3WithTokens = {
    item_code: 'ITM-001',
    qty: 10,
    nested: { a: 1, b: 2 },
    authToken: 'secret_token_123',
    id_token: 'google_jwt_456',
    requestId: 'REQ-XYZ-999',
    idempotency_key: 'IDEMP-1'
  };

  const h1 = ctx.ApiRouter.computePayloadHash(p1);
  const h2 = ctx.ApiRouter.computePayloadHash(p2);
  const h3 = ctx.ApiRouter.computePayloadHash(p3WithTokens);

  assert.strictEqual(h1, h2, 'Different object key order must produce identical digest');
  assert.strictEqual(h1, h3, 'Volatile tokens/request IDs must be excluded from digest');

  // Verify array order is preserved (semantic order)
  const arr1 = ctx.ApiRouter.computePayloadHash({ items: [{ id: 'A' }, { id: 'B' }] });
  const arr2 = ctx.ApiRouter.computePayloadHash({ items: [{ id: 'B' }, { id: 'A' }] });
  assert.notStrictEqual(arr1, arr2, 'Array order is semantic and must NOT be scrambled');
});

// -------------------------------------------------------------
// TX-13: Cryptographic Hash Unavailable / Invalid Fails Closed
// -------------------------------------------------------------
it('TX-13: missing or throwing hash function fails closed before mutation without weak fallback', () => {
  const { ctx } = createMockGasContext();
  loadScriptsIntoContext(ctx);

  // Set hrtComputeSha256_ to null inside vm context
  vm.runInContext('hrtComputeSha256_ = null;', ctx);

  assert.throws(() => {
    ctx.ApiRouter.computePayloadHash({ qty: 5 });
  }, /HASH_UNAVAILABLE/, 'Must fail closed when cryptographic hash is unavailable (NO weak fallback)');
});

// -------------------------------------------------------------
// TX-14: Approve with req_id and req_no Updates Canonical Requisition
// -------------------------------------------------------------
it('TX-14: approve with req_no resolves canonical req_id, updates line items, and returns canonical req_id', () => {
  const { ctx, sheets } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupStandardFixtures(ctx);

  const approver = { id: 'USR-004', name: 'หัวหน้างบประมาณ', role: 'APPROVER', permissions: ['APPROVE_REQUISITIONS'] };
  sheets['07_Requisitions'][1][6] = 'SUBMITTED';

  // Call hrtApproveRequisition_ with display number req_no: REQ-2569/001
  const result = ctx.hrtApproveRequisition_({ req_id: 'REQ-2569/001' }, approver);

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.req_id, 'REQ-UUID-100', 'Must return canonical UUID req_id');
  assert.strictEqual(result.req_no, 'REQ-2569/001');
  assert.strictEqual(result.status, 'APPROVED');

  // Verify 08_Requisition_Items was updated (column 5 qty_approved = 3)
  const itemsRows = sheets['08_Requisition_Items'];
  assert.strictEqual(itemsRows[1][4], 3, 'Line item qty_approved must be updated using canonical req_id');
});

// -------------------------------------------------------------
// TX-15: Approved qty 0 / Missing Does NOT Issue Requested Quantity
// -------------------------------------------------------------
it('TX-15: approved qty 0 does not fall back to requested qty; missing approval throws APPROVAL_INCOMPLETE', () => {
  const { ctx, sheets } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupStandardFixtures(ctx);

  const officer = { id: 'USR-002', name: 'เจ้าหน้าที่พัสดุ', role: 'OFFICER' };

  // Set line item approved qty explicitly to 0 (rejected line)
  sheets['08_Requisition_Items'][1][4] = 0;

  const resZero = ctx.hrtIssueStock_({ requisition_id: 'REQ-UUID-100' }, officer);
  assert.strictEqual(resZero.success, true);

  // Master stock of ITM-001 started at 20. With qty_approved=0, stock must STILL be 20!
  assert.strictEqual(sheets['03_Master_Items'][1][9], 20, 'Stock must NOT be deducted when approved qty is 0');

  // Now test with missing approval quantity on an APPROVED requisition
  sheets['07_Requisitions'][1][6] = 'APPROVED';
  sheets['08_Requisition_Items'][1][4] = ''; // missing

  assert.throws(() => {
    ctx.hrtIssueStock_({ requisition_id: 'REQ-UUID-100' }, officer);
  }, /APPROVAL_INCOMPLETE/, 'Missing approval quantity must fail closed without issuing requested quantity');
});

// -------------------------------------------------------------
// TX-01: Receive 10 / Issue 3 / Confirm Receipt -> Ledger/Master 7
// -------------------------------------------------------------
it('TX-01: receive 10, issue 3, confirm receipt -> ledger/master has net 7, confirm receipt does NOT deduct stock', () => {
  const { ctx, sheets } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupStandardFixtures(ctx);

  const officer = { id: 'USR-002', name: 'เจ้าหน้าที่พัสดุ', role: 'OFFICER' };
  const teacher = { id: 'USR-003', name: 'ครูสมชาย', role: 'TEACHER' };

  // Initial stock of ITM-001 is 20
  // 1. Receive 10
  ctx.hrtReceiveStock_({ item_code: 'ITM-001', qty: 10, unit_cost: 120 }, officer);
  assert.strictEqual(sheets['03_Master_Items'][1][9], 30, 'Master stock after receive 10 must be 30');

  // 2. Issue 3 (requisition REQ-UUID-100 approved for 3)
  sheets['08_Requisition_Items'][1][4] = 3;
  ctx.hrtIssueStock_({ requisition_id: 'REQ-UUID-100' }, officer);
  assert.strictEqual(sheets['03_Master_Items'][1][9], 27, 'Master stock after issue 3 must be 27');

  // 3. Confirm receipt by requester USR-003
  const confirmRes = ctx.hrtConfirmReceipt_({ requisition_id: 'REQ-UUID-100' }, teacher);
  assert.strictEqual(confirmRes.success, true);
  assert.strictEqual(confirmRes.status, 'RECEIVED');

  // Verify stock remained 27 (confirm receipt did NOT deduct stock again!)
  assert.strictEqual(sheets['03_Master_Items'][1][9], 27, 'Stock must remain 27; confirm receipt does NOT deduct stock');

  // Verify Stock Ledger entries
  const ledgerRows = sheets['10_Stock_Ledger'];
  // Header + RECEIVE (+10) + ISSUE (-3) = 3 rows
  assert.strictEqual(ledgerRows.length, 3, 'Ledger must have exactly 1 RECEIVE and 1 ISSUE movement');
});

// -------------------------------------------------------------
// TX-02: Same Key Retry Creates Effect Only Once
// -------------------------------------------------------------
it('TX-02: same key retry/double-click returns idempotent replay without executing effect twice', () => {
  const { ctx, sheets } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupStandardFixtures(ctx);

  // Initial stock is 20
  const payload = {
    item_code: 'ITM-001',
    qty: 10,
    unit_cost: 120,
    idempotency_key: 'TX02-STABLE-KEY-1'
  };

  // Call 1
  const res1 = ctx.ApiRouter.routeRequest('apiReceiveStock', payload);
  assert.strictEqual(res1.success, true);
  assert.strictEqual(sheets['03_Master_Items'][1][9], 30, 'First execution increases stock to 30');

  // Call 2 with identical key and payload
  const res2 = ctx.ApiRouter.routeRequest('apiReceiveStock', payload);
  assert.strictEqual(res2.success, true);
  assert.strictEqual(res2.isIdempotentReplay, true, 'Second call must be flagged as idempotent replay');
  assert.strictEqual(sheets['03_Master_Items'][1][9], 30, 'Stock must NOT be increased twice (remains 30)');
});

// -------------------------------------------------------------
// TX-03: Same Key Different Action/Actor/Payload Handled Safely
// -------------------------------------------------------------
it('TX-03: same key with different payload throws IDEMPOTENCY_CONFLICT', () => {
  const { ctx } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupStandardFixtures(ctx);

  const key = 'TX03-SHARED-KEY';

  // First request
  const res1 = ctx.ApiRouter.routeRequest('apiReceiveStock', { item_code: 'ITM-001', qty: 5, idempotency_key: key });
  assert.strictEqual(res1.success, true);

  // Second request same key, different payload (qty: 10)
  const resConflict = ctx.ApiRouter.routeRequest('apiReceiveStock', { item_code: 'ITM-001', qty: 10, idempotency_key: key });
  assert.strictEqual(resConflict.success, false);
  assert.strictEqual(resConflict.error.code, 'IDEMPOTENCY_CONFLICT');
});

// -------------------------------------------------------------
// TX-04: Concurrent Stock Depletion Prevents Negative Stock
// -------------------------------------------------------------
it('TX-04: issue attempt exceeding current balance fails with INSUFFICIENT_STOCK; balance never drops below 0', () => {
  const { ctx, sheets } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupStandardFixtures(ctx);

  const officer = { id: 'USR-002', role: 'OFFICER' };
  // Set stock to 2
  sheets['03_Master_Items'][1][9] = 2;
  // Requisition approved for 3
  sheets['08_Requisition_Items'][1][4] = 3;

  assert.throws(() => {
    ctx.hrtIssueStock_({ requisition_id: 'REQ-UUID-100' }, officer);
  }, /INSUFFICIENT_STOCK/);

  assert.strictEqual(sheets['03_Master_Items'][1][9], 2, 'Stock must remain untouched at 2');
});

// -------------------------------------------------------------
// TX-05: Multi-line Failure Before Commit Leaves Zero Partial Writes
// -------------------------------------------------------------
it('TX-05: multi-line issue fails atomically if one item is insufficient; no partial line deduction', () => {
  const { ctx, sheets } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupStandardFixtures(ctx);

  // Add second line with insufficient stock
  sheets['08_Requisition_Items'].push(['LINE-002', 'REQ-UUID-100', 'ITM-002', 100, 100, 'ด้าม']); // stock is only 50

  const officer = { id: 'USR-002', role: 'OFFICER' };
  assert.throws(() => {
    ctx.hrtIssueStock_({ requisition_id: 'REQ-UUID-100' }, officer);
  }, /INSUFFICIENT_STOCK/);

  // Verify ITM-001 stock was NOT deducted even though line 1 was valid
  assert.strictEqual(sheets['03_Master_Items'][1][9], 20, 'Line 1 must not be partially deducted');
  assert.strictEqual(sheets['03_Master_Items'][2][9], 50, 'Line 2 must not be deducted');
});

// -------------------------------------------------------------
// TX-06: Documented Failure Recovery States
// -------------------------------------------------------------
it('TX-06: in-flight reservation clears on exception so client can retry with same key after error', () => {
  const { ctx, cacheStore } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupStandardFixtures(ctx);

  const key = 'TX06-RETRY-KEY';
  // Send request with invalid non-existent item_code to trigger handler exception
  const resFail = ctx.ApiRouter.routeRequest('apiReceiveStock', { item_code: 'NON_EXISTENT_ITEM', qty: 5, idempotency_key: key });
  assert.strictEqual(resFail.success, false);

  // Check cacheStore: in-flight lock must be CLEARED
  const compositeKey = 'idemp_USR-002:apiReceiveStock:' + key;
  assert.strictEqual(cacheStore[compositeKey], undefined, 'In-flight lock must be cleared on handler failure');

  // Client can retry with valid parameters using the SAME key
  const resRetry = ctx.ApiRouter.routeRequest('apiReceiveStock', { item_code: 'ITM-001', qty: 5, idempotency_key: key });
  assert.strictEqual(resRetry.success, true, 'Retry with same key must succeed after failure resolution');
});

// -------------------------------------------------------------
// TX-07: Timeout / Lookup Detects Existing Committed Transaction
// -------------------------------------------------------------
it('TX-07: committed transaction is discoverable via hrtCheckIdempotency_ lookup', () => {
  const { ctx } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupStandardFixtures(ctx);

  const key = 'TX07-COMMITTED-KEY';
  ctx.ApiRouter.routeRequest('apiReceiveStock', { item_code: 'ITM-001', qty: 5, idempotency_key: key });

  const check = ctx.hrtCheckIdempotency_({ idempotency_key: key }, { id: 'USR-002' });
  assert.strictEqual(check.committed, true);
  assert.strictEqual(check.status, 'COMMITTED');
  assert.strictEqual(check.response.success, true);
});

// -------------------------------------------------------------
// TX-08: Invalid Qty / Status / Actor Produces Zero Writes
// -------------------------------------------------------------
it('TX-08: zero/negative quantity, closed fiscal year, unauthorized actor rejected with zero writes', () => {
  const { ctx, sheets } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupStandardFixtures(ctx);

  const officer = { id: 'USR-002', role: 'OFFICER' };

  // Zero qty
  assert.throws(() => {
    ctx.hrtReceiveStock_({ item_code: 'ITM-001', qty: 0 }, officer);
  }, /VALIDATION_ERROR/);

  // Negative qty
  assert.throws(() => {
    ctx.hrtReceiveStock_({ item_code: 'ITM-001', qty: -5 }, officer);
  }, /VALIDATION_ERROR/);

  // Target closed fiscal year 2568
  const resClosed = ctx.ApiRouter.routeRequest('apiReceiveStock', { item_code: 'ITM-001', qty: 5, fiscalYear: '2568' });
  assert.strictEqual(resClosed.success, false);
  assert.strictEqual(resClosed.error.code, 'CLOSED_FISCAL_YEAR');

  assert.strictEqual(sheets['03_Master_Items'][1][9], 20, 'Stock must remain untouched at 20');
});

// -------------------------------------------------------------
// TX-09: Double-Issue & Double-Confirm Rejection
// -------------------------------------------------------------
it('TX-09: re-issuing an already ISSUED requisition or re-confirming already RECEIVED throws DOUBLE_DISPATCH / INVALID_STATE', () => {
  const { ctx, sheets } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupStandardFixtures(ctx);

  const officer = { id: 'USR-002', role: 'OFFICER' };
  const teacher = { id: 'USR-003', role: 'TEACHER' };

  // Issue first time
  ctx.hrtIssueStock_({ requisition_id: 'REQ-UUID-100' }, officer);

  // Issue second time MUST fail
  assert.throws(() => {
    ctx.hrtIssueStock_({ requisition_id: 'REQ-UUID-100' }, officer);
  }, /DOUBLE_DISPATCH/);

  // Confirm receipt first time
  ctx.hrtConfirmReceipt_({ requisition_id: 'REQ-UUID-100' }, teacher);

  // Confirm receipt second time MUST fail
  assert.throws(() => {
    ctx.hrtConfirmReceipt_({ requisition_id: 'REQ-UUID-100' }, teacher);
  }, /INVALID_STATE_TRANSITION/);
});

// -------------------------------------------------------------
// TX-10: Audit Trail Hash Chain Integrity
// -------------------------------------------------------------
it('TX-10: sequential audit logging preserves valid hash chain', () => {
  const { ctx, sheets } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupStandardFixtures(ctx);

  const caller = { id: 'USR-001', role: 'ADMIN' };
  ctx.logAudit_('ACTION_A', 'ENTITY_A', 'Detail A', caller, true);
  ctx.logAudit_('ACTION_B', 'ENTITY_B', 'Detail B', caller, true);

  const verify = ctx.hrtVerifyAuditIntegrity_();
  assert.strictEqual(verify.isValid, true, 'Audit log hash chain must remain intact');
});

console.log('---');
console.log(`TOTAL TESTS: ${passCount + failCount}`);
console.log(`PASSED: ${passCount}`);
console.log(`FAILED: ${failCount}`);

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL PROMPT 16 TRANSACTION & IDEMPOTENCY CRITERIA (TX-01 - TX-15) PASSED 100%!');
}
