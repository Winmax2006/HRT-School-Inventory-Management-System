const fs = require('fs');

// ==========================================
// 1. Patch index.html
// ==========================================
let indexHtml = fs.readFileSync('index.html', 'utf8');

// 1.1 Remove eager preload call at line 6239
const oldEagerCall = 'window.UserApi.getCurrentUser().catch(e => console.log("User session init", e));';
const newEagerComment = '// Protected services are never preloaded before verified auth (Prompt 15 Task 7)\n        // User identity verification is strictly initiated in checkAuthenticationAndInitialize()';

if (indexHtml.includes(oldEagerCall)) {
  indexHtml = indexHtml.replace(oldEagerCall, newEagerComment);
  console.log('[OK] Removed eager UserApi.getCurrentUser() preload from index.html');
} else {
  console.warn('[WARN] Could not find exact oldEagerCall in index.html');
}

// 1.2 Update print userStr to use real user identity instead of synthetic persona
indexHtml = indexHtml.replace(
  /const userStr = currentUserRole === 'officer' \s*\?\s*'[^']*'\s*:\s*'[^']*';/g,
  "const userStr = (window.currentUser && window.currentUser.name) ? `${window.currentUser.name} (${(typeof CONFIG_ROLES_TH !== 'undefined' && CONFIG_ROLES_TH[window.currentUserRole]) || window.currentUserRole || 'บุคลากร'})` : 'บุคลากรสถานศึกษา';"
);
console.log('[OK] Updated print user strings to use authenticated user identity');

// 1.3 Sanitize internal return routes (Task 16)
const routeSanitizerCode = `
        // Route Security Guard: Whitelist internal routes to prevent open redirect (Prompt 15 Task 16)
        function sanitizeInternalRoute(route) {
            if (!route || typeof route !== 'string') return '';
            const trimmed = route.trim();
            if (/^(https?:|\\/\\/|javascript:|data:)/i.test(trimmed)) return '';
            if (/^(\\?view=(mini|main)|#([a-zA-Z0-9_-]+))$/i.test(trimmed)) return trimmed;
            return '';
        }
`;

if (!indexHtml.includes('function sanitizeInternalRoute')) {
  indexHtml = indexHtml.replace('function simulateQrScan() {', routeSanitizerCode + '\n        function simulateQrScan() {');
  console.log('[OK] Added sanitizeInternalRoute in index.html');
}

