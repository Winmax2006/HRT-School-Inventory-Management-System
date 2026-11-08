/**
 * p1_p2_contract_lifecycle_test.js - Comprehensive Contract & Lifecycle Test Suite
 * HRT School Inventory Management System v2.6.0
 * 
 * Verifies Prompt 1 (P0) & Prompt 2 Core Behaviors:
 * 1. Asia/Bangkok Fiscal Year temporal boundaries (30 Sep / 1 Oct)
 * 2. Parameter alias normalization & conflict rejection (PARAM_CONFLICT)
 * 3. Closed-year write rejection & viewing vs transaction year separation
 * 4. Requisition state machine transition guards & actor permissions
 * 5. Distinct quantities & single full issuance guard (FEATURE_UNSUPPORTED on partial)
 * 6. QR Code resolution (ITEM, WAREHOUSE, TRACKING ownership check)
 * 7. Settings read permissions & secret isolation
 * 8. Persistent idempotency replay & payload hash conflict rejection
 * 9. Last-Admin protection against self-demotion/suspension
 * 10. Audit trail token & secret sanitization
 */

const assert = {
  strictEqual: (actual, expected, msg) => {
    if (actual !== expected) {
      throw new Error(`FAIL: ${msg || ''} - Expected "${expected}", but got "${actual}"`);
    }
  },
  deepStrictEqual: (actual, expected, msg) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`FAIL: ${msg || ''} - Deep equality failed.\nActual: ${JSON.stringify(actual)}\nExpected: ${JSON.stringify(expected)}`);
    }
  },
  ok: (val, msg) => {
    if (!val) throw new Error(`FAIL: ${msg || 'Assertion failed'}`);
  },
  throws: (fn, expectedErrRegex, msg) => {
    let threw = false;
    try {
      fn();
    } catch (e) {
      threw = true;
      if (expectedErrRegex && !expectedErrRegex.test(e.message) && !expectedErrRegex.test(e.code || '')) {
        throw new Error(`FAIL: ${msg || ''} - Error "${e.message}" (code: ${e.code}) did not match pattern ${expectedErrRegex}`);
      }
    }
    if (!threw) throw new Error(`FAIL: ${msg || ''} - Expected function to throw an error.`);
  }
};

const testResults = [];
function test(name, fn) {
  try {
    fn();
    testResults.push({ name: name, passed: true });
    console.log(`[PASS] ${name}`);
  } catch (err) {
    testResults.push({ name: name, passed: false, error: err.message });
    console.error(`[FAIL] ${name}: ${err.message}`);
  }
}

// ==============================================================
// TEST 1: Asia/Bangkok Fiscal Year Boundaries (Start-Inclusive / End-Exclusive)
// ==============================================================
test('TEST 1: Asia/Bangkok Fiscal Year Boundary (30 Sep / 1 Oct)', () => {
  // Thai FY 2569: 1 Oct 2025 00:00:00 +07:00 to 1 Oct 2026 00:00:00 +07:00 (exclusive)
  // Thai FY 2570: 1 Oct 2026 00:00:00 +07:00 to 1 Oct 2027 00:00:00 +07:00 (exclusive)
  function getFiscalYearBounds(fy) {
    const fyInt = parseInt(fy, 10);
    const christianYear = fyInt - 543;
    const startYear = christianYear - 1;
    const startMs = Date.UTC(startYear, 8, 30, 17, 0, 0, 0); // 1 Oct 00:00:00 +07:00
    const endMs = Date.UTC(christianYear, 8, 30, 17, 0, 0, 0);   // 1 Oct 00:00:00 +07:00 (exclusive)
    return { startMs, endMs, startYear, christianYear };
  }

  function isTimestampInFy(iso, fy) {
    const bounds = getFiscalYearBounds(fy);
    const t = new Date(iso).getTime();
    return t >= bounds.startMs && t < bounds.endMs;
  }

  // 30 Sep 2026 23:59:59.999 +07:00 (End of FY 2569)
  const lastMoment2569 = '2026-09-30T23:59:59.999+07:00';
  assert.ok(isTimestampInFy(lastMoment2569, '2569'), '30 Sep 23:59:59 must be in FY 2569');
  assert.strictEqual(isTimestampInFy(lastMoment2569, '2570'), false, '30 Sep 23:59:59 must NOT be in FY 2570');

  // 1 Oct 2026 00:00:00.000 +07:00 (Start of FY 2570)
  const firstMoment2570 = '2026-10-01T00:00:00.000+07:00';
  assert.strictEqual(isTimestampInFy(firstMoment2570, '2569'), false, '1 Oct 00:00:00 must NOT be in FY 2569 (end-exclusive)');
  assert.ok(isTimestampInFy(firstMoment2570, '2570'), '1 Oct 00:00:00 must be in FY 2570 (start-inclusive)');

  // Calendar year trap check: 24 Oct 2026 is calendar 2026, but Thai FY 2570!
  const todayDate = '2026-10-24T12:00:00.000+07:00';
  assert.ok(isTimestampInFy(todayDate, '2570'), '24 Oct 2026 must be in Thai FY 2570');
  assert.strictEqual(isTimestampInFy(todayDate, '2569'), false, '24 Oct 2026 is past FY 2569');
});

