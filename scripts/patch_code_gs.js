const fs = require('fs');
let code = fs.readFileSync('Code.gs', 'utf8');

const oldInit = `/**
 * Provisions or verifies the 16-sheet canonical schema in Google Sheets
 */
function initDatabase() {
  const ss = getSS();`;

const newInit = `/**
 * Provisions or verifies the 16-sheet canonical schema in Google Sheets (Strictly ADMIN authorized)
 */
function initDatabase() {
  const caller = ApiRouter.resolveAuthenticatedUser(true);
  if (!caller || caller.role !== 'ADMIN') {
    const err = new Error('FORBIDDEN: initDatabase requires ADMIN role.');
    err.code = 'FORBIDDEN';
    throw err;
  }
  return initDatabase_();
}

function initDatabase_() {
  const ss = getSS();`;

if (code.includes(oldInit)) {
  code = code.replace(oldInit, newInit);
  fs.writeFileSync('Code.gs', code, 'utf8');
  new Function(code);
  console.log('[OK] Code.gs initDatabase updated successfully');
} else {
  console.error('[FAIL] Could not find oldInit in Code.gs');
}
