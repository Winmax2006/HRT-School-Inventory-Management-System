const fs = require('fs');
['Config.gs', 'Read.gs', 'Write.gs'].forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  content.split('\n').forEach((l, idx) => {
    if (l.includes('function getSheet') || l.includes('function getSS')) {
      console.log(f + ':' + (idx+1) + ': ' + l);
    }
  });
});
