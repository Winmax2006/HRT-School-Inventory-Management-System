const fs = require('fs');
const path = 'C:\\Users\\Art\\OneDrive\\เดสก์ท็อป\\HRT_MiniUI_Preview.html';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');
console.log('Total lines in prototype:', lines.length);

// Look for tabs, IDs, and script functions
const interesting = [];
lines.forEach((l, idx) => {
  if (l.includes('id="') || l.includes('class="tab') || l.includes('function ') || l.includes('localStorage')) {
    interesting.push(`${idx+1}: ${l.trim()}`);
  }
});
console.log('Interesting lines count:', interesting.length);
console.log(interesting.slice(0, 40).join('\n'));
