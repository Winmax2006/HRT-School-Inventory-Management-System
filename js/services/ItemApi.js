/**
 * ==============================================================================
 * HRT School Inventory Management System - Frontend Service Layer
 * File: js/services/ItemApi.js
 * Description: Catalog Service, Items Read/Write & UI Cache Synchronizer
 * ==============================================================================
 * 
 * Non-Negotiable Rule:
 * allData is strictly a UI View Cache, NEVER the persistent Source of Truth.
 */

var ItemApi = (function () {
  'use strict';

  var _itemsCache = [];
  var _isLoaded = false;

  /**
   * Fetches all items from backend and populates the UI View Cache
   * @param {Object} [filters] Optional filter query
   * @returns {Promise<Object[]>} Normalized items array
   */
  async function getItems(filters) {
    var response = await ApiService.call('getItems', filters || {});
    if (response && response.success && Array.isArray(response.data)) {
      _itemsCache = response.data.map(normalizeItem);
    } else if (typeof window !== 'undefined' && Array.isArray(window.allData)) {
      _itemsCache = window.allData.map(normalizeItem);
    }

    _isLoaded = true;

    // Synchronize UI View Cache so existing rendering engines work seamlessly
    if (typeof window !== 'undefined') {
      window.allData = _itemsCache;
    }

    return _itemsCache;
  }

  /**
   * Retrieves single item by code
   * @param {string} code e.g. 'OFF-001'
   * @returns {Promise<Object|null>}
   */
  async function getItemByCode(code) {
    if (!_isLoaded || _itemsCache.length === 0) {
      await getItems();
    }
    var found = _itemsCache.find(function (i) { return i.code === code; });
    return found || null;
  }

  /**
   * Saves or creates an item through Server-side RBAC
   * @param {Object} itemData
   * @returns {Promise<Object>}
   */
  async function saveItem(itemData) {
    if (typeof UserApi !== 'undefined' && !UserApi.hasPermission('ITEM_WRITE')) {
      throw new Error('PERMISSION_DENIED: User lacks ITEM_WRITE permission');
    }

    var action = itemData.id ? 'updateItem' : 'createItem';
    var response = await ApiService.call(action, itemData, { isWrite: true });

    if (response && response.success) {
      // Update local UI cache
      var idx = _itemsCache.findIndex(function (i) { return i.code === itemData.code; });
      var normalized = normalizeItem(itemData);
      if (idx >= 0) {
        _itemsCache[idx] = normalized;
      } else {
        _itemsCache.unshift(normalized);
      }
      if (typeof window !== 'undefined') {
        window.allData = _itemsCache;
      }
    }

    return response;
  }

  /**
   * Helper to normalize item object structure
   */
  function normalizeItem(raw) {
    var stock = parseInt(raw.stock !== undefined ? raw.stock : raw.current_qty, 10) || 0;
    var min = parseInt(raw.min !== undefined ? raw.min : raw.min_stock, 10) || 5;
    var rop = parseInt(raw.rop !== undefined ? raw.rop : raw.reorder_point, 10) || Math.round(min * 1.5);
    var unitCost = parseFloat(raw.unit_cost !== undefined ? raw.unit_cost : raw.unit_price) || 0;
    var totalVal = Math.round(stock * unitCost * 100) / 100;

    var status = 'normal';
    if (stock <= min) status = 'critical';
    else if (stock <= rop) status = 'low';

    return {
      id: raw.id || raw.item_id || ('ITM-' + raw.code),
      code: raw.code || raw.item_code || '',
      name: raw.name || raw.item_name || '',
      category: raw.category || raw.category_name || 'วัสดุสำนักงาน',
      warehouse: raw.warehouse || raw.location_name || 'ห้องพัสดุกลาง',
      unit: raw.unit || 'ชิ้น',
      stock: stock,
      min: min,
      rop: rop,
      unit_cost: unitCost,
      total_val: totalVal,
      supplier: raw.supplier || raw.supplier_name || 'คู่สัญญาจัดจำหน่ายพัสดุ',
      status: status,
      history: Array.isArray(raw.history) ? raw.history : []
    };
  }

  return {
    getItems: getItems,
    getItemByCode: getItemByCode,
    saveItem: saveItem,
    normalizeItem: normalizeItem
  };
})();
