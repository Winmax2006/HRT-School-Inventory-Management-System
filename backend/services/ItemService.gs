/**
 * ItemService.gs - Master Inventory Catalog & Health Logic
 * Layer: Domain Service Layer
 * Standard: Pure Business Rules, Zero Direct Sheet Access
 */

const ItemService = (function() {
  function calculateStockHealth(currentStock, minStock) {
    const current = Number(currentStock) || 0;
    const min = Number(minStock) || 0;

    if (current <= 0) return 'OUT_OF_STOCK';
    if (min > 0 && current <= Math.floor(min / 2)) return 'CRITICAL';
    if (min > 0 && current <= min) return 'LOW';
    return 'NORMAL';
  }

  function getAllItems(filters = {}) {
    const items = Repository.findAll(Schema.TABLES.MASTER_ITEMS);

    return items
      .map(item => {
        const health = calculateStockHealth(item.current_stock, item.min_stock);
        const totalValue = (Number(item.unit_price) || 0) * (Number(item.current_stock) || 0);
        return {
          ...item,
          stock_health: health,
          total_value: Math.round(totalValue * 100) / 100
        };
      })
      .filter(item => {
        if (filters.category && filters.category !== 'all') {
          if (String(item.category).trim() !== String(filters.category).trim()) return false;
        }
        if (filters.status && filters.status !== 'all') {
          if (String(item.status).toLowerCase() !== String(filters.status).toLowerCase()) return false;
        }
        if (filters.health && filters.health !== 'all') {
          if (item.stock_health !== filters.health) return false;
        }
        if (filters.search) {
          const q = String(filters.search).toLowerCase().trim();
          const matchCode = String(item.item_code || '').toLowerCase().includes(q);
          const matchName = String(item.item_name || '').toLowerCase().includes(q);
          const matchCategory = String(item.category || '').toLowerCase().includes(q);
          if (!matchCode && !matchName && !matchCategory) return false;
        }
        return true;
      });
  }

  function getItemByCode(itemCode) {
    if (!itemCode) {
      throw ErrorService.createError(ErrorService.ERROR_CODES.VALIDATION_ERROR, 'item_code is required');
    }
    const cleanCode = String(itemCode).trim();
    const item = Repository.findById(Schema.TABLES.MASTER_ITEMS, cleanCode, 'item_code');
    if (!item) {
      throw ErrorService.createError(
        ErrorService.ERROR_CODES.NOT_FOUND,
        `Item with code "${itemCode}" not found in inventory catalog`,
        { itemCode }
      );
    }

    const health = calculateStockHealth(item.current_stock, item.min_stock);
    const totalValue = (Number(item.unit_price) || 0) * (Number(item.current_stock) || 0);
    return {
      ...item,
      stock_health: health,
      total_value: Math.round(totalValue * 100) / 100
    };
  }

  function createItem(payload) {
    const clean = ValidationService.sanitizeObject(payload);
    ValidationService.validateRequired(clean, ['item_code', 'item_name', 'category', 'unit', 'unit_price']);

    const unitPrice = ValidationService.validatePositiveNumber(clean.unit_price, 'unit_price');
    const minStock = ValidationService.validateNonNegativeNumber(clean.min_stock || 0, 'min_stock');
    const rop = ValidationService.validateNonNegativeNumber(clean.rop || minStock, 'rop');
    const initialStock = ValidationService.validateNonNegativeNumber(clean.current_stock || 0, 'current_stock');

    const cleanCode = String(clean.item_code).trim().toUpperCase();
    const existing = Repository.findById(Schema.TABLES.MASTER_ITEMS, cleanCode, 'item_code');
    if (existing) {
      throw ErrorService.createError(
        ErrorService.ERROR_CODES.CONFLICT,
        `Item code "${cleanCode}" already exists in Master_Items catalog`,
        { itemCode: cleanCode }
      );
    }

    const newItem = {
      item_id: clean.item_id || `ITM-${cleanCode}`,
      item_code: cleanCode,
      item_name: clean.item_name,
      category: clean.category,
      warehouse: clean.warehouse || 'ห้องพัสดุกลาง ชั้น 1',
      unit: clean.unit,
      unit_price: unitPrice,
      min_stock: minStock,
      rop: rop,
      current_stock: initialStock,
      supplier: clean.supplier || '',
      status: clean.status || 'ACTIVE',
      updated_at: new Date().toISOString()
    };

    return Repository.insert(Schema.TABLES.MASTER_ITEMS, newItem);
  }

  function updateItem(itemCode, updates) {
    if (!itemCode) {
      throw ErrorService.createError(ErrorService.ERROR_CODES.VALIDATION_ERROR, 'item_code is required');
    }
    const cleanCode = String(itemCode).trim().toUpperCase();
    getItemByCode(cleanCode); // Ensures item exists

    const cleanUpdates = ValidationService.sanitizeObject(updates);
    if (cleanUpdates.unit_price !== undefined) {
      cleanUpdates.unit_price = ValidationService.validatePositiveNumber(cleanUpdates.unit_price, 'unit_price');
    }
    if (cleanUpdates.min_stock !== undefined) {
      cleanUpdates.min_stock = ValidationService.validateNonNegativeNumber(cleanUpdates.min_stock, 'min_stock');
    }
    if (cleanUpdates.current_stock !== undefined) {
      cleanUpdates.current_stock = ValidationService.validateNonNegativeNumber(cleanUpdates.current_stock, 'current_stock');
    }

    delete cleanUpdates.item_code; // Immutable code
    cleanUpdates.updated_at = new Date().toISOString();

    return Repository.update(Schema.TABLES.MASTER_ITEMS, cleanCode, cleanUpdates, 'item_code');
  }

  function getLowStockItems() {
    return getAllItems().filter(item => item.stock_health === 'LOW' || item.stock_health === 'CRITICAL' || item.stock_health === 'OUT_OF_STOCK');
  }

  return {
    calculateStockHealth,
    getAllItems,
    getItemByCode,
    createItem,
    updateItem,
    getLowStockItems
  };
})();
