const fs = require('fs');
const lines = fs.readFileSync('Read.gs', 'utf8').split('\n');
console.log('Total lines in Read.gs:', lines.length);
console.log(lines.slice(lines.length - 25).join('\n'));
