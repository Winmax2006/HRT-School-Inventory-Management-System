const fs = require('fs');
const lines = fs.readFileSync('Api.gs', 'utf8').split('\n');
console.log(lines.slice(100, 145).join('\n'));
