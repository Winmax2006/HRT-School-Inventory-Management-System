const fs = require('fs');

const indexHtml = fs.readFileSync('index.html', 'utf8');
const lines = indexHtml.split('\n');

console.log('--- index.html lines 5910 - 5940 ---');
for (let i = 5910; i <= 5940; i++) {
  console.log(`${i}: ${lines[i-1]}`);
}

console.log('\n--- index.html lines 13125 - 13150 ---');
for (let i = 13125; i <= 13150; i++) {
  console.log(`${i}: ${lines[i-1]}`);
}
