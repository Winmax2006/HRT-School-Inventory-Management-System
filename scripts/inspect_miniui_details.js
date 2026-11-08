const fs = require('fs');
const p = 'C:/Users/Art/OneDrive/เดสก์ท็อป/HRT_MiniUI_Preview.html';
const content = fs.readFileSync(p, 'utf8');

const lines = content.split('\n');
console.log('Total lines:', lines.length);

// Look for nav / menu buttons
lines.forEach((l, i) => {
  if (l.includes('<nav') || l.includes('role="tab"') || l.includes('data-view') || l.includes('nav-') || l.includes('switchView') || l.includes('switchTab')) {
    console.log(`L.${i+1}: ${l.trim().substring(0, 100)}`);
  }
});

// Look for script functions
console.log('\n--- Script Functions ---');
const fnMatches = content.matchAll(/function\s+([a-zA-Z0-9_]+)\s*\(/g);
for (const f of fnMatches) {
  console.log('  function', f[1]);
}
