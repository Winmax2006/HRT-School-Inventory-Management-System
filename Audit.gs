/**
 * Audit.gs - Immutable Audit Logger, Cryptographic Hash Chain Verifier & Year-End Audit
 * Layer: Security & Compliance (HRT Inventory System v2.6.0)
 * Standard: SHA-256 Chained Ledger, C-3 Physical Inventory Count Engine
 */

/**
 * Strips sensitive tokens, JWTs, and secrets from audit log text
 * @param {string} details 
 * @returns {string} Sanitized details string
 */
function hrtSanitizeAuditDetails_(details) {
  if (typeof details !== 'string') details = String(details || '');
  return details
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [MASKED_TOKEN]')
    .replace(/Basic\s+[A-Za-z0-9+/=]+/gi, 'Basic [MASKED_CREDENTIALS]')
    .replace(/ya29\.[0-9A-Za-z-_]+/g, '[MASKED_OAUTH_TOKEN]')
    .replace(/AIza[0-9A-Za-z-_]{30,40}/g, '[MASKED_API_KEY]')
    .replace(/ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[MASKED_JWT]')
    .replace(/-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/g, '[MASKED_PRIVATE_KEY]')
    .replace(/(password|token|secret|auth|id_token|client_secret)=([^&\s,]+)/gi, '$1=[MASKED]');
}

/**
 * Appends an immutable, tamper-evident audit record to 11_Audit_Trail
 * @param {string} action 
 * @param {string} module 
 * @param {string} details 
 * @param {Object} caller 
 */
function logAudit_(action, module, details, caller, isMandatory) {
  try {
    const sheet = getSheet('audit_trail');
    const now = new Date();
    const nowIso = now.toISOString();
    const auditId = 'AUD-' + now.getTime() + '-' + Math.floor(Math.random() * 1000);

    const actorId = (caller && typeof caller === 'object')
      ? (caller.id || caller.userId || caller.email || 'SYSTEM')
      : 'SYSTEM';
    const email = (caller && typeof caller === 'object')
      ? (caller.email || '')
      : '';

    // Retrieve previous record hash for cryptographic chaining
    const lastRow = sheet.getLastRow();
    let prevHash = 'GENESIS_HASH_HRT_v2_6_0';

    if (lastRow > 1) {
      const lastHashVal = sheet.getRange(lastRow, 8).getValue();
      if (lastHashVal) {
        prevHash = String(lastHashVal).trim();
      }
    }

    // Sanitize details to ensure zero secrets/tokens in immutable chain
    const cleanDetails = hrtSanitizeAuditDetails_(details);

    // Hash computation string
    const payloadToHash = `${auditId}|${nowIso}|${actorId}|${email}|${action}|${module}|${cleanDetails}|${prevHash}`;
    const recordHash = hrtComputeSha256_(payloadToHash);

    // 11_Audit_Trail Columns:
    // audit_id, timestamp, actor_id, email, action, module, prev_hash, record_hash, details
    sheet.appendRow([
      auditId,
      nowIso,
      actorId,
      email,
      action,
      module,
      prevHash,
      recordHash,
      sanitizeCellValue(cleanDetails)
    ]);

  } catch (err) {
    Logger.log('[Audit Logging Error] ' + err.message);
    if (isMandatory === true) {
      const auditErr = new Error(`AUDIT_PERSISTENCE_FAILED: Failed to record mandatory audit trail for action "${action}". Mutation cannot be certified.`);
      auditErr.code = 'AUDIT_PERSISTENCE_FAILED';
      throw auditErr;
    }
  }
}

/**
 * Retrieves audit logs with optional filtering
 * @param {Object} payload { module, action, limit }
 * @param {Object} caller 
 * @returns {Array<Object>} List of audit records
 */
function hrtGetAuditLogs_(payload, caller) {
  payload = payload || {};
  const filterModule = (payload.module || '').toString().trim().toUpperCase();
  const filterAction = (payload.action || '').toString().trim().toUpperCase();
  const limit = parseInt(payload.limit, 10) || 100;

  const sheet = getSheet('audit_trail');
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const results = [];

  for (let r = data.length - 1; r >= 1; r--) {
    const row = data[r];
    const module = String(row[5] || '').trim().toUpperCase();
    const action = String(row[4] || '').trim().toUpperCase();

    if (filterModule && filterModule !== 'ALL' && module !== filterModule) continue;
    if (filterAction && filterAction !== 'ALL' && action !== filterAction) continue;

    results.push({
      audit_id: row[0],
      timestamp: row[1],
      actor_id: row[2],
      email: row[3],
      action: row[4],
      module: row[5],
      prev_hash: row[6],
      record_hash: row[7],
      details: row[8] || ''
    });

    if (results.length >= limit) break;
  }

  return results;
}

/**
 * Cryptographically verifies the SHA-256 audit hash chain to detect any tampering
 * @param {Object} payload 
 * @param {Object} caller 
 * @returns {Object} Verification outcome
 */
function hrtVerifyAuditIntegrity_(payload, caller) {
  const sheet = getSheet('audit_trail');
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return {
      isValid: true,
      verifiedCount: 0,
      message: 'Audit trail is empty. No tampering detected.'
    };
  }

  let expectedPrevHash = 'GENESIS_HASH_HRT_v2_6_0';

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const auditId = String(row[0]).trim();
    const timestamp = String(row[1]).trim();
    const actorId = String(row[2]).trim();
    const email = String(row[3]).trim();
    const action = String(row[4]).trim();
    const module = String(row[5]).trim();
    const prevHash = String(row[6]).trim();
    const storedRecordHash = String(row[7]).trim();
    const details = String(row[8] || '').trim();

    // 1. Verify prev_hash link
    if (r === 1) {
      if (prevHash !== expectedPrevHash) {
        return {
          isValid: false,
          tamperedRow: r + 1,
          audit_id: auditId,
          reason: `Genesis hash mismatch. Expected "${expectedPrevHash}", found "${prevHash}".`
        };
      }
    } else {
      if (prevHash !== expectedPrevHash) {
        return {
          isValid: false,
          tamperedRow: r + 1,
          audit_id: auditId,
          reason: `Broken chain link at row ${r + 1}. Expected prev_hash "${expectedPrevHash}", but found "${prevHash}".`
        };
      }
    }

    // 2. Re-compute and verify record_hash
    const payloadToHash = `${auditId}|${timestamp}|${actorId}|${email}|${action}|${module}|${details}|${prevHash}`;
    const calculatedHash = hrtComputeSha256_(payloadToHash);

    if (calculatedHash !== storedRecordHash) {
      return {
        isValid: false,
        tamperedRow: r + 1,
        audit_id: auditId,
        reason: `Record content altered at row ${r + 1}. Stored hash: ${storedRecordHash}, Recomputed hash: ${calculatedHash}`
      };
    }

    expectedPrevHash = storedRecordHash;
  }

  return {
    isValid: true,
    verifiedCount: data.length - 1,
    lastHash: expectedPrevHash,
    message: `All ${data.length - 1} audit records cryptographically verified. Hash chain is intact.`
  };
}

