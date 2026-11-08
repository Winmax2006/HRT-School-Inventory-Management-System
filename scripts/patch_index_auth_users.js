const fs = require('fs');

let content = fs.readFileSync('index.html', 'utf8');
content = content.replace(/\r\n/g, '\n');

// 1. Replace window.onload with checkAuthenticationAndInitialize & applyServerRbacMenus
const oldOnload = `        window.onload = () => {
            setupEventListeners();
            const safeRun = (fn, name) => {
                try {
                    fn();
                } catch (e) {
                    console.warn(\`Error initializing \${name}:\`, e);
                }
            };
            safeRun(populateDropdowns, 'populateDropdowns');
            safeRun(renderKPIs, 'renderKPIs');
            safeRun(renderTable, 'renderTable');
            safeRun(renderFsnTable, 'renderFsnTable');
            safeRun(initDocsModule, 'initDocsModule');
            safeRun(initYearEndAudit, 'initYearEndAudit');
            safeRun(initRequisitionModule, 'initRequisitionModule');
            safeRun(() => switchMainView('dashboard'), 'switchMainView');
        };`;

const newOnload = `        const CONFIG_ROLES_TH = {
            'ADMIN': 'ผู้ดูแลระบบ (Admin)',
            'OFFICER': 'เจ้าหน้าที่พัสดุ',
            'APPROVER': 'ผู้พิจารณาอนุมัติ',
            'DIRECTOR': 'ผู้อำนวยการสถานศึกษา',
            'TEACHER': 'ครูผู้สอน / บุคลากร',
            'REQUESTER': 'ผู้ขอเบิกพัสดุ'
        };

        async function checkAuthenticationAndInitialize() {
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

        function applyServerRbacMenus(user) {
            if (!user) return;
            const role = String(user.role || 'REQUESTER').toUpperCase();

            // 1. Update Topbar Profile
            const roleText = document.getElementById('userRoleText');
            const roleBadge = document.getElementById('userRoleBadge');
            const roleAvatar = document.getElementById('userAvatarBadge');
            const roleSubLabel = document.getElementById('userRoleSubLabel');

            if (roleText) roleText.innerText = user.name || user.email || 'ผู้ใช้งาน';
            if (roleBadge) roleBadge.innerText = \`\${CONFIG_ROLES_TH[role] || role} (\${user.department || 'ทั่วไป'})\`;
            if (roleSubLabel) roleSubLabel.innerHTML = \`<span class="text-slate-500 font-mono text-[10px]">\${user.email}</span>\`;
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
        }

        window.onload = async () => {
            setupEventListeners();
            await checkAuthenticationAndInitialize();
        };`;

if (content.includes(oldOnload)) {
  content = content.replace(oldOnload, newOnload);
  console.log('1. window.onload and Login-First flow applied successfully.');
} else {
  console.log('1. oldOnload not found!');
}

// 2. Replace submitSaveUser and suspendUser with backend-connected implementations
const oldSubmitSaveUser = `    window.submitSaveUser = async function() {
        const id = document.getElementById('userForm_id')?.value;
        const name = document.getElementById('userForm_name')?.value?.trim();
        const email = document.getElementById('userForm_email')?.value?.trim()?.toLowerCase();
        const role = document.getElementById('userForm_role')?.value;
        const dept = document.getElementById('userForm_department')?.value?.trim();
        const status = document.getElementById('userForm_status')?.value;

        if (!name || !email || !role || !dept) {
            alert('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        const users = window.settingsState.data.users;

        // Last-Admin Guard
        if (id) {
            const existing = users.find(u => u.id === id);
            if (existing && existing.role === 'ADMIN' && (role !== 'ADMIN' || status !== 'ACTIVE')) {
                const activeAdmins = users.filter(u => u.role === 'ADMIN' && u.status === 'ACTIVE' && u.id !== id);
                if (activeAdmins.length === 0) {
                    alert('ไม่อนุญาตให้ลดสิทธิ์หรือระงับผู้ดูแลระบบคนสุดท้ายของระบบ (Last-Admin Protection)');
                    return;
                }
            }
            if (existing) {
                existing.name = name;
                existing.role = role;
                existing.department = dept;
                existing.status = status;
            }
        } else {
            if (users.some(u => u.email === email)) {
                alert('อีเมลนี้มีอยู่ในระบบแล้ว');
                return;
            }
            users.push({
                id: 'USR-' + (users.length + 1).toString().padStart(3, '0'),
                name: name,
                email: email,
                role: role,
                department: dept,
                status: status
            });
        }

        window.renderUsersTable();
        closeUserModal();
        if (typeof window.showToast === 'function') window.showToast('บันทึกข้อมูลผู้ใช้งานเรียบร้อยแล้ว', 'success');
    };`;

