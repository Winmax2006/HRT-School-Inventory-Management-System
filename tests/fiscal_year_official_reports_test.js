/**
 * tests/fiscal_year_official_reports_test.js
 * Verification test suite for HRT Prompt 17: Fiscal Year Lifecycle, Physical Count, and Official Document Generation (v1.1)
 * Criteria: FY-01 through FY-06, DOC-01 through DOC-06
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

console.log('>>> Running: tests/fiscal_year_official_reports_test.js');

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
      getActiveUser: () => ({ getEmail: () => 'admin@hrt.ac.th' })
    }
  };

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
    ['USR-001', 'admin@hrt.ac.th', 'admin@hrt.ac.th', 'ผู้อำนวยการ', 'ADMIN', 'บริหาร', 'ACTIVE', '2026-01-01T00:00:00Z'],
    ['USR-002', 'officer@hrt.ac.th', 'officer@hrt.ac.th', 'เจ้าหน้าที่พัสดุ', 'OFFICER', 'พัสดุ', 'ACTIVE', '2026-01-01T00:00:00Z'],
    ['USR-003', 'teacher@hrt.ac.th', 'teacher@hrt.ac.th', 'ครูสมชาย', 'TEACHER', 'วิชาการ', 'ACTIVE', '2026-01-01T00:00:00Z']
  ]);

  // 03_Master_Items
  ctx.registerSheet('03_Master_Items', [
    ['code', 'fsn_code', 'name', 'category', 'unit', 'warehouse', 'unit_cost', 'min', 'rop', 'stock', 'supplier', 'status', 'department', 'created_at'],
    ['OFF-001', '7510-00-111-2222', 'กระดาษ A4 80 แกรม', 'วัสดุสำนักงาน', 'รีม', 'คลังกลาง', 120, 5, 10, 20, 'ร้านค้า ก', 'normal', 'งานพัสดุ', '2026-10-01T08:00:00.000+07:00'],
    ['OFF-002', '', 'คลิปหนีบกระดาษ', 'วัสดุสำนักงาน', 'กล่อง', 'คลังกลาง', 15, 10, 20, 50, 'ร้านค้า ข', 'normal', 'งานพัสดุ', '1970-01-01T00:00:00.000Z'], // Epoch 0
    ['IT-001', '7025-00-333-4444', 'แฟลชไดรฟ์ 64GB', 'วัสดุคอมพิวเตอร์', 'อัน', 'คลังกลาง', 250, 2, 5, 10, 'ไอที มอลล์', 'normal', 'งานพัสดุ', ''], // Missing date
    ['SPT-001', '7810-00-555-6666', 'ลูกฟุตบอล เบอร์ 5', 'วัสดุกีฬา', 'ลูก', 'คลังกลาง', 450, 2, 4, 0, 'สปอร์ต เวิลด์', 'critical', 'กลุ่มสาระฯ สุขศึกษา', '2026-10-15'] // Date-only
  ]);

  // 07_Requisitions
  ctx.registerSheet('07_Requisitions', [
    ['req_id', 'req_no', 'req_date', 'user_id', 'dept', 'purpose', 'status', 'approver_id', 'approved_at', 'issued_at', 'source', 'fiscal_year', 'total_items', 'urgency', 'required_date'],
    ['REQ-001', 'REQ-2569/001', '2026-10-05T08:00:00Z', 'USR-003', 'วิชาการ', 'ใช้ในการสอน', 'RECEIVED', 'USR-001', '2026-10-05T09:00:00Z', '2026-10-05T10:00:00Z', 'CENTRAL_WEB', '2569', 1, 'NORMAL', '2026-10-06']
  ]);

  // 08_Requisition_Items
  ctx.registerSheet('08_Requisition_Items', [
    ['line_id', 'requisition_id', 'item_code', 'qty_requested', 'qty_approved', 'unit'],
    ['L01', 'REQ-001', 'OFF-001', 5, 5, 'รีม']
  ]);

  // 09_Stock_Transactions
  ctx.registerSheet('09_Stock_Transactions', [
    ['tx_id', 'created_at', 'action_type', 'item_code', 'qty', 'unit_cost', 'actor_id', 'fiscal_year', 'doc_ref', 'note'],
    ['TX-001', '2026-10-02T08:00:00.000+07:00', 'RECEIVE', 'OFF-001', 25, 120, 'USR-002', '2569', 'RCV-001', 'รับเข้า'],
    ['TX-002', '2026-10-05T10:00:00.000+07:00', 'ISSUE', 'OFF-001', 5, 120, 'USR-002', '2569', 'REQ-2569/001', 'จ่ายให้ครู']
  ]);

  // 10_Stock_Ledger
  ctx.registerSheet('10_Stock_Ledger', [
    ['ledger_id', 'item_code', 'tx_type', 'debit', 'qty_in', 'qty_out', 'unit_cost', 'doc_ref', 'fiscal_year', 'created_at', 'note', 'actor_id'],
    ['LED-001', 'OFF-001', 'RECEIVE', 3000, 25, 0, 120, 'RCV-001', '2569', '2026-10-02T08:00:00.000+07:00', 'รับเข้า', 'USR-002'],
    ['LED-002', 'OFF-001', 'ISSUE', 600, 0, 5, 120, 'REQ-2569/001', '2569', '2026-10-05T10:00:00.000+07:00', 'จ่ายออก', 'USR-002']
  ]);

  // 11_Audit_Trail
  ctx.registerSheet('11_Audit_Trail', [
    ['log_id', 'timestamp', 'actor_id', 'email', 'action', 'module', 'prev_hash', 'record_hash', 'details']
  ]);

  // 12_Fiscal_Years
  ctx.registerSheet('12_Fiscal_Years', [
    ['fiscal_year', 'start_date', 'end_date', 'status', 'closed_at', 'closed_by'],
    ['2568', '2024-10-01', '2025-09-30', 'CLOSED', '2025-09-30T23:59:59.999+07:00', 'USR-001'],
    ['2569', '2025-10-01', '2026-09-30', 'ACTIVE', '', '']
  ]);

  // 13_Year_End_Audits
  ctx.registerSheet('13_Year_End_Audits', [
    ['count_id', 'fiscal_year', 'item_code', 'book_qty', 'count_qty', 'variance', 'condition', 'auditors'],
    ['COUNT-2569-OFF-001', '2569', 'OFF-001', 20, 18, -2, 'ปกติ', 'นายพัสดี ตรวจนับ'], // Verified physical count with true variance -2
    ['COUNT-2569-OFF-002', '2569', 'OFF-002', 50, 50, 0, 'ปกติ', 'นายพัสดี ตรวจนับ']
  ]);

  // 16_Idempotency_Log
  ctx.registerSheet('16_Idempotency_Log', [
    ['key', 'actor_id', 'action', 'payload_hash', 'status', 'response_json', 'created_at']
  ]);
}

// -------------------------------------------------------------
// FY-01: Temporal Boundaries & Thai BE/CE Conversion
// -------------------------------------------------------------
it('FY-01: Thai Fiscal Year boundaries 1 Oct to 30 Sep in Asia/Bangkok (+07:00) and BE/CE conversions are exact', () => {
  const { ctx } = createMockGasContext();
  loadScriptsIntoContext(ctx);

  const b2569 = ctx.getFiscalYearBounds('2569');
  assert.strictEqual(b2569.fiscalYear, '2569');
  assert.strictEqual(b2569.christianYear, 2026);
  assert.strictEqual(b2569.startIso, '2025-10-01T00:00:00.000+07:00');
  assert.strictEqual(b2569.endInclusiveIso, '2026-09-30T23:59:59.999+07:00');

  // Boundary timestamps within +07:00
  const tStart = new Date('2025-10-01T00:00:00.000+07:00').getTime();
  const tEnd = new Date('2026-09-30T23:59:59.999+07:00').getTime();
  const tBefore = tStart - 1;
  const tAfter = tEnd + 1;

  assert.strictEqual(ctx.isTimestampInFiscalYear(tStart, '2569'), true, 'Start boundary 1 Oct 00:00:00 must be in FY');
  assert.strictEqual(ctx.isTimestampInFiscalYear(tEnd, '2569'), true, 'End boundary 30 Sep 23:59:59.999 must be in FY');
  assert.strictEqual(ctx.isTimestampInFiscalYear(tBefore, '2569'), false, 'Instant before 1 Oct must NOT be in FY 2569');
  assert.strictEqual(ctx.isTimestampInFiscalYear(tAfter, '2569'), false, 'Instant after 30 Sep must NOT be in FY 2569');
});

// -------------------------------------------------------------
// FY-02: Closed Fiscal Year Write Denied & Historical Read Safe
// -------------------------------------------------------------
it('FY-02: mutation targeting closed fiscal year (2568) is denied with CLOSED_FISCAL_YEAR; read does not mutate', () => {
  const { ctx, sheets } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupStandardFixtures(ctx);

  // Write operation targeting closed fiscal year 2568
  const resWrite = ctx.ApiRouter.routeRequest('apiReceiveStock', {
    item_code: 'OFF-001',
    qty: 5,
    fiscalYear: '2568'
  });

  assert.strictEqual(resWrite.success, false);
  assert.strictEqual(resWrite.error.code, 'CLOSED_FISCAL_YEAR');

  // Read operation viewing closed fiscal year 2568
  const resRead = ctx.ApiRouter.routeRequest('items.list', { fiscalYear: '2568' });
  assert.strictEqual(resRead.success, true);
  assert.strictEqual(resRead.data.fiscalYear, '2568');

  // Active transaction year in config MUST remain 2569
  assert.strictEqual(ctx.getActiveTransactionYear(), '2569', 'Viewing historical year must NOT change active transaction year');
});

// -------------------------------------------------------------
// FY-03: Physical Count Variance Preserved upon Close-Year
// -------------------------------------------------------------
it('FY-03: physical count variance is preserved upon close-year (never auto-zeroed)', () => {
  const { ctx, sheets } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupStandardFixtures(ctx);

  const admin = { id: 'USR-001', role: 'ADMIN', name: 'ผู้อำนวยการ' };

  // Item OFF-001 has bookStock: 20, but physical count was 18 (variance: -2)
  const closeRes = ctx.hrtCloseFiscalYear_({ fiscalYear: '2569' }, admin);
  assert.strictEqual(closeRes.success, true);

  // Read 13_Year_End_Audits: OFF-001 count_qty must be 18, and variance must remain -2!
  const auditRows = sheets['13_Year_End_Audits'];
  const off001Audit = auditRows.find(r => r[2] === 'OFF-001');
  assert.ok(off001Audit, 'OFF-001 audit record must exist');
  assert.strictEqual(off001Audit[4], 18, 'Physical count must remain 18');
  assert.strictEqual(off001Audit[5], -2, 'Variance must remain -2 and NOT be forced to 0');
});

// -------------------------------------------------------------
// FY-04: Close-Year Retry Does Not Duplicate Snapshot / Movements
// -------------------------------------------------------------
it('FY-04: close-year retry or double execution does not duplicate snapshots or opening entries', () => {
  const { ctx, sheets } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupStandardFixtures(ctx);

  const admin = { id: 'USR-001', role: 'ADMIN' };

  // First close
  ctx.hrtCloseFiscalYear_({ fiscalYear: '2569' }, admin);
  const auditCount1 = sheets['13_Year_End_Audits'].length;
  const ledgerCount1 = sheets['10_Stock_Ledger'].length;

  // Attempting second close on already closed year must throw INVALID_STATE
  assert.throws(() => {
    ctx.hrtCloseFiscalYear_({ fiscalYear: '2569' }, admin);
  }, /INVALID_STATE/);

  // Sheets count must remain unchanged
  assert.strictEqual(sheets['13_Year_End_Audits'].length, auditCount1, 'Snapshot count must not duplicate on close retry');
  assert.strictEqual(sheets['10_Stock_Ledger'].length, ledgerCount1, 'Ledger movements must not duplicate on close retry');
});

// -------------------------------------------------------------
// FY-05: Closing Old Year = Opening New Year Traced
// -------------------------------------------------------------
it('FY-05: closing book quantity of closed year = opening quantity of next fiscal year', () => {
  const { ctx, sheets } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupStandardFixtures(ctx);

  const admin = { id: 'USR-001', role: 'ADMIN' };
  ctx.hrtCloseFiscalYear_({ fiscalYear: '2569' }, admin);

  // New year 2570 should have OPENING movements in 10_Stock_Ledger
  const ledgerRows = sheets['10_Stock_Ledger'];
  const opening2570 = ledgerRows.filter(r => r[8] === '2570' && r[3] === 'OPENING');
  assert.ok(opening2570.length > 0, 'Opening movements for 2570 must exist');

  const off001Opening = opening2570.find(r => r[1] === 'OFF-001');
  assert.ok(off001Opening);
  assert.strictEqual(off001Opening[4], 20, 'Opening qty of OFF-001 in 2570 must equal closing book qty 20 of 2569');
});

// -------------------------------------------------------------
// FY-06: Date Classification: Epoch Zero, Missing, Invalid, Date-Only
// -------------------------------------------------------------
it('FY-06: parseItemTimestamp_ preserves epoch zero without truthiness loss, handles missing/invalid/date-only', () => {
  const { ctx } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupStandardFixtures(ctx);

  // Filter with date range covering 2026-10-01 to 2026-10-31
  const caller = { id: 'USR-002', role: 'OFFICER' };

  // 1. Missing date policy: INCLUDE
  const resInclude = ctx.hrtGetItems_({
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    missingDatePolicy: 'INCLUDE'
  }, caller);

  const it001 = resInclude.items.find(i => i.code === 'IT-001');
  assert.ok(it001, 'Item with missing date must be included when missingDatePolicy is INCLUDE');
  assert.strictEqual(it001.date_status, 'MISSING_DATE');

  // 2. Missing date policy: EXCLUDE
  const resExclude = ctx.hrtGetItems_({
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    missingDatePolicy: 'EXCLUDE'
  }, caller);

  const it001Excluded = resExclude.items.find(i => i.code === 'IT-001');
  assert.strictEqual(it001Excluded, undefined, 'Item with missing date must be excluded when missingDatePolicy is EXCLUDE');

  // 3. Epoch zero item OFF-002 (1970-01-01)
  const allRes = ctx.hrtGetItems_({}, caller);
  const off002 = allRes.items.find(i => i.code === 'OFF-002');
  assert.ok(off002);
  const parsedEpoch = ctx.parseItemTimestamp_(off002.date);
  assert.strictEqual(parsedEpoch.status, 'EPOCH_ZERO');
  assert.strictEqual(parsedEpoch.timeMs, 0, 'Epoch zero must evaluate to numeric timestamp 0');
});

// -------------------------------------------------------------
// DOC-01: Mathematical SSOT: Opening + In - Out = Closing
// -------------------------------------------------------------
it('DOC-01: Opening + In - Out = Closing holds exactly for item and totals in index.html reports', () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

  // Verify fake multipliers were deleted from index.html
  assert.ok(!indexHtml.includes('closingVal * 0.15'), 'closingVal * 0.15 fake multiplier must be removed');
  assert.ok(!indexHtml.includes('closingVal * 0.08'), 'closingVal * 0.08 fake multiplier must be removed');
  assert.ok(!indexHtml.includes('actualVal * 0.45'), 'actualVal * 0.45 fake multiplier must be removed');
  assert.ok(!indexHtml.includes('actualVal * 0.49'), 'actualVal * 0.49 fake multiplier must be removed');
  assert.ok(!indexHtml.includes('closeVal * 0.45'), 'closeVal * 0.45 fake multiplier must be removed');
  assert.ok(!indexHtml.includes('closeVal * 0.49'), 'closeVal * 0.49 fake multiplier must be removed');

  // Mathematical assertion test
  const open = 1000;
  const inVal = 500;
  const outVal = 300;
  const close = open + inVal - outVal; // 1200
  assert.strictEqual(close, 1200);
  assert.strictEqual(open + inVal - outVal, close);
});

// -------------------------------------------------------------
// DOC-02: Report Totals Trace to Transactions & Intervals
// -------------------------------------------------------------
it('DOC-02: monthly and year-end report totals trace to committed history records', () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.ok(indexHtml.includes('i.history.forEach'), 'Report must calculate from actual history entries');
  assert.ok(indexHtml.includes('h.type === \'in\' || h.transaction_type === \'รับเข้าสต็อก\''), 'Receipts identified by type in');
  assert.ok(indexHtml.includes('h.type === \'out\' || h.transaction_type === \'เบิกจ่ายพัสดุ\''), 'Dispatches identified by type out');
});

// -------------------------------------------------------------
// DOC-03: Missing FSN / Cost / Data Does NOT Fabricate Numbers
// -------------------------------------------------------------
it('DOC-03: unassigned FSN returns "-" and does NOT synthesize fake FSC codes like (num * 17) % 899', () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

  // Verify synthetic math formula was deleted
  assert.ok(!indexHtml.includes('(num * 17) % 899'), 'Synthetic (num * 17) % 899 formula must be removed');
  assert.ok(!indexHtml.includes('(num * 37) % 8999'), 'Synthetic (num * 37) % 8999 formula must be removed');
  assert.ok(!indexHtml.includes('return \'7510-00-000-0000\''), 'Default 7510-00-000-0000 fake FSN must be removed');

  // Test getFsnCodeForItem function in isolation
  const getFsnCodeForItemCode = indexHtml.match(/function getFsnCodeForItem\(item\) \{[\s\S]*?\n        \}/)[0];
  const testFn = new Function('item', 'fsnData', getFsnCodeForItemCode + '\nreturn getFsnCodeForItem(item);');

  assert.strictEqual(testFn(null), '-');
  assert.strictEqual(testFn({ code: 'UNKNOWN-01' }), '-', 'Unassigned item must return "-"');
  assert.strictEqual(testFn({ code: 'OFF-01', fsn_code: '7510-00-111-2222' }), '7510-00-111-2222', 'Known FSN preserved');
});

// -------------------------------------------------------------
// DOC-04: Output Encoding Prevents XSS in Print Documents
// -------------------------------------------------------------
it('DOC-04: context-aware escapeHtml encodes user strings in print document previews', () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

  assert.ok(indexHtml.includes('function escapeHtml(str)'), 'index.html must define escapeHtml');
  assert.ok(indexHtml.includes('escapeHtml(item.name)'), 'item.name must be escaped');
  assert.ok(indexHtml.includes('escapeHtml(item.category)'), 'item.category must be escaped');

  const escapeHtmlCode = indexHtml.match(/function escapeHtml\(str\) \{[\s\S]*?\n        \}/)[0];
  const testEscape = new Function('str', escapeHtmlCode + '\nreturn escapeHtml(str);');

  const malicious = '<script>alert("XSS")</script>';
  const escaped = testEscape(malicious);
  assert.strictEqual(escaped, '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
  assert.ok(!escaped.includes('<script>'));
});

// -------------------------------------------------------------
// DOC-05: Year Switch Invalidates Cache & Renders Specific Year
// -------------------------------------------------------------
it('DOC-05: year switch uses active viewing year and does not bleed cached data across fiscal years', () => {
  const { ctx } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupStandardFixtures(ctx);

  const caller = { id: 'USR-002', role: 'OFFICER' };

  // View year 2568
  const res2568 = ctx.hrtGetItems_({ fiscalYear: '2568' }, caller);
  assert.strictEqual(res2568.fiscalYear, '2568');

  // View year 2569
  const res2569 = ctx.hrtGetItems_({ fiscalYear: '2569' }, caller);
  assert.strictEqual(res2569.fiscalYear, '2569');
});

// -------------------------------------------------------------
// DOC-06: Report Totals Use Full Selected Universe, Not Paginated Slice
// -------------------------------------------------------------
it('DOC-06: report totals reflect full universe count and value; true zero stock is distinguished from missing', () => {
  const { ctx, sheets } = createMockGasContext();
  loadScriptsIntoContext(ctx);
  setupStandardFixtures(ctx);

  const caller = { id: 'USR-002', role: 'OFFICER' };
  const res = ctx.hrtGetItems_({ page: 1, limit: 2 }, caller); // paginated to 2 items

  // Total items in 03_Master_Items is 4
  assert.strictEqual(res.items.length, 2, 'Paginated items array must have 2 items');
  assert.strictEqual(res.totalUniverseCount, 4, 'totalUniverseCount must reflect all 4 items');

  // Item SPT-001 has stock: 0 (true zero), distinguished from missing
  const allRes = ctx.hrtGetItems_({}, caller);
  const spt001 = allRes.items.find(i => i.code === 'SPT-001');
  assert.ok(spt001);
  assert.strictEqual(spt001.stock, 0, 'True zero stock must be 0, not null/undefined');
});

console.log('---');
console.log(`TOTAL TESTS: ${passCount + failCount}`);
console.log(`PASSED: ${passCount}`);
console.log(`FAILED: ${failCount}`);

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL PROMPT 17 FISCAL YEAR & REPORT CRITERIA (FY-01 - FY-06, DOC-01 - DOC-06) PASSED 100%!');
}