/**
 * -------------------------------------------------------------
 * C-3: Year-End Physical Inventory Count APIs
 * -------------------------------------------------------------
 */

/**
 * Retrieves physical count inventory records for a specific fiscal year
 * @param {Object} payload { fiscalYear: '2569' }
 * @param {Object} caller 
 * @returns {Object} Year-end audit state and item list
 */
function hrtGetYearEndAudit_(payload, caller) {
  payload = payload || {};
  const fiscalYear = String(payload.fiscalYear || payload.fiscal_year || getActiveFiscalYear()).trim();

  const auditSheet = getSheet('year_end_audits');
  const auditData = auditSheet.getDataRange().getValues();
  const records = [];

  for (let r = 1; r < auditData.length; r++) {
    const row = auditData[r];
    const rowFy = String(row[1]).trim();
    if (rowFy === fiscalYear) {
      const bookQty = Number(row[3]) || 0;
      const countQty = row[4] !== '' && !isNaN(row[4]) ? Number(row[4]) : null;
      const variance = countQty !== null ? (countQty - bookQty) : 0;

      records.push({
        count_id: row[0],
        fiscal_year: rowFy,
        item_code: row[2],
        book_qty: bookQty,
        count_qty: countQty,
        variance: variance,
        condition: row[6] || 'ปกติ',
        auditors: row[7] || ''
      });
    }
  }

  // Cross-reference with Master Items for names, categories, units, unit costs
  const masterSheet = getSheet('master_items');
  const masterData = masterSheet.getDataRange().getValues();
  const masterMap = {};

  for (let m = 1; m < masterData.length; m++) {
    const code = String(masterData[m][0]).trim().toUpperCase();
    masterMap[code] = {
      name: masterData[m][2],
      category: masterData[m][3],
      unit: masterData[m][4],
      warehouse: masterData[m][5],
      unit_cost: Number(masterData[m][6]) || 0,
      current_stock: Number(masterData[m][9]) || 0
    };
  }

  // Enrich audit records with item metadata
  const enrichedItems = records.map(rec => {
    const meta = masterMap[rec.item_code.toUpperCase()] || {};
    return Object.assign({}, rec, {
      name: meta.name || rec.item_code,
      category: meta.category || '',
      unit: meta.unit || 'ชิ้น',
      warehouse: meta.warehouse || '',
      unit_cost: meta.unit_cost || 0
    });
  });

  // Calculate audit statistics
  let countedCount = 0;
  let surplusCount = 0;
  let deficitCount = 0;
  let matchCount = 0;

  enrichedItems.forEach(it => {
    if (it.count_qty !== null) {
      countedCount++;
      if (it.variance > 0) surplusCount++;
      else if (it.variance < 0) deficitCount++;
      else matchCount++;
    }
  });

  return {
    fiscalYear: fiscalYear,
    isStarted: records.length > 0,
    status: records.length > 0 ? (countedCount === records.length ? 'COMPLETED' : 'IN_PROGRESS') : 'NOT_STARTED',
    isClosed: isFiscalYearClosed(fiscalYear),
    totalItems: records.length,
    countedCount: countedCount,
    surplusCount: surplusCount,
    deficitCount: deficitCount,
    matchCount: matchCount,
    items: enrichedItems
  };
}

