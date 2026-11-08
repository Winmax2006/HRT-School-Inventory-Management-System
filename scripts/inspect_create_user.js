const fs = require('fs');
const lines = fs.readFileSync('Write.gs', 'utf8').split('\n');
console.log(lines.slice(1910, 1940).join('\n'));
