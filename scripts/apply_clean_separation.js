/**
 * apply_clean_separation.js - Executes Clean Separation across all frontend files
 * HRT Inventory System v2.7.0-rc.4 (Prompt 09)
 */

const fs = require('fs');

console.log('=== STARTING CLEAN SEPARATION PROCESS ===');

// 1. Process index.html
let indexContent = fs.readFileSync('index.html', 'utf8');

// 1.1 Replace rawMasterItems through end of allData map
const pRaw1 = indexContent.indexOf('const rawMasterItems = [');
const pRaw2 = indexContent.indexOf('// ============================================================================', pRaw1);
if (pRaw1 !== -1 && pRaw2 !== -1) {
  const replacement = `const rawMasterItems = [];
        const mockHistories = [];
        let allData = [];
        window.rawMasterItems = rawMasterItems;
        window.mockHistories = mockHistories;
        window.allData = allData;
        window.filteredData = [];

        `;
  indexContent = indexContent.slice(0, pRaw1) + replacement + indexContent.slice(pRaw2);
  console.log('[1.1] Cleared rawMasterItems and mockHistories in index.html');
} else {
  console.error('[ERROR] Could not find rawMasterItems in index.html');
}

// 1.2 Replace seedInitialAuditTrail
const pAudit1 = indexContent.indexOf('// Seed initial audit trail entries');
const pAudit2 = indexContent.indexOf('// ============================================================================', pAudit1);
if (pAudit1 !== -1 && pAudit2 !== -1) {
  const replacement = `// Live Audit Trail: Initialized empty; populated dynamically via apiGetAuditLogs RPC
        window.auditTrailEntries = [];

        `;
  indexContent = indexContent.slice(0, pAudit1) + replacement + indexContent.slice(pAudit2);
  console.log('[1.2] Removed seedInitialAuditTrail in index.html');
} else {
  console.error('[ERROR] Could not find auditSeed in index.html');
}

// 1.3 Replace mockCall in ApiServiceCore
const pMock1 = indexContent.indexOf('// In-memory Mock Fallback');
const pMock2 = indexContent.indexOf('window.ApiService = new ApiServiceCore();');
if (pMock1 !== -1 && pMock2 !== -1) {
  const replacement = `// Live Clean Mode: NO silent mock fallback!
                        // When opened standalone outside Google Apps Script, reject with explicit status
                        const err = new Error('BACKEND_UNAVAILABLE: Google Apps Script bridge is not detected. Please open via authorized Web App URL or use demo.html for standalone preview.');
                        err.code = 'BACKEND_UNAVAILABLE';
                        reject(err);
                    }
                });
            }
        }

        `;
  indexContent = indexContent.slice(0, pMock1) + replacement + indexContent.slice(pMock2);
  console.log('[1.3] Removed silent mockCall fallback in ApiServiceCore in index.html');
} else {
  console.error('[ERROR] Could not find mockCall in index.html');
}

// 1.4 Clean any remaining USR-ANANT references in fallbacks
indexContent = indexContent.replace(
  "Actor_User_ID: payload.actorUserId || 'USR-ANANT-01'",
  "Actor_User_ID: payload.actorUserId || (window.currentUser && window.currentUser.id ? window.currentUser.id : 'SYSTEM_ACTOR')"
);
indexContent = indexContent.replace(
  "actorUserId: (window.currentUser && window.currentUser.id) ? window.currentUser.id : 'USR-ANANT-01'",
  "actorUserId: (window.currentUser && window.currentUser.id) ? window.currentUser.id : 'SYSTEM_ACTOR'"
);
indexContent = indexContent.replace(
  "User_ID: payload.userId || (typeof currentUser !== 'undefined' && currentUser ? (currentUser.id || currentUser.userId) : 'USR-ANANT-01')",
  "User_ID: payload.userId || (typeof currentUser !== 'undefined' && currentUser ? (currentUser.id || currentUser.userId) : '')"
);
indexContent = indexContent.replace(
  "Email: payload.email || (typeof currentUser !== 'undefined' && currentUser && currentUser.email ? currentUser.email : 'anant.m@school.ac.th')",
  "Email: payload.email || (typeof currentUser !== 'undefined' && currentUser && currentUser.email ? currentUser.email : '')"
);

// Save cleaned index.html
fs.writeFileSync('index.html', indexContent, 'utf8');
console.log('[1.4] Saved clean index.html');

// 2. Process frontend/main/App.js
let appJs = fs.readFileSync('frontend/main/App.js', 'utf8');
const pApp1 = appJs.indexOf('const rawMasterItems = [');
const pApp2 = appJs.indexOf('// FSN Master Data (13 Digits e-GP Standard)', pApp1);
if (pApp1 !== -1 && pApp2 !== -1) {
  const replacement = `const rawMasterItems = [];
    const mockHistories = [];
    let allData = [];
    window.rawMasterItems = rawMasterItems;
    window.mockHistories = mockHistories;
    window.allData = allData;
    window.filteredData = [];

    `;
  appJs = appJs.slice(0, pApp1) + replacement + appJs.slice(pApp2);
  fs.writeFileSync('frontend/main/App.js', appJs, 'utf8');
  console.log('[2.1] Cleared rawMasterItems and mockHistories in frontend/main/App.js');
}

// 3. Process frontend/services/ApiService.js
let frontApi = fs.readFileSync('frontend/services/ApiService.js', 'utf8');
const pFrontMock1 = frontApi.indexOf('// Local Browser Simulation Mode');
const pFrontMock2 = frontApi.indexOf('window.ApiService = new ApiService();');
if (pFrontMock1 !== -1 && pFrontMock2 !== -1) {
  const replacement = `// Live Clean Mode: NO silent mock fallback!
                    const err = new Error('BACKEND_UNAVAILABLE: Google Apps Script bridge is not detected. Please open via authorized Web App URL or use demo.html for standalone preview.');
                    err.code = 'BACKEND_UNAVAILABLE';
                    reject(err);
                }
            });
        }
    }

    `;
  frontApi = frontApi.slice(0, pFrontMock1) + replacement + frontApi.slice(pFrontMock2);
  fs.writeFileSync('frontend/services/ApiService.js', frontApi, 'utf8');
  console.log('[3.1] Removed mockDispatcher from frontend/services/ApiService.js');
}

// 4. Process js/services/ApiService.js
let jsApi = fs.readFileSync('js/services/ApiService.js', 'utf8');
jsApi = jsApi.replace('isMockEnabled: true', 'isMockEnabled: false');
fs.writeFileSync('js/services/ApiService.js', jsApi, 'utf8');
console.log('[4.1] Disabled isMockEnabled in js/services/ApiService.js');

console.log('=== CLEAN SEPARATION SCRIPT FINISHED ===');
