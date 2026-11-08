const fs = require('fs');
const apiContent = fs.readFileSync('Api.gs', 'utf8');
const readContent = fs.readFileSync('Read.gs', 'utf8');
const writeContent = fs.readFileSync('Write.gs', 'utf8');
const auditContent = fs.readFileSync('Audit.gs', 'utf8');
const configContent = fs.readFileSync('Config.gs', 'utf8');

const allCode = readContent + '\n' + writeContent + '\n' + auditContent + '\n' + configContent;

const regMatch = apiContent.match(/const ACTION_REGISTRY = Object\.freeze\(\{([\s\S]*?)\}\);/);
const lines = regMatch[1].split('\n');
const missingHandlers = [];

lines.forEach(line => {
  const m = line.match(/handler:\s*'([^']+)'/);
  if (m) {
    const handler = m[1];
    const funcDeclRegex = new RegExp('function\\s+' + handler + '\\s*\\(');
    if (!funcDeclRegex.test(allCode)) {
      missingHandlers.push({ line: line.trim(), handler: handler });
    }
  }
});

console.log('Missing handlers count:', missingHandlers.length);
if (missingHandlers.length > 0) {
  console.log('Missing handlers:', missingHandlers);
} else {
  console.log('All handlers in ACTION_REGISTRY are defined!');
}
