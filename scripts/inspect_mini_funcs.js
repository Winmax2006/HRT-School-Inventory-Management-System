const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\Art\\OneDrive\\เดสก์ท็อป\\HRT_MiniUI_Preview.html', 'utf8');
const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
  const code = scriptMatch[1];
  console.log('Script length:', code.length);
  // Find where functions are declared
  ['function catalog', 'function cart', 'function requests', 'function account', 'function product', 'function submitCart'].forEach(fn => {
    const idx = code.indexOf(fn);
    if (idx !== -1) {
      console.log('Found ' + fn + ' at ' + idx);
      console.log(code.substring(idx, idx + 400));
      console.log('---');
    }
  });
}
