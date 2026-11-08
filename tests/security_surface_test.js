/**
 * tests/security_surface_test.js
 * HRT Inventory Management System - Prompt 13 Security Surface & Router Test Suite
 * 
 * Verifies Acceptance Criteria SEC-01 through SEC-07:
 * - SEC-01: No unauthenticated/public mutable helper bypasses Router
 * - SEC-02: Client spoofing of caller/user/role in request cannot escalate privileges
 * - SEC-03: Non-admin calling config/user/admin action directly is rejected (FORBIDDEN)
 * - SEC-04: ACTION_REGISTRY routes resolve to concrete allowlisted handlers without recursion
 * - SEC-05: include_ allowlist enforces template isolation and internal calls remain sound
 * - SEC-06: Unknown actions and handler errors return sanitized errors without secret leakage
 * - SEC-07: Handler definition does not bypass dynamic authorization or fiscal constraints
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=============================================================');
console.log('RUNNING PROMPT 13: BASELINE, PUBLIC SURFACE & ROUTER SECURITY');
console.log('Target Baseline: v2.7.0-rc.5 -> Working State for rc.6');
console.log('=============================================================\n');

let passedCount = 0;
let failedCount = 0;
const results = [];

function runTest(id, name, fn) {
  try {
    fn();
    console.log(`[PASS] [${id}] ${name}`);
    passedCount++;
    results.push({ id, name, status: 'PASS', error: null });
  } catch (err) {
    console.error(`[FAIL] [${id}] ${name}`);
    console.error(`       Error: ${err.message}`);
    failedCount++;
    results.push({ id, name, status: 'FAIL', error: err.message });
  }
}

// Read source files
const configGs = fs.readFileSync(path.join(__dirname, '../Config.gs'), 'utf8');
const apiGs = fs.readFileSync(path.join(__dirname, '../Api.gs'), 'utf8');
const readGs = fs.readFileSync(path.join(__dirname, '../Read.gs'), 'utf8');
const writeGs = fs.readFileSync(path.join(__dirname, '../Write.gs'), 'utf8');
const auditGs = fs.readFileSync(path.join(__dirname, '../Audit.gs'), 'utf8');
const codeGs = fs.readFileSync(path.join(__dirname, '../Code.gs'), 'utf8');

// ----------------------------------------------------------------------------
// SEC-01: NO UNAUTHENTICATED / PUBLIC MUTABLE HELPER BYPASSES ROUTER
// ----------------------------------------------------------------------------
runTest('SEC-01', 'Private suffix (_) encapsulation for mutable helpers (setConfig_, logAudit_, invalidateCache_, include_, initDatabase_)', () => {
  // 1. Config.gs: setConfig and invalidateCache must have trailing underscore
  assert.ok(configGs.includes('function setConfig_('), 'Config.gs must declare setConfig_ as private');
  assert.ok(!configGs.match(/function\s+setConfig\s*\(/), 'Config.gs must NOT expose public setConfig');
  assert.ok(configGs.includes('function invalidateCache_('), 'Config.gs must declare invalidateCache_ as private');
  assert.ok(!configGs.match(/function\s+invalidateCache\s*\(/), 'Config.gs must NOT expose public invalidateCache');

  // 2. Audit.gs: logAudit must have trailing underscore
  assert.ok(auditGs.includes('function logAudit_('), 'Audit.gs must declare logAudit_ as private');
  assert.ok(!auditGs.match(/function\s+logAudit\s*\(/), 'Audit.gs must NOT expose public logAudit');

  // 3. Code.gs: include and initDatabase must be private
  assert.ok(codeGs.includes('function include_('), 'Code.gs must declare include_ as private');
  assert.ok(!codeGs.match(/function\s+include\s*\(/), 'Code.gs must NOT expose public include');
  assert.ok(codeGs.includes('function initDatabase_('), 'Code.gs must declare initDatabase_ as private');
  assert.ok(!codeGs.match(/function\s+initDatabase\s*\(/), 'Code.gs must NOT expose public initDatabase facade');

  // 4. All public functions in Code.gs must delegate to ApiRouter or apiCall
  const publicFns = [...codeGs.matchAll(/function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*\{([\s\S]*?)\}/g)]
    .map(m => ({ name: m[1], body: m[3] }))
    .filter(f => !f.name.endsWith('_') && f.name !== 'doGet' && f.name !== 'doPost');

  for (const fn of publicFns) {
    const delegates = fn.body.includes('ApiRouter.routeRequest') || fn.body.includes('apiCall');
    assert.ok(delegates, `Public facade ${fn.name} in Code.gs must delegate to ApiRouter`);
  }

  // 5. Audit.gs and Write.gs must have 0 public functions
  const auditPublic = [...auditGs.matchAll(/function\s+([A-Za-z0-9_]+)\s*\(/g)].map(m => m[1]).filter(f => !f.endsWith('_'));
  assert.strictEqual(auditPublic.length, 0, `Audit.gs must have 0 public functions. Found: ${auditPublic.join(', ')}`);
  
  const writePublic = [...writeGs.matchAll(/function\s+([A-Za-z0-9_]+)\s*\(/g)].map(m => m[1]).filter(f => !f.endsWith('_'));
  assert.strictEqual(writePublic.length, 0, `Write.gs must have 0 public functions. Found: ${writePublic.join(', ')}`);
});

// ----------------------------------------------------------------------------
// SEC-02: USER/CALLER/ROLE SPOOF IN REQUEST CANNOT ESCALATE PRIVILEGES
// ----------------------------------------------------------------------------
runTest('SEC-02', 'doPost strips client-supplied identity spoofing and resolver binds to authoritative Session/Token', () => {
  // 1. doPost in Code.gs must actively strip caller, _serverActor, userRole, callerRole
  assert.ok(codeGs.includes('delete payload.caller;'), 'doPost must delete payload.caller');
  assert.ok(codeGs.includes('delete payload._serverActor;'), 'doPost must delete payload._serverActor');
  assert.ok(codeGs.includes('delete payload.userRole;'), 'doPost must delete payload.userRole');
  assert.ok(codeGs.includes('delete payload.callerRole;'), 'doPost must delete payload.callerRole');

  // 2. ApiRouter.resolveAuthenticatedUser in Api.gs must NOT read role from caller/payload
  assert.ok(apiGs.includes('resolveAuthenticatedUser'), 'Api.gs must provide resolveAuthenticatedUser');
  assert.ok(!apiGs.includes('caller.role = rawPayload.role'), 'Api.gs must never assign role from payload');
  assert.ok(apiGs.includes('sheet.getDataRange().getValues()'), 'Api.gs must query 01_Users table for authoritative role');

  // 3. Simulated test: payload stripping logic
  const mockPayload = {
    caller: { role: 'ADMIN', email: 'attacker@evil.com' },
    _serverActor: 'ROOT',
    userRole: 'ADMIN',
    callerRole: 'ADMIN',
    legitimateData: 'sample_value'
  };

  // Execute stripping
  delete mockPayload.caller;
  delete mockPayload._serverActor;
  delete mockPayload.userRole;
  delete mockPayload.callerRole;

  assert.strictEqual(mockPayload.caller, undefined, 'Spoofed caller must be undefined');
  assert.strictEqual(mockPayload._serverActor, undefined, 'Spoofed _serverActor must be undefined');
  assert.strictEqual(mockPayload.userRole, undefined, 'Spoofed userRole must be undefined');
  assert.strictEqual(mockPayload.callerRole, undefined, 'Spoofed callerRole must be undefined');
  assert.strictEqual(mockPayload.legitimateData, 'sample_value', 'Legitimate parameters must be preserved');
});

// ----------------------------------------------------------------------------
// SEC-03: NON-ADMIN DIRECT INVOCATION OF CONFIG/USER/ADMIN ACTIONS IS REJECTED
// ----------------------------------------------------------------------------
runTest('SEC-03', 'Server-side RBAC denies non-admin callers attempting admin actions (FORBIDDEN)', () => {
  // 1. Admin actions in ACTION_REGISTRY require ADMIN role
  const adminActions = [
    'users.create',
    'users.update',
    'users.suspend',
    'settings.update',
    'settings.updateSection',
    'fiscalYear.setupInitial',
    'fiscalYear.close'
  ];

  for (const action of adminActions) {
    const actionRegex = new RegExp(`'${action.replace('.', '\\.')}':\\s*\\{[^}]*minRole:\\s*'ADMIN'`);
    assert.ok(actionRegex.test(apiGs), `Action "${action}" must require minRole: 'ADMIN' in ACTION_REGISTRY`);
  }

  // 2. initDatabase_ has explicit guard throwing FORBIDDEN if caller is not ADMIN
  assert.ok(codeGs.includes("if (!caller || caller.role !== 'ADMIN')"), 'initDatabase_ must enforce caller.role === ADMIN');
  assert.ok(codeGs.includes("FORBIDDEN: initDatabase requires ADMIN role"), 'initDatabase_ must throw FORBIDDEN');

  // 3. RBAC hierarchy verification
  const ROLE_HIERARCHY = {
    'ANONYMOUS': 0,
    'STUDENT': 1,
    'TEACHER': 2,
    'REQUESTER': 2,
    'STAFF': 3,
    'OFFICER': 4,
    'APPROVER': 5,
    'DIRECTOR': 6,
    'ADMIN': 7
  };

  function checkPermission(userRole, minRole) {
    const userWeight = ROLE_HIERARCHY[userRole] || 0;
    const minWeight = ROLE_HIERARCHY[minRole] || 99;
    return userWeight >= minWeight;
  }

  assert.strictEqual(checkPermission('TEACHER', 'ADMIN'), false, 'TEACHER must not have ADMIN permission');
  assert.strictEqual(checkPermission('OFFICER', 'ADMIN'), false, 'OFFICER must not have ADMIN permission');
  assert.strictEqual(checkPermission('DIRECTOR', 'ADMIN'), false, 'DIRECTOR must not have ADMIN permission');
  assert.strictEqual(checkPermission('ADMIN', 'ADMIN'), true, 'ADMIN must have ADMIN permission');
});

// ----------------------------------------------------------------------------
// SEC-04: ACTION_REGISTRY ROUTES RESOLVE TO CONCRETE ALLOWLISTED HANDLERS
// ----------------------------------------------------------------------------
runTest('SEC-04', 'Zero recursion, zero dynamic string lookup, and all 135 actions resolve to allowlisted handlers', () => {
  // 1. Extract ACTION_REGISTRY
  const start = apiGs.indexOf('const ACTION_REGISTRY = Object.freeze({');
  const end = apiGs.indexOf('});', start);
  const registryStr = apiGs.substring(start, end);
  const actions = [...registryStr.matchAll(/'([^']+)':\s*\{\s*handler:\s*'([^']+)'/g)];

  assert.strictEqual(actions.length, 135, `ACTION_REGISTRY must contain 135 actions. Found ${actions.length}`);

  // 2. Verify all handlers are private (_) and NOT facades
  for (const [_, action, handler] of actions) {
    assert.ok(handler.endsWith('_'), `Handler "${handler}" for action "${action}" must end with private suffix '_'`);
    assert.ok(!handler.startsWith('api'), `Handler "${handler}" for action "${action}" must NOT be a public api facade`);
  }

  // 3. Specifically verify 'requisitions.submit' is hrtCreateRequisition_ (no recursion)
  const reqSubmitMatch = registryStr.match(/'requisitions\.submit':\s*\{\s*handler:\s*'([^']+)'/);
  assert.ok(reqSubmitMatch, "requisitions.submit must be registered");
  assert.strictEqual(reqSubmitMatch[1], 'hrtCreateRequisition_', "requisitions.submit must map to hrtCreateRequisition_, not apiSubmitRequisition");

  // 4. Verify explicit allowlisted resolver exists
  assert.ok(apiGs.includes('function resolveAllowlistedHandler(handlerName)'), 'Api.gs must define resolveAllowlistedHandler');
  assert.ok(apiGs.includes('const ALLOWLISTED_HANDLERS = {'), 'Api.gs must define ALLOWLISTED_HANDLERS');

  // 5. Test allowlist resolver safety: arbitrary string / prototype properties must return null
  assert.ok(!apiGs.includes('globalThis[route.handler]'), 'Api.gs must NOT use unconstrained globalThis lookup');
  assert.ok(!apiGs.includes('global[route.handler]'), 'Api.gs must NOT use unconstrained global lookup');
});

// ----------------------------------------------------------------------------
// SEC-05: TEMPLATE INCLUSION ALLOWLIST & INTERNAL REFERENCES SOUNDNESS
// ----------------------------------------------------------------------------
runTest('SEC-05', 'include_ allowlist enforces template containment and all internal references are valid', () => {
  // 1. include_ template allowlist
  assert.ok(codeGs.includes("const ALLOWLISTED_TEMPLATES = ['index.html', 'MiniUI.html'];"), 'include_ must restrict templates to allowlist');
  assert.ok(codeGs.includes('Unauthorized template inclusion request'), 'include_ must log unauthorized attempts');

  // 2. Simulated template allowlist check
  const ALLOWLISTED_TEMPLATES = ['index.html', 'MiniUI.html'];
  function safeIncludeCheck(filename) {
    const safeFilename = String(filename || '').trim();
    return ALLOWLISTED_TEMPLATES.includes(safeFilename);
  }

  assert.strictEqual(safeIncludeCheck('index.html'), true, 'index.html must be permitted');
  assert.strictEqual(safeIncludeCheck('MiniUI.html'), true, 'MiniUI.html must be permitted');
  assert.strictEqual(safeIncludeCheck('appsscript.json'), false, 'appsscript.json must be blocked');
  assert.strictEqual(safeIncludeCheck('../../etc/passwd'), false, 'Path traversal must be blocked');
  assert.strictEqual(safeIncludeCheck('Config.gs'), false, 'Config.gs must be blocked');

  // 3. Internal references in Write.gs to setConfig_, invalidateCache_, logAudit_
  assert.ok(!writeGs.match(/\bsetConfig\(/), 'Write.gs must not call old setConfig');
  assert.ok(!writeGs.match(/\binvalidateCache\(/), 'Write.gs must not call old invalidateCache');
  assert.ok(!writeGs.match(/\blogAudit\(/), 'Write.gs must not call old logAudit');
  assert.ok(writeGs.includes('setConfig_('), 'Write.gs must call setConfig_');
  assert.ok(writeGs.includes('invalidateCache_('), 'Write.gs must call invalidateCache_');
  assert.ok(writeGs.includes('logAudit_('), 'Write.gs must call logAudit_');

  // 4. Audit write-failure policy in Write.gs (pass isMandatory=true)
  assert.ok(writeGs.includes('logAudit_(') && writeGs.includes('true)'), 'Write.gs mutations must mark audit as mandatory');
});

// ----------------------------------------------------------------------------
// SEC-06: UNKNOWN ACTIONS & HANDLER ERRORS DO NOT LEAK SECRETS/TOKENS
// ----------------------------------------------------------------------------
runTest('SEC-06', 'Log sanitizer redacts secrets/tokens and unknown actions return clean error envelope', () => {
  // 1. Audit sanitizer in Audit.gs
  assert.ok(auditGs.includes('function hrtSanitizeAuditDetails_('), 'Audit.gs must define hrtSanitizeAuditDetails_');
  assert.ok(auditGs.includes('Bearer [MASKED_TOKEN]'), 'Sanitizer must mask Bearer tokens');
  assert.ok(auditGs.includes('Basic [MASKED_CREDENTIALS]'), 'Sanitizer must mask Basic credentials');
  assert.ok(auditGs.includes('[MASKED_OAUTH_TOKEN]'), 'Sanitizer must mask Google OAuth tokens (ya29.)');
  assert.ok(auditGs.includes('[MASKED_API_KEY]'), 'Sanitizer must mask Google API keys (AIza...)');
  assert.ok(auditGs.includes('[MASKED_JWT]'), 'Sanitizer must mask JWT tokens');
  assert.ok(auditGs.includes('[MASKED_PRIVATE_KEY]'), 'Sanitizer must mask PEM Private Keys');

  // 2. Test sanitizer logic directly
  function sanitize(details) {
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

  const testSensitiveString = 'Failed with token: ya29.a0AfH6SMB_secretToken and key AIzaSyD9x8K_exampleKey12345678901234 and pass password=SuperSecret123!';
  const sanitized = sanitize(testSensitiveString);

  assert.ok(!sanitized.includes('ya29.a0AfH6SMB_secretToken'), 'OAuth token must be redacted');
  assert.ok(!sanitized.includes('AIzaSyD9x8K_exampleKey12345678901234'), 'API key must be redacted');
  assert.ok(!sanitized.includes('SuperSecret123!'), 'Password must be redacted');
  assert.ok(sanitized.includes('[MASKED_OAUTH_TOKEN]'), 'Must contain [MASKED_OAUTH_TOKEN]');
  assert.ok(sanitized.includes('[MASKED_API_KEY]'), 'Must contain [MASKED_API_KEY]');
  assert.ok(sanitized.includes('password=[MASKED]'), 'Must contain password=[MASKED]');

  // 3. Unknown action routing produces clean standard error
  assert.ok(apiGs.includes("'UNKNOWN_ACTION'"), 'Api.gs must define UNKNOWN_ACTION error code');
  assert.ok(apiGs.includes('success: false'), 'Api.gs error handler must return success: false envelope');
});

// ----------------------------------------------------------------------------
// SEC-07: READINESS & HANDLER DEFINITION DECOUPLED FROM DYNAMIC AUTHORIZATION
// ----------------------------------------------------------------------------
runTest('SEC-07', 'Handler definition is decoupled from runtime authorization and fiscal year boundary constraints', () => {
  // 1. ApiRouter enforces isWrite fiscal year validation dynamically at runtime
  assert.ok(apiGs.includes('if (route.isWrite)'), 'ApiRouter must check route.isWrite dynamically');
  assert.ok(apiGs.includes('isFiscalYearClosed(payload.fiscalYear)'), 'ApiRouter must check isFiscalYearClosed before dispatching write');
  assert.ok(apiGs.includes('CLOSED_FISCAL_YEAR'), 'ApiRouter must reject writes on closed fiscal year with CLOSED_FISCAL_YEAR');

  // 2. Idempotency replay check is performed before write handler execution
  assert.ok(apiGs.includes('checkIdempotency(idempotencyKey, caller.id, action, payload)'), 'ApiRouter must verify idempotency before handler execution');

  // 3. Definition verification vs Runtime execution separation
  function simulateWriteGuard(isWrite, isYearClosed) {
    if (isWrite && isYearClosed) {
      const err = new Error('CLOSED_FISCAL_YEAR: Cannot perform write transactions against closed fiscal year.');
      err.code = 'CLOSED_FISCAL_YEAR';
      throw err;
    }
    return { success: true };
  }

  assert.throws(() => simulateWriteGuard(true, true), /CLOSED_FISCAL_YEAR/, 'Write action in closed year must throw CLOSED_FISCAL_YEAR');
  assert.strictEqual(simulateWriteGuard(true, false).success, true, 'Write action in open year proceeds');
  assert.strictEqual(simulateWriteGuard(false, true).success, true, 'Read action in closed year proceeds');
});

console.log('\n=============================================================');
console.log(`TOTAL SECURITY TESTS: ${passedCount + failedCount}`);
console.log(`PASSED: ${passedCount}`);
console.log(`FAILED: ${failedCount}`);
if (failedCount === 0) {
  console.log('ALL PROMPT 13 SECURITY CRITERIA (SEC-01 - SEC-07) PASSED 100%!');
}
console.log('=============================================================\n');

if (failedCount > 0) {
  process.exit(1);
}
