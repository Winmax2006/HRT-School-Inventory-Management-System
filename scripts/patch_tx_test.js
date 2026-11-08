const fs = require('fs');

let testCode = fs.readFileSync('tests/stock_transaction_idempotency_test.js', 'utf8');

// 1. Add getLastRow
testCode = testCode.replace(
  'getName: () => name,',
  'getName: () => name,\n      getLastRow: () => sheetRows.length,'
);

// 2. Fix TX-14 initial requisition status to SUBMITTED
testCode = testCode.replace(
  "  const approver = { id: 'USR-004', name: 'หัวหน้างบประมาณ', role: 'APPROVER', permissions: ['APPROVE_REQUISITIONS'] };\n\n  // Call hrtApproveRequisition_ with display number req_no: REQ-2569/001",
  "  const approver = { id: 'USR-004', name: 'หัวหน้างบประมาณ', role: 'APPROVER', permissions: ['APPROVE_REQUISITIONS'] };\n  sheets['07_Requisitions'][1][6] = 'SUBMITTED';\n\n  // Call hrtApproveRequisition_ with display number req_no: REQ-2569/001"
);

fs.writeFileSync('tests/stock_transaction_idempotency_test.js', testCode, 'utf8');
console.log('tests/stock_transaction_idempotency_test.js updated.');