// 1.4 Update checkAuthenticationAndInitialize, executeGoogleSignOut, applyServerRbacMenus
const oldAuthBlock = `        async function checkAuthenticationAndInitialize() {
            const overlay = document.getElementById('loginGuardOverlay');
            const stateChecking = document.getElementById('authCheckingState');
            const stateLogin = document.getElementById('authLoginPromptState');
            const stateDenied = document.getElementById('authAccessDeniedState');
            const deniedDetail = document.getElementById('accessDeniedDetail');

            if (stateChecking) stateChecking.classList.remove('hidden');
            if (stateLogin) stateLogin.classList.add('hidden');
            if (stateDenied) stateDenied.classList.add('hidden');

            try {
                const user = await window.UserApi.getCurrentUser(true);
                if (user && user.email) {
                    if (user.status === 'SUSPENDED' || user.isActive === false || user.isPendingApproval) {
                        if (stateChecking) stateChecking.classList.add('hidden');
                        if (stateDenied) stateDenied.classList.remove('hidden');
                        if (deniedDetail) {
                            deniedDetail.innerText = \`บัญชี Google (\${user.email}) ยังไม่ได้รับสิทธิ์ หรืออยู่ในสถานะระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ (Admin)\`;
                        }
                        return;
                    }

                    window.currentUser = user;
                    if (overlay) overlay.classList.add('hidden');

                    applyServerRbacMenus(user);

                    const safeRun = (fn, name) => {
                        try { fn(); } catch (e) { console.warn(\`Error initializing \${name}:\`, e); }
                    };
                    safeRun(populateDropdowns, 'populateDropdowns');
                    safeRun(renderKPIs, 'renderKPIs');
                    safeRun(renderTable, 'renderTable');
                    safeRun(renderFsnTable, 'renderFsnTable');
                    safeRun(initDocsModule, 'initDocsModule');
                    safeRun(initYearEndAudit, 'initYearEndAudit');
                    safeRun(initRequisitionModule, 'initRequisitionModule');
                    safeRun(() => switchMainView('dashboard'), 'switchMainView');
                } else {
                    if (stateChecking) stateChecking.classList.add('hidden');
                    if (stateLogin) stateLogin.classList.remove('hidden');
                }
            } catch (err) {
                console.warn('Auth check error:', err);
                if (stateChecking) stateChecking.classList.add('hidden');
                if (stateLogin) stateLogin.classList.remove('hidden');
            }
        }

        function executeGoogleLogin() {
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                window.location.reload();
            } else {
                showToast('เข้าสู่ระบบด้วย Google Workspace (@hrt.ac.th)', 'info');
                checkAuthenticationAndInitialize();
            }
        }

        function executeGoogleSignOut() {
            window.currentUser = null;
            if (window.UserApi) window.UserApi.cachedUser = null;
            const overlay = document.getElementById('loginGuardOverlay');
            const stateChecking = document.getElementById('authCheckingState');
            const stateLogin = document.getElementById('authLoginPromptState');
            const stateDenied = document.getElementById('authAccessDeniedState');
            if (overlay) overlay.classList.remove('hidden');
            if (stateChecking) stateChecking.classList.add('hidden');
            if (stateDenied) stateDenied.classList.add('hidden');
            if (stateLogin) stateLogin.classList.remove('hidden');
            const menu = document.getElementById('roleDropdownMenu');
            if (menu) menu.classList.add('hidden');
            showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
        }

        function applyServerRbacMenus(user) {
            if (!user) return;
            window.currentUser = user;
            window.currentUserRole = String(user.role || 'REQUESTER').toUpperCase();
            currentUserRole = ['ADMIN', 'OFFICER'].includes(window.currentUserRole) ? 'officer' : 'teacher';
            const role = window.currentUserRole;

            // 1. Update Topbar Profile
            const roleText = document.getElementById('userRoleText');
            const roleBadge = document.getElementById('userRoleBadge');
            const roleAvatar = document.getElementById('userAvatarBadge');
            const roleSubLabel = document.getElementById('userRoleSubLabel');

            if (roleText) roleText.innerText = user.name || user.email || 'ผู้ใช้งาน';
            if (roleBadge) roleBadge.innerText = \`\${CONFIG_ROLES_TH[role] || role} (\${user.department || 'ทั่วไป'})\`;
            if (roleSubLabel) roleSubLabel.innerHTML = \`<span class="text-slate-500 font-mono text-[10px]">\${user.email}</span>\`;
            const profileMenuName = document.getElementById('profileMenuName');
            const profileMenuEmail = document.getElementById('profileMenuEmail');
            if (profileMenuName) profileMenuName.innerText = user.name || user.email || 'ผู้ใช้งาน';
            if (profileMenuEmail) profileMenuEmail.innerText = user.email || '';
            if (roleAvatar) {
                const initials = (user.name || user.email || 'US').substring(0, 2);
                roleAvatar.innerText = initials;
            }

            // 2. Role-Based Sidebar Navigation Filtering
            const isOfficer = ['OFFICER', 'ADMIN'].includes(role);
            const isAdmin = role === 'ADMIN';
            const isApprover = ['APPROVER', 'DIRECTOR', 'ADMIN'].includes(role);

            const menuActionNeeded = document.getElementById('menuItemActionNeeded');
            const menuFsn = document.getElementById('menuItemFsn');
            const menuDocs = document.getElementById('menuItemDocs');
            const menuAudit = document.getElementById('menuItemYearEndAudit');
            const menuSettings = document.getElementById('menuItemSettings');
            const btnRestock = document.getElementById('btnRestockAction');

            if (menuActionNeeded) menuActionNeeded.style.display = isOfficer ? '' : 'none';
            if (menuFsn) menuFsn.style.display = isOfficer ? '' : 'none';
            if (menuDocs) menuDocs.style.display = (isOfficer || isApprover) ? '' : 'none';
            if (menuAudit) menuAudit.style.display = isOfficer ? '' : 'none';
            if (menuSettings) menuSettings.style.display = isAdmin ? '' : 'none';
            if (btnRestock) btnRestock.style.display = isOfficer ? '' : 'none';
        }`;