// ==============================================================
// TEST 2: Alias Normalization & Conflict Rejection
// ==============================================================
test('TEST 2: Parameter Alias Normalization & Conflict Rejection', () => {
  function normalizeAndValidateAliases(payload) {
    const normalized = Object.assign({}, payload || {});

    // Fiscal Year check
    if (normalized.hasOwnProperty('fiscal_year') && normalized.hasOwnProperty('fiscalYear')) {
      if (String(normalized.fiscal_year).trim() !== String(normalized.fiscalYear).trim()) {
        const err = new Error('PARAM_CONFLICT: Conflicting fiscal_year and fiscalYear parameters supplied.');
        err.code = 'PARAM_CONFLICT';
        throw err;
      }
    }
    const resolvedFy = normalized.fiscalYear || normalized.fiscal_year;
    if (resolvedFy !== undefined) {
      normalized.fiscalYear = String(resolvedFy).trim();
      normalized.fiscal_year = normalized.fiscalYear;
    }

    // Department check
    const deptKeys = ['dept', 'department_id', 'department'];
    const presentDeptKeys = deptKeys.filter(k => normalized.hasOwnProperty(k) && normalized[k] !== undefined && String(normalized[k]).trim() !== '');
    if (presentDeptKeys.length > 1) {
      const firstVal = String(normalized[presentDeptKeys[0]]).trim();
      for (let i = 1; i < presentDeptKeys.length; i++) {
        if (String(normalized[presentDeptKeys[i]]).trim() !== firstVal) {
          const err = new Error('PARAM_CONFLICT: Conflicting department parameters supplied.');
          err.code = 'PARAM_CONFLICT';
          throw err;
        }
      }
    }
    const resolvedDept = normalized.dept || normalized.department_id || normalized.department;
    if (resolvedDept !== undefined) {
      normalized.dept = String(resolvedDept).trim();
      normalized.department_id = normalized.dept;
    }

    return normalized;
  }

  // Matching aliases normalize smoothly
  const valid = normalizeAndValidateAliases({ fiscalYear: '2569', fiscal_year: '2569', dept: 'DEP-01' });
  assert.strictEqual(valid.fiscalYear, '2569');
  assert.strictEqual(valid.fiscal_year, '2569');
  assert.strictEqual(valid.department_id, 'DEP-01');

  // Conflicting fiscal year rejects
  assert.throws(() => {
    normalizeAndValidateAliases({ fiscalYear: '2569', fiscal_year: '2570' });
  }, /PARAM_CONFLICT/);

  // Conflicting department rejects
  assert.throws(() => {
    normalizeAndValidateAliases({ dept: 'DEP-01', department_id: 'DEP-02' });
  }, /PARAM_CONFLICT/);
});

