/**
 * BackendTestRunner.gs - Master Test Runner for All 12 Backend Modules
 * Standard: Automated Verification across All Layers & Invariants
 */

function runAllBackendTests() {
  const suites = [
    { name: 'Module 1: Data & Persistence', fn: typeof runModule1DataTest !== 'undefined' ? runModule1DataTest : null },
    { name: 'Module 2: Validation & Errors', fn: typeof runModule2ValidationTest !== 'undefined' ? runModule2ValidationTest : null },
    { name: 'Module 3: Authentication & Users', fn: typeof runModule3AuthTest !== 'undefined' ? runModule3AuthTest : null },
    { name: 'Module 4: RBAC & Permissions', fn: typeof runModule4RBACTest !== 'undefined' ? runModule4RBACTest : null },
    { name: 'Module 5: Items & Stock Health', fn: typeof runModule5ItemTest !== 'undefined' ? runModule5ItemTest : null },
    { name: 'Module 6: Requisitions & Basket', fn: typeof runModule6RequisitionTest !== 'undefined' ? runModule6RequisitionTest : null },
    { name: 'Module 7: Approval State Machine', fn: typeof runModule7ApprovalTest !== 'undefined' ? runModule7ApprovalTest : null },
    { name: 'Module 8: Stock Movements & Mutex', fn: typeof runModule8StockTest !== 'undefined' ? runModule8StockTest : null },
    { name: 'Module 9: Double-Entry Ledger', fn: typeof runModule9LedgerTest !== 'undefined' ? runModule9LedgerTest : null },
    { name: 'Module 10: Audit Trail & Chain', fn: typeof runModule10AuditTest !== 'undefined' ? runModule10AuditTest : null },
    { name: 'Module 11: Dashboard & Reports', fn: typeof runModule11DashboardReportTest !== 'undefined' ? runModule11DashboardReportTest : null },
    { name: 'Module 12: API Router & E2E', fn: typeof runModule12ApiRouterE2ETest !== 'undefined' ? runModule12ApiRouterE2ETest : null }
  ];

  const summary = {
    executedAt: new Date().toISOString(),
    totalSuites: suites.length,
    suitesPassed: 0,
    suitesFailed: 0,
    totalTestsPassed: 0,
    totalTestsFailed: 0,
    suiteResults: []
  };

  suites.forEach(suite => {
    if (!suite.fn) {
      summary.suitesFailed++;
      summary.suiteResults.push({
        suite: suite.name,
        status: 'SKIPPED_OR_MISSING',
        error: 'Test function is not defined in global scope'
      });
      return;
    }

    try {
      const res = suite.fn();
      summary.totalTestsPassed += res.testsPassed || 0;
      summary.totalTestsFailed += res.testsFailed || 0;

      if ((res.testsFailed || 0) === 0) {
        summary.suitesPassed++;
        summary.suiteResults.push({
          suite: suite.name,
          status: 'ALL_PASSED',
          testsPassed: res.testsPassed
        });
      } else {
        summary.suitesFailed++;
        summary.suiteResults.push({
          suite: suite.name,
          status: 'HAS_FAILURES',
          testsPassed: res.testsPassed,
          testsFailed: res.testsFailed,
          details: res.details
        });
      }
    } catch (err) {
      summary.suitesFailed++;
      summary.suiteResults.push({
        suite: suite.name,
        status: 'EXECUTION_CRASHED',
        error: err.message,
        stack: err.stack
      });
    }
  });

  if (typeof Logger !== 'undefined') {
    Logger.log('====================================================');
    Logger.log(`🏁 BACKEND REGRESSION SUITE FINISHED: ${summary.suitesPassed}/${summary.totalSuites} SUITES PASSED`);
    Logger.log(`Total Assertions Passed: ${summary.totalTestsPassed}, Failed: ${summary.totalTestsFailed}`);
    Logger.log('====================================================');
  }

  return summary;
}
