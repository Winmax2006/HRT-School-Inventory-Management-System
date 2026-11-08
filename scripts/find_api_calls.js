const fs = require('fs');

function findCalls(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const calls = [];
  lines.forEach((l, i) => {
    const m = l.match(/(?:ApiService\.call|apiCall)\s*\(\s*['"]([^'"]+)['"]/);
    if (m) {
      calls.push({ line: i + 1, name: m[1], text: l.trim() });
    }
  });
  console.log(`\n=== Calls in ${filePath} (${calls.length}) ===`);
  const uniqueNames = [...new Set(calls.map(c => c.name))];
  console.log('Unique called names:', uniqueNames);
  calls.slice(0, 15).forEach(c => console.log(`  L.${c.line}: ${c.name} -> ${c.text.substring(0, 80)}`));
}

findCalls('index.html');
findCalls('frontend/main/App.js');
findCalls('frontend/pages/Settings.html');
findCalls('frontend/services/ApiService.js');
