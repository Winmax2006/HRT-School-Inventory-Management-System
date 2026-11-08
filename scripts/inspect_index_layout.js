const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');

console.log('Total lines in index.html:', lines.length);

// Find body tag
const bodyIdx = lines.findIndex(l => l.includes('<body'));
console.log('Body starts at line:', bodyIdx + 1);
for (let i = bodyIdx; i < Math.min(bodyIdx + 80, lines.length); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
