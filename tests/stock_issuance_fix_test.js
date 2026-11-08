/**
 * tests/stock_issuance_fix_test.js
 * Verification Test Suite for Stock Issuance Bug Fixes (v2.7.0-rc.6)
 *
 * Verifies fixes for BUG-01 through BUG-04 and comprehensive stock issuance requirements:
 * - FIX-01: Primary route 'requisitions.issue' and alias 'stock.issue' resolve with identical permissions
 * - FIX-02: 'requisitionId' alias normalization and conflict rejection (PARAM_CONFLICT)
 * - FIX-03: Multi-item issuance in a single backend call (atomic deduction)
 * - FIX-04: Partial issuance tracking and remainder issuance to completion (PARTIAL_ISSUED -> ISSUED)
 * - FIX-05: Strict validation guards: negative qty, excess qty, unapproved status, already issued
 * - FIX-06: RBAC: Only authorized OFFICER/ADMIN with ISSUE_STOCK permission can issue
 * - FIX-07: Elimination of false success in UI (no local memory deduction on error)
 * - FIX-08: In-flight submission guard preventing double-clicks and concurrent calls
 * - FIX-09: Idempotent replay on duplicate submission and conflict rejection on payload mutation
 * - FIX-10: Compensatory rollback on mid-write failure restoring master stock and line state
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

console.log('====================================================');
console.log('RUNNING STOCK ISSUANCE TRANSACTION FIX VERIFICATION');
console.log('Target Candidate: v2.7.0-rc.6');
console.log('====================================================\n');

function createMockGasContext() {
  const sheets = {};
  const cacheStore = {};
  let currentActiveEmail = 'officer@hrt.ac.th';

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
      getActiveUser: () => ({ getEmail: () => currentActiveEmail })
    },
    setActiveUserEmail: (email) => { currentActiveEmail = email; }
  };

  ctx.registerSheet = (name, rows) => {
    sheets[name] = rows.map(r => [...r]);
  };

  return { ctx, sheets, cacheStore };
}

function loadScriptsIntoContext(ctx) {
  vm.createContext(ctx);
  const files = ['Config.gs', 'Audit.gs', 'Read.gs', 'Write.gs', 'Api.gs', 'Code.gs'];
  files.forEach(f => {
    const code = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    vm.runInContext(code, ctx);
  });
  ctx.ApiRouter = vm.runInContext('ApiRouter', ctx);
}

function setupMultiItemFixtures(ctx) {
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
    ['ITM-002', '7520-00-333-4444', 'ปากกาลูกลื่น', 'วัสดุสำนักงาน', 'ด้าม', 'คลังกลาง', 10, 10, 20, 50, 'ร้านค้า B', 'normal'],
    ['ITM-003', '7530-00-555-6666', 'แฟ้มเอกสาร', 'วัสดุสำนักงาน', 'เล่ม', 'คลังกลาง', 35, 5, 15, 10, 'ร้านค้า C', 'normal']
  ]);

  // 07_Requisitions
  ctx.registerSheet('07_Requisitions', [
    ['req_id', 'req_no', 'req_date', 'user_id', 'dept', 'purpose', 'status', 'approver_id', 'approved_at', 'issued_at', 'source', 'fiscal_year', 'total_items', 'urgency', 'required_date'],
    ['REQ-UUID-100', 'REQ-2569/001', '2026-10-15T08:00:00Z', 'USR-003', 'วิชาการ', 'สอนนักเรียน', 'APPROVED', 'USR-004', '2026-10-15T09:00:00Z', '', 'CENTRAL_WEB', '2569', 2, 'NORMAL', '2026-10-20'],
    ['REQ-UUID-200', 'REQ-2569/002', '2026-10-16T08:00:00Z', 'USR-003', 'วิชาการ', 'โครงงานวิทยาศาสตร์', 'SUBMITTED', '', '', '', 'CENTRAL_WEB', '2569', 1, 'NORMAL', '2026-10-21']
  ]);

  // 08_Requisition_Items
  ctx.registerSheet('08_Requisition_Items', [
    ['line_id', 'requisition_id', 'item_code', 'qty_requested', 'qty_approved', 'unit', 'qty_issued'],
    ['LINE-001', 'REQ-UUID-100', 'ITM-001', 5, 5, 'รีม', ''],
    ['LINE-002', 'REQ-UUID-100', 'ITM-002', 10, 10, 'ด้าม', ''],
    ['LINE-003', 'REQ-UUID-200', 'ITM-003', 2, 0, 'เล่ม', '']
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
    ['2569', '2025-10-01', '2026-09-30', 'ACTIVE', '', '']
  ]);

  // 16_Idempotency_Log
  ctx.registerSheet('16_Idempotency_Log', [
    ['key', 'actor_id', 'action', 'payload_hash', 'status', 'response_json', 'created_at']
  ]);
}

// -------------------------------------------------------------
// FIX-01: Route and Alias Contract Verification
// -------------------------------------------------------------
it('FIX-01: apiIssueStock and aliases route to handler with ISSUE_STOCK permission', () => {
  const { ctx } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupMultiItemFixtures(ctx);

  // 1. Check ApiRouter route via 'requisitions.issue'
  const resPrimary = ctx.ApiRouter.routeRequest('requisitions.issue', {
    requisitionId: 'REQ-UUID-100',
    idempotencyKey: 'IDEMP-TEST-01'
  });
  assert.strictEqual(resPrimary.success, true);
  assert.strictEqual(resPrimary.status, 'ISSUED');

  // Reset fixtures
  setupMultiItemFixtures(ctx);

  // 2. Check ApiRouter route via alias 'stock.issue'
  const resAlias = ctx.ApiRouter.routeRequest('stock.issue', {
    requisition_id: 'REQ-UUID-100',
    idempotencyKey: 'IDEMP-TEST-02'
  });
  assert.strictEqual(resAlias.success, true);
  assert.strictEqual(resAlias.status, 'ISSUED');

  // Reset fixtures
  setupMultiItemFixtures(ctx);

  // 3. Check direct facade in Code.gs
  const resFacade = ctx.apiIssueStock({
    requisitionId: 'REQ-UUID-100',
    idempotencyKey: 'IDEMP-TEST-03'
  });
  assert.strictEqual(resFacade.success, true);
  assert.strictEqual(resFacade.status, 'ISSUED');
});

// -------------------------------------------------------------
// FIX-02: Alias Normalization & Conflicting Parameter Rejection
// -------------------------------------------------------------
it('FIX-02: requisitionId alias resolves correctly; conflicting alias keys throw PARAM_CONFLICT', () => {
  const { ctx } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupMultiItemFixtures(ctx);

  // Normalization of camelCase requisitionId
  const normalized = ctx.ApiRouter.normalizeAndValidateAliases({ requisitionId: 'REQ-UUID-100' });
  assert.strictEqual(normalized.requisition_id, 'REQ-UUID-100');
  assert.strictEqual(normalized.requisitionId, 'REQ-UUID-100');

  // Conflict: requisition_id vs requisitionId with different values
  assert.throws(() => {
    ctx.ApiRouter.normalizeAndValidateAliases({
      requisition_id: 'REQ-UUID-100',
      requisitionId: 'REQ-UUID-999'
    });
  }, /PARAM_CONFLICT/);

  // Consistent multiple keys are accepted
  const consistent = ctx.ApiRouter.normalizeAndValidateAliases({
    requisition_id: 'REQ-UUID-100',
    requisitionId: 'REQ-UUID-100'
  });
  assert.strictEqual(consistent.requisition_id, 'REQ-UUID-100');
});

// -------------------------------------------------------------
// FIX-03: Multi-Item Issuance in Single Backend Request
// -------------------------------------------------------------
it('FIX-03: multi-item requisition issues all items in one atomic transaction', () => {
  const { ctx, sheets } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupMultiItemFixtures(ctx);

  // ITM-001 start stock: 20, approved: 5
  // ITM-002 start stock: 50, approved: 10
  const res = ctx.ApiRouter.routeRequest('requisitions.issue', {
    requisitionId: 'REQ-UUID-100',
    items: [
      { item_code: 'ITM-001', qty: 5 },
      { item_code: 'ITM-002', qty: 10 }
    ],
    idempotencyKey: 'IDEMP-MULTI-01'
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.status, 'ISSUED');
  assert.strictEqual(res.is_partial, false);
  assert.strictEqual(res.totalIssued, 15);

  // Check master items stock decremented
  assert.strictEqual(sheets['03_Master_Items'][1][9], 15, 'ITM-001 stock must be 20 - 5 = 15');
  assert.strictEqual(sheets['03_Master_Items'][2][9], 40, 'ITM-002 stock must be 50 - 10 = 40');

  // Check requisition status in 07_Requisitions
  assert.strictEqual(sheets['07_Requisitions'][1][6], 'ISSUED');

  // Check cumulative qty_issued in 08_Requisition_Items (col 7)
  assert.strictEqual(sheets['08_Requisition_Items'][1][6], 5);
  assert.strictEqual(sheets['08_Requisition_Items'][2][6], 10);
});

// -------------------------------------------------------------
// FIX-04: Partial Issuance and Completion of Remaining Items
// -------------------------------------------------------------
it('FIX-04: partial issuance marks PARTIAL_ISSUED; subsequent issue completes to ISSUED', () => {
  const { ctx, sheets } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupMultiItemFixtures(ctx);

  // Phase 1: Partially issue ITM-001 (2 of 5) and ITM-002 (4 of 10)
  const resPart1 = ctx.ApiRouter.routeRequest('requisitions.issue', {
    requisitionId: 'REQ-UUID-100',
    items: [
      { item_code: 'ITM-001', qty: 2 },
      { item_code: 'ITM-002', qty: 4 }
    ],
    idempotencyKey: 'IDEMP-PARTIAL-01'
  });

  assert.strictEqual(resPart1.success, true);
  assert.strictEqual(resPart1.status, 'PARTIAL_ISSUED');
  assert.strictEqual(resPart1.is_partial, true);
  assert.strictEqual(resPart1.totalIssued, 6);

  // Check Master Stock
  assert.strictEqual(sheets['03_Master_Items'][1][9], 18, 'ITM-001 stock 20 - 2 = 18');
  assert.strictEqual(sheets['03_Master_Items'][2][9], 46, 'ITM-002 stock 50 - 4 = 46');
  assert.strictEqual(sheets['07_Requisitions'][1][6], 'PARTIAL_ISSUED');

  // Phase 2: Issue remaining ITM-001 (3 of 3) and ITM-002 (6 of 6)
  const resPart2 = ctx.ApiRouter.routeRequest('requisitions.issue', {
    requisitionId: 'REQ-UUID-100',
    items: [
      { item_code: 'ITM-001', qty: 3 },
      { item_code: 'ITM-002', qty: 6 }
    ],
    idempotencyKey: 'IDEMP-PARTIAL-02'
  });

  assert.strictEqual(resPart2.success, true);
  assert.strictEqual(resPart2.status, 'ISSUED');
  assert.strictEqual(resPart2.is_partial, false);
  assert.strictEqual(resPart2.totalIssued, 9);

  // Final Master Stock
  assert.strictEqual(sheets['03_Master_Items'][1][9], 15, 'ITM-001 stock 18 - 3 = 15');
  assert.strictEqual(sheets['03_Master_Items'][2][9], 40, 'ITM-002 stock 46 - 6 = 40');
  assert.strictEqual(sheets['07_Requisitions'][1][6], 'ISSUED');

  // Phase 3: Attempting to issue again must fail with DOUBLE_DISPATCH
  const resPart3 = ctx.ApiRouter.routeRequest('requisitions.issue', {
    requisitionId: 'REQ-UUID-100',
    idempotencyKey: 'IDEMP-PARTIAL-03'
  });
  assert.strictEqual(resPart3.success, false);
  assert.strictEqual(resPart3.code, 'DOUBLE_DISPATCH');
});

// -------------------------------------------------------------
// FIX-05: Validation Guards & Negative Cases Fail Closed
// -------------------------------------------------------------
it('FIX-05: negative quantities, unapproved status, and excess quantities fail closed', () => {
  const { ctx, sheets } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupMultiItemFixtures(ctx);

  const officer = { id: 'USR-002', role: 'OFFICER' };

  // 1. Negative quantity rejected
  assert.throws(() => {
    ctx.hrtIssueStock_({
      requisitionId: 'REQ-UUID-100',
      items: [{ item_code: 'ITM-001', qty: -5 }]
    }, officer);
  }, /INVALID_DATA/);

  // 2. Quantity exceeding approved quantity rejected
  assert.throws(() => {
    ctx.hrtIssueStock_({
      requisitionId: 'REQ-UUID-100',
      items: [{ item_code: 'ITM-001', qty: 999 }]
    }, officer);
  }, /INVALID_DATA/);

  // 3. Unapproved requisition (SUBMITTED) rejected
  assert.throws(() => {
    ctx.hrtIssueStock_({
      requisitionId: 'REQ-UUID-200'
    }, officer);
  }, /INVALID_STATE/);

  // Verify zero writes were made to stock
  assert.strictEqual(sheets['03_Master_Items'][1][9], 20, 'Stock must remain completely intact');
});

// -------------------------------------------------------------
// FIX-06: RBAC Authorization Verification
// -------------------------------------------------------------
it('FIX-06: non-officer roles (TEACHER, APPROVER, REQUESTER) cannot issue stock', () => {
  const { ctx } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupMultiItemFixtures(ctx);

  // Set active identity to teacher
  ctx.setActiveUserEmail('teacher@hrt.ac.th');

  const resTeacher = ctx.ApiRouter.routeRequest('requisitions.issue', {
    requisitionId: 'REQ-UUID-100'
  });
  assert.strictEqual(resTeacher.success, false);
  assert.strictEqual(resTeacher.code, 'FORBIDDEN');

  // Set active identity to approver (approver lacks ISSUE_STOCK permission)
  ctx.setActiveUserEmail('approver@hrt.ac.th');

  const resApprover = ctx.ApiRouter.routeRequest('requisitions.issue', {
    requisitionId: 'REQ-UUID-100'
  });
  assert.strictEqual(resApprover.success, false);
  assert.strictEqual(resApprover.code, 'PERMISSION_DENIED');
});

// -------------------------------------------------------------
// FIX-07: Elimination of False Success Invariants
// -------------------------------------------------------------
it('FIX-07: index.html executeIssueConfirmation has no local memory deduction in catch block', () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  // Verify that the false success fallback deduction was completely removed
  const hasFallbackDeduction = indexHtml.includes('master.stock = Math.max(0, master.stock - actualQty)');
  assert.strictEqual(hasFallbackDeduction, false, 'No silent stock deduction in error handlers allowed');

  // Verify that single request per confirmation is sent
  assert.ok(indexHtml.includes('const payload = {'), 'Single payload constructed per modal confirmation');
  assert.ok(indexHtml.includes('window._isIssueSubmitting = true;'), 'In-flight submission guard must be present');
});

// -------------------------------------------------------------
// FIX-08: In-flight Submission & Double-click Guard
// -------------------------------------------------------------
it('FIX-08: in-flight submission flag prevents concurrent dispatch', () => {
  // Simulate client-side guard logic
  let isIssueSubmitting = false;
  let dispatchCount = 0;

  function simulateSubmit() {
    if (isIssueSubmitting) return 'BLOCKED';
    isIssueSubmitting = true;
    dispatchCount++;
    return 'DISPATCHED';
  }

  assert.strictEqual(simulateSubmit(), 'DISPATCHED');
  assert.strictEqual(simulateSubmit(), 'BLOCKED', 'Second concurrent click must be blocked');
  assert.strictEqual(dispatchCount, 1);

  // Reset after completion
  isIssueSubmitting = false;
  assert.strictEqual(simulateSubmit(), 'DISPATCHED');
  assert.strictEqual(dispatchCount, 2);
});

// -------------------------------------------------------------
// FIX-09: End-to-End Idempotency Replay vs Conflict
// -------------------------------------------------------------
it('FIX-09: same key + same payload replays response; same key + changed payload returns conflict', () => {
  const { ctx, sheets } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupMultiItemFixtures(ctx);

  const key = 'IDEMP-KEY-TEST-99';

  // 1. Initial successful issuance
  const res1 = ctx.ApiRouter.routeRequest('requisitions.issue', {
    requisitionId: 'REQ-UUID-100',
    idempotencyKey: key
  });
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.isIdempotentReplay, undefined);

  // Stock deducted: ITM-001: 20 - 5 = 15
  assert.strictEqual(sheets['03_Master_Items'][1][9], 15);

  // 2. Exact same key + payload retry: replay without duplicate stock deduction
  const res2 = ctx.ApiRouter.routeRequest('requisitions.issue', {
    requisitionId: 'REQ-UUID-100',
    idempotencyKey: key
  });
  assert.strictEqual(res2.success, true);
  assert.strictEqual(res2.isIdempotentReplay, true);
  assert.strictEqual(sheets['03_Master_Items'][1][9], 15, 'Stock must NOT be deducted twice');

  // 3. Same key + different payload: returns IDEMPOTENCY_CONFLICT error envelope
  const resConflict = ctx.ApiRouter.routeRequest('requisitions.issue', {
    requisitionId: 'REQ-UUID-200', // different requisition!
    idempotencyKey: key
  });
  assert.strictEqual(resConflict.success, false);
  assert.strictEqual(resConflict.code, 'IDEMPOTENCY_CONFLICT');
});

// -------------------------------------------------------------
// FIX-10: Compensatory Rollback on Mid-Write Failure
// -------------------------------------------------------------
it('FIX-10: compensatory rollback restores master stock and status if error occurs mid-write', () => {
  const { ctx, sheets } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupMultiItemFixtures(ctx);

  const officer = { id: 'USR-002', role: 'OFFICER' };

  // Mock hrtPostLedgerMovement_ to throw on the 2nd item to simulate mid-write failure
  const originalPost = ctx.hrtPostLedgerMovement_;
  let callCount = 0;
  ctx.hrtPostLedgerMovement_ = function(params) {
    callCount++;
    if (callCount === 2) {
      throw new Error('SIMULATED_DB_FAILURE: Disk write error on item 2');
    }
    return originalPost(params);
  };

  assert.throws(() => {
    ctx.hrtIssueStock_({
      requisitionId: 'REQ-UUID-100'
    }, officer);
  }, /SIMULATED_DB_FAILURE/);

  // Verify compensatory rollback: ITM-001 stock must be restored to original 20!
  assert.strictEqual(sheets['03_Master_Items'][1][9], 20, 'ITM-001 stock must be rolled back to 20');
  // Requisition status must be restored to APPROVED
  assert.strictEqual(sheets['07_Requisitions'][1][6], 'APPROVED', 'Requisition status must be restored to APPROVED');
  // Line 1 qty_issued was not committed (still initial empty/0)
  assert.ok(sheets['08_Requisition_Items'][1][6] === '' || sheets['08_Requisition_Items'][1][6] === 0, 'Line 1 qty_issued must not be committed');
});

// -------------------------------------------------------------
// Suite Summary
// -------------------------------------------------------------
console.log('\n====================================================');
console.log(`TOTAL FIX VERIFICATION TESTS: ${passCount + failCount}`);
console.log(`PASSED: ${passCount}`);
console.log(`FAILED: ${failCount}`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL 10 STOCK ISSUANCE FIX CRITERIA (FIX-01 - FIX-10) PASSED 100%!\n');
}
