/**
 * Module9_LedgerTest.gs - Regression Test for Immutable Double-Entry Ledger (Module 9)
 * Scope: LedgerService.gs
 */

function runModule9LedgerTest() {
  const results = {
    suite: 'Module 9: Double-Entry Immutable Ledger',
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

    // Seed master item
    Repository.insert(Schema.TABLES.MASTER_ITEMS, {
      item_code: 'IT-001',
      item_name: 'สาย HDMI 3M',
      category: 'วัสดุคอมพิวเตอร์',
      current_stock: 0,
      unit_price: 180.0
    });

    // 1. Initial Receipt Movement
    const entry1 = LedgerService.recordMovement({
      item_code: 'IT-001',
      transaction_type: 'รับเข้าสต็อก',
      qty_in: 25,
      qty_out: 0,
      unit_cost: 180.0,
      reference_id: 'PO-2567-001'
    });
    assert(entry1.balance_after === 25, 'Ledger entry 1 balance_after is 25');

    // 2. Issue Movement
    const entry2 = LedgerService.recordMovement({
      item_code: 'IT-001',
      transaction_type: 'เบิกใช้งาน',
      qty_in: 0,
      qty_out: 10,
      unit_cost: 180.0,
      reference_id: 'REQ-2567-001'
    });
    assert(entry2.balance_after === 15, 'Ledger entry 2 balance_after is 15 (25 - 10)');

    // 3. Negative Balance Invariant Rejection
    let negativeBalanceThrew = false;
    try {
      LedgerService.recordMovement({
        item_code: 'IT-001',
        transaction_type: 'เบิกใช้งาน',
        qty_in: 0,
        qty_out: 99, // Attempt to deduct 99 when balance is 15
        unit_cost: 180.0
      });
    } catch (e) {
      negativeBalanceThrew = true;
      assert(e.code === ErrorService.ERROR_CODES.INSUFFICIENT_STOCK, 'Throws INSUFFICIENT_STOCK error code');
    }
    assert(negativeBalanceThrew, 'Double-Entry Invariant: ledger prevents negative balance');

    // 4. Recalculation Check
    const recalculated = LedgerService.recalculateItemBalance('IT-001');
    assert(recalculated === 15, 'recalculateItemBalance returns 15 (25 - 10)');

    // 5. Discrepancy Detection Test
    // Sync master stock to 15 -> Discrepancy check should show 0 discrepancies
    Repository.update(Schema.TABLES.MASTER_ITEMS, 'IT-001', { current_stock: 15 }, 'item_code');
    const auditClean = LedgerService.checkDiscrepancies();
    assert(auditClean.has_discrepancy === false, 'Zero discrepancy when master stock matches ledger');

    // Now intentionally desynchronize master item stock to 20
    Repository.update(Schema.TABLES.MASTER_ITEMS, 'IT-001', { current_stock: 20 }, 'item_code');
    const auditDesync = LedgerService.checkDiscrepancies();
    assert(auditDesync.has_discrepancy === true, 'Discrepancy detected when master stock does not match ledger');
    assert(auditDesync.discrepancies[0].discrepancy === 5, 'Detected discrepancy of +5');

  } catch (error) {
    results.testsFailed++;
    results.details.push({ status: 'ERROR', error: error.message, stack: error.stack });
  }

  return results;
}
