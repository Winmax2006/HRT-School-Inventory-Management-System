const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const version = 'v2.7.0-rc.5';
const releaseDir = path.join('releases', version);

if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}

function getSha256(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

const fileMap = [
  { src: 'Code.gs', dest: `Code_${version}.gs` },
  { src: 'Api.gs', dest: `Api_${version}.gs` },
  { src: 'Read.gs', dest: `Read_${version}.gs` },
  { src: 'Write.gs', dest: `Write_${version}.gs` },
  { src: 'Audit.gs', dest: `Audit_${version}.gs` },
  { src: 'Config.gs', dest: `Config_${version}.gs` },
  { src: 'index.html', dest: `index_${version}.html` },
  { src: 'MiniUI.html', dest: `MiniUI_${version}.html` },
  { src: 'frontend/main/App.js', dest: `App_${version}.js` }
];

const manifest = {
  version: version,
  releaseDate: new Date().toISOString(),
  baseline: 'v2.6.0',
  predecessor: 'v2.7.0-rc.4',
  scope: 'HRT Inventory System - Auth, User Admin, MiniUI Integration & RPC Transport Hardening',
  files: []
};

fileMap.forEach(item => {
  if (fs.existsSync(item.src)) {
    const destPath = path.join(releaseDir, item.dest);
    fs.copyFileSync(item.src, destPath);
    const hash = getSha256(destPath);
    const stat = fs.statSync(destPath);
    manifest.files.push({
      file: item.dest,
      source: item.src,
      bytes: stat.size,
      sha256: hash
    });
    console.log(`Copied ${item.src} -> ${destPath} (${stat.size} bytes)`);
  }
});

const manifestPath = path.join(releaseDir, `VERSION_MANIFEST_${version}.json`);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

const changelogContent = `# Changelog - ${version}

**Release Date:** ${new Date().toISOString()}  
**Target:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) องค์การบริหารส่วนจังหวัดสระบุรี  
**Baseline:** v2.6.0 (Pre-clean file) | Previous Candidate: v2.7.0-rc.4  

---

### Key Enhancements & Bug Fixes in ${version}
1. **Admin User Management**:
   - Enforced normalized E-mail as \`username\` in \`01_Users\`.
   - Admin can add, edit, and suspend personnel across all canonical roles (\`ADMIN\`, \`DIRECTOR\`, \`OFFICER\`, \`APPROVER\`, \`TEACHER\`, \`REQUESTER\`).
   - Last-Admin Protection guard strictly enforced on updates and suspensions.
2. **Login-First Architecture**:
   - Institutional \`#loginGuardOverlay\` implemented in both \`index.html\` and \`MiniUI.html\`.
   - Prevents any data flashing, inventory leaking, or menu presentation prior to verified Google Authentication.
   - Distinct states: \`CHECKING\`, \`UNAUTHENTICATED\`, \`AUTHENTICATED\`, \`ACCESS_DENIED\`.
3. **Server-Authoritative RBAC Menus**:
   - Navigation and action buttons filtered strictly by server-evaluated role permissions from \`Config.gs\`.
   - Legacy client-side demo role switcher replaced with real authenticated user profile panel.
4. **HTML MiniUI Integration**:
   - Ported desktop prototype \`HRT_MiniUI_Preview.html\` to \`MiniUI.html\`.
   - Stripped all synthetic demo storage (\`hrt-miniui-demo-v1\`) and mock stores.
   - Connected directly to root Google Apps Script backend (\`doGet(e)?view=mini\`).
   - Supports Catalog, Cart, My Requests, Account, and QR Code scanner.
   - Decoupled stock deduction preserved: stock is deducted only upon physical issuance (\`apiIssueStock\`).
5. **RPC Transport Hardening**:
   - Eliminated runtime error \`google.script.run...[fnName] is not a function\`.
   - Registered universal \`HRT_rpc\` gateway alias.
   - Exported wrappers in \`Code.gs\` for missing calls (\`apiGetDashboardKPIs\`, \`apiSubmitRequisition\`, \`apiGetItemLedger\`, \`apiReconcileBalance\`, \`apiGetAuditTrail\`, \`apiUpdateSettingsSection\`).
   - Enhanced \`ApiServiceCore\` with synchronous try-catch containment and action fallback routing.
`;

fs.writeFileSync(path.join(releaseDir, `CHANGELOG_${version}.md`), changelogContent, 'utf8');
console.log(`Release package ${version} successfully authored in ${releaseDir}`);
