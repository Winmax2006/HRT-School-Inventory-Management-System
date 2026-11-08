/**
 * Module11_DashboardReportTest.gs - Regression Test for Dashboard & Reports (Module 11)
 * Scope: FiscalYearService.gs, ReportService.gs, DashboardApi.gs
 */

function runModule11DashboardReportTest() {
  const results = {
    suite: 'Module 11: Dashboard & Reports',
    timestamp: new Date().toISOString(),
    testsPassed: 0,
    testsFailed: 0,
    details: []
  };

  function assert(condition, testName, message) {
    if (condition) {
      results.testsPassed++;
      results.details.push({ status: 'PASS', name: testName });
    } else {
      results.testsFailed++;
      results.details.push({ status: 'FAIL', name: testName, error: message || 'Assertion failed' });
    }
  }

  try {
    // Reset Database Mock Store
    Database.resetMockStore();
    Database.appendRow(Schema.TABLES.MASTER_ITEMS, Schema.getHeaders(Schema.TABLES.MASTER_ITEMS));
    Database.appendRow(Schema.TABLES.STOCK_LEDGER, Schema.getHeaders(Schema.TABLES.STOCK_LEDGER));
    Database.appendRow(Schema.TABLES.TRANSACTIONS, Schema.getHeaders(Schema.TABLES.TRANSACTIONS));
    Database.appendRow(Schema.TABLES.REQUISITIONS, Schema.getHeaders(Schema.TABLES.REQUISITIONS));
    Database.appendRow(Schema.TABLES.REQUISITION_ITEMS, Schema.getHeaders(Schema.TABLES.REQUISITION_ITEMS));
    Database.appendRow(Schema.TABLES.AUDIT_TRAIL, Schema.getHeaders(Schema.TABLES.AUDIT_TRAIL));
    Database.appendRow(Schema.TABLES.USERS, Schema.getHeaders(Schema.TABLES.USERS));
    AuthService.ensureDefaultUsers();

    // 1. Fiscal Year Calculation
    const mayDate = new Date(2024, 4, 15); // May 2024 -> FY 2567
    assert(FiscalYearService.getCurrentFiscalYear(mayDate) === 2567, 'May 2024 is FY 2567');
    const octDate = new Date(2024, 9, 5); // October 2024 -> FY 2568
    assert(FiscalYearService.getCurrentFiscalYear(octDate) === 2568, 'October 2024 is FY 2568');

    // 2. Setup Items & Stock
    ItemService.createItem({
      item_code: 'OFF-001',
      item_name: 'กระดาษ A4',
      category: 'วัสดุสำนักงาน',
      unit: 'รีม',
      unit_price: 100.0,
      min_stock: 10,
      current_stock: 50
    });

    ItemService.createItem({
      item_code: 'IT-001',
      item_name: 'สาย HDMI',
      category: 'วัสดุคอมพิวเตอร์',
      unit: 'เส้น',
      unit_price: 200.0,
      min_stock: 5,
      current_stock: 4 // LOW stock
    });

    // Record ledger entries to ensure reconciliation
    LedgerService.recordMovement({
      item_code: 'OFF-001',
      transaction_type: 'รับเข้าสต็อก',
      qty_in: 50,
      fiscal_year: '2567'
    });
    LedgerService.recordMovement({
      item_code: 'IT-001',
      transaction_type: 'รับเข้าสต็อก',
      qty_in: 4,
      fiscal_year: '2567'
    });

    Auth.setMockSessionUser('officer@school.ac.th');

    // 3. Dashboard Metrics
    const metricsRes = DashboardApi.apiGetDashboardMetrics({}, 'REQ-DASH-001');
    assert(metricsRes.success === true, 'apiGetDashboardMetrics returns success');
    assert(metricsRes.data.total_items === 2, 'Total items is 2');
    // Valuation: (50 * 100) + (4 * 200) = 5000 + 800 = 5800
    assert(metricsRes.data.total_inventory_value === 5800, 'Total inventory value is 5,800');
    assert(metricsRes.data.low_stock_count === 1, 'Low stock count is 1');

    // 4. Report Generation (พ.ด. ๓ Stock Card)
    const stockCardRes = DashboardApi.apiGetPdReport('PD3', { item_code: 'OFF-001' }, 'REQ-REP-001');
    assert(stockCardRes.success === true, 'Generate PD3 stock card succeeds');
    assert(stockCardRes.data.report_code === 'พ.ด. ๓', 'Report code is พ.ด. ๓');
    assert(stockCardRes.data.transactions.length === 1, 'Stock card contains 1 ledger transaction');

    // 5. Fiscal Year Rollover Test
    const rolloverRes = DashboardApi.apiCloseFiscalYear({ fiscal_year: '2567' }, 'REQ-FY-001');
    assert(rolloverRes.success === true, 'Fiscal year closing succeeds');
    assert(rolloverRes.data.new_year === '2568', 'Rolled over to new fiscal year 2568');
    assert(rolloverRes.data.items_rolled_over === 2, '2 items rolled over with opening balances');

    // Verify opening balance in ledger
    const offEntries = LedgerService.getLedgerEntriesForItem('OFF-001');
    const rolloverEntry = offEntries[offEntries.length - 1];
    assert(rolloverEntry.transaction_type === 'ยอดยกมา' && rolloverEntry.fiscal_year === '2568',
      'Ledger contains "ยอดยกมา" opening balance for 2568');

  } catch (error) {
    results.testsFailed++;
    results.details.push({ status: 'ERROR', error: error.message, stack: error.stack });
  }

  return results;
}
