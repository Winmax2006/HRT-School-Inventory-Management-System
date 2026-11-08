/**
 * ==============================================================================
 * HRT School Inventory Management System - Central Database Engine
 * File: ActionService.gs
 * Description: Backend Business Actions Protected by Server-Side RBAC Enforcement
 * ==============================================================================
 * 
 * Non-Negotiable Rule:
 * EVERY SINGLE WRITE ACTION in this service MUST invoke `requirePermission(permission)`
 * as its very first operational instruction.
 * 
 * Client-side UI element states (hidden, disabled) are treated as non-authoritative.
 */

var ActionService = (function () {
  'use strict';

  var P = AuthService.PERMISSIONS;

  /**
   * Action 1: Create Master Item Catalog Record
   * Required Permission: ITEM_WRITE
   */
  function createItem(itemData) {
    var user = requirePermission(P.ITEM_WRITE);

    return Database.withLock(function () {
      var fy = Config.getActiveFiscalYear();
      var itemId = itemData.item_id || IdService.generateItemId(fy);

      var record = {
        item_id: itemId,
        item_code: itemData.item_code || ('ITM-' + Date.now().toString().slice(-6)),
        item_name: itemData.item_name,
        category_id: itemData.category_id,
        location_id: itemData.location_id,
        fsn_code: itemData.fsn_code || '',
        unit: itemData.unit || 'ชิ้น',
        unit_cost: parseFloat(itemData.unit_cost) || 0,
        min_stock: parseInt(itemData.min_stock, 10) || 5,
        reorder_point: parseInt(itemData.reorder_point, 10) || 10,
        supplier_name: itemData.supplier_name || '',
        spec_summary: itemData.spec_summary || '',
        is_active: 'TRUE'
      };

      var inserted = Database.insertRecord(Config.SHEET_NAMES.ITEMS, record);
      Database.logAudit('CREATE', Config.SHEET_NAMES.ITEMS, itemId, null, inserted, user.user_id, 'SERVER', 'Item created');
      return inserted;
    });
  }

  /**
   * Action 2: Update Master Item Catalog Record
   * Required Permission: ITEM_WRITE
   */
  function updateItem(itemId, updates) {
    var user = requirePermission(P.ITEM_WRITE);

    return Database.withLock(function () {
      var existing = Database.getRecordByPk(Config.SHEET_NAMES.ITEMS, itemId);
      if (!existing) {
        throw new Error('ITEM_NOT_FOUND: Item "' + itemId + '" does not exist.');
      }

      var updated = Database.updateRecord(Config.SHEET_NAMES.ITEMS, itemId, updates);
      Database.logAudit('UPDATE', Config.SHEET_NAMES.ITEMS, itemId, existing, updated, user.user_id, 'SERVER', 'Item updated');
      return updated;
    });
  }

  /**
   * Action 3: Create Requisition Request (แบบ พ.ด. ๑)
   * Required Permission: REQUISITION_CREATE
   * Enforces backend identity: Requester ID & Name ALWAYS bound to verified session user
   */
  function createRequisition(reqData, itemsData) {
    var user = requirePermission(P.REQUISITION_CREATE);

    if (!itemsData || itemsData.length === 0) {
      throw new Error('VALIDATION_ERROR: Requisition must contain at least one item.');
    }

    return Database.withLock(function () {
      var fy = Config.getActiveFiscalYear();
      var reqId = IdService.generateRequisitionId(fy);
      var docNo = reqData.doc_no || ('REQ-' + fy + '-' + Date.now().toString().slice(-4));
      var nowIso = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
      var today = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd');

      var header = {
        requisition_id: reqId,
        doc_no: docNo,
        fiscal_year_id: 'FY-' + fy,
        requester_id: user.user_id,          // TRUSTED BACKEND RESOLUTION
        requester_name: user.full_name,      // TRUSTED BACKEND RESOLUTION
        department: user.department || reqData.department || 'งานทั่วไป',
        purpose: reqData.purpose || 'ใช้ในการปฏิบัติงานประจำ',
        status: reqData.is_draft ? 'DRAFT' : 'SUBMITTED',
        request_date: today,
        approved_by: '',
        approved_at: '',
        rejection_note: ''
      };

      Database.insertRecord(Config.SHEET_NAMES.REQUISITIONS, header);

      var detailRows = [];
      for (var i = 0; i < itemsData.length; i++) {
        var itm = itemsData[i];
        var reqItemId = IdService.generateRequisitionItemId(reqId, i + 1);
        detailRows.push({
          req_item_id: reqItemId,
          requisition_id: reqId,
          item_id: itm.item_id,
          requested_qty: parseInt(itm.requested_qty, 10) || 1,
          approved_qty: 0,
          issued_qty: 0,
          unit: itm.unit || 'ชิ้น',
          item_status: 'PENDING',
          notes: itm.notes || ''
        });
      }

      Database.insertRecords(Config.SHEET_NAMES.REQUISITION_ITEMS, detailRows);
      Database.logAudit('CREATE', Config.SHEET_NAMES.REQUISITIONS, reqId, null, header, user.user_id, 'SERVER', 'Requisition created');

      return { header: header, items: detailRows };
    });
  }

  /**
   * Action 4: Approve Requisition Request
   * Required Permission: REQUISITION_APPROVE
   * Non-Negotiable: Approval represents managerial consent only; DOES NOT decrement physical stock
   */
  function approveRequisition(requisitionId, approvedItems) {
    var user = requirePermission(P.REQUISITION_APPROVE);

    return Database.withLock(function () {
      var req = Database.getRecordByPk(Config.SHEET_NAMES.REQUISITIONS, requisitionId);
      if (!req) {
        throw new Error('REQUISITION_NOT_FOUND: Requisition "' + requisitionId + '" does not exist.');
      }

      if (req.status !== 'SUBMITTED' && req.status !== 'UNDER_REVIEW') {
        throw new Error('INVALID_STATE_TRANSITION: Cannot approve requisition currently in status ' + req.status);
      }

      // Segregation of Duties: Approver cannot approve own requisition unless ADMIN
      if (req.requester_id === user.user_id && user.role_id !== AuthService.ROLES.ADMIN) {
        throw new Error('SOD_VIOLATION: Approvers cannot approve their own requisition requests.');
      }

      var nowIso = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
      var updatedReq = Database.updateRecord(Config.SHEET_NAMES.REQUISITIONS, requisitionId, {
        status: 'APPROVED',
        approved_by: user.user_id,
        approved_at: nowIso
      });

      // Update approved quantities in requisition items
      if (approvedItems && approvedItems.length > 0) {
        for (var i = 0; i < approvedItems.length; i++) {
          var appItem = approvedItems[i];
          Database.updateRecord(Config.SHEET_NAMES.REQUISITION_ITEMS, appItem.req_item_id, {
            approved_qty: parseInt(appItem.approved_qty, 10),
            item_status: 'APPROVED'
          });
        }
      }

      Database.logAudit('APPROVE', Config.SHEET_NAMES.REQUISITIONS, requisitionId, req, updatedReq, user.user_id, 'SERVER', 'Requisition approved');
      return updatedReq;
    });
  }

  /**
   * Action 5: Reject Requisition Request
   * Required Permission: REQUISITION_APPROVE
   */
  function rejectRequisition(requisitionId, rejectionNote) {
    var user = requirePermission(P.REQUISITION_APPROVE);

    return Database.withLock(function () {
      var req = Database.getRecordByPk(Config.SHEET_NAMES.REQUISITIONS, requisitionId);
      if (!req) {
        throw new Error('REQUISITION_NOT_FOUND: Requisition "' + requisitionId + '" does not exist.');
      }

      var nowIso = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
      var updatedReq = Database.updateRecord(Config.SHEET_NAMES.REQUISITIONS, requisitionId, {
        status: 'REJECTED',
        approved_by: user.user_id,
        approved_at: nowIso,
        rejection_note: rejectionNote || 'ไม่อนุมัติคำขอ'
      });

      Database.logAudit('REJECT', Config.SHEET_NAMES.REQUISITIONS, requisitionId, req, updatedReq, user.user_id, 'SERVER', 'Requisition rejected: ' + rejectionNote);
      return updatedReq;
    });
  }

  /**
   * Action 6: Receive Physical Stock into Inventory
   * Required Permission: STOCK_RECEIVE
   * Writes to Transactions (06), Transaction Items (07), and Append-Only Ledger (08)
   */
  function receiveStock(receiveData) {
    var user = requirePermission(P.STOCK_RECEIVE);

    return Database.withLock(function () {
      var fy = Config.getActiveFiscalYear();
      var txnId = IdService.generateTransactionId(fy);
      var today = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd');
      var nowIso = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');

      var txnHeader = {
        transaction_id: txnId,
        doc_no: receiveData.doc_no || ('RCV-' + fy + '-' + Date.now().toString().slice(-4)),
        fiscal_year_id: 'FY-' + fy,
        transaction_type: 'RECEIVE',
        ref_doc_type: receiveData.ref_doc_type || 'PURCHASE_ORDER',
        ref_doc_id: receiveData.ref_doc_id || '',
        transaction_date: today,
        performed_by: user.user_id,
        counterparty: receiveData.supplier_name || 'ผู้ขาย/ผู้จัดส่ง',
        notes: receiveData.notes || 'ตรวจรับพัสดุเข้าคลัง',
        status: 'POSTED'
      };

      Database.insertRecord(Config.SHEET_NAMES.TRANSACTIONS, txnHeader);

      var items = receiveData.items || [];
      var ledgerRows = [];
      var txnItemRows = [];

      for (var i = 0; i < items.length; i++) {
        var itm = items[i];
        var txnItemId = IdService.generateTransactionItemId(txnId, i + 1);
        var qty = parseInt(itm.quantity, 10);
        var unitCost = parseFloat(itm.unit_cost) || 0;
        var totalCost = qty * unitCost;

        txnItemRows.push({
          txn_item_id: txnItemId,
          transaction_id: txnId,
          item_id: itm.item_id,
          location_id: itm.location_id || 'LOC-MAIN',
          quantity: qty,
          unit_cost: unitCost,
          total_cost: totalCost,
          ref_req_item_id: '',
          notes: ''
        });

        var ldgId = IdService.generateLedgerId(fy);
        ledgerRows.push({
          ledger_id: ldgId,
          fiscal_year_id: 'FY-' + fy,
          entry_timestamp: nowIso,
          item_id: itm.item_id,
          location_id: itm.location_id || 'LOC-MAIN',
          movement_type: 'RECEIVE',
          transaction_id: txnId,
          txn_item_id: txnItemId,
          qty_in: qty,
          qty_out: 0,
          qty_net: qty,
          unit_cost: unitCost,
          val_in: totalCost,
          val_out: 0,
          val_net: totalCost,
          balance_qty: qty,       // Will be aggregated in ledger reconciler
          balance_val: totalCost,
          ref_doc_no: txnHeader.doc_no,
          created_by: user.user_id,
          is_voided: 'FALSE'
        });
      }

      Database.insertRecords(Config.SHEET_NAMES.TRANSACTION_ITEMS, txnItemRows);
      Database.insertRecords(Config.SHEET_NAMES.STOCK_LEDGER, ledgerRows);
      Database.logAudit('POST', Config.SHEET_NAMES.TRANSACTIONS, txnId, null, txnHeader, user.user_id, 'SERVER', 'Stock received into inventory');

      return { transaction: txnHeader, itemsCount: txnItemRows.length };
    });
  }

  /**
   * Action 7: Issue Physical Stock Against Approved Requisition
   * Required Permission: STOCK_ISSUE
   * Segregation of Duties: Only INVENTORY_OFFICER or ADMIN can physically issue stock
   */
  function issueStock(requisitionId, issueItems) {
    var user = requirePermission(P.STOCK_ISSUE);

    return Database.withLock(function () {
      var req = Database.getRecordByPk(Config.SHEET_NAMES.REQUISITIONS, requisitionId);
      if (!req) {
        throw new Error('REQUISITION_NOT_FOUND: Requisition "' + requisitionId + '" not found.');
      }

      if (req.status !== 'APPROVED' && req.status !== 'READY_TO_ISSUE' && req.status !== 'PARTIALLY_ISSUED') {
        throw new Error('INVALID_STATE_TRANSITION: Cannot issue stock for requisition in status ' + req.status);
      }

      var fy = Config.getActiveFiscalYear();
      var txnId = IdService.generateTransactionId(fy);
      var today = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd');
      var nowIso = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');

      var txnHeader = {
        transaction_id: txnId,
        doc_no: 'ISS-' + fy + '-' + Date.now().toString().slice(-4),
        fiscal_year_id: 'FY-' + fy,
        transaction_type: 'ISSUE',
        ref_doc_type: 'REQUISITION',
        ref_doc_id: requisitionId,
        transaction_date: today,
        performed_by: user.user_id,
        counterparty: req.requester_name,
        notes: 'จ่ายพัสดุตามใบเบิกเลขที่ ' + req.doc_no,
        status: 'POSTED'
      };

      Database.insertRecord(Config.SHEET_NAMES.TRANSACTIONS, txnHeader);

      var txnItems = [];
      var ledgerRows = [];

      for (var i = 0; i < issueItems.length; i++) {
        var itm = issueItems[i];
        var txnItemId = IdService.generateTransactionItemId(txnId, i + 1);
        var qty = parseInt(itm.issue_qty, 10);
        var unitCost = parseFloat(itm.unit_cost) || 0;
        var totalCost = qty * unitCost;

        txnItems.push({
          txn_item_id: txnItemId,
          transaction_id: txnId,
          item_id: itm.item_id,
          location_id: itm.location_id || 'LOC-MAIN',
          quantity: qty,
          unit_cost: unitCost,
          total_cost: totalCost,
          ref_req_item_id: itm.req_item_id,
          notes: ''
        });

        var ldgId = IdService.generateLedgerId(fy);
        ledgerRows.push({
          ledger_id: ldgId,
          fiscal_year_id: 'FY-' + fy,
          entry_timestamp: nowIso,
          item_id: itm.item_id,
          location_id: itm.location_id || 'LOC-MAIN',
          movement_type: 'ISSUE',
          transaction_id: txnId,
          txn_item_id: txnItemId,
          qty_in: 0,
          qty_out: qty,
          qty_net: -qty,
          unit_cost: unitCost,
          val_in: 0,
          val_out: totalCost,
          val_net: -totalCost,
          balance_qty: 0,
          balance_val: 0,
          ref_doc_no: req.doc_no,
          created_by: user.user_id,
          is_voided: 'FALSE'
        });

        // Update requisition detail issued_qty
        Database.updateRecord(Config.SHEET_NAMES.REQUISITION_ITEMS, itm.req_item_id, {
          issued_qty: qty,
          item_status: 'FULFILLED'
        });
      }

      Database.insertRecords(Config.SHEET_NAMES.TRANSACTION_ITEMS, txnItems);
      Database.insertRecords(Config.SHEET_NAMES.STOCK_LEDGER, ledgerRows);

      // Transition Requisition state to ISSUED
      Database.updateRecord(Config.SHEET_NAMES.REQUISITIONS, requisitionId, {
        status: 'ISSUED'
      });

      Database.logAudit('POST', Config.SHEET_NAMES.TRANSACTIONS, txnId, null, txnHeader, user.user_id, 'SERVER', 'Stock issued against requisition ' + requisitionId);
      return { transaction: txnHeader, itemsCount: txnItems.length };
    });
  }

  /**
   * Action 8: Adjust Physical Stock (Inventory Reconciliation)
   * Required Permission: STOCK_ADJUST
   */
  function adjustStock(adjustData) {
    var user = requirePermission(P.STOCK_ADJUST);

    return Database.withLock(function () {
      var fy = Config.getActiveFiscalYear();
      var txnId = IdService.generateTransactionId(fy);
      var today = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd');
      var nowIso = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');

      var txnHeader = {
        transaction_id: txnId,
        doc_no: 'ADJ-' + fy + '-' + Date.now().toString().slice(-4),
        fiscal_year_id: 'FY-' + fy,
        transaction_type: 'ADJUSTMENT',
        ref_doc_type: adjustData.ref_doc_type || 'MANUAL',
        ref_doc_id: adjustData.ref_doc_id || '',
        transaction_date: today,
        performed_by: user.user_id,
        counterparty: 'คลังพัสดุส่วนกลาง',
        notes: adjustData.reason || 'ปรับปรุงยอดพัสดุตามผลการตรวจนับ',
        status: 'POSTED'
      };

      Database.insertRecord(Config.SHEET_NAMES.TRANSACTIONS, txnHeader);

      var txnItemId = IdService.generateTransactionItemId(txnId, 1);
      var diffQty = parseInt(adjustData.difference_qty, 10);
      var unitCost = parseFloat(adjustData.unit_cost) || 0;
      var totalCost = Math.abs(diffQty) * unitCost;

      var isPositive = diffQty > 0;
      var mType = isPositive ? 'ADJUST_IN' : 'ADJUST_OUT';

      var ldgRow = {
        ledger_id: IdService.generateLedgerId(fy),
        fiscal_year_id: 'FY-' + fy,
        entry_timestamp: nowIso,
        item_id: adjustData.item_id,
        location_id: adjustData.location_id || 'LOC-MAIN',
        movement_type: mType,
        transaction_id: txnId,
        txn_item_id: txnItemId,
        qty_in: isPositive ? diffQty : 0,
        qty_out: isPositive ? 0 : Math.abs(diffQty),
        qty_net: diffQty,
        unit_cost: unitCost,
        val_in: isPositive ? totalCost : 0,
        val_out: isPositive ? 0 : totalCost,
        val_net: isPositive ? totalCost : -totalCost,
        balance_qty: 0,
        balance_val: 0,
        ref_doc_no: txnHeader.doc_no,
        created_by: user.user_id,
        is_voided: 'FALSE'
      };

      Database.insertRecord(Config.SHEET_NAMES.STOCK_LEDGER, ldgRow);
      Database.logAudit('POST', Config.SHEET_NAMES.TRANSACTIONS, txnId, null, txnHeader, user.user_id, 'SERVER', 'Stock adjusted: ' + diffQty);
      return txnHeader;
    });
  }

  /**
   * Action 9: Record Physical Count Results
   * Required Permission: PHYSICAL_COUNT
   */
  function recordPhysicalCount(countData, itemsData) {
    var user = requirePermission(P.PHYSICAL_COUNT);

    return Database.withLock(function () {
      var fy = Config.getActiveFiscalYear();
      var countId = IdService.generateCountId(fy);
      var today = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd');

      var header = {
        count_id: countId,
        fiscal_year_id: 'FY-' + fy,
        count_type: countData.count_type || 'ANNUAL_CLOSING',
        count_date: today,
        title: countData.title || ('รายงานผลการตรวจนับพัสดุประจำปี ' + fy),
        status: 'IN_PROGRESS',
        committee_head: countData.committee_head || user.full_name,
        inspector_name: countData.inspector_name || 'เจ้าหน้าที่พัสดุ',
        approver_name: countData.approver_name || 'ผู้อำนวยการโรงเรียน',
        total_items: itemsData.length,
        variance_items: 0
      };

      Database.insertRecord(Config.SHEET_NAMES.PHYSICAL_COUNTS, header);

      var details = [];
      var varianceCount = 0;

      for (var i = 0; i < itemsData.length; i++) {
        var itm = itemsData[i];
        var cId = IdService.generateCountItemId(countId, i + 1);
        var bQty = parseInt(itm.book_qty, 10);
        var cQty = parseInt(itm.counted_qty, 10);
        var vQty = cQty - bQty;
        var uCost = parseFloat(itm.unit_cost) || 0;
        var vVal = vQty * uCost;

        if (vQty !== 0) varianceCount++;

        details.push({
          count_item_id: cId,
          count_id: countId,
          item_id: itm.item_id,
          location_id: itm.location_id || 'LOC-MAIN',
          book_qty: bQty,
          counted_qty: cQty,
          variance_qty: vQty,
          unit_cost: uCost,
          variance_val: vVal,
          condition: itm.condition || 'NORMAL',
          action_needed: vQty !== 0 ? (vQty > 0 ? 'ADJUST_IN' : 'ADJUST_OUT') : 'NONE',
          is_reconciled: 'FALSE',
          notes: itm.notes || ''
        });
      }

      Database.insertRecords(Config.SHEET_NAMES.PHYSICAL_COUNT_ITEMS, details);
      Database.updateRecord(Config.SHEET_NAMES.PHYSICAL_COUNTS, countId, { variance_items: varianceCount });
      Database.logAudit('CREATE', Config.SHEET_NAMES.PHYSICAL_COUNTS, countId, null, header, user.user_id, 'SERVER', 'Physical count recorded');

      return { header: header, itemsCount: details.length, varianceCount: varianceCount };
    });
  }

  /**
   * Action 10: Close Fiscal Year
   * Required Permission: FISCAL_YEAR_CLOSE
   * High-governance action reserved exclusively for EXECUTIVE or ADMIN
   */
  function closeFiscalYear(fiscalYearId) {
    var user = requirePermission(P.FISCAL_YEAR_CLOSE);

    return Database.withLock(function () {
      var fy = Database.getRecordByPk(Config.SHEET_NAMES.FISCAL_YEARS, fiscalYearId);
      if (!fy) {
        throw new Error('FISCAL_YEAR_NOT_FOUND: Fiscal Year "' + fiscalYearId + '" not found.');
      }

      var nowIso = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
      var updatedFy = Database.updateRecord(Config.SHEET_NAMES.FISCAL_YEARS, fiscalYearId, {
        status: 'CLOSED',
        closed_at: nowIso,
        closed_by: user.user_id,
        notes: 'ปิดบัญชีรอบปีงบประมาณโดย ' + user.full_name
      });

      Database.logAudit('CLOSE_FY', Config.SHEET_NAMES.FISCAL_YEARS, fiscalYearId, fy, updatedFy, user.user_id, 'SERVER', 'Fiscal Year Closed');
      return updatedFy;
    });
  }

  /**
   * Action 11: Update System Configuration
   * Required Permission: SYSTEM_ADMIN
   * Reserved exclusively for ADMIN
   */
  function updateSystemConfig(configKey, configValue) {
    var user = requirePermission(P.SYSTEM_ADMIN);

    return Database.withLock(function () {
      var existing = Database.getRecordByPk(Config.SHEET_NAMES.SYSTEM_CONFIG, configKey);
      if (!existing) {
        throw new Error('CONFIG_KEY_NOT_FOUND: Key "' + configKey + '" not found.');
      }

      var updated = Database.updateRecord(Config.SHEET_NAMES.SYSTEM_CONFIG, configKey, {
        config_value: String(configValue),
        updated_by: user.user_id
      });

      Database.logAudit('UPDATE', Config.SHEET_NAMES.SYSTEM_CONFIG, configKey, existing, updated, user.user_id, 'SERVER', 'System Config updated');
      return updated;
    });
  }

  /**
   * Central Backend Action Dispatcher
   * Routes incoming client request to proper secured action
   * @param {string} action Action identifier
   * @param {Object} payload Request parameters
   */
  function dispatch(action, payload) {
    switch (action) {
      case 'create_item':
        return createItem(payload);
      case 'update_item':
        return updateItem(payload.item_id, payload.updates);
      case 'create_requisition':
        return createRequisition(payload.header, payload.items);
      case 'approve_requisition':
        return approveRequisition(payload.requisition_id, payload.approved_items);
      case 'reject_requisition':
        return rejectRequisition(payload.requisition_id, payload.rejection_note);
      case 'receive_stock':
        return receiveStock(payload);
      case 'issue_stock':
        return issueStock(payload.requisition_id, payload.items);
      case 'adjust_stock':
        return adjustStock(payload);
      case 'record_physical_count':
        return recordPhysicalCount(payload.header, payload.items);
      case 'close_fiscal_year':
        return closeFiscalYear(payload.fiscal_year_id);
      case 'update_system_config':
        return updateSystemConfig(payload.config_key, payload.config_value);
      default:
        throw new Error('INVALID_ACTION: Unknown backend action "' + action + '"');
    }
  }

  return {
    createItem: createItem,
    updateItem: updateItem,
    createRequisition: createRequisition,
    approveRequisition: approveRequisition,
    rejectRequisition: rejectRequisition,
    receiveStock: receiveStock,
    issueStock: issueStock,
    adjustStock: adjustStock,
    recordPhysicalCount: recordPhysicalCount,
    closeFiscalYear: closeFiscalYear,
    updateSystemConfig: updateSystemConfig,
    dispatch: dispatch
  };
})();
