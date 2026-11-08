const { execSync } = require('child_process');

const suites = [
  'tests/regression_test_suite.js',
  'tests/p1_p2_contract_lifecycle_test.js',
  'tests/p3_miniui_critical_test.js',
  'tests/p4_settings_important_test.js',
  'tests/p6_acceptance_suite.js',
  'tests/p7_settings_comprehensive_test.js',
  'tests/p8_backend_sheets_architecture_test.js',
  'tests/p9_clean_separation_test.js',
  'tests/p11_auth_miniui_rpc_test.js',
  'tests/security_surface_test.js',
  'tests/rpc_contract_test.js',
  'tests/auth_rbac_test.js',
  'tests/stock_transaction_idempotency_test.js',
  'tests/fiscal_year_official_reports_test.js',
  'tests/settings_diagnostics_backup_test.js',
  'tests/miniui_qr_test.js',
  'tests/release_consolidation_test.js'
];

console.log('==================================================');
console.log('RUNNING COMPLETE TEST SUITE REGRESSION (17 SUITES)');
console.log('==================================================\n');

let allPassed = true;
let totalPassedCount = 0;
suites.forEach(suite => {
  console.log(`>>> Running: ${suite}`);
  try {
    const out = execSync(`node ${suite}`, { encoding: 'utf8' });
    console.log(out.split('\n').filter(l => l.includes('PASSED') || l.includes('TOTAL') || l.includes('FAIL')).join('\n'));
    console.log('---');
  } catch (err) {
    console.error(`FAILED: ${suite}`);
    console.error(err.stdout || err.message);
    allPassed = false;
  }
});

if (allPassed) {
  console.log('\n==================================================');
  console.log('ALL 17 TEST SUITES PASSED 100%!');
  console.log('==================================================');
} else {
  console.error('\nSOME TEST SUITES FAILED!');
  process.exit(1);
}