const newSubmitSaveUser = `    window.submitSaveUser = async function() {
        const id = document.getElementById('userForm_id')?.value;
        const name = document.getElementById('userForm_name')?.value?.trim();
        const email = document.getElementById('userForm_email')?.value?.trim()?.toLowerCase();
        const role = document.getElementById('userForm_role')?.value;
        const dept = document.getElementById('userForm_department')?.value?.trim();
        const status = document.getElementById('userForm_status')?.value || 'ACTIVE';

        if (!name || !email || !role || !dept) {
            alert('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        const btnSave = document.getElementById('btnSaveUserSubmit');
        if (btnSave) { btnSave.disabled = true; btnSave.innerText = 'กำลังบันทึก...'; }

        try {
            if (id) {
                await window.ApiService.call('apiUpdateUser', {
                    user_id: id,
                    name: name,
                    email: email,
                    role: role,
                    department: dept,
                    status: status
                });
            } else {
                await window.ApiService.call('apiCreateUser', {
                    name: name,
                    email: email,
                    role: role,
                    department: dept
                });
            }

            // Refresh user list from backend
            try {
                const res = await window.ApiService.call('apiGetUsers');
                const uList = res.users || (Array.isArray(res) ? res : null);
                if (uList) {
                    window.settingsState.data.users = uList.map(u => ({
                        id: u.user_id || u.id,
                        name: u.name,
                        email: u.email,
                        role: u.role,
                        department: u.department,
                        status: u.status
                    }));
                }
            } catch (errRefresh) {
                console.warn('Refresh users warning:', errRefresh);
            }

            window.renderUsersTable();
            closeUserModal();
            if (typeof window.showToast === 'function') window.showToast('บันทึกข้อมูลผู้ใช้งานในระบบเรียบร้อยแล้ว', 'success');
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการบันทึกผู้ใช้: ' + (err.message || err));
        } finally {
            if (btnSave) { btnSave.disabled = false; btnSave.innerText = 'บันทึกข้อมูล'; }
        }
    };`;

if (content.includes(oldSubmitSaveUser)) {
  content = content.replace(oldSubmitSaveUser, newSubmitSaveUser);
  console.log('2. submitSaveUser updated with backend connection.');
} else {
  console.log('2. oldSubmitSaveUser not found!');
}

// 3. Update suspendUser to call backend apiSuspendUser
const oldSuspendUser = `    window.suspendUser = function(email) {
        const users = window.settingsState.data.users;
        const u = users.find(x => x.email === email);
        if (!u) return;

        if (u.role === 'ADMIN' && u.status === 'ACTIVE') {
            const activeAdmins = users.filter(x => x.role === 'ADMIN' && x.status === 'ACTIVE' && x.email !== email);
            if (activeAdmins.length === 0) {
                alert('ไม่อนุญาตให้ระงับการใช้งานผู้ดูแลระบบคนสุดท้ายของระบบ (Last-Admin Protection)');
                return;
            }
        }

        u.status = (u.status === 'ACTIVE') ? 'SUSPENDED' : 'ACTIVE';
        window.renderUsersTable();
        if (typeof window.showToast === 'function') {
            window.showToast(\`\${u.status === 'ACTIVE' ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'} บัญชี \${email} แล้ว\`, 'info');
        }
    };`;

const newSuspendUser = `    window.suspendUser = async function(email) {
        const users = window.settingsState.data.users || [];
        const u = users.find(x => x.email === email);
        if (!u) return;

        if (u.role === 'ADMIN' && u.status === 'ACTIVE') {
            const activeAdmins = users.filter(x => x.role === 'ADMIN' && x.status === 'ACTIVE' && x.email !== email);
            if (activeAdmins.length === 0) {
                alert('ไม่อนุญาตให้ระงับการใช้งานผู้ดูแลระบบคนสุดท้ายของระบบ (Last-Admin Protection)');
                return;
            }
        }

        const newStatus = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        const actionLabel = newStatus === 'SUSPENDED' ? 'ระงับการใช้งาน' : 'เปิดใช้งาน';
        if (!confirm(\`ยืนยันการ\${actionLabel}ผู้ใช้ \${u.name} (\${u.email}) หรือไม่?\`)) return;

        try {
            await window.ApiService.call('apiUpdateUser', {
                user_id: u.id,
                email: u.email,
                status: newStatus
            });
            u.status = newStatus;
            window.renderUsersTable();
            if (typeof window.showToast === 'function') {
                window.showToast(\`\${actionLabel} บัญชี \${email} เรียบร้อยแล้ว\`, 'info');
            }
        } catch (err) {
            alert(\`ไม่สามารถ\${actionLabel}: \` + (err.message || err));
        }
    };`;

if (content.includes(oldSuspendUser)) {
  content = content.replace(oldSuspendUser, newSuspendUser);
  console.log('3. suspendUser updated with backend connection.');
} else {
  console.log('3. oldSuspendUser not found!');
}

fs.writeFileSync('index.html', content, 'utf8');
console.log('Index patch step 2 completed.');
