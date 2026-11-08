const fs = require('fs');

const files = ['Code.gs', 'Read.gs', 'Write.gs', 'Audit.gs', 'Config.gs'];
const fnMap = {};

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  // Match top-level functions: function name(
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const match = line.match(/^\s*function\s+([a-zA-Z0-9_]+)\s*\(/);
    if (match) {
      const fnName = match[1];
      if (!fnMap[fnName]) fnMap[fnName] = [];
      fnMap[fnName].push({ file, line: idx + 1 });
    }
  });
});

console.log('Total unique function declarations found:', Object.keys(fnMap).length);
const duplicates = Object.entries(fnMap).filter(([k, v]) => v.length > 1);
console.log('Duplicate function declarations count:', duplicates.length);
duplicates.forEach(([name, locations]) => {
  console.log(`  - ${name} declared in:`);
  locations.forEach(loc => console.log(`      ${loc.file}:${loc.line}`));
});