const newAuthBlock = `        // Standardized Authentication State Machine (Prompt 15 Task 6)
        let authState = 'CHECKING'; // 'CHECKING' | 'SIGNED_OUT' | 'AUTHENTICATING' | 'AUTHENTICATED' | 'ACCESS_DENIED' | 'ERROR'

        async function checkAuthenticationAndInitialize() {
            authState = 'CHECKING';
            const overlay = document.getElementById('loginGuardOverlay');
            const stateChecking = document.getElementById('authCheckingState');
            const stateLogin = document.getElementById('authLoginPromptState');
            const stateDenied = document.getElementById('authAccessDeniedState');
            const deniedDetail = document.getElementById('accessDeniedDetail');

            if (overlay) overlay.classList.remove('hidden');
            if (stateChecking) stateChecking.classList.remove('hidden');
            if (stateLogin) stateLogin.classList.add('hidden');
            if (stateDenied) stateDenied.classList.add('hidden');

            try {
                const user = await window.UserApi.getCurrentUser(true);
                if (user && user.email) {
                    if (user.status === 'SUSPENDED' || user.status === 'INACTIVE' || user.isActive === false || user.isPendingApproval) {
                        authState = 'ACCESS_DENIED';
                        if (stateChecking) stateChecking.classList.add('hidden');
                        if (stateDenied) stateDenied.classList.remove('hidden');
                        if (deniedDetail) {
                            deniedDetail.innerText = \`บัญชี Google (\${user.email}) ยังไม่ได้รับสิทธิ์ หรืออยู่ในสถานะระงับการใช้งาน (\${user.status || 'INACTIVE'}) กรุณาติดต่อผู้ดูแลระบบ (Admin)\`;
                        }
                        return;
                    }

                    authState = 'AUTHENTICATED';
                    window.currentUser = user;
                    if (overlay) overlay.classList.add('hidden');

                    applyServerRbacMenus(user);

                    const safeRun = (fn, name) => {
                        try { fn(); } catch (e) { console.warn(\`Error initializing \${name}:\`, e); }
                    };
                    safeRun(populateDropdowns, 'populateDropdowns');
                    safeRun(renderKPIs, 'renderKPIs');
                    safeRun(renderTable, 'renderTable');
                    safeRun(renderFsnTable, 'renderFsnTable');
                    safeRun(initDocsModule, 'initDocsModule');
                    safeRun(initYearEndAudit, 'initYearEndAudit');
                    safeRun(initRequisitionModule, 'initRequisitionModule');
                    safeRun(() => switchMainView('dashboard'), 'switchMainView');
                } else {
                    authState = 'SIGNED_OUT';
                    if (stateChecking) stateChecking.classList.add('hidden');
                    if (stateLogin) stateLogin.classList.remove('hidden');
                }
            } catch (err) {
                console.warn('Auth check error:', err);
                const code = err.code || '';
                if (code === 'USER_SUSPENDED' || code === 'USER_INACTIVE' || code === 'FORBIDDEN_DOMAIN' || code === 'UNREGISTERED_USER') {
                    authState = 'ACCESS_DENIED';
                    if (stateChecking) stateChecking.classList.add('hidden');
                    if (stateDenied) stateDenied.classList.remove('hidden');
                    if (deniedDetail) {
                        deniedDetail.innerText = err.message || 'บัญชีของท่านยังไม่ได้รับอนุญาตให้เข้าใช้งานระบบ กรุณาติดต่อผู้ดูแลระบบ';
                    }
                } else {
                    authState = 'SIGNED_OUT';
                    if (stateChecking) stateChecking.classList.add('hidden');
                    if (stateLogin) stateLogin.classList.remove('hidden');
                }
            }
        }

        function executeGoogleLogin() {
            authState = 'AUTHENTICATING';
            // Truthful Login Flow: Check Google Session or redirect to institutional Google Auth
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                showToast('กำลังเชื่อมต่อการยืนยันตัวตน Google Workspace...', 'info');
                checkAuthenticationAndInitialize();
            } else {
                showToast('ตรวจสอบสิทธิ์เข้าใช้งานผ่าน Google Workspace (@hrt.ac.th)', 'info');
                checkAuthenticationAndInitialize();
            }
        }

        function executeGoogleSignOut() {
            // Prompt 15 Task 15 & AUTH-10: Complete session cleanup, clear user data to prevent leakage
            authState = 'SIGNED_OUT';
            window.currentUser = null;
            window.currentUserRole = null;
            currentUserRole = null;
            if (window.UserApi) window.UserApi.cachedUser = null;

            // Clear client-scoped caches and drafts
            try { sessionStorage.clear(); } catch (e) {}

            // Clear DOM data to prevent stale account data exposure
            allData = [];
            filteredData = [];
            fsnData = [];
            filteredFsnData = [];
            const tbody = document.getElementById('inventoryTableBody');
            if (tbody) tbody.innerHTML = '';
            const rbody = document.getElementById('requisitionsTableBody');
            if (rbody) rbody.innerHTML = '';

            const roleText = document.getElementById('userRoleText');
            if (roleText) roleText.innerText = '';
            const roleBadge = document.getElementById('userRoleBadge');
            if (roleBadge) roleBadge.innerText = '';
            const roleSubLabel = document.getElementById('userRoleSubLabel');
            if (roleSubLabel) roleSubLabel.innerHTML = '';
            const profileMenuName = document.getElementById('profileMenuName');
            if (profileMenuName) profileMenuName.innerText = '';
            const profileMenuEmail = document.getElementById('profileMenuEmail');
            if (profileMenuEmail) profileMenuEmail.innerText = '';

            const overlay = document.getElementById('loginGuardOverlay');
            const stateChecking = document.getElementById('authCheckingState');
            const stateLogin = document.getElementById('authLoginPromptState');
            const stateDenied = document.getElementById('authAccessDeniedState');
            if (overlay) overlay.classList.remove('hidden');
            if (stateChecking) stateChecking.classList.add('hidden');
            if (stateDenied) stateDenied.classList.add('hidden');
            if (stateLogin) stateLogin.classList.remove('hidden');

            const menu = document.getElementById('roleDropdownMenu');
            if (menu) menu.classList.add('hidden');

            // Truthful message: Ends application session, does not claim browser-wide Google sign-out
            showToast('ออกจากระบบ HRT Inventory เรียบร้อยแล้ว (สิ้นสุด Application Session)', 'info');
        }

        function applyServerRbacMenus(user) {
            if (!user) return;
            window.currentUser = user;
            // Retain actual canonical role code across all 6 roles (Prompt 15 Task 8)
            const role = String(user.role || 'REQUESTER').toUpperCase();
            window.currentUserRole = role;
            currentUserRole = role;

            // 1. Update Topbar Profile
            const roleText = document.getElementById('userRoleText');
            const roleBadge = document.getElementById('userRoleBadge');
            const roleAvatar = document.getElementById('userAvatarBadge');
            const roleSubLabel = document.getElementById('userRoleSubLabel');

            if (roleText) roleText.innerText = user.name || user.email || 'ผู้ใช้งาน';
            if (roleBadge) roleBadge.innerText = \`\${(typeof CONFIG_ROLES_TH !== 'undefined' && CONFIG_ROLES_TH[role]) || role} (\${user.department || 'ทั่วไป'})\`;
            if (roleSubLabel) roleSubLabel.innerHTML = \`<span class="text-slate-500 font-mono text-[10px]">\${user.email}</span>\`;
            const profileMenuName = document.getElementById('profileMenuName');
            const profileMenuEmail = document.getElementById('profileMenuEmail');
            if (profileMenuName) profileMenuName.innerText = user.name || user.email || 'ผู้ใช้งาน';
            if (profileMenuEmail) profileMenuEmail.innerText = user.email || '';
            if (roleAvatar) {
                const initials = (user.name || user.email || 'US').substring(0, 2);
                roleAvatar.innerText = initials;
            }

            // 2. Role-Based Sidebar Navigation Filtering across 6 Canonical Roles (Prompt 15 Task 8 & 9)
            const isAdmin = role === 'ADMIN';
            const isOfficer = role === 'OFFICER' || isAdmin;
            const isApprover = ['APPROVER', 'DIRECTOR', 'ADMIN'].includes(role);

            const menuActionNeeded = document.getElementById('menuItemActionNeeded');
            const menuFsn = document.getElementById('menuItemFsn');
            const menuDocs = document.getElementById('menuItemDocs');
            const menuAudit = document.getElementById('menuItemYearEndAudit');
            const menuSettings = document.getElementById('menuItemSettings');
            const btnRestock = document.getElementById('btnRestockAction');
            const btnNewItem = document.getElementById('btnNewItem');
            const btnImport = document.getElementById('btnImportMaster');

            if (menuActionNeeded) menuActionNeeded.style.display = (isOfficer || isApprover) ? '' : 'none';
            if (menuFsn) menuFsn.style.display = isOfficer ? '' : 'none';
            if (menuDocs) menuDocs.style.display = (isOfficer || isApprover) ? '' : 'none';
            if (menuAudit) menuAudit.style.display = isOfficer ? '' : 'none';
            if (menuSettings) menuSettings.style.display = isAdmin ? '' : 'none';
            if (btnRestock) btnRestock.style.display = isOfficer ? '' : 'none';
            if (btnNewItem) btnNewItem.style.display = isOfficer ? '' : 'none';
            if (btnImport) btnImport.style.display = isOfficer ? '' : 'none';
        }`;

