const fs = require('fs');
let testCode = fs.readFileSync('tests/p11_auth_miniui_rpc_test.js', 'utf8');

const target = `runTest('SCENARIO 5.3: MiniUI requisition submission preserves decoupled stock deduction', () => {
  const writeGs = fs.readFileSync('Write.gs', 'utf8');
  const miniHtml = fs.readFileSync('MiniUI.html', 'utf8');

  // Verify that apiCreateRequisition does not mutate ledger
  assert.ok(!writeGs.substring(160, 290).includes('postLedgerMovement'), 'apiCreateRequisition must NEVER call postLedgerMovement');
  // Verify that apiIssueStock is the exclusive writer to stock ledger
  assert.ok(writeGs.substring(550, 730).includes('postLedgerMovement'), 'apiIssueStock must call postLedgerMovement');
});`;

const replacement = `runTest('SCENARIO 5.3: MiniUI requisition submission preserves decoupled stock deduction', () => {
  const writeLines = fs.readFileSync('Write.gs', 'utf8').split('\\n');

  // Find apiCreateRequisition block
  const createIdx = writeLines.findIndex(l => l.includes('function apiCreateRequisition('));
  const createBlock = writeLines.slice(createIdx, createIdx + 120).join('\\n');
  assert.ok(!createBlock.includes('postLedgerMovement'), 'apiCreateRequisition must NEVER call postLedgerMovement (Stock unchanged on creation)');

  // Find apiIssueStock block
  const issueIdx = writeLines.findIndex(l => l.includes('function apiIssueStock('));
  const issueBlock = writeLines.slice(issueIdx, issueIdx + 160).join('\\n');
  assert.ok(issueBlock.includes('postLedgerMovement'), 'apiIssueStock must call postLedgerMovement (Decoupled issuance)');
});`;

if (testCode.includes(target)) {
  testCode = testCode.replace(target, replacement);
  fs.writeFileSync('tests/p11_auth_miniui_rpc_test.js', testCode, 'utf8');
  console.log('Test 5.3 updated to use line slicing!');
} else {
  console.log('Target not found in test file');
}
