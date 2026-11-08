const fs = require('fs');
const indexHtml = fs.readFileSync('index.html', 'utf8');
const lines = indexHtml.split('\n');
for (let i = 13145; i <= 13160; i++) {
  console.log(`${i}: ${lines[i-1]}`);
}