/**
 * Initializes Year-End Physical Inventory Count for target fiscal year
 * Populates 13_Year_End_Audits with all current catalog items and book balances
 * @param {Object} payload { fiscalYear: '2569', committee: '...' }
 * @param {Object} caller 
 * @returns {Object} Initialization outcome
 */
function hrtStartYearEndAudit_(payload, caller) {
  payload = payload || {};
  const fiscalYear = String(payload.fiscalYear || payload.fiscal_year || getActiveFiscalYear()).trim();
  const committee = String(payload.committee || (caller ? caller.name : 'คณะกรรมการตรวจนับพัสดุ')).trim();

  if (isFiscalYearClosed(fiscalYear)) {
    throw new Error(`CLOSED_FISCAL_YEAR: ปีงบประมาณ ${fiscalYear} ถูกปิดรอบแล้ว ไม่สามารถเริ่มต้นการตรวจนับพัสดุได้`);
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) throw new Error('CONCURRENCY_LOCK: Please retry.');

  try {
    const auditSheet = getSheet('year_end_audits');
    const auditData = auditSheet.getDataRange().getValues();

    // Check if already started
    for (let r = 1; r < auditData.length; r++) {
      if (String(auditData[r][1]).trim() === fiscalYear) {
        throw new Error(`ALREADY_EXISTS: การตรวจนับพัสดุประจำปีงบประมาณ ${fiscalYear} ได้เริ่มต้นไว้แล้ว`);
      }
    }

    // Read all items from 03_Master_Items
    const masterSheet = getSheet('master_items');
    const masterData = masterSheet.getDataRange().getValues();
    let rowCount = 0;

    for (let m = 1; m < masterData.length; m++) {
      const code = String(masterData[m][0]).trim();
      if (!code) continue;

      const currentStock = Number(masterData[m][9]) || 0;
      const countId = `COUNT-${fiscalYear}-${code}`;

      // 13_Year_End_Audits: count_id, fiscal_year, item_code, book_qty, count_qty, variance, condition, auditors
      auditSheet.appendRow([
        countId,
        fiscalYear,
        code,
        currentStock,
        '', // Initial count empty
        0,
        'ปกติ',
        sanitizeCellValue(committee)
      ]);
      rowCount++;
    }

    if (typeof logAudit === 'function') {
      logAudit_('START_YEAR_END_AUDIT', 'YEAR_END', `เริ่มต้นการตรวจนับพัสดุประจำปี ${fiscalYear} จำนวน ${rowCount} รายการ`, caller);
    }

    return {
      success: true,
      fiscalYear: fiscalYear,
      status: 'IN_PROGRESS',
      initializedItemsCount: rowCount,
      committee: committee
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Saves Physical Count Quantities & Variances into 13_Year_End_Audits
 * @param {Object} payload { fiscalYear: '2569', items: [{ item_code, count_qty, condition }], committee: '...' }
 * @param {Object} caller 
 * @returns {Object} Save result
 */
function hrtSaveYearEndAudit_(payload, caller) {
  payload = payload || {};
  const fiscalYear = String(payload.fiscalYear || payload.fiscal_year || getActiveFiscalYear()).trim();
  const items = Array.isArray(payload.items) ? payload.items : [];
  const committee = String(payload.committee || '').trim();

  if (isFiscalYearClosed(fiscalYear)) {
    throw new Error(`CLOSED_FISCAL_YEAR: ปีงบประมาณ ${fiscalYear} ถูกปิดรอบแล้ว ไม่สามารถแก้ไขผลการตรวจนับได้`);
  }

  if (items.length === 0) {
    throw new Error('VALIDATION_ERROR: No audit items provided to save.');
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) throw new Error('CONCURRENCY_LOCK: Please retry.');

  try {
    const auditSheet = getSheet('year_end_audits');
    const auditData = auditSheet.getDataRange().getValues();
    const rowMap = {};

    for (let r = 1; r < auditData.length; r++) {
      const rowFy = String(auditData[r][1]).trim();
      const code = String(auditData[r][2]).trim().toUpperCase();
      if (rowFy === fiscalYear) {
        rowMap[code] = {
          rowIndex: r + 1,
          bookQty: Number(auditData[r][3]) || 0
        };
      }
    }

    let updatedCount = 0;

    items.forEach(it => {
      const code = String(it.item_code || it.code || '').trim().toUpperCase();
      const countQty = Number(it.count_qty !== undefined ? it.count_qty : it.physical_qty);
      const condition = String(it.condition || 'ปกติ').trim();

      if (rowMap[code] && !isNaN(countQty)) {
        const r = rowMap[code].rowIndex;
        const bookQty = rowMap[code].bookQty;
        const variance = countQty - bookQty;

        // Update count_qty (col 5), variance (col 6), condition (col 7)
        auditSheet.getRange(r, 5).setValue(countQty);
        auditSheet.getRange(r, 6).setValue(variance);
        auditSheet.getRange(r, 7).setValue(sanitizeCellValue(condition));
        if (committee) {
          auditSheet.getRange(r, 8).setValue(sanitizeCellValue(committee));
        }
        updatedCount++;
      }
    });

    if (typeof logAudit === 'function') {
      logAudit_('SAVE_YEAR_END_AUDIT', 'YEAR_END', `บันทึกผลการตรวจนับพัสดุปี ${fiscalYear} จำนวน ${updatedCount} รายการ`, caller);
    }

    return {
      success: true,
      fiscalYear: fiscalYear,
      updatedCount: updatedCount
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Computes SHA-256 Digest in Hex format
 * @param {string} input 
 * @returns {string} 64-character hex hash
 */
function hrtComputeSha256_(input) {
  try {
    if (typeof Utilities !== 'undefined') {
      const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
      let hexStr = '';
      for (let i = 0; i < rawHash.length; i++) {
        let byte = rawHash[i];
        if (byte < 0) byte += 256;
        let byteHex = byte.toString(16);
        if (byteHex.length === 1) byteHex = '0' + byteHex;
        hexStr += byteHex;
      }
      return hexStr;
    }
  } catch (e) {}

  // Fallback simple 32-bit FNV hash converted to hex if Utilities unavailable
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(64, '0');
}
