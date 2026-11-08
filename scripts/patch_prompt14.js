const fs = require('fs');

console.log('=== Step 1: Patching Config.gs ===');
let configContent = fs.readFileSync('Config.gs', 'utf8');
if (!configContent.includes("'qr_registry':")) {
  const target = "'disposal_records': ['14_Disposal_Records', 'Disposal_Records', 'disposal_records'],";
  const replacement = "'disposal_records': ['14_Disposal_Records', 'Disposal_Records', 'disposal_records'],\n    'qr_registry': ['14_QR_Registry', 'QR_Registry', 'qr_registry'],";
  configContent = configContent.replace(target, replacement);
  fs.writeFileSync('Config.gs', configContent, 'utf8');
  console.log('[OK] Added qr_registry to SHEET_ALIASES in Config.gs');
} else {
  console.log('[OK] qr_registry already present in Config.gs');
}

console.log('=== Step 2: Patching Read.gs ===');
let readContent = fs.readFileSync('Read.gs', 'utf8');

// 1. In hrtGetItems_: compute filtered universe metrics across all filtered items
const oldFilteredCalc = `  const filteredValue = filtered.reduce((acc, it) => acc + (it.total_val > 0 ? it.total_val : 0), 0);
  const page = Math.max(1, parseInt(payload.page, 10) || 1);
  const limit = Math.max(1, parseInt(payload.limit, 10) || 500);
  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / limit);
  const paginatedItems = filtered.slice((page - 1) * limit, page * limit);

  return {
    items: paginatedItems,
    totalCount: totalCount,
    totalUniverseCount: allItems.length,
    totalUniverseValue: totalUniverseValue,
    filteredValue: filteredValue,
    page: page,
    limit: limit,
    totalPages: totalPages,
    summary: {
      countA: countA,
      countB: countB,
      countC: countC,
      lowStockCount: lowStockCount,
      awaitingReceiptCount: awaitingReceiptCount
    },
    fiscalYear: selectedViewingYear
  };`;

const newFilteredCalc = `  // Calculate universe metrics across the entire filtered set (RPC-10: not limited to paginated 500 items)
  let filteredQuantity = 0;
  let filteredCriticalCount = 0;
  let filteredLowCount = 0;
  let filteredNormalCount = 0;
  const filteredValue = filtered.reduce((acc, it) => {
    filteredQuantity += (Number(it.stock) || 0);
    if (it.status === 'critical') filteredCriticalCount++;
    else if (it.status === 'low') filteredLowCount++;
    else filteredNormalCount++;
    return acc + (it.total_val > 0 ? it.total_val : 0);
  }, 0);

  let totalUniverseQuantity = 0;
  allItems.forEach(it => {
    totalUniverseQuantity += (Number(it.stock) || 0);
  });

  const page = Math.max(1, parseInt(payload.page, 10) || 1);
  const limit = Math.max(1, parseInt(payload.limit, 10) || 500);
  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / limit);
  const paginatedItems = filtered.slice((page - 1) * limit, page * limit);

  return {
    items: paginatedItems,
    totalCount: totalCount,
    totalUniverseCount: allItems.length,
    totalUniverseValue: totalUniverseValue,
    totalUniverseQuantity: totalUniverseQuantity,
    filteredValue: filteredValue,
    filteredQuantity: filteredQuantity,
    page: page,
    limit: limit,
    totalPages: totalPages,
    summary: {
      countA: countA,
      countB: countB,
      countC: countC,
      lowStockCount: filteredLowCount,
      criticalStockCount: filteredCriticalCount,
      normalCount: filteredNormalCount,
      awaitingReceiptCount: awaitingReceiptCount
    },
    fiscalYear: selectedViewingYear
  };`;

if (readContent.includes(oldFilteredCalc)) {
  readContent = readContent.replace(oldFilteredCalc, newFilteredCalc);
  console.log('[OK] Enhanced hrtGetItems_ with full filtered universe metrics in Read.gs');
} else {
  console.warn('[WARN] Could not find exact oldFilteredCalc in Read.gs');
}

// 2. In hrtGetDashboardMetrics_: correct metric universe and explicit null checks
const oldDashMetricsRegex = /function hrtGetDashboardMetrics_\(payload, caller\) \{[\s\S]*?return metrics;\s*\}/;

