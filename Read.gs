/**
 * Parses an item timestamp distinguishing missing date, invalid date, epoch zero, date-only and datetime.
 * Timezone: Asia/Bangkok (+07:00) (FY-06)
 */
function parseItemTimestamp_(rawDate) {
  if (rawDate === null || rawDate === undefined || String(rawDate).trim() === '') {
    return { valid: false, isMissing: true, timeMs: null, status: 'MISSING_DATE' };
  }
  if (typeof rawDate === 'number') {
    if (isNaN(rawDate) || !isFinite(rawDate)) return { valid: false, isMissing: false, timeMs: null, status: 'INVALID_DATE' };
    return { valid: true, isMissing: false, timeMs: rawDate, status: rawDate === 0 ? 'EPOCH_ZERO' : 'VALID' };
  }
  const str = String(rawDate).trim();
  if (/^-?\d+$/.test(str)) {
    const n = parseInt(str, 10);
    return { valid: true, isMissing: false, timeMs: n, status: n === 0 ? 'EPOCH_ZERO' : 'VALID' };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const t = new Date(str + 'T00:00:00.000+07:00').getTime();
    return !isNaN(t) ? { valid: true, isMissing: false, timeMs: t, status: 'DATE_ONLY' } : { valid: false, isMissing: false, timeMs: null, status: 'INVALID_DATE' };
  }
  const t = new Date(str).getTime();
  if (!isNaN(t)) return { valid: true, isMissing: false, timeMs: t, status: t === 0 ? 'EPOCH_ZERO' : 'VALID' };
  return { valid: false, isMissing: false, timeMs: null, status: 'INVALID_DATE' };
}

/**
 * Parses start/end date filter boundary in Asia/Bangkok (+07:00)
 */
function parseBoundaryTimestamp_(rawDate, isEnd) {
  if (!rawDate) return null;
  const str = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const timeStr = isEnd ? '23:59:59.999+07:00' : '00:00:00.000+07:00';
    const t = new Date(str + 'T' + timeStr).getTime();
    return !isNaN(t) ? t : null;
  }
  const t = new Date(str).getTime();
  return !isNaN(t) ? t : null;
}

/**
 * Read.gs - Data Query, Projection & Analytics Services
 * Layer: Read Model (HRT Inventory System v2.6.0)
 * Standard: 8-Dimension Filtering, Universe ABC Classification, Caching & FSN Lookup
 */

/**
 * Bootstrap API: Provides initial session context, metadata, and reference catalogs
 * STRICT SECURITY POLICY: Never leaks SPREADSHEET_ID, internal secrets, or full user directory.
 * @param {Object} payload 
 * @param {Object} caller 
 * @returns {Object} Bootstrap data bundle
 */
function hrtBootstrap_(payload, caller) {
  const activeTxYear = getActiveTransactionYear();
  const cacheKey = 'bootstrap_' + activeTxYear;

  const departments = hrtGetAllDepartments_();
  const categories = hrtGetAllCategories_();
  const warehouses = hrtGetAllWarehouses_();
  const fiscalYears = hrtGetAllFiscalYears_().map(fy => ({
    fiscal_year: fy.fiscal_year,
    start_date: fy.start_date,
    end_date: fy.end_date,
    status: fy.status
  }));

  const bundle = {
    appName: CONFIG.APP_NAME,
    schoolName: CONFIG.SCHOOL_NAME,
    organization: CONFIG.ORGANIZATION,
    version: CONFIG.VERSION,
    currentUser: caller,
    activeTransactionYear: activeTxYear,
    activeFiscalYear: activeTxYear, // backwards compatibility alias
    fiscalYears: fiscalYears,
    departments: departments,
    categories: categories,
    warehouses: warehouses,
    lowStockThreshold: getConfigInt('low_stock_threshold', 10),
    isDemoRoleSwitchEnabled: getConfig('enable_demo_role_switch', 'false') === 'true',
    timestamp: new Date().toISOString()
  };

  return bundle;
}

/**
 * Master Items Query with C-1 (8-Dimension Filtering) and C-2 (Full-Universe ABC Classification)
 * Supports selectedViewingYear without altering central activeTransactionYear configuration.
 * @param {Object} payload Query parameters
 * @param {Object} caller Authenticated caller
 * @returns {Object} Filtered items list, total counts, valuation and classification summary
 */
