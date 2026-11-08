const fs = require('fs');
const lines = fs.readFileSync('index.html', 'utf8').split('\n');
console.log('--- Lines 3905-3950 ---');
console.log(lines.slice(3905, 3950).join('\n'));
console.log('--- Lines 14680-14750 ---');
console.log(lines.slice(14680, 14750).join('\n'));
