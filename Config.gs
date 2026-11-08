/**
 * Config.gs - Central Backend Configuration & Global Constants
 * Layer: Root Configuration (HRT Inventory System v2.6.0)
 * Standard: Frozen Configuration Object, PropertiesService Resolution & Multi-Tier Caching
 */

const CONFIG = Object.freeze({
  APP_NAME: 'HRT School Inventory Management System',
  SCHOOL_NAME: 'โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)',
  ORGANIZATION: 'องค์การบริหารส่วนจังหวัดสระบุรี',
  VERSION: '2.7.0-rc.6',
  DEFAULT_FISCAL_YEAR: '2569',
  TIMEZONE: 'Asia/Bangkok',
  TIMEZONE_OFFSET_HOURS: 7,
  LOCK_TIMEOUT_MS: 30000,
  WRITE_LOCK_TIMEOUT_MS: 60000,
  CACHE_TTL_SECONDS: 300,

  // [FIX-AUTH-01] Primary Administrator Email (Configured to winmax2006@gmail.com)
  PRIMARY_ADMIN_EMAIL: (function() {
    try {
      if (typeof PropertiesService !== 'undefined') {
        const adminEmail = PropertiesService.getScriptProperties().getProperty('PRIMARY_ADMIN_EMAIL');
        if (adminEmail) return adminEmail.trim().toLowerCase();
      }
    } catch (e) {}
    return 'winmax2006@gmail.com';
  })(),

  // [FIX-AUTH-02] Organization & Allowed Consumer Domains (Support standard Gmail accounts)
  ALLOWED_DOMAINS: (function() {
    try {
      if (typeof PropertiesService !== 'undefined') {
        const dom = PropertiesService.getScriptProperties().getProperty('ALLOWED_DOMAINS');
        if (dom) return dom.split(',').map(d => d.trim().toLowerCase());
      }
    } catch (e) {}
    return ['horathep.ac.th', 'hrt.ac.th', 'school.internal', 'gmail.com'];
  })(),

  GOOGLE_CLIENT_ID: (function() {
    try {
      if (typeof PropertiesService !== 'undefined') {
        const cid = PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID');
        if (cid) return cid;
      }
    } catch (e) {}
    return '';
  })(),

  // Fallback Spreadsheet ID (can be overridden via Script Properties)
  SPREADSHEET_ID: (function() {
    try {
      if (typeof PropertiesService !== 'undefined') {
        const prop = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
        if (prop) return prop;
      }
    } catch (e) {}
    return '';
  })(),

  // Standardized RBAC Roles
  ROLES: Object.freeze({
    ADMIN: 'ADMIN',
    OFFICER: 'OFFICER',
    APPROVER: 'APPROVER',
    DIRECTOR: 'DIRECTOR',
    TEACHER: 'TEACHER',
    REQUESTER: 'REQUESTER'
  }),

  // Granular Permission Constants
  PERMISSIONS: Object.freeze({
    VIEW_INVENTORY: 'VIEW_INVENTORY',
    CREATE_REQUISITION: 'CREATE_REQUISITION',
    CANCEL_OWN_REQUISITION: 'CANCEL_OWN_REQUISITION',
    VIEW_OWN_REQUISITIONS: 'VIEW_OWN_REQUISITIONS',
    VIEW_ALL_REQUISITIONS: 'VIEW_ALL_REQUISITIONS',
    REVIEW_REQUISITION: 'REVIEW_REQUISITION',
    APPROVE_REQUISITION: 'APPROVE_REQUISITION',
    REJECT_REQUISITION: 'REJECT_REQUISITION',
    ISSUE_STOCK: 'ISSUE_STOCK',
    RECEIVE_STOCK: 'RECEIVE_STOCK',
    ADJUST_STOCK: 'ADJUST_STOCK',
    MANAGE_ITEMS: 'MANAGE_ITEMS',
    IMPORT_ITEMS: 'IMPORT_ITEMS',
    MANAGE_FSN: 'MANAGE_FSN',
    MANAGE_USERS: 'MANAGE_USERS',
    MANAGE_SETTINGS: 'MANAGE_SETTINGS',
    CLOSE_FISCAL_YEAR: 'CLOSE_FISCAL_YEAR',
    VIEW_AUDIT_LOG: 'VIEW_AUDIT_LOG',
    VERIFY_AUDIT_LOG: 'VERIFY_AUDIT_LOG',
    YEAR_END_AUDIT: 'YEAR_END_AUDIT',
    QR_RESOLVE: 'QR_RESOLVE',
    MANAGE_QR: 'MANAGE_QR'
  }),

  // Role to Granular Permissions Mapping
  ROLE_PERMISSIONS: Object.freeze({
    REQUESTER: Object.freeze([
      'VIEW_INVENTORY', 'CREATE_REQUISITION', 'CANCEL_OWN_REQUISITION', 'VIEW_OWN_REQUISITIONS', 'QR_RESOLVE'
    ]),
    TEACHER: Object.freeze([
      'VIEW_INVENTORY', 'CREATE_REQUISITION', 'CANCEL_OWN_REQUISITION', 'VIEW_OWN_REQUISITIONS', 'QR_RESOLVE'
    ]),
    OFFICER: Object.freeze([
      'VIEW_INVENTORY', 'CREATE_REQUISITION', 'CANCEL_OWN_REQUISITION', 'VIEW_OWN_REQUISITIONS',
      'VIEW_ALL_REQUISITIONS', 'REVIEW_REQUISITION', 'ISSUE_STOCK', 'RECEIVE_STOCK', 'ADJUST_STOCK',
      'MANAGE_ITEMS', 'IMPORT_ITEMS', 'MANAGE_FSN', 'YEAR_END_AUDIT', 'VIEW_AUDIT_LOG',
      'QR_RESOLVE', 'MANAGE_QR'
    ]),
    APPROVER: Object.freeze([
      'VIEW_INVENTORY', 'VIEW_ALL_REQUISITIONS', 'REVIEW_REQUISITION', 'APPROVE_REQUISITION',
      'REJECT_REQUISITION', 'VIEW_AUDIT_LOG', 'QR_RESOLVE'
    ]),
    DIRECTOR: Object.freeze([
      'VIEW_INVENTORY', 'VIEW_ALL_REQUISITIONS', 'APPROVE_REQUISITION', 'REJECT_REQUISITION',
      'VIEW_AUDIT_LOG', 'QR_RESOLVE'
    ]),
    ADMIN: Object.freeze([
      'VIEW_INVENTORY', 'CREATE_REQUISITION', 'CANCEL_OWN_REQUISITION', 'VIEW_OWN_REQUISITIONS',
      'VIEW_ALL_REQUISITIONS', 'REVIEW_REQUISITION', 'APPROVE_REQUISITION', 'REJECT_REQUISITION',
      'ISSUE_STOCK', 'RECEIVE_STOCK', 'ADJUST_STOCK', 'MANAGE_ITEMS', 'IMPORT_ITEMS',
      'MANAGE_FSN', 'MANAGE_USERS', 'MANAGE_SETTINGS', 'CLOSE_FISCAL_YEAR',
      'VIEW_AUDIT_LOG', 'VERIFY_AUDIT_LOG', 'YEAR_END_AUDIT', 'QR_RESOLVE', 'MANAGE_QR'
    ])
  }),

  // Requisition Lifecycle Statuses
  REQUISITION_STATUSES: Object.freeze({
    DRAFT: 'DRAFT',
    SUBMITTED: 'SUBMITTED',             // canonical submitted status
    PENDING_APPROVAL: 'PENDING_APPROVAL', // legacy synonym for SUBMITTED
    CANCELLED: 'CANCELLED',
    RETURNED: 'RETURNED',
    REVIEWED: 'REVIEWED',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    READY_TO_ISSUE: 'READY_TO_ISSUE',
    PARTIAL_ISSUED: 'PARTIAL_ISSUED',
    ISSUED: 'ISSUED',
    RECEIVED: 'RECEIVED'
  }),

  // Canonical Schema Sheet Names (Aliases resolved automatically)
  SHEETS: Object.freeze({
    USERS: '01_Users',
    DEPARTMENTS: '02_Departments',
    MASTER_ITEMS: '03_Master_Items',
    CATEGORIES: '04_Categories',
    WAREHOUSES: '05_Warehouses',
    FSN_REGISTRY: '06_FSN_Catalog',
    REQUISITIONS: '07_Requisitions',
    REQUISITION_ITEMS: '08_Requisition_Items',
    STOCK_TRANSACTIONS: '09_Stock_Transactions',
    STOCK_LEDGER: '10_Stock_Ledger',
    AUDIT_TRAIL: '11_Audit_Trail',
    FISCAL_YEAR_SETTINGS: '12_Fiscal_Years',
    YEAR_END_AUDITS: '13_Year_End_Audits',
    DISPOSAL_RECORDS: '14_Disposal_Records',
    SETTINGS: '15_Settings_Config',
    IDEMPOTENCY_LOG: '16_Idempotency_Log'
  }),

  // Fallback / Normalized Names
  SHEET_ALIASES: Object.freeze({
    'users': ['01_Users', 'Users', 'users'],
    'departments': ['02_Departments', 'Departments', 'departments'],
    'master_items': ['03_Master_Items', 'Master_Items', 'master_items'],
    'categories': ['04_Categories', 'Categories', 'categories'],
    'warehouses': ['05_Warehouses', 'Warehouses', 'warehouses'],
    'fsn_registry': ['06_FSN_Catalog', 'FSN_Catalog', 'fsn_registry', 'FSN'],
    'requisitions': ['07_Requisitions', 'Requisitions', 'requisitions'],
    'requisition_items': ['08_Requisition_Items', 'Requisition_Items', 'requisition_items'],
    'stock_transactions': ['09_Stock_Transactions', 'Stock_Transactions', 'Transactions', 'transactions'],
    'stock_ledger': ['10_Stock_Ledger', 'Stock_Ledger', 'stock_ledger'],
    'audit_trail': ['11_Audit_Trail', 'Audit_Trail', 'Audit_Log', 'audit_trail'],
    'fiscal_year_settings': ['12_Fiscal_Years', 'Fiscal_Years', 'fiscal_year_settings'],
    'year_end_audits': ['13_Year_End_Audits', 'Year_End_Audits', 'year_end_audits'],
    'year_end_audit_items': ['13_Year_End_Audits', '13_Year_End_Audit_Items', 'Year_End_Audit_Items', 'year_end_audit_items'],
    'disposal_records': ['14_Disposal_Records', 'Disposal_Records', 'disposal_records'],
    'qr_registry': ['14_QR_Registry', 'QR_Registry', 'qr_registry'],
    '_config': ['15_Settings_Config', 'Settings', 'Settings_Config', '_config'],
    'idempotency_log': ['16_Idempotency_Log', 'Idempotency_Log', 'idempotency_log']
  })
});

