const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('renderSettingsUsers') || l.includes('openAddUserModal') || l.includes('tblSettingsUsers') || l.includes('tabSettingsUsers')) {
    console.log((idx+1) + ': ' + l.trim());
  }
});
