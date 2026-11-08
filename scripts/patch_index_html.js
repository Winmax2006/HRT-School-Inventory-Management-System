const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Remove let currentUserRole = 'officer' default
const oldRoleLine = "let currentUserRole = 'officer'; // 'officer' (เจ้าหน้าที่พัสดุและผู้บริหาร) | 'teacher' (กลุ่มครูและบุคลากร)";
const newRoleLine = `let currentUserRole = null; // Server-authoritative role populated via checkAuthenticationAndInitialize()
        window.currentUserRole = null;
        window.currentUser = null;`;

if (html.includes(oldRoleLine)) {
  html = html.replace(oldRoleLine, newRoleLine);
  console.log('[OK] Removed default currentUserRole = officer');
} else {
  console.warn('[WARN] Could not find exact oldRoleLine');
}

// 2. Remove fallback 'ADMIN' in Settings
const oldSettingsRolePill = "if (rolePill) rolePill.innerText = window.currentUserRole ? window.currentUserRole.toUpperCase() : 'ADMIN';";
const newSettingsRolePill = "if (rolePill) rolePill.innerText = window.currentUserRole ? window.currentUserRole.toUpperCase() : '-';";

if (html.includes(oldSettingsRolePill)) {
  html = html.replace(oldSettingsRolePill, newSettingsRolePill);
  console.log('[OK] Removed fallback ADMIN in Settings role pill');
} else {
  console.warn('[WARN] Could not find exact oldSettingsRolePill');
}

// 3. Update applyServerRbacMenus to sync window.currentUserRole and currentUserRole
const oldApplyRbac = `        function applyServerRbacMenus(user) {
            if (!user) return;
            const role = String(user.role || 'REQUESTER').toUpperCase();`;

const newApplyRbac = `        function applyServerRbacMenus(user) {
            if (!user) return;
            window.currentUser = user;
            window.currentUserRole = String(user.role || 'REQUESTER').toUpperCase();
            currentUserRole = ['ADMIN', 'OFFICER'].includes(window.currentUserRole) ? 'officer' : 'teacher';
            const role = window.currentUserRole;`;

if (html.includes(oldApplyRbac)) {
  html = html.replace(oldApplyRbac, newApplyRbac);
  console.log('[OK] Updated applyServerRbacMenus to set state properly');
} else {
  console.warn('[WARN] Could not find exact oldApplyRbac');
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('[OK] index.html successfully updated and saved');