if (indexHtml.includes(oldAuthBlock)) {
  indexHtml = indexHtml.replace(oldAuthBlock, newAuthBlock);
  console.log('[OK] Updated checkAuthenticationAndInitialize, executeGoogleSignOut, applyServerRbacMenus in index.html');
} else {
  console.warn('[WARN] Could not match oldAuthBlock in index.html');
}

fs.writeFileSync('index.html', indexHtml, 'utf8');
console.log('Saved index.html');


// ==========================================
// 2. Patch MiniUI.html
// ==========================================
let miniHtml = fs.readFileSync('MiniUI.html', 'utf8');

// Update MiniUI state comments and logout
const oldMiniState = `const state = {
    authStatus: 'CHECKING', // CHECKING, AUTHENTICATED, UNAUTHENTICATED, ACCESS_DENIED`;
const newMiniState = `const state = {
    authStatus: 'CHECKING', // CHECKING, SIGNED_OUT, AUTHENTICATING, AUTHENTICATED, ACCESS_DENIED, ERROR`;

if (miniHtml.includes(oldMiniState)) {
  miniHtml = miniHtml.replace(oldMiniState, newMiniState);
  console.log('[OK] Standardized authStatus in MiniUI.html');
}

// Update MiniUI check for unauthenticated to also recognize SIGNED_OUT
miniHtml = miniHtml.replace(
  "if (state.authStatus === 'UNAUTHENTICATED') {",
  "if (state.authStatus === 'UNAUTHENTICATED' || state.authStatus === 'SIGNED_OUT') {"
);

// Update MiniUI logout
const oldMiniLogout = `function logout() {
    state.user = null;
    state.authStatus = 'UNAUTHENTICATED';
    state.cart = [];
    render();
}`;

const newMiniLogout = `function logout() {
    state.user = null;
    state.authStatus = 'SIGNED_OUT';
    state.cart = [];
    state.requests = [];
    state.items = [];
    try { sessionStorage.clear(); } catch(e) {}
    render();
}`;

if (miniHtml.includes(oldMiniLogout)) {
  miniHtml = miniHtml.replace(oldMiniLogout, newMiniLogout);
  console.log('[OK] Updated logout in MiniUI.html');
}

fs.writeFileSync('MiniUI.html', miniHtml, 'utf8');
console.log('Saved MiniUI.html');
