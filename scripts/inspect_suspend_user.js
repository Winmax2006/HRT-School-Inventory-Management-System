const fs = require('fs');
const lines = fs.readFileSync('index.html', 'utf8').split('\n');
const idx = lines.findIndex(l => l.includes('window.suspendUser ='));
console.log('suspendUser at line:', idx + 1);
console.log(lines.slice(idx, idx + 45).join('\n'));
