const fs = require('fs');
const lines = fs.readFileSync('Code.gs', 'utf8').split('\n');
console.log('Total lines in Code.gs:', lines.length);
console.log(lines.slice(0, 50).join('\n'));
console.log('--- Last 40 lines ---');
console.log(lines.slice(lines.length - 40).join('\n'));
