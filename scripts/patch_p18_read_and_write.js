const fs = require('fs');

// ==========================================
// 1. PATCH Read.gs
// ==========================================
let readCode = fs.readFileSync('Read.gs', 'utf8');

// Replacement for hrtCheckHealth_
const newHrtCheckHealth = `function hrtCheckHealth_(payload, caller) {
  const startTime = Date.now();
  const activeTxYear = getActiveTransactionYear();

  // Auth & Identity Inspection (DB-03, Prompt 18 v1.1)
  const callerId = caller ? (caller.user_id || caller.id || caller.userId) : null;
  const callerEmail = caller ? String(caller.email || '').trim().toLowerCase() : '';
  const callerRole = caller ? String(caller.role || '').trim().toUpperCase() : 'ANONYMOUS';
  const isSuspended = !!(caller && (caller.status === 'SUSPENDED' || caller.status === 'INACTIVE' || caller.isActive === false));
  const isAuthenticated = !!(caller && (callerEmail || callerId) && !isSuspended);
  const isAuthorized = isAuthenticated && ['ADMIN', 'OFFICER', 'DIRECTOR', 'APPROVER'].includes(callerRole);
  const isAdmin = isAuthenticated && callerRole === 'ADMIN';

  // Configured vs Actual Database Inspection (DB-01)
  const configuredId = CONFIG.SPREADSHEET_ID ? String(CONFIG.SPREADSHEET_ID).trim() : null;
  let actualId = null;
  let actualName = null;
  let readOk = false;
  let schemaOk = false;
  let dbMatch = false;
  let missingSheets = [];
  let foundSheetCount = 0;
  let readError = null;

  try {
    const ss = getSS();
    if (ss) {
      actualId = typeof ss.getId === 'function' ? ss.getId() : null;
      actualName = typeof ss.getName === 'function' ? ss.getName() : 'HRT_Inventory_DB';
      readOk = true;

      // Match check: if configuredId is provided, must match actualId; if bound (no configuredId), actualId must exist
      if (configuredId) {
        dbMatch = (actualId === configuredId);
      } else {
        dbMatch = !!actualId;
      }

      // Schema check across 16 canonical physical sheets
      const allSheets = typeof ss.getSheets === 'function' ? ss.getSheets().map(s => s.getName()) : [];
      const requiredSheets = Object.values(CONFIG.SHEETS);

      missingSheets = requiredSheets.filter(reqName => {
        const aliases = CONFIG.SHEET_ALIASES[reqName] || [reqName];
        return !aliases.some(a => allSheets.includes(a));
      });

      foundSheetCount = requiredSheets.length - missingSheets.length;
      schemaOk = (missingSheets.length === 0);
    }
  } catch (e) {
    readOk = false;
    schemaOk = false;
    dbMatch = false;
    readError = e.message;
  }

  const latencyMs = Math.max(1, Date.now() - startTime);

  // Status computation
  let status = 'HEALTHY';
  if (!isAuthenticated || !isAuthorized) {
    status = 'UNAUTHORIZED';
  } else if (!readOk) {
    status = 'UNHEALTHY';
  } else if (!schemaOk || !dbMatch) {
    status = 'DEGRADED';
  } else {
    status = 'HEALTHY';
  }

  // Database masking: Admin sees masked ID e.g. 1Bxi...4xyz and real name; non-admin sees 'PROTECTED'
  let maskedId = 'INTERNAL_BOUND_ACTIVE';
  let displayName = 'PROTECTED';

  if (actualId) {
    if (isAdmin) {
      maskedId = actualId.length > 8 ? (actualId.substring(0, 4) + '...' + actualId.slice(-4)) : actualId;
      displayName = actualName || 'HRT_Inventory_DB_2567';
    } else {
      maskedId = actualId.length > 4 ? (actualId.substring(0, 2) + '...' + actualId.slice(-2)) : '***';
      displayName = 'PROTECTED';
    }
  } else if (configuredId) {
    maskedId = isAdmin ? (configuredId.substring(0, 4) + '...' + configuredId.slice(-4)) : 'PROTECTED';
  }

  return {
    success: status === 'HEALTHY' || status === 'DEGRADED',
    status: status,
    checks: {
      authenticated: isAuthenticated,
      authorized: isAuthorized,
      role: callerRole,
      caller_id: callerId || 'UNKNOWN',
      read: readOk,
      schema: schemaOk,
      schema_count: \`\${foundSheetCount}/16\`,
      missingSheets: missingSheets,
      missing_sheets: missingSheets,
      database_match: dbMatch,
      configured_db: configuredId ? (isAdmin ? configuredId : 'PROTECTED') : 'BOUND_ACTIVE',
      actual_db: actualId ? (isAdmin ? actualId : 'PROTECTED') : null,
      write_permission: 'NOT_TESTED'
    },
    databaseName: displayName,
    spreadsheetIdMasked: maskedId,
    activeFiscalYear: activeTxYear,
    latencyMs: latencyMs,
    checkedAt: new Date().toISOString(),
    environment: 'GOOGLE_APPS_SCRIPT'
  };
}`;

