const fs = require('fs');
const lines = fs.readFileSync('Write.gs', 'utf8').split('\n');
console.log(lines.slice(1995, 2025).join('\n'));
