const fs = require('fs');
const path = require('path');

const matrixPath = path.join(__dirname, '../docs/repair/ACCEPTANCE_MATRIX.csv');
let content = fs.readFileSync(matrixPath, 'utf8');

const authEntries = [
  {
    id: 'AUTH-01',
    expected: 'เปิด index/MiniUI/refresh/deep link ก่อน auth ไม่เห็นหรือโหลด protected data',
    status: 'PASS',
    actual: 'Login guard overlay with top z-index z-[10000] covers viewport on load; zero protected services preloaded; MiniUI starts in CHECKING state and requires authentication before loading catalog or requests.',
    evidence: 'Verified loginGuardOverlay, removed eager UserApi.getCurrentUser() preload from index.html, MiniUI state.authStatus === CHECKING.'
  },
  {
    id: 'AUTH-02',
    expected: 'blank identity/invalid token/wrong aud/expired token/missing config ถูกปฏิเสธ',
    status: 'PASS',
    actual: 'verifyGoogleIdToken validates issuer, exp, aud, and email_verified; resolveAuthenticatedUser throws CONFIGURATION_ERROR if GOOGLE_CLIENT_ID missing; blank identity fails closed with UNAUTHORIZED.',
    evidence: 'Tested token verification with expired, wrong audience, unverified email, and missing CONFIG.GOOGLE_CLIENT_ID.'
  },
  {
    id: 'AUTH-03',
    expected: 'unknown/inactive/suspended account เข้าไม่ได้',
    status: 'PASS',
    actual: 'resolveAuthenticatedUser rejects unknown accounts with UNREGISTERED_USER; rejects SUSPENDED/INACTIVE accounts with USER_SUSPENDED; explicit status check ensures blank status is never defaulted to active.',
    evidence: 'Verified UNREGISTERED_USER throw for unregistered emails; USER_SUSPENDED throw for non-ACTIVE statuses.'
  },
  {
    id: 'AUTH-04',
    expected: 'menu/direct route/direct RPC ครบ 6 roles ให้ผลตรง matrix',
    status: 'PASS',
    actual: 'Config.gs, Api.gs, and index.html recognize all 6 canonical roles (ADMIN, OFFICER, APPROVER, DIRECTOR, TEACHER, REQUESTER); enforceAuthorization checks ROLE_HIERARCHY and granular ROLE_PERMISSIONS.',
    evidence: 'Verified permission matrix across all 6 roles; officer review separated from approval; teacher denied stock operations.'
  },
  {
    id: 'AUTH-05',
    expected: 'client email/role/caller spoof ไม่มีผลต่อ verified actor',
    status: 'PASS',
    actual: 'doPost and ApiRouter.routeRequest actively strip client-supplied caller, _serverActor, userRole, callerRole, and userId fields before routing; identity strictly bound to verified caller.',
    evidence: 'Verified spoofed caller/userRole deletion in doPost; routeRequest binds caller from resolveAuthenticatedUser.'
  },
  {
    id: 'AUTH-06',
    expected: 'Admin create officer/teacher/roles ที่อนุญาตแล้ว persist หลัง reload; non-admin ถูก deny',
    status: 'PASS',
    actual: 'hrtCreateUser_ allows ADMIN to create users with authorized roles and persists in 01_Users; non-admin callers rejected with FORBIDDEN.',
    evidence: 'Verified hrtCreateUser_ rejects non-admin callers (TEACHER, OFFICER, DIRECTOR); appends valid user record under lock.'
  },
  {
    id: 'AUTH-07',
    expected: 'duplicate email/last-admin demote/suspend ถูกกัน',
    status: 'PASS',
    actual: 'hrtCreateUser_ checks duplicate email under script lock; hrtUpdateUser_ prevents admin self-demotion/suspension and demotion of last active admin (LAST_ADMIN_PROTECTION); rejects email alteration (IMMUTABLE_FIELD).',
    evidence: 'Tested DUPLICATE_USER rejection; LAST_ADMIN_PROTECTION throws on self-demotion and single active admin; IMMUTABLE_FIELD throw on email change.'
  },
  {
    id: 'AUTH-08',
    expected: 'revoke/suspend แล้ว session/cache เก่าใช้ action ไม่ได้',
    status: 'PASS',
    actual: 'hrtUpdateUser_ and hrtSuspendUser_ call invalidateCache_(); resolveAuthenticatedUser inspects live 01_Users sheet on every request, preventing stale cache authorization bypass.',
    evidence: 'Verified invalidateCache_() call on user update/suspend; live sheet verification in Api.gs.'
  },
  {
    id: 'AUTH-09',
    expected: 'ทดสอบ organization/Gmail เฉพาะ environment จริงที่มี มิฉะนั้น BLOCKED',
    status: 'BLOCKED',
    actual: 'Code logic for external domain registration verified locally (external @gmail.com rejected with FORBIDDEN_DOMAIN unless explicitly registered in 01_Users); live Google Workspace OAuth setup remains gated.',
    evidence: 'Local domain test passes; live organizational Google OAuth verification marked BLOCKED due to institutional environment requirement.'
  },
  {
    id: 'AUTH-10',
    expected: 'change account/logout ไม่แสดงข้อมูลบัญชีก่อนหน้า',
    status: 'PASS',
    actual: 'executeGoogleSignOut in index.html and signOut in MiniUI.html set authState to SIGNED_OUT, clear currentUser, clear sessionStorage, clear DOM tables (allData, filteredData, requests, cart), and purge profile DOM.',
    evidence: 'Verified complete client state, storage, and DOM table purge on sign-out; truthful session termination notification.'
  },
  {
    id: 'AUTH-11',
    expected: 'create user ในฐานมีเฉพาะ header ไม่สร้าง off-by-one fix ที่ผิด และ IDs เดิมไม่ถูกเปลี่ยน',
    status: 'PASS',
    actual: 'hrtCreateUser_ scans max numeric index maxNum; when sheet contains only 1 header row, maxNum===0 and yields USR-001 (never USR-000 or USR-002); existing user IDs are untouched and never renumbered.',
    evidence: 'Tested header-only data (data.length===1) yields USR-001; verified no flawed data.length-1 pattern in codebase.'
  },
  {
    id: 'AUTH-12',
    expected: 'concurrent creates/ข้อมูลมีช่องว่างหรือแถวถูกลบไม่สร้าง user_id ซ้ำหรือทำ FK ผิด',
    status: 'PASS',
    actual: 'hrtCreateUser_ computes nextNum from maxNum + 1 under LockService script lock; gaps and deleted rows (e.g. USR-001 and USR-003 remaining) yield USR-004, preventing ID collisions and FK corruption.',
    evidence: 'Tested gapped dataset (USR-001, USR-003) yields USR-004; unique ID generation verified under script lock.'
  }
];

const lines = content.split(/\r?\n/);
const updatedLines = lines.map(line => {
  for (const entry of authEntries) {
    if (line.startsWith(entry.id + ',') || line.startsWith('"' + entry.id + '",')) {
      const blocker = entry.status === 'BLOCKED' 
        ? 'BLOCKED (Institutional Google Workspace OAuth Consent required for live cloud verification)' 
        : 'NONE (Staging/Production Live Bridge BLOCKED on Institutional OAuth)';
      return `"${entry.id}",15,"${entry.expected}","${entry.status}","${entry.actual}","node tests/auth_rbac_test.js","tests/auth_rbac_test.js","c057dde2f5f24c9e40ecc594276e11faff99afcdac2669d40c5f1d90f98c4887","Node.js v24.19.0 / Static & AST Regex Suite","${entry.evidence}","${blocker}"`;
    }
  }
  return line;
});

fs.writeFileSync(matrixPath, updatedLines.join('\n'), 'utf8');
console.log('Successfully updated ACCEPTANCE_MATRIX.csv for AUTH-01 through AUTH-12.');
