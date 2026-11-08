/**
 * ==============================================================================
 * HRT School Inventory Management System - Central Database Engine
 * File: Config.gs
 * Description: Configuration Management & Dynamic Properties Service
 * ==============================================================================
 * 
 * Rules:
 * 1. NO HARDCODED: SPREADSHEET_ID, DEPLOYMENT_URL, ADMIN_EMAIL, FISCAL_YEAR
 * 2. All environment parameters are retrieved dynamically from ScriptProperties
 * 3. Fallback mechanisms provided for container-bound execution
 */

var Config = (function () {
  'use strict';

  // 15 Standard Sheet Names according to Database Schema v1.0
  var SHEET_NAMES = {
    USERS: '01_Users',
    ROLES: '02_Roles',
    ITEMS: '03_Items',
    REQUISITIONS: '04_Requisitions',
    REQUISITION_ITEMS: '05_Requisition_Items',
    TRANSACTIONS: '06_Transactions',
    TRANSACTION_ITEMS: '07_Transaction_Items',
    STOCK_LEDGER: '08_Stock_Ledger',
    AUDIT_LOG: '09_Audit_Log',
    SYSTEM_CONFIG: '10_System_Config',
    FISCAL_YEARS: '11_Fiscal_Years',
    PHYSICAL_COUNTS: '12_Physical_Counts',
    PHYSICAL_COUNT_ITEMS: '13_Physical_Count_Items',
    LOCATIONS: '14_Locations',
    CATEGORIES: '15_Categories'
  };

  // UI & Spreadsheet Styling Constants
  var STYLES = {
    HEADER_BG: '#1e293b',       // Anchor Dark Slate (#1e293b)
    HEADER_FG: '#ffffff',       // White Text
    HEADER_FONT: 'Noto Sans Thai',
    HEADER_FONT_SIZE: 10,
    HEADER_ROW_HEIGHT: 38,
    DATA_FONT_SIZE: 10,
    BORDER_COLOR: '#cbd5e1'     // Slate 300
  };

  /**
   * Safe getter for Script Properties
   * @param {string} key Property key
   * @param {string} defaultValue Fallback default if not found
   * @returns {string} Property value
   */
  function getProperty(key, defaultValue) {
    var props = PropertiesService.getScriptProperties();
    var val = props.getProperty(key);
    return (val !== null && val !== undefined && val.trim() !== '') ? val.trim() : (defaultValue || '');
  }

  /**
   * Safe setter for Script Properties
   * @param {string} key Property key
   * @param {string} value Property value
   */
  function setProperty(key, value) {
    var props = PropertiesService.getScriptProperties();
    props.setProperty(key, String(value).trim());
  }

  /**
   * Dynamic Spreadsheet Resolution:
   * 1. Checks ScriptProperties for 'SPREADSHEET_ID'
   * 2. If not found, attempts SpreadsheetApp.getActiveSpreadsheet() (container-bound)
   * 3. Stores active ID in ScriptProperties for future standalone calls
   * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
   */
  function getSpreadsheet() {
    var sheetId = getProperty('SPREADSHEET_ID');
    if (sheetId) {
      try {
        return SpreadsheetApp.openById(sheetId);
      } catch (e) {
        Logger.log('Warning: Unable to open spreadsheet by SPREADSHEET_ID: ' + sheetId + ' (' + e.message + ')');
      }
    }

    try {
      var active = SpreadsheetApp.getActiveSpreadsheet();
      if (active) {
        var activeId = active.getId();
        setProperty('SPREADSHEET_ID', activeId);
        Logger.log('Auto-bound SPREADSHEET_ID to ScriptProperties: ' + activeId);
        return active;
      }
    } catch (e) {
      // Not container-bound
    }

    throw new Error('CONFIGURATION_ERROR: SPREADSHEET_ID is not configured. Please run initScriptProperties() or bind to an active spreadsheet.');
  }

  /**
   * Dynamic Admin Email Resolution
   * @returns {string}
   */
  function getAdminEmail() {
    var email = getProperty('ADMIN_EMAIL');
    if (!email) {
      try {
        email = Session.getEffectiveUser().getEmail();
      } catch (e) {
        email = 'admin@hrt.ac.th';
      }
    }
    return email;
  }

  /**
   * Dynamic Deployment Web App URL
   * @returns {string}
   */
  function getDeploymentUrl() {
    return getProperty('DEPLOYMENT_URL', 'https://script.google.com/macros/s/CURRENT_DEPLOYMENT_ID/exec');
  }

  /**
   * Dynamic Fiscal Year Resolution (Current Buddhist Era)
   * Reads from ScriptProperties, then System Config, or computes current Thai fiscal year
   * (Fiscal year runs Oct 1 - Sep 30; if month >= Oct, year = current + 1)
   * @returns {string} e.g. "2569"
   */
  function getActiveFiscalYear() {
    var fy = getProperty('ACTIVE_FISCAL_YEAR');
    if (fy) return fy;

    // Compute default dynamically from date
    var now = new Date();
    var gregorianYear = now.getFullYear();
    var month = now.getMonth() + 1; // 1-12
    var thaiYear = gregorianYear + 543;
    if (month >= 10) {
      thaiYear += 1;
    }
    return String(thaiYear);
  }

  /**
   * Initialize or update Script Properties safely
   * Can be executed by the administrator once during initial deployment
   * @param {Object} customConfig Optional custom config map
   */
  function initScriptProperties(customConfig) {
    customConfig = customConfig || {};
    var props = PropertiesService.getScriptProperties();

    var defaults = {
      'SYSTEM_NAME': 'HRT School Inventory Management System',
      'ACTIVE_FISCAL_YEAR': getActiveFiscalYear(),
      'ADMIN_EMAIL': customConfig.adminEmail || Session.getEffectiveUser().getEmail() || 'admin@hrt.ac.th',
      'LOCK_TIMEOUT_MS': '30000',
      'ALLOW_NEGATIVE_STOCK': 'FALSE',
      'AUTO_CREATE_MISSING_SHEETS': 'TRUE'
    };

    if (customConfig.spreadsheetId) {
      defaults['SPREADSHEET_ID'] = customConfig.spreadsheetId;
    } else {
      try {
        var active = SpreadsheetApp.getActiveSpreadsheet();
        if (active) defaults['SPREADSHEET_ID'] = active.getId();
      } catch (e) {}
    }

    if (customConfig.deploymentUrl) {
      defaults['DEPLOYMENT_URL'] = customConfig.deploymentUrl;
    }

    props.setProperties(defaults, false); // false = do not delete existing properties
    Logger.log('Script Properties initialized successfully: ' + JSON.stringify(props.getProperties()));
    return props.getProperties();
  }

  return {
    SHEET_NAMES: SHEET_NAMES,
    STYLES: STYLES,
    getProperty: getProperty,
    setProperty: setProperty,
    getSpreadsheet: getSpreadsheet,
    getAdminEmail: getAdminEmail,
    getDeploymentUrl: getDeploymentUrl,
    getActiveFiscalYear: getActiveFiscalYear,
    initScriptProperties: initScriptProperties
  };
})();
