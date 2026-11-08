const fs = require('fs');

const content = fs.readFileSync('Api.gs', 'utf8');

const start = content.indexOf('const ACTION_REGISTRY = Object.freeze({');
const end = content.indexOf('});', start);
const registryStr = content.substring(start, end);

const regex = /'([^']+)':\s*\{\s*handler:\s*'([^']+)',\s*minRole:\s*'([^']+)',\s*permission:\s*'([^']+)',\s*isWrite:\s*(true|false)\s*\}/g;

const rows = ['action,handler,minRole,permission,isWrite,transport,isPrivate'];
let m;
while ((m = regex.exec(registryStr)) !== null) {
  const [_, action, handler, minRole, permission, isWrite] = m;
  const isPrivate = handler.endsWith('_');
  const transport = 'HTTP_doPost/google.script.run.apiCall';
  rows.push(`"${action}","${handler}","${minRole}","${permission}",${isWrite},"${transport}",${isPrivate}`);
}

if (!fs.existsSync('docs/repair')) {
  fs.mkdirSync('docs/repair', { recursive: true });
}

fs.writeFileSync('docs/repair/ROUTER_MATRIX.csv', rows.join('\n'), 'utf8');
console.log('Successfully wrote docs/repair/ROUTER_MATRIX.csv with ' + (rows.length - 1) + ' actions.');
