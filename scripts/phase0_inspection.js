/**
 * scripts/phase0_inspection.js
 * Comprehensive read-only baseline inspection for Phase 0
 */

const fs = require('fs');
const path = require('path');

console.log('==================================================');
console.log('PHASE 0: BASELINE AUDIT & RPC CONTRACT INSPECTION');
console.log('==================================================\n');

// 1. Code.gs public functions
const codeGs = fs.readFileSync('Code.gs', 'utf8');
const fnMatches = codeGs.matchAll(/^function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/gm);
const codeFunctions = [];
for (const m of fnMatches) {
  codeFunctions.push({ name: m[1], args: m[2].trim() });
}
console.log('--- 1. Public Functions in Code.gs (' + codeFunctions.length + ' functions) ---');
codeFunctions.forEach(f => console.log(`  - ${f.name}(${f.args})`));

// 2. Api.gs action registry
console.log('\n--- 2. ACTION_REGISTRY in Api.gs ---');
const apiGs = fs.readFileSync('Api.gs', 'utf8');
const actionMatch = apiGs.match(/const ACTION_REGISTRY = Object\.freeze\(\{([\s\S]*?)\}\);/);
if (actionMatch) {
  const lines = actionMatch[1].split('\n');
  lines.forEach(l => {
    if (l.includes(': {')) {
      const actionName = l.trim().split(':')[0].replace(/['"]/g, '');
      const handlerMatch = l.match(/handler:\s*['"]([^'"]+)['"]/);
      const roleMatch = l.match(/minRole:\s*['"]([^'"]+)['"]/);
      const permMatch = l.match(/permission:\s*['"]([^'"]+)['"]/);
      const isWriteMatch = l.match(/isWrite:\s*(true|false)/);
      console.log(`  - Action: "${actionName}" -> Handler: ${handlerMatch ? handlerMatch[1] : '?'}, Role: ${roleMatch ? roleMatch[1] : '?'}, Perm: ${permMatch ? permMatch[1] : '?'}, Write: ${isWriteMatch ? isWriteMatch[1] : '?'}`);
    }
  });
}

// 3. Check for HRT_rpc in Code.gs or Api.gs or anywhere in workspace
console.log('\n--- 3. Checking for HRT_rpc across codebase ---');
['Code.gs', 'Api.gs', 'Read.gs', 'Write.gs', 'Audit.gs', 'index.html', 'frontend/main/App.js', 'frontend/services/ApiService.js'].forEach(f => {
  if (fs.existsSync(f)) {
    const content = fs.readFileSync(f, 'utf8');
    if (content.includes('HRT_rpc')) {
      console.log(`  FOUND HRT_rpc in ${f}`);
    }
  }
});

// 4. google.script.run in frontend files
console.log('\n--- 4. google.script.run occurrences in frontend files ---');
const frontendFiles = ['index.html', 'frontend/main/App.js', 'frontend/services/ApiService.js', 'js/services/ApiService.js'];
frontendFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const matches = [];
    lines.forEach((l, i) => {
      if (l.includes('google.script.run')) {
        matches.push({ line: i + 1, text: l.trim() });
      }
    });
    console.log(`\nFile: ${file} (Found ${matches.length} matches):`);
    matches.forEach(m => console.log(`  L.${m.line}: ${m.text}`));
  }
});