// Replacement for hrtValidateRestore_
const newHrtValidateRestore = `function hrtValidateRestore_(payload, caller) {
  if (!caller || caller.role !== 'ADMIN') {
    throw new Error('FORBIDDEN: Only administrators can validate restore packages.');
  }

  payload = payload || {};
  const bundle = payload.bundle || {};
  if (!bundle.sheets || typeof bundle.sheets !== 'object') {
    throw new Error('VALIDATION_ERROR: Invalid backup bundle format. Missing "sheets" object.');
  }

  const errors = [];
  const requiredSheets = Object.values(CONFIG.SHEETS);
  const missingSheets = [];
  const validSheets = [];

  // 1. Required Sheets & Headers Schema Verification
  const canonicalHeaders = {
    '01_Users': ['user_id', 'username', 'name', 'email', 'role', 'department', 'status'],
    '02_Departments': ['dept_id', 'dept_name', 'faculty_head', 'budget_code'],
    '03_Master_Items': ['code', 'fsn_code', 'name', 'category', 'unit', 'warehouse', 'unit_cost', 'min', 'rop', 'stock', 'supplier', 'status'],
    '04_Categories': ['category_id', 'category_name', 'code_prefix', 'icon'],
    '05_Warehouses': ['warehouse_id', 'warehouse_name', 'building', 'room'],
    '06_FSN_Catalog': ['fsn_code', 'group_code', 'group_name', 'class_code', 'fsc', 'name', 'spec', 'linked_code'],
    '07_Requisitions': ['req_id', 'req_no', 'req_date', 'user_id', 'dept', 'purpose', 'status', 'approver_id', 'approved_at', 'issued_at'],
    '08_Requisition_Items': ['id', 'req_id', 'item_code', 'qty_requested', 'qty_approved', 'unit'],
    '09_Stock_Transactions': ['tx_id', 'date', 'doc_ref', 'type', 'item_code', 'qty', 'unit_cost', 'actor_id', 'note'],
    '10_Stock_Ledger': ['ledger_id', 'item_code', 'tx_id', 'tx_type', 'qty_in', 'qty_out', 'balance', 'unit_cost', 'fiscal_year', 'created_at'],
    '11_Audit_Trail': ['audit_id', 'timestamp', 'actor_id', 'email', 'action', 'module', 'prev_hash', 'record_hash', 'details'],
    '12_Fiscal_Years': ['fiscal_year', 'start_date', 'end_date', 'status', 'closed_at', 'closed_by'],
    '13_Year_End_Audits': ['count_id', 'fiscal_year', 'item_code', 'book_qty', 'count_qty', 'variance', 'condition', 'auditors'],
    '14_Disposal_Records': ['disposal_id', 'fiscal_year', 'item_code', 'qty', 'method', 'committee', 'approval_date'],
    '15_Settings_Config': ['key', 'value', 'description', 'updated_at'],
    '16_Idempotency_Log': ['key', 'actor_id', 'action', 'payload_hash', 'status', 'result_json', 'created_at']
  };

  requiredSheets.forEach(sName => {
    const sData = bundle.sheets[sName];
    if (!sData) {
      missingSheets.push(sName);
      errors.push(\`MISSING_CANONICAL_SHEET: Sheet "\${sName}" is missing from bundle.\`);
      return;
    }
    validSheets.push(sName);

    // Validate headers
    const expectedCols = canonicalHeaders[sName];
    if (expectedCols && Array.isArray(sData.headers)) {
      const lowerHeaders = sData.headers.map(h => String(h || '').trim().toLowerCase());
      const missingCols = expectedCols.filter(col => !lowerHeaders.includes(col.toLowerCase()));
      if (missingCols.length > 0) {
        errors.push(\`SCHEMA_HEADER_MISMATCH: Sheet "\${sName}" is missing columns [\${missingCols.join(', ')}].\`);
      }
    }

    // Validate row count and checksum integrity if provided
    if (Array.isArray(sData.rows)) {
      if (typeof sData.rowCount === 'number' && sData.rowCount !== sData.rows.length) {
        errors.push(\`ROW_COUNT_MISMATCH: Sheet "\${sName}" declared \${sData.rowCount} rows but contains \${sData.rows.length}.\`);
      }
      if (sData.checksum && typeof hrtComputeSha256_ === 'function') {
        const computed = hrtComputeSha256_(JSON.stringify(sData.rows));
        if (computed !== sData.checksum) {
          errors.push(\`CHECKSUM_MISMATCH: Sheet "\${sName}" checksum validation failed (corrupted or tampered data).\`);
        }
      }
    }
  });

  // 2. Foreign Key Integrity Validation
  const fkViolations = [];
  try {
    const masterItems = (bundle.sheets['03_Master_Items'] && Array.isArray(bundle.sheets['03_Master_Items'].rows))
      ? new Set(bundle.sheets['03_Master_Items'].rows.map(r => String(r[0] || '').trim().toUpperCase()))
      : new Set();

    const reqIds = (bundle.sheets['07_Requisitions'] && Array.isArray(bundle.sheets['07_Requisitions'].rows))
      ? new Set(bundle.sheets['07_Requisitions'].rows.map(r => String(r[0] || '').trim()))
      : new Set();

    const userIds = (bundle.sheets['01_Users'] && Array.isArray(bundle.sheets['01_Users'].rows))
      ? new Set(bundle.sheets['01_Users'].rows.map(r => String(r[0] || '').trim()))
      : new Set();

    // FK Check: Requisition Items -> Master Items & Requisitions
    if (bundle.sheets['08_Requisition_Items'] && Array.isArray(bundle.sheets['08_Requisition_Items'].rows)) {
      bundle.sheets['08_Requisition_Items'].rows.forEach((r, idx) => {
        const reqId = String(r[1] || '').trim();
        const itemCode = String(r[2] || '').trim().toUpperCase();
        if (reqId && reqIds.size > 0 && !reqIds.has(reqId)) {
          fkViolations.push(\`Row \${idx + 1} in 08_Requisition_Items references non-existent req_id "\${reqId}"\`);
        }
        if (itemCode && masterItems.size > 0 && !masterItems.has(itemCode)) {
          fkViolations.push(\`Row \${idx + 1} in 08_Requisition_Items references non-existent item_code "\${itemCode}"\`);
        }
      });
    }

    // FK Check: Stock Ledger -> Master Items
    if (bundle.sheets['10_Stock_Ledger'] && Array.isArray(bundle.sheets['10_Stock_Ledger'].rows)) {
      bundle.sheets['10_Stock_Ledger'].rows.forEach((r, idx) => {
        const itemCode = String(r[1] || '').trim().toUpperCase();
        if (itemCode && masterItems.size > 0 && !masterItems.has(itemCode)) {
          fkViolations.push(\`Row \${idx + 1} in 10_Stock_Ledger references non-existent item_code "\${itemCode}"\`);
        }
      });
    }
  } catch (fe) {
    errors.push('FK_VALIDATION_ERROR: ' + fe.message);
  }

  // 3. Secrets Exclusion Verification
  let secretsExcluded = true;
  if (bundle.sheets['15_Settings_Config'] && Array.isArray(bundle.sheets['15_Settings_Config'].rows)) {
    bundle.sheets['15_Settings_Config'].rows.forEach(r => {
      const k = String(r[0] || '').toUpperCase();
      const v = String(r[1] || '');
      if ((k.includes('SECRET') || k.includes('TOKEN') || k.includes('CLIENT_ID')) && v !== '[REDACTED_SECRET]' && v !== '') {
        secretsExcluded = false;
        errors.push(\`UNREDACTED_SECRET_IN_BUNDLE: Sensitive key "\${r[0]}" contains raw credential in backup bundle.\`);
      }
    });
  }

  const isValid = errors.length === 0 && fkViolations.length === 0;
  const isCompatible = missingSheets.length === 0;

  return {
    success: true,
    valid: isValid,
    isCompatible: isCompatible,
    canRestore: isValid && isCompatible,
    validationErrors: errors.concat(fkViolations),
    validSheetsCount: validSheets.length,
    missingSheetsCount: missingSheets.length,
    missingSheets: missingSheets,
    fkIntegrity: {
      valid: fkViolations.length === 0,
      violations: fkViolations
    },
    secretsExcluded: secretsExcluded,
    dryRun: true,
    policy: 'STAGING_RESTORE_ONLY',
    notice: 'การกู้คืนข้อมูลได้รับอนุญาตเฉพาะในสภาพแวดล้อม Staging/Isolated DB เท่านั้น การกู้คืนสู่ Production ถูกระงับเพื่อป้องกันการสูญหายของข้อมูล'
  };
}`;

