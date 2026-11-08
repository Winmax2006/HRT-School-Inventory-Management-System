const fs = require('fs');
const lines = fs.readFileSync('Code.gs', 'utf8').split('\n');
console.log(lines.slice(55, 75).join('\n'));