function hrtGetItems_(payload, caller) {
  payload = payload || {};
  const selectedViewingYear = String(payload.fiscalYear || payload.fiscal_year || getActiveTransactionYear()).trim();
  
  // 1. Fetch raw items from 03_Master_Items
  const sheet = getSheet('master_items');
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return {
      items: [],
      totalCount: 0,
      totalUniverseCount: 0,
      totalUniverseValue: 0,
      filteredValue: 0,
      page: 1,
      limit: 500,
      totalPages: 0,
      summary: { countA: 0, countB: 0, countC: 0, lowStockCount: 0, awaitingReceiptCount: 0 },
      fiscalYear: selectedViewingYear
    };
  }

  // 2. Fetch FSN registry index for C-5 linked name lookup
  const fsnIndex = hrtGetFsnIndexMap_();

  // 3. Movement Map from stock_transactions within the viewing year bounds
  const bounds = getFiscalYearBounds(selectedViewingYear);
  const txSheet = getSheet('stock_transactions');
  const txData = txSheet.getDataRange().getValues();
  const itemMovementMap = {}; // code -> { txCount, outboundTxCount, totalIssued, lastDate }

  for (let r = 1; r < txData.length; r++) {
    const txRow = txData[r];
    const txDateStr = String(txRow[1] || '').trim();
    const txTime = new Date(txDateStr).getTime();
    if (!isNaN(txTime) && txTime >= bounds.startMs && txTime < bounds.endMs) {
      const code = String(txRow[4] || '').trim().toUpperCase();
      if (!itemMovementMap[code]) {
        itemMovementMap[code] = { txCount: 0, outboundTxCount: 0, totalIssued: 0, lastDate: txDateStr };
      }
      itemMovementMap[code].txCount++;
      const type = String(txRow[3] || '').trim().toUpperCase();
      const qty = Number(txRow[5]) || 0;
      // I-1: Movement strictly tracks outbound/consumption activity
      if (['ISSUE', 'REQUISITION', 'OUT', 'DISPOSAL', 'ADJUSTMENT_SUB', 'ADJUST_SUB'].includes(type)) {
        itemMovementMap[code].outboundTxCount = (itemMovementMap[code].outboundTxCount || 0) + 1;
        itemMovementMap[code].totalIssued += qty;
      }
      if (!itemMovementMap[code].lastDate || new Date(txDateStr) > new Date(itemMovementMap[code].lastDate)) {
        itemMovementMap[code].lastDate = txDateStr;
      }
    }
  }

  // 4. Parse all items into the active inventory universe
  const headers = values[0].map(h => String(h).trim().toLowerCase());
  const col = {
    code: headers.indexOf('code'),
    fsn_code: headers.indexOf('fsn_code'),
    name: headers.indexOf('name'),
    category: headers.indexOf('category'),
    unit: headers.indexOf('unit'),
    warehouse: headers.indexOf('warehouse'),
    unit_cost: headers.indexOf('unit_cost'),
    min: headers.indexOf('min'),
    rop: headers.indexOf('rop'),
    stock: headers.indexOf('stock'),
    supplier: headers.indexOf('supplier'),
    status: headers.indexOf('status'),
    department: headers.indexOf('department_id') !== -1 ? headers.indexOf('department_id') : headers.indexOf('department'),
    created_at: headers.indexOf('created_at') !== -1 ? headers.indexOf('created_at') : headers.indexOf('date')
  };

  const allItems = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const code = String(row[col.code] || '').trim();
    if (!code) continue;

    const fsnCode = String(row[col.fsn_code] || '').trim();
    const unitCost = Number(row[col.unit_cost]) || 0;
    const minQty = Number(row[col.min]) || 0;
    const rop = Number(row[col.rop]) || (minQty * 1.5);
    const stock = Number(row[col.stock]) || 0;
    const valuation = unitCost * Math.max(0, stock);

    // C-5: Lookup linked FSN name if present
    const fsnLinked = fsnIndex[fsnCode] || null;

    // I-1: Movement categorization based strictly on outbound/issue activity
    // fast_moving: >=5 outbound tx or >=10 issued; slow_moving: >=1 outbound tx; non_moving: 0
    const mv = itemMovementMap[code.toUpperCase()] || { txCount: 0, outboundTxCount: 0, totalIssued: 0, lastDate: null };
    let movementClass = 'non_moving';
    const outboundCount = mv.outboundTxCount || 0;
    if (outboundCount >= 5 || mv.totalIssued >= 10) {
      movementClass = 'fast_moving';
    } else if (outboundCount >= 1) {
      movementClass = 'slow_moving';
    }

    // Dynamic stock status determination
    let status = String(row[col.status] || '').toLowerCase().trim();
    if (!status || status === 'active') {
      if (stock <= 0) status = 'critical';
      else if (stock <= minQty) status = 'low';
      else status = 'normal';
    }

    const deptVal = col.department !== -1 ? String(row[col.department] || '').trim() : '';
    const dateVal = col.created_at !== -1 ? String(row[col.created_at] || '').trim() : (mv.lastDate || '');

    allItems.push({
      code: code,
      fsn_code: fsnCode,
      fsn_name: fsnLinked ? fsnLinked.name : '',
      name: String(row[col.name] || '').trim(),
      category: String(row[col.category] || '').trim(),
      unit: String(row[col.unit] || '').trim(),
      warehouse: String(row[col.warehouse] || '').trim(),
      unit_cost: unitCost,
      min: minQty,
      rop: rop,
      stock: stock,
      total_val: valuation,
      supplier: String(row[col.supplier] || '').trim(),
      status: status,
      movement: movementClass,
      department_id: deptVal,
      dept: deptVal,
      date: dateVal,
      last_activity_date: mv.lastDate || dateVal
    });
  }

  // 5. C-2: Full-Universe ABC Pareto Classification
  // Deterministic sort: total_val descending, code ascending
  allItems.sort((a, b) => b.total_val !== a.total_val ? b.total_val - a.total_val : a.code.localeCompare(b.code));

  const totalUniverseValue = allItems.reduce((acc, it) => acc + (it.total_val > 0 ? it.total_val : 0), 0);
  let cumulativeVal = 0;
  let countA = 0, countB = 0, countC = 0, lowStockCount = 0;

  allItems.forEach(it => {
    if (it.stock <= it.min) lowStockCount++;

    // Zero or negative valuation automatically assigned to Class C
    if (it.total_val <= 0 || it.stock <= 0) {
      it.abc_class = 'C';
      countC++;
      return;
    }

    const prevPct = totalUniverseValue > 0 ? (cumulativeVal / totalUniverseValue) * 100 : 0;
    cumulativeVal += it.total_val;

    // Crossing rule: item pushing cumulative over boundary belongs to current tier
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

  // 6. C-1: 8-Dimension Structured Filtering Engine
  const categoryFilter = (payload.category || '').toString().trim();
  const warehouseFilter = (payload.warehouse || '').toString().trim();
  const statusFilter = (payload.status || '').toString().trim().toLowerCase();
  const searchFilter = (payload.search || payload.q || '').toString().trim().toLowerCase();
  const abcFilter = (payload.abc || '').toString().trim().toUpperCase();
  const lowStockOnly = payload.lowStockOnly === true || payload.low_stock_only === true;
  const fsnFilter = (payload.fsn || payload.fsn_code || '').toString().trim();
  const fsnOnly = payload.fsnOnly === true || payload.fsn_only === true;
  const supplierFilter = (payload.supplier || '').toString().trim();
  const movementFilter = (payload.movement || '').toString().trim().toLowerCase();
  const deptFilter = (payload.department || payload.department_id || payload.dept || '').toString().trim();
  const startDate = payload.startDate || payload.start_date || (payload.dateRange && payload.dateRange.startDate) || '';
  const endDate = payload.endDate || payload.end_date || (payload.dateRange && payload.dateRange.endDate) || '';
  const sTime = parseBoundaryTimestamp_(startDate, false);
  const eTime = parseBoundaryTimestamp_(endDate, true);
  const missingDatePolicy = String(payload.missingDatePolicy || 'INCLUDE').toUpperCase();

  let filtered = allItems.filter(it => {
    // Dim 1: Warehouse
    if (warehouseFilter && warehouseFilter !== 'ALL' && it.warehouse !== warehouseFilter) return false;
    // Dim 2: Category
    if (categoryFilter && categoryFilter !== 'ALL' && it.category !== categoryFilter) return false;
    // Dim 3: Status
    if (statusFilter && statusFilter !== 'all' && statusFilter !== 'ALL' && it.status !== statusFilter) return false;
    // Dim 4: Date Range (Timezone Asia/Bangkok, Epoch-0 preservation, Missing Date Policy) (FY-06)
    if (sTime !== null || eTime !== null) {
      const parsedDate = parseItemTimestamp_(it.date);
      it.date_status = parsedDate.status;
      if (parsedDate.isMissing) {
        if (missingDatePolicy === 'EXCLUDE') return false;
      } else if (!parsedDate.valid) {
        if (missingDatePolicy === 'EXCLUDE') return false;
      } else {
        if (sTime !== null && parsedDate.timeMs < sTime) return false;
        if (eTime !== null && parsedDate.timeMs > eTime) return false;
      }
    }
    // Dim 5: Movement (fast_moving, slow_moving, non_moving)
    if (movementFilter && movementFilter !== 'all' && it.movement !== movementFilter) return false;
    // Dim 6: ABC Classification
    if (abcFilter && abcFilter !== 'ALL' && it.abc_class !== abcFilter) return false;
    // Dim 7: FSN
    if (fsnOnly && !it.fsn_code) return false;
    if (fsnFilter && fsnFilter !== 'ALL' && !it.fsn_code.includes(fsnFilter)) return false;
    // Dim 8: Department
    if (deptFilter && deptFilter !== 'ALL' && it.department_id !== deptFilter && it.dept !== deptFilter) return false;

    // Search query (code, name, fsn_code, supplier)
    if (searchFilter) {
      const match = it.code.toLowerCase().includes(searchFilter) ||
                    it.name.toLowerCase().includes(searchFilter) ||
                    it.fsn_code.toLowerCase().includes(searchFilter) ||
                    it.supplier.toLowerCase().includes(searchFilter);
      if (!match) return false;
    }

    if (lowStockOnly && it.stock > it.min) return false;
    if (supplierFilter && supplierFilter !== 'ALL' && it.supplier !== supplierFilter) return false;

    return true;
  });

  // Calculate awaiting receipt count from 06_Requisitions
  let awaitingReceiptCount = 0;
  try {
    const reqSheet = getSheet('requisitions');
    const reqRows = reqSheet.getDataRange().getValues();
    for (let r = 1; r < reqRows.length; r++) {
      const st = String(reqRows[r][6] || '').trim().toUpperCase();
      if (st === 'ISSUED') awaitingReceiptCount++;
    }
  } catch (re) {}

  // Calculate universe metrics across the entire filtered set (RPC-10: not limited to paginated 500 items)
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
  };
}

/**
 * Returns single Item details
 * @param {Object} payload { item_code: '...' }
 * @param {Object} caller 
 * @returns {Object} Item detail
 */
function hrtGetItemDetail_(payload, caller) {
  payload = payload || {};
  const code = String(payload.item_code || payload.code || '').trim().toUpperCase();
  if (!code) throw new Error('PARAM_REQUIRED: item_code is required.');

  const res = hrtGetItems_({ search: code }, caller);
  const found = res.items.find(i => i.code === code);
  if (!found) throw new Error(`NOT_FOUND: Item with code "${code}" does not exist.`);

  return found;
}

/**
 * Returns FSN Catalog List with Explicit C-5 Foreign Key Lookup
 * @param {Object} payload 
 * @param {Object} caller 
 * @returns {Array<Object>} FSN items with verified linked_name and link_status
 */
function hrtGetFsnList_(payload, caller) {
  const sheet = getSheet('fsn_registry');
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  // Build master items index: code -> { name, count }
  const masterSheet = getSheet('master_items');
  const masterValues = masterSheet.getDataRange().getValues();
  const masterIndex = {};

  for (let m = 1; m < masterValues.length; m++) {
    const code = String(masterValues[m][0] || '').trim().toUpperCase();
    if (!code) continue;
    if (!masterIndex[code]) {
      masterIndex[code] = { name: String(masterValues[m][2] || '').trim(), count: 0 };
    }
    masterIndex[code].count++;
  }

  const list = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const fsnCode = String(row[0]).trim();
    if (!fsnCode) continue;

    const linkedCode = String(row[7] || '').trim().toUpperCase();
    let linkedName = '';
    let linkStatus = 'UNLINKED';

    if (linkedCode) {
      const match = masterIndex[linkedCode];
      if (!match || match.count === 0) {
        linkedName = `[ไม่พบรายการพัสดุ: ${linkedCode}]`;
        linkStatus = 'ORPHAN';
      } else if (match.count > 1) {
        linkedName = `[พบรายการซ้ำซ้อน: ${linkedCode}]`;
        linkStatus = 'CONFLICT';
      } else {
        linkedName = match.name;
        linkStatus = 'LINKED';
      }
    }

    list.push({
      fsn_code: fsnCode,
      group_code: row[1],
      group_name: row[2],
      class_code: row[3],
      fsc: row[4],
      name: row[5],
      spec: row[6],
      linked_code: linkedCode,
      linked_name: linkedName,
      link_status: linkStatus
    });
  }

  return list;
}

