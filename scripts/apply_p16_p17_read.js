const fs = require('fs');

let read = fs.readFileSync('Read.gs', 'utf8');

// Define parseItemTimestamp_ and parseBoundaryTimestamp_ helper functions before hrtGetItems_
const helperFns = `/**
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
  if (/^-?\\d+$/.test(str)) {
    const n = parseInt(str, 10);
    return { valid: true, isMissing: false, timeMs: n, status: n === 0 ? 'EPOCH_ZERO' : 'VALID' };
  }
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(str)) {
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
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(str)) {
    const timeStr = isEnd ? '23:59:59.999+07:00' : '00:00:00.000+07:00';
    const t = new Date(str + 'T' + timeStr).getTime();
    return !isNaN(t) ? t : null;
  }
  const t = new Date(str).getTime();
  return !isNaN(t) ? t : null;
}

`;

if (!read.includes('function parseItemTimestamp_')) {
  read = helperFns + read;
}

// Update date range filtering in hrtGetItems_
const oldDateRange = `  const startDate = payload.startDate || payload.start_date || (payload.dateRange && payload.dateRange.startDate) || '';
  const endDate = payload.endDate || payload.end_date || (payload.dateRange && payload.dateRange.endDate) || '';

  let filtered = allItems.filter(it => {
    // Dim 1: Warehouse
    if (warehouseFilter && warehouseFilter !== 'ALL' && it.warehouse !== warehouseFilter) return false;
    // Dim 2: Category
    if (categoryFilter && categoryFilter !== 'ALL' && it.category !== categoryFilter) return false;
    // Dim 3: Status
    if (statusFilter && statusFilter !== 'all' && statusFilter !== 'ALL' && it.status !== statusFilter) return false;
    // Dim 4: Date Range (Structured ISO dates)
    if (startDate) {
      const itDate = it.date ? new Date(it.date).getTime() : 0;
      const sDate = new Date(startDate).getTime();
      if (!isNaN(itDate) && !isNaN(sDate) && itDate < sDate) return false;
    }
    if (endDate) {
      const itDate = it.date ? new Date(it.date).getTime() : 0;
      const eDate = new Date(endDate).getTime() + 86400000; // include full end day
      if (!isNaN(itDate) && !isNaN(eDate) && itDate >= eDate) return false;
    }`;

const newDateRange = `  const startDate = payload.startDate || payload.start_date || (payload.dateRange && payload.dateRange.startDate) || '';
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
    }`;

if (read.includes(oldDateRange)) {
  read = read.replace(oldDateRange, newDateRange);
} else {
  console.warn('oldDateRange pattern not matched exactly in Read.gs');
}

fs.writeFileSync('Read.gs', read, 'utf8');
console.log('Read.gs updated. Testing syntax...');
new Function(read);
console.log('Read.gs syntax check PASSED!');
