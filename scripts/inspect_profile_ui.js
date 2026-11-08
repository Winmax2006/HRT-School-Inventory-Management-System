const fs = require('fs');
const lines = fs.readFileSync('index.html', 'utf8').split('\n');
console.log(lines.slice(1195, 1245).join('\n'));