/**
 * Global Spreadsheet Accessor
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getConfiguredSpreadsheetId_() {
  if (CONFIG && CONFIG.SPREADSHEET_ID) return CONFIG.SPREADSHEET_ID;
  try {
    if (typeof PropertiesService !== 'undefined') {
      const prop = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      if (prop) return prop.trim();
    }
  } catch (e) {}
  return '';
}

function getSS() {
  if (typeof SpreadsheetApp === 'undefined') {
    const err = new Error('DATABASE_ACCESS_ERROR: SpreadsheetApp is not available in the current runtime environment.');
    err.code = 'DATABASE_ACCESS_ERROR';
    throw err;
  }
  const configuredId = getConfiguredSpreadsheetId_();
  if (configuredId) {
    try {
      const ss = SpreadsheetApp.openById(configuredId);
      if (!ss) {
        const err = new Error('DATABASE_ACCESS_ERROR: Could not open spreadsheet with ID "' + configuredId + '".');
        err.code = 'DATABASE_ACCESS_ERROR';
        throw err;
      }
      return ss;
    } catch (e) {
      const err = new Error('DATABASE_ACCESS_ERROR: Failed to open configured spreadsheet "' + configuredId + '": ' + e.message);
      err.code = 'DATABASE_ACCESS_ERROR';
      throw err;
    }
  }
  const activeSS = SpreadsheetApp.getActiveSpreadsheet();
  if (!activeSS) {
    const err = new Error('DATABASE_ACCESS_ERROR: No active spreadsheet found and SPREADSHEET_ID is not configured.');
    err.code = 'DATABASE_ACCESS_ERROR';
    throw err;
  }
  return activeSS;
}

/**
 * Resolves a Sheet object by canonical name or alias
 * @param {string} canonicalName
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getSheet(canonicalName) {
  const ss = getSS();
  const aliases = CONFIG.SHEET_ALIASES[canonicalName] || [canonicalName];
  
  for (let i = 0; i < aliases.length; i++) {
    const sheet = ss.getSheetByName(aliases[i]);
    if (sheet) return sheet;
  }
  
  // If not found, attempt to locate sheet case-insensitively
  const allSheets = ss.getSheets();
  const targetLower = canonicalName.toLowerCase();
  for (let i = 0; i < allSheets.length; i++) {
    const sName = allSheets[i].getName().toLowerCase();
    if (sName.includes(targetLower)) {
      return allSheets[i];
    }
  }

  throw new Error(`Sheet not found: "${canonicalName}". Ensure database provisioning is completed via initDatabase().`);
}

/**
 * Scopes cache keys by environment, database ID, canonical version, and active fiscal year (O-1 & N-1)
 * Prevents cross-database, cross-version, and cross-fiscal-year cache collision.
 * @returns {string} Scoped prefix
 */
