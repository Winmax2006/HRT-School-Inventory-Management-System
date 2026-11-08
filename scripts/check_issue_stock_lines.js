const fs = require('fs');
const content = fs.readFileSync('Write.gs', 'utf8');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('function apiIssueStock('));
console.log('apiIssueStock starts at line:', idx + 1);
for (let i = idx; i < idx + 200; i++) {
  if (lines[i].includes('postLedgerMovement')) {
    console.log('postLedgerMovement at line:', i + 1);
  }
}
