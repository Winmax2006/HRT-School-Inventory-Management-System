const fs = require('fs');
const lines = fs.readFileSync('index.html', 'utf8').split('\n');
const idx = lines.findIndex(l => l.includes('window.onload ='));
console.log('window.onload at line:', idx + 1);
console.log(lines.slice(idx, idx + 30).join('\n'));