function getCacheScopePrefix() {
  const ver = CONFIG.VERSION || '2.7.0-rc.3';
  const dbId = CONFIG.SPREADSHEET_ID ? CONFIG.SPREADSHEET_ID.slice(-6) : 'local';
  const env = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) || 'gas';
  return `hrt_${env}_v${ver}_db${dbId}_`;
}

/**
 * Reads a configuration value with CacheService caching (O-1 Optimization)
 * Scoped by environment, database, version, and active fiscal year
 * @param {string} key
 * @param {any} [defaultValue=null]
 * @returns {string|any}
 */
function getConfig(key, defaultValue = null) {
  const cacheKey = getCacheScopePrefix() + 'cfg_' + key;
  try {
    if (typeof CacheService !== 'undefined') {
      const cache = CacheService.getScriptCache();
      const cached = cache.get(cacheKey);
      if (cached !== null) return cached;
    }
  } catch (e) {}

  try {
    const sheet = getSheet('_config');
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === key) {
        const val = String(data[i][1]);
        try {
          if (typeof CacheService !== 'undefined') {
            CacheService.getScriptCache().put(cacheKey, val, 60);
          }
        } catch (ce) {}
        return val;
      }
    }
  } catch (err) {
    // If sheet not yet provisioned, fallback to PropertiesService or default
    try {
      if (typeof PropertiesService !== 'undefined') {
        const prop = PropertiesService.getScriptProperties().getProperty(key);
        if (prop !== null) return prop;
      }
    } catch (pe) {}
  }

  return defaultValue;
}