const newDashMetrics = `function hrtGetDashboardMetrics_(payload, caller) {
  payload = payload || {};
  const fiscalYear = String(payload.fiscalYear || payload.fiscal_year || getActiveTransactionYear()).trim();
  const dataRev = typeof getConfigInt === 'function' ? getConfigInt('data_revision', 1) : 1;
  const filterSig = payload.dept ? ('_d_' + String(payload.dept).trim()) : '';
  const cacheScope = typeof getCacheScopePrefix === 'function' ? getCacheScopePrefix() : 'hrt_gas_';
  const cacheKey = cacheScope + 'dash_' + fiscalYear + '_rev' + dataRev + filterSig;

  try {
    if (typeof CacheService !== 'undefined') {
      const cached = CacheService.getScriptCache().get(cacheKey);
      if (cached) return JSON.parse(cached);
    }
  } catch (e) {}

  // Pass payload so department/category filters are properly applied
  const itemsRes = hrtGetItems_(payload, caller);
  if (!itemsRes || typeof itemsRes !== 'object') {
    const err = new Error('INVALID_METRIC_DATA: hrtGetItems_ returned invalid result.');
    err.code = 'INVALID_METRIC_DATA';
    throw err;
  }

  // Determine correct metric universe:
  // If specific filters are applied, use filtered universe; otherwise total universe.
  // CRITICAL (RPC-09): explicit null/undefined/number checks. Never use || which corrupts valid 0 values.
  const hasFilter = Boolean(payload.dept || payload.category || payload.warehouse || payload.search || payload.status || payload.abc);

  let targetValue;
  if (hasFilter) {
    if (typeof itemsRes.filteredValue !== 'number' || isNaN(itemsRes.filteredValue)) {
      const err = new Error('INVALID_METRIC_DATA: filteredValue is missing or invalid type in itemsRes.');
      err.code = 'INVALID_METRIC_DATA';
      throw err;
    }
    targetValue = itemsRes.filteredValue;
  } else {
    if (typeof itemsRes.totalUniverseValue === 'number' && !isNaN(itemsRes.totalUniverseValue)) {
      targetValue = itemsRes.totalUniverseValue;
    } else if (typeof itemsRes.filteredValue === 'number' && !isNaN(itemsRes.filteredValue)) {
      targetValue = itemsRes.filteredValue;
    } else {
      const err = new Error('INVALID_METRIC_DATA: totalValue cannot be determined from itemsRes.');
      err.code = 'INVALID_METRIC_DATA';
      throw err;
    }
  }

  const totalSKUs = hasFilter ? itemsRes.totalCount : itemsRes.totalUniverseCount;
  const totalStockUnits = hasFilter ? (itemsRes.filteredQuantity || 0) : (itemsRes.totalUniverseQuantity || 0);
  const normalCount = (itemsRes.summary && typeof itemsRes.summary.normalCount === 'number') ? itemsRes.summary.normalCount : 0;
  const lowCount = (itemsRes.summary && typeof itemsRes.summary.lowStockCount === 'number') ? itemsRes.summary.lowStockCount : 0;
  const criticalCount = (itemsRes.summary && typeof itemsRes.summary.criticalStockCount === 'number') ? itemsRes.summary.criticalStockCount : 0;

  const history = hrtGetHistoryMap_(fiscalYear, { limit: 20 });

  const metrics = {
    fiscalYear: fiscalYear,
    totalItems: totalSKUs, // SKU count
    totalSKUs: totalSKUs,
    totalStockUnits: totalStockUnits, // Physical units count
    totalValue: targetValue,
    filteredValue: itemsRes.filteredValue,
    totalUniverseValue: itemsRes.totalUniverseValue,
    normalCount: normalCount,
    lowCount: lowCount,
    criticalCount: criticalCount,
    countA: itemsRes.summary.countA,
    countB: itemsRes.summary.countB,
    countC: itemsRes.summary.countC,
    monthlyTrends: history.monthlyTrends,
    recentTransactions: history.recentTransactions.slice(0, 10),
    timestamp: new Date().toISOString()
  };

  try {
    if (typeof CacheService !== 'undefined') {
      CacheService.getScriptCache().put(cacheKey, JSON.stringify(metrics), 120);
    }
  } catch (ce) {}

  return metrics;
}`;

