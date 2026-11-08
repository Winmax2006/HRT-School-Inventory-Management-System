/**
 * clean_live_runtime.js - Automates Clean Separation of Runtime from Mock Data
 * Prompt 09: HRT Inventory System
 */

const fs = require('fs');
const path = require('path');

// 1. Clean index.html
let indexContent = fs.readFileSync('index.html', 'utf8');

// A. Replace rawMasterItems & mockHistories & allData with clean empty initialization
const rawMasterRegex = /\/\/ ==========================================\s*\n\s*\/\/ 1\. DATA MODEL: 100 REALISTIC THAI SCHOOL ITEMS[\s\S]*?let allData = rawMasterItems\.map[\s\S]*?\}\);\n/m;

const cleanDataModel = `// ==========================================
        // 1. DATA MODEL: LIVE PRODUCTION DATA LAYER
        // (Clean Runtime Architecture: No Embedded Mock Data)
        // Master inventory & transaction records are loaded dynamically via Google Apps Script backend
        // ==========================================
        const rawMasterItems = [];
        const mockHistories = [];
        let allData = [];
        window.rawMasterItems = rawMasterItems;
        window.mockHistories = mockHistories;
        window.allData = allData;
        window.filteredData = [];
`;

if (rawMasterRegex.test(indexContent)) {
  indexContent = indexContent.replace(rawMasterRegex, cleanDataModel);
  console.log('[SUCCESS] Replaced embedded rawMasterItems and mockHistories with clean empty initialization in index.html');
} else {
  console.error('[WARN] rawMasterRegex did not match in index.html');
}

// B. Clean seedInitialAuditTrail
const auditSeedRegex = /\/\/ Seed initial audit trail entries\s*\n\s*\(function initAuditTrailStore\(\) \{[\s\S]*?\}\)\(\);\n/m;
const cleanAuditStore = `// Live Audit Trail: Initialized empty; populated dynamically via apiGetAuditLogs RPC
        window.auditTrailEntries = [];
`;
if (auditSeedRegex.test(indexContent)) {
  indexContent = indexContent.replace(auditSeedRegex, cleanAuditStore);
  console.log('[SUCCESS] Removed synthetic audit trail seed from index.html');
} else {
  console.error('[WARN] auditSeedRegex did not match in index.html');
}