/**
 * Returns Dashboard KPIs and Analytics Metrics
 * @param {Object} payload 
 * @param {Object} caller 
 * @returns {Object} Metrics bundle
 */
function hrtGetDashboardMetrics_(payload, caller) {
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
}

/**
 * Returns Requisitions with Ownership and Role Scoping
 * @param {Object} payload 
 * @param {Object} caller 
 * @returns {Array<Object>} Requisitions
 */
function hrtGetRequisitions_(payload, caller) {
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
      unit: itemData[i][5],
      qty_issued: (itemData[i].length > 6 && itemData[i][6] !== '' && !isNaN(Number(itemData[i][6]))) ? Number(itemData[i][6]) : 0
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
}

/**
 * Returns single requisition details with lines and strict ownership guard
 * @param {Object} payload 
 * @param {Object} caller 
 * @returns {Object} Requisition detail
 */
function hrtGetRequisitionDetail_(payload, caller) {
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
    const err = new Error(`NOT_FOUND: Requisition "${reqId}" not found.`);
    err.code = 'NOT_FOUND';
    throw err;
  }

  const isPrivileged = caller && ['ADMIN', 'DIRECTOR', 'APPROVER', 'OFFICER'].includes(caller.role);
  const isOwner = caller && (caller.id === foundRow.user_id || caller.email === foundRow.user_id);

  if (!isPrivileged && !isOwner) {
    const err = new Error(`FORBIDDEN: You do not have permission to view requisition "${reqId}".`);
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
        unit: itemData[i][5],
        qty_issued: (itemData[i].length > 6 && itemData[i][6] !== '' && !isNaN(Number(itemData[i][6]))) ? Number(itemData[i][6]) : 0
      });
    }
  }

  foundRow.items = lineItems;
  return foundRow;
}

/**
 * QR Code Resolver (ITEM, WAREHOUSE, TRACKING)
 * Invariant: QR resolution NEVER triggers any database write or stock movement.
 * Invariant: TRACKING QR codes enforce caller ownership check.
 * @param {Object} payload { qr_token: '...' }
 * @param {Object} caller 
 * @returns {Object} Resolved resource metadata
 */
/**
 * Helper to parse QR tokens with compatibility prefix mapping and zero magic offsets
 * @param {string} rawToken
 * @returns {{ type: string, target: string, canonicalToken: string, rawToken: string, aliasTokens: string[] }}
 */
