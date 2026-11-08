const fs = require('fs');
const lines = fs.readFileSync('index.html', 'utf8').split('\n');
const idx = lines.findIndex(l => l.includes('window.submitSaveUser ='));
console.log('submitSaveUser at line:', idx + 1);
console.log(lines.slice(idx, idx + 60).join('\n'));