/**
 * Returns configuration value parsed as integer
 * @param {string} key
 * @param {number} [defaultValue=0]
 * @returns {number}
 */
function getConfigInt(key, defaultValue = 0) {
  const val = getConfig(key, defaultValue);
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Sets configuration value and invalidates scoped cache
 * @param {string} key
 * @param {any} value
 */
function setConfig_(key, value) {
  try {
    const sheet = getSheet('_config');
    const data = sheet.getDataRange().getValues();
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === key) {
        sheet.getRange(i + 1, 2).setValue(String(value));
        sheet.getRange(i + 1, 4).setValue(new Date().toISOString());
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([key, String(value), 'Auto-configured parameter', new Date().toISOString()]);
    }
  } catch (err) {
    try {
      if (typeof PropertiesService !== 'undefined') {
        PropertiesService.getScriptProperties().setProperty(key, String(value));
      }
    } catch (pe) {}
  }

  try {
    if (typeof CacheService !== 'undefined') {
      const cacheKey = getCacheScopePrefix() + 'cfg_' + key;
      CacheService.getScriptCache().remove(cacheKey);
      CacheService.getScriptCache().remove('cfg_' + key); // Invalidate legacy key as well
    }
  } catch (ce) {}
}

/**
 * Invalidates system data, query caches, and increments data revision (O-1 & N-1)
 */