if (oldDashMetricsRegex.test(readContent)) {
  readContent = readContent.replace(oldDashMetricsRegex, newDashMetrics);
  console.log('[OK] Updated hrtGetDashboardMetrics_ with robust universe mapping in Read.gs');
} else {
  console.warn('[WARN] Could not match oldDashMetricsRegex in Read.gs');
}

// 3. In hrtGetRequisitions_: return source, fiscal_year, urgency, required_date, and item_name
const oldGetReqsRegex = /function hrtGetRequisitions_\(payload, caller\) \{[\s\S]*?result\.reverse\(\);\s*return result;\s*\}/;

const newGetReqs = `function hrtGetRequisitions_(payload, caller) {
  payload = payload || {};
  const statusFilter = (payload.status || '').toString().trim().toUpperCase();
  const deptFilter = (payload.dept || payload.department || '').toString().trim();
  const fiscalYear = String(payload.fiscalYear || payload.fiscal_year || getActiveTransactionYear()).trim();

  const reqSheet = getSheet('requisitions');
  const reqData = reqSheet.getDataRange().getValues();
  if (reqData.length <= 1) return [];

  // Master catalog index for item_name lookup
  const masterSheet = getSheet('master_items');
  const masterData = masterSheet.getDataRange().getValues();
  const itemCatalogMap = {};
  for (let m = 1; m < masterData.length; m++) {
    const code = String(masterData[m][0] || '').trim().toUpperCase();
    if (code) {
      itemCatalogMap[code] = String(masterData[m][2] || '').trim();
    }
  }

  // Build items by req_id
  const itemsSheet = getSheet('requisition_items');
  const itemData = itemsSheet.getDataRange().getValues();
  const itemsByReqId = {};

  for (let i = 1; i < itemData.length; i++) {
    const rId = String(itemData[i][1]).trim();
    if (!itemsByReqId[rId]) itemsByReqId[rId] = [];
    const itemCode = String(itemData[i][2] || '').trim().toUpperCase();
    itemsByReqId[rId].push({
      id: itemData[i][0],
      req_id: rId,
      item_code: itemCode,
      item_name: itemCatalogMap[itemCode] || String(itemData[i][2] || ''),
      qty_requested: Number(itemData[i][3]) || 0,
      qty_approved: Number(itemData[i][4]) || 0,
      unit: itemData[i][5]
    });
  }

  const result = [];
  const isPrivileged = caller && ['ADMIN', 'DIRECTOR', 'APPROVER', 'OFFICER'].includes(caller.role);

  for (let r = 1; r < reqData.length; r++) {
    const row = reqData[r];
    const reqId = String(row[0]).trim();
    const reqNo = String(row[1]).trim();
    const reqDate = String(row[2]).trim();
    const userId = String(row[3]).trim();
    const dept = String(row[4]).trim();
    const purpose = String(row[5]).trim();
    const status = String(row[6]).trim().toUpperCase();
    const approverId = String(row[7]).trim();
    const approvedAt = String(row[8]).trim();
    const issuedAt = String(row[9]).trim();
    const source = String(row[10] || 'CENTRAL_WEB').trim();
    const reqFy = String(row[11] || fiscalYear).trim();
    const totalItems = Number(row[12]) || (itemsByReqId[reqId] ? itemsByReqId[reqId].length : 0);
    const urgency = String(row[13] || 'NORMAL').trim().toUpperCase();
    const requiredDate = String(row[14] || '').trim();

    // Requesters can only view their own requests
    if (!isPrivileged && caller && caller.id && userId !== caller.id && userId !== caller.email) {
      continue;
    }

    if (statusFilter && statusFilter !== 'ALL' && status !== statusFilter) {
      continue;
    }

    if (deptFilter && deptFilter !== 'ALL' && dept !== deptFilter) {
      continue;
    }

    result.push({
      req_id: reqId,
      req_no: reqNo,
      req_date: reqDate,
      user_id: userId,
      dept: dept,
      department: dept,
      purpose: purpose,
      status: status,
      approver_id: approverId,
      approved_at: approvedAt,
      issued_at: issuedAt,
      source: source,
      fiscal_year: reqFy,
      total_items: totalItems,
      urgency: urgency,
      required_date: requiredDate,
      items: itemsByReqId[reqId] || []
    });
  }

  // Newest first
  result.reverse();
  return result;
}`;

