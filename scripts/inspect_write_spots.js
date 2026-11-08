const fs = require('fs');
const lines = fs.readFileSync('Write.gs', 'utf8').split('\n');
console.log('--- apiCreateUser lines 1915-1930 ---');
console.log(lines.slice(1915, 1930).join('\n'));
console.log('--- apiReconcileStockBalances lines 2070-2085 ---');
console.log(lines.slice(2070, 2085).join('\n'));
