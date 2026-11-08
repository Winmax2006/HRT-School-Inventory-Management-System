const fs = require('fs');
const lines = fs.readFileSync('Write.gs', 'utf8').split('\n');
console.log(lines.slice(2005, 2040).join('\n'));
