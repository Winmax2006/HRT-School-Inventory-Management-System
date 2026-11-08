const fs = require('fs');
const lines = fs.readFileSync('frontend/main/App.js', 'utf8').split('\n');
console.log(lines.slice(1460, 1515).join('\n'));
