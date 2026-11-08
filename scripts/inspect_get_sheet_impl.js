const fs = require('fs');
const lines = fs.readFileSync('Config.gs', 'utf8').split('\n');
console.log(lines.slice(195, 235).join('\n'));