// C. Clean ApiServiceCore: remove silent mockCall fallback
const mockCallBlockRegex = /\/\/ In-memory Mock Fallback\s*\n\s*setTimeout\(\(\) => \{[\s\S]*?\}\);\s*\n\s*\}\s*\n\s*\}\s*\n\s*mockCall\(fnName, args, reqId\) \{[\s\S]*?default:\s*\n\s*throw new Error\(\`Endpoint \[\$\{fnName\}\] not found\`\);\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}/m;

const cleanApiServiceCall = `// Live Clean Mode: NO silent mock fallback!
                        // When opened standalone outside Google Apps Script, reject with explicit status
                        const err = new Error('BACKEND_UNAVAILABLE: Google Apps Script bridge is not detected. Please open via authorized Web App URL or use demo.html for standalone preview.');
                        err.code = 'BACKEND_UNAVAILABLE';
                        reject(err);
                    }
                });
            }
        }`;

if (mockCallBlockRegex.test(indexContent)) {
  indexContent = indexContent.replace(mockCallBlockRegex, cleanApiServiceCall);
  console.log('[SUCCESS] Removed silent mockCall fallback from ApiServiceCore in index.html');
} else {
  console.error('[WARN] mockCallBlockRegex did not match in index.html');
}

// D. Clean UserApi: remove hardcoded USR-ANANT-01 fallback
const userApiFallbackRegex = /const fallback = \{\s*\n\s*id: 'USR-ANANT-01'[\s\S]*?window\.currentUser = fallback;\s*\n\s*return fallback;/m;
const cleanUserApiFallback = `// Fail-Closed: No hardcoded mock user in live production runtime!
                this.cachedUser = null;
                window.currentUser = null;
                return null;`;

if (userApiFallbackRegex.test(indexContent)) {
  indexContent = indexContent.replace(userApiFallbackRegex, cleanUserApiFallback);
  console.log('[SUCCESS] Removed hardcoded USR-ANANT-01 fallback in UserApi in index.html');
} else {
  console.error('[WARN] userApiFallbackRegex did not match in index.html');
}

// E. Clean mockRequisitionPresets in Section 9
const presetsRegex = /let mockRequisitionPresets = \[[\s\S]*?\n\s*\];/m;
const cleanPresets = `// Live Requisition Documents: Initialized empty; loaded dynamically from server
        let mockRequisitionPresets = [];
        window.mockRequisitionPresets = mockRequisitionPresets;`;

if (presetsRegex.test(indexContent)) {
  indexContent = indexContent.replace(presetsRegex, cleanPresets);
  console.log('[SUCCESS] Replaced embedded mockRequisitionPresets with empty array in index.html');
} else {
  console.error('[WARN] presetsRegex did not match in index.html');
}

// F. Clean populateRequisitionPresets empty check
const populatePresetsRegex = /function populateRequisitionPresets\(\) \{\s*\n\s*const select = document\.getElementById\('selectRequisitionPreset'\);\s*\n\s*if \(!select\) return;\s*\n\s*select\.innerHTML = '';\s*\n\s*mockRequisitionPresets\.forEach/m;
const cleanPopulatePresets = `function populateRequisitionPresets() {
            const select = document.getElementById('selectRequisitionPreset');
            if (!select) return;
            select.innerHTML = '';
            if (!Array.isArray(mockRequisitionPresets) || mockRequisitionPresets.length === 0) {
                const opt = document.createElement('option');
                opt.value = '';
                opt.innerText = '-- ไม่พบเอกสารคำขอเบิกในระบบ --';
                select.appendChild(opt);
                return;
            }
            mockRequisitionPresets.forEach`;

if (populatePresetsRegex.test(indexContent)) {
  indexContent = indexContent.replace(populatePresetsRegex, cleanPopulatePresets);
  console.log('[SUCCESS] Added empty check to populateRequisitionPresets in index.html');
} else {
  console.error('[WARN] populatePresetsRegex did not match in index.html');
}

// G. Clean simulateQrScan default prompt value
indexContent = indexContent.replace(
  "prompt('จำลองการสแกน QR Code (พิมพ์รหัสพัสดุ เช่น OFF-001 หรือ QR:ITEM:OFF-001):', 'OFF-001')",
  "prompt('ป้อนรหัสพัสดุจาก QR Code (เช่น ITEM:OFF-001 หรือ OFF-001):', '')"
);

// H. Bump version in index.html to v2.7.0-rc.4
indexContent = indexContent.replace(/v2\.7\.0-rc\.3/g, 'v2.7.0-rc.4');

fs.writeFileSync('index.html', indexContent, 'utf8');
console.log('[COMPLETED] index.html updated successfully');

// 2. Clean frontend/main/App.js
let appJsContent = fs.readFileSync('frontend/main/App.js', 'utf8');
const appRawMasterRegex = /const rawMasterItems = \[[\s\S]*?let allData = rawMasterItems\.map[\s\S]*?\}\);\n/m;
const cleanAppModel = `const rawMasterItems = [];
const mockHistories = [];
let allData = [];
window.rawMasterItems = rawMasterItems;
window.mockHistories = mockHistories;
window.allData = allData;
window.filteredData = [];
`;

if (appRawMasterRegex.test(appJsContent)) {
  appJsContent = appJsContent.replace(appRawMasterRegex, cleanAppModel);
  console.log('[SUCCESS] Replaced embedded rawMasterItems and mockHistories in frontend/main/App.js');
}

appJsContent = appJsContent.replace(/v2\.7\.0-rc\.3/g, 'v2.7.0-rc.4');
fs.writeFileSync('frontend/main/App.js', appJsContent, 'utf8');
console.log('[COMPLETED] frontend/main/App.js updated successfully');

// 3. Clean Config.gs version to 2.7.0-rc.4
let configContent = fs.readFileSync('Config.gs', 'utf8');
configContent = configContent.replace("VERSION: '2.7.0-rc.3'", "VERSION: '2.7.0-rc.4'");
fs.writeFileSync('Config.gs', configContent, 'utf8');
console.log('[COMPLETED] Config.gs version bumped to 2.7.0-rc.4');
