const fs = require('fs');

// 1. Api.gs
let api = fs.readFileSync('Api.gs', 'utf8');
api = api.replace(
  'idempotencyKey = payload.idempotency_key || payload.idempotencyKey;\n      let idempotencyReserved = false;',
  'idempotencyKey = payload.idempotency_key || payload.idempotencyKey;\n      idempotencyReserved = false;'
);
fs.writeFileSync('Api.gs', api, 'utf8');
new Function(api);
console.log('Api.gs updated & syntax verified.');

// 2. tests/stock_transaction_idempotency_test.js
let test = fs.readFileSync('tests/stock_transaction_idempotency_test.js', 'utf8');
test = test.replace(
  "assert.strictEqual(verify.chainIntact, true, 'Audit log hash chain must remain intact');",
  "assert.strictEqual(verify.isValid, true, 'Audit log hash chain must remain intact');"
);
fs.writeFileSync('tests/stock_transaction_idempotency_test.js', test, 'utf8');
console.log('tests/stock_transaction_idempotency_test.js updated.');
