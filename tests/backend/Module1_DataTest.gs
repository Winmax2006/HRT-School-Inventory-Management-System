/**
 * Module1_DataTest.gs - Regression & Invariant Test for Data Layer (Module 1)
 * Scope: Schema.gs, IdService.gs, Database.gs, Repository.gs
 */

function runModule1DataTest() {
  const results = {
    suite: 'Module 1: Data Layer & Persistence',
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
    // 1. Schema Definitions Test
    const requiredTables = [
      'Master_Items', 'Stock_Ledger', 'Transactions',
      'Requisitions', 'Requisition_Items', 'Users', 'Audit_Trail', 'Settings'
    ];
    requiredTables.forEach(table => {
      const headers = Schema.getHeaders(table);
      assert(headers && headers.length > 0, `Schema Headers: ${table}`, `Expected columns for ${table}`);
    });

    // 2. Schema Object / Row Serialization Test
    const sampleItemObj = {
      item_id: 'ITM-001',
      item_code: 'OFF-001',
      item_name: 'กระดาษ A4',
      category: 'วัสดุสำนักงาน',
      unit: 'รีม',
      unit_price: 115.5,
      min_stock: 20,
      current_stock: 45
    };
    const row = Schema.mapObjectToRow(Schema.TABLES.MASTER_ITEMS, sampleItemObj);
    assert(row[1] === 'OFF-001' && row[6] === 115.5 && row[9] === 45, 'Schema.mapObjectToRow serialization');

    const mappedBack = Schema.mapRowToObject(Schema.TABLES.MASTER_ITEMS, row, Schema.getHeaders(Schema.TABLES.MASTER_ITEMS));
    assert(mappedBack.item_code === 'OFF-001' && mappedBack.unit_price === 115.5, 'Schema.mapRowToObject deserialization');

    // 3. IdService Test
    const reqId = IdService.generateRequisitionId(42, 2567);
    assert(reqId === 'REQ-2567-0042', 'IdService.generateRequisitionId format', `Got: ${reqId}`);

    const ledId = IdService.generateLedgerId(1, 2567);
    assert(ledId === 'LED-2567-00001', 'IdService.generateLedgerId format', `Got: ${ledId}`);

    const uuid = IdService.generateUuid();
    assert(uuid && uuid.length === 36 && uuid.includes('-'), 'IdService.generateUuid format', `Got: ${uuid}`);

    // 4. Database & Repository CRUD Test
    Database.resetMockStore();
    // Initialize Master_Items with headers
    Database.appendRow(Schema.TABLES.MASTER_ITEMS, Schema.getHeaders(Schema.TABLES.MASTER_ITEMS));

    Repository.insert(Schema.TABLES.MASTER_ITEMS, sampleItemObj);
    const found = Repository.findById(Schema.TABLES.MASTER_ITEMS, 'OFF-001', 'item_code');
    assert(found && found.item_name === 'กระดาษ A4', 'Repository.insert & findById');

    Repository.update(Schema.TABLES.MASTER_ITEMS, 'OFF-001', { current_stock: 50 }, 'item_code');
    const updated = Repository.findById(Schema.TABLES.MASTER_ITEMS, 'OFF-001', 'item_code');
    assert(updated && updated.current_stock === 50, 'Repository.update stock value');

    // 5. Immutable Ledger Enforcement Test
    Database.appendRow(Schema.TABLES.STOCK_LEDGER, Schema.getHeaders(Schema.TABLES.STOCK_LEDGER));
    const ledgerEntry = {
      ledger_id: 'LED-2567-00001',
      item_code: 'OFF-001',
      qty_in: 10,
      balance_after: 55
    };
    Repository.insert(Schema.TABLES.STOCK_LEDGER, ledgerEntry);

    let ledgerUpdateThrew = false;
    try {
      Repository.update(Schema.TABLES.STOCK_LEDGER, 'LED-2567-00001', { balance_after: 999 }, 'ledger_id');
    } catch (e) {
      ledgerUpdateThrew = true;
    }
    assert(ledgerUpdateThrew, 'Double-Entry Invariant: Stock_Ledger update prohibited');

    let ledgerDeleteThrew = false;
    try {
      Repository.deleteRecord(Schema.TABLES.STOCK_LEDGER, 'LED-2567-00001', 'ledger_id');
    } catch (e) {
      ledgerDeleteThrew = true;
    }
    assert(ledgerDeleteThrew, 'Double-Entry Invariant: Stock_Ledger delete prohibited');

  } catch (error) {
    results.testsFailed++;
    results.details.push({ status: 'ERROR', error: error.message, stack: error.stack });
  }

  return results;
}
