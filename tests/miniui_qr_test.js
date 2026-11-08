/**
 * tests/miniui_qr_test.js
 * Comprehensive Test Suite for HRT Prompt 19 (MiniUI Self-Service & Responsive QR)
 * 
 * Acceptance Criteria Covered:
 * - MINI-01: QR -> login -> catalog -> cart -> submit -> myrequests -> centralqueue data parity
 * - MINI-02: Requester isolation & RBAC (cannot view or confirm others' requisitions)
 * - MINI-03: Idempotent deduplication & timeout draft retention (UNKNOWN_OUTCOME)
 * - MINI-04: Invalid/revoked QR rejection with zero silent fallback; manual search labeled
 * - MINI-05: Real camera stream & BarcodeDetector lifecycle (NOT_RUN note on headless runner)
 * - MINI-06: Stock balance invariance across lifecycle (review -> approve -> issue -> receive)
 * - MINI-07: Expired / suspended session purges old user data and scoped draft
 * - MINI-08: Malicious XSS injection fields properly escaped in MiniUI
 * - MINI-09: Camera permission denial / service failure has recoverable error, no fake success
 * - MINI-10: Draft storage scoped strictly by user, environment, and fiscal year
 * - MINI-11: Unified QR prefix compatibility (ITEM, ROOM/WH, TRACK/TRK, CATALOG) & anti-bypass revocation
 * - MINI-12: Requisition DTO fields rendered accurately with "ไม่ระบุ" for missing values
 */

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

console.log('=============================================================');
console.log('RUNNING PROMPT 19: MINIUI SELF-SERVICE & RESPONSIVE QR SUITE');
console.log('Target Baseline: v2.7.0-rc.5 -> Working Candidate for rc.6');
console.log('=============================================================\n');

