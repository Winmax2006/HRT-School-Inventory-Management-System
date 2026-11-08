const fs = require('fs');

// 1. Patch Config.gs
let configCode = fs.readFileSync('Config.gs', 'utf8');

// Remove redundant YEAR_END_AUDIT_ITEMS from CONFIG.SHEETS while keeping in SHEET_ALIASES
const targetSheetsEntry = "    YEAR_END_AUDITS: '13_Year_End_Audits',\r\n    YEAR_END_AUDIT_ITEMS: '13_Year_End_Audit_Items',\r\n    DISPOSAL_RECORDS: '14_Disposal_Records',";
const targetSheetsEntryLF = "    YEAR_END_AUDITS: '13_Year_End_Audits',\n    YEAR_END_AUDIT_ITEMS: '13_Year_End_Audit_Items',\n    DISPOSAL_RECORDS: '14_Disposal_Records',";

const replacementSheetsEntry = "    YEAR_END_AUDITS: '13_Year_End_Audits',\r\n    DISPOSAL_RECORDS: '14_Disposal_Records',";
const replacementSheetsEntryLF = "    YEAR_END_AUDITS: '13_Year_End_Audits',\n    DISPOSAL_RECORDS: '14_Disposal_Records',";

if (configCode.includes(targetSheetsEntry)) {
  configCode = configCode.replace(targetSheetsEntry, replacementSheetsEntry);
} else if (configCode.includes(targetSheetsEntryLF)) {
  configCode = configCode.replace(targetSheetsEntryLF, replacementSheetsEntryLF);
} else {
  console.warn('Could not find targetSheetsEntry in Config.gs');
}

// Update SHEET_ALIASES to alias year_end_audit_items to 13_Year_End_Audits
const targetAliasEntry = "'year_end_audit_items': ['13_Year_End_Audit_Items', 'Year_End_Audit_Items', 'year_end_audit_items'],";
const replacementAliasEntry = "'year_end_audit_items': ['13_Year_End_Audits', '13_Year_End_Audit_Items', 'Year_End_Audit_Items', 'year_end_audit_items'],";

if (configCode.includes(targetAliasEntry)) {
  configCode = configCode.replace(targetAliasEntry, replacementAliasEntry);
} else {
  console.warn('Could not find targetAliasEntry in Config.gs');
}

fs.writeFileSync('Config.gs', configCode, 'utf8');
console.log('Successfully patched Config.gs');

// 2. Patch Api.gs
let apiCode = fs.readFileSync('Api.gs', 'utf8');

// Ensure backups.restore and restoreFromBundle routes are registered
if (!apiCode.includes("'backups.restore'")) {
  const targetRoute = "'backups.validateRestore': { handler: 'hrtValidateRestore_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: false },";
  const replacementRoute = `'backups.validateRestore': { handler: 'hrtValidateRestore_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: false },
    'backups.restore': { handler: 'hrtRestoreFromBundle_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: true },
    'restoreFromBundle': { handler: 'hrtRestoreFromBundle_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: true },`;
  apiCode = apiCode.replace(targetRoute, replacementRoute);
}

// Ensure hrtRestoreFromBundle_ is registered in resolveAllowlistedHandler
if (!apiCode.includes("'hrtRestoreFromBundle_'")) {
  const targetAllowlist = "'hrtValidateRestore_': typeof hrtValidateRestore_ === 'function' ? hrtValidateRestore_ : (typeof globalThis !== 'undefined' ? globalThis.hrtValidateRestore_ : null),";
  const replacementAllowlist = `'hrtValidateRestore_': typeof hrtValidateRestore_ === 'function' ? hrtValidateRestore_ : (typeof globalThis !== 'undefined' ? globalThis.hrtValidateRestore_ : null),
      'hrtRestoreFromBundle_': typeof hrtRestoreFromBundle_ === 'function' ? hrtRestoreFromBundle_ : (typeof globalThis !== 'undefined' ? globalThis.hrtRestoreFromBundle_ : null),`;
  apiCode = apiCode.replace(targetAllowlist, replacementAllowlist);
}

// Ensure foundUserRow includes userId
const targetUserRow = `          foundUserRow = {
            id: userId,
            user_id: userId,
            email: email,`;
const replacementUserRow = `          foundUserRow = {
            id: userId,
            user_id: userId,
            userId: userId,
            email: email,`;

if (apiCode.includes(targetUserRow)) {
  apiCode = apiCode.replace(targetUserRow, replacementUserRow);
}

fs.writeFileSync('Api.gs', apiCode, 'utf8');
console.log('Successfully patched Api.gs');
