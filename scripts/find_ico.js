const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\Art\\OneDrive\\เดสก์ท็อป\\HRT_MiniUI_Preview.html', 'utf8');

const matches = [];
let re = /ico\s*=\s*|function\s+ico/g;
let m;
while ((m = re.exec(content)) !== null) {
  matches.push(m.index);
}
console.log('Matches:', matches);
matches.forEach(idx => {
  console.log(content.substring(idx - 20, idx + 200));
});
