const fs = require('fs');
const path = require('path');

const secretPatterns = [
  { name: 'Google API Key', regex: /AIza[0-9A-Za-z-_]{35}/ },
  { name: 'Google OAuth Secret', regex: /GOCSPX-[0-9A-Za-z-_]{28}/ },
  { name: 'Private Key PEM', regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/ },
  { name: 'Bearer Token', regex: /Bearer\s+[a-zA-Z0-9_\-\.]{50,}/ },
  { name: 'GitHub PAT', regex: /gh[pousr]_[A-Za-z0-9_]{36,}/ },
  { name: 'GitHub Fine-grained PAT', regex: /github_pat_[A-Za-z0-9_]{50,}/ }
];

const ignoreDirs = new Set(['.git', 'node_modules', '.gemini', 'student_care_system', 'tmp_verify_release']);
const foundSecrets = [];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) {
        scanDir(fullPath);
      }
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.zip') || entry.name.endsWith('.xlsx') || entry.name.endsWith('.pdf')) continue;
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const sp of secretPatterns) {
          if (sp.regex.test(content)) {
            foundSecrets.push({ path: path.relative(path.resolve(__dirname, '..'), fullPath).replace(/\\/g, '/'), type: sp.name });
          }
        }
      } catch (err) {}
    }
  }
}

scanDir(path.resolve(__dirname, '..'));
console.log('SCAN RESULTS COUNT:', foundSecrets.length);
if (foundSecrets.length > 0) {
  console.log('SECRETS FOUND:', JSON.stringify(foundSecrets, null, 2));
} else {
  console.log('NO SECRETS DETECTED IN WORKSPACE FILES.');
}