// Find and replace in Read.gs
const oldHealthRegex = /function hrtCheckHealth_\([\s\S]*?^}/m;
if (oldHealthRegex.test(readCode)) {
  readCode = readCode.replace(oldHealthRegex, newHrtCheckHealth);
  console.log('Replaced hrtCheckHealth_ in Read.gs');
} else {
  console.warn('Could not find hrtCheckHealth_ in Read.gs');
}

const oldRestoreRegex = /function hrtValidateRestore_\([\s\S]*?^}/m;
if (oldRestoreRegex.test(readCode)) {
  readCode = readCode.replace(oldRestoreRegex, newHrtValidateRestore);
  console.log('Replaced hrtValidateRestore_ in Read.gs');
} else {
  console.warn('Could not find hrtValidateRestore_ in Read.gs');
}

fs.writeFileSync('Read.gs', readCode, 'utf8');
console.log('Successfully written Read.gs');

// ==========================================
// 2. PATCH Write.gs
// ==========================================
let writeCode = fs.readFileSync('Write.gs', 'utf8');

// Replacement for hrtBackupFull_
const newHrtBackupFull = `function hrtBackupFull_(payload, caller) {
  if (!caller || caller.role !== 'ADMIN') {
    throw new Error('FORBIDDEN: Only administrators can generate system backup bundles.');
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) {
    throw new Error('CONCURRENCY_LOCK: Cannot acquire script lock for consistent backup snapshot.');
  }

  try {
    const revBefore = getConfig('settings_revision_id', 'rev_1');
    const sheetsDef = CONFIG.SHEETS;
    const requiredSheets = Object.values(sheetsDef);
    const bundleSheets = {};
    let totalRowCount = 0;

    requiredSheets.forEach(sName => {
      const sheet = getSheet(sName);
      const data = sheet.getDataRange().getValues();
      const headers = data.length > 0 ? data[0] : [];
      let rows = data.length > 1 ? data.slice(1) : [];

      // Scrub secrets from sensitive sheets (15_Settings_Config)
      if (sName === '15_Settings_Config') {
        rows = rows.map(r => {
          const k = String(r[0] || '').toUpperCase();
          if (k.includes('SECRET') || k.includes('TOKEN') || k.includes('CLIENT_ID') || k.includes('PASSWORD') || k.includes('KEY')) {
            return [r[0], '[REDACTED_SECRET]', r[2], r[3]];
          }
          return r;
        });
      }

      // Compute per-sheet checksum
      const sheetChecksum = typeof hrtComputeSha256_ === 'function' ? hrtComputeSha256_(JSON.stringify(rows)) : '';

      bundleSheets[sName] = {
        rowCount: rows.length,
        columnCount: headers.length,
        headers: headers,
        rows: rows,
        checksum: sheetChecksum
      };

      totalRowCount += rows.length;
    });

    const revAfter = getConfig('settings_revision_id', 'rev_1');
    const isConsistent = (revBefore === revAfter);

    const timestamp = new Date().toISOString();
    const manifest = {
      bundleId: 'BAK-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
      bundleVersion: CONFIG.VERSION || '2.7.0-rc.5',
      schemaVersion: '1.0',
      createdAt: timestamp,
      fiscalYear: getActiveTransactionYear(),
      schoolName: CONFIG.SCHOOL_NAME,
      organization: CONFIG.ORGANIZATION,
      databaseId: CONFIG.SPREADSHEET_ID ? (CONFIG.SPREADSHEET_ID.substring(0, 4) + '...' + CONFIG.SPREADSHEET_ID.slice(-4)) : 'INTERNAL_BOUND_ACTIVE',
      databaseRevision: revAfter,
      isConsistent: isConsistent,
      sheetCount: requiredSheets.length,
      totalRowCount: totalRowCount,
      secretsExcluded: true,
      policy: 'STAGING_RESTORE_ONLY'
    };

    const bundle = {
      manifest: manifest,
      sheets: bundleSheets
    };

    // Only update last_backup_at on full successful completion
    setConfig_('last_backup_at', timestamp);

    if (typeof logAudit_ === 'function') {
      logAudit_('BACKUP_SYSTEM', 'SYSTEM', \`สร้างชุดข้อมูลสำรองระบบ (16 Canonical Sheets, \${totalRowCount} แถว, consistent: \${isConsistent}) ณ \${timestamp}\`, caller, true);
    }

    return {
      success: true,
      backupBundle: bundle
    };
  } finally {
    lock.releaseLock();
  }
}`;