if (oldGetReqsRegex.test(readContent)) {
  readContent = readContent.replace(oldGetReqsRegex, newGetReqs);
  console.log('[OK] Updated hrtGetRequisitions_ with source lineage & DTO fields in Read.gs');
} else {
  console.warn('[WARN] Could not match oldGetReqsRegex in Read.gs');
}

// 4. In hrtGetRequisitionDetail_: include source lineage and item_name
const oldReqDetailRegex = /function hrtGetRequisitionDetail_\(payload, caller\) \{[\s\S]*?foundRow\.items = lineItems;\s*return foundRow;\s*\}/;

const newReqDetail = `function hrtGetRequisitionDetail_(payload, caller) {
  const reqId = String(payload.requisition_id || payload.req_id || '').trim();
  if (!reqId) {
    const err = new Error('PARAM_REQUIRED: requisition_id is required.');
    err.code = 'PARAM_REQUIRED';
    throw err;
  }

  const reqSheet = getSheet('requisitions');
  const reqData = reqSheet.getDataRange().getValues();
  let foundRow = null;

  for (let r = 1; r < reqData.length; r++) {
    if (String(reqData[r][0]).trim() === reqId || String(reqData[r][1]).trim() === reqId) {
      foundRow = {
        req_id: String(reqData[r][0]).trim(),
        req_no: String(reqData[r][1]).trim(),
        req_date: reqData[r][2],
        user_id: String(reqData[r][3]).trim(),
        dept: reqData[r][4],
        purpose: reqData[r][5],
        status: String(reqData[r][6]).trim().toUpperCase(),
        approver_id: reqData[r][7],
        approved_at: reqData[r][8],
        issued_at: reqData[r][9],
        source: String(reqData[r][10] || 'CENTRAL_WEB').trim(),
        fiscal_year: String(reqData[r][11] || getActiveTransactionYear()).trim(),
        total_items: Number(reqData[r][12]) || 0,
        urgency: String(reqData[r][13] || 'NORMAL').trim().toUpperCase(),
        required_date: String(reqData[r][14] || '').trim()
      };
      break;
    }
  }

  if (!foundRow) {
    const err = new Error(\`NOT_FOUND: Requisition "\${reqId}" not found.\`);
    err.code = 'NOT_FOUND';
    throw err;
  }

  const isPrivileged = caller && ['ADMIN', 'DIRECTOR', 'APPROVER', 'OFFICER'].includes(caller.role);
  const isOwner = caller && (caller.id === foundRow.user_id || caller.email === foundRow.user_id);

  if (!isPrivileged && !isOwner) {
    const err = new Error(\`FORBIDDEN: You do not have permission to view requisition "\${reqId}".\`);
    err.code = 'FORBIDDEN';
    throw err;
  }

  // Master catalog index for item_name lookup
  const masterSheet = getSheet('master_items');
  const masterData = masterSheet.getDataRange().getValues();
  const itemCatalogMap = {};
  for (let m = 1; m < masterData.length; m++) {
    const code = String(masterData[m][0] || '').trim().toUpperCase();
    if (code) {
      itemCatalogMap[code] = String(masterData[m][2] || '').trim();
    }
  }

  // Fetch line items
  const itemsSheet = getSheet('requisition_items');
  const itemData = itemsSheet.getDataRange().getValues();
  const lineItems = [];

  for (let i = 1; i < itemData.length; i++) {
    if (String(itemData[i][1]).trim() === foundRow.req_id) {
      const itemCode = String(itemData[i][2] || '').trim().toUpperCase();
      lineItems.push({
        id: itemData[i][0],
        req_id: foundRow.req_id,
        item_code: itemCode,
        item_name: itemCatalogMap[itemCode] || String(itemData[i][2] || ''),
        qty_requested: Number(itemData[i][3]) || 0,
        qty_approved: Number(itemData[i][4]) || 0,
        unit: itemData[i][5]
      });
    }
  }

  foundRow.items = lineItems;
  return foundRow;
}`;

if (oldReqDetailRegex.test(readContent)) {
  readContent = readContent.replace(oldReqDetailRegex, newReqDetail);
  console.log('[OK] Updated hrtGetRequisitionDetail_ with complete fields in Read.gs');
} else {
  console.warn('[WARN] Could not match oldReqDetailRegex in Read.gs');
}

