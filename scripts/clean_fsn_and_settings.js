const fs = require('fs');

let text = fs.readFileSync('index.html', 'utf8');

// 1. Extract fsnData
const p1 = text.indexOf('let fsnData = [');
const pEnd = text.indexOf('];', p1);
if (p1 !== -1 && pEnd !== -1) {
  const fsnBlock = text.slice(p1 + 14, pEnd + 1);
  const fsnArray = eval(fsnBlock);
  fs.writeFileSync('tests/fixtures/sample_fsn.json', JSON.stringify(fsnArray, null, 2), 'utf8');
  console.log('Extracted ' + fsnArray.length + ' FSN sample items to tests/fixtures/sample_fsn.json');

  // Replace in index.html with clean empty array
  const cleanFsn = 'let fsnData = [];\n        window.fsnData = fsnData;';
  text = text.slice(0, p1) + cleanFsn + text.slice(pEnd + 2);
  console.log('Replaced fsnData with empty array in index.html');
}

// 2. Add empty guard in renderFsnTable
const pRender = text.indexOf('function renderFsnTable()');
if (pRender !== -1) {
  const pLoop = text.indexOf('fsnData.forEach', pRender);
  if (pLoop !== -1) {
    const emptyCheck = `if (!Array.isArray(fsnData) || fsnData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-slate-400">ไม่พบรายการรหัสพัสดุภาครัฐ (FSN) ในระบบ (ฐานข้อมูลว่าง)</td></tr>';
                return;
            }
            `;
    text = text.slice(0, pLoop) + emptyCheck + text.slice(pLoop);
    console.log('Added empty check to renderFsnTable in index.html');
  }
}

// 3. Clean qrList and audit in window.settingsState
const pQrList = text.indexOf('qrList: [');
const pAuditEnd = text.indexOf('originalData: {}', pQrList);
if (pQrList !== -1 && pAuditEnd !== -1) {
  const cleanSettingsStore = `qrList: [],
            audit: []
        },
        `;
  text = text.slice(0, pQrList) + cleanSettingsStore + text.slice(pAuditEnd);
  console.log('Cleaned qrList and audit sample data in window.settingsState in index.html');
}

fs.writeFileSync('index.html', text, 'utf8');
console.log('Saved index.html successfully');
