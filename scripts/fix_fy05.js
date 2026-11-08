const fs = require('fs');

// 1. Write.gs
let write = fs.readFileSync('Write.gs', 'utf8');
write = write.replace(
  "const lType = String(ledgerData[l][2] || '').trim().toUpperCase();",
  "const lType = String(ledgerData[l][3] || '').trim().toUpperCase();"
);
fs.writeFileSync('Write.gs', write, 'utf8');
new Function(write);
console.log('Write.gs updated.');

// 2. tests/fiscal_year_official_reports_test.js
let test = fs.readFileSync('tests/fiscal_year_official_reports_test.js', 'utf8');
test = test.replace(
  "const opening2570 = ledgerRows.filter(r => r[8] === '2570' && r[2] === 'OPENING');",
  "const opening2570 = ledgerRows.filter(r => r[8] === '2570' && r[3] === 'OPENING');"
);
fs.writeFileSync('tests/fiscal_year_official_reports_test.js', test, 'utf8');
console.log('tests/fiscal_year_official_reports_test.js updated.');
