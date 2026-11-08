const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('id="roleDropdownMenu"'));
console.log('roleDropdownMenu line:', idx + 1);
console.log(lines.slice(idx, idx + 35).join('\n'));