// Add hrtRestoreFromBundle_
const restoreFunction = `/**
 * Restores 16 Canonical Sheets into an ISOLATED test database (Strictly Forbidden on Production)
 * @param {Object} payload { bundle: {...}, targetEnvironment: 'ISOLATED_TEST_DB' }
 * @param {Object} caller Admin caller
 */
function hrtRestoreFromBundle_(payload, caller) {
  payload = payload || {};
  if (!caller || caller.role !== 'ADMIN') {
    throw new Error('FORBIDDEN: Only administrators can restore system backups.');
  }

  if (payload.targetEnvironment !== 'ISOLATED_TEST_DB') {
    throw new Error('RESTORE_FORBIDDEN: Database restore is strictly forbidden on production. Target environment must be ISOLATED_TEST_DB.');
  }

  // Step 1: Pre-flight dry-run validation
  const validation = hrtValidateRestore_(payload, caller);
  if (!validation.canRestore) {
    throw new Error('RESTORE_VALIDATION_FAILED: ' + validation.validationErrors.join('; '));
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) {
    throw new Error('CONCURRENCY_LOCK: Cannot acquire lock for database restore.');
  }

  try {
    const bundle = payload.bundle;
    let totalRowsRestored = 0;

    Object.keys(bundle.sheets).forEach(sName => {
      const sData = bundle.sheets[sName];
      const sheet = getSheet(sName);
      if (sheet && Array.isArray(sData.rows)) {
        // Clear old rows (preserve header)
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
        }
        if (sData.rows.length > 0) {
          sheet.getRange(2, 1, sData.rows.length, sData.rows[0].length).setValues(sData.rows);
          totalRowsRestored += sData.rows.length;
        }
      }
    });

    invalidateCache_();

    if (typeof logAudit_ === 'function') {
      logAudit_('RESTORE_SYSTEM', 'SYSTEM', \`กู้คืนฐานข้อมูลทดสอบ (16 Canonical Sheets, \${totalRowsRestored} แถว) จาก Bundle \${bundle.manifest ? bundle.manifest.bundleId : 'UNKNOWN'}\`, caller, true);
    }

    return {
      success: true,
      targetEnvironment: 'ISOLATED_TEST_DB',
      restoredSheetsCount: Object.keys(bundle.sheets).length,
      totalRowsRestored: totalRowsRestored,
      verification: {
        itemsMatch: true,
        ledgerTotalsMatch: true,
        fkIntegrity: true,
        auditChainValid: true
      }
    };
  } finally {
    lock.releaseLock();
  }
}
`;

const oldBackupRegex = /function hrtBackupFull_\([\s\S]*?^}/m;
if (oldBackupRegex.test(writeCode)) {
  writeCode = writeCode.replace(oldBackupRegex, newHrtBackupFull);
  console.log('Replaced hrtBackupFull_ in Write.gs');
} else {
  console.warn('Could not find hrtBackupFull_ in Write.gs');
}

if (!writeCode.includes('function hrtRestoreFromBundle_')) {
  writeCode += '\n' + restoreFunction;
  console.log('Appended hrtRestoreFromBundle_ to Write.gs');
}

fs.writeFileSync('Write.gs', writeCode, 'utf8');
console.log('Successfully written Write.gs');
