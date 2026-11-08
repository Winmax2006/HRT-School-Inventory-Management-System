/**
 * ==============================================================================
 * HRT School Inventory Management System - Frontend Service Layer
 * File: js/services/StockApi.js
 * Description: Physical Stock Movement, Double-Entry Ledger & Audit Logging Service
 * ==============================================================================
 * 
 * Non-Negotiable Rules:
 * 1. Physical stock increases or decreases ONLY via StockApi.
 * 2. Every physical movement generates an append-only Double-Entry Ledger entry.
 * 3. Every transaction logs an immutable audit trail entry in 09_Audit_Log.
 */

var StockApi = (function () {
  'use strict';

  var _ledgerCache = [];
  var _auditCache = [];

  /**
   * Executes a physical stock issuance (Module 7: Stock Issue)
   * @param {Object} issueData { itemCode, quantity, recipient, requisitionId, notes }
   * @returns {Promise<Object>}
   */
  async function issueStock(issueData) {
    if (typeof UserApi !== 'undefined' && !UserApi.hasPermission('STOCK_ISSUE')) {
      throw new Error('PERMISSION_DENIED: User lacks STOCK_ISSUE permission');
    }

    var code = issueData.itemCode || issueData.code;
    var qty = parseInt(issueData.quantity || issueData.qty, 10);
    var recipient = issueData.recipient || issueData.teacher || 'ผู้ขอเบิก';
    var notes = issueData.notes || 'จ่ายพัสดุตามใบเบิก';

    if (!code) throw new Error('VALIDATION_ERROR: Item code is required');
    if (isNaN(qty) || qty <= 0) throw new Error('VALIDATION_ERROR: Quantity must be positive');

    // Retrieve item from cache or catalog
    var item = (typeof ItemApi !== 'undefined') ? await ItemApi.getItemByCode(code) : null;
    if (!item && typeof window !== 'undefined' && window.allData) {
      item = window.allData.find(function (i) { return i.code === code; });
    }

    if (!item) throw new Error('NOT_FOUND: Item ' + code + ' not found');
    if (item.stock < qty) {
      throw new Error('INSUFFICIENT_STOCK: Current stock is ' + item.stock + ' but requested ' + qty);
    }

    // Call Backend Action
    var response = await ApiService.call('issueStock', {
      itemCode: code,
      quantity: qty,
      recipient: recipient,
      requisitionId: issueData.requisitionId || '',
      notes: notes
    }, { isWrite: true });

    // Update physical stock in UI View Cache
    item.stock -= qty;
    item.total_val = Math.round(item.stock * item.unit_cost * 100) / 100;
    
    if (item.stock <= item.min) item.status = 'critical';
    else if (item.stock <= item.rop) item.status = 'low';
    else item.status = 'normal';

    var nowFormatted = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/');
    if (!item.history) item.history = [];
    item.history.unshift({
      code: code,
      teacher: recipient,
      qty: qty,
      date: nowFormatted,
      type: 'out',
      notes: notes
    });

    // Record local ledger entry
    var ledgerEntry = {
      ledger_id: 'LDG-' + Date.now(),
      timestamp: new Date().toISOString(),
      item_code: code,
      movement_type: 'ISSUE',
      qty_in: 0,
      qty_out: qty,
      balance_qty: item.stock,
      unit_cost: item.unit_cost,
      ref_doc_no: issueData.requisitionId || 'TXN-ISSUE',
      created_by: (typeof UserApi !== 'undefined') ? UserApi.getCurrentUser().userId : 'USR-001'
    };
    _ledgerCache.unshift(ledgerEntry);

    // Record local audit log
    _auditCache.unshift({
      audit_id: 'AUD-' + Date.now(),
      timestamp: new Date().toISOString(),
      user_id: (typeof UserApi !== 'undefined') ? UserApi.getCurrentUser().userId : 'USR-001',
      action: 'POST',
      entity_name: '08_Stock_Ledger',
      entity_id: ledgerEntry.ledger_id,
      status: 'SUCCESS',
      details: 'Issued ' + qty + ' units of ' + code + ' to ' + recipient
    });

    return {
      success: true,
      data: item,
      ledgerEntry: ledgerEntry,
      message: 'จ่ายพัสดุสำเร็จ ยอดคงเหลือคงที่ ' + item.stock + ' ' + item.unit
    };
  }

  /**
   * Executes a physical stock receive / restock (Module 8: Stock Receive)
   * @param {Object} receiveData { itemCode, quantity, supplier, docNo, unitPrice, notes }
   * @returns {Promise<Object>}
   */
  async function receiveStock(receiveData) {
    if (typeof UserApi !== 'undefined' && !UserApi.hasPermission('STOCK_RECEIVE')) {
      throw new Error('PERMISSION_DENIED: User lacks STOCK_RECEIVE permission');
    }

    var code = receiveData.itemCode || receiveData.code;
    var qty = parseInt(receiveData.quantity || receiveData.qty, 10);
    var supplier = receiveData.supplier || 'คู่สัญญาจัดจำหน่ายพัสดุ';
    var docNo = receiveData.docNo || ('RCV-' + Date.now());

    if (!code) throw new Error('VALIDATION_ERROR: Item code is required');
    if (isNaN(qty) || qty <= 0) throw new Error('VALIDATION_ERROR: Quantity must be positive');

    var item = (typeof ItemApi !== 'undefined') ? await ItemApi.getItemByCode(code) : null;
    if (!item && typeof window !== 'undefined' && window.allData) {
      item = window.allData.find(function (i) { return i.code === code; });
    }

    if (!item) throw new Error('NOT_FOUND: Item ' + code + ' not found');

    // Call Backend Action
    var response = await ApiService.call('receiveStock', {
      itemCode: code,
      quantity: qty,
      supplier: supplier,
      docNo: docNo,
      notes: receiveData.notes || 'ตรวจรับพัสดุเข้าคลัง'
    }, { isWrite: true });

    // Update physical stock in UI View Cache
    item.stock += qty;
    item.total_val = Math.round(item.stock * item.unit_cost * 100) / 100;

    if (item.stock <= item.min) item.status = 'critical';
    else if (item.stock <= item.rop) item.status = 'low';
    else item.status = 'normal';

    var nowFormatted = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/');
    if (!item.history) item.history = [];
    item.history.unshift({
      code: code,
      teacher: (typeof UserApi !== 'undefined') ? UserApi.getCurrentUser().name : 'เจ้าหน้าที่พัสดุ',
      qty: qty,
      date: nowFormatted,
      type: 'in',
      notes: 'รับเข้าสต็อก: ' + docNo
    });

    // Record local ledger entry
    var ledgerEntry = {
      ledger_id: 'LDG-' + Date.now(),
      timestamp: new Date().toISOString(),
      item_code: code,
      movement_type: 'RECEIVE',
      qty_in: qty,
      qty_out: 0,
      balance_qty: item.stock,
      unit_cost: item.unit_cost,
      ref_doc_no: docNo,
      created_by: (typeof UserApi !== 'undefined') ? UserApi.getCurrentUser().userId : 'USR-001'
    };
    _ledgerCache.unshift(ledgerEntry);

    // Record local audit log
    _auditCache.unshift({
      audit_id: 'AUD-' + Date.now(),
      timestamp: new Date().toISOString(),
      user_id: (typeof UserApi !== 'undefined') ? UserApi.getCurrentUser().userId : 'USR-001',
      action: 'POST',
      entity_name: '08_Stock_Ledger',
      entity_id: ledgerEntry.ledger_id,
      status: 'SUCCESS',
      details: 'Received ' + qty + ' units of ' + code + ' into warehouse'
    });

    return {
      success: true,
      data: item,
      ledgerEntry: ledgerEntry,
      message: 'รับพัสดุเข้าสต็อกสำเร็จ ยอดคงเหลือเพิ่มเป็น ' + item.stock + ' ' + item.unit
    };
  }

  /**
   * Retrieves stock ledger movements (Module 9: Ledger)
   * @param {Object} [filters]
   * @returns {Promise<Object[]>}
   */
  async function getLedgerEntries(filters) {
    var response = await ApiService.call('getLedgerEntries', filters || {});
    if (response && response.success && Array.isArray(response.data)) {
      _ledgerCache = response.data;
    }
    return _ledgerCache;
  }

  /**
   * Retrieves system audit logs (Module 10: Audit)
   * @param {Object} [filters]
   * @returns {Promise<Object[]>}
   */
  async function getAuditLogs(filters) {
    if (typeof UserApi !== 'undefined' && !UserApi.hasPermission('AUDIT_READ')) {
      throw new Error('PERMISSION_DENIED: User lacks AUDIT_READ permission');
    }
    var response = await ApiService.call('getAuditLogs', filters || {});
    if (response && response.success && Array.isArray(response.data)) {
      _auditCache = response.data;
    }
    return _auditCache;
  }

  return {
    issueStock: issueStock,
    receiveStock: receiveStock,
    getLedgerEntries: getLedgerEntries,
    getAuditLogs: getAuditLogs
  };
})();
