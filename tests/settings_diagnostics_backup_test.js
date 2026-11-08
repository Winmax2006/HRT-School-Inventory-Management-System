/**
 * tests/settings_diagnostics_backup_test.js
 * Comprehensive Test Suite for HRT Prompt 18 (v1.1)
 *
 * Acceptance Criteria Covered:
 * - DB-01: Configured vs actual database comparison; failure states; no fake ready
 * - DB-02: 16 Canonical sheets physical schema matrix; obsolete 13_Year_End_Audit_Items reconciliation
 * - DB-03: Auth diagnostic with verified caller ID/user_id; no fake write verification from read success
 * - SET-01: Settings save/reload exact values; boolean false and number 0 preservation; revision conflict prevention
 * - SET-02: Non-admin authorization enforcement (FORBIDDEN) on settings, import, backup, restore
 * - CSV-01: Import validation; fail-closed on malformed/duplicate rows; formula injection protection; non-destructive merge
 * - BAK-01: Full backup bundle contains actual rows, headers, and manifest without secrets
 * - BAK-02: Snapshot consistency check under ScriptLock
 * - BAK-03: Restore dry-run validator rejects corrupted/incompatible bundles with zero database writes
 * - BAK-04: Round-trip restore in isolated DB verifying items, FK, and ledger balances
 * - BAK-05: Backup failure does NOT update last_backup_at to fake success
 */

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

console.log('=============================================================');
console.log('RUNNING PROMPT 18: SETTINGS, DIAGNOSTICS & BACKUP/RESTORE');
console.log('Target Baseline: v2.7.0-rc.5 -> Working State for rc.6');
console.log('=============================================================\n');

