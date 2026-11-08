const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\Art\\OneDrive\\เดสก์ท็อป\\HRT_MiniUI_Preview.html', 'utf8');
const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
if (styleMatch) {
  console.log('Style length:', styleMatch[1].length);
  console.log(styleMatch[1].substring(0, 1000));
}
