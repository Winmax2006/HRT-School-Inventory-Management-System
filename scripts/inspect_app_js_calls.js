const fs = require('fs');
if (fs.existsSync('frontend/main/App.js')) {
  const content = fs.readFileSync('frontend/main/App.js', 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    if (l.includes('google.script.run') || l.includes('apiUpdateSettingsSection')) {
      console.log((idx+1) + ': ' + l.trim());
    }
  });
}
