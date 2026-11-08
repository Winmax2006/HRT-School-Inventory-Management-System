const fs = require('fs');
fs.readdirSync('tests').forEach(f => {
  if (f.endsWith('.js')) {
    const c = fs.readFileSync('tests/' + f, 'utf8');
    ['setConfig', 'logAudit', 'include', 'initDatabase'].forEach(term => {
      if (c.includes(term)) {
        console.log(`tests/${f} references "${term}"`);
      }
    });
  }
});
