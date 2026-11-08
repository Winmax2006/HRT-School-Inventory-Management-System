/**
 * StockService.gs - Physical Stock Movement & Mutex-Protected Inventory Operations
 * Layer: Domain Service Layer
 * Standard: Double-Entry Compliant, LockService Mutex Protected
 */

const StockService = (function() {
  function withLock(callback, timeoutMs = 10000) {
    let hasGasLock = false;
    let lock = null;

    try {
      if (typeof LockService !== 'undefined') {
        lock = LockService.getScriptLock();
        hasGasLock = lock.tryLock(timeoutMs);
        if (!hasGasLock) {
          throw ErrorService.createError(
            ErrorService.ERROR_CODES.LOCK_TIMEOUT,
            'System is currently busy processing another stock transaction. Please try again in a few moments.'
          );
        }
      }
    } catch (e) {
      if (e.code === ErrorService.ERROR_CODES.LOCK_TIMEOUT) throw e;
    }

    try {
      return callback();
    } finally {
      if (hasGasLock && lock) {
        try {
          lock.releaseLock();
        } catch (err) {}
      }
    }
  }

  function receiveStock(payload) {
    return withLock(() => {
      const user = Auth.requireAuthenticated();
      RBAC.checkPermission(user.role, PermissionRegistry.ACTIONS.STOCK_RECEIVE);

      const clean = ValidationService.sanitizeObject(payload);
      ValidationService.validateRequired(clean, ['item_code', 'quantity']);

      const cleanCode = String(clean.item_code).trim().toUpperCase();
      const qty = ValidationService.validatePositiveNumber(clean.quantity, 'quantity');
      const item = ItemService.getItemByCode(cleanCode);

      const unitCost = clean.unit_cost !== undefined ?
        ValidationService.validatePositiveNumber(clean.unit_cost, 'unit_cost') :
        Number(item.unit_price) || 0;

      const currentStock = Number(item.current_stock) || 0;
      const newStock = currentStock + qty;
      const currentYear = IdService.getBuddhistYear();

      const txSeq = Repository.count(Schema.TABLES.TRANSACTIONS) + 1;
      const txId = clean.transaction_id || IdService.generateTransactionId(txSeq, currentYear);

      // 1. Double-Entry Immutable Ledger Posting via LedgerService
      const ledgerEntry = LedgerService.recordMovement({
        item_id: item.item_id,
        item_code: cleanCode,
        transaction_id: txId,
        transaction_type: 'รับเข้าสต็อก',
        qty_in: qty,
        qty_out: 0,
        unit_cost: unitCost,
        balance_after: newStock,
        fiscal_year: String(clean.fiscal_year || currentYear),
        actor_user_id: user.user_id,
        reference_type: 'PO',
        reference_id: clean.doc_no || `REC-${currentYear}-${IdService.padZero(txSeq, 4)}`,
        note: clean.note || `รับเข้าสต็อก จาก ${clean.supplier || 'ผู้จัดจำหน่าย'}`
      });

      // 2. Insert into Transactions table
      const txRecord = {
        transaction_id: txId,
        doc_no: clean.doc_no || ledgerEntry.reference_id,
        type: 'รับเข้าสต็อก',
        date: clean.date || new Date().toISOString().split('T')[0],
        teacher: `${user.name} (${user.department})`,
        department: user.department || 'กลุ่มบริหารงานงบประมาณ',
        item_code: cleanCode,
        quantity: qty,
        status: 'COMPLETED'
      };
      Repository.insert(Schema.TABLES.TRANSACTIONS, txRecord);

      // 3. Update Master_Items Current Stock and Unit Price
      ItemService.updateItem(cleanCode, {
        current_stock: newStock,
        unit_price: unitCost,
        supplier: clean.supplier || item.supplier
      });

      return {
        item_code: cleanCode,
        quantity_received: qty,
        previous_stock: currentStock,
        new_stock: newStock,
        transaction_id: txId,
        ledger_id: ledgerEntry.ledger_id
      };
    });
  }

  function issueRequisitionStock(reqId) {
    return withLock(() => {
      const user = Auth.requireAuthenticated();
      RBAC.checkPermission(user.role, PermissionRegistry.ACTIONS.REQUISITION_ISSUE);

      if (!reqId) {
        throw ErrorService.createError(ErrorService.ERROR_CODES.VALIDATION_ERROR, 'requisition_id is required');
      }

      const req = RequisitionService.getRequisitionById(reqId);
      if (req.status !== RequisitionService.STATUS.APPROVED) {
        throw ErrorService.createError(
          ErrorService.ERROR_CODES.INVALID_STATE_TRANSITION,
          `Cannot issue items for requisition in status "${req.status}". Expected: "${RequisitionService.STATUS.APPROVED}"`,
          { reqId, currentStatus: req.status }
        );
      }

      const currentYear = IdService.getBuddhistYear();
      const timestamp = new Date().toISOString();
      const issuedTransactions = [];

      // Step 1: Pre-validation of all lines to ensure balance sufficiency
      req.items.forEach(line => {
        const item = ItemService.getItemByCode(line.item_code);
        const qtyToIssue = Number(line.quantity_approved) || Number(line.quantity_requested) || 0;
        ValidationService.validateStockAvailability(qtyToIssue, item.current_stock, item.item_name);
      });

      // Step 2: Atomic Execution of deductions
      req.items.forEach((line, idx) => {
        const item = ItemService.getItemByCode(line.item_code);
        const qtyToIssue = Number(line.quantity_approved) || Number(line.quantity_requested) || 0;
        const currentStock = Number(item.current_stock) || 0;
        const newStock = currentStock - qtyToIssue;

        const txSeq = Repository.count(Schema.TABLES.TRANSACTIONS) + 1;
        const txId = IdService.generateTransactionId(txSeq, currentYear);

        // Append Ledger
        const ledgerEntry = LedgerService.recordMovement({
          item_id: item.item_id,
          item_code: item.item_code,
          transaction_id: txId,
          transaction_type: 'เบิกจ่าย',
          qty_in: 0,
          qty_out: qtyToIssue,
          unit_cost: Number(item.unit_price) || 0,
          balance_after: newStock,
          fiscal_year: req.fiscal_year || String(currentYear),
          actor_user_id: user.user_id,
          reference_type: 'REQUISITION',
          reference_id: req.requisition_id,
          note: `จ่ายตามใบเบิกเลขที่ ${req.doc_no} (${req.purpose}) ให้ ${req.requester_name}`
        });

        // Insert Transaction record
        const txRecord = {
          transaction_id: txId,
          doc_no: req.doc_no,
          type: 'เบิกใช้งาน',
          date: timestamp.split('T')[0],
          teacher: req.requester_name,
          department: req.department,
          item_code: item.item_code,
          quantity: qtyToIssue,
          status: 'COMPLETED'
        };
        Repository.insert(Schema.TABLES.TRANSACTIONS, txRecord);

        // Update Master Item stock
        ItemService.updateItem(item.item_code, {
          current_stock: newStock
        });

        // Update Requisition Line Item
        Repository.update(
          Schema.TABLES.REQUISITION_ITEMS,
          line.item_line_id,
          {
            quantity_issued: qtyToIssue,
            status: RequisitionService.STATUS.ISSUED
          },
          'item_line_id'
        );

        issuedTransactions.push({
          item_code: item.item_code,
          issued_qty: qtyToIssue,
          remaining_stock: newStock,
          transaction_id: txId,
          ledger_id: ledgerEntry.ledger_id
        });
      });

      // Step 3: Transition Requisition Header to ISSUED
      const updatedReq = Repository.update(
        Schema.TABLES.REQUISITIONS,
        reqId,
        {
          status: RequisitionService.STATUS.ISSUED,
          issued_by: `${user.name} (${user.email})`,
          issued_at: timestamp
        },
        'requisition_id'
      );

      return {
        requisition: updatedReq,
        issuedTransactions
      };
    });
  }

  function adjustStock(payload) {
    return withLock(() => {
      const user = Auth.requireAuthenticated();
      RBAC.checkPermission(user.role, PermissionRegistry.ACTIONS.STOCK_ADJUST);

      const clean = ValidationService.sanitizeObject(payload);
      ValidationService.validateRequired(clean, ['item_code', 'actual_quantity', 'reason']);

      const cleanCode = String(clean.item_code).trim().toUpperCase();
      const actualQty = ValidationService.validateNonNegativeNumber(clean.actual_quantity, 'actual_quantity');
      const item = ItemService.getItemByCode(cleanCode);

      const currentStock = Number(item.current_stock) || 0;
      const delta = actualQty - currentStock;

      if (delta === 0) {
        return {
          item_code: cleanCode,
          adjusted: false,
          current_stock: currentStock,
          message: 'Actual quantity matches current stock; no adjustment needed.'
        };
      }

      const currentYear = IdService.getBuddhistYear();
      const txSeq = Repository.count(Schema.TABLES.TRANSACTIONS) + 1;
      const txId = IdService.generateTransactionId(txSeq, currentYear);

      const qtyIn = delta > 0 ? delta : 0;
      const qtyOut = delta < 0 ? Math.abs(delta) : 0;

      const ledgerEntry = LedgerService.recordMovement({
        item_id: item.item_id,
        item_code: cleanCode,
        transaction_id: txId,
        transaction_type: 'ปรับปรุงยอด',
        qty_in: qtyIn,
        qty_out: qtyOut,
        unit_cost: Number(item.unit_price) || 0,
        balance_after: actualQty,
        fiscal_year: String(clean.fiscal_year || currentYear),
        actor_user_id: user.user_id,
        reference_type: 'STOCK_ADJUST',
        reference_id: `ADJ-${currentYear}-${IdService.padZero(txSeq, 4)}`,
        note: `ปรับปรุงยอดสต็อก: ${clean.reason} (เดิม: ${currentStock}, ปรับเป็น: ${actualQty})`
      });

      ItemService.updateItem(cleanCode, {
        current_stock: actualQty
      });

      return {
        item_code: cleanCode,
        adjusted: true,
        previous_stock: currentStock,
        new_stock: actualQty,
        delta,
        ledger_id: ledgerEntry.ledger_id
      };
    });
  }

  return {
    withLock,
    receiveStock,
    issueRequisitionStock,
    adjustStock
  };
})();
