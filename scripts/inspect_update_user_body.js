const fs = require('fs');
const lines = fs.readFileSync('Write.gs', 'utf8').split('\n');
console.log(lines.slice(2010, 2035).join('\n'));