// 5. In hrtResolveQr_: accept qr_data alias and enforce revocation/invalid rejection
const oldQrResolveRegex = /function hrtResolveQr_\(payload, caller\) \{[\s\S]*?const token = String\(payload\.qr_token \|\| payload\.token \|\| payload\.code \|\| payload\.ref \|\| ''\)\.trim\(\);/;

const newQrResolveHead = `function hrtResolveQr_(payload, caller) {
  payload = payload || {};
  const token = String(payload.qr_data || payload.qrData || payload.qr_token || payload.token || payload.code || payload.ref || '').trim();`;

if (oldQrResolveRegex.test(readContent)) {
  readContent = readContent.replace(oldQrResolveRegex, newQrResolveHead);
  console.log('[OK] Added qr_data/qrData alias to hrtResolveQr_ in Read.gs');
} else {
  console.warn('[WARN] Could not match oldQrResolveRegex in Read.gs');
}

fs.writeFileSync('Read.gs', readContent, 'utf8');
new Function(readContent);
console.log('[OK] Read.gs valid JS!');

console.log('=== Step 3: Patching Write.gs ===');
let writeContent = fs.readFileSync('Write.gs', 'utf8');

// Update hrtUpdateSettings_ with field alias mapping and precise value retention
const oldUpdateSettingsRegex = /function hrtUpdateSettings_\(payload, caller\) \{[\s\S]*?return \{\s*success: true,\s*section: section,\s*updatedCount: updatedCount,\s*revisionId: nextRev,\s*timestamp: new Date\(\)\.toISOString\(\)\s*\};\s*\}/;

const newUpdateSettings = `function hrtUpdateSettings_(payload, caller) {
  payload = payload || {};
  if (!caller || caller.role !== 'ADMIN') {
    throw new Error('FORBIDDEN: Only administrators can update system settings.');
  }

  // Optimistic Concurrency Control (Revision Check)
  const currentRevision = getConfig('settings_revision_id', 'rev_1');
  if (payload.expectedRevisionId && payload.expectedRevisionId !== currentRevision) {
    throw new Error(\`CONCURRENCY_CONFLICT: Settings have been modified by another administrator (current: "\${currentRevision}", expected: "\${payload.expectedRevisionId}"). Please refresh.\`);
  }

  const section = String(payload.section || payload.category || 'general').trim();
  
  // Extract input settings (supporting flat settings, payload.data, and nested section models)
  let rawSettings = Object.assign({}, payload.settings || payload.data || {});

  // If payload contains nested category blocks, flatten them into rawSettings
  ['schoolProfile', 'school', 'documents', 'rules', 'miniui', 'systemConfig'].forEach(cat => {
    if (payload[cat] && typeof payload[cat] === 'object') {
      Object.assign(rawSettings, payload[cat]);
      if (payload[cat].signatories && typeof payload[cat].signatories === 'object') {
        Object.assign(rawSettings, payload[cat].signatories);
      }
    }
  });

  // Comprehensive Form Model to Backend Config Key Mapping (RPC-11)
  const fieldAliases = {
    'school_org': 'organization',
    'school_agency': 'agency',
    'officer_name': 'signatory_approver_name',
    'officer_pos': 'signatory_approver_title',
    'director_name': 'signatory_director_name',
    'director_pos': 'signatory_director_title',
    'schoolName': 'school_name',
    'schoolShortName': 'school_short_name',
    'schoolAddress': 'school_address',
    'schoolPhone': 'school_phone',
    'schoolEmail': 'school_email',
    'schoolLogoUrl': 'school_logo_url',
    'signatoryRequesterTitle': 'signatory_requester_title',
    'signatoryApproverName': 'signatory_approver_name',
    'signatoryApproverTitle': 'signatory_approver_title',
    'signatoryDirectorName': 'signatory_director_name',
    'signatoryDirectorTitle': 'signatory_director_title',
    'signatoriesEffectiveDate': 'signatories_effective_date',
    'documentPrefix': 'document_prefix',
    'documentPattern': 'document_pattern',
    'workflowMode': 'workflow_mode',
    'allowOverQuota': 'allow_over_quota',
    'lowStockThreshold': 'low_stock_threshold',
    'minStockThreshold': 'low_stock_threshold',
    'ropFactor': 'rop_factor',
    'fastMovingThreshold': 'fast_moving_threshold',
    'rulesEffectiveDate': 'rules_effective_date',
    'miniuiEnabled': 'miniui_enabled',
    'miniuiAllowedDepts': 'miniui_allowed_depts',
    'miniuiWelcomeMessage': 'miniui_welcome_message',
    'abcThresholdA': 'abc_threshold_a',
    'abcThresholdB': 'abc_threshold_b',
    'abcThresholdC': 'abc_threshold_c',
    'decimalUnits': 'decimal_units',
    'enableDemoRoleSwitch': 'enable_demo_role_switch'
  };

  const allowedKeys = [
    'school_name', 'organization', 'agency', 'school_address', 'school_phone', 'school_email', 'school_logo_url',
    'school_short_name', 'school_footer_note',
    'signatory_requester_title', 'signatory_approver_name', 'signatory_approver_title', 'signatory_director_name', 'signatory_director_title', 'signatories_effective_date', 'document_prefix', 'document_pattern',
    'workflow_mode', 'allow_over_quota', 'low_stock_threshold', 'rop_factor', 'fast_moving_threshold', 'rules_effective_date',
    'abc_threshold_a', 'abc_threshold_b', 'abc_threshold_c', 'movement_velocity_period_days',
    'miniui_enabled', 'miniui_welcome_message', 'miniui_allowed_depts', 'miniui_require_urgency', 'miniui_require_required_date', 'miniui_success_message',
    'decimal_units', 'enable_demo_role_switch', 'cache_ttl'
  ];

  let updatedCount = 0;
  Object.keys(rawSettings).forEach(rawKey => {
    const targetKey = fieldAliases[rawKey] || rawKey;
    if (allowedKeys.includes(targetKey)) {
      const val = rawSettings[rawKey];
      // CRITICAL (RPC-11): Preserve boolean false, number 0, and allowed empty strings without defaulting
      if (val !== undefined && val !== null) {
        setConfig_(targetKey, sanitizeCellValue(val));
        updatedCount++;
      }
    }
  });

  // Increment revision ID and bust data caches
  const nextRev = 'rev_' + Date.now();
  setConfig_('settings_revision_id', nextRev);
  try {
    const curRev = typeof getConfigInt === 'function' ? getConfigInt('data_revision', 1) : 1;
    setConfig_('data_revision', curRev + 1);
  } catch (de) {}

  if (typeof logAudit_ === 'function') {
    logAudit_('UPDATE_SETTINGS', 'SYSTEM', \`อัปเดตการตั้งค่าระบบหมวด \${section} (\${updatedCount} รายการ, rev: \${nextRev})\`, caller, true);
  }

  return {
    success: true,
    section: section,
    updatedCount: updatedCount,
    revisionId: nextRev,
    timestamp: new Date().toISOString()
  };
}`;

if (oldUpdateSettingsRegex.test(writeContent)) {
  writeContent = writeContent.replace(oldUpdateSettingsRegex, newUpdateSettings);
  console.log('[OK] Updated hrtUpdateSettings_ with form model adapters and zero/false preservation in Write.gs');
} else {
  console.warn('[WARN] Could not match oldUpdateSettingsRegex in Write.gs');
}

fs.writeFileSync('Write.gs', writeContent, 'utf8');
new Function(writeContent);
console.log('[OK] Write.gs valid JS!');

console.log('=== Step 4: Patching Api.gs ===');
let apiContent = fs.readFileSync('Api.gs', 'utf8');

// 1. Add qr_data alias to normalizeAndValidateAliases
const oldAliasMarker = "const normalized = Object.assign({}, rawPayload);";
const newAliasMarker = `const normalized = Object.assign({}, rawPayload);

    // Normalize QR token aliases
    if (normalized.hasOwnProperty('qr_data') && !normalized.hasOwnProperty('qr_token')) {
      normalized.qr_token = normalized.qr_data;
    }
    if (normalized.hasOwnProperty('qrData') && !normalized.hasOwnProperty('qr_token')) {
      normalized.qr_token = normalized.qrData;
    }`;

if (apiContent.includes(oldAliasMarker)) {
  apiContent = apiContent.replace(oldAliasMarker, newAliasMarker);
  console.log('[OK] Added QR alias normalization in Api.gs');
} else {
  console.warn('[WARN] Could not find oldAliasMarker in Api.gs');
}

// 2. Structured standard success response envelope with safe compatibility properties
const oldEnvelopeRegex = /\/\/ 6\. Structure Standard Success Response[\s\S]*?const response = Object\.assign\([\s\S]*?\);\s*\/\/ 7\. Record Idempotency/;

const newEnvelope = `// 6. Structure Canonical Response Envelope with Controlled Endpoint Adapters
      const response = {
        success: true,
        action: action,
        data: result,
        requestId: reqId,
        executionMs: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      // Populate endpoint-specific convenience aliases without unconstrained Object.assign (RPC-02, RPC-03)
      if (Array.isArray(result)) {
        if (action.startsWith('requisitions')) {
          response.requisitions = result;
        } else if (action.startsWith('audit')) {
          response.audit = result;
          response.logs = result;
        } else if (action.startsWith('users')) {
          response.users = result;
        } else if (action.startsWith('fsn')) {
          response.fsn = result;
        } else if (action.startsWith('stock.ledger')) {
          response.ledger = result;
        }
      } else if (result && typeof result === 'object') {
        if (action.startsWith('dashboard')) {
          response.metrics = result;
          response.kpis = {
            totalSKU: (typeof result.totalSKUs === 'number') ? result.totalSKUs : (result.totalItems || 0),
            totalStockQty: (typeof result.totalStockUnits === 'number') ? result.totalStockUnits : 0,
            totalAssetValue: (typeof result.totalValue === 'number') ? result.totalValue : (typeof result.filteredValue === 'number' ? result.filteredValue : 0),
            lowStockCount: (typeof result.lowCount === 'number') ? result.lowCount : (result.lowStockCount || 0),
            criticalStockCount: (typeof result.criticalCount === 'number') ? result.criticalCount : (result.criticalStockCount || 0),
            healthyCount: (typeof result.normalCount === 'number') ? result.normalCount : 0
          };
        } else if (action === 'stock.reconcile') {
          response.reconcile = result;
        } else if (action === 'audit.verify') {
          response.integrity = result;
        } else if (action.startsWith('settings')) {
          response.settings = result;
        }
      }

      // 7. Record Idempotency`;

if (oldEnvelopeRegex.test(apiContent)) {
  apiContent = apiContent.replace(oldEnvelopeRegex, newEnvelope);
  console.log('[OK] Enhanced standard response envelope in Api.gs');
} else {
  console.warn('[WARN] Could not match oldEnvelopeRegex in Api.gs');
}

fs.writeFileSync('Api.gs', apiContent, 'utf8');
new Function(apiContent);
console.log('[OK] Api.gs valid JS!');

console.log('=== Step 5: Patching Code.gs ===');
let codeContent = fs.readFileSync('Code.gs', 'utf8');

// 1. Decouple apiSubmitRequisition from review lifecycle
const oldApiSubmitRegex = /function apiSubmitRequisition\(payload\) \{[\s\S]*?return ApiRouter\.routeRequest\('requisitions\.create', payload\);\s*\}/;

const newApiSubmit = `function apiSubmitRequisition(payload) {
  if (typeof payload === 'string') {
    const err = new Error('VALIDATION_ERROR: apiSubmitRequisition requires a requisition payload object with line items. To review an existing requisition, call apiReviewRequisition.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  if (!payload || typeof payload !== 'object') {
    const err = new Error('VALIDATION_ERROR: Requisition payload must be an object containing items.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  return ApiRouter.routeRequest('requisitions.create', payload);
}`;

if (oldApiSubmitRegex.test(codeContent)) {
  codeContent = codeContent.replace(oldApiSubmitRegex, newApiSubmit);
  console.log('[OK] Decoupled apiSubmitRequisition from officer review lifecycle in Code.gs');
} else {
  console.warn('[WARN] Could not match oldApiSubmitRegex in Code.gs');
}

// 2. Ensure apiGetDashboardKPIs correctly maps res.metrics and res.kpis
const oldKpiRegex = /function apiGetDashboardKPIs\(filters\) \{[\s\S]*?return res;\s*\}/;

const newKpi = `function apiGetDashboardKPIs(filters) {
  const res = ApiRouter.routeRequest('dashboard.metrics', filters);
  if (res && res.success) {
    const m = (res.data && typeof res.data === 'object') ? res.data : res;
    res.metrics = m;
    res.kpis = {
      totalSKU: (typeof m.totalSKUs === 'number') ? m.totalSKUs : (m.totalItems || 0),
      totalStockQty: (typeof m.totalStockUnits === 'number') ? m.totalStockUnits : 0,
      totalAssetValue: (typeof m.totalValue === 'number') ? m.totalValue : (typeof m.filteredValue === 'number' ? m.filteredValue : 0),
      lowStockCount: (typeof m.lowCount === 'number') ? m.lowCount : (m.lowStockCount || 0),
      criticalStockCount: (typeof m.criticalCount === 'number') ? m.criticalCount : (m.criticalStockCount || 0),
      healthyCount: (typeof m.normalCount === 'number') ? m.normalCount : 0
    };
  }
  return res;
}`;

if (oldKpiRegex.test(codeContent)) {
  codeContent = codeContent.replace(oldKpiRegex, newKpi);
  console.log('[OK] Updated apiGetDashboardKPIs in Code.gs');
} else {
  console.warn('[WARN] Could not match oldKpiRegex in Code.gs');
}

fs.writeFileSync('Code.gs', codeContent, 'utf8');
new Function(codeContent);
console.log('[OK] Code.gs valid JS!');

console.log('=== Step 6: Patching index.html ===');
let indexContent = fs.readFileSync('index.html', 'utf8');

// 1. ApiServiceCore: catch success: false, timeout outcome: UNKNOWN_OUTCOME, clear timer
const oldOnSuccess = `                        const onSuccess = (res) => {
                            if (!done) {
                                done = true;
                                clearTimeout(timer);
                                resolve(res);
                            }
                        };`;

const newOnSuccess = `                        const onSuccess = (res) => {
                            if (!done) {
                                done = true;
                                clearTimeout(timer);
                                if (res && res.success === false) {
                                    const err = new Error(res.message || res.error || \`Action "\${fnName}" rejected by server.\`);
                                    err.code = res.code || 'API_REJECTED';
                                    err.response = res;
                                    err.requestId = res.requestId || reqId;
                                    err.isBusinessError = true;
                                    reject(err);
                                } else {
                                    resolve(res);
                                }
                            }
                        };`;

if (indexContent.includes(oldOnSuccess)) {
  indexContent = indexContent.replace(oldOnSuccess, newOnSuccess);
  console.log('[OK] Updated onSuccess in ApiServiceCore in index.html');
} else {
  console.warn('[WARN] Could not find oldOnSuccess in index.html');
}

// 2. ApiServiceCore timeout handler
const oldTimeoutMarker = `if (!done) { done = true; reject(new Error(\`Timeout: \${fnName} (\${reqId})\`)); }`;
const newTimeoutMarker = `if (!done) {
                            done = true;
                            clearTimeout(timer);
                            const err = new Error(\`Timeout: \${fnName} (\${reqId})\`);
                            err.code = 'TIMEOUT';
                            err.isTimeout = true;
                            err.outcome = 'UNKNOWN_OUTCOME';
                            reject(err);
                        }`;

if (indexContent.includes(oldTimeoutMarker)) {
  indexContent = indexContent.replace(oldTimeoutMarker, newTimeoutMarker);
  console.log('[OK] Updated timeout handler in ApiServiceCore in index.html');
} else {
  console.warn('[WARN] Could not find oldTimeoutMarker in index.html');
}

// 3. Add getRequisitions to window.RequisitionApi in index.html
const oldReqApi = `        window.RequisitionApi = {
            async createRequisition(payload) {
                return await window.ApiService.call('apiCreateRequisition', payload);
            },`;

const newReqApi = `        window.RequisitionApi = {
            async getRequisitions(filters = {}) {
                const res = await window.ApiService.call('apiGetRequisitions', filters);
                if (!res) return [];
                if (Array.isArray(res)) return res;
                if (res.data && Array.isArray(res.data)) return res.data;
                if (res.requisitions && Array.isArray(res.requisitions)) return res.requisitions;
                return [];
            },
            async createRequisition(payload) {
                return await window.ApiService.call('apiCreateRequisition', payload);
            },`;

if (indexContent.includes(oldReqApi)) {
  indexContent = indexContent.replace(oldReqApi, newReqApi);
  console.log('[OK] Added getRequisitions to window.RequisitionApi in index.html');
} else {
  console.warn('[WARN] Could not find oldReqApi in index.html');
}

fs.writeFileSync('index.html', indexContent, 'utf8');
console.log('[OK] index.html updated!');

console.log('\n=== ALL PROMPT 14 PATCHES APPLIED SUCCESSFULLY ===');
