const fs = require('fs');
const lines = fs.readFileSync('index.html', 'utf8').split('\n');
console.log(lines.slice(5900, 5940).map((l, i) => `${5901+i}: ${JSON.stringify(l)}`).join('\n'));
