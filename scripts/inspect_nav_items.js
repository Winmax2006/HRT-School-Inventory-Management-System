const fs = require('fs');
const lines = fs.readFileSync('index.html', 'utf8').split('\n');
for (let i = 1060; i < 1250; i++) {
  if (lines[i].includes('menuItem') || lines[i].includes('class="mt-4') || lines[i].includes('switchMainView')) {
    console.log(`${i+1}: ${lines[i]}`);
  }
}