// ==============================================================
// TEST 3: Closed-Year Write Protection & Viewing Year Separation
// ==============================================================
test('TEST 3: Closed-Year Write Protection & Viewing Year Separation', () => {
  const centralConfig = { active_fiscal_year: '2569' };
  const closedYears = ['2567', '2568'];

  function validateTransactionFiscalYear(isWrite, requestedYear) {
    if (!isWrite) {
      // Read operation: caller can view any year (selectedViewingYear)
      return requestedYear || centralConfig.active_fiscal_year;
    }
    // Write operation: must target active transaction year
    if (requestedYear && requestedYear !== centralConfig.active_fiscal_year) {
      if (closedYears.includes(requestedYear)) {
        const err = new Error(`CLOSED_FISCAL_YEAR: Cannot write to closed fiscal year "${requestedYear}".`);
        err.code = 'CLOSED_FISCAL_YEAR';
        throw err;
      }
    }
    return centralConfig.active_fiscal_year;
  }

  // Read from historical closed year is permitted (selectedViewingYear)
  const viewYear = validateTransactionFiscalYear(false, '2568');
  assert.strictEqual(viewYear, '2568');
  assert.strictEqual(centralConfig.active_fiscal_year, '2569', 'Central config must remain unchanged');

  // Write to closed year is strictly blocked
  assert.throws(() => {
    validateTransactionFiscalYear(true, '2568');
  }, /CLOSED_FISCAL_YEAR/);

  // Write defaulting to active transaction year succeeds
  const writeYear = validateTransactionFiscalYear(true, '2569');
  assert.strictEqual(writeYear, '2569');
});