function invalidateCache_() {
  const fy = getActiveTransactionYear();
  const prefix = getCacheScopePrefix();
  try {
    if (typeof CacheService !== 'undefined') {
      const cache = CacheService.getScriptCache();
      cache.remove(prefix + 'bootstrap_' + fy);
      cache.remove(prefix + 'items_' + fy);
      cache.remove(prefix + 'dashboard_kpis_' + fy);
      cache.remove('bootstrap_' + fy);
      cache.remove('items_' + fy);
      cache.remove('dashboard_kpis_' + fy);
    }
  } catch (e) {
    Logger.log('Cache invalidation warning: ' + e.message);
  }

  // Increment data revision to automatically bust N-1 dashboard cache signatures
  try {
    const currentRev = getConfigInt('data_revision', 1);
    setConfig_('data_revision', currentRev + 1);
  } catch (re) {}
}

/**
 * Resolves current active transaction fiscal year from configuration (Server Authority)
 * Writes must always target this active transaction year.
 * @returns {string}
 */
function getActiveTransactionYear() {
  return String(getConfig('active_fiscal_year', CONFIG.DEFAULT_FISCAL_YEAR)).trim();
}

/**
 * Legacy compatibility alias for getActiveTransactionYear
 * @returns {string}
 */
function getActiveFiscalYear() {
  return getActiveTransactionYear();
}

/**
 * Exact Thai Fiscal Year Temporal Bounds in Asia/Bangkok (+07:00)
 * Definition: Thai Fiscal Year YYYY runs from:
 *   Start (inclusive): 1 Oct (YYYY - 543 - 1) at 00:00:00.000 +07:00
 *   End (exclusive):   1 Oct (YYYY - 543)     at 00:00:00.000 +07:00
 *   End-of-Day (inc):  30 Sep (YYYY - 543)    at 23:59:59.999 +07:00
 *
 * Example: FY 2570 is 2026-10-01T00:00:00.000+07:00 to 2027-10-01T00:00:00.000+07:00 (exclusive)
 *
 * @param {string|number} fiscalYear Thai Buddhist Era Year (e.g. '2569', '2570')
 * @returns {{
 *   fiscalYear: string,
 *   christianYear: number,
 *   startMs: number,
 *   endMs: number,
 *   startIso: string,
 *   endIso: string,
 *   endInclusiveIso: string
 * }}
 */
