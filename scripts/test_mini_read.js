const fs = require('fs');
const protoPath = 'C:\\Users\\Art\\OneDrive\\เดสก์ท็อป\\HRT_MiniUI_Preview.html';
const content = fs.readFileSync(protoPath, 'utf8');

console.log('Prototype read, total length:', content.length);
// Extract style block
const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
console.log('Style block length:', styleMatch ? styleMatch[1].length : 0);