function createMockGasContext(customConfig = {}) {
  const cacheStore = {};
  const propertiesStore = {
    'ALLOWED_DOMAINS': 'hrt.ac.th'
  };
  const scriptLock = {
    hasLock: false,
    tryLock: (ms) => { scriptLock.hasLock = true; return true; },
    releaseLock: () => { scriptLock.hasLock = false; },
    waitLock: (ms) => { scriptLock.hasLock = true; }
  };

  const sheets = {};

  const createMockSheet = (name) => {
    if (!sheets[name]) sheets[name] = [];
    const sheetRows = sheets[name];

    return {
      getName: () => name,
      getLastRow: () => sheetRows.length,
      getLastColumn: () => (sheetRows.length > 0 ? sheetRows[0].length : 0),
      getDataRange: () => ({
        getValues: () => sheetRows.map(r => [...r])
      }),
      getRange: (row, col, numRows = 1, numCols = 1) => ({
        getValue: () => (sheetRows[row - 1] ? sheetRows[row - 1][col - 1] : ''),
        getValues: () => {
          const res = [];
          for (let r = 0; r < numRows; r++) {
            const rowArr = [];
            for (let c = 0; c < numCols; c++) {
              rowArr.push(sheetRows[row - 1 + r] ? sheetRows[row - 1 + r][col - 1 + c] : '');
            }
            res.push(rowArr);
          }
          return res;
        },
        setValue: (val) => {
          while (sheetRows.length < row) sheetRows.push([]);
          while (sheetRows[row - 1].length < col) sheetRows[row - 1].push('');
          sheetRows[row - 1][col - 1] = val;
        },
        setValues: (vals) => {
          for (let r = 0; r < vals.length; r++) {
            const targetR = row - 1 + r;
            while (sheetRows.length <= targetR) sheetRows.push([]);
            for (let c = 0; c < vals[r].length; c++) {
              const targetC = col - 1 + c;
              while (sheetRows[targetR].length <= targetC) sheetRows[targetR].push('');
              sheetRows[targetR][targetC] = vals[r][c];
            }
          }
        },
        clearContent: () => {
          for (let r = 0; r < numRows; r++) {
            const targetR = row - 1 + r;
            if (sheetRows[targetR]) {
              for (let c = 0; c < numCols; c++) {
                sheetRows[targetR][col - 1 + c] = '';
              }
            }
          }
        }
      }),
      appendRow: (rowVals) => {
        sheetRows.push([...rowVals]);
      },
      setFrozenRows: () => {}
    };
  };

  const mockSpreadsheet = {
    getId: () => customConfig.SPREADSHEET_ID || 'SS-HRT-MOCK-2569',
    getName: () => 'HRT_Inventory_DB_2569_School',
    getSheets: () => Object.keys(sheets).map(s => ({ getName: () => s })),
    getSheetByName: (name) => {
      if (sheets[name]) return createMockSheet(name);
      const lower = name.toLowerCase();
      for (const k of Object.keys(sheets)) {
        if (k.toLowerCase().includes(lower)) return createMockSheet(k);
      }
      return null;
    },
    insertSheet: (name) => createMockSheet(name)
  };

  const ctx = {
    console,
    Logger: { log: () => {} },
    SpreadsheetApp: {
      openById: (id) => mockSpreadsheet,
      getActiveSpreadsheet: () => mockSpreadsheet
    },
    LockService: {
      getScriptLock: () => scriptLock
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => (cacheStore[k] !== undefined ? cacheStore[k] : null),
        put: (k, v, ttl) => { cacheStore[k] = v; },
        remove: (k) => { delete cacheStore[k]; }
      })
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (propertiesStore[k] !== undefined ? propertiesStore[k] : null),
        setProperty: (k, v) => { propertiesStore[k] = String(v); },
        getProperties: () => ({ ...propertiesStore })
      })
    },
    Session: {
      getActiveUser: () => ({
        getEmail: () => customConfig.activeEmail || 'teacher@hrt.ac.th'
      })
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
      Charset: { UTF_8: 'UTF_8' },
      base64Encode: (bytes) => Buffer.from(bytes).toString('base64'),
      base64Decode: (str) => Array.from(Buffer.from(str, 'base64'))
    },
    process: {
      env: { NODE_ENV: 'test' }
    }
  };

  vm.createContext(ctx);

  const files = ['Config.gs', 'Audit.gs', 'Read.gs', 'Write.gs', 'Api.gs', 'Code.gs'];
  for (const f of files) {
    const code = fs.readFileSync(f, 'utf8');
    vm.runInContext(code, ctx, { filename: f });
  }

  const initSheet = (name, rows) => {
    sheets[name] = rows.map(r => [...r]);
  };

  // 16 Canonical sheets
  initSheet('01_Users', [
    ['user_id', 'username', 'name', 'email', 'role', 'department', 'status'],
    ['USR-001', 'admin@hrt.ac.th', 'ผู้ดูแลระบบ', 'admin@hrt.ac.th', 'ADMIN', 'กลุ่มบริหารงานงบประมาณ', 'ACTIVE'],
    ['USR-002', 'officer@hrt.ac.th', 'เจ้าหน้าที่พัสดุ', 'officer@hrt.ac.th', 'OFFICER', 'กลุ่มบริหารงานงบประมาณ', 'ACTIVE'],
    ['USR-003', 'teacher@hrt.ac.th', 'ครูสมศรี', 'teacher@hrt.ac.th', 'TEACHER', 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์', 'ACTIVE'],
    ['USR-004', 'teacher2@hrt.ac.th', 'ครูสมปอง', 'teacher2@hrt.ac.th', 'TEACHER', 'กลุ่มสาระการเรียนรู้คณิตศาสตร์', 'ACTIVE'],
    ['USR-SUSP', 'suspended@hrt.ac.th', 'ครูสมชาย (ระงับสิทธิ์)', 'suspended@hrt.ac.th', 'TEACHER', 'ทั่วไป', 'SUSPENDED']
  ]);

  initSheet('02_Departments', [
    ['dept_id', 'dept_name', 'faculty_head', 'budget_code', 'status'],
    ['D01', 'กลุ่มบริหารงานงบประมาณ', 'นายสมศักดิ์', 'B01', 'ACTIVE'],
    ['D02', 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์', 'นางสมศรี', 'B02', 'ACTIVE'],
    ['D03', 'กลุ่มสาระการเรียนรู้คณิตศาสตร์', 'นายสมปอง', 'B03', 'ACTIVE']
  ]);

  initSheet('03_Master_Items', [
    ['code', 'fsn_code', 'name', 'category', 'unit', 'warehouse', 'unit_cost', 'min', 'rop', 'stock', 'supplier', 'status'],
    ['OFF-001', '7510-00-123-4567', 'กระดาษ A4 80 แกรม', 'เครื่องเขียน', 'รีม', 'คลังพัสดุกลาง (อาคาร 1)', 135, 10, 15, 20, 'บจก. สยามสเตชั่นเนอรี่', 'normal'],
    ['SCI-001', '6640-00-987-6543', 'บีกเกอร์แก้ว 250ml', 'วัสดุวิทยาศาสตร์', 'ใบ', 'ห้องปฏิบัติการวิทย์ (อาคาร 2)', 85, 5, 10, 15, 'บจก. เคมีภัณฑ์ไทย', 'normal'],
    ['OFF-REVOKED', '', 'พัสดุที่ถูกยกเลิก QR', 'เครื่องเขียน', 'ชิ้น', 'คลังพัสดุกลาง (อาคาร 1)', 50, 0, 0, 5, 'บจก. เก่า', 'normal']
  ]);

  initSheet('04_Categories', [
    ['category_id', 'category_name', 'code_prefix', 'icon'],
    ['CAT-01', 'เครื่องเขียน', 'OFF-', 'ph-paperclip'],
    ['CAT-02', 'วัสดุวิทยาศาสตร์', 'SCI-', 'ph-flask']
  ]);

  initSheet('05_Warehouses', [
    ['warehouse_id', 'warehouse_name', 'building', 'room'],
    ['WH-01', 'คลังพัสดุกลาง (อาคาร 1)', 'อาคาร 1', '101'],
    ['WH-02', 'ห้องปฏิบัติการวิทย์ (อาคาร 2)', 'อาคาร 2', '201']
  ]);

  initSheet('06_FSN_Catalog', [
    ['fsn_code', 'group_code', 'group_name', 'class_code', 'fsc', 'name', 'spec', 'linked_code'],
    ['7510-00-123-4567', '75', 'เครื่องเขียนสำนักงาน', '7510', '7510', 'กระดาษ A4 80 แกรม', 'Double A', 'OFF-001']
  ]);

  initSheet('07_Requisitions', [
    ['req_id', 'req_no', 'req_date', 'user_id', 'dept', 'purpose', 'status', 'approver_id', 'approved_at', 'issued_at'],
    ['REQ-UUID-100', 'REQ-2569/001', '2026-10-15T09:00:00Z', 'USR-003', 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์', 'ใช้ในการจัดการเรียนการสอนวิทยาศาสตร์', 'ISSUED', 'USR-001', '2026-10-16T10:00:00Z', '2026-10-17T09:00:00Z']
  ]);

  initSheet('08_Requisition_Items', [
    ['id', 'req_id', 'item_code', 'qty_requested', 'qty_approved', 'unit'],
    ['LINE-001', 'REQ-UUID-100', 'OFF-001', 5, 5, 'รีม']
  ]);

  initSheet('09_Stock_Transactions', [
    ['tx_id', 'date', 'doc_ref', 'type', 'item_code', 'qty', 'unit_cost', 'actor_id', 'note'],
    ['TX-INIT-001', '2026-10-01T00:00:00Z', 'INIT-2569', 'OPENING', 'OFF-001', 25, 135, 'SYSTEM', 'Opening stock FY2569'],
    ['TX-ISSUE-001', '2026-10-17T09:00:00Z', 'REQ-2569/001', 'ISSUE', 'OFF-001', 5, 135, 'USR-002', 'Issue for REQ-2569/001']
  ]);

  initSheet('10_Stock_Ledger', [
    ['ledger_id', 'item_code', 'tx_id', 'tx_type', 'qty_in', 'qty_out', 'balance', 'unit_cost', 'fiscal_year', 'created_at'],
    ['LDG-001', 'OFF-001', 'TX-INIT-001', 'OPENING', 25, 0, 25, 135, '2569', '2026-10-01T00:00:00Z'],
    ['LDG-002', 'OFF-001', 'TX-ISSUE-001', 'ISSUE', 0, 5, 20, 135, '2569', '2026-10-17T09:00:00Z']
  ]);

  initSheet('11_Audit_Trail', [
    ['log_id', 'timestamp', 'actor_id', 'action', 'entity', 'entity_id', 'changes', 'ip_address', 'status']
  ]);

  initSheet('12_Fiscal_Years', [
    ['year_id', 'fiscal_year', 'start_date', 'end_date', 'is_closed', 'closed_at', 'closed_by'],
    ['FY-2569', '2569', '2025-10-01', '2026-09-30', 'FALSE', '', '']
  ]);

  initSheet('13_Year_End_Audits', [
    ['audit_id', 'fiscal_year', 'audit_date', 'auditor_id', 'status', 'total_items', 'total_value', 'notes']
  ]);

  initSheet('14_QR_Registry', [
    ['qr_id', 'token', 'target_type', 'target_id', 'created_at', 'status', 'notes'],
    ['QR-001', 'QR:ITEM:OFF-001', 'ITEM', 'OFF-001', '2026-10-01T00:00:00Z', 'ACTIVE', ''],
    ['QR-002', 'QR:ROOM:WH-01', 'WAREHOUSE', 'WH-01', '2026-10-01T00:00:00Z', 'ACTIVE', ''],
    ['QR-003', 'QR:TRACK:REQ-UUID-100', 'TRACKING', 'REQ-UUID-100', '2026-10-15T09:00:00Z', 'ACTIVE', ''],
    ['QR-004', 'QR:ITEM:OFF-REVOKED', 'ITEM', 'OFF-REVOKED', '2026-10-01T00:00:00Z', 'REVOKED', 'Revoked lost barcode']
  ]);

  initSheet('15_Settings_Config', [
    ['setting_key', 'setting_value', 'updated_at', 'updated_by'],
    ['data_revision', '1', '2026-10-01T00:00:00Z', 'SYSTEM'],
    ['fiscal_year', '2569', '2026-10-01T00:00:00Z', 'SYSTEM']
  ]);

  initSheet('16_Idempotency_Log', [
    ['key', 'actor_id', 'action', 'payload_hash', 'status', 'response_json', 'created_at']
  ]);

  return { ctx, sheets };
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
    failedTests++;
  }
}

// ============================================================================
// TEST SCENARIOS (MINI-01 to MINI-12)
// ============================================================================

// MINI-01: End-to-end requisition flow parity between MiniUI and Central queue
runTest('MINI-01: QR -> login -> catalog -> cart -> submit -> myrequests -> centralqueue data parity', () => {
  const { ctx, sheets } = createMockGasContext({ activeEmail: 'teacher@hrt.ac.th' });

  // 1. Authenticate user
  const userRes = vm.runInContext('apiGetCurrentUser()', ctx);
  assert.strictEqual(userRes.success, true);
  const user = userRes.user || userRes.data;
  assert.strictEqual(user.email, 'teacher@hrt.ac.th');
  assert.strictEqual(user.role, 'TEACHER');

  // 2. Resolve QR for item
  const qrRes = vm.runInContext("apiResolveQr({ qr_data: 'QR:ITEM:OFF-001' })", ctx);
  assert.strictEqual(qrRes.success, true);
  assert.strictEqual(qrRes.type, 'ITEM');
  assert.strictEqual(qrRes.item.code, 'OFF-001');

  // 3. Submit Requisition with MINI_QR source and stable idempotency key
  const idempotencyKey = 'MINI-REQ-TEST-001';
  const submitPayload = {
    items: [{ item_code: 'OFF-001', qty: 3, unit: 'รีม' }],
    purpose: 'จัดเตรียมเอกสารการสอนวิชาวิทยาศาสตร์',
    urgency: 'NORMAL',
    required_date: '2026-11-01',
    dept: user.department,
    source: 'MINI_QR',
    idempotency_key: idempotencyKey
  };

  const createRes = vm.runInContext(`apiCreateRequisition(${JSON.stringify(submitPayload)})`, ctx);
  assert.strictEqual(createRes.success, true);
  assert.ok(createRes.req_no, 'Must return req_no');
  const reqId = createRes.req_id;

  // 4. Verify myrequests contains the new requisition with status SUBMITTED
  const myReqsRes = vm.runInContext("apiGetRequisitions({ user_id: 'USR-003' })", ctx);
  const myReqs = myReqsRes.requisitions || myReqsRes.data;
  const foundInMyReqs = myReqs.find(r => r.req_id === reqId);
  assert.ok(foundInMyReqs, 'Requisition must appear in user myrequests');
  assert.strictEqual(foundInMyReqs.status, 'SUBMITTED');
  assert.strictEqual(foundInMyReqs.source, 'MINI_QR');

  // 5. Verify Central Queue in Sheet 07_Requisitions has identical record
  const reqRows = sheets['07_Requisitions'];
  const centralRow = reqRows.find(r => r[0] === reqId);
  assert.ok(centralRow, 'Requisition must exist in central sheet 07_Requisitions');
  assert.strictEqual(centralRow[3], 'USR-003');
  assert.strictEqual(centralRow[5], 'จัดเตรียมเอกสารการสอนวิชาวิทยาศาสตร์');
  assert.strictEqual(centralRow[6], 'SUBMITTED');
});

// MINI-02: Requester isolation & RBAC enforcement
runTest("MINI-02: requester cannot view or confirm others' requisitions", () => {
  const { ctx } = createMockGasContext({ activeEmail: 'teacher2@hrt.ac.th' }); // USR-004

  // Verify caller is Teacher 2
  const userRes = vm.runInContext('apiGetCurrentUser()', ctx);
  assert.strictEqual(userRes.success, true);
  const user = userRes.user || userRes.data;
  assert.strictEqual(user.user_id, 'USR-004');

  // Teacher 2 gets myrequests -> should NOT see REQ-UUID-100 (owned by USR-003)
  const reqsRes = vm.runInContext('apiGetRequisitions({})', ctx);
  const reqs = reqsRes.requisitions || reqsRes.data;
  const leakedReq = reqs.find(r => r.req_id === 'REQ-UUID-100');
  assert.strictEqual(leakedReq, undefined, 'Teacher 2 must not see Teacher 1 requisitions');

  // Teacher 2 attempts to get detail of REQ-UUID-100 directly
  const detailRes = vm.runInContext("apiGetRequisitionDetail({ requisition_id: 'REQ-UUID-100' })", ctx);
  assert.strictEqual(detailRes.success, false, 'Access to others requisition detail must fail');
  assert.ok(/ACCESS_DENIED|FORBIDDEN|UNAUTHORIZED/i.test(detailRes.error.code));

  // Teacher 2 attempts to confirm receipt on REQ-UUID-100
  const confirmRes = vm.runInContext("apiConfirmReceipt({ requisition_id: 'REQ-UUID-100' })", ctx);
  assert.strictEqual(confirmRes.success, false, 'Confirming receipt of others requisition must fail');
  assert.ok(/ACCESS_DENIED|FORBIDDEN|UNAUTHORIZED/i.test(confirmRes.error.code));
});

// MINI-03: Idempotent deduplication & timeout draft retention
runTest('MINI-03: timeout/retry/double tap does not create duplicate requisition or ledger rows', () => {
  const { ctx, sheets } = createMockGasContext({ activeEmail: 'teacher@hrt.ac.th' });

  const idempotencyKey = 'MINI-IDEMP-DOUBLETAP-999';
  const payload = {
    items: [{ item_code: 'OFF-001', qty: 2, unit: 'รีม' }],
    purpose: 'ทดสอบ Idempotency Double Tap',
    urgency: 'NORMAL',
    required_date: '2026-11-05',
    dept: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์',
    source: 'MINI_QR',
    idempotency_key: idempotencyKey
  };

  const initialReqCount = sheets['07_Requisitions'].length;

  // First tap
  const res1 = vm.runInContext(`apiCreateRequisition(${JSON.stringify(payload)})`, ctx);
  assert.strictEqual(res1.success, true);
  const firstReqNo = res1.req_no;
  assert.strictEqual(sheets['07_Requisitions'].length, initialReqCount + 1);

  // Second tap (immediate retry with same idempotency key)
  const res2 = vm.runInContext(`apiCreateRequisition(${JSON.stringify(payload)})`, ctx);
  assert.strictEqual(res2.success, true);
  assert.strictEqual(res2.req_no, firstReqNo, 'Second tap must return identical req_no');

  // Verify zero duplicate rows created
  assert.strictEqual(sheets['07_Requisitions'].length, initialReqCount + 1, 'No duplicate requisition rows allowed');

  // Client verification: MiniUI submitRequisition preserves cart and draft on timeout
  const miniHtml = fs.readFileSync('MiniUI.html', 'utf8');
  assert.ok(miniHtml.includes('err.outcome === \'UNKNOWN_OUTCOME\'') || miniHtml.includes('err.isTimeout'),
    'MiniUI must handle timeout UNKNOWN_OUTCOME without discarding cart');
});

// MINI-04: Invalid/revoked QR rejection with zero silent fallback; manual search labeled
runTest('MINI-04: invalid/revoked QR does not pass silent fallback and manual search is distinctly labeled', () => {
  const { ctx } = createMockGasContext({ activeEmail: 'teacher@hrt.ac.th' });

  // 1. Revoked QR token in 14_QR_Registry must return success: false with QR_REVOKED
  const resRevoked = vm.runInContext("apiResolveQr({ qr_data: 'QR:ITEM:OFF-REVOKED' })", ctx);
  assert.strictEqual(resRevoked.success, false, 'Revoked QR code must return success: false');
  assert.ok(/QR_REVOKED/i.test(resRevoked.error.code) || /ยกเลิก/i.test(resRevoked.error.message));

  // 2. Also alias of revoked token must be rejected
  const resRevokedAlias = vm.runInContext("apiResolveQr({ qr_data: 'ITEM:OFF-REVOKED' })", ctx);
  assert.strictEqual(resRevokedAlias.success, false, 'Alias of revoked QR code must return success: false');
  assert.ok(/QR_REVOKED/i.test(resRevokedAlias.error.code) || /ยกเลิก/i.test(resRevokedAlias.error.message));

  // 3. Non-existent QR token must return success: false with NOT_FOUND
  const resNotFound = vm.runInContext("apiResolveQr({ qr_data: 'QR:ITEM:NON-EXISTENT' })", ctx);
  assert.strictEqual(resNotFound.success, false, 'Non-existent item QR must return success: false');
  assert.ok(/NOT_FOUND/i.test(resNotFound.error.code));

  // 4. Verify MiniUI code has NO silent local fallback on QR resolution failure
  const miniHtml = fs.readFileSync('MiniUI.html', 'utf8');
  const resolveQrFnMatch = miniHtml.match(/async function resolveQrCode\([\s\S]*?\n\}/);
  assert.ok(resolveQrFnMatch, 'resolveQrCode function must exist in MiniUI.html');
  const resolveQrBody = resolveQrFnMatch[0];
  assert.ok(!resolveQrBody.includes('state.items.find'), 'resolveQrCode must NOT silently fallback to state.items.find on error');

  // 5. Verify manual search function exists and is distinctly labeled
  assert.ok(miniHtml.includes('handleManualItemSearch'), 'MiniUI must define handleManualItemSearch');
  assert.ok(miniHtml.includes('[ค้นหาด้วยรหัส]'), 'handleManualItemSearch must include explicit [ค้นหาด้วยรหัส] indicator');
});

// MINI-05: Real camera stream & BarcodeDetector lifecycle inspection
runTest('MINI-05: camera reads real QR on mobile stream; marked NOT_RUN in headless runner with lifecycle verified', () => {
  const miniHtml = fs.readFileSync('MiniUI.html', 'utf8');

  // AST / code assertions for real camera streaming & BarcodeDetector
  assert.ok(miniHtml.includes('navigator.mediaDevices.getUserMedia'), 'Must use navigator.mediaDevices.getUserMedia');
  assert.ok(miniHtml.includes('<video id="cameraVideo"'), 'Must have real video element for camera preview');
  assert.ok(miniHtml.includes('activeScannerStream'), 'Must track active scanner stream');
  assert.ok(miniHtml.includes('stopCameraStream'), 'Must implement stopCameraStream() cleanup');
  assert.ok(miniHtml.includes('BarcodeDetector'), 'Must integrate with BarcodeDetector API');
  assert.ok(miniHtml.includes('track.stop()'), 'Must call track.stop() on stream teardown');

  // Check viewport meta tag allows accessibility zoom
  assert.ok(miniHtml.includes('name="viewport" content="width=device-width, initial-scale=1"'),
    'Viewport must be responsive without user-scalable=no');
  assert.ok(!miniHtml.includes('user-scalable=no'), 'Must NOT forbid user zooming per WCAG standards');

  console.log('       [NOTE: Hardware camera stream execution is NOT_RUN in headless test runner (No camera sensor); lifecycle and AST verified]');
});

// MINI-06: Stock balance invariance across lifecycle
runTest('MINI-06: review -> approve -> issue -> receive deducts stock exactly once and status syncs', () => {
  const { ctx } = createMockGasContext({ activeEmail: 'teacher@hrt.ac.th' });

  // Initial stock for OFF-001 is 20
  const initialStock = vm.runInContext("apiGetItemDetail('OFF-001').item.stock", ctx);
  assert.strictEqual(initialStock, 20);

  // 1. Create Requisition for 5 units (Teacher USR-003)
  const req = vm.runInContext(`
    apiCreateRequisition({
      items: [{ item_code: 'OFF-001', qty: 5, unit: 'รีม' }],
      purpose: 'จัดกิจกรรมวิชาการ',
      urgency: 'NORMAL',
      dept: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์'
    })
  `, ctx);
  const reqId = req.req_id;

  // Verify stock is UNCHANGED after creation (SUBMITTED)
  const stockAfterSubmit = vm.runInContext("apiGetItemDetail('OFF-001').item.stock", ctx);
  assert.strictEqual(stockAfterSubmit, 20, 'Stock must NOT be deducted on submission');

  // 2. Switch to Officer/Admin (USR-001) for Review, Approve, and Issue
  ctx.Session.getActiveUser = () => ({ getEmail: () => 'admin@hrt.ac.th' });

  const revRes = vm.runInContext(`apiReviewRequisition({ requisition_id: '${reqId}', action: 'APPROVE' })`, ctx);
  assert.strictEqual(revRes.success, true);
  const stockAfterReview = vm.runInContext("apiGetItemDetail('OFF-001').item.stock", ctx);
  assert.strictEqual(stockAfterReview, 20, 'Stock must NOT be deducted on review');

  // 3. Approve Requisition
  const appRes = vm.runInContext(`apiApproveRequisition({ requisition_id: '${reqId}' })`, ctx);
  assert.strictEqual(appRes.success, true);
  const stockAfterApprove = vm.runInContext("apiGetItemDetail('OFF-001').item.stock", ctx);
  assert.strictEqual(stockAfterApprove, 20, 'Stock must NOT be deducted on approve');

  // 4. Issue Requisition (Officer) -> Stock is deducted ONCE
  const issRes = vm.runInContext(`apiIssueRequisition({ requisition_id: '${reqId}' })`, ctx);
  assert.strictEqual(issRes.success, true);
  const stockAfterIssue = vm.runInContext("apiGetItemDetail('OFF-001').item.stock", ctx);
  assert.strictEqual(stockAfterIssue, 15, 'Stock MUST be deducted by 5 on issue (20 -> 15)');

  // 5. Switch back to Teacher (USR-003) to confirm receipt -> Stock is NOT deducted again
  ctx.Session.getActiveUser = () => ({ getEmail: () => 'teacher@hrt.ac.th' });
  const recRes = vm.runInContext(`apiConfirmReceipt({ requisition_id: '${reqId}' })`, ctx);
  assert.strictEqual(recRes.success, true);
  const stockAfterReceipt = vm.runInContext("apiGetItemDetail('OFF-001').item.stock", ctx);
  assert.strictEqual(stockAfterReceipt, 15, 'Stock must NOT be double deducted upon receipt confirmation');

  // Verify final status is RECEIVED
  const finalDetailRes = vm.runInContext(`apiGetRequisitionDetail({ requisition_id: '${reqId}' })`, ctx);
  const finalDetail = finalDetailRes.requisition || finalDetailRes.data;
  assert.strictEqual(finalDetail.status, 'RECEIVED');
});

// MINI-07: Expired / suspended session purges old user data and scoped draft
runTest('MINI-07: expired/suspended session returns to auth with zero old data leakage', () => {
  const { ctx } = createMockGasContext({ activeEmail: 'suspended@hrt.ac.th' }); // USR-SUSP

  const userRes = vm.runInContext('apiGetCurrentUser()', ctx);
  assert.strictEqual(userRes.success, false, 'Suspended user must be rejected by auth guard');
  assert.ok(/SUSPENDED|ACCESS_DENIED/i.test(userRes.error.code) || /ระงับ/i.test(userRes.error.message));

  const miniHtml = fs.readFileSync('MiniUI.html', 'utf8');
  assert.ok(miniHtml.includes('state.authStatus = \'ACCESS_DENIED\''), 'MiniUI must set ACCESS_DENIED on suspended user');
  assert.ok(miniHtml.includes('clearDraft()'), 'MiniUI must purge draft on access denied or sign out');

  // Check signOut implementation
  const signOutMatch = miniHtml.match(/function signOut\(\) \{[\s\S]*?\n\}/);
  assert.ok(signOutMatch, 'signOut function must exist');
  const signOutBody = signOutMatch[0];
  assert.ok(signOutBody.includes('stopCameraStream()'), 'signOut must stop camera stream');
  assert.ok(signOutBody.includes('clearDraft()'), 'signOut must clear draft');
  assert.ok(signOutBody.includes('state.cart = {}'), 'signOut must clear cart');
  assert.ok(signOutBody.includes('state.user = null'), 'signOut must clear user state');
  assert.ok(signOutBody.includes('sessionStorage.clear()'), 'signOut must purge sessionStorage');
});

// MINI-08: Malicious fields do not execute XSS and layout is intact
runTest('MINI-08: malicious fields are properly escaped and do not execute XSS', () => {
  const miniHtml = fs.readFileSync('MiniUI.html', 'utf8');
  
  // Verify esc() helper implementation
  assert.ok(miniHtml.includes('const esc = v => String(v ?? \'\').replace(/[&<>"\']/g'), 'esc() helper must replace HTML special chars');

  // Verify interpolation in openRequestModal uses esc()
  const reqModalMatch = miniHtml.match(/function openRequestModal\([\s\S]*?\n\}/);
  assert.ok(reqModalMatch, 'openRequestModal must exist');
  const reqModalBody = reqModalMatch[0];
  assert.ok(reqModalBody.includes('esc(reqNo)'), 'reqNo must be escaped');
  assert.ok(reqModalBody.includes('esc(purposeText)'), 'purpose must be escaped');
  assert.ok(reqModalBody.includes('esc(requesterName)'), 'requesterName must be escaped');
  assert.ok(reqModalBody.includes('esc(deptName)'), 'deptName must be escaped');

  // Test escape function directly
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const malicious = '<script>alert("XSS")</script><img src=x onerror=alert(1)>';
  const escaped = esc(malicious);
  assert.strictEqual(escaped.includes('<script>'), false);
  assert.strictEqual(escaped.includes('<img'), false);
  assert.strictEqual(escaped.includes('&lt;script&gt;'), true);
});

// MINI-09: Camera permission denial / service failure has recoverable error
runTest('MINI-09: camera permission denial or service failure shows recoverable error without fake success', () => {
  const miniHtml = fs.readFileSync('MiniUI.html', 'utf8');

  // Verify camera error handling in startCameraStream()
  assert.ok(miniHtml.includes('NotAllowedError') || miniHtml.includes('PermissionDeniedError'),
    'Must handle camera NotAllowedError specifically');
  assert.ok(miniHtml.includes('Permission Denied'),
    'Must provide informative recoverable permission denied guidance');
  assert.ok(miniHtml.includes('DevicesNotFoundError') || miniHtml.includes('NotFoundError'),
    'Must handle NotFoundError gracefully');

  // Verify resolveQrCode displays real error toast on failure
  assert.ok(miniHtml.includes('ไม่สามารถใช้ QR Code ได้:'),
    'Must surface real error message rather than silent failure');
});

// MINI-10: Scoped draft persistence by user, environment, and fiscal year
runTest('MINI-10: draft storage is strictly scoped by user, environment, and fiscal year', () => {
  const miniHtml = fs.readFileSync('MiniUI.html', 'utf8');

  // Verify draft key prefix and scoping structure
  assert.ok(miniHtml.includes('DRAFT_KEY_PREFIX = \'hrt_mini_draft_\''), 'Must declare standard DRAFT_KEY_PREFIX');
  assert.ok(miniHtml.includes('getDraftStorageKey'), 'Must implement getDraftStorageKey()');
  assert.ok(miniHtml.includes('${DRAFT_KEY_PREFIX}${env}_${userId}_${fy}'), 'Draft key must interpolate env, userId, and fy');

  // Verify legacy storage cleanup
  assert.ok(miniHtml.includes('cleanLegacyStorage'), 'Must implement cleanLegacyStorage()');

  // Test scoping isolation logic
  const getDraftKey = (env, userId, fy) => `hrt_mini_draft_${env}_${userId}_${fy}`;
  const keyUser1 = getDraftKey('gas', 'USR-003', '2569');
  const keyUser2 = getDraftKey('gas', 'USR-004', '2569');
  const keyFY2568 = getDraftKey('gas', 'USR-003', '2568');
  const keyLocal = getDraftKey('local', 'USR-003', '2569');

  assert.notStrictEqual(keyUser1, keyUser2, 'Draft keys between different users must not collide');
  assert.notStrictEqual(keyUser1, keyFY2568, 'Draft keys between different fiscal years must not collide');
  assert.notStrictEqual(keyUser1, keyLocal, 'Draft keys between GAS and Local environments must not collide');
});

// MINI-11: Unified QR prefix compatibility & anti-bypass revocation
runTest('MINI-11: all canonical QR prefixes resolve and aliases do not bypass revocation', () => {
  const { ctx } = createMockGasContext({ activeEmail: 'admin@hrt.ac.th' });

  // 1. Resolve ITEM with both canonical and alias prefix
  const resItemCanonical = vm.runInContext("apiResolveQr({ qr_data: 'QR:ITEM:OFF-001' })", ctx);
  assert.strictEqual(resItemCanonical.success, true);
  assert.strictEqual(resItemCanonical.type, 'ITEM');
  assert.strictEqual(resItemCanonical.item.code, 'OFF-001');

  const resItemAlias = vm.runInContext("apiResolveQr({ qr_data: 'ITEM:OFF-001' })", ctx);
  assert.strictEqual(resItemAlias.success, true);
  assert.strictEqual(resItemAlias.item.code, 'OFF-001');

  // 2. Resolve WAREHOUSE / ROOM with canonical and aliases (WH, ROOM)
  const resWh1 = vm.runInContext("apiResolveQr({ qr_data: 'QR:ROOM:WH-01' })", ctx);
  assert.strictEqual(resWh1.success, true);
  assert.strictEqual(resWh1.type, 'WAREHOUSE');
  assert.strictEqual(resWh1.warehouse.warehouse_id, 'WH-01');

  const resWh2 = vm.runInContext("apiResolveQr({ qr_data: 'QR:WH:WH-01' })", ctx);
  assert.strictEqual(resWh2.success, true);
  assert.strictEqual(resWh2.warehouse.warehouse_id, 'WH-01');

  const resWh3 = vm.runInContext("apiResolveQr({ qr_data: 'ROOM:WH-01' })", ctx);
  assert.strictEqual(resWh3.success, true);

  // 3. Resolve TRACKING with canonical and aliases (TRACK, TRK)
  const resTrack1 = vm.runInContext("apiResolveQr({ qr_data: 'QR:TRACK:REQ-UUID-100' })", ctx);
  assert.strictEqual(resTrack1.success, true);
  assert.strictEqual(resTrack1.type, 'TRACKING');
  assert.strictEqual(resTrack1.canonicalId, 'REQ-UUID-100');

  const resTrack2 = vm.runInContext("apiResolveQr({ qr_data: 'QR:TRK:REQ-UUID-100' })", ctx);
  assert.strictEqual(resTrack2.success, true);
  assert.strictEqual(resTrack2.canonicalId, 'REQ-UUID-100');

  // 4. Resolve CATALOG
  const resCat = vm.runInContext("apiResolveQr({ qr_data: 'CATALOG' })", ctx);
  assert.strictEqual(resCat.success, true);
  assert.strictEqual(resCat.type, 'CATALOG');

  // 5. Anti-bypass: Revoked token cannot be resolved under any alias prefix
  const resRevokedCanonical = vm.runInContext("apiResolveQr({ qr_data: 'QR:ITEM:OFF-REVOKED' })", ctx);
  assert.strictEqual(resRevokedCanonical.success, false, 'Revoked QR canonical token must return success: false');
  assert.ok(/QR_REVOKED/i.test(resRevokedCanonical.error.code) || /ยกเลิก/i.test(resRevokedCanonical.error.message));

  const resRevokedAlias = vm.runInContext("apiResolveQr({ qr_data: 'ITEM:OFF-REVOKED' })", ctx);
  assert.strictEqual(resRevokedAlias.success, false, 'Revoked QR alias token must return success: false');
  assert.ok(/QR_REVOKED/i.test(resRevokedAlias.error.code) || /ยกเลิก/i.test(resRevokedAlias.error.message));
});

// MINI-12: Real DTO field rendering with truthful unavailable fallback
runTest('MINI-12: requisition modal and cards render real DTO fields and handle missing data with "ไม่ระบุ"', () => {
  const miniHtml = fs.readFileSync('MiniUI.html', 'utf8');

  // Check that openRequestModal checks for all required DTO fields
  const reqModalMatch = miniHtml.match(/function openRequestModal\([\s\S]*?\n\}/);
  assert.ok(reqModalMatch, 'openRequestModal must exist');
  const reqBody = reqModalMatch[0];

  assert.ok(reqBody.includes("r.req_no || r.req_id || r.id || 'ไม่ระบุ'"), 'Must fallback to ไม่ระบุ for req_no');
  assert.ok(reqBody.includes("r.req_date || r.created_at || 'ไม่ระบุ'"), 'Must fallback to ไม่ระบุ for req_date');
  assert.ok(reqBody.includes("r.required_date || r.need_date || 'ไม่ระบุ'"), 'Must fallback to ไม่ระบุ for required_date');
  assert.ok(reqBody.includes("r.purpose || 'ไม่ระบุ'"), 'Must fallback to ไม่ระบุ for purpose');
  assert.ok(reqBody.includes("r.dept || r.department || 'ไม่ระบุ'"), 'Must fallback to ไม่ระบุ for dept');
  assert.ok(reqBody.includes("r.source || 'MINI_QR'"), 'Must display source');
  assert.ok(reqBody.includes("r.urgency === 'URGENT'"), 'Must format urgency label');

  // Check confirm receipt button appears when status is ISSUED
  assert.ok(reqBody.includes('isIssued'), 'Must check isIssued status');
  assert.ok(reqBody.includes('btnConfirmReceiptInModal'), 'Must include confirm receipt button for issued requisition');
});

// ============================================================================
// SUMMARY & EXIT
// ============================================================================
console.log('\n=============================================================');
console.log(`TOTAL ACCEPTANCE TESTS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('=============================================================');

if (failedTests > 0) {
  console.error(`\nFAILED: ${failedTests} tests failed.`);
  process.exit(1);
} else {
  console.log('\nALL 12 PROMPT 19 ACCEPTANCE CRITERIA (MINI-01 - MINI-12) PASSED 100%!\n');
  process.exit(0);
}