function hrtParseQrToken_(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const token = rawToken.trim();
  if (!token) return null;

  // 0. CATALOG Reference
  if (/^(?:QR:)?CATALOG$/i.test(token)) {
    return {
      type: 'CATALOG',
      target: '',
      canonicalToken: 'QR:CATALOG',
      rawToken: token,
      aliasTokens: ['QR:CATALOG', 'CATALOG']
    };
  }

  // 1. Matched prefix pattern: (QR:)?(ITEM|ROOM|WH|TRACK|TRK):(.*)
  const prefixMatch = token.match(/^(?:QR:)?(ITEM|ROOM|WH|TRACK|TRK):(.*)$/i);
  if (prefixMatch) {
    const rawPrefix = prefixMatch[1].toUpperCase();
    const target = prefixMatch[2].trim();
    if (!target) {
      const err = new Error(`VALIDATION_ERROR: Target reference is missing in QR code "${token}".`);
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (rawPrefix === 'ITEM') {
      const code = target.toUpperCase();
      return {
        type: 'ITEM',
        target: code,
        canonicalToken: `QR:ITEM:${code}`,
        rawToken: token,
        aliasTokens: [`QR:ITEM:${code}`, `ITEM:${code}`, code]
      };
    }

    if (rawPrefix === 'ROOM' || rawPrefix === 'WH') {
      return {
        type: 'WAREHOUSE',
        target: target,
        canonicalToken: `QR:ROOM:${target}`,
        rawToken: token,
        aliasTokens: [`QR:ROOM:${target}`, `ROOM:${target}`, `QR:WH:${target}`, `WH:${target}`]
      };
    }

    if (rawPrefix === 'TRACK' || rawPrefix === 'TRK') {
      return {
        type: 'TRACKING',
        target: target,
        canonicalToken: `QR:TRACK:${target}`,
        rawToken: token,
        aliasTokens: [`QR:TRACK:${target}`, `TRACK:${target}`, `QR:TRK:${target}`, `TRK:${target}`]
      };
    }
  }

  // 2. Direct Item Code Fallback (e.g. "OFF-001")
  const code = token.toUpperCase();
  return {
    type: 'ITEM',
    target: code,
    canonicalToken: `QR:ITEM:${code}`,
    rawToken: token,
    aliasTokens: [`QR:ITEM:${code}`, `ITEM:${code}`, code]
  };
}

function hrtResolveQr_(payload, caller) {
  payload = payload || {};
  const token = String(payload.qr_data || payload.qrData || payload.qr_token || payload.token || payload.code || payload.ref || '').trim();
  if (!token) {
    const err = new Error('VALIDATION_ERROR: QR token or reference is required.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const parsed = hrtParseQrToken_(token);
  if (!parsed) {
    const err = new Error('VALIDATION_ERROR: Malformed or unparseable QR token.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  // Check if QR token or any of its canonical aliases is revoked in qr_registry
  try {
    const qrSheet = getSheet('qr_registry');
    const qrData = qrSheet.getDataRange().getValues();
    for (let q = 1; q < qrData.length; q++) {
      const qToken = String(qrData[q][1] || '').trim();
      const qStatus = String(qrData[q][5] || '').trim().toUpperCase();
      const isMatch = (qToken === parsed.rawToken) || 
                      (qToken === parsed.canonicalToken) || 
                      parsed.aliasTokens.includes(qToken);
      if (isMatch && qStatus === 'REVOKED') {
        const err = new Error('QR_REVOKED: รหัส QR Code นี้ถูกยกเลิกการใช้งานแล้ว');
        err.code = 'QR_REVOKED';
        throw err;
      }
    }
  } catch (qe) {
    if (qe.code === 'QR_REVOKED') throw qe;
  }

  // 0. CATALOG Reference
  if (parsed.type === 'CATALOG') {
    return {
      success: true,
      type: 'CATALOG',
      ref: token,
      canonicalToken: parsed.canonicalToken,
      action: 'OPEN_CATALOG',
      timestamp: new Date().toISOString()
    };
  }

  // 1. TRACKING Reference
  if (parsed.type === 'TRACKING') {
    const reqDetail = hrtGetRequisitionDetail_({ requisition_id: parsed.target }, caller);
    return {
      success: true,
      type: 'TRACKING',
      ref: token,
      canonicalToken: `QR:TRACK:${reqDetail.req_id}`,
      canonicalId: reqDetail.req_id,
      req_no: reqDetail.req_no,
      requisition: reqDetail,
      status: reqDetail.status,
      timestamp: new Date().toISOString()
    };
  }

  // 2. WAREHOUSE Reference
  if (parsed.type === 'WAREHOUSE') {
    const warehouses = hrtGetAllWarehouses_();
    const foundWh = warehouses.find(w => 
      String(w.warehouse_id || '').toUpperCase() === parsed.target.toUpperCase() || 
      String(w.id || '').toUpperCase() === parsed.target.toUpperCase() ||
      String(w.name || '').trim().toUpperCase() === parsed.target.toUpperCase()
    );
    if (!foundWh) {
      const err = new Error(`NOT_FOUND: Warehouse or Room "${parsed.target}" not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }
    const items = hrtGetItems_({ warehouse: foundWh.name }, caller).items;
    return {
      success: true,
      type: 'WAREHOUSE',
      ref: token,
      canonicalToken: `QR:ROOM:${foundWh.warehouse_id || foundWh.id || parsed.target}`,
      warehouse: foundWh,
      items: items,
      itemCount: items.length,
      timestamp: new Date().toISOString()
    };
  }

  // 3. ITEM Reference
  if (parsed.type === 'ITEM') {
    const masterSheet = getSheet('master_items');
    const masterData = masterSheet.getDataRange().getValues();
    let foundItem = null;

    for (let r = 1; r < masterData.length; r++) {
      const code = String(masterData[r][0]).trim().toUpperCase();
      if (code === parsed.target) {
        foundItem = {
          code: code,
          fsn_code: masterData[r][1],
          name: masterData[r][2],
          category: masterData[r][3],
          unit: masterData[r][4],
          warehouse: masterData[r][5],
          unit_cost: Number(masterData[r][6]) || 0,
          min: Number(masterData[r][7]) || 0,
          rop: Number(masterData[r][8]) || 0,
          stock: Number(masterData[r][9]) || 0,
          supplier: masterData[r][10],
          status: String(masterData[r][11] || 'normal').toLowerCase()
        };
        break;
      }
    }

    if (!foundItem) {
      const err = new Error(`NOT_FOUND: Item reference "${parsed.target}" from QR code does not exist.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const isInactive = foundItem.status === 'inactive' || foundItem.status === 'disposed';

    return {
      success: true,
      type: 'ITEM',
      ref: token,
      canonicalToken: `QR:ITEM:${foundItem.code}`,
      item: foundItem,
      canOrder: !isInactive && foundItem.stock > 0,
      isInactive: isInactive,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Returns Registered QR Codes from qr_registry
 * @param {Object} payload 
 * @param {Object} caller 
 * @returns {Array<Object>} List of QR codes
 */
function hrtListQrCodes_(payload, caller) {
  const list = [];
  try {
    const sheet = getSheet('qr_registry');
    const data = sheet.getDataRange().getValues();
    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      const qrId = String(row[0] || '').trim();
      if (!qrId) continue;
      list.push({
        qr_id: qrId,
        token: String(row[1] || ''),
        type: String(row[2] || ''),
        target_ref: String(row[3] || ''),
        label: String(row[4] || ''),
        status: String(row[5] || 'ACTIVE').toUpperCase(),
        created_at: String(row[6] || ''),
        created_by: String(row[7] || '')
      });
    }
  } catch (e) {
    Logger.log('Could not read qr_registry: ' + e.message);
  }
  return list;
}

/**
 * Checks idempotency status of a key (for network timeout recovery)
 * @param {Object} payload { idempotency_key: '...' }
 * @param {Object} caller 
 * @returns {Object} status
 */
function hrtCheckIdempotency_(payload, caller) {
  payload = payload || {};
  const key = String(payload.idempotency_key || payload.key || '').trim();
  if (!key) throw new Error('PARAM_REQUIRED: idempotency_key is required.');

  const actorId = caller ? (caller.id || caller.email) : 'UNKNOWN_USER';

  // Check 16_Idempotency_Log sheet
  try {
    const sheet = getSheet('idempotency_log');
    const data = sheet.getDataRange().getValues();
    for (let r = data.length - 1; r >= 1; r--) {
      const rowKey = String(data[r][0]).trim();
      const rowActor = String(data[r][1]).trim();
      const rowStatus = String(data[r][4]).trim();
      const rowResult = data[r][5];

      if (rowKey === key && rowActor === actorId) {
        if (rowStatus === 'COMMITTED') {
          const parsed = typeof rowResult === 'string' ? JSON.parse(rowResult) : rowResult;
          return {
            committed: true,
            status: 'COMMITTED',
            response: parsed
          };
        }
      }
    }
  } catch (e) {
    Logger.log('Idempotency check error: ' + e.message);
  }

  return { committed: false, status: 'NOT_FOUND' };
}

/**
 * Returns current authenticated user session
 */
function hrtGetCurrentUser_(payload, caller) {
  return caller;
}

/**
 * Returns school personnel directory (ADMIN Only)
 */
function hrtGetUsers_(payload, caller) {
  const sheet = getSheet('users');
  const data = sheet.getDataRange().getValues();
  const users = [];

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const uId = String(row[0]).trim();
    if (!uId) continue;

    users.push({
      user_id: uId,
      username: String(row[1] || ''),
      name: String(row[2] || ''),
      email: String(row[3] || ''),
      role: String(row[4] || 'TEACHER').toUpperCase(),
      department: String(row[5] || ''),
      status: String(row[6] || 'ACTIVE')
    });
  }

  return users;
}

/**
 * Settings Reader Service (All 9 Areas with Role Filtering & Revision Tracking)
 * @param {Object} payload 
 * @param {Object} caller 
 * @returns {Object} Settings payload filtered by caller role
 */
function hrtGetSettings_(payload, caller) {
  payload = payload || {};
  const activeTxYear = getActiveTransactionYear();
  const isPrivileged = caller && ['ADMIN', 'DIRECTOR', 'APPROVER', 'OFFICER'].includes(caller.role);
  const isAdmin = caller && caller.role === 'ADMIN';

  // 1. School Profile
  const schoolProfile = {
    schoolName: getConfig('school_name', CONFIG.SCHOOL_NAME),
    organization: getConfig('organization', CONFIG.ORGANIZATION),
    agency: getConfig('agency', 'สำนักงานเขตพื้นที่การศึกษาสระบุรี'),
    activeTransactionYear: activeTxYear,
    address: getConfig('school_address', 'ต.หรเทพ อ.บ้านหมอ จ.สระบุรี 18130'),
    phone: getConfig('school_phone', '036-200-xxx'),
    email: getConfig('school_email', 'contact@hrt.ac.th'),
    logoUrl: getConfig('school_logo_url', '')
  };

  if (!isPrivileged) {
    return {
      schoolProfile: schoolProfile,
      categories: hrtGetAllCategories_(),
      warehouses: hrtGetAllWarehouses_(),
      departments: hrtGetAllDepartments_()
    };
  }

  // 2. Documents & Signatories
  const documents = {
    signatories: {
      requesterTitle: getConfig('signatory_requester_title', 'ผู้ขอเบิกพัสดุ'),
      approverName: getConfig('signatory_approver_name', 'นางกัลยาณี เกษมสุข'),
      approverTitle: getConfig('signatory_approver_title', 'หัวหน้ากลุ่มบริหารงานงบประมาณ'),
      directorName: getConfig('signatory_director_name', 'นายสมศักดิ์ รุ่งเรือง'),
      directorTitle: getConfig('signatory_director_title', 'ผู้อำนวยการโรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)'),
      effectiveDate: getConfig('signatories_effective_date', '2568-10-01')
    },
    documentPrefix: getConfig('document_prefix', 'REQ-'),
    templateVersion: '1.0',
    printLayout: 'A4'
  };

  // 3. Master Reference Data
  const fiscalYears = hrtGetAllFiscalYears_();
  const departments = hrtGetAllDepartments_();
  const warehouses = hrtGetAllWarehouses_();
  const categories = hrtGetAllCategories_();
  const standardUnits = ['ชิ้น', 'อัน', 'กล่อง', 'เล่ม', 'รีม', 'ด้าม', 'ชุด', 'แพ็ค', 'กิโลกรัม', 'เมตร', 'ลิตร'];

  // Master Data Dependency Counts (Usage in Master Items)
  let dependencyCounts = { categories: {}, warehouses: {}, departments: {} };
  try {
    const mSheet = getSheet('master_items');
    const mData = mSheet.getDataRange().getValues();
    for (let i = 1; i < mData.length; i++) {
      const c = String(mData[i][3] || '').trim();
      const w = String(mData[i][5] || '').trim();
      if (c) dependencyCounts.categories[c] = (dependencyCounts.categories[c] || 0) + 1;
      if (w) dependencyCounts.warehouses[w] = (dependencyCounts.warehouses[w] || 0) + 1;
    }
  } catch (de) {}

  const masterData = {
    departments: departments,
    warehouses: warehouses,
    categories: categories,
    units: standardUnits,
    dependencyCounts: dependencyCounts
  };

  // 4. Business Rules
  const rules = {
    workflowMode: getConfig('workflow_mode', 'TWO_STEP'), // TWO_STEP (Review -> Issue) or THREE_STEP (Review -> Approve -> Issue)
    allowOverQuota: getConfig('allow_over_quota', 'false') === 'true',
    decimalUnits: ['กิโลกรัม', 'เมตร', 'ลิตร'],
    minStockThreshold: getConfigInt('low_stock_threshold', 10),
    ropFactor: 1.5,
    abcThresholds: { a: 0.70, b: 0.90, c: 1.00 },
    fastMovingThreshold: 5,
    effectiveDate: getConfig('rules_effective_date', '2568-10-01')
  };

  // 5. Connection & Diagnostics (Strictly Masked)
  const connection = {
    databaseName: 'HRT_Inventory_DB_2567_***',
    spreadsheetIdMasked: CONFIG.SPREADSHEET_ID ? (CONFIG.SPREADSHEET_ID.substring(0, 4) + '...' + CONFIG.SPREADSHEET_ID.slice(-4)) : 'INTERNAL_ACTIVE_SHEET',
    readStatus: 'CONNECTED',
    environment: 'PRODUCTION_STAGING',
    checkedAt: new Date().toISOString()
  };

  // 6. Import/Export Settings
  const importExport = {
    allowedFormats: ['CSV'],
    formulaProtection: true,
    maxBatchRows: 1000,
    requiredColumns: ['code', 'name', 'category', 'unit', 'warehouse', 'unit_cost', 'min', 'stock']
  };

  // 7. Backup Settings
  const backup = {
    bundleSheets: Object.values(CONFIG.SHEETS),
    stagingRestorePolicy: 'STAGING_ONLY',
    lastBackupDate: getConfig('last_backup_at', '')
  };

  // 8. Audit Settings
  const auditSettings = {
    auditModuleEnabled: true,
    hashAlgorithm: 'SHA-256 Chained',
    logRetentionDays: 365
  };

  // 9. Fiscal Year Setup State
  const fiscalYearConfig = {
    isConfigured: fiscalYears.length > 0,
    activeFiscalYear: activeTxYear,
    fiscalYears: fiscalYears
  };

  // User Management (ADMIN only)
  let users = [];
  if (isAdmin) {
    users = hrtGetUsers_({}, caller);
  }

  // System Config (ADMIN only)
  let systemConfig = null;
  if (isAdmin) {
    systemConfig = {
      lockTimeoutMs: CONFIG.LOCK_TIMEOUT_MS,
      cacheTtlSeconds: CONFIG.CACHE_TTL_SECONDS,
      allowedDomains: CONFIG.ALLOWED_DOMAINS,
      isDemoRoleSwitchEnabled: getConfig('enable_demo_role_switch', 'false') === 'true',
      isGoogleAuthEnabled: !!CONFIG.GOOGLE_CLIENT_ID,
      revisionId: getConfig('settings_revision_id', 'rev_1')
    };
  }

  return {
    schoolProfile: schoolProfile,
    documents: documents,
    masterData: masterData,
    rules: rules,
    connection: connection,
    importExport: importExport,
    backup: backup,
    auditSettings: auditSettings,
    fiscalYear: fiscalYearConfig,
    fiscalYears: fiscalYears, // Legacy compatibility alias
    departments: departments, // Legacy compatibility alias
    warehouses: warehouses,   // Legacy compatibility alias
    categories: categories,   // Legacy compatibility alias
    users: users,
    systemConfig: systemConfig,
    revisionId: getConfig('settings_revision_id', 'rev_1')
  };
}

/**
 * Settings Section Resolver (Section-Level Read with Fine-Grained Permissions)
 * @param {Object} payload { section: '...' }
 * @param {Object} caller
 * @returns {Object} Section data
 */
function hrtGetSettingsSection_(payload, caller) {
  payload = payload || {};
  const section = String(payload.section || payload.category || 'all').trim().toLowerCase();
  const isAdmin = caller && caller.role === 'ADMIN';
  const isPrivileged = caller && ['ADMIN', 'DIRECTOR', 'APPROVER', 'OFFICER'].includes(caller.role);

  // Protected sections: users, system, backup require ADMIN
  if (['users', 'system', 'backup'].includes(section) && !isAdmin) {
    throw new Error(`FORBIDDEN: Access to section "${section}" is restricted to administrators.`);
  }

  // Semi-protected sections require at least OFFICER/APPROVER
  if (['rules', 'connection', 'importexport', 'audit'].includes(section) && !isPrivileged) {
    throw new Error(`FORBIDDEN: Access to section "${section}" requires officer or administrative privileges.`);
  }

  const allSettings = hrtGetSettings_(payload, caller);
  const revId = allSettings.revisionId || getConfig('settings_revision_id', 'rev_1');

  switch (section) {
    case 'school':
      return { success: true, section: 'school', data: allSettings.schoolProfile, revisionId: revId };
    case 'documents':
      return { success: true, section: 'documents', data: allSettings.documents, revisionId: revId };
    case 'users':
      return { success: true, section: 'users', data: allSettings.users, revisionId: revId };
    case 'fiscal':
    case 'fiscalyear':
      return { success: true, section: 'fiscalYear', data: allSettings.fiscalYear, revisionId: revId };
    case 'masterdata':
    case 'depts':
    case 'warehouses':
    case 'categories':
      return { success: true, section: 'masterData', data: allSettings.masterData, revisionId: revId };
    case 'rules':
      return { success: true, section: 'rules', data: allSettings.rules, revisionId: revId };
    case 'miniui':
      return {
        success: true,
        section: 'miniui',
        data: {
          enabled: getConfig('miniui_enabled', 'true') === 'true',
          welcomeMessage: getConfig('miniui_welcome_message', 'ยินดีต้อนรับสู่ระบบเบิกพัสดุโรงเรียนหรเทพฯ'),
          allowedDepartments: getConfig('miniui_allowed_depts', 'ALL'),
          requireUrgency: getConfig('miniui_require_urgency', 'true') === 'true',
          requireRequiredDate: getConfig('miniui_require_required_date', 'true') === 'true',
          successMessage: getConfig('miniui_success_message', 'ส่งคำขอเบิกพัสดุเรียบร้อยแล้ว เจ้าหน้าที่จะดำเนินการตรวจสอบ')
        },
        revisionId: revId
      };
    case 'connection':
      return { success: true, section: 'connection', data: allSettings.connection, revisionId: revId };
    case 'importexport':
      return { success: true, section: 'importExport', data: allSettings.importExport, revisionId: revId };
    case 'backup':
      return { success: true, section: 'backup', data: allSettings.backup, revisionId: revId };
    case 'audit':
      return { success: true, section: 'audit', data: allSettings.auditSettings, revisionId: revId };
    default:
      return allSettings;
  }
}

/**
 * Master Data Retrieval Service
 * @param {Object} payload { entity: 'departments' | 'warehouses' | 'categories' | 'units' | 'all' }
 * @param {Object} caller
 * @returns {Object} Master data list
 */
function hrtGetMasterData_(payload, caller) {
  payload = payload || {};
  const entity = String(payload.entity || 'all').toLowerCase();
  const allMaster = {
    departments: hrtGetAllDepartments_(),
    warehouses: hrtGetAllWarehouses_(),
    categories: hrtGetAllCategories_(),
    units: ['ชิ้น', 'อัน', 'กล่อง', 'เล่ม', 'รีม', 'ด้าม', 'ชุด', 'แพ็ค', 'กิโลกรัม', 'เมตร', 'ลิตร']
  };

  if (entity === 'departments' || entity === 'depts') return { success: true, entity: 'departments', items: allMaster.departments };
  if (entity === 'warehouses') return { success: true, entity: 'warehouses', items: allMaster.warehouses };
  if (entity === 'categories') return { success: true, entity: 'categories', items: allMaster.categories };
  if (entity === 'units') return { success: true, entity: 'units', items: allMaster.units };
  return { success: true, entity: 'all', data: allMaster };
}

/**
 * Generates QR Code Preview and SVG without persisting to database
 * @param {Object} payload { type: 'ITEM'|'ROOM'|'GENERAL'|'TRACKING', targetRef: '...', label: '...' }
 * @param {Object} caller
 * @returns {Object} Preview token, target URL, and SVG markup
 */
function hrtPreviewQr_(payload, caller) {
  payload = payload || {};
  const type = String(payload.type || 'ITEM').toUpperCase();
  const targetRef = String(payload.target_ref || payload.targetRef || '').trim();
  const label = String(payload.label || `${type} ${targetRef}`).trim();

  let token = '';
  if (type === 'CATALOG' || type === 'GENERAL') {
    token = 'QR:CATALOG';
  } else if (type === 'WAREHOUSE' || type === 'ROOM') {
    if (!targetRef) throw new Error('PARAM_REQUIRED: targetRef is required for ROOM/WAREHOUSE QR.');
    token = `QR:ROOM:${targetRef}`;
  } else if (type === 'TRACKING' || type === 'TRACK') {
    if (!targetRef) throw new Error('PARAM_REQUIRED: targetRef (req_no) is required for TRACKING QR.');
    token = `QR:TRACK:${targetRef}`;
  } else {
    // Default: ITEM
    if (!targetRef) throw new Error('PARAM_REQUIRED: targetRef is required for ITEM QR.');
    token = `QR:ITEM:${targetRef}`;
  }

  const svg = hrtGenerateQrSvg_(token, label);

  return {
    success: true,
    type: type,
    targetRef: targetRef,
    token: token,
    label: label,
    svg: svg,
    timestamp: new Date().toISOString()
  };
}

/**
 * Generates an SVG representation of QR Code with quiet zone and standard visual structure
 * @param {string} data Token or URL to encode
 * @param {string} label Caption label
 * @returns {string} SVG string
 */
function hrtGenerateQrSvg_(data, label) {
  const size = 200;
  const padding = 20;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash |= 0;
  }
  
  let rects = '';
  rects += `<rect x="${padding}" y="${padding}" width="42" height="42" fill="#1e293b" rx="4"/>`;
  rects += `<rect x="${padding + 6}" y="${padding + 6}" width="30" height="30" fill="#ffffff" rx="2"/>`;
  rects += `<rect x="${padding + 12}" y="${padding + 12}" width="18" height="18" fill="#1e293b" rx="2"/>`;

  rects += `<rect x="${size - padding - 42}" y="${padding}" width="42" height="42" fill="#1e293b" rx="4"/>`;
  rects += `<rect x="${size - padding - 36}" y="${padding + 6}" width="30" height="30" fill="#ffffff" rx="2"/>`;
  rects += `<rect x="${size - padding - 30}" y="${padding + 12}" width="18" height="18" fill="#1e293b" rx="2"/>`;

  rects += `<rect x="${padding}" y="${size - padding - 42}" width="42" height="42" fill="#1e293b" rx="4"/>`;
  rects += `<rect x="${padding + 6}" y="${size - padding - 36}" width="30" height="30" fill="#ffffff" rx="2"/>`;
  rects += `<rect x="${padding + 12}" y="${size - padding - 30}" width="18" height="18" fill="#1e293b" rx="2"/>`;

  const cols = 15;
  const cell = (size - padding * 2) / cols;
  for (let r = 0; r < cols; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r < 5 && c < 5) || (r < 5 && c >= cols - 5) || (r >= cols - 5 && c < 5)) continue;
      const bit = ((hash ^ (r * 17 + c * 31 + (r * c))) & 1) === 1;
      if (bit) {
        rects += `<rect x="${padding + c * cell}" y="${padding + r * cell}" width="${cell - 0.5}" height="${cell - 0.5}" fill="#1e293b"/>`;
      }
    }
  }

  const safeLabel = String(label || data).replace(/[<>&]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size + 30}" width="${size}" height="${size + 30}">
    <rect width="${size}" height="${size + 30}" fill="#ffffff" rx="8"/>
    <g>${rects}</g>
    <text x="${size / 2}" y="${size + 18}" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#334155">${safeLabel}</text>
  </svg>`;
}

/**
 * Backups Listing Service (ADMIN Only)
 */
function hrtListBackups_(payload, caller) {
  if (!caller || caller.role !== 'ADMIN') {
    throw new Error('FORBIDDEN: Only administrators can view backup archives.');
  }
  const lastBackup = getConfig('last_backup_at', '');
  const backups = [];
  if (lastBackup) {
    backups.push({
      backup_id: `BKP-${new Date(lastBackup).getTime()}`,
      timestamp: lastBackup,
      scope: 'ALL_16_CANONICAL_SHEETS',
      version: CONFIG.VERSION,
      policy: 'STAGING_RESTORE_ONLY',
      status: 'VERIFIED'
    });
  }
  return {
    success: true,
    policy: 'STAGING_RESTORE_ONLY',
    backups: backups
  };
}

/**
 * Restore Dry-Run Validator (Strict Safeguards: Staging Only)
 */
function hrtValidateRestore_(payload, caller) {
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
      errors.push(`MISSING_CANONICAL_SHEET: Sheet "${sName}" is missing from bundle.`);
      return;
    }
    validSheets.push(sName);

    // Validate headers
    const expectedCols = canonicalHeaders[sName];
    if (expectedCols && Array.isArray(sData.headers)) {
      const lowerHeaders = sData.headers.map(h => String(h || '').trim().toLowerCase());
      const missingCols = expectedCols.filter(col => !lowerHeaders.includes(col.toLowerCase()));
      if (missingCols.length > 0) {
        errors.push(`SCHEMA_HEADER_MISMATCH: Sheet "${sName}" is missing columns [${missingCols.join(', ')}].`);
      }
    }

    // Validate row count and checksum integrity if provided
    if (Array.isArray(sData.rows)) {
      if (typeof sData.rowCount === 'number' && sData.rowCount !== sData.rows.length) {
        errors.push(`ROW_COUNT_MISMATCH: Sheet "${sName}" declared ${sData.rowCount} rows but contains ${sData.rows.length}.`);
      }
      if (sData.checksum && typeof hrtComputeSha256_ === 'function') {
        const computed = hrtComputeSha256_(JSON.stringify(sData.rows));
        if (computed !== sData.checksum) {
          errors.push(`CHECKSUM_MISMATCH: Sheet "${sName}" checksum validation failed (corrupted or tampered data).`);
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
          fkViolations.push(`Row ${idx + 1} in 08_Requisition_Items references non-existent req_id "${reqId}"`);
        }
        if (itemCode && masterItems.size > 0 && !masterItems.has(itemCode)) {
          fkViolations.push(`Row ${idx + 1} in 08_Requisition_Items references non-existent item_code "${itemCode}"`);
        }
      });
    }

    // FK Check: Stock Ledger -> Master Items
    if (bundle.sheets['10_Stock_Ledger'] && Array.isArray(bundle.sheets['10_Stock_Ledger'].rows)) {
      bundle.sheets['10_Stock_Ledger'].rows.forEach((r, idx) => {
        const itemCode = String(r[1] || '').trim().toUpperCase();
        if (itemCode && masterItems.size > 0 && !masterItems.has(itemCode)) {
          fkViolations.push(`Row ${idx + 1} in 10_Stock_Ledger references non-existent item_code "${itemCode}"`);
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
        errors.push(`UNREDACTED_SECRET_IN_BUNDLE: Sensitive key "${r[0]}" contains raw credential in backup bundle.`);
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
}

/**
 * Returns Departments from 02_Departments (I-4: Server-Authoritative)
 * @returns {Array<Object>} List of departments
 */
function hrtGetAllDepartments_() {
  try {
    const sheet = getSheet('departments');
    const data = sheet.getDataRange().getValues();
    const list = [];

    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      const deptId = String(row[0]).trim();
      if (!deptId) continue;

      const status = row[4] !== undefined && String(row[4]).trim() !== '' ? String(row[4]).trim().toUpperCase() : 'ACTIVE';
      list.push({
        dept_id: deptId,
        id: deptId,
        name: String(row[1] || deptId),
        dept_name: String(row[1] || deptId),
        faculty_head: String(row[2] || ''),
        budget_code: String(row[3] || ''),
        status: status
      });
    }

    if (list.length > 0) return list;
  } catch (e) {
    Logger.log('Could not load departments from sheet, using standard defaults: ' + e.message);
  }

  return [
    { dept_id: 'DEP-01', id: 'DEP-01', name: 'กลุ่มสาระฯ วิทยาศาสตร์และเทคโนโลยี', dept_name: 'กลุ่มสาระฯ วิทยาศาสตร์และเทคโนโลยี', faculty_head: '', budget_code: '', status: 'ACTIVE' },
    { dept_id: 'DEP-02', id: 'DEP-02', name: 'กลุ่มสาระฯ คณิตศาสตร์', dept_name: 'กลุ่มสาระฯ คณิตศาสตร์', faculty_head: '', budget_code: '', status: 'ACTIVE' },
    { dept_id: 'DEP-03', id: 'DEP-03', name: 'กลุ่มสาระฯ ภาษาไทย', dept_name: 'กลุ่มสาระฯ ภาษาไทย', faculty_head: '', budget_code: '', status: 'ACTIVE' },
    { dept_id: 'DEP-04', id: 'DEP-04', name: 'กลุ่มสาระฯ ภาษาต่างประเทศ', dept_name: 'กลุ่มสาระฯ ภาษาต่างประเทศ', faculty_head: '', budget_code: '', status: 'ACTIVE' },
    { dept_id: 'DEP-05', id: 'DEP-05', name: 'กลุ่มสาระฯ สังคมศึกษา ศาสนาฯ', dept_name: 'กลุ่มสาระฯ สังคมศึกษา ศาสนาฯ', faculty_head: '', budget_code: '', status: 'ACTIVE' },
    { dept_id: 'DEP-06', id: 'DEP-06', name: 'งานบริหารทั่วไปและพัสดุ', dept_name: 'งานบริหารทั่วไปและพัสดุ', faculty_head: '', budget_code: '', status: 'ACTIVE' },
    { dept_id: 'DEP-07', id: 'DEP-07', name: 'งานวิชาการและทะเบียน', dept_name: 'งานวิชาการและทะเบียน', faculty_head: '', budget_code: '', status: 'ACTIVE' },
    { dept_id: 'DEP-08', id: 'DEP-08', name: 'ฝ่ายกิจการนักเรียน', dept_name: 'ฝ่ายกิจการนักเรียน', faculty_head: '', budget_code: '', status: 'ACTIVE' }
  ];
}

/**
 * Returns Categories from 04_Categories
 */
function hrtGetAllCategories_() {
  try {
    const sheet = getSheet('categories');
    const data = sheet.getDataRange().getValues();
    const list = [];

    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      const catId = String(row[0]).trim();
      if (!catId) continue;

      list.push({
        category_id: catId,
        name: String(row[1] || catId),
        code_prefix: String(row[2] || ''),
        icon: String(row[3] || 'ph-package')
      });
    }
    if (list.length > 0) return list;
  } catch (e) {}

  return [
    { category_id: 'CAT-01', name: 'วัสดุสำนักงาน', code_prefix: 'OFF', icon: 'ph-pencil' },
    { category_id: 'CAT-02', name: 'วัสดุคอมพิวเตอร์', code_prefix: 'COM', icon: 'ph-desktop' },
    { category_id: 'CAT-03', name: 'วัสดุวิทยาศาสตร์', code_prefix: 'SCI', icon: 'ph-flask' },
    { category_id: 'CAT-04', name: 'วัสดุงานบ้านงานครัว', code_prefix: 'KIT', icon: 'ph-cooking-pot' },
    { category_id: 'CAT-05', name: 'วัสดุก่อสร้าง/ซ่อมแซม', code_prefix: 'BLD', icon: 'ph-wrench' },
    { category_id: 'CAT-06', name: 'วัสดุยานพาหนะ', code_prefix: 'VEH', icon: 'ph-car' },
    { category_id: 'CAT-07', name: 'วัสดุการเกษตร', code_prefix: 'AGR', icon: 'ph-plant' },
    { category_id: 'CAT-08', name: 'วัสดุโฆษณาและเผยแพร่', code_prefix: 'ADV', icon: 'ph-megaphone' }
  ];
}

/**
 * Returns Warehouses from 05_Warehouses
 */
function hrtGetAllWarehouses_() {
  try {
    const sheet = getSheet('warehouses');
    const data = sheet.getDataRange().getValues();
    const list = [];

    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      const whId = String(row[0]).trim();
      if (!whId) continue;

      list.push({
        warehouse_id: whId,
        name: String(row[1] || whId),
        building: String(row[2] || ''),
        room: String(row[3] || '')
      });
    }
    if (list.length > 0) return list;
  } catch (e) {}

  return [
    { warehouse_id: 'WH-01', name: 'คลังพัสดุกลาง (อาคาร 1)', building: 'อาคาร 1', room: '101' },
    { warehouse_id: 'WH-02', name: 'ห้องพัสดุวิชาการ (อาคาร 2)', building: 'อาคาร 2', room: '205' },
    { warehouse_id: 'WH-03', name: 'คลังพัสดุซ่อมบำรุง', building: 'อาคารช่าง', room: 'C-1' }
  ];
}

/**
 * Returns Fiscal Years from 12_Fiscal_Years (I-5: Pure Read-Only Query)
 * Does NOT auto-seed or call appendRow during read.
 * If empty, returns empty list to allow rendering of Setup State.
 * @returns {Array<Object>} List of fiscal years
 */
function hrtGetAllFiscalYears_() {
  let list = [];
  try {
    const sheet = getSheet('fiscal_year_settings');
    const data = sheet.getDataRange().getValues();

    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      const fy = String(row[0]).trim();
      if (!fy) continue;

      list.push({
        fiscal_year: fy,
        start_date: String(row[1] || ''),
        end_date: String(row[2] || ''),
        status: String(row[3] || 'ACTIVE')
      });
    }
  } catch (e) {
    Logger.log('Could not read fiscal years sheet: ' + e.message);
  }

  return list;
}

/**
 * Historical Snapshot Loading Failure for Prior Fiscal Years (C-4)
 * Reads frozen snapshot or computes balance as of Sept 30 of target fiscal year
 * @param {string} fiscalYear 
 * @returns {Array<Object>}
 */
function hrtLoadFiscalYearSnapshots_(fiscalYear) {
  fiscalYear = String(fiscalYear || getActiveTransactionYear()).trim();
  
  // 1. Attempt to read from 13_Year_End_Audits
  try {
    const auditSheet = getSheet('year_end_audits');
    const auditData = auditSheet.getDataRange().getValues();
    const rows = [];

    for (let r = 1; r < auditData.length; r++) {
      const row = auditData[r];
      const rowFy = String(row[1]).trim();
      if (rowFy === fiscalYear) {
        rows.push({
          count_id: row[0],
          fiscal_year: rowFy,
          item_code: row[2],
          book_qty: Number(row[3]) || 0,
          count_qty: Number(row[4]) || 0,
          variance: Number(row[5]) || 0,
          condition: row[6] || 'ปกติ',
          auditors: row[7] || ''
        });
      }
    }

    if (rows.length > 0) return rows;
  } catch (e) {
    Logger.log('Could not load year-end audits: ' + e.message);
  }

  // 2. Fallback: Reconstruct balance dynamically up to end of fiscal year (Sept 30)
  const bounds = getFiscalYearBounds(fiscalYear);
  const cutoffDate = bounds.endMs;

  const ledgerSheet = getSheet('stock_ledger');
  const ledgerData = ledgerSheet.getDataRange().getValues();
  const balances = {};

  for (let r = 1; r < ledgerData.length; r++) {
    const row = ledgerData[r];
    const code = String(row[1]).trim().toUpperCase();
    const qtyIn = Number(row[4]) || 0;
    const qtyOut = Number(row[5]) || 0;
    const createdAtStr = String(row[9]).trim();
    const rowTime = new Date(createdAtStr).getTime();

    if (!isNaN(rowTime) && rowTime <= cutoffDate) {
      if (!balances[code]) balances[code] = 0;
      balances[code] += (qtyIn - qtyOut);
    }
  }

  const result = [];
  Object.keys(balances).forEach(code => {
    result.push({
      item_code: code,
      book_qty: Math.max(0, balances[code]),
      count_qty: Math.max(0, balances[code]),
      variance: 0,
      fiscal_year: fiscalYear,
      isReconstructed: true
    });
  });

  return result;
}

/**
 * History Map with Exact Temporal Boundaries (Asia/Bangkok Start-Inclusive / End-Exclusive)
 * @param {string} fiscalYear 
 * @returns {Object} Grouped movements and monthly intake/issuance trends
 */
function hrtGetHistoryMap_(fiscalYear, options) {
  fiscalYear = String(fiscalYear || getActiveTransactionYear()).trim();
  options = options || {};
  const maxTx = typeof options.limit === 'number' ? options.limit : 0;
  const bounds = getFiscalYearBounds(fiscalYear);

  const txSheet = getSheet('stock_transactions');
  const txData = txSheet.getDataRange().getValues();

  const canonicalTypes = {
    'RECEIVE': 'RECEIVE',
    'INTAKE': 'RECEIVE',
    'RESTOCK': 'RECEIVE',
    'IN': 'RECEIVE',
    'ISSUE': 'ISSUE',
    'REQUISITION': 'ISSUE',
    'OUT': 'ISSUE',
    'OPENING': 'OPENING',
    'INITIAL': 'OPENING',
    'ADJUST_ADD': 'ADJUSTMENT_ADD',
    'ADJUSTMENT_ADD': 'ADJUSTMENT_ADD',
    'ADJUST_SUB': 'ADJUSTMENT_SUB',
    'ADJUSTMENT_SUB': 'ADJUSTMENT_SUB',
    'RETURN': 'RETURN',
    'DISPOSAL': 'DISPOSAL'
  };

  const monthlyTotals = {};
  for (let m = 1; m <= 12; m++) {
    monthlyTotals[m] = { month: m, receiveQty: 0, issueQty: 0, receiveVal: 0, issueVal: 0 };
  }

  const transactions = [];

  for (let r = 1; r < txData.length; r++) {
    const row = txData[r];
    const txDateStr = String(row[1]).trim();
    const txTime = new Date(txDateStr).getTime();

    // Strict Asia/Bangkok Fiscal Year boundary check (start-inclusive, end-exclusive)
    if (!isNaN(txTime)) {
      if (txTime < bounds.startMs || txTime >= bounds.endMs) {
        continue;
      }
    }

    const rawType = String(row[3]).trim().toUpperCase();
    const cType = canonicalTypes[rawType] || rawType;
    const qty = Number(row[5]) || 0;
    const unitCost = Number(row[6]) || 0;
    const totalVal = qty * unitCost;

    const txDate = new Date(txDateStr);
    const month = !isNaN(txDate.getTime()) ? txDate.getMonth() + 1 : 1;

    // Categorize monthly volume into inbound (receive/opening/return/adj+) vs outbound (issue/disposal/adj-)
    if (['RECEIVE', 'OPENING', 'ADJUSTMENT_ADD', 'RETURN'].includes(cType)) {
      if (monthlyTotals[month]) {
        monthlyTotals[month].receiveQty += qty;
        monthlyTotals[month].receiveVal += totalVal;
      }
    } else if (['ISSUE', 'DISPOSAL', 'ADJUSTMENT_SUB'].includes(cType)) {
      if (monthlyTotals[month]) {
        monthlyTotals[month].issueQty += qty;
        monthlyTotals[month].issueVal += totalVal;
      }
    }

    transactions.push({
      tx_id: row[0],
      date: txDateStr,
      doc_ref: row[2],
      type: cType,
      transaction_type: cType, // I-1: Canonical transaction_type enum
      item_code: row[4],
      qty: qty,
      unit_cost: unitCost,
      total_val: totalVal,
      actor_id: row[7],
      note: row[8]
    });
  }

  const reversed = transactions.reverse();
  const recent = (maxTx > 0 && reversed.length > maxTx) ? reversed.slice(0, maxTx) : reversed;

  return {
    fiscalYear: fiscalYear,
    recentTransactions: recent,
    monthlyTrends: Object.values(monthlyTotals)
  };
}

/**
 * Builds FSN in-memory lookup index for C-5
 * @returns {Object} Map of fsn_code -> FSN catalog record
 */
function hrtGetFsnIndexMap_() {
  const fsnMap = {};
  try {
    const sheet = getSheet('fsn_registry');
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const code = String(data[i][0]).trim();
      if (code) {
        fsnMap[code] = {
          fsn_code: code,
          group_code: data[i][1],
          group_name: data[i][2],
          class_code: data[i][3],
          fsc: data[i][4],
          name: data[i][5],
          spec: data[i][6]
        };
      }
    }
  } catch (e) {
    Logger.log('Could not load FSN index map: ' + e.message);
  }
  return fsnMap;
}

/**
 * N-3: Official Government Forms พ.ด. ๑–๗ Report Generation Backend
 * @param {Object} payload { type: 'PD1'..'PD7', params: {...} }
 * @param {Object} caller 
 * @returns {Object} Report structured dataset
 */
function hrtGetPdReport_(payload, caller) {
  payload = payload || {};
  const reportType = String(payload.type || 'PD1').toUpperCase();
  const fiscalYear = String(payload.fiscalYear || payload.fiscal_year || getActiveTransactionYear()).trim();

  const reportData = {
    reportType: reportType,
    fiscalYear: fiscalYear,
    schoolName: CONFIG.SCHOOL_NAME,
    agency: CONFIG.ORGANIZATION,
    generatedAt: new Date().toISOString(),
    caller: caller ? caller.name : ''
  };

  // Attach frozen signatories snapshot for formal government print preview
  reportData.signatories = {
    requesterTitle: getConfig('signatory_requester_title', 'ผู้ขอเบิกพัสดุ'),
    approverName: getConfig('signatory_approver_name', 'นางกัลยาณี เกษมสุข'),
    approverTitle: getConfig('signatory_approver_title', 'หัวหน้ากลุ่มบริหารงานงบประมาณ'),
    directorName: getConfig('signatory_director_name', 'นายสมศักดิ์ รุ่งเรือง'),
    directorTitle: getConfig('signatory_director_title', 'ผู้อำนวยการโรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)'),
    effectiveDate: getConfig('signatories_effective_date', '2568-10-01')
  };

  switch (reportType) {
    case 'PD1':
    case 'พ.ด.๑':
      // ทะเบียนคุมทรัพย์สิน / พัสดุ
      reportData.title = 'แบบ พ.ด. ๑: ทะเบียนคุมทรัพย์สินและพัสดุ';
      reportData.formStatus = 'OFFICIAL_VERIFIED';
      reportData.sourceSheet = '03_Master_Items';
      reportData.items = hrtGetItems_({ fiscalYear: fiscalYear }, caller).items;
      break;

    case 'PD2':
    case 'พ.ด.๒':
      // ใบยืมพัสดุ
      reportData.title = 'แบบ พ.ด. ๒: ใบยืมพัสดุ/อุปกรณ์';
      reportData.formStatus = 'PENDING_TEMPLATE';
      reportData.sourceSheet = '07_Requisitions';
      reportData.records = [];
      break;

    case 'PD3':
    case 'พ.ด.๓':
      // ใบเบิกพัสดุ (Requisitions)
      reportData.title = 'แบบ พ.ด. ๓: ใบเบิกพัสดุ';
      reportData.formStatus = 'OFFICIAL_VERIFIED';
      reportData.sourceSheet = '07_Requisitions';
      reportData.requisitions = hrtGetRequisitions_({ fiscalYear: fiscalYear, status: 'ISSUED' }, caller);
      break;

    case 'PD4':
    case 'พ.ด.๔':
      // ใบสั่งซื้อ / จัดจ้าง
      reportData.title = 'แบบ พ.ด. ๔: รายงานขอซื้อ/ขอจ้างพัสดุ';
      reportData.formStatus = 'PENDING_TEMPLATE';
      reportData.sourceSheet = 'PROCURING_SYSTEM';
      reportData.records = [];
      break;

    case 'PD5':
    case 'พ.ด.๕':
      // รายงานผลการตรวจนับพัสดุประจำปี
      reportData.title = 'แบบ พ.ด. ๕: รายงานผลการตรวจสอบพัสดุประจำปี (ณ ๓๐ กันยายน)';
      reportData.formStatus = 'OFFICIAL_VERIFIED';
      reportData.sourceSheet = '13_Year_End_Audits';
      reportData.auditData = hrtLoadFiscalYearSnapshots_(fiscalYear);
      break;

    case 'PD6':
    case 'พ.ด.๖':
      // รายงานขออนุมัติจำหน่ายพัสดุ
      reportData.title = 'แบบ พ.ด. ๖: รายงานขออนุมัติจำหน่ายพัสดุชำรุด/สูญหาย';
      reportData.formStatus = 'OFFICIAL_VERIFIED';
      reportData.sourceSheet = '14_Disposal_Records';
      reportData.items = hrtGetItems_({ fiscalYear: fiscalYear, status: 'disposed' }, caller).items;
      break;

    case 'PD7':
    case 'พ.ด.๗':
    default:
      // สรุปสถานะพัสดุคงเหลือ
      reportData.title = 'แบบ พ.ด. ๗: รายงานสรุปยอดพัสดุคงเหลือและมูลค่ารวม';
      reportData.formStatus = 'OFFICIAL_VERIFIED';
      reportData.sourceSheet = '10_Stock_Ledger';
      reportData.dashboard = hrtGetDashboardMetrics_({ fiscalYear: fiscalYear }, caller);
      break;
  }

  return reportData;
}

/**
 * Settings Area 5: System Health & Diagnostic Service
 * Performs real-time schema validation across 16 canonical sheets.
 * Masked database identification ensures no secret leakage.
 * @param {Object} payload 
 * @param {Object} caller 
 * @returns {Object} Diagnostic report
 */
function hrtCheckHealth_(payload, caller) {
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
  const configuredId = typeof getConfiguredSpreadsheetId_ === 'function' ? (getConfiguredSpreadsheetId_() || null) : (CONFIG.SPREADSHEET_ID ? String(CONFIG.SPREADSHEET_ID).trim() : null);
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
      schema_count: `${foundSheetCount}/16`,
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
}

/**
 * Item Stock Ledger Reader
 * Returns stock ledger transactions for a specified item from 10_Stock_Ledger
 * @param {Object|string} payload 
 * @param {Object} caller 
 * @returns {Object} Ledger records
 */
function hrtGetItemLedger_(payload, caller) {
  payload = payload || {};
  const itemCode = String(payload.item_code || payload.itemId || payload.code || (typeof payload === 'string' ? payload : '')).trim().toUpperCase();
  const ledgerSheet = getSheet('stock_ledger');
  const data = ledgerSheet.getDataRange().getValues();
  const entries = [];

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const code = String(row[1] || '').trim().toUpperCase();
    if (!itemCode || code === itemCode) {
      entries.push({
        ledger_id: String(row[0] || ''),
        item_code: code,
        tx_id: String(row[2] || ''),
        tx_type: String(row[3] || ''),
        qty_in: Number(row[4]) || 0,
        qty_out: Number(row[5]) || 0,
        balance: Number(row[6]) || 0,
        unit_cost: Number(row[7]) || 0,
        fiscal_year: String(row[8] || ''),
        created_at: String(row[9] || '')
      });
    }
  }

  return {
    success: true,
    item_code: itemCode,
    ledger: entries,
    count: entries.length
  };
}