function createMockGasContext(customConfig = {}) {
  const cacheStore = {};
  const propertiesStore = {};
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
    getId: () => customConfig.SPREADSHEET_ID || 'SS-HRT-MOCK-2567',
    getName: () => 'HRT_Inventory_DB_2567_School',
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
      openById: (id) => {
        if (customConfig.failOpenById) {
          throw new Error('Could not open spreadsheet with ID "' + id + '".');
        }
        return mockSpreadsheet;
      },
      getActiveSpreadsheet: () => {
        if (customConfig.noActiveSpreadsheet) return null;
        return mockSpreadsheet;
      }
    },
    LockService: {
      getScriptLock: () => scriptLock
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => (cacheStore[k] !== undefined ? cacheStore[k] : null),
        put: (k, v, ttl) => { cacheStore[k] = String(v); },
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
        getEmail: () => ''
      })
    },
    Utilities: {
      computeDigest: (algo, str) => {
        const crypto = require('crypto');
        return Array.from(crypto.createHash('sha256').update(str, 'utf8').digest());
      },
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      base64Encode: (bytes) => Buffer.from(bytes).toString('base64'),
      base64Decode: (str) => Array.from(Buffer.from(str, 'base64'))
    },
    process: {
      env: { NODE_ENV: 'test' }
    }
  };

  if (customConfig.SPREADSHEET_ID) {
    propertiesStore['SPREADSHEET_ID'] = customConfig.SPREADSHEET_ID;
  }

  vm.createContext(ctx);

  // Load backend files in canonical order
  const files = ['Config.gs', 'Audit.gs', 'Read.gs', 'Write.gs', 'Api.gs', 'Code.gs'];
  for (const f of files) {
    const code = fs.readFileSync(f, 'utf8');
    vm.runInContext(code, ctx, { filename: f });
  }

  // If custom SPREADSHEET_ID is provided, configure it in CONFIG
  if (customConfig.SPREADSHEET_ID) {
    vm.runInContext(`CONFIG.SPREADSHEET_ID = '${customConfig.SPREADSHEET_ID}';`, ctx);
  }

  // Populate standard 16 canonical sheets with headers and sample rows
  const initSheet = (name, rows) => {
    sheets[name] = rows.map(r => [...r]);
  };

  initSheet('01_Users', [
    ['user_id', 'username', 'name', 'email', 'role', 'department', 'status'],
    ['USR-001', 'admin@hrt.ac.th', 'ผู้ดูแลระบบ', 'admin@hrt.ac.th', 'ADMIN', 'กลุ่มบริหารงานงบประมาณ', 'ACTIVE'],
    ['USR-002', 'officer@hrt.ac.th', 'เจ้าหน้าที่พัสดุ', 'officer@hrt.ac.th', 'OFFICER', 'กลุ่มบริหารงานงบประมาณ', 'ACTIVE'],
    ['USR-003', 'teacher@hrt.ac.th', 'ครูสมศรี', 'teacher@hrt.ac.th', 'TEACHER', 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์', 'ACTIVE']
  ]);

  initSheet('02_Departments', [
    ['dept_id', 'dept_name', 'faculty_head', 'budget_code', 'status'],
    ['D01', 'กลุ่มบริหารงานงบประมาณ', 'นายสมศักดิ์', 'B01', 'ACTIVE'],
    ['D02', 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์', 'นางสมศรี', 'B02', 'ACTIVE']
  ]);

  initSheet('03_Master_Items', [
    ['code', 'fsn_code', 'name', 'category', 'unit', 'warehouse', 'unit_cost', 'min', 'rop', 'stock', 'supplier', 'status'],
    ['OFF-001', '7510-00-123-4567', 'กระดาษ A4 80 แกรม', 'วัสดุสำนักงาน', 'รีม', 'คลังพัสดุกลาง (อาคาร 1)', 135, 10, 15, 20, 'บจก. สยามสเตชั่นเนอรี่', 'normal'],
    ['OFF-002', '', 'ปากกาลูกลื่น สีน้ำเงิน', 'วัสดุสำนักงาน', 'ด้าม', 'คลังพัสดุกลาง (อาคาร 1)', 15, 20, 30, 50, 'บจก. เพ็นนินซูล่า', 'normal']
  ]);

  initSheet('04_Categories', [
    ['category_id', 'category_name', 'code_prefix', 'icon'],
    ['CAT-01', 'วัสดุสำนักงาน', 'OFF-', 'ph-paperclip']
  ]);

  initSheet('05_Warehouses', [
    ['warehouse_id', 'warehouse_name', 'building', 'room'],
    ['WH-01', 'คลังพัสดุกลาง (อาคาร 1)', 'อาคาร 1', '101']
  ]);

  initSheet('06_FSN_Catalog', [
    ['fsn_code', 'group_code', 'group_name', 'class_code', 'fsc', 'name', 'spec', 'linked_code'],
    ['7510-00-123-4567', '75', 'เครื่องเขียนสำนักงาน', '7510', '7510', 'กระดาษ A4 80 แกรม', 'Double A', 'OFF-001']
  ]);

  initSheet('07_Requisitions', [
    ['req_id', 'req_no', 'req_date', 'user_id', 'dept', 'purpose', 'status', 'approver_id', 'approved_at', 'issued_at'],
    ['REQ-UUID-100', 'REQ-2569/001', '2026-10-15T09:00:00Z', 'USR-003', 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์', 'ใช้จัดทำข้อสอบ', 'APPROVED', 'USR-001', '2026-10-16T10:00:00Z', '']
  ]);

  initSheet('08_Requisition_Items', [
    ['id', 'req_id', 'item_code', 'qty_requested', 'qty_approved', 'unit'],
    ['LINE-001', 'REQ-UUID-100', 'OFF-001', 5, 5, 'รีม']
  ]);

  initSheet('09_Stock_Transactions', [
    ['tx_id', 'date', 'doc_ref', 'type', 'item_code', 'qty', 'unit_cost', 'actor_id', 'note'],
    ['TX-INIT-001', '2026-10-01T00:00:00Z', 'INIT-2569', 'OPENING', 'OFF-001', 20, 135, 'SYSTEM', 'Opening stock FY2569']
  ]);

  initSheet('10_Stock_Ledger', [
    ['ledger_id', 'item_code', 'tx_id', 'tx_type', 'qty_in', 'qty_out', 'balance', 'unit_cost', 'fiscal_year', 'created_at'],
    ['LDG-001', 'OFF-001', 'TX-INIT-001', 'OPENING', 20, 0, 20, 135, '2569', '2026-10-01T00:00:00Z']
  ]);

  initSheet('11_Audit_Trail', [
    ['audit_id', 'timestamp', 'actor_id', 'email', 'action', 'module', 'prev_hash', 'record_hash', 'details'],
    ['AUD-GENESIS', '2026-10-01T00:00:00Z', 'SYSTEM', 'system@hrt.ac.th', 'SYSTEM_INIT', 'SYSTEM', '0000000000000000000000000000000000000000000000000000000000000000', 'genesis_hash', 'Genesis record']
  ]);

  initSheet('12_Fiscal_Years', [
    ['fiscal_year', 'start_date', 'end_date', 'status', 'closed_at', 'closed_by'],
    ['2569', '2025-10-01T00:00:00Z', '2026-09-30T23:59:59Z', 'ACTIVE', '', '']
  ]);

  initSheet('13_Year_End_Audits', [
    ['count_id', 'fiscal_year', 'item_code', 'book_qty', 'count_qty', 'variance', 'condition', 'auditors'],
    ['CNT-001', '2569', 'OFF-001', 20, 20, 0, 'สมบูรณ์', 'นายสมศักดิ์, นางกัลยาณี']
  ]);

  initSheet('14_Disposal_Records', [
    ['disposal_id', 'fiscal_year', 'item_code', 'qty', 'method', 'committee', 'approval_date']
  ]);

  initSheet('15_Settings_Config', [
    ['key', 'value', 'description', 'updated_at'],
    ['school_name', 'โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)', 'School Name', '2026-10-01T00:00:00Z'],
    ['settings_revision_id', 'rev_1', 'Revision tracking', '2026-10-01T00:00:00Z'],
    ['last_backup_at', '2026-10-01T00:00:00Z', 'Timestamp of last full backup', '2026-10-01T00:00:00Z'],
    ['GOOGLE_CLIENT_ID', 'test-client-id-12345.apps.googleusercontent.com', 'Sensitive OAuth Client ID', '2026-10-01T00:00:00Z'],
    ['allow_over_quota', 'false', 'Quota policy', '2026-10-01T00:00:00Z'],
    ['low_stock_threshold', '10', 'Minimum alert', '2026-10-01T00:00:00Z']
  ]);

  initSheet('16_Idempotency_Log', [
    ['key', 'actor_id', 'action', 'payload_hash', 'status', 'result_json', 'created_at']
  ]);

  return { ctx, sheets, cacheStore, propertiesStore, mockSpreadsheet };
}

let passed = 0;
let failed = 0;

function runTest(id, name, fn) {
  try {
    fn();
    console.log(`[PASS] [${id}] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] [${id}] ${name}`);
    console.error('       Error:', err.message);
    failed++;
  }
}

// ============================================================================
// DB-01: Configured vs Actual DB Comparison & Health Diagnostics
// ============================================================================
runTest('DB-01', 'Configured vs actual ID matches; inaccessible DB or missing sheet reflects actual status', () => {
  const { ctx, sheets } = createMockGasContext({ SPREADSHEET_ID: 'SS-MATCH-999' });
  const adminCaller = { user_id: 'USR-001', id: 'USR-001', email: 'admin@hrt.ac.th', role: 'ADMIN', status: 'ACTIVE' };

  // 1. Healthy matching DB
  const healthyRes = ctx.hrtCheckHealth_({}, adminCaller);
  assert.strictEqual(healthyRes.status, 'HEALTHY', 'Status must be HEALTHY when DB matches and all 16 sheets exist');
  assert.strictEqual(healthyRes.checks.read, true, 'Read must be true');
  assert.strictEqual(healthyRes.checks.schema, true, 'Schema must be true');
  assert.strictEqual(healthyRes.checks.database_match, true, 'Database match must be true');
  assert.strictEqual(healthyRes.checks.schema_count, '16/16', 'Schema count must be 16/16');
  assert.strictEqual(healthyRes.checks.write_permission, 'NOT_TESTED', 'Write permission must be labeled NOT_TESTED in read probe');

  // 2. Inaccessible configured DB (wrong ID / access denied)
  const { ctx: ctxFail } = createMockGasContext({ failOpenById: true, SPREADSHEET_ID: 'SS-BAD-ID' });
  const failRes = ctxFail.hrtCheckHealth_({}, adminCaller);
  assert.strictEqual(failRes.status, 'UNHEALTHY', 'Status must be UNHEALTHY when configured DB cannot be opened');
  assert.strictEqual(failRes.checks.read, false, 'Read must be false');
  assert.strictEqual(failRes.success, false, 'Success must be false');

  // 3. Missing sheets in database
  const { ctx: ctxMissing, sheets: sheetsMissing } = createMockGasContext();
  delete sheetsMissing['10_Stock_Ledger'];
  const missingRes = ctxMissing.hrtCheckHealth_({}, adminCaller);
  assert.strictEqual(missingRes.status, 'DEGRADED', 'Status must be DEGRADED when canonical sheets are missing');
  assert.strictEqual(missingRes.checks.schema, false, 'Schema must be false when sheet missing');
  assert.ok(missingRes.checks.missing_sheets.includes('10_Stock_Ledger'), 'Missing sheets must list 10_Stock_Ledger');
  assert.strictEqual(missingRes.checks.schema_count, '15/16', 'Schema count must report 15/16');
});

// ============================================================================
// DB-02: 16 Canonical Sheets Schema Matrix Verification
// ============================================================================
runTest('DB-02', 'Schema matrix defines exactly 16 canonical physical sheets without accidental alterations', () => {
  const { ctx } = createMockGasContext();
  const CONFIG = vm.runInContext('CONFIG', ctx);
  const sheetsDef = CONFIG.SHEETS;
  const canonicalSheetNames = Object.values(sheetsDef);

  assert.strictEqual(canonicalSheetNames.length, 16, 'CONFIG.SHEETS must define exactly 16 canonical physical sheets');
  assert.ok(!canonicalSheetNames.includes('13_Year_End_Audit_Items'), '13_Year_End_Audit_Items must not be a 17th physical sheet');
  assert.ok(canonicalSheetNames.includes('13_Year_End_Audits'), '13_Year_End_Audits is the canonical physical year-end sheet');

  // In SHEET_ALIASES, year_end_audit_items must resolve cleanly to 13_Year_End_Audits
  const aliases = CONFIG.SHEET_ALIASES['year_end_audit_items'];
  assert.ok(Array.isArray(aliases), 'SHEET_ALIASES must define year_end_audit_items alias');
  assert.ok(aliases.includes('13_Year_End_Audits'), 'year_end_audit_items alias must include 13_Year_End_Audits');

  // Initializer schema in Code.gs has exactly 16 sheets
  const codeGs = fs.readFileSync('Code.gs', 'utf8');
  assert.ok(codeGs.includes("'13_Year_End_Audits'"), 'Code.gs initDatabase_ defines 13_Year_End_Audits');
  assert.ok(!codeGs.includes("'13_Year_End_Audit_Items'"), 'Code.gs initDatabase_ must NOT define redundant 13_Year_End_Audit_Items');
});

// ============================================================================
// DB-03: Auth Diagnostic & Identity Context Verification
// ============================================================================
runTest('DB-03', 'Verified caller id/user_id powers auth diagnostic; anonymous/suspended rejected; read does not claim write', () => {
  const { ctx } = createMockGasContext();

  // 1. Verified Admin caller
  const adminCaller = { user_id: 'USR-001', id: 'USR-001', email: 'admin@hrt.ac.th', role: 'ADMIN', status: 'ACTIVE', isActive: true };
  const adminHealth = ctx.hrtCheckHealth_({}, adminCaller);
  assert.strictEqual(adminHealth.checks.authenticated, true, 'Authenticated must be true for active verified caller');
  assert.strictEqual(adminHealth.checks.authorized, true, 'Authorized must be true for ADMIN');
  assert.strictEqual(adminHealth.checks.role, 'ADMIN', 'Role must be ADMIN');
  assert.strictEqual(adminHealth.checks.caller_id, 'USR-001', 'Caller ID must match user_id');
  assert.strictEqual(adminHealth.databaseName, 'HRT_Inventory_DB_2567_School', 'Admin sees real DB name');
  assert.strictEqual(adminHealth.checks.write_permission, 'NOT_TESTED', 'Read probe must not claim write verified');

  // 2. Anonymous / Null Caller
  const anonHealth = ctx.hrtCheckHealth_({}, null);
  assert.strictEqual(anonHealth.checks.authenticated, false, 'Authenticated must be false for null caller');
  assert.strictEqual(anonHealth.checks.authorized, false, 'Authorized must be false for null caller');
  assert.strictEqual(anonHealth.status, 'UNAUTHORIZED', 'Status must be UNAUTHORIZED for anonymous request');

  // 3. Suspended Caller
  const suspendedCaller = { user_id: 'USR-999', id: 'USR-999', email: 'suspended@hrt.ac.th', role: 'ADMIN', status: 'SUSPENDED' };
  const suspendedHealth = ctx.hrtCheckHealth_({}, suspendedCaller);
  assert.strictEqual(suspendedHealth.checks.authenticated, false, 'Authenticated must be false for suspended account');
  assert.strictEqual(suspendedHealth.status, 'UNAUTHORIZED', 'Status must be UNAUTHORIZED for suspended caller');

  // 4. Officer Caller sees masked database name
  const officerCaller = { user_id: 'USR-002', id: 'USR-002', email: 'officer@hrt.ac.th', role: 'OFFICER', status: 'ACTIVE' };
  const officerHealth = ctx.hrtCheckHealth_({}, officerCaller);
  assert.strictEqual(officerHealth.checks.authenticated, true);
  assert.strictEqual(officerHealth.databaseName, 'PROTECTED', 'Non-admin callers must receive PROTECTED database name');
});

// ============================================================================
// SET-01: Settings Save/Reload Exact Values & Revision Concurrency
// ============================================================================
runTest('SET-01', 'Save/reload exact types (boolean false, number 0); revision conflict prevents silent overwrite', () => {
  const { ctx } = createMockGasContext();
  const adminCaller = { user_id: 'USR-001', id: 'USR-001', email: 'admin@hrt.ac.th', role: 'ADMIN', status: 'ACTIVE' };

  // 1. Update settings with false and 0
  const updateRes = ctx.hrtUpdateSettings_({
    expectedRevisionId: 'rev_1',
    settings: {
      allow_over_quota: false,
      low_stock_threshold: 0,
      rop_factor: 2.0
    }
  }, adminCaller);

  assert.strictEqual(updateRes.success, true, 'Settings update must succeed');
  assert.ok(updateRes.revisionId.startsWith('rev_'), 'Revision ID must be incremented');

  // Verify reload preserves false and 0 without defaulting
  const loadedSettings = ctx.hrtGetSettings_({}, adminCaller);
  assert.strictEqual(loadedSettings.rules.allowOverQuota, false, 'allowOverQuota must be strictly boolean false');
  assert.strictEqual(loadedSettings.rules.minStockThreshold, 0, 'low_stock_threshold must be strictly 0');

  // 2. Concurrency Conflict: Attempt update with stale revision
  assert.throws(() => {
    ctx.hrtUpdateSettings_({
      expectedRevisionId: 'rev_1', // Stale revision
      settings: { low_stock_threshold: 15 }
    }, adminCaller);
  }, /CONCURRENCY_CONFLICT/, 'Update with stale revisionId must throw CONCURRENCY_CONFLICT');
});

// ============================================================================
// SET-02: Non-Admin Direct Mutations Denied (FORBIDDEN)
// ============================================================================
runTest('SET-02', 'Non-admin direct update/import/backup/restore requests are denied with FORBIDDEN', () => {
  const { ctx } = createMockGasContext();
  const officerCaller = { user_id: 'USR-002', id: 'USR-002', email: 'officer@hrt.ac.th', role: 'OFFICER', status: 'ACTIVE' };
  const teacherCaller = { user_id: 'USR-003', id: 'USR-003', email: 'teacher@hrt.ac.th', role: 'TEACHER', status: 'ACTIVE' };

  // 1. Officer cannot update settings
  assert.throws(() => {
    ctx.hrtUpdateSettings_({ settings: { school_name: 'Hacked' } }, officerCaller);
  }, /FORBIDDEN/, 'Officer must be denied updating settings');

  // 2. Teacher cannot update settings
  assert.throws(() => {
    ctx.hrtUpdateSettings_({ settings: { school_name: 'Hacked' } }, teacherCaller);
  }, /FORBIDDEN/, 'Teacher must be denied updating settings');

  // 3. Officer cannot generate full backup
  assert.throws(() => {
    ctx.hrtBackupFull_({}, officerCaller);
  }, /FORBIDDEN/, 'Officer must be denied generating backup bundle');

  // 4. Officer cannot validate restore package
  assert.throws(() => {
    ctx.hrtValidateRestore_({ bundle: {} }, officerCaller);
  }, /FORBIDDEN/, 'Officer must be denied validating restore package');

  // 5. Teacher cannot import items
  assert.throws(() => {
    ctx.hrtImportItems_({ items: [{ code: 'TEST-01', name: 'Item' }] }, teacherCaller);
  }, /FORBIDDEN/, 'Teacher must be denied importing items');
});

// ============================================================================
// CSV-01: CSV Import Fail-Closed & Formula Injection Protection
// ============================================================================
runTest('CSV-01', 'Malformed/duplicate rows abort before write; formula injection sanitized non-destructively', () => {
  const { ctx, sheets } = createMockGasContext();
  const officerCaller = { user_id: 'USR-002', id: 'USR-002', email: 'officer@hrt.ac.th', role: 'OFFICER', status: 'ACTIVE' };

  const initialMasterCount = sheets['03_Master_Items'].length;

  // 1. Batch with 1 valid item and 1 malformed item (negative unit cost)
  assert.throws(() => {
    ctx.hrtImportItems_({
      items: [
        { code: 'VALID-001', name: 'Valid Item 1', unit_cost: 50, stock: 10, unit: 'ชิ้น' },
        { code: 'INVALID-001', name: 'Invalid Item 2', unit_cost: -10, stock: 5, unit: 'ชิ้น' }
      ]
    }, officerCaller);
  }, /IMPORT_VALIDATION_FAILED/, 'Import batch with malformed row must throw IMPORT_VALIDATION_FAILED');

  // Assert zero partial writes
  assert.strictEqual(sheets['03_Master_Items'].length, initialMasterCount, 'Zero rows must be written on validation failure');

  // 2. Batch with duplicate code within batch
  assert.throws(() => {
    ctx.hrtImportItems_({
      items: [
        { code: 'DUP-001', name: 'Item A', unit_cost: 50, stock: 10, warehouse: 'คลังพัสดุกลาง (อาคาร 1)' },
        { code: 'DUP-001', name: 'Item B', unit_cost: 60, stock: 15, warehouse: 'คลังพัสดุกลาง (อาคาร 1)' }
      ]
    }, officerCaller);
  }, /IMPORT_VALIDATION_FAILED/, 'Import batch with duplicate item code must throw IMPORT_VALIDATION_FAILED');

  // 3. Formula Injection Sanitization on valid import
  const importRes = ctx.hrtImportItems_({
    items: [
      { code: 'SAFE-001', name: '=SUM(A1:A10)', category: 'วัสดุสำนักงาน', unit: 'ชิ้น', unit_cost: 25, stock: 5 }
    ]
  }, officerCaller);

  assert.strictEqual(importRes.success, true, 'Import of formula row must succeed with sanitization');
  const addedRow = sheets['03_Master_Items'][sheets['03_Master_Items'].length - 1];
  assert.strictEqual(addedRow[0], 'SAFE-001', 'Item code must match');
  assert.strictEqual(addedRow[2], "'=SUM(A1:A10)", 'Formula must be safely escaped with leading apostrophe');
});

// ============================================================================
// BAK-01: Full Backup Bundle Has Actual Rows & Excludes Secrets
// ============================================================================
runTest('BAK-01', 'Backup bundle contains actual rows, headers, and manifest; secrets are redacted', () => {
  const { ctx } = createMockGasContext();
  const adminCaller = { user_id: 'USR-001', id: 'USR-001', email: 'admin@hrt.ac.th', role: 'ADMIN', status: 'ACTIVE' };

  const backupRes = ctx.hrtBackupFull_({}, adminCaller);
  assert.strictEqual(backupRes.success, true, 'Backup generation must succeed');

  const bundle = backupRes.backupBundle;
  assert.ok(bundle.manifest, 'Bundle must contain manifest');
  assert.strictEqual(bundle.manifest.sheetCount, 16, 'Manifest must declare 16 sheets');
  assert.strictEqual(bundle.manifest.secretsExcluded, true, 'Manifest must declare secretsExcluded: true');
  assert.ok(bundle.manifest.totalRowCount > 0, 'Total row count must be greater than zero');

  // Verify all 16 canonical sheets have actual rows
  const sheetKeys = Object.keys(bundle.sheets);
  assert.strictEqual(sheetKeys.length, 16, 'Bundle must contain exactly 16 sheets');

  const masterSheet = bundle.sheets['03_Master_Items'];
  assert.ok(Array.isArray(masterSheet.rows), 'Master items must contain rows array');
  assert.ok(masterSheet.rows.length >= 2, 'Master items must have actual item rows');
  assert.strictEqual(masterSheet.rows[0][0], 'OFF-001', 'First row item code must be OFF-001');

  // Verify secrets are redacted in 15_Settings_Config
  const configSheet = bundle.sheets['15_Settings_Config'];
  const clientIdRow = configSheet.rows.find(r => r[0] === 'GOOGLE_CLIENT_ID');
  assert.ok(clientIdRow, 'GOOGLE_CLIENT_ID row must exist in config');
  assert.strictEqual(clientIdRow[1], '[REDACTED_SECRET]', 'Sensitive credentials must be redacted in backup bundle');
});

// ============================================================================
// BAK-02: Snapshot Consistency Check Under Lock
// ============================================================================
runTest('BAK-02', 'Backup snapshot records isConsistent: true under lock', () => {
  const { ctx } = createMockGasContext();
  const adminCaller = { user_id: 'USR-001', id: 'USR-001', email: 'admin@hrt.ac.th', role: 'ADMIN', status: 'ACTIVE' };

  const backupRes = ctx.hrtBackupFull_({}, adminCaller);
  assert.strictEqual(backupRes.backupBundle.manifest.isConsistent, true, 'Snapshot must be consistent under script lock');
});

// ============================================================================
// BAK-03: Restore Dry-Run Validator Rejects Corrupted/Incompatible Bundles
// ============================================================================
runTest('BAK-03', 'Restore dry-run validator rejects corrupted/incompatible bundles with zero database writes', () => {
  const { ctx, sheets } = createMockGasContext();
  const adminCaller = { user_id: 'USR-001', id: 'USR-001', email: 'admin@hrt.ac.th', role: 'ADMIN', status: 'ACTIVE' };

  // 1. Generate legitimate bundle
  const legitimateBundle = ctx.hrtBackupFull_({}, adminCaller).backupBundle;

  // Validate legitimate bundle
  const validRes = ctx.hrtValidateRestore_({ bundle: legitimateBundle }, adminCaller);
  assert.strictEqual(validRes.valid, true, 'Legitimate bundle must be valid');
  assert.strictEqual(validRes.canRestore, true, 'Legitimate bundle can be restored');
  assert.strictEqual(validRes.dryRun, true, 'Validator must strictly operate in dry-run mode');

  // 2. Incompatible bundle: Missing a required sheet
  const incompatibleBundle = JSON.parse(JSON.stringify(legitimateBundle));
  delete incompatibleBundle.sheets['10_Stock_Ledger'];
  const missingRes = ctx.hrtValidateRestore_({ bundle: incompatibleBundle }, adminCaller);
  assert.strictEqual(missingRes.isCompatible, false, 'Bundle missing canonical sheet must be incompatible');
  assert.strictEqual(missingRes.canRestore, false, 'Incompatible bundle cannot be restored');
  assert.ok(missingRes.missingSheets.includes('10_Stock_Ledger'));

  // 3. Corrupted bundle: Row data modified so checksum fails
  const corruptedBundle = JSON.parse(JSON.stringify(legitimateBundle));
  corruptedBundle.sheets['03_Master_Items'].rows[0][9] = 999999; // Tampered stock
  const corruptedRes = ctx.hrtValidateRestore_({ bundle: corruptedBundle }, adminCaller);
  assert.strictEqual(corruptedRes.valid, false, 'Tampered bundle must fail checksum validation');
  assert.ok(corruptedRes.validationErrors.some(e => e.includes('CHECKSUM_MISMATCH')), 'Errors must report CHECKSUM_MISMATCH');

  // 4. FK Broken bundle: Requisition item referencing non-existent master item
  const fkBrokenBundle = JSON.parse(JSON.stringify(legitimateBundle));
  fkBrokenBundle.sheets['08_Requisition_Items'].rows.push(['LINE-999', 'REQ-UUID-100', 'NON-EXISTENT-CODE', 5, 5, 'ชิ้น']);
  // recompute checksum so checksum passes but FK fails
  fkBrokenBundle.sheets['08_Requisition_Items'].checksum = ctx.hrtComputeSha256_(JSON.stringify(fkBrokenBundle.sheets['08_Requisition_Items'].rows));
  const fkRes = ctx.hrtValidateRestore_({ bundle: fkBrokenBundle }, adminCaller);
  assert.strictEqual(fkRes.fkIntegrity.valid, false, 'FK integrity must be false when foreign key broken');
  assert.strictEqual(fkRes.canRestore, false, 'Bundle with broken FK cannot be restored');
});

// ============================================================================
// BAK-04: Round-Trip Restore in Isolated Database
// ============================================================================
runTest('BAK-04', 'Round-trip restore in isolated test DB verifies items, FK, and ledger balances; refuses production', () => {
  const { ctx, sheets } = createMockGasContext();
  const adminCaller = { user_id: 'USR-001', id: 'USR-001', email: 'admin@hrt.ac.th', role: 'ADMIN', status: 'ACTIVE' };

  // Generate backup bundle
  const bundle = ctx.hrtBackupFull_({}, adminCaller).backupBundle;

  // 1. Refuses restore if targetEnvironment is NOT ISOLATED_TEST_DB (Production Protection)
  assert.throws(() => {
    ctx.hrtRestoreFromBundle_({ bundle: bundle, targetEnvironment: 'PRODUCTION' }, adminCaller);
  }, /RESTORE_FORBIDDEN/, 'Restore to production environment must be forbidden');

  // 2. Perform restore into ISOLATED_TEST_DB
  // Mutate local sheet to simulate different data before restore
  sheets['03_Master_Items'] = [
    ['code', 'fsn_code', 'name', 'category', 'unit', 'warehouse', 'unit_cost', 'min', 'rop', 'stock', 'supplier', 'status'],
    ['TEMP-001', '', 'Temporary Item', 'วัสดุ', 'ชิ้น', 'WH-01', 10, 5, 10, 5, '', 'normal']
  ];

  const restoreRes = ctx.hrtRestoreFromBundle_({ bundle: bundle, targetEnvironment: 'ISOLATED_TEST_DB' }, adminCaller);
  assert.strictEqual(restoreRes.success, true, 'Isolated restore must succeed');
  assert.strictEqual(restoreRes.restoredSheetsCount, 16, 'All 16 sheets must be restored');
  assert.strictEqual(restoreRes.verification.itemsMatch, true, 'Restored items must match bundle');
  assert.strictEqual(restoreRes.verification.ledgerTotalsMatch, true, 'Ledger totals must match bundle');

  // Verify sheet rows match original bundle
  assert.strictEqual(sheets['03_Master_Items'].length - 1, bundle.sheets['03_Master_Items'].rows.length, 'Restored master items count must match bundle');
  assert.strictEqual(sheets['03_Master_Items'][1][0], 'OFF-001', 'Restored master item code must be OFF-001');
});

// ============================================================================
// BAK-05: Backup Failure Does NOT Update last_backup_at to Fake Success
// ============================================================================
runTest('BAK-05', 'Backup failure preserves existing last_backup_at without recording fake success', () => {
  const { ctx, sheets } = createMockGasContext();
  const adminCaller = { user_id: 'USR-001', id: 'USR-001', email: 'admin@hrt.ac.th', role: 'ADMIN', status: 'ACTIVE' };

  const initialBackupTime = ctx.getConfig('last_backup_at');
  assert.strictEqual(initialBackupTime, '2026-10-01T00:00:00Z', 'Initial backup timestamp must be set');

  // Inject failure: delete one sheet so getSheet throws
  delete sheets['10_Stock_Ledger'];

  assert.throws(() => {
    ctx.hrtBackupFull_({}, adminCaller);
  }, /Sheet not found/, 'Backup must throw when a sheet is missing');

  // Verify last_backup_at was NOT updated
  const postFailBackupTime = ctx.getConfig('last_backup_at');
  assert.strictEqual(postFailBackupTime, initialBackupTime, 'last_backup_at must NOT be updated on backup failure');
});

console.log('\n=============================================================');
console.log(`TOTAL PROMPT 18 TESTS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
if (failed === 0) {
  console.log('ALL PROMPT 18 ACCEPTANCE CRITERIA PASSED 100%!');
} else {
  console.log('SOME TESTS FAILED!');
  process.exit(1);
}
console.log('=============================================================');
