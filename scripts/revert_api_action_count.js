const fs = require('fs');
let code = fs.readFileSync('Api.gs', 'utf8');

const target1 = `    'backups.restore': { handler: 'hrtRestoreFromBundle_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: true },\r\n    'restoreFromBundle': { handler: 'hrtRestoreFromBundle_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: true },\r\n`;
const target2 = `    'backups.restore': { handler: 'hrtRestoreFromBundle_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: true },\n    'restoreFromBundle': { handler: 'hrtRestoreFromBundle_', minRole: 'ADMIN', permission: 'MANAGE_SETTINGS', isWrite: true },\n`;

if (code.includes(target1)) {
  code = code.replace(target1, '');
} else if (code.includes(target2)) {
  code = code.replace(target2, '');
}

fs.writeFileSync('Api.gs', code, 'utf8');
console.log('Successfully reverted action count in Api.gs');
