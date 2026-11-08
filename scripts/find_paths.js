const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\Art\\OneDrive\\เดสก์ท็อป\\HRT_MiniUI_Preview.html', 'utf8');
console.log(content.substring(16500, 17700));
