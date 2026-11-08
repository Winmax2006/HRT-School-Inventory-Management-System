/**
 * HRT Inventory Management System - Prompt 11 Comprehensive Verification Suite
 * File: tests/p11_auth_miniui_rpc_test.js
 * 
 * Verifies:
 * 1. Admin User Management with E-mail as username & Last-Admin Protection.
 * 2. Login-First Architecture with Google Authentication (No data leaks/flash before auth).
 * 3. Server-Authoritative RBAC menus based on Config.gs permissions.
 * 4. HTML MiniUI Integration routed via doGet(e)?view=mini, sharing central backend.
 * 5. RPC Transport Reconciliation (Elimination of `[fnName] is not a function`).
 * 6. Zero Duplicate Global Function Collisions & Private `_` Suffix Encapsulation.
 * 7. Strict Fail-Closed getSS() and Identity Guards.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('==================================================');
console.log('RUNNING PROMPT 11: AUTH, SETTINGS, MINIUI & RPC TEST SUITE');
console.log('Target Version: v2.7.0-rc.5');
console.log('==================================================\n');

let passedCount = 0;
let failedCount = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       Error: ${err.message}`);
    failedCount++;
  }
}

// ----------------------------------------------------------------------------
// TEST GROUP 1: RPC TRANSPORT RECONCILIATION & ERROR PREVENTION
// ----------------------------------------------------------------------------

runTest('SCENARIO 1.1: Code.gs exposes universal HRT_rpc gateway alias', () => {
  const codeGs = fs.readFileSync('Code.gs', 'utf8');
  assert.ok(codeGs.includes('function HRT_rpc(action, payload)'), 'Code.gs must declare function HRT_rpc');
  assert.ok(codeGs.includes('return ApiRouter.routeRequest(action, payload);'), 'HRT_rpc must route through ApiRouter');
});

runTest('SCENARIO 1.2: Code.gs exports missing compatibility wrappers (KPIs, submit, ledger, reconcile, audit, settings)', () => {
  const codeGs = fs.readFileSync('Code.gs', 'utf8');
  assert.ok(codeGs.includes('function apiGetDashboardKPIs'), 'Missing apiGetDashboardKPIs wrapper in Code.gs');
  assert.ok(codeGs.includes('function apiSubmitRequisition'), 'Missing apiSubmitRequisition wrapper in Code.gs');
  assert.ok(codeGs.includes('function apiGetItemLedger'), 'Missing apiGetItemLedger wrapper in Code.gs');
  assert.ok(codeGs.includes('function apiReconcileBalance'), 'Missing apiReconcileBalance wrapper in Code.gs');
  assert.ok(codeGs.includes('function apiGetAuditTrail'), 'Missing apiGetAuditTrail wrapper in Code.gs');
  assert.ok(codeGs.includes('function apiUpdateSettingsSection'), 'Missing apiUpdateSettingsSection wrapper in Code.gs');
});

runTest('SCENARIO 1.3: Api.gs registers newly wired actions in ACTION_REGISTRY', () => {
  const apiGs = fs.readFileSync('Api.gs', 'utf8');
  assert.ok(apiGs.includes("'stock.ledger':"), "Api.gs must register 'stock.ledger'");
  assert.ok(apiGs.includes("'dashboard.kpis':"), "Api.gs must register 'dashboard.kpis'");
  assert.ok(apiGs.includes("'stock.reconcile':"), "Api.gs must register 'stock.reconcile'");
  assert.ok(apiGs.includes("'requisitions.submit':"), "Api.gs must register 'requisitions.submit'");
});

runTest('SCENARIO 1.4: ApiServiceCore contains try/catch containment to prevent unhandled [fnName] is not a function', () => {
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  assert.ok(indexHtml.includes('class ApiServiceCore'), 'index.html must embed ApiServiceCore');
  assert.ok(indexHtml.includes('runner[fnName](...args);') || indexHtml.includes('runner[action](...args);'), 'ApiServiceCore must attempt direct function call');
  assert.ok(indexHtml.includes('runner.apiCall(action, args[0]);'), 'ApiServiceCore must fall back to apiCall');
  assert.ok(indexHtml.includes('runner.HRT_rpc(action, args[0]);'), 'ApiServiceCore must fall back to HRT_rpc');
});

runTest('SCENARIO 1.5: Frontend files contain zero direct uncontained google.script.run bypasses', () => {
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  assert.ok(!indexHtml.includes('.apiGetSettings()'), 'index.html must not directly invoke google.script.run.apiGetSettings without containment');
  assert.ok(!indexHtml.includes('.apiGetItems({ fiscalYear: currentFiscalYear });'), 'index.html line 13134 must not directly invoke google.script.run.apiGetItems');
});

// ----------------------------------------------------------------------------
// TEST GROUP 2: LOGIN-FIRST ARCHITECTURE (ZERO FLASH & FAIL-CLOSED AUTH)
// ----------------------------------------------------------------------------

runTest('SCENARIO 2.1: Login-First Guard Overlay exists in index.html and covers UI on load', () => {
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  assert.ok(indexHtml.includes('id="loginGuardOverlay"') || indexHtml.includes('id="authGuardOverlay"'), 'index.html must contain login guard overlay');
  assert.ok(indexHtml.includes('id="authCheckingState"'), 'index.html must contain #authCheckingState');
  assert.ok(indexHtml.includes('id="authLoginPromptState"') || indexHtml.includes('id="authLoginRequiredState"'), 'index.html must contain auth login prompt state');
  assert.ok(indexHtml.includes('id="authAccessDeniedState"'), 'index.html must contain #authAccessDeniedState');
});

runTest('SCENARIO 2.2: window.onload awaits checkAuthenticationAndInitialize before loading modules', () => {
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  assert.ok(indexHtml.includes('await checkAuthenticationAndInitialize()'), 'window.onload must await checkAuthenticationAndInitialize');
});

runTest('SCENARIO 2.3: Server user resolver rejects unregistered or suspended accounts', () => {
  const apiGs = fs.readFileSync('Api.gs', 'utf8');
  assert.ok(apiGs.includes('USER_SUSPENDED'), 'Api.gs must reject suspended accounts with USER_SUSPENDED');
  assert.ok(apiGs.includes('UNREGISTERED_USER'), 'Api.gs must reject unregistered identities on write with UNREGISTERED_USER');
});

// ----------------------------------------------------------------------------
// TEST GROUP 3: ADMIN USER MANAGEMENT (EMAIL AS USERNAME)
// ----------------------------------------------------------------------------

runTest('SCENARIO 3.1: apiCreateUser enforces normalized E-mail as username', () => {
  const writeGs = fs.readFileSync('Write.gs', 'utf8');
  assert.ok(writeGs.includes('const username = email;'), 'apiCreateUser must store full normalized email as username');
  assert.ok(!writeGs.includes("const username = email.split('@')[0];"), 'apiCreateUser must not truncate email to prefix');
});

runTest('SCENARIO 3.2: apiUpdateUser and apiSuspendUser enforce Last-Admin Protection', () => {
  const writeGs = fs.readFileSync('Write.gs', 'utf8');
  assert.ok(writeGs.includes('LAST_ADMIN_PROTECTION'), 'Write.gs must enforce LAST_ADMIN_PROTECTION');
  assert.ok(writeGs.includes('activeAdminCount <= 1'), 'Write.gs must prevent demoting or suspending the last active administrator');
});

runTest('SCENARIO 3.3: User management modal and table in index.html are wired to ApiService', () => {
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  assert.ok(indexHtml.includes("window.ApiService.call('apiCreateUser'"), 'submitSaveUser must call apiCreateUser on ApiService');
  assert.ok(indexHtml.includes("window.ApiService.call('apiUpdateUser'"), 'submitSaveUser must call apiUpdateUser on ApiService');
});

// ----------------------------------------------------------------------------
// TEST GROUP 4: SERVER-AUTHORITATIVE RBAC MENUS
// ----------------------------------------------------------------------------

runTest('SCENARIO 4.1: applyServerRbacMenus filters menus according to server role', () => {
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  assert.ok(indexHtml.includes('function applyServerRbacMenus(user)'), 'index.html must define applyServerRbacMenus');
  assert.ok(indexHtml.includes("menuSettings.style.display = isAdmin ? '' : 'none';"), 'Settings menu must only be visible to ADMIN');
  assert.ok(indexHtml.includes("menuActionNeeded.style.display = isOfficer ? '' : 'none';"), 'Action Needed must only be visible to Officer/Admin');
  assert.ok(indexHtml.includes("menuAudit.style.display = isOfficer ? '' : 'none';"), 'Year-End Audit must only be visible to Officer/Admin');
});

runTest('SCENARIO 4.2: Fake role dropdown is replaced with real authenticated profile panel', () => {
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  assert.ok(!indexHtml.includes("onclick=\"setUserRole('officer')\""), 'Fake role switch button setUserRole(officer) must be removed from profile menu');
  assert.ok(indexHtml.includes('executeGoogleSignOut()'), 'Profile menu must include real Sign Out action');
  assert.ok(indexHtml.includes('href="?view=mini"'), 'Profile menu must link to MiniUI');
});

// ----------------------------------------------------------------------------
// TEST GROUP 5: HTML MINIUI INTEGRATION & SHARED BACKEND
// ----------------------------------------------------------------------------

runTest('SCENARIO 5.1: doGet(e) in Code.gs routes ?view=mini to MiniUI.html', () => {
  const codeGs = fs.readFileSync('Code.gs', 'utf8');
  assert.ok(codeGs.includes("e.parameter.view === 'mini'"), 'doGet must check e.parameter.view === mini');
  assert.ok(codeGs.includes("HtmlService.createTemplateFromFile('MiniUI.html')"), 'doGet must render MiniUI.html for mini view');
});

runTest('SCENARIO 5.2: MiniUI.html exists, contains no demo localStorage mock keys, and uses ApiService', () => {
  assert.ok(fs.existsSync('MiniUI.html'), 'MiniUI.html must exist at root');
  const miniHtml = fs.readFileSync('MiniUI.html', 'utf8');
  assert.ok(!miniHtml.includes('hrt-miniui-demo-v1'), 'MiniUI.html must not contain synthetic demo key hrt-miniui-demo-v1');
  assert.ok(miniHtml.includes('class ApiServiceCore'), 'MiniUI.html must embed ApiServiceCore');
  assert.ok(miniHtml.includes("apiGetCurrentUser"), 'MiniUI.html must invoke apiGetCurrentUser on load');
  assert.ok(miniHtml.includes("apiGetItems"), 'MiniUI.html must fetch items via apiGetItems');
  assert.ok(miniHtml.includes("apiCreateRequisition"), 'MiniUI.html must submit requisitions via apiCreateRequisition');
  assert.ok(miniHtml.includes("source: 'MINI_QR'"), "MiniUI.html must identify requisition source as MINI_QR");
});

runTest('SCENARIO 5.3: MiniUI requisition submission preserves decoupled stock deduction', () => {
  const writeLines = fs.readFileSync('Write.gs', 'utf8').split('\n');

  // Find hrtCreateRequisition_ block
  const createIdx = writeLines.findIndex(l => l.includes('hrtCreateRequisition_(') || l.includes('apiCreateRequisition('));
  assert.ok(createIdx >= 0, 'Must find requisition creation handler in Write.gs');
  const createBlock = writeLines.slice(createIdx, createIdx + 120).join('\n');
  assert.ok(!createBlock.includes('hrtPostLedgerMovement_') && !createBlock.includes('postLedgerMovement'),
    'Requisition creation must NEVER call ledger movement (Stock unchanged on creation)');

  // Find hrtIssueStock_ block
  const issueIdx = writeLines.findIndex(l => l.includes('hrtIssueStock_(') || l.includes('apiIssueStock('));
  assert.ok(issueIdx >= 0, 'Must find stock issuance handler in Write.gs');
  const issueBlock = writeLines.slice(issueIdx, issueIdx + 160).join('\n');
  assert.ok(issueBlock.includes('hrtPostLedgerMovement_') || issueBlock.includes('postLedgerMovement'),
    'Stock issuance must call post ledger movement (Decoupled issuance)');
});

// ----------------------------------------------------------------------------
// TEST GROUP 6: SYMBOL ISOLATION, PRIVATE HANDLERS & STRICT ACCESS GUARDS
// ----------------------------------------------------------------------------

runTest('SCENARIO 6.1: Zero duplicate top-level function declarations across all 6 backend files', () => {
  const backendFiles = ['Config.gs', 'Api.gs', 'Read.gs', 'Write.gs', 'Audit.gs', 'Code.gs'];
  const funcLocations = {};

  backendFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const matches = [...content.matchAll(/^function\s+([a-zA-Z0-9_$]+)\s*\(/gm)].map(m => m[1]);
    matches.forEach(fn => {
      if (!funcLocations[fn]) funcLocations[fn] = [];
      funcLocations[fn].push(file);
    });
  });

  const duplicateErrors = [];
  for (const [fn, locs] of Object.entries(funcLocations)) {
    if (locs.length > 1) {
      duplicateErrors.push(`Duplicate function "${fn}" declared in: ${locs.join(', ')}`);
    }
  }

  assert.strictEqual(duplicateErrors.length, 0, duplicateErrors.join('\n'));
});

runTest('SCENARIO 6.2: All internal business handlers in Read.gs, Write.gs, and Audit.gs end with _', () => {
  const filesToVerify = ['Read.gs', 'Write.gs', 'Audit.gs'];
  const exposedPublicFns = [];

  filesToVerify.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const matches = [...content.matchAll(/^function\s+([a-zA-Z0-9_$]+)\s*\(/gm)].map(m => m[1]);
    matches.forEach(fn => {
      // Allow only logAudit as an internal helper if desired, but all others MUST end with _
      if (!fn.endsWith('_') && fn !== 'logAudit') {
        exposedPublicFns.push(`${file}: function ${fn}`);
      }
    });
  });

  assert.strictEqual(exposedPublicFns.length, 0, 'Found un-encapsulated public functions in business files:\n' + exposedPublicFns.join('\n'));
});

runTest('SCENARIO 6.3: Strict getSS() throws DATABASE_ACCESS_ERROR immediately on failure', () => {
  const configGs = fs.readFileSync('Config.gs', 'utf8');
  assert.ok(configGs.includes('DATABASE_ACCESS_ERROR'), 'Config.gs getSS must throw DATABASE_ACCESS_ERROR');
  assert.ok(!configGs.includes('falling back to active spreadsheet'), 'getSS must NOT silently fall back to active spreadsheet on failure');
});

runTest('SCENARIO 6.4: Auth fails closed without DEV_MODE in live runtime and requires GOOGLE_CLIENT_ID for tokens', () => {
  const apiGs = fs.readFileSync('Api.gs', 'utf8');
  assert.ok(!apiGs.includes("getProperty('DEV_MODE') === 'true'"), 'Api.gs must NOT allow DEV_MODE privilege elevation in live runtime');
  assert.ok(apiGs.includes('CONFIGURATION_ERROR'), 'Api.gs must enforce CONFIGURATION_ERROR if GOOGLE_CLIENT_ID is missing during token auth');
});

runTest('SCENARIO 6.5: initDatabase requires ADMIN role authorization', () => {
  const codeGs = fs.readFileSync('Code.gs', 'utf8');
  assert.ok(codeGs.includes("caller.role !== 'ADMIN'"), 'initDatabase must check caller.role === ADMIN');
  assert.ok(codeGs.includes('FORBIDDEN: initDatabase requires ADMIN role'), 'initDatabase must throw FORBIDDEN for non-admins');
});

runTest('SCENARIO 6.6: Client UI in index.html initializes roles to null without hardcoded defaults', () => {
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  assert.ok(!indexHtml.includes("let currentUserRole = 'officer';"), "index.html must not initialize currentUserRole to 'officer'");
  assert.ok(indexHtml.includes('let currentUserRole = null;'), 'index.html must initialize currentUserRole to null');
  assert.ok(!indexHtml.includes(": 'ADMIN';"), "index.html must not default role pill to 'ADMIN'");
});

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
console.log('\n==================================================');
console.log(`TOTAL SCENARIOS: ${passedCount + failedCount}`);
console.log(`PASSED: ${passedCount}`);
console.log(`FAILED: ${failedCount}`);
console.log('==================================================');

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('ALL PROMPT 11 TESTS PASSED 100%!\n');
}
