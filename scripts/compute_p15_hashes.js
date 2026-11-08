const fs = require('fs');
const crypto = require('crypto');

const files = [
  'Config.gs',
  'Api.gs',
  'Read.gs',
  'Write.gs',
  'Audit.gs',
  'Code.gs',
  'index.html',
  'MiniUI.html',
  'appsscript.json',
  'frontend/main/App.js',
  'tests/security_surface_test.js',
  'tests/rpc_contract_test.js',
  'tests/auth_rbac_test.js'
];

const hashes = {};
files.forEach(f => {
  if (fs.existsSync(f)) {
    const content = fs.readFileSync(f);
    hashes[f] = crypto.createHash('sha256').update(content).digest('hex');
  }
});

fs.writeFileSync('scripts/prompt15_hashes.json', JSON.stringify(hashes, null, 2), 'utf8');
console.log('Computed SHA-256 Hashes for Prompt 15:');
console.log(JSON.stringify(hashes, null, 2));