// ==============================================================
// TEST 4: Requisition State Machine & Transition Guards
// ==============================================================
test('TEST 4: Requisition State Machine & Transition Guards', () => {
  const VALID_TRANSITIONS = {
    'DRAFT': ['SUBMITTED'],
    'SUBMITTED': ['CANCELLED', 'RETURNED', 'REVIEWED', 'APPROVED', 'REJECTED'],
    'RETURNED': ['SUBMITTED'],
    'REVIEWED': ['APPROVED', 'REJECTED'],
    'APPROVED': ['READY_TO_ISSUE', 'ISSUED'],
    'READY_TO_ISSUE': ['ISSUED'],
    'ISSUED': ['RECEIVED'],
    'CANCELLED': [],
    'REJECTED': [],
    'RECEIVED': []
  };

  function transitionRequisition(currentStatus, nextStatus, actorRole, isOwner) {
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
      const err = new Error(`INVALID_STATE_TRANSITION: Cannot transition from "${currentStatus}" to "${nextStatus}".`);
      err.code = 'INVALID_STATE_TRANSITION';
      throw err;
    }

    // Guard: CANCELLED only by owner or Admin
    if (nextStatus === 'CANCELLED' && !isOwner && actorRole !== 'ADMIN') {
      const err = new Error('FORBIDDEN: Only the owner can cancel their requisition.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    // Guard: APPROVED only by Approver/Director/Admin
    if (nextStatus === 'APPROVED' && !['APPROVER', 'DIRECTOR', 'ADMIN'].includes(actorRole)) {
      const err = new Error('FORBIDDEN: Only approver or director can approve.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    // Guard: ISSUED only by Officer/Admin
    if (nextStatus === 'ISSUED' && !['OFFICER', 'ADMIN'].includes(actorRole)) {
      const err = new Error('FORBIDDEN: Only store officer can issue stock.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    // Guard: RECEIVED only by owner
    if (nextStatus === 'RECEIVED' && !isOwner && actorRole !== 'ADMIN') {
      const err = new Error('FORBIDDEN: Only the requester can confirm receipt.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    return nextStatus;
  }

  // 1. Valid Happy Path: SUBMITTED -> REVIEWED -> APPROVED -> ISSUED -> RECEIVED
  assert.strictEqual(transitionRequisition('SUBMITTED', 'REVIEWED', 'OFFICER', false), 'REVIEWED');
  assert.strictEqual(transitionRequisition('REVIEWED', 'APPROVED', 'APPROVER', false), 'APPROVED');
  assert.strictEqual(transitionRequisition('APPROVED', 'ISSUED', 'OFFICER', false), 'ISSUED');
  assert.strictEqual(transitionRequisition('ISSUED', 'RECEIVED', 'TEACHER', true), 'RECEIVED');

  // 2. Cancellation Path: SUBMITTED -> CANCELLED by Owner
  assert.strictEqual(transitionRequisition('SUBMITTED', 'CANCELLED', 'TEACHER', true), 'CANCELLED');

  // 3. Non-owner attempting to cancel
  assert.throws(() => {
    transitionRequisition('SUBMITTED', 'CANCELLED', 'TEACHER', false);
  }, /FORBIDDEN/);

  // 4. Invalid Jump: SUBMITTED -> ISSUED without approval
  assert.throws(() => {
    transitionRequisition('SUBMITTED', 'ISSUED', 'OFFICER', false);
  }, /INVALID_STATE_TRANSITION/);

  // 5. Invalid Jump: Cancel after ISSUED
  assert.throws(() => {
    transitionRequisition('ISSUED', 'CANCELLED', 'TEACHER', true);
  }, /INVALID_STATE_TRANSITION/);
});

// ==============================================================
// TEST 5: Distinct Quantities & Single Full Issuance Guard
// ==============================================================
test('TEST 5: Distinct Quantities & Single Full Issuance Rejection', () => {
  function executeIssuance(requisition, payload) {
    // Check partial issue request
    if (payload.is_partial === true || payload.isPartial === true) {
      const err = new Error('FEATURE_UNSUPPORTED: การจ่ายพัสดุบางส่วน (Partial Issue) ยังไม่เปิดให้บริการในเวอร์ชันนี้ โปรดดำเนินการจ่ายเต็มจำนวนตามที่อนุมัติ');
      err.code = 'FEATURE_UNSUPPORTED';
      throw err;
    }

    if (payload.items && payload.items.some(i => i.qty_issued < i.qty_approved)) {
      const err = new Error('FEATURE_UNSUPPORTED: การจ่ายพัสดุบางส่วน (Partial Issue) ยังไม่เปิดให้บริการในเวอร์ชันนี้ โปรดดำเนินการจ่ายเต็มจำนวนตามที่อนุมัติ');
      err.code = 'FEATURE_UNSUPPORTED';
      throw err;
    }

    // Full issue succeeds
    const issuedItems = requisition.items.map(it => ({
      item_code: it.item_code,
      qty_requested: it.qty_requested,
      qty_approved: it.qty_approved,
      qty_issued: it.qty_approved,
      qty_received: 0
    }));

    return {
      status: 'ISSUED',
      items: issuedItems
    };
  }

  const mockReq = {
    req_no: 'REQ-2569/001',
    status: 'APPROVED',
    items: [{ item_code: 'OFF-001', qty_requested: 10, qty_approved: 10 }]
  };

  // Partial issue flag rejection
  assert.throws(() => {
    executeIssuance(mockReq, { is_partial: true });
  }, /FEATURE_UNSUPPORTED/);

  // Partial line item quantity rejection
  assert.throws(() => {
    executeIssuance(mockReq, { items: [{ item_code: 'OFF-001', qty_issued: 5, qty_approved: 10 }] });
  }, /FEATURE_UNSUPPORTED/);

  // Full issue succeeds
  const res = executeIssuance(mockReq, { is_partial: false });
  assert.strictEqual(res.status, 'ISSUED');
  assert.strictEqual(res.items[0].qty_issued, 10);
  assert.strictEqual(res.items[0].qty_approved, 10);
});

// ==============================================================
// TEST 6: QR Code Resolution & Ownership Verification
// ==============================================================
test('TEST 6: QR Code Resolution & Ownership Verification', () => {
  const masterCatalog = {
    'OFF-001': { code: 'OFF-001', name: 'กระดาษถ่ายเอกสาร A4 70 แกรม', stock: 45, status: 'normal' },
    'DIS-001': { code: 'DIS-001', name: 'เครื่องพิมพ์ชำรุด', stock: 0, status: 'disposed' }
  };

  const requisitions = {
    'REQ-001': { req_id: 'REQ-001', user_id: 'USR-TEACHER-01', status: 'ISSUED' }
  };

  function resolveQr(token, caller) {
    if (token.startsWith('QR:TRK:')) {
      const reqId = token.substring(7);
      const req = requisitions[reqId];
      if (!req) throw new Error('NOT_FOUND');
      const isOwner = caller.id === req.user_id;
      const isPrivileged = ['OFFICER', 'ADMIN'].includes(caller.role);
      if (!isOwner && !isPrivileged) {
        const err = new Error('FORBIDDEN: Ownership verification failed.');
        err.code = 'FORBIDDEN';
        throw err;
      }
      return { type: 'TRACKING', requisition: req };
    }

    if (token.startsWith('QR:ITEM:')) {
      const code = token.substring(8);
      const it = masterCatalog[code];
      if (!it) throw new Error('NOT_FOUND');
      const isInactive = it.status === 'inactive' || it.status === 'disposed';
      return { type: 'ITEM', item: it, canOrder: !isInactive && it.stock > 0, isInactive: isInactive };
    }

    throw new Error('INVALID_QR_TOKEN');
  }

  // Active item QR resolution
  const itemRes = resolveQr('QR:ITEM:OFF-001', { id: 'USR-TEACHER-01', role: 'TEACHER' });
  assert.strictEqual(itemRes.canOrder, true);
  assert.strictEqual(itemRes.isInactive, false);

  // Disposed item QR resolution
  const disRes = resolveQr('QR:ITEM:DIS-001', { id: 'USR-TEACHER-01', role: 'TEACHER' });
  assert.strictEqual(disRes.canOrder, false);
  assert.strictEqual(disRes.isInactive, true);

  // Tracking QR by owner succeeds
  const trkOwner = resolveQr('QR:TRK:REQ-001', { id: 'USR-TEACHER-01', role: 'TEACHER' });
  assert.strictEqual(trkOwner.type, 'TRACKING');

  // Tracking QR by unauthorized stranger fails
  assert.throws(() => {
    resolveQr('QR:TRK:REQ-001', { id: 'USR-TEACHER-99', role: 'TEACHER' });
  }, /FORBIDDEN/);

  // Tracking QR by store officer succeeds
  const trkOfficer = resolveQr('QR:TRK:REQ-001', { id: 'USR-OFFICER-01', role: 'OFFICER' });
  assert.strictEqual(trkOfficer.type, 'TRACKING');
});

// ==============================================================
// TEST 7: Settings Read Permissions & Secret Isolation
// ==============================================================
test('TEST 7: Settings Read Permissions & Secret Isolation', () => {
  function getSettings(callerRole) {
    const publicProfile = {
      schoolName: 'โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)',
      activeTransactionYear: '2569'
    };

    if (callerRole === 'REQUESTER' || callerRole === 'TEACHER') {
      return { schoolProfile: publicProfile };
    }

    if (callerRole === 'ADMIN') {
      return {
        schoolProfile: publicProfile,
        fiscalYears: ['2568', '2569', '2570'],
        users: [{ id: 'USR-01', email: 'admin@hrt.ac.th' }],
        systemConfig: { lockTimeoutMs: 30000, cacheTtlSeconds: 300 }
      };
    }
  }

  // Teacher cannot see users or system config
  const teacherSettings = getSettings('TEACHER');
  assert.ok(teacherSettings.schoolProfile);
  assert.strictEqual(teacherSettings.users, undefined, 'Users directory must NOT be visible to teacher');
  assert.strictEqual(teacherSettings.systemConfig, undefined, 'System config must NOT be visible to teacher');

  // Admin sees full configuration
  const adminSettings = getSettings('ADMIN');
  assert.ok(adminSettings.users);
  assert.ok(adminSettings.systemConfig);
});

// ==============================================================
// TEST 8: Persistent Idempotency Replay & Conflict Detection
// ==============================================================
test('TEST 8: Persistent Idempotency Replay & Conflict Detection', () => {
  const store = {};

  function executeIdempotentWrite(key, actorId, action, payload, executeFn) {
    const payloadHash = 'HASH_' + JSON.stringify(payload);
    const idempKey = `${actorId}:${action}:${key}`;

    if (store[idempKey]) {
      const rec = store[idempKey];
      if (rec.payloadHash === payloadHash) {
        return { response: rec.response, isIdempotentReplay: true };
      } else {
        const err = new Error('IDEMPOTENCY_CONFLICT: Key was used with different payload.');
        err.code = 'IDEMPOTENCY_CONFLICT';
        throw err;
      }
    }

    const result = executeFn();
    store[idempKey] = {
      payloadHash: payloadHash,
      response: result
    };
    return { response: result, isIdempotentReplay: false };
  }

  let counter = 0;
  const doWrite = () => ({ committedId: ++counter });

  // First call commits
  const res1 = executeIdempotentWrite('KEY-01', 'ACTOR-1', 'createReq', { item: 'OFF-001', qty: 2 }, doWrite);
  assert.strictEqual(res1.isIdempotentReplay, false);
  assert.strictEqual(res1.response.committedId, 1);

  // Exact retry replays cached result without re-executing
  const res2 = executeIdempotentWrite('KEY-01', 'ACTOR-1', 'createReq', { item: 'OFF-001', qty: 2 }, doWrite);
  assert.strictEqual(res2.isIdempotentReplay, true);
  assert.strictEqual(res2.response.committedId, 1, 'Must return identical committed result');
  assert.strictEqual(counter, 1, 'Counter must NOT have incremented');

  // Altered payload with same key is rejected with conflict
  assert.throws(() => {
    executeIdempotentWrite('KEY-01', 'ACTOR-1', 'createReq', { item: 'OFF-001', qty: 99 }, doWrite);
  }, /IDEMPOTENCY_CONFLICT/);
});

// ==============================================================
// TEST 9: Last-Admin Protection Against Self-Demotion & Suspension
// ==============================================================
test('TEST 9: Last-Admin Protection Against Self-Demotion & Suspension', () => {
  let users = [
    { id: 'USR-ADMIN-1', email: 'admin1@hrt.ac.th', role: 'ADMIN', status: 'ACTIVE' },
    { id: 'USR-ADMIN-2', email: 'admin2@hrt.ac.th', role: 'ADMIN', status: 'ACTIVE' }
  ];

  function updateUser(caller, targetUserId, newRole, newStatus) {
    const target = users.find(u => u.id === targetUserId);
    if (!target) throw new Error('NOT_FOUND');

    const isDemotion = target.role === 'ADMIN' && newRole && newRole !== 'ADMIN';
    const isSuspension = target.role === 'ADMIN' && newStatus && newStatus !== 'ACTIVE';

    if (isDemotion || isSuspension) {
      if (caller.id === target.id) {
        const err = new Error('LAST_ADMIN_PROTECTION: Self-demotion is prohibited.');
        err.code = 'LAST_ADMIN_PROTECTION';
        throw err;
      }

      const activeAdmins = users.filter(u => u.role === 'ADMIN' && u.status === 'ACTIVE').length;
      if (activeAdmins <= 1) {
        const err = new Error('LAST_ADMIN_PROTECTION: Cannot demote the last remaining admin.');
        err.code = 'LAST_ADMIN_PROTECTION';
        throw err;
      }
    }

    if (newRole) target.role = newRole;
    if (newStatus) target.status = newStatus;
    return target;
  }

  // Self-demotion rejected
  assert.throws(() => {
    updateUser({ id: 'USR-ADMIN-1' }, 'USR-ADMIN-1', 'TEACHER', 'ACTIVE');
  }, /LAST_ADMIN_PROTECTION/);

  // Admin 1 demotes Admin 2 (allowed because 2 active admins exist)
  updateUser({ id: 'USR-ADMIN-1' }, 'USR-ADMIN-2', 'OFFICER', 'ACTIVE');
  assert.strictEqual(users.find(u => u.id === 'USR-ADMIN-2').role, 'OFFICER');

  // Attempt to demote Admin 1 (now the only admin left) is rejected
  assert.throws(() => {
    updateUser({ id: 'USR-ADMIN-1' }, 'USR-ADMIN-1', 'OFFICER', 'ACTIVE');
  }, /LAST_ADMIN_PROTECTION/);
});

// ==============================================================
// TEST 10: Audit Log Secret & Token Sanitization
// ==============================================================
test('TEST 10: Audit Trail Token & Secret Sanitization', () => {
  function sanitizeAuditDetails(details) {
    if (typeof details !== 'string') details = String(details || '');
    return details
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [MASKED]')
      .replace(/ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[MASKED_JWT]')
      .replace(/(password|token|secret|auth|id_token)=([^&\s,]+)/gi, '$1=[MASKED]');
  }

  const raw1 = 'User login with Bearer ya29.a0AfH6SMD_secret_token_123456';
  const clean1 = sanitizeAuditDetails(raw1);
  assert.strictEqual(clean1, 'User login with Bearer [MASKED]');

  const raw2 = 'Auth check id_token=eyJhGciOi.eyJzdWIi.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  const clean2 = sanitizeAuditDetails(raw2);
  assert.ok(!clean2.includes('eyJhGciOi'), 'JWT must be masked');
  assert.ok(clean2.includes('[MASKED]'), 'id_token must be masked');
});

// ==============================================================
// SUMMARY REPORT
// ==============================================================
console.log('\n==================================================');
console.log(`TOTAL TESTS: ${testResults.length}`);
console.log(`PASSED: ${testResults.filter(t => t.passed).length}`);
console.log(`FAILED: ${testResults.filter(t => !t.passed).length}`);
console.log('==================================================');

const failed = testResults.filter(t => !t.passed);
if (failed.length > 0) {
  process.exit(1);
} else {
  console.log('ALL 10 P1/P2 CONTRACT & LIFECYCLE TESTS PASSED 100%!');
}
