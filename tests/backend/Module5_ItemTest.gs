/**
 * Module5_ItemTest.gs - Regression Test for Inventory Item Service & API (Module 5)
 * Scope: ItemService.gs, ItemApi.gs
 */

function runModule5ItemTest() {
  const results = {
    suite: 'Module 5: Item Service & Item API',
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
    // 1. Stock Health Classification Test
    assert(ItemService.calculateStockHealth(0, 20) === 'OUT_OF_STOCK', '0 stock is OUT_OF_STOCK');
    assert(ItemService.calculateStockHealth(5, 20) === 'CRITICAL', '5 stock (<= min/2) is CRITICAL');
    assert(ItemService.calculateStockHealth(15, 20) === 'LOW', '15 stock (<= min) is LOW');
    assert(ItemService.calculateStockHealth(25, 20) === 'NORMAL', '25 stock (> min) is NORMAL');

    // Reset Mock Store & Initialize Tables
    Database.resetMockStore();
    Database.appendRow(Schema.TABLES.MASTER_ITEMS, Schema.getHeaders(Schema.TABLES.MASTER_ITEMS));
    Database.appendRow(Schema.TABLES.USERS, Schema.getHeaders(Schema.TABLES.USERS));
    AuthService.ensureDefaultUsers();

    // 2. Create Item Test
    const createdItem = ItemService.createItem({
      item_code: 'OFF-001',
      item_name: 'กระดาษ A4 70 แกรม Double A',
      category: 'วัสดุสำนักงาน',
      unit: 'รีม',
      unit_price: 115.00,
      min_stock: 20,
      current_stock: 45
    });
    assert(createdItem.item_code === 'OFF-001', 'ItemService.createItem created item');

    // 3. Duplicate Item Code Conflict Test
    let dupThrew = false;
    try {
      ItemService.createItem({
        item_code: 'OFF-001',
        item_name: 'กระดาษ A4 ซ้ำ',
        category: 'วัสดุสำนักงาน',
        unit: 'รีม',
        unit_price: 115.00
      });
    } catch (e) {
      dupThrew = true;
      assert(e.code === ErrorService.ERROR_CODES.CONFLICT, 'Duplicate throws CONFLICT error code');
    }
    assert(dupThrew, 'ItemService.createItem blocks duplicate item code');

    // 4. Item Detail & Calculation
    const detail = ItemService.getItemByCode('OFF-001');
    assert(detail.total_value === 5175, 'total_value is 115 * 45 = 5175');
    assert(detail.stock_health === 'NORMAL', 'Stock health is NORMAL');

    // 5. Update Item
    ItemService.updateItem('OFF-001', { current_stock: 8 });
    const updated = ItemService.getItemByCode('OFF-001');
    assert(updated.current_stock === 8 && updated.stock_health === 'CRITICAL', 'Updated to 8 and health became CRITICAL');

    // 6. ItemApi Envelope & Security Check
    Auth.setMockSessionUser('teacher@school.ac.th'); // Teacher can view items
    const apiListRes = ItemApi.apiGetItems({}, 'REQ-501');
    assert(apiListRes.success === true && apiListRes.data.length === 1, 'ItemApi.apiGetItems returns success envelope');

    // Teacher cannot create item
    const apiCreateDenied = ItemApi.apiCreateItem({
      item_code: 'OFF-002',
      item_name: 'ปากกา',
      category: 'วัสดุสำนักงาน',
      unit: 'ด้าม',
      unit_price: 15
    }, 'REQ-502');
    assert(apiCreateDenied.success === false && apiCreateDenied.error.code === 'FORBIDDEN',
      'ItemApi.apiCreateItem denies Teacher with FORBIDDEN');

    // Switch to Officer -> Can create item
    Auth.setMockSessionUser('officer@school.ac.th');
    const apiCreateAllowed = ItemApi.apiCreateItem({
      item_code: 'OFF-002',
      item_name: 'ปากกา',
      category: 'วัสดุสำนักงาน',
      unit: 'ด้าม',
      unit_price: 15,
      min_stock: 10,
      current_stock: 50
    }, 'REQ-503');
    assert(apiCreateAllowed.success === true && apiCreateAllowed.data.item_code === 'OFF-002',
      'ItemApi.apiCreateItem succeeds for Officer');

  } catch (error) {
    results.testsFailed++;
    results.details.push({ status: 'ERROR', error: error.message, stack: error.stack });
  }

  return results;
}
