const fs = require('fs');
const lines = fs.readFileSync('Config.gs', 'utf8').split('\n');
console.log(lines.slice(135, 175).join('\n'));
