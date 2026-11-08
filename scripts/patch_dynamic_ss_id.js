const fs = require('fs');

// Patch Config.gs
let configCode = fs.readFileSync('Config.gs', 'utf8');

const targetGetSS = `function getSS() {
  if (typeof SpreadsheetApp === 'undefined') {
    const err = new Error('DATABASE_ACCESS_ERROR: SpreadsheetApp is not available in the current runtime environment.');
    err.code = 'DATABASE_ACCESS_ERROR';
    throw err;
  }
  if (CONFIG.SPREADSHEET_ID) {
    try {
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      if (!ss) {
        const err = new Error('DATABASE_ACCESS_ERROR: Could not open spreadsheet with ID "' + CONFIG.SPREADSHEET_ID + '".');
        err.code = 'DATABASE_ACCESS_ERROR';
        throw err;
      }
      return ss;
    } catch (e) {
      const err = new Error('DATABASE_ACCESS_ERROR: Failed to open configured spreadsheet "' + CONFIG.SPREADSHEET_ID + '": ' + e.message);
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
}`;

const replacementGetSS = `function getConfiguredSpreadsheetId_() {
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
}`;

const normTarget = targetGetSS.replace(/\r\n/g, '\n');
const normConfig = configCode.replace(/\r\n/g, '\n');

if (normConfig.includes(normTarget)) {
  configCode = normConfig.replace(normTarget, replacementGetSS.replace(/\r\n/g, '\n'));
  console.log('Replaced getSS in Config.gs');
}

fs.writeFileSync('Config.gs', configCode, 'utf8');

// Patch Read.gs hrtCheckHealth_ configuredId lookup
let readCode = fs.readFileSync('Read.gs', 'utf8');
const targetCfg = 'const configuredId = CONFIG.SPREADSHEET_ID ? String(CONFIG.SPREADSHEET_ID).trim() : null;';
const replacementCfg = 'const configuredId = typeof getConfiguredSpreadsheetId_ === \'function\' ? (getConfiguredSpreadsheetId_() || null) : (CONFIG.SPREADSHEET_ID ? String(CONFIG.SPREADSHEET_ID).trim() : null);';

if (readCode.includes(targetCfg)) {
  readCode = readCode.replace(targetCfg, replacementCfg);
  console.log('Updated configuredId resolution in Read.gs');
}

fs.writeFileSync('Read.gs', readCode, 'utf8');
