const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const target = `        function executeGoogleLogin() {
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                window.location.reload();
            } else {
                showToast('เข้าสู่ระบบด้วย Google Workspace (@hrt.ac.th)', 'info');
                checkAuthenticationAndInitialize();
            }
        }`;

const replacement = `        function executeGoogleLogin() {
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
        }`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  // Also add profileMenuName & profileMenuEmail update in applyServerRbacMenus
  const rbacTarget = `            if (roleSubLabel) roleSubLabel.innerHTML = \`<span class="text-slate-500 font-mono text-[10px]">\${user.email}</span>\`;`;
  const rbacRepl = `            if (roleSubLabel) roleSubLabel.innerHTML = \`<span class="text-slate-500 font-mono text-[10px]">\${user.email}</span>\`;
            const profileMenuName = document.getElementById('profileMenuName');
            const profileMenuEmail = document.getElementById('profileMenuEmail');
            if (profileMenuName) profileMenuName.innerText = user.name || user.email || 'ผู้ใช้งาน';
            if (profileMenuEmail) profileMenuEmail.innerText = user.email || '';`;
  content = content.replace(rbacTarget, rbacRepl);
  fs.writeFileSync('index.html', content, 'utf8');
  console.log('executeGoogleSignOut and profile menu bindings added successfully!');
} else {
  console.log('executeGoogleLogin target not found!');
}
