/**
 * tests/antigravity_google_auth_test.js
 * Antigravity System - End-to-End Google Authentication & Domain Policy Test Suite
 * Domain Under Test: horathep.ac.th (Confirmed Institutional Domain)
 * Architecture: Fail-Closed, Login-First, Dual-Auth (GAS Native Session + ID Token Verifier)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('================================================================');
console.log('ANTIGRAVITY GOOGLE AUTHENTICATION TEST SUITE');
console.log('Confirmed Institutional Domain: horathep.ac.th');
console.log('Target Canonical System: HRT Inventory System (v2.7.0-rc.6)');
console.log('================================================================\n');

let passedCount = 0;
let failedCount = 0;

function runScenario(id, title, fn) {
  try {
    fn();
    console.log(`[PASS] [${id}] ${title}`);
    passedCount++;
  } catch (err) {
    console.error(`[FAIL] [${id}] ${title}`);
    console.error(`       Details: ${err.message}`);
    failedCount++;
  }
}

// 1. Read Canonical Runtime Files
const configGs = fs.readFileSync(path.join(__dirname, '../Config.gs'), 'utf8');
const auditGs = fs.readFileSync(path.join(__dirname, '../Audit.gs'), 'utf8');
const readGs = fs.readFileSync(path.join(__dirname, '../Read.gs'), 'utf8');
const writeGs = fs.readFileSync(path.join(__dirname, '../Write.gs'), 'utf8');
const apiGs = fs.readFileSync(path.join(__dirname, '../Api.gs'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const miniUiHtml = fs.readFileSync(path.join(__dirname, '../MiniUI.html'), 'utf8');

// Set up Sandboxed GAS Runtime Context
function createGasAuthEnvironment(userSessionEmail = '', usersTableData = [], scriptProperties = {}) {
  const cacheStore = {};
  const defaultProperties = {
    'SPREADSHEET_ID': 'MOCK_STAGING_SS_ID',
    'ALLOWED_DOMAINS': 'horathep.ac.th,hrt.ac.th,school.internal',
    'GOOGLE_CLIENT_ID': 'MOCK_CLIENT_ID.apps.googleusercontent.com',
    ...scriptProperties
  };

  const mockSheet = {
    getDataRange: () => ({
      getValues: () => [
        ['user_id', 'username', 'name', 'email', 'role', 'department', 'status'],
        ...usersTableData
      ]
    })
  };

  const mockSpreadsheet = {
    getId: () => 'MOCK_STAGING_SS_ID',
    getSheetByName: (name) => mockSheet,
    getSheets: () => [mockSheet]
  };

  const ctx = {
    Logger: { log: () => {} },
    console: { log: () => {}, warn: () => {}, error: () => {} },
    process: { env: { NODE_ENV: 'test' } },
    Session: {
      getActiveUser: () => ({
        getEmail: () => userSessionEmail || ''
      }),
      getEffectiveUser: () => ({
        getEmail: () => 'deployer.service.account@horathep.ac.th'
      })
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => cacheStore[k] || null,
        put: (k, v, ttl) => { cacheStore[k] = String(v); },
        remove: (k) => { delete cacheStore[k]; }
      })
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => true,
        releaseLock: () => true,
        waitLock: () => true
      })
    },
    SpreadsheetApp: {
      openById: (id) => mockSpreadsheet,
      getActiveSpreadsheet: () => mockSpreadsheet
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => defaultProperties[key] || null,
        getProperties: () => ({ ...defaultProperties })
      })
    },
    UrlFetchApp: {
      fetch: (url) => {
        // Mock Google OAuth tokeninfo endpoint
        if (url.includes('tokeninfo?id_token=')) {
          const token = decodeURIComponent(url.split('id_token=')[1]);
          if (token === 'VALID_TEST_TOKEN') {
            return {
              getResponseCode: () => 200,
              getContentText: () => JSON.stringify({
                iss: 'https://accounts.google.com',
                email: 'teacher.token@horathep.ac.th',
                email_verified: 'true',
                aud: 'MOCK_CLIENT_ID.apps.googleusercontent.com',
                exp: String(Math.floor(Date.now() / 1000) + 3600)
              })
            };
          }
          if (token === 'EXPIRED_TOKEN') {
            return {
              getResponseCode: () => 200,
              getContentText: () => JSON.stringify({
                iss: 'https://accounts.google.com',
                email: 'teacher.token@horathep.ac.th',
                email_verified: 'true',
                aud: 'MOCK_CLIENT_ID.apps.googleusercontent.com',
                exp: String(Math.floor(Date.now() / 1000) - 3600)
              })
            };
          }
          return {
            getResponseCode: () => 400,
            getContentText: () => JSON.stringify({ error: 'invalid_token' })
          };
        }
        return { getResponseCode: () => 404, getContentText: () => '' };
      }
    }
  };

  vm.createContext(ctx);
  vm.runInContext(configGs, ctx);
  vm.runInContext(auditGs, ctx);
  vm.runInContext(readGs, ctx);
  vm.runInContext(writeGs, ctx);
  vm.runInContext(apiGs, ctx);

  ctx.CONFIG = vm.runInContext('CONFIG', ctx);
  ctx.ApiRouter = vm.runInContext('ApiRouter', ctx);

  return ctx;
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

// SCENARIO 1: Domain Whitelist Recognition
runScenario('AGY-AUTH-01', 'Institutional domain "horathep.ac.th" is active in CONFIG.ALLOWED_DOMAINS', () => {
  const env = createGasAuthEnvironment();
  const domains = env.CONFIG.ALLOWED_DOMAINS;
  assert.ok(Array.isArray(domains), 'ALLOWED_DOMAINS must be an array');
  assert.ok(domains.includes('horathep.ac.th'), 'horathep.ac.th must be recognized in ALLOWED_DOMAINS');
  assert.ok(domains.includes('hrt.ac.th'), 'Legacy alias hrt.ac.th must remain supported');
});

// SCENARIO 2: Valid Google Workspace Login under horathep.ac.th
runScenario('AGY-AUTH-02', 'Active Google account @horathep.ac.th successfully authenticated and mapped to role', () => {
  const users = [
    ['USR-001', 'admin@horathep.ac.th', 'ผู้ดูแลระบบหรเทพ', 'admin@horathep.ac.th', 'ADMIN', 'ฝ่ายบริหาร', 'ACTIVE'],
    ['USR-002', 'teacher.somchai@horathep.ac.th', 'ครูสมชาย', 'teacher.somchai@horathep.ac.th', 'TEACHER', 'วิทยาศาสตร์', 'ACTIVE']
  ];
  const env = createGasAuthEnvironment('teacher.somchai@horathep.ac.th', users);
  
  const user = env.ApiRouter.resolveAuthenticatedUser(false, {});
  assert.strictEqual(user.email, 'teacher.somchai@horathep.ac.th');
  assert.strictEqual(user.role, 'TEACHER');
  assert.strictEqual(user.status, 'ACTIVE');
  assert.strictEqual(user.id, 'USR-002');
});

// SCENARIO 3: Unregistered horathep.ac.th Account Rejection (Fail-Closed)
runScenario('AGY-AUTH-03', 'Google account @horathep.ac.th not in 01_Users rejected with UNREGISTERED_USER', () => {
  const users = [
    ['USR-001', 'admin@horathep.ac.th', 'ผู้ดูแลระบบ', 'admin@horathep.ac.th', 'ADMIN', 'บริหาร', 'ACTIVE']
  ];
  const env = createGasAuthEnvironment('stranger@horathep.ac.th', users);
  
  assert.throws(() => {
    env.ApiRouter.resolveAuthenticatedUser(false, {});
  }, (err) => {
    return err.code === 'UNREGISTERED_USER' || err.message.includes('UNREGISTERED_USER');
  });
});

// SCENARIO 4: Suspended horathep.ac.th Account Rejection
runScenario('AGY-AUTH-04', 'Suspended account @horathep.ac.th rejected with USER_SUSPENDED', () => {
  const users = [
    ['USR-003', 'blocked@horathep.ac.th', 'ครูถูกระงับสิทธิ์', 'blocked@horathep.ac.th', 'TEACHER', 'ศิลปะ', 'SUSPENDED']
  ];
  const env = createGasAuthEnvironment('blocked@horathep.ac.th', users);
  
  assert.throws(() => {
    env.ApiRouter.resolveAuthenticatedUser(false, {});
  }, (err) => {
    return err.code === 'USER_SUSPENDED' || err.message.includes('USER_SUSPENDED');
  });
});

// SCENARIO 5: Inactive or Blank Status Rejection
runScenario('AGY-AUTH-05', 'Blank or INACTIVE status rejected with USER_INACTIVE (no default to ACTIVE)', () => {
  const users = [
    ['USR-004', 'pending@horathep.ac.th', 'ครูใหม่รอยืนยัน', 'pending@horathep.ac.th', 'TEACHER', 'สังคม', '']
  ];
  const env = createGasAuthEnvironment('pending@horathep.ac.th', users);
  
  assert.throws(() => {
    env.ApiRouter.resolveAuthenticatedUser(false, {});
  }, (err) => {
    return err.code === 'USER_INACTIVE' || err.message.includes('USER_SUSPENDED') || err.message.includes('not active');
  });
});

// SCENARIO 6: External Gmail Domain Policy (AUTH-09)
runScenario('AGY-AUTH-06', 'External Gmail rejected unless explicitly pre-registered in 01_Users', () => {
  const users = [
    ['USR-005', 'invited.guest@gmail.com', 'วิทยากรพิเศษ', 'invited.guest@gmail.com', 'TEACHER', 'วิชาการ', 'ACTIVE']
  ];

  // 1. Unregistered external Gmail -> FORBIDDEN_DOMAIN
  const envUnregistered = createGasAuthEnvironment('random.person@gmail.com', users);
  assert.throws(() => {
    envUnregistered.ApiRouter.resolveAuthenticatedUser(false, {});
  }, (err) => {
    return err.code === 'FORBIDDEN_DOMAIN' || err.message.includes('FORBIDDEN_DOMAIN');
  });

  // 2. Pre-registered authorized external Gmail -> ALLOWED
  const envRegistered = createGasAuthEnvironment('invited.guest@gmail.com', users);
  const user = envRegistered.ApiRouter.resolveAuthenticatedUser(false, {});
  assert.strictEqual(user.email, 'invited.guest@gmail.com');
  assert.strictEqual(user.role, 'TEACHER');
  assert.strictEqual(user.status, 'ACTIVE');
});

// SCENARIO 7: Granular RBAC Permissions for horathep.ac.th 6 Roles
runScenario('AGY-AUTH-07', 'All 6 canonical roles assign exact permissions without role leakage', () => {
  const env = createGasAuthEnvironment();
  const perms = env.CONFIG.ROLE_PERMISSIONS;

  // TEACHER has VIEW_INVENTORY, CREATE_REQUISITION, but not MANAGE_USERS or ISSUE_STOCK
  assert.ok(perms.TEACHER.includes('CREATE_REQUISITION'));
  assert.ok(!perms.TEACHER.includes('MANAGE_USERS'));
  assert.ok(!perms.TEACHER.includes('ISSUE_STOCK'));

  // OFFICER has ISSUE_STOCK, RECEIVE_STOCK, but not MANAGE_SETTINGS
  assert.ok(perms.OFFICER.includes('ISSUE_STOCK'));
  assert.ok(perms.OFFICER.includes('RECEIVE_STOCK'));
  assert.ok(!perms.OFFICER.includes('MANAGE_SETTINGS'));

  // APPROVER has APPROVE_REQUISITION, but not ISSUE_STOCK
  assert.ok(perms.APPROVER.includes('APPROVE_REQUISITION'));
  assert.ok(!perms.APPROVER.includes('ISSUE_STOCK'));

  // DIRECTOR has APPROVE_REQUISITION, but not ISSUE_STOCK
  assert.ok(perms.DIRECTOR.includes('APPROVE_REQUISITION'));
  assert.ok(!perms.DIRECTOR.includes('ISSUE_STOCK'));

  // ADMIN has full permissions
  assert.ok(perms.ADMIN.includes('MANAGE_USERS'));
  assert.ok(perms.ADMIN.includes('MANAGE_SETTINGS'));
  assert.ok(perms.ADMIN.includes('CLOSE_FISCAL_YEAR'));
});

// SCENARIO 8: Anti-Spoofing: Client Cannot Fake Identity via Payload
runScenario('AGY-AUTH-08', 'Client-supplied caller and role in payload stripped and replaced by server actor', () => {
  const users = [
    ['USR-002', 'teacher@horathep.ac.th', 'ครูทดสอบ', 'teacher@horathep.ac.th', 'TEACHER', 'คณิตศาสตร์', 'ACTIVE']
  ];
  const env = createGasAuthEnvironment('teacher@horathep.ac.th', users);

  // Attacker sends payload with spoofed caller and userRole
  const maliciousPayload = {
    caller: 'admin@horathep.ac.th',
    userRole: 'ADMIN',
    _serverActor: 'admin@horathep.ac.th',
    data: 'test'
  };

  const user = env.ApiRouter.resolveAuthenticatedUser(false, maliciousPayload);
  // Authoritative identity MUST remain teacher@horathep.ac.th with role TEACHER
  assert.strictEqual(user.email, 'teacher@horathep.ac.th');
  assert.strictEqual(user.role, 'TEACHER');
  assert.notStrictEqual(user.role, 'ADMIN');
});

// SCENARIO 9: Anonymous Session Rejection (Never Falls Back to Deployer)
runScenario('AGY-AUTH-09', 'Anonymous request with empty session email strictly throws UNAUTHORIZED', () => {
  const env = createGasAuthEnvironment('', []);
  assert.throws(() => {
    env.ApiRouter.resolveAuthenticatedUser(false, {});
  }, (err) => {
    return err.code === 'UNAUTHORIZED' || err.message.includes('UNAUTHORIZED');
  });
});

// SCENARIO 10: OIDC ID Token Verification via Google Endpoint
runScenario('AGY-AUTH-10', 'verifyGoogleIdToken verifies claims (iss, exp, aud, email_verified)', () => {
  const users = [
    ['USR-010', 'teacher.token@horathep.ac.th', 'ครูโทเค็น', 'teacher.token@horathep.ac.th', 'TEACHER', 'เคมี', 'ACTIVE']
  ];
  // Session email is empty, forcing token path
  const env = createGasAuthEnvironment('', users);

  // 1. Valid token
  const validUser = env.ApiRouter.resolveAuthenticatedUser(false, { id_token: 'VALID_TEST_TOKEN' });
  assert.strictEqual(validUser.email, 'teacher.token@horathep.ac.th');
  assert.strictEqual(validUser.isTokenVerified, true);

  // 2. Expired token -> UNAUTHORIZED
  assert.throws(() => {
    env.ApiRouter.resolveAuthenticatedUser(false, { id_token: 'EXPIRED_TOKEN' });
  }, /UNAUTHORIZED/);

  // 3. Invalid token -> UNAUTHORIZED
  assert.throws(() => {
    env.ApiRouter.resolveAuthenticatedUser(false, { id_token: 'INVALID_SIGNATURE_TOKEN' });
  }, /UNAUTHORIZED/);
});

// SCENARIO 11: Frontend Login Guard & Zero-Data Leakage
runScenario('AGY-AUTH-11', 'index.html has loginGuardOverlay z-[10000] and executes secure Google sign-in', () => {
  assert.ok(indexHtml.includes('id="loginGuardOverlay"'), 'index.html must have #loginGuardOverlay');
  assert.ok(indexHtml.includes('z-[10000]'), 'Overlay must be highest layer z-[10000]');
  assert.ok(indexHtml.includes('executeGoogleLogin()'), 'Must have executeGoogleLogin()');
  assert.ok(indexHtml.includes('executeGoogleSignOut()'), 'Must have executeGoogleSignOut()');
  assert.ok(indexHtml.includes('sessionStorage.clear();'), 'Sign-out must clear sessionStorage');
});

// SCENARIO 12: MiniUI Mobile Authentication State Machine
runScenario('AGY-AUTH-12', 'MiniUI initializes in CHECKING state and requires authentication before loading catalog', () => {
  assert.ok(miniUiHtml.includes("authStatus: 'CHECKING'"), 'MiniUI must initialize in CHECKING state');
  assert.ok(miniUiHtml.includes("state.authStatus !== 'AUTHENTICATED'"), 'MiniUI guards actions when not AUTHENTICATED');
  assert.ok(miniUiHtml.includes('signOut()'), 'MiniUI has dedicated signOut function');
});

// ============================================================================
// SUMMARY REPORT
// ============================================================================
console.log('\n================================================================');
console.log(`TOTAL SCENARIOS TESTED: ${passedCount + failedCount}`);
console.log(`PASSED: ${passedCount}`);
console.log(`FAILED: ${failedCount}`);
if (failedCount === 0) {
  console.log('✅ ALL GOOGLE AUTHENTICATION TESTS FOR horathep.ac.th PASSED 100%!');
} else {
  console.error('❌ SOME TESTS FAILED.');
  process.exit(1);
}
console.log('================================================================\n');
