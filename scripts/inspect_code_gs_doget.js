const fs = require('fs');
const lines = fs.readFileSync('Code.gs', 'utf8').split('\n');
console.log(lines.slice(7, 35).join('\n'));
