const fs = require('fs');
const protoPath = 'C:\\Users\\Art\\OneDrive\\เดสก์ท็อป\\HRT_MiniUI_Preview.html';
const content = fs.readFileSync(protoPath, 'utf8');

const icoIdx = content.indexOf('function ico(');
if (icoIdx !== -1) {
  console.log('function ico:');
  console.log(content.substring(icoIdx, icoIdx + 1200));
}