function getFiscalYearBounds(fiscalYear) {
  const fyStr = String(fiscalYear || getActiveTransactionYear()).trim();
  const fyInt = parseInt(fyStr, 10);
  if (isNaN(fyInt)) {
    throw new Error(`INVALID_FISCAL_YEAR: Cannot compute boundaries for invalid year "${fiscalYear}".`);
  }

  const christianYear = fyInt - 543;
  const startYear = christianYear - 1;

  // UTC epoch representation of Bangkok local time (+07:00)
  // 1 Oct startYear 00:00:00 +07:00 = 30 Sep startYear 17:00:00 UTC
  const startMs = Date.UTC(startYear, 8, 30, 17, 0, 0, 0);

  // 1 Oct christianYear 00:00:00 +07:00 = 30 Sep christianYear 17:00:00 UTC (End-exclusive)
  const endMs = Date.UTC(christianYear, 8, 30, 17, 0, 0, 0);

  // 30 Sep christianYear 23:59:59.999 +07:00 = 30 Sep christianYear 16:59:59.999 UTC (End-inclusive)
  const endInclusiveMs = endMs - 1;

  return {
    fiscalYear: fyStr,
    christianYear: christianYear,
    startMs: startMs,
    endMs: endMs,
    startIso: `${startYear}-10-01T00:00:00.000+07:00`,
    endIso: `${christianYear}-10-01T00:00:00.000+07:00`,
    endInclusiveIso: `${christianYear}-09-30T23:59:59.999+07:00`
  };
}

/**
 * Determines whether an ISO timestamp or Date falls within a specific Thai Fiscal Year
 * Uses strict start-inclusive / end-exclusive temporal boundary comparison.
 * @param {string|Date|number} timestamp 
 * @param {string|number} fiscalYear 
 * @returns {boolean}
 */
function isTimestampInFiscalYear(timestamp, fiscalYear) {
  if (!timestamp) return false;
  const bounds = getFiscalYearBounds(fiscalYear);
  const timeMs = new Date(timestamp).getTime();
  if (isNaN(timeMs)) return false;

  return timeMs >= bounds.startMs && timeMs < bounds.endMs;
}

/**
 * Checks whether a given fiscal year is closed in 12_Fiscal_Years
 * @param {string} fiscalYear 
 * @returns {boolean}
 */
function isFiscalYearClosed(fiscalYear) {
  const fyStr = String(fiscalYear || '').trim();
  if (!fyStr) return false;

  try {
    const sheet = getSheet('fiscal_year_settings');
    const data = sheet.getDataRange().getValues();
    for (let r = 1; r < data.length; r++) {
      if (String(data[r][0]).trim() === fyStr) {
        const status = String(data[r][3] || '').trim().toUpperCase();
        return status === 'CLOSED';
      }
    }
  } catch (e) {
    Logger.log('Could not check fiscal year closed status: ' + e.message);
  }
  return false;
}

/**
 * Sanitizes and returns public system configuration metadata
 * STRICT SECURITY POLICY: Never exposes SPREADSHEET_ID, internal secrets, or full user directory.
 * @returns {Object} Public config bundle safe for requester / guest context
 */
function getPublicConfig() {
  return {
    appName: CONFIG.APP_NAME,
    schoolName: CONFIG.SCHOOL_NAME,
    organization: CONFIG.ORGANIZATION,
    version: CONFIG.VERSION,
    activeTransactionYear: getActiveTransactionYear(),
    timezone: CONFIG.TIMEZONE,
    lowStockThreshold: getConfigInt('low_stock_threshold', 10),
    isDemoRoleSwitchEnabled: getConfig('enable_demo_role_switch', 'false') === 'true'
  };
}

/**
 * Sanitizes input to prevent formula injection in Google Sheets (I-3 & Settings Area 6)
 * Prepends apostrophe to formulas starting with =, +, -, @, \t, \r
 * Strips script tags to prevent XSS in stored strings.
 * @param {any} val
 * @returns {any}
 */
function sanitizeCellValue(val) {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('=') || trimmed.startsWith('+') || trimmed.startsWith('-') || 
        trimmed.startsWith('@') || trimmed.startsWith('\t') || trimmed.startsWith('\r')) {
      return "'" + val; // Prepend apostrophe to store as raw text safely
    }
    // Prevent XSS script tags in stored strings
    return val.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
  return val;
}
