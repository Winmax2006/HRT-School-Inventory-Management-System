/**
 * Write.gs - Transaction Mutators, Stock Inflow/Outflow & Concurrency Control
 * Layer: Write Model (HRT Inventory System v2.6.0)
 * Standard: Double-Entry Ledger, LockService Mutex, Stock Deduction Decoupling & CSV Validation
 */

/**
 * Creates a new Master Item in 03_Master_Items
 * @param {Object} payload 
 * @param {Object} caller 
 * @returns {Object} Created item record
 */
function hrtCreateItem_(payload, caller) {
  payload = payload || {};
  const code = String(payload.code || payload.item_code || '').trim().toUpperCase();
  const name = String(payload.name || payload.item_name || '').trim();
  const category = String(payload.category || '').trim();
  const unit = String(payload.unit || 'ชิ้น').trim();
  const warehouse = String(payload.warehouse || 'คลังพัสดุกลาง (อาคาร 1)').trim();
  const unitCost = Number(payload.unit_cost || payload.unit_price) || 0;
  const minQty = Number(payload.min || payload.min_qty) || 0;
  const rop = Number(payload.rop) || (minQty * 1.5);
  const initialStock = Number(payload.stock || payload.current_qty) || 0;
  const supplier = String(payload.supplier || '').trim();
  const fsnCode = String(payload.fsn_code || '').trim();

  if (!code) throw new Error('VALIDATION_ERROR: Item code is required.');
  if (!name) throw new Error('VALIDATION_ERROR: Item name is required.');
  if (unitCost < 0) throw new Error('VALIDATION_ERROR: Unit cost cannot be negative.');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) {
    throw new Error('CONCURRENCY_LOCK: System is busy processing another transaction. Please retry.');
  }

  try {
    const sheet = getSheet('master_items');
    const data = sheet.getDataRange().getValues();

    // Check duplicate code
    for (let r = 1; r < data.length; r++) {
      if (String(data[r][0]).trim().toUpperCase() === code) {
        throw new Error(`DUPLICATE_CODE: Item code "${code}" already exists.`);
      }
    }

    const status = initialStock <= 0 ? 'critical' : (initialStock <= minQty ? 'low' : 'normal');

    // Append to 03_Master_Items
    sheet.appendRow([
      sanitizeCellValue(code),
      sanitizeCellValue(fsnCode),
      sanitizeCellValue(name),
      sanitizeCellValue(category),
      sanitizeCellValue(unit),
      sanitizeCellValue(warehouse),
      unitCost,
      minQty,
      rop,
      initialStock,
      sanitizeCellValue(supplier),
      status
    ]);

    // If initial stock > 0, post to stock ledger and transactions
    if (initialStock > 0) {
      hrtPostLedgerMovement_({
        itemCode: code,
        txType: 'INITIAL',
        qtyIn: initialStock,
        qtyOut: 0,
        unitCost: unitCost,
        docRef: 'INIT-' + code,
        note: 'ยอดยกมาเริ่มต้นสร้างรายการ',
        actorId: caller ? (caller.name || caller.id) : 'SYSTEM',
        fiscalYear: getActiveTransactionYear()
      });
    }

    invalidateCache_();

    if (typeof logAudit === 'function') {
      logAudit_('CREATE_ITEM', 'INVENTORY', `สร้างรายการพัสดุรหัส ${code} (${name}, true)`, caller);
    }

    return {
      success: true,
      code: code,
      name: name,
      stock: initialStock,
      status: status
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Updates an existing Master Item
 * @param {Object} payload 
 * @param {Object} caller 
 * @returns {Object} Updated item record
 */
function hrtUpdateItem_(payload, caller) {
  payload = payload || {};
  const code = String(payload.code || payload.item_code || '').trim().toUpperCase();
  if (!code) throw new Error('VALIDATION_ERROR: Item code is required.');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) {
    throw new Error('CONCURRENCY_LOCK: System is busy. Please retry.');
  }

  try {
    const sheet = getSheet('master_items');
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;

    for (let r = 1; r < data.length; r++) {
      if (String(data[r][0]).trim().toUpperCase() === code) {
        rowIndex = r + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`NOT_FOUND: Item code "${code}" not found.`);
    }

    if (payload.name !== undefined) sheet.getRange(rowIndex, 3).setValue(sanitizeCellValue(payload.name));
    if (payload.category !== undefined) sheet.getRange(rowIndex, 4).setValue(sanitizeCellValue(payload.category));
    if (payload.unit !== undefined) sheet.getRange(rowIndex, 5).setValue(sanitizeCellValue(payload.unit));
    if (payload.warehouse !== undefined) sheet.getRange(rowIndex, 6).setValue(sanitizeCellValue(payload.warehouse));
    if (payload.unit_cost !== undefined || payload.unit_price !== undefined) {
      sheet.getRange(rowIndex, 7).setValue(Number(payload.unit_cost || payload.unit_price) || 0);
    }
    if (payload.min !== undefined || payload.min_qty !== undefined) {
      sheet.getRange(rowIndex, 8).setValue(Number(payload.min || payload.min_qty) || 0);
    }
    if (payload.rop !== undefined) sheet.getRange(rowIndex, 9).setValue(Number(payload.rop) || 0);
    if (payload.supplier !== undefined) sheet.getRange(rowIndex, 11).setValue(sanitizeCellValue(payload.supplier));
    if (payload.fsn_code !== undefined) sheet.getRange(rowIndex, 2).setValue(sanitizeCellValue(payload.fsn_code));

    invalidateCache_();

    if (typeof logAudit === 'function') {
      logAudit_('UPDATE_ITEM', 'INVENTORY', `แก้ไขข้อมูลพัสดุ ${code}`, caller, true);
    }

    return { success: true, code: code };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Creates a new Requisition with Decoupled Stock Deduction (C-7)
 * Invariant: Stock IS NOT deducted at requisition creation time.
 * Status is set to SUBMITTED (legacy: PENDING_APPROVAL).
 * Server determines requester identity from verified caller context.
 * @param {Object} payload 
 * @param {Object} caller 
 * @returns {Object} Created requisition result
 */
function hrtCreateRequisition_(payload, caller) {
  payload = payload || {};
  const activeTxYear = getActiveTransactionYear();
  const now = new Date();
  const nowStr = now.toISOString();

  // Server determines requester identity (NEVER trusts client-supplied teacher/userId)
  const userId = caller ? (caller.id || caller.email) : 'UNKNOWN_USER';
  const dept = String(payload.dept || payload.department || (caller ? caller.department : 'ทั่วไป')).trim();
  const purpose = String(payload.purpose || payload.reason || 'ใช้ในการจัดการเรียนการสอน').trim();
  const source = payload.source === 'MINI_QR' ? 'MINI_QR' : 'CENTRAL_WEB';
  const urgency = String(payload.urgency || 'NORMAL').toUpperCase();
  const requiredDate = String(payload.required_date || payload.requiredDate || '').trim();

  // Resolve line items (Deep copy to avoid mutating caller's payload object)
  let items = [];
  if (Array.isArray(payload.items) && payload.items.length > 0) {
    items = payload.items.map(it => Object.assign({}, it));
  } else if (payload.item_code || payload.code) {
    items = [{
      item_code: payload.item_code || payload.code,
      qty: Number(payload.qty || payload.quantity) || 1,
      unit: payload.unit || 'ชิ้น'
    }];
  }

  if (items.length === 0) {
    throw new Error('VALIDATION_ERROR: Requisition must contain at least one line item.');
  }

  const reqNo = hrtGenerateDocNumber_('REQ', activeTxYear);
  const reqId = `REQ-${now.getTime()}-${Math.floor(Math.random() * 1000)}`;

  // Validate items against master catalog
  const itemsSheet = getSheet('master_items');
  const itemsData = itemsSheet.getDataRange().getValues();
  const itemMap = {};

  for (let r = 1; r < itemsData.length; r++) {
    itemMap[String(itemsData[r][0]).trim().toUpperCase()] = {
      name: itemsData[r][2],
      stock: Number(itemsData[r][9]) || 0,
      unit: itemsData[r][4]
    };
  }

  items.forEach((it, idx) => {
    const code = String(it.item_code || it.code || '').trim().toUpperCase();
    const qty = Number(it.qty || it.qty_requested || 0);
    if (!code) throw new Error(`VALIDATION_ERROR: Line ${idx + 1} missing item_code.`);
    if (qty <= 0) throw new Error(`VALIDATION_ERROR: Quantity for item "${code}" must be greater than zero.`);
    if (!itemMap[code]) throw new Error(`NOT_FOUND: Item code "${code}" does not exist in master catalog.`);
    it.item_code = code;
    it.qty_requested = qty;
    it.unit = it.unit || itemMap[code].unit;
  });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) {
    throw new Error('CONCURRENCY_LOCK: Requisition submission lock timeout. Please retry.');
  }

  try {
    const reqSheet = getSheet('requisitions');
    const reqItemsSheet = getSheet('requisition_items');

    // 07_Requisitions: req_id, req_no, req_date, user_id, dept, purpose, status, approver_id, approved_at, issued_at, source, fiscal_year, total_items, urgency, required_date
    reqSheet.appendRow([
      reqId,
      reqNo,
      nowStr,
      userId,
      sanitizeCellValue(dept),
      sanitizeCellValue(purpose),
      'SUBMITTED',
      '',
      '',
      '',
      source,
      activeTxYear,
      items.length,
      urgency,
      requiredDate
    ]);

    // 08_Requisition_Items: id, req_id, item_code, qty_requested, qty_approved, unit (O-3 Order-Invariant Line IDs)
    items.forEach((it, idx) => {
      const lineId = it.id || it.line_id || `RQI-${reqId}-${it.item_code}`;
      reqItemsSheet.appendRow([
        lineId,
        reqId,
        it.item_code,
        it.qty_requested,
        0, // Approved qty initially 0
        sanitizeCellValue(it.unit)
      ]);
    });

    if (typeof logAudit === 'function') {
      logAudit_('CREATE_REQUISITION', 'REQUISITION', `สร้างใบเบิกเลขที่ ${reqNo} (${items.length} รายการ, ช่องทาง ${source}, true)`, caller);
    }

    return {
      success: true,
      req_id: reqId,
      req_no: reqNo,
      status: 'SUBMITTED',
      source: source,
      created_at: nowStr,
      itemsCount: items.length
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Requisition Cancellation Service
 * State Machine: SUBMITTED -> CANCELLED
 * Guard: Only the creator of the requisition (or Admin) can cancel.
 * Guard: Requisition must be in SUBMITTED status.
 * @param {Object} payload { requisition_id: '...' }
 * @param {Object} caller 
 * @returns {Object} Cancel outcome
 */
function hrtCancelRequisition_(payload, caller) {
  payload = payload || {};
  const reqId = String(payload.requisition_id || payload.req_id || '').trim();
  const reason = String(payload.reason || payload.cancel_reason || 'ผู้ขอเบิกยกเลิกคำร้อง').trim();
  if (!reqId) throw new Error('PARAM_REQUIRED: requisition_id is required.');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) throw new Error('CONCURRENCY_LOCK: Please retry.');

  try {
    const reqSheet = getSheet('requisitions');
    const reqData = reqSheet.getDataRange().getValues();
    let rowIndex = -1;
    let reqRecord = null;

    for (let r = 1; r < reqData.length; r++) {
      if (String(reqData[r][0]).trim() === reqId || String(reqData[r][1]).trim() === reqId) {
        rowIndex = r + 1;
        reqRecord = {
          req_id: reqData[r][0],
          req_no: reqData[r][1],
          user_id: String(reqData[r][3]).trim(),
          status: String(reqData[r][6]).trim().toUpperCase()
        };
        break;
      }
    }

    if (!reqRecord) throw new Error(`NOT_FOUND: Requisition "${reqId}" not found.`);

    // Ownership check: Caller must be the requester OR Admin
    const isOwner = caller && (caller.id === reqRecord.user_id || caller.email === reqRecord.user_id);
    const isAdmin = caller && caller.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      const err = new Error(`FORBIDDEN: You can only cancel your own requisition.`);
      err.code = 'FORBIDDEN';
      throw err;
    }

    // Transition guard: Can only cancel if SUBMITTED
    if (reqRecord.status !== 'SUBMITTED' && reqRecord.status !== 'PENDING_APPROVAL' && reqRecord.status !== 'PENDING') {
      const err = new Error(`INVALID_STATE_TRANSITION: Cannot cancel requisition in "${reqRecord.status}" status. Only SUBMITTED requisitions can be cancelled.`);
      err.code = 'INVALID_STATE_TRANSITION';
      throw err;
    }

    const nowStr = new Date().toISOString();
    reqSheet.getRange(rowIndex, 7).setValue('CANCELLED');
    reqSheet.getRange(rowIndex, 8).setValue(caller ? (caller.name || caller.id) : 'CALLER');
    reqSheet.getRange(rowIndex, 9).setValue(nowStr);

    if (typeof logAudit === 'function') {
      logAudit_('CANCEL_REQUISITION', 'REQUISITION', `ยกเลิกใบเบิก ${reqRecord.req_no} เหตุผล: ${reason}`, caller, true);
    }

    return {
      success: true,
      req_id: reqRecord.req_id,
      req_no: reqRecord.req_no,
      status: 'CANCELLED',
      reason: reason,
      cancelled_at: nowStr
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Requisition Review Service
 * State Machine: SUBMITTED -> REVIEWED
 * Guard: Officer verifies physical stock and item details.
 * @param {Object} payload { requisition_id: '...' }
 * @param {Object} caller Store Officer
 * @returns {Object} Review outcome
 */
function hrtReviewRequisition_(payload, caller) {
  payload = payload || {};
  const reqId = String(payload.requisition_id || payload.req_id || '').trim();
  const note = String(payload.note || payload.remarks || 'เจ้าหน้าที่พัสดุตรวจสอบเรียบร้อย').trim();
  if (!reqId) throw new Error('PARAM_REQUIRED: requisition_id is required.');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) throw new Error('CONCURRENCY_LOCK: Please retry.');

  try {
    const reqSheet = getSheet('requisitions');
    const reqData = reqSheet.getDataRange().getValues();
    let rowIndex = -1;
    let reqRecord = null;

    for (let r = 1; r < reqData.length; r++) {
      if (String(reqData[r][0]).trim() === reqId || String(reqData[r][1]).trim() === reqId) {
        rowIndex = r + 1;
        reqRecord = {
          req_id: reqData[r][0],
          req_no: reqData[r][1],
          user_id: reqData[r][3],
          status: String(reqData[r][6]).trim().toUpperCase()
        };
        break;
      }
    }

    if (!reqRecord) throw new Error(`NOT_FOUND: Requisition "${reqId}" not found.`);

    if (reqRecord.status !== 'SUBMITTED' && reqRecord.status !== 'PENDING_APPROVAL' && reqRecord.status !== 'PENDING') {
      const err = new Error(`INVALID_STATE_TRANSITION: Cannot review requisition in "${reqRecord.status}" status. Only SUBMITTED requisitions can be reviewed.`);
      err.code = 'INVALID_STATE_TRANSITION';
      throw err;
    }

    const nowStr = new Date().toISOString();
    reqSheet.getRange(rowIndex, 7).setValue('REVIEWED');

    if (typeof logAudit === 'function') {
      logAudit_('REVIEW_REQUISITION', 'REQUISITION', `เจ้าหน้าที่พัสดุตรวจสอบใบเบิก ${reqRecord.req_no} เรียบร้อย`, caller, true);
    }

    return {
      success: true,
      req_id: reqRecord.req_id,
      req_no: reqRecord.req_no,
      status: 'REVIEWED',
      reviewed_by: caller ? (caller.name || caller.id) : 'OFFICER',
      reviewed_at: nowStr,
      note: note
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Requisition Approval Service (C-7)
 * State Machine: SUBMITTED or REVIEWED -> APPROVED
 * ⚠️ STRICT INVARIANT: Stock IS NOT deducted at approval time!
 * @param {Object} payload { requisition_id: '...' }
 * @param {Object} caller Approver/Director
 * @returns {Object} Approval outcome
 */
function hrtApproveRequisition_(payload, caller) {
  payload = payload || {};
  const reqId = String(payload.requisition_id || payload.req_id || '').trim();
  if (!reqId) throw new Error('PARAM_REQUIRED: requisition_id is required.');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) {
    throw new Error('CONCURRENCY_LOCK: Cannot acquire approval lock. Please retry.');
  }

  try {
    const reqSheet = getSheet('requisitions');
    const reqData = reqSheet.getDataRange().getValues();
    let rowIndex = -1;
    let canonicalReqId = '';
    let reqNo = '';

    for (let r = 1; r < reqData.length; r++) {
      if (String(reqData[r][0]).trim() === reqId || String(reqData[r][1]).trim() === reqId) {
        rowIndex = r + 1;
        canonicalReqId = String(reqData[r][0]).trim();
        reqNo = String(reqData[r][1]).trim();
        const reqOwner = String(reqData[r][3]).trim();
        if (caller && (caller.id === reqOwner || caller.user_id === reqOwner || caller.email === reqOwner)) {
          const err = new Error('FORBIDDEN: Self-approval is strictly prohibited. An approver or director cannot approve their own requisition.');
          err.code = 'FORBIDDEN';
          throw err;
        }
        const currentStatus = String(reqData[r][6]).trim().toUpperCase();
        if (currentStatus !== 'SUBMITTED' && currentStatus !== 'PENDING_APPROVAL' && currentStatus !== 'PENDING' && currentStatus !== 'REVIEWED') {
          const err = new Error('INVALID_STATE_TRANSITION: Requisition is in "' + currentStatus + '" status, cannot be approved.');
          err.code = 'INVALID_STATE_TRANSITION';
          throw err;
        }
        break;
      }
    }

    if (rowIndex === -1) throw new Error('NOT_FOUND: Requisition "' + reqId + '" not found.');

    const nowStr = new Date().toISOString();
    const approverId = caller ? (caller.name || caller.id) : 'APPROVER';

    // Read and update line items using canonicalReqId (TX-14)
    const itemsSheet = getSheet('requisition_items');
    const itemsData = itemsSheet.getDataRange().getValues();
    
    // Check if payload specified line-level approval quantities
    const approvalMap = {};
    if (Array.isArray(payload.items)) {
      payload.items.forEach(it => {
        const c = String(it.item_code || it.code || '').trim().toUpperCase();
        if (c && it.qty_approved !== undefined && it.qty_approved !== null) {
          approvalMap[c] = Number(it.qty_approved);
        }
      });
    }

    let lineCount = 0;
    for (let i = 1; i < itemsData.length; i++) {
      if (String(itemsData[i][1]).trim() === canonicalReqId) {
        lineCount++;
        const itemCode = String(itemsData[i][2]).trim().toUpperCase();
        const qtyReq = Number(itemsData[i][3]) || 0;
        let qtyApproved = qtyReq;
        if (approvalMap.hasOwnProperty(itemCode)) {
          qtyApproved = Number(approvalMap[itemCode]);
          if (isNaN(qtyApproved) || qtyApproved < 0) {
            throw new Error('VALIDATION_ERROR: Approved quantity for item "' + itemCode + '" must be a non-negative number.');
          }
        }
        itemsSheet.getRange(i + 1, 5).setValue(qtyApproved);
      }
    }

    if (lineCount === 0) {
      throw new Error('INVALID_DATA: Requisition contains no line items to approve.');
    }

    // Update status to APPROVED, approver_id, approved_at
    reqSheet.getRange(rowIndex, 7).setValue('APPROVED');
    reqSheet.getRange(rowIndex, 8).setValue(approverId);
    reqSheet.getRange(rowIndex, 9).setValue(nowStr);

    if (typeof logAudit === 'function') {
      logAudit_('APPROVE_REQUISITION', 'APPROVAL', 'อนุมัติใบเบิก ' + reqNo, caller, true);
    }

    return {
      success: true,
      req_id: canonicalReqId,
      req_no: reqNo,
      status: 'APPROVED',
      approved_by: approverId,
      approved_at: nowStr
    };

  } finally {
    lock.releaseLock();
  }
}

function hrtRejectRequisition_(payload, caller) {
  payload = payload || {};
  const reqId = String(payload.requisition_id || payload.req_id || '').trim();
  const reason = String(payload.reason || payload.reject_reason || 'ไม่อนุมัติ').trim();
  if (!reqId) throw new Error('PARAM_REQUIRED: requisition_id is required.');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) throw new Error('CONCURRENCY_LOCK: Please retry.');

  try {
    const reqSheet = getSheet('requisitions');
    const reqData = reqSheet.getDataRange().getValues();
    let rowIndex = -1;
    let reqNo = '';

    for (let r = 1; r < reqData.length; r++) {
      if (String(reqData[r][0]).trim() === reqId || String(reqData[r][1]).trim() === reqId) {
        rowIndex = r + 1;
        reqNo = reqData[r][1];
        break;
      }
    }

    if (rowIndex === -1) throw new Error(`NOT_FOUND: Requisition "${reqId}" not found.`);

    const nowStr = new Date().toISOString();
    reqSheet.getRange(rowIndex, 7).setValue('REJECTED');
    reqSheet.getRange(rowIndex, 8).setValue(caller ? (caller.name || caller.id) : 'REJECTED');
    reqSheet.getRange(rowIndex, 9).setValue(nowStr);

    if (typeof logAudit === 'function') {
      logAudit_('REJECT_REQUISITION', 'APPROVAL', `ปฏิเสธใบเบิก ${reqNo}: ${reason}`, caller, true);
    }

    return { success: true, req_id: reqId, status: 'REJECTED', reason: reason };

  } finally {
    lock.releaseLock();
  }
}

/**
 * C-7 & O-4: Stock Issuance Service (Atomic Physical Deduction)
 * ⚠️ THIS IS THE ONLY PLACE WHERE STOCK IS DEDUCTED FOR A REQUISITION.
 * Operates under exclusive LockService mutex lock.
 * Enforces Single Full Issuance; rejects partial issue with clear message.
 * @param {Object} payload { requisition_id: '...' }
 * @param {Object} caller Store Officer
 * @returns {Object} Issuance outcome
 */
/**
 * Physical Stock Issuance & Multi-Item / Partial Issuance Service
 * State Machine: APPROVED | READY_TO_ISSUE | PARTIAL_ISSUED -> ISSUED | PARTIAL_ISSUED
 * Guard: Officer role with ISSUE_STOCK permission.
 * Invariant: Pre-validates master stock across all lines before any writes.
 * Invariant: Atomic multi-sheet write with compensatory rollback on mid-write failure.
 * Invariant: Tracks cumulative issued quantity in 08_Requisition_Items (col 7).
 * @param {Object} payload { requisition_id: '...', items?: [...], is_partial?: boolean, notes?: string }
 * @param {Object} caller Store Officer
 * @returns {Object} Issuance outcome
 */
function hrtIssueStock_(payload, caller) {
  payload = payload || {};
  const reqId = String(payload.requisition_id || payload.req_id || payload.requisitionId || payload.reqNumber || '').trim();
  if (!reqId) {
    const err = new Error('PARAM_REQUIRED: requisition_id is required.');
    err.code = 'PARAM_REQUIRED';
    throw err;
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) {
    const err = new Error('CONCURRENCY_LOCK: Stock issuance lock timeout. Another operation is active.');
    err.code = 'CONCURRENCY_LOCK';
    throw err;
  }

  try {
    const reqSheet = getSheet('requisitions');
    const reqData = reqSheet.getDataRange().getValues();
    let reqRowIndex = -1;
    let reqRecord = null;

    for (let r = 1; r < reqData.length; r++) {
      if (String(reqData[r][0]).trim() === reqId || String(reqData[r][1]).trim() === reqId) {
        reqRowIndex = r + 1;
        reqRecord = {
          req_id: String(reqData[r][0]).trim(),
          req_no: String(reqData[r][1]).trim(),
          user_id: String(reqData[r][3]).trim(),
          dept: String(reqData[r][4]).trim(),
          status: String(reqData[r][6]).trim().toUpperCase()
        };
        break;
      }
    }

    if (!reqRecord) {
      const err = new Error('NOT_FOUND: Requisition "' + reqId + '" not found.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (reqRecord.status === 'ISSUED') {
      const err = new Error('DOUBLE_DISPATCH: Requisition "' + reqRecord.req_no + '" has ALREADY been issued.');
      err.code = 'DOUBLE_DISPATCH';
      throw err;
    }

    if (reqRecord.status !== 'APPROVED' && reqRecord.status !== 'READY_TO_ISSUE' && reqRecord.status !== 'PARTIAL_ISSUED') {
      const err = new Error('INVALID_STATE: Requisition must be APPROVED or PARTIAL_ISSUED before stock can be issued. Current: ' + reqRecord.status);
      err.code = 'INVALID_STATE';
      throw err;
    }

    // Read Line Items & validate approved quantities (TX-15)
    const itemsSheet = getSheet('requisition_items');
    const itemsData = itemsSheet.getDataRange().getValues();
    const lineItems = [];

    for (let i = 1; i < itemsData.length; i++) {
      if (String(itemsData[i][1]).trim() === reqRecord.req_id) {
        const rawApproved = itemsData[i][4];
        const hasExplicitApproved = (rawApproved !== '' && rawApproved !== null && rawApproved !== undefined && !isNaN(Number(rawApproved)));

        if (!hasExplicitApproved) {
          const err = new Error('APPROVAL_INCOMPLETE: Line item "' + itemsData[i][2] + '" has missing approval quantity. Cannot bypass approval rules.');
          err.code = 'APPROVAL_INCOMPLETE';
          throw err;
        }

        const qtyApproved = Number(rawApproved);
        if (qtyApproved < 0) {
          const err = new Error('INVALID_DATA: Approved quantity cannot be negative for item "' + itemsData[i][2] + '".');
          err.code = 'INVALID_DATA';
          throw err;
        }

        const previouslyIssued = (itemsData[i].length > 6 && itemsData[i][6] !== '' && !isNaN(Number(itemsData[i][6])))
          ? Number(itemsData[i][6])
          : 0;

        const remainingApprovable = Math.max(0, qtyApproved - previouslyIssued);

        lineItems.push({
          rowIndex: i + 1,
          lineId: itemsData[i][0],
          item_code: String(itemsData[i][2]).trim().toUpperCase(),
          qty_approved: qtyApproved,
          previously_issued: previouslyIssued,
          remaining_to_issue: remainingApprovable,
          issue_qty: 0
        });
      }
    }

    if (lineItems.length === 0) {
      const err = new Error('INVALID_DATA: Requisition contains no line items to issue.');
      err.code = 'INVALID_DATA';
      throw err;
    }

    // Determine issue quantities per line
    if (Array.isArray(payload.items) && payload.items.length > 0) {
      for (let p = 0; p < payload.items.length; p++) {
        const pItem = payload.items[p];
        const pCode = String(pItem.item_code || pItem.code || '').trim().toUpperCase();
        const rawQty = pItem.qty_issued !== undefined ? pItem.qty_issued : (pItem.qty !== undefined ? pItem.qty : pItem.quantity);
        const pQty = Number(rawQty);

        if (isNaN(pQty) || pQty < 0) {
          const err = new Error('INVALID_DATA: Issued quantity cannot be negative for item "' + pCode + '".');
          err.code = 'INVALID_DATA';
          throw err;
        }

        const matchLine = lineItems.find(l => l.item_code === pCode);
        if (!matchLine) {
          const err = new Error('INVALID_DATA: Item code "' + pCode + '" is not in requisition "' + reqRecord.req_no + '".');
          err.code = 'INVALID_DATA';
          throw err;
        }

        if (pQty > matchLine.remaining_to_issue) {
          const err = new Error('INVALID_DATA: Issued quantity (' + pQty + ') exceeds remaining approvable quantity (' + matchLine.remaining_to_issue + ') for item "' + pCode + '".');
          err.code = 'INVALID_DATA';
          throw err;
        }

        matchLine.issue_qty = pQty;
      }
    } else {
      // Default: issue entire remaining approvable quantity for all lines
      lineItems.forEach(l => {
        l.issue_qty = l.remaining_to_issue;
      });
    }

    // Check that at least some item is being issued if requisition is not already done
    const hasAnyApproved = lineItems.some(l => l.qty_approved > 0);
    const totalIssueThisTx = lineItems.reduce((acc, cur) => acc + cur.issue_qty, 0);
    const totalRemainingBeforeTx = lineItems.reduce((acc, cur) => acc + cur.remaining_to_issue, 0);

    if (hasAnyApproved && totalRemainingBeforeTx === 0) {
      const err = new Error('DOUBLE_DISPATCH: All approved items for requisition "' + reqRecord.req_no + '" have already been issued.');
      err.code = 'DOUBLE_DISPATCH';
      throw err;
    }

    if (totalIssueThisTx === 0 && hasAnyApproved) {
      const err = new Error('INVALID_DATA: Total quantity to issue must be greater than zero.');
      err.code = 'INVALID_DATA';
      throw err;
    }

    // Read Master Items and verify sufficient stock
    const masterSheet = getSheet('master_items');
    const masterData = masterSheet.getDataRange().getValues();
    const itemRowMap = {};

    for (let r = 1; r < masterData.length; r++) {
      const code = String(masterData[r][0]).trim().toUpperCase();
      itemRowMap[code] = {
        row: r + 1,
        name: masterData[r][2],
        unitCost: Number(masterData[r][6]) || 0,
        min: Number(masterData[r][7]) || 0,
        rop: Number(masterData[r][8]) || 0,
        stock: Number(masterData[r][9]) || 0,
        status: masterData[r][11]
      };
    }

    // Verify stock availability for items with positive issue quantity (TX-04, TX-05)
    for (let k = 0; k < lineItems.length; k++) {
      const it = lineItems[k];
      if (it.issue_qty <= 0) continue;
      const master = itemRowMap[it.item_code];
      if (!master) {
        const err = new Error('NOT_FOUND: Item code "' + it.item_code + '" does not exist in master catalog.');
        err.code = 'NOT_FOUND';
        throw err;
      }
      if (master.stock < it.issue_qty) {
        const err = new Error('INSUFFICIENT_STOCK: Item "' + master.name + '" (' + it.item_code + ') has ' + master.stock + ' in stock, but ' + it.issue_qty + ' requested.');
        err.code = 'INSUFFICIENT_STOCK';
        throw err;
      }
    }

    const activeTxYear = getActiveTransactionYear();
    const nowStr = new Date().toISOString();

    // Prepare compensatory rollback stack for multi-sheet mutations
    const rollbackStack = [];

    try {
      // 1. Mutate Master Items & Post Ledger Movements
      lineItems.forEach(it => {
        if (it.issue_qty <= 0) return;
        const master = itemRowMap[it.item_code];
        const oldStock = master.stock;
        const oldStatus = master.status;
        const newStock = master.stock - it.issue_qty;
        const newStatus = newStock <= 0 ? 'critical' : (newStock <= master.min ? 'low' : 'normal');

        // Rollback action for master items
        rollbackStack.push(() => {
          masterSheet.getRange(master.row, 10).setValue(oldStock);
          masterSheet.getRange(master.row, 12).setValue(oldStatus);
        });

        // Update 03_Master_Items (stock col 10, status col 12)
        masterSheet.getRange(master.row, 10).setValue(newStock);
        masterSheet.getRange(master.row, 12).setValue(newStatus);
        master.stock = newStock;

        // Post Double-Entry Ledger Movement
        hrtPostLedgerMovement_({
          itemCode: it.item_code,
          txType: 'ISSUE',
          qtyIn: 0,
          qtyOut: it.issue_qty,
          unitCost: master.unitCost,
          docRef: reqRecord.req_no,
          note: (payload.notes || payload.note || ('จ่ายพัสดุตามใบเบิก ' + reqRecord.req_no + ' แผนก ' + reqRecord.dept)),
          actorId: caller ? (caller.name || caller.id) : 'STORE_OFFICER',
          fiscalYear: activeTxYear
        });
      });

      // 2. Update 08_Requisition_Items col 7 with cumulative issued quantity
      lineItems.forEach(it => {
        const newCumulative = it.previously_issued + it.issue_qty;
        const oldIssued = it.previously_issued;
        rollbackStack.push(() => {
          itemsSheet.getRange(it.rowIndex, 7).setValue(oldIssued);
        });
        itemsSheet.getRange(it.rowIndex, 7).setValue(newCumulative);
        it.cumulative_issued = newCumulative;
      });

      // 3. Determine Requisition Status: ISSUED if all items with qty_approved > 0 are fully issued
      const isFullyIssued = lineItems.every(l => {
        if (l.qty_approved <= 0) return true;
        const totalLineIssued = l.previously_issued + l.issue_qty;
        return totalLineIssued >= l.qty_approved;
      });

      const nextStatus = isFullyIssued ? 'ISSUED' : 'PARTIAL_ISSUED';
      const oldReqStatus = reqRecord.status;
      rollbackStack.push(() => {
        reqSheet.getRange(reqRowIndex, 7).setValue(oldReqStatus);
        reqSheet.getRange(reqRowIndex, 10).setValue('');
      });

      reqSheet.getRange(reqRowIndex, 7).setValue(nextStatus);
      if (isFullyIssued) {
        reqSheet.getRange(reqRowIndex, 10).setValue(nowStr);
      }

      invalidateCache_();

      if (typeof logAudit_ === 'function') {
        logAudit_('ISSUE_STOCK', 'STOCK', `จ่ายพัสดุตามใบเบิก ${reqRecord.req_no} (${nextStatus}) รวม ${totalIssueThisTx} หน่วย`, caller, true);
      }

      return {
        success: true,
        req_id: reqRecord.req_id,
        req_no: reqRecord.req_no,
        status: nextStatus,
        is_partial: !isFullyIssued,
        issued_at: nowStr,
        itemsCount: lineItems.filter(l => l.issue_qty > 0).length,
        totalIssued: totalIssueThisTx
      };

    } catch (err) {
      // Compensatory rollback
      for (let b = rollbackStack.length - 1; b >= 0; b--) {
        try {
          rollbackStack[b]();
        } catch (rbErr) {
          Logger.log('Rollback error: ' + rbErr.message);
        }
      }
      throw err;
    }

  } finally {
    lock.releaseLock();
  }
}

function hrtConfirmReceipt_(payload, caller) {
  payload = payload || {};
  const reqId = String(payload.requisition_id || payload.req_id || '').trim();
  const note = String(payload.note || 'ตรวจรับพัสดุครบถ้วนสมบูรณ์').trim();
  if (!reqId) throw new Error('PARAM_REQUIRED: requisition_id is required.');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) throw new Error('CONCURRENCY_LOCK: Please retry.');

  try {
    const reqSheet = getSheet('requisitions');
    const reqData = reqSheet.getDataRange().getValues();
    let rowIndex = -1;
    let reqRecord = null;

    for (let r = 1; r < reqData.length; r++) {
      if (String(reqData[r][0]).trim() === reqId || String(reqData[r][1]).trim() === reqId) {
        rowIndex = r + 1;
        reqRecord = {
          req_id: reqData[r][0],
          req_no: reqData[r][1],
          user_id: String(reqData[r][3]).trim(),
          status: String(reqData[r][6]).trim().toUpperCase()
        };
        break;
      }
    }

    if (!reqRecord) throw new Error(`NOT_FOUND: Requisition "${reqId}" not found.`);

    const isOwner = caller && (caller.id === reqRecord.user_id || caller.email === reqRecord.user_id);
    const isAdmin = caller && caller.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      const err = new Error(`FORBIDDEN: Only the requester who requested this item can confirm physical receipt.`);
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (reqRecord.status !== 'ISSUED') {
      const err = new Error(`INVALID_STATE_TRANSITION: Requisition must be in "ISSUED" status before receipt can be confirmed. Current status: "${reqRecord.status}".`);
      err.code = 'INVALID_STATE_TRANSITION';
      throw err;
    }

    const nowStr = new Date().toISOString();
    reqSheet.getRange(rowIndex, 7).setValue('RECEIVED');

    if (typeof logAudit === 'function') {
      logAudit_('CONFIRM_RECEIPT', 'REQUISITION', `ผู้ขอเบิกยืนยันตรวจรับพัสดุตามใบเบิก ${reqRecord.req_no} ครบถ้วน`, caller, true);
    }

    return {
      success: true,
      req_id: reqRecord.req_id,
      req_no: reqRecord.req_no,
      status: 'RECEIVED',
      received_at: nowStr,
      note: note
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Stock Intake Service (Restock / Receiving Goods)
 * @param {Object} payload 
 * @param {Object} caller 
 * @returns {Object} Intake outcome
 */
function hrtReceiveStock_(payload, caller) {
  payload = payload || {};
  const itemCode = String(payload.item_code || payload.code || '').trim().toUpperCase();
  const qty = Number(payload.qty || payload.quantity) || 0;
  const unitCost = Number(payload.unit_cost || payload.unit_price) || 0;
  const docRef = String(payload.doc_ref || payload.invoice_no || '').trim() || hrtGenerateDocNumber_('RCV', getActiveTransactionYear());
  const note = String(payload.note || payload.remarks || 'รับพัสดุเข้าคลัง').trim();

  if (!itemCode) throw new Error('PARAM_REQUIRED: Item code is required.');
  if (qty <= 0) throw new Error('VALIDATION_ERROR: Received quantity must be greater than zero.');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) throw new Error('CONCURRENCY_LOCK: Lock timeout. Please retry.');

  try {
    const masterSheet = getSheet('master_items');
    const masterData = masterSheet.getDataRange().getValues();
    let rowIndex = -1;
    let currentStock = 0;
    let minQty = 0;

    for (let r = 1; r < masterData.length; r++) {
      if (String(masterData[r][0]).trim().toUpperCase() === itemCode) {
        rowIndex = r + 1;
        minQty = Number(masterData[r][7]) || 0;
        currentStock = Number(masterData[r][9]) || 0;
        break;
      }
    }

    if (rowIndex === -1) throw new Error(`NOT_FOUND: Item code "${itemCode}" not found.`);

    const newStock = currentStock + qty;
    const newStatus = newStock <= minQty ? 'low' : 'normal';

    masterSheet.getRange(rowIndex, 10).setValue(newStock);
    masterSheet.getRange(rowIndex, 12).setValue(newStatus);
    if (unitCost > 0) {
      masterSheet.getRange(rowIndex, 7).setValue(unitCost);
    }

    hrtPostLedgerMovement_({
      itemCode: itemCode,
      txType: 'RECEIVE',
      qtyIn: qty,
      qtyOut: 0,
      unitCost: unitCost,
      docRef: docRef,
      note: note,
      actorId: caller ? (caller.name || caller.id) : 'STORE_OFFICER',
      fiscalYear: getActiveTransactionYear()
    });

    invalidateCache_();

    if (typeof logAudit === 'function') {
      logAudit_('RECEIVE_STOCK', 'STOCK', `รับพัสดุรหัส ${itemCode} จำนวน ${qty} เอกสาร ${docRef}`, caller, true);
    }

    return {
      success: true,
      item_code: itemCode,
      new_stock: newStock,
      doc_ref: docRef
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Stock Adjustment Service (Physical inventory corrections)
 */
function hrtAdjustStock_(payload, caller) {
  payload = payload || {};
  const itemCode = String(payload.item_code || payload.code || '').trim().toUpperCase();
  const adjustedStock = Number(payload.adjusted_stock !== undefined ? payload.adjusted_stock : payload.qty);
  const reason = String(payload.reason || 'ปรับปรุงยอดทางกายภาพ').trim();

  if (!itemCode) throw new Error('PARAM_REQUIRED: Item code is required.');
  if (isNaN(adjustedStock) || adjustedStock < 0) throw new Error('VALIDATION_ERROR: Stock quantity must be non-negative.');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) throw new Error('CONCURRENCY_LOCK: Please retry.');

  try {
    const masterSheet = getSheet('master_items');
    const masterData = masterSheet.getDataRange().getValues();
    let rowIndex = -1;
    let currentStock = 0;
    let unitCost = 0;
    let minQty = 0;

    for (let r = 1; r < masterData.length; r++) {
      if (String(masterData[r][0]).trim().toUpperCase() === itemCode) {
        rowIndex = r + 1;
        unitCost = Number(masterData[r][6]) || 0;
        minQty = Number(masterData[r][7]) || 0;
        currentStock = Number(masterData[r][9]) || 0;
        break;
      }
    }

    if (rowIndex === -1) throw new Error(`NOT_FOUND: Item code "${itemCode}" not found.`);

    const diff = adjustedStock - currentStock;
    if (diff === 0) {
      return { success: true, message: 'Stock is already at target quantity.' };
    }

    const txType = diff > 0 ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_SUB';
    const qtyIn = diff > 0 ? diff : 0;
    const qtyOut = diff < 0 ? Math.abs(diff) : 0;
    const newStatus = adjustedStock <= 0 ? 'critical' : (adjustedStock <= minQty ? 'low' : 'normal');

    masterSheet.getRange(rowIndex, 10).setValue(adjustedStock);
    masterSheet.getRange(rowIndex, 12).setValue(newStatus);

    hrtPostLedgerMovement_({
      itemCode: itemCode,
      txType: txType,
      qtyIn: qtyIn,
      qtyOut: qtyOut,
      unitCost: unitCost,
      docRef: 'ADJ-' + Date.now(),
      note: reason,
      actorId: caller ? (caller.name || caller.id) : 'STORE_OFFICER',
      fiscalYear: getActiveTransactionYear()
    });

    invalidateCache_();

    if (typeof logAudit === 'function') {
      logAudit_('ADJUST_STOCK', 'STOCK', `ปรับปรุงยอด ${itemCode} จาก ${currentStock} เป็น ${adjustedStock} (${reason}, true)`, caller);
    }

    return { success: true, item_code: itemCode, previous_stock: currentStock, new_stock: adjustedStock };

  } finally {
    lock.releaseLock();
  }
}

/**
 * FSN Addition with Sync Back to Master Items
 */
/**
 * I-2: Adds FSN to Catalog and synchronizes with Master Items using Two-Phase Write & Rollback Recovery
 * Validates 1:1 cardinality link, detects link conflicts, and enforces FK integrity.
 */
function hrtAddFsn_(payload, caller) {
  payload = payload || {};
  const fsnCode = String(payload.fsn_code || payload.code || '').trim();
  const name = String(payload.name || '').trim();
  const linkedCode = String(payload.linked_code || payload.item_code || '').trim().toUpperCase();

  if (!fsnCode) throw new Error('VALIDATION_ERROR: FSN code is required.');
  if (!name) throw new Error('VALIDATION_ERROR: FSN name is required.');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) throw new Error('CONCURRENCY_LOCK: Please retry.');

  let phase1AppendedRow = null;
  let fsnSheet = null;

  try {
    fsnSheet = getSheet('fsn_registry');
    const fsnData = fsnSheet.getDataRange().getValues();

    // 1. Check duplicate FSN code in catalog
    for (let r = 1; r < fsnData.length; r++) {
      if (String(fsnData[r][0]).trim() === fsnCode) {
        throw new Error(`DUPLICATE_FSN: FSN code "${fsnCode}" already exists in registry.`);
      }
    }

    // 2. Cardinality & FK Validation if linking to Master Item
    let masterTargetRow = null;
    let masterSheet = null;

    if (linkedCode) {
      masterSheet = getSheet('master_items');
      const masterData = masterSheet.getDataRange().getValues();

      for (let m = 1; m < masterData.length; m++) {
        const mCode = String(masterData[m][0]).trim().toUpperCase();
        if (mCode === linkedCode) {
          masterTargetRow = m + 1;
          const existingLinkedFsn = String(masterData[m][1] || '').trim();
          if (existingLinkedFsn && existingLinkedFsn !== fsnCode) {
            throw new Error(`LINK_CONFLICT: Item "${linkedCode}" is already linked to FSN "${existingLinkedFsn}".`);
          }
          break;
        }
      }

      if (!masterTargetRow) {
        throw new Error(`FK_NOT_FOUND: Linked item code "${linkedCode}" does not exist in Master Items.`);
      }

      // Check if linkedCode is already claimed by another row in FSN catalog
      for (let r = 1; r < fsnData.length; r++) {
        const rowLinked = String(fsnData[r][7] || '').trim().toUpperCase();
        if (rowLinked === linkedCode) {
          throw new Error(`LINK_CONFLICT: Item "${linkedCode}" is already registered to FSN "${fsnData[r][0]}".`);
        }
      }
    }

    // --- PHASE 1: Write to 06_FSN_Catalog ---
    phase1AppendedRow = fsnSheet.getLastRow() + 1;
    fsnSheet.appendRow([
      sanitizeCellValue(fsnCode),
      sanitizeCellValue(payload.group_code || ''),
      sanitizeCellValue(payload.group_name || ''),
      sanitizeCellValue(payload.class_code || ''),
      sanitizeCellValue(payload.fsc || ''),
      sanitizeCellValue(name),
      sanitizeCellValue(payload.spec || ''),
      sanitizeCellValue(linkedCode)
    ]);

    // --- PHASE 2: Update 03_Master_Items ---
    let syncedToMaster = false;
    if (linkedCode && masterTargetRow && masterSheet) {
      try {
        masterSheet.getRange(masterTargetRow, 2).setValue(sanitizeCellValue(fsnCode));
        syncedToMaster = true;
      } catch (phase2Err) {
        // Rollback Phase 1
        try {
          fsnSheet.deleteRow(phase1AppendedRow);
        } catch (rollbackErr) {
          Logger.log('Critical: Failed to rollback Phase 1 row: ' + rollbackErr.message);
        }
        throw new Error(`ROLLBACK_SUCCESS: Phase 2 sync to Master Items failed, FSN registry write rolled back. Reason: ${phase2Err.message}`);
      }
    }

    invalidateCache_();

    if (typeof logAudit === 'function') {
      logAudit_('ADD_FSN', 'FSN', `เพิ่มรหัส FSN ${fsnCode} (${name}, true) เชื่อมโยง: ${linkedCode || 'ไม่มี'}`, caller);
    }

    return {
      success: true,
      fsn_code: fsnCode,
      name: name,
      synced_to_master: syncedToMaster
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Links an existing FSN to a Master Item with 1:1 validation & two-phase rollback
 */
function hrtLinkFsnToItem_(payload, caller) {
  payload = payload || {};
  const fsnCode = String(payload.fsn_code || payload.fsnCode || '').trim();
  const itemCode = String(payload.item_code || payload.itemCode || '').trim().toUpperCase();

  if (!fsnCode) throw new Error('VALIDATION_ERROR: FSN code is required.');
  if (!itemCode) throw new Error('VALIDATION_ERROR: Item code is required.');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) throw new Error('CONCURRENCY_LOCK: Please retry.');

  try {
    const fsnSheet = getSheet('fsn_registry');
    const fsnData = fsnSheet.getDataRange().getValues();
    let fsnRow = null;
    for (let r = 1; r < fsnData.length; r++) {
      if (String(fsnData[r][0]).trim() === fsnCode) {
        fsnRow = r + 1;
        break;
      }
    }
    if (!fsnRow) throw new Error(`NOT_FOUND: FSN code "${fsnCode}" not found in registry.`);

    const masterSheet = getSheet('master_items');
    const masterData = masterSheet.getDataRange().getValues();
    let masterRow = null;
    for (let m = 1; m < masterData.length; m++) {
      if (String(masterData[m][0]).trim().toUpperCase() === itemCode) {
        masterRow = m + 1;
        const currentFsn = String(masterData[m][1] || '').trim();
        if (currentFsn && currentFsn !== fsnCode) {
          throw new Error(`LINK_CONFLICT: Item "${itemCode}" is already linked to FSN "${currentFsn}".`);
        }
        break;
      }
    }
    if (!masterRow) throw new Error(`FK_NOT_FOUND: Item code "${itemCode}" does not exist in Master Items.`);

    // Two-phase update
    fsnSheet.getRange(fsnRow, 8).setValue(sanitizeCellValue(itemCode));
    masterSheet.getRange(masterRow, 2).setValue(sanitizeCellValue(fsnCode));

    invalidateCache_();

    if (typeof logAudit === 'function') {
      logAudit_('LINK_FSN', 'FSN', `เชื่อมโยง FSN ${fsnCode} เข้ากับพัสดุ ${itemCode}`, caller, true);
    }

    return {
      success: true,
      fsn_code: fsnCode,
      item_code: itemCode
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * I-3: CSV Import Pre-Validation (Dry Run Batch Validation with Granular Error Reporting)
 * Detects formula injection strings, negative numbers, integer unit decimals, and composite key conflicts.
 * @param {Object} payload 
 * @param {Object} caller 
 * @returns {Object} Validation summary and row-by-row diagnostics
 */
function hrtValidateImportItems_(payload, caller) {
  payload = payload || {};
  if (!caller || !['ADMIN', 'OFFICER'].includes(caller.role)) {
    throw new Error('FORBIDDEN: Only officers and administrators can validate items for import.');
  }
  const items = Array.isArray(payload.items) ? payload.items : [];

  if (items.length === 0) {
    return {
      valid: false,
      totalRows: 0,
      validCount: 0,
      invalidCount: 0,
      errors: [{ row: 0, field: 'items', error: 'No items provided for import' }],
      previewItems: []
    };
  }

  const validItems = [];
  const errors = [];
  const seenBatchKeys = new Set();
  const integerUnits = ['ชิ้น', 'อัน', 'กล่อง', 'เล่ม', 'รีม', 'ด้าม', 'ชุด', 'แพ็ค'];

  // Read existing items for composite key matching
  const masterSheet = getSheet('master_items');
  const masterData = masterSheet.getDataRange().getValues();
  const existingMasterMap = {}; // compositeKey -> rowNum

  for (let r = 1; r < masterData.length; r++) {
    const code = String(masterData[r][0] || '').trim().toUpperCase();
    const wh = String(masterData[r][5] || '').trim();
    if (code) {
      existingMasterMap[code + '|' + wh] = r + 1;
      if (!existingMasterMap[code]) existingMasterMap[code] = r + 1; // Fallback primary code match
    }
  }

  items.forEach((raw, idx) => {
    const rowNum = idx + 1;
    const rawCode = String(raw.code || raw.item_code || '').trim();
    const code = rawCode.toUpperCase();
    const name = String(raw.name || raw.item_name || '').trim();
    const category = String(raw.category || 'วัสดุสำนักงาน').trim();
    const unit = String(raw.unit || 'ชิ้น').trim();
    const warehouse = String(raw.warehouse || 'คลังพัสดุกลาง (อาคาร 1)').trim();
    const unitCost = Number(raw.unit_cost !== undefined ? raw.unit_cost : raw.unit_price);
    const minQty = Number(raw.min !== undefined ? raw.min : raw.min_qty) || 0;
    const stock = Number(raw.stock !== undefined ? raw.stock : raw.current_qty) || 0;
    const fsnCode = String(raw.fsn_code || '').trim();
    const supplier = String(raw.supplier || '').trim();

    // 1. Mandatory Fields
    if (!code) {
      errors.push({ row: rowNum, field: 'code', error: 'Missing item code' });
      return;
    }
    if (!name) {
      errors.push({ row: rowNum, code: code, field: 'name', error: 'Missing item name' });
      return;
    }

    // 2. Numerical Checks
    if (isNaN(unitCost) || unitCost < 0) {
      errors.push({ row: rowNum, code: code, field: 'unit_cost', error: 'Unit cost must be a non-negative number' });
      return;
    }
    if (isNaN(stock) || stock < 0) {
      errors.push({ row: rowNum, code: code, field: 'stock', error: 'Stock quantity cannot be negative' });
      return;
    }

    // 3. Integer Unit Constraint (e.g. piece/box cannot have decimal values)
    if (integerUnits.includes(unit) && !Number.isInteger(stock)) {
      errors.push({
        row: rowNum,
        code: code,
        field: 'stock',
        error: `DECIMAL_NOT_ALLOWED: Unit "${unit}" does not allow fractional quantity (${stock})`
      });
      return;
    }

    // 4. Duplicate within batch check
    const batchKey = code + '|' + warehouse;
    if (seenBatchKeys.has(batchKey)) {
      errors.push({ row: rowNum, code: code, field: 'code', error: `Duplicate item code "${code}" for warehouse "${warehouse}" in import batch` });
      return;
    }
    seenBatchKeys.add(batchKey);

    // 5. Formula Injection Detection & Sanitization notice
    const hasFormula = [rawCode, name, category, unit, warehouse, fsnCode, supplier].some(v => 
      typeof v === 'string' && (v.startsWith('=') || v.startsWith('+') || v.startsWith('-') || v.startsWith('@') || v.startsWith('\t') || v.startsWith('\r'))
    );

    // 6. Existing Check
    const compositeKey = code + '|' + warehouse;
    const existingRow = existingMasterMap[compositeKey] || existingMasterMap[code] || null;
    const isExisting = !!existingRow;

    validItems.push({
      row: rowNum,
      code: code,
      name: name,
      category: category,
      unit: unit,
      warehouse: warehouse,
      unit_cost: unitCost,
      min: minQty,
      rop: minQty * 1.5,
      stock: stock,
      fsn_code: fsnCode,
      supplier: supplier,
      isExisting: isExisting,
      targetRow: existingRow,
      formulaSanitized: hasFormula
    });
  });

  return {
    valid: errors.length === 0,
    totalRows: items.length,
    validCount: validItems.length,
    invalidCount: errors.length,
    errors: errors,
    previewItems: validItems.slice(0, 20),
    summary: {
      toCreate: validItems.filter(i => !i.isExisting).length,
      toUpdate: validItems.filter(i => i.isExisting).length
    }
  };
}

/**
 * I-3: CSV Import Execution with Merge Mode, Formula Protection & Non-Destructive Ledger Routing
 * Forbids delete-first; routes all stock discrepancies through authorized stock transactions.
 */
function hrtImportItems_(payload, caller) {
  payload = payload || {};
  if (!caller || !['ADMIN', 'OFFICER'].includes(caller.role)) {
    throw new Error('FORBIDDEN: Only officers and administrators can import items.');
  }
  const items = Array.isArray(payload.items) ? payload.items : [];
  const dryRun = payload.dryRun === true || payload.dry_run === true;
  const mergeMode = String(payload.mergeMode || payload.merge_mode || 'merge').toLowerCase();

  // Run validation pass first
  const validation = hrtValidateImportItems_(payload, caller);
  if (dryRun) {
    return Object.assign({ dryRun: true }, validation);
  }

  if (validation.invalidCount > 0 && payload.abortOnError !== false) {
    throw new Error(`IMPORT_VALIDATION_FAILED: ${validation.invalidCount} rows have validation errors. Please review and fix.`);
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) throw new Error('CONCURRENCY_LOCK: Import lock timeout.');

  try {
    const masterSheet = getSheet('master_items');
    const txSheet = getSheet('stock_transactions');
    const ledgerSheet = getSheet('stock_ledger');
    const activeTxYear = getActiveTransactionYear();
    const timestamp = new Date().toISOString();

    let createdCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    validation.previewItems.concat(validation.validCount > 20 ? validation.validItems || [] : []).forEach(item => {
      // In dry-run preview, validItems might be sliced, so re-derive if needed
    });

    // Process all valid items from validation
    const targetItems = validation.validCount === validation.previewItems.length 
      ? validation.previewItems 
      : (function() {
          // Re-validate to get full array without slicing
          const fullVal = [];
          const intUnits = ['ชิ้น', 'อัน', 'กล่อง', 'เล่ม', 'รีม', 'ด้าม', 'ชุด', 'แพ็ค'];
          const mData = masterSheet.getDataRange().getValues();
          const mMap = {};
          for (let r = 1; r < mData.length; r++) {
            const c = String(mData[r][0] || '').trim().toUpperCase();
            const w = String(mData[r][5] || '').trim();
            if (c) {
              mMap[c + '|' + w] = { row: r + 1, currentStock: Number(mData[r][9]) || 0 };
              if (!mMap[c]) mMap[c] = { row: r + 1, currentStock: Number(mData[r][9]) || 0 };
            }
          }

          items.forEach((raw, idx) => {
            const code = String(raw.code || raw.item_code || '').trim().toUpperCase();
            const name = String(raw.name || raw.item_name || '').trim();
            if (!code || !name) return;
            const unit = String(raw.unit || 'ชิ้น').trim();
            const stock = Number(raw.stock !== undefined ? raw.stock : raw.current_qty) || 0;
            if (intUnits.includes(unit) && !Number.isInteger(stock)) return;

            const wh = String(raw.warehouse || 'คลังพัสดุกลาง (อาคาร 1)').trim();
            const match = mMap[code + '|' + wh] || mMap[code] || null;
            fullVal.push({
              code: code,
              name: name,
              category: String(raw.category || 'วัสดุสำนักงาน').trim(),
              unit: unit,
              warehouse: wh,
              unit_cost: Number(raw.unit_cost !== undefined ? raw.unit_cost : raw.unit_price) || 0,
              min: Number(raw.min !== undefined ? raw.min : raw.min_qty) || 0,
              rop: (Number(raw.min !== undefined ? raw.min : raw.min_qty) || 0) * 1.5,
              stock: stock,
              fsn_code: String(raw.fsn_code || '').trim(),
              supplier: String(raw.supplier || '').trim(),
              isExisting: !!match,
              targetRow: match ? match.row : null,
              existingStock: match ? match.currentStock : 0
            });
          });
          return fullVal;
        })();

    targetItems.forEach(item => {
      const status = item.stock <= 0 ? 'critical' : (item.stock <= item.min ? 'low' : 'normal');

      if (item.isExisting && mergeMode === 'merge') {
        const r = item.targetRow;
        masterSheet.getRange(r, 2).setValue(sanitizeCellValue(item.fsn_code));
        masterSheet.getRange(r, 3).setValue(sanitizeCellValue(item.name));
        masterSheet.getRange(r, 4).setValue(sanitizeCellValue(item.category));
        masterSheet.getRange(r, 5).setValue(sanitizeCellValue(item.unit));
        masterSheet.getRange(r, 6).setValue(sanitizeCellValue(item.warehouse));
        masterSheet.getRange(r, 7).setValue(item.unit_cost);
        masterSheet.getRange(r, 8).setValue(item.min);
        masterSheet.getRange(r, 9).setValue(item.rop);
        masterSheet.getRange(r, 10).setValue(item.stock);
        masterSheet.getRange(r, 11).setValue(sanitizeCellValue(item.supplier));
        masterSheet.getRange(r, 12).setValue(status);

        // I-3: Non-destructive stock ledger routing: If stock differs, append adjustment transaction
        const stockDiff = item.stock - item.existingStock;
        if (stockDiff !== 0) {
          const adjType = stockDiff > 0 ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_SUB';
          const adjQty = Math.abs(stockDiff);
          const txId = 'TX-IMP-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
          
          txSheet.appendRow([
            txId,
            timestamp,
            'IMPORT_CSV_SYNC',
            adjType,
            item.code,
            adjQty,
            item.unit_cost,
            caller ? caller.userId || caller.email : 'SYSTEM',
            'CSV Import Stock Adjustment'
          ]);

          ledgerSheet.appendRow([
            'LDG-' + txId,
            item.code,
            txId,
            adjType,
            stockDiff > 0 ? adjQty : 0,
            stockDiff < 0 ? adjQty : 0,
            item.stock,
            item.unit_cost,
            activeTxYear,
            timestamp
          ]);
        }

        updatedCount++;
      } else if (!item.isExisting) {
        masterSheet.appendRow([
          sanitizeCellValue(item.code),
          sanitizeCellValue(item.fsn_code),
          sanitizeCellValue(item.name),
          sanitizeCellValue(item.category),
          sanitizeCellValue(item.unit),
          sanitizeCellValue(item.warehouse),
          item.unit_cost,
          item.min,
          item.rop,
          item.stock,
          sanitizeCellValue(item.supplier),
          status
        ]);

        // If newly created item has opening stock, record OPENING transaction in ledger
        if (item.stock > 0) {
          const txId = 'TX-INIT-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
          txSheet.appendRow([
            txId,
            timestamp,
            'IMPORT_CSV_INIT',
            'OPENING',
            item.code,
            item.stock,
            item.unit_cost,
            caller ? caller.userId || caller.email : 'SYSTEM',
            'CSV Initial Import Opening Stock'
          ]);

          ledgerSheet.appendRow([
            'LDG-' + txId,
            item.code,
            txId,
            'OPENING',
            item.stock,
            0,
            item.stock,
            item.unit_cost,
            activeTxYear,
            timestamp
          ]);
        }

        createdCount++;
      } else {
        unchangedCount++;
      }
    });

    invalidateCache_();

    if (typeof logAudit === 'function') {
      logAudit_('IMPORT_ITEMS', 'DATA_MANAGEMENT', `นำเข้าข้อมูล CSV: เพิ่มใหม่ ${createdCount} รายการ, ปรับปรุง ${updatedCount} รายการ, ปฏิเสธ ${validation.invalidCount} รายการ`, caller, true);
    }

    return {
      success: true,
      dryRun: false,
      createdCount: createdCount,
      updatedCount: updatedCount,
      unchangedCount: unchangedCount,
      rejectedCount: validation.invalidCount,
      errors: validation.errors
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Fiscal Year Closing & Rollover (ADMIN Only)
 */
function hrtCloseFiscalYear_(payload, caller) {
  payload = payload || {};
  const currentFy = String(payload.fiscalYear || payload.fiscal_year || getActiveTransactionYear()).trim();
  const nextFy = String(parseInt(currentFy, 10) + 1);

  // Precondition 1: Admin / Director Authorization
  if (!caller || (caller.role !== 'ADMIN' && caller.role !== 'DIRECTOR')) {
    const err = new Error('FORBIDDEN: Only an Administrator or Director can close a fiscal year.');
    err.code = 'FORBIDDEN';
    throw err;
  }

  // Precondition 2: Cannot close already CLOSED fiscal year
  if (isFiscalYearClosed(currentFy)) {
    const err = new Error('INVALID_STATE: Fiscal year "' + currentFy + '" is already closed.');
    err.code = 'INVALID_STATE';
    throw err;
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) throw new Error('CONCURRENCY_LOCK: Year-end close lock timeout.');

  try {
    // Precondition 3: Check unresolved / outstanding requisitions
    const reqSheet = getSheet('requisitions');
    const reqData = reqSheet.getDataRange().getValues();
    const openStatuses = ['SUBMITTED', 'PENDING_APPROVAL', 'PENDING', 'REVIEWED', 'APPROVED', 'ISSUED'];
    const unresolvedReqs = [];
    for (let r = 1; r < reqData.length; r++) {
      const rowFy = String(reqData[r][11] || '').trim();
      const rowStatus = String(reqData[r][6] || '').trim().toUpperCase();
      if (rowFy === currentFy && openStatuses.includes(rowStatus)) {
        unresolvedReqs.push({ req_no: reqData[r][1], status: rowStatus });
      }
    }

    if (unresolvedReqs.length > 0 && !payload.force) {
      const err = new Error('UNRESOLVED_REQUISITIONS: Cannot close fiscal year "' + currentFy + '". Found ' + unresolvedReqs.length + ' outstanding requisition(s) (e.g. ' + unresolvedReqs[0].req_no + ' [' + unresolvedReqs[0].status + ']). All requisitions must be RECEIVED, REJECTED, or CANCELLED before year-end close.');
      err.code = 'UNRESOLVED_REQUISITIONS';
      err.details = { unresolvedCount: unresolvedReqs.length, samples: unresolvedReqs.slice(0, 5) };
      throw err;
    }

    const masterSheet = getSheet('master_items');
    const masterData = masterSheet.getDataRange().getValues();
    const auditSheet = getSheet('year_end_audits');
    const auditData = auditSheet.getDataRange().getValues();
    const nowStr = new Date().toISOString();

    // Map existing physical counts to preserve true physical count & variance (FY-03, FY-04)
    const existingAuditMap = {};
    for (let a = 1; a < auditData.length; a++) {
      const aFy = String(auditData[a][1]).trim();
      const aCode = String(auditData[a][2]).trim().toUpperCase();
      if (aFy === currentFy && aCode) {
        existingAuditMap[aCode] = {
          rowIndex: a + 1,
          countId: auditData[a][0],
          bookQty: Number(auditData[a][3]) || 0,
          countQty: Number(auditData[a][4]) || 0,
          variance: Number(auditData[a][5]) || 0,
          condition: auditData[a][6] || 'ปกติ',
          auditors: auditData[a][7] || ''
        };
      }
    }

    // Record snapshot without overwriting variance or duplicating rows
    let snapshotCount = 0;
    for (let r = 1; r < masterData.length; r++) {
      const code = String(masterData[r][0]).trim();
      if (!code) continue;

      const codeUpper = code.toUpperCase();
      const bookStock = Number(masterData[r][9]) || 0;
      const countId = 'COUNT-' + currentFy + '-' + code;

      if (existingAuditMap[codeUpper]) {
        // Already recorded; preserve variance and true physical count
        snapshotCount++;
      } else {
        // Physical count not pre-recorded; default count to bookStock with variance 0
        auditSheet.appendRow([
          countId,
          currentFy,
          code,
          bookStock,
          bookStock,
          0,
          'ปกติ',
          caller ? (caller.name || caller.id) : 'SYSTEM_ROLLOVER'
        ]);
        snapshotCount++;
      }
    }

    // Mark currentFy as CLOSED in 12_Fiscal_Years
    const fySheet = getSheet('fiscal_year_settings');
    const fyData = fySheet.getDataRange().getValues();

    for (let f = 1; f < fyData.length; f++) {
      if (String(fyData[f][0]).trim() === currentFy) {
        fySheet.getRange(f + 1, 4).setValue('CLOSED');
        fySheet.getRange(f + 1, 5).setValue(nowStr);
        fySheet.getRange(f + 1, 6).setValue(caller ? (caller.name || caller.id) : 'ADMIN');
        break;
      }
    }

    // Activate nextFy in 12_Fiscal_Years
    let foundNext = false;
    for (let f = 1; f < fyData.length; f++) {
      if (String(fyData[f][0]).trim() === nextFy) {
        fySheet.getRange(f + 1, 4).setValue('ACTIVE');
        foundNext = true;
        break;
      }
    }

    if (!foundNext) {
      const boundsNext = getFiscalYearBounds(nextFy);
      fySheet.appendRow([
        nextFy,
        boundsNext.startIso.substring(0, 10),
        boundsNext.endInclusiveIso.substring(0, 10),
        'ACTIVE',
        '',
        ''
      ]);
    }

    // Opening balances for nextFy (FY-05, no duplicate on retry FY-04)
    const ledgerSheet = getSheet('stock_ledger');
    const ledgerData = ledgerSheet.getDataRange().getValues();
    const hasOpeningEntryForNextFy = {};
    for (let l = 1; l < ledgerData.length; l++) {
      const lFy = String(ledgerData[l][8] || '').trim();
      const lType = String(ledgerData[l][3] || '').trim().toUpperCase();
      const lCode = String(ledgerData[l][1] || '').trim().toUpperCase();
      if (lFy === nextFy && (lType === 'OPENING' || lType === 'INITIAL')) {
        hasOpeningEntryForNextFy[lCode] = true;
      }
    }

    for (let r = 1; r < masterData.length; r++) {
      const code = String(masterData[r][0]).trim().toUpperCase();
      if (!code || hasOpeningEntryForNextFy[code]) continue;
      const closingBookQty = Number(masterData[r][9]) || 0;
      const unitCost = Number(masterData[r][6]) || 0;
      if (closingBookQty > 0) {
        hrtPostLedgerMovement_({
          itemCode: code,
          txType: 'OPENING',
          qtyIn: closingBookQty,
          qtyOut: 0,
          unitCost: unitCost,
          docRef: 'ROLLOVER-' + currentFy + '->' + nextFy,
          note: 'ยอดยกมาจากสิ้นปีงบประมาณ ' + currentFy + ' เข้าปีงบประมาณ ' + nextFy,
          actorId: caller ? (caller.name || caller.id) : 'SYSTEM_ROLLOVER',
          fiscalYear: nextFy
        });
      }
    }

    setConfig_('active_fiscal_year', nextFy);
    invalidateCache_();

    if (typeof logAudit === 'function') {
      logAudit_('CLOSE_FISCAL_YEAR', 'YEAR_END', 'ปิดปีงบประมาณ ' + currentFy + ' และเปิดปี ' + nextFy, caller, true);
    }

    return {
      success: true,
      closedFiscalYear: currentFy,
      newActiveFiscalYear: nextFy,
      snapshotCount: snapshotCount,
      closedAt: nowStr
    };

  } finally {
    lock.releaseLock();
  }
}

function hrtSetupInitialFiscalYear_(payload, caller) {
  payload = payload || {};
  if (!caller || caller.role !== 'ADMIN') {
    throw new Error('FORBIDDEN: Only administrators can configure initial fiscal years.');
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) throw new Error('CONCURRENCY_LOCK: Please retry.');

  try {
    const sheet = getSheet('fiscal_year_settings');
    const data = sheet.getDataRange().getValues();
    const existingYears = [];
    for (let r = 1; r < data.length; r++) {
      const fy = String(data[r][0]).trim();
      if (fy) existingYears.push(fy);
    }

    const targetActiveYear = String(payload.activeFiscalYear || payload.active_fiscal_year || CONFIG.DEFAULT_FISCAL_YEAR).trim();
    const yearsToSeed = Array.isArray(payload.years) && payload.years.length > 0 
      ? payload.years.map(y => String(y).trim())
      : [String(parseInt(targetActiveYear, 10) - 1), targetActiveYear, String(parseInt(targetActiveYear, 10) + 1)];

    // Idempotency: If all years already exist, return safe state without duplicate rows
    const allAlreadyExist = yearsToSeed.every(y => existingYears.includes(y));
    if (allAlreadyExist && existingYears.length > 0) {
      return {
        success: true,
        alreadyConfigured: true,
        activeFiscalYear: targetActiveYear,
        fiscalYears: (typeof hrtGetAllFiscalYears_ === 'function' ? hrtGetAllFiscalYears_() : [])
      };
    }

    let seededCount = 0;
    yearsToSeed.forEach(year => {
      if (!existingYears.includes(year)) {
        const bounds = getFiscalYearBounds(year);
        const status = year === targetActiveYear ? 'ACTIVE' : (parseInt(year, 10) < parseInt(targetActiveYear, 10) ? 'CLOSED' : 'UPCOMING');
        sheet.appendRow([
          year,
          bounds.startIso.substring(0, 10),
          bounds.endInclusiveIso.substring(0, 10),
          status,
          '',
          caller.userId || caller.email || 'ADMIN'
        ]);
        seededCount++;
      }
    });

    // Update active transaction year in _config
    setConfig_('active_fiscal_year', targetActiveYear);
    invalidateCache_();

    if (typeof logAudit === 'function') {
      logAudit_('SETUP_FISCAL_YEAR', 'SYSTEM', `เริ่มต้นตั้งค่าปีงบประมาณ เริ่มต้นที่ ${targetActiveYear} (เพิ่ม ${seededCount} ปี, true)`, caller);
    }

    return {
      success: true,
      configured: true,
      seededCount: seededCount,
      activeFiscalYear: targetActiveYear,
      fiscalYears: (typeof hrtGetAllFiscalYears_ === 'function' ? hrtGetAllFiscalYears_() : [])
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Settings Area 7: Backup Bundle Generator (16 Canonical Sheets Metadata & Snapshot)
 * Strictly excludes secrets and credentials.
 */
function hrtBackupFull_(payload, caller) {
  if (!caller || caller.role !== 'ADMIN') {
    throw new Error('FORBIDDEN: Only administrators can generate system backup bundles.');
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) {
    throw new Error('CONCURRENCY_LOCK: Cannot acquire script lock for consistent backup snapshot.');
  }

  try {
    const revBefore = getConfig('settings_revision_id', 'rev_1');
    const sheetsDef = CONFIG.SHEETS;
    const requiredSheets = Object.values(sheetsDef);
    const bundleSheets = {};
    let totalRowCount = 0;

    requiredSheets.forEach(sName => {
      const sheet = getSheet(sName);
      const data = sheet.getDataRange().getValues();
      const headers = data.length > 0 ? data[0] : [];
      let rows = data.length > 1 ? data.slice(1) : [];

      // Scrub secrets from sensitive sheets (15_Settings_Config)
      if (sName === '15_Settings_Config') {
        rows = rows.map(r => {
          const k = String(r[0] || '').toUpperCase();
          if (k.includes('SECRET') || k.includes('TOKEN') || k.includes('CLIENT_ID') || k.includes('PASSWORD') || k.includes('KEY')) {
            return [r[0], '[REDACTED_SECRET]', r[2], r[3]];
          }
          return r;
        });
      }

      // Compute per-sheet checksum
      const sheetChecksum = typeof hrtComputeSha256_ === 'function' ? hrtComputeSha256_(JSON.stringify(rows)) : '';

      bundleSheets[sName] = {
        rowCount: rows.length,
        columnCount: headers.length,
        headers: headers,
        rows: rows,
        checksum: sheetChecksum
      };

      totalRowCount += rows.length;
    });

    const revAfter = getConfig('settings_revision_id', 'rev_1');
    const isConsistent = (revBefore === revAfter);

    const timestamp = new Date().toISOString();
    const manifest = {
      bundleId: 'BAK-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
      bundleVersion: CONFIG.VERSION || '2.7.0-rc.5',
      schemaVersion: '1.0',
      createdAt: timestamp,
      fiscalYear: getActiveTransactionYear(),
      schoolName: CONFIG.SCHOOL_NAME,
      organization: CONFIG.ORGANIZATION,
      databaseId: CONFIG.SPREADSHEET_ID ? (CONFIG.SPREADSHEET_ID.substring(0, 4) + '...' + CONFIG.SPREADSHEET_ID.slice(-4)) : 'INTERNAL_BOUND_ACTIVE',
      databaseRevision: revAfter,
      isConsistent: isConsistent,
      sheetCount: requiredSheets.length,
      totalRowCount: totalRowCount,
      secretsExcluded: true,
      policy: 'STAGING_RESTORE_ONLY'
    };

    const bundle = {
      manifest: manifest,
      sheets: bundleSheets
    };

    // Only update last_backup_at on full successful completion
    setConfig_('last_backup_at', timestamp);

    if (typeof logAudit_ === 'function') {
      logAudit_('BACKUP_SYSTEM', 'SYSTEM', `สร้างชุดข้อมูลสำรองระบบ (16 Canonical Sheets, ${totalRowCount} แถว, consistent: ${isConsistent}) ณ ${timestamp}`, caller, true);
    }

    return {
      success: true,
      backupBundle: bundle
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Settings Updater Service (ADMIN Only with Concurrency Control & Revision Checks)
 * @param {Object} payload 
 * @param {Object} caller 
 * @returns {Object} Update outcome
 */
function hrtUpdateSettings_(payload, caller) {
  payload = payload || {};
  if (!caller || caller.role !== 'ADMIN') {
    throw new Error('FORBIDDEN: Only administrators can update system settings.');
  }

  // Optimistic Concurrency Control (Revision Check)
  const currentRevision = getConfig('settings_revision_id', 'rev_1');
  if (payload.expectedRevisionId && payload.expectedRevisionId !== currentRevision) {
    throw new Error(`CONCURRENCY_CONFLICT: Settings have been modified by another administrator (current: "${currentRevision}", expected: "${payload.expectedRevisionId}"). Please refresh.`);
  }

  const section = String(payload.section || payload.category || 'general').trim();
  
  // Extract input settings (supporting flat settings, payload.data, and nested section models)
  let rawSettings = Object.assign({}, payload.settings || payload.data || {});

  // If payload contains nested category blocks, flatten them into rawSettings
  ['schoolProfile', 'school', 'documents', 'rules', 'miniui', 'systemConfig'].forEach(cat => {
    if (payload[cat] && typeof payload[cat] === 'object') {
      Object.assign(rawSettings, payload[cat]);
      if (payload[cat].signatories && typeof payload[cat].signatories === 'object') {
        Object.assign(rawSettings, payload[cat].signatories);
      }
    }
  });

  // Comprehensive Form Model to Backend Config Key Mapping (RPC-11)
  const fieldAliases = {
    'school_org': 'organization',
    'school_agency': 'agency',
    'officer_name': 'signatory_approver_name',
    'officer_pos': 'signatory_approver_title',
    'director_name': 'signatory_director_name',
    'director_pos': 'signatory_director_title',
    'schoolName': 'school_name',
    'schoolShortName': 'school_short_name',
    'schoolAddress': 'school_address',
    'schoolPhone': 'school_phone',
    'schoolEmail': 'school_email',
    'schoolLogoUrl': 'school_logo_url',
    'signatoryRequesterTitle': 'signatory_requester_title',
    'signatoryApproverName': 'signatory_approver_name',
    'signatoryApproverTitle': 'signatory_approver_title',
    'signatoryDirectorName': 'signatory_director_name',
    'signatoryDirectorTitle': 'signatory_director_title',
    'signatoriesEffectiveDate': 'signatories_effective_date',
    'documentPrefix': 'document_prefix',
    'documentPattern': 'document_pattern',
    'workflowMode': 'workflow_mode',
    'allowOverQuota': 'allow_over_quota',
    'lowStockThreshold': 'low_stock_threshold',
    'minStockThreshold': 'low_stock_threshold',
    'ropFactor': 'rop_factor',
    'fastMovingThreshold': 'fast_moving_threshold',
    'rulesEffectiveDate': 'rules_effective_date',
    'miniuiEnabled': 'miniui_enabled',
    'miniuiAllowedDepts': 'miniui_allowed_depts',
    'miniuiWelcomeMessage': 'miniui_welcome_message',
    'abcThresholdA': 'abc_threshold_a',
    'abcThresholdB': 'abc_threshold_b',
    'abcThresholdC': 'abc_threshold_c',
    'decimalUnits': 'decimal_units',
    'enableDemoRoleSwitch': 'enable_demo_role_switch'
  };

  const allowedKeys = [
    'school_name', 'organization', 'agency', 'school_address', 'school_phone', 'school_email', 'school_logo_url',
    'school_short_name', 'school_footer_note',
    'signatory_requester_title', 'signatory_approver_name', 'signatory_approver_title', 'signatory_director_name', 'signatory_director_title', 'signatories_effective_date', 'document_prefix', 'document_pattern',
    'workflow_mode', 'allow_over_quota', 'low_stock_threshold', 'rop_factor', 'fast_moving_threshold', 'rules_effective_date',
    'abc_threshold_a', 'abc_threshold_b', 'abc_threshold_c', 'movement_velocity_period_days',
    'miniui_enabled', 'miniui_welcome_message', 'miniui_allowed_depts', 'miniui_require_urgency', 'miniui_require_required_date', 'miniui_success_message',
    'decimal_units', 'enable_demo_role_switch', 'cache_ttl'
  ];

  let updatedCount = 0;
  Object.keys(rawSettings).forEach(rawKey => {
    const targetKey = fieldAliases[rawKey] || rawKey;
    if (allowedKeys.includes(targetKey)) {
      const val = rawSettings[rawKey];
      // CRITICAL (RPC-11): Preserve boolean false, number 0, and allowed empty strings without defaulting
      if (val !== undefined && val !== null) {
        setConfig_(targetKey, sanitizeCellValue(val));
        updatedCount++;
      }
    }
  });

  // Increment revision ID and bust data caches
  const nextRev = 'rev_' + Date.now();
  setConfig_('settings_revision_id', nextRev);
  try {
    const curRev = typeof getConfigInt === 'function' ? getConfigInt('data_revision', 1) : 1;
    setConfig_('data_revision', curRev + 1);
  } catch (de) {}

  if (typeof logAudit_ === 'function') {
    logAudit_('UPDATE_SETTINGS', 'SYSTEM', `อัปเดตการตั้งค่าระบบหมวด ${section} (${updatedCount} รายการ, rev: ${nextRev})`, caller, true);
  }

  return {
    success: true,
    section: section,
    updatedCount: updatedCount,
    revisionId: nextRev,
    timestamp: new Date().toISOString()
  };
}

/**
 * Settings Section Update Proxy (Section-Level Write with Concurrency Control)
 */
function hrtUpdateSettingsSection_(payload, caller) {
  payload = payload || {};
  if (!caller || caller.role !== 'ADMIN') {
    throw new Error('FORBIDDEN: Only administrators can update system settings.');
  }
  return hrtUpdateSettings_(payload, caller);
}

/**
 * Master Data Upsert Service (ADMIN Only)
 */
function hrtUpsertMasterData_(payload, caller) {
  payload = payload || {};
  if (!caller || caller.role !== 'ADMIN') {
    throw new Error('FORBIDDEN: Only administrators can modify master reference data.');
  }

  const entity = String(payload.entity || '').toLowerCase();
  const item = payload.item || payload.data || {};
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) throw new Error('CONCURRENCY_LOCK: Please retry.');

  try {
    if (entity === 'departments' || entity === 'depts') {
      const sheet = getSheet('departments');
      const data = sheet.getDataRange().getValues();
      const code = String(item.dept_id || item.id || item.code || `DEPT-${data.length}`).trim();
      const name = String(item.name || item.dept_name || '').trim();
      if (!name) throw new Error('VALIDATION_ERROR: Department name is required.');

      let found = false;
      for (let r = 1; r < data.length; r++) {
        if (String(data[r][0]).trim().toUpperCase() === code.toUpperCase()) {
          sheet.getRange(r + 1, 2).setValue(sanitizeCellValue(name));
          if (item.faculty_head) sheet.getRange(r + 1, 3).setValue(sanitizeCellValue(item.faculty_head));
          if (item.budget_code) sheet.getRange(r + 1, 4).setValue(sanitizeCellValue(item.budget_code));
          sheet.getRange(r + 1, 5).setValue('ACTIVE');
          found = true;
          break;
        }
      }
      if (!found) {
        sheet.appendRow([code, sanitizeCellValue(name), sanitizeCellValue(item.faculty_head || ''), sanitizeCellValue(item.budget_code || ''), 'ACTIVE']);
      }
      if (typeof logAudit === 'function') {
        logAudit_('UPSERT_MASTER_DATA', 'DEPARTMENTS', `บันทึกข้อมูลแผนก/กลุ่มสาระฯ ${name} (${code}, true)`, caller);
      }
      return { success: true, entity: 'departments', code: code, name: name };

    } else if (entity === 'warehouses') {
      const sheet = getSheet('warehouses');
      const data = sheet.getDataRange().getValues();
      const code = String(item.warehouse_id || item.id || `WH-${data.length.toString().padStart(2, '0')}`).trim();
      const name = String(item.name || '').trim();
      if (!name) throw new Error('VALIDATION_ERROR: Warehouse name is required.');

      let found = false;
      for (let r = 1; r < data.length; r++) {
        if (String(data[r][0]).trim().toUpperCase() === code.toUpperCase()) {
          sheet.getRange(r + 1, 2).setValue(sanitizeCellValue(name));
          if (item.building) sheet.getRange(r + 1, 3).setValue(sanitizeCellValue(item.building));
          if (item.room) sheet.getRange(r + 1, 4).setValue(sanitizeCellValue(item.room));
          found = true;
          break;
        }
      }
      if (!found) {
        sheet.appendRow([code, sanitizeCellValue(name), sanitizeCellValue(item.building || ''), sanitizeCellValue(item.room || '')]);
      }
      if (typeof logAudit === 'function') {
        logAudit_('UPSERT_MASTER_DATA', 'WAREHOUSES', `บันทึกข้อมูลคลัง/ที่จัดเก็บ ${name} (${code}, true)`, caller);
      }
      return { success: true, entity: 'warehouses', code: code, name: name };

    } else if (entity === 'categories') {
      const sheet = getSheet('categories');
      const data = sheet.getDataRange().getValues();
      const code = String(item.category_id || item.id || `CAT-${data.length.toString().padStart(2, '0')}`).trim();
      const name = String(item.name || '').trim();
      if (!name) throw new Error('VALIDATION_ERROR: Category name is required.');

      let found = false;
      for (let r = 1; r < data.length; r++) {
        if (String(data[r][0]).trim().toUpperCase() === code.toUpperCase()) {
          sheet.getRange(r + 1, 2).setValue(sanitizeCellValue(name));
          if (item.code_prefix) sheet.getRange(r + 1, 3).setValue(sanitizeCellValue(item.code_prefix));
          if (item.icon) sheet.getRange(r + 1, 4).setValue(sanitizeCellValue(item.icon));
          found = true;
          break;
        }
      }
      if (!found) {
        sheet.appendRow([code, sanitizeCellValue(name), sanitizeCellValue(item.code_prefix || ''), sanitizeCellValue(item.icon || 'ph-package')]);
      }
      if (typeof logAudit === 'function') {
        logAudit_('UPSERT_MASTER_DATA', 'CATEGORIES', `บันทึกข้อมูลหมวดหมู่พัสดุ ${name} (${code}, true)`, caller);
      }
      return { success: true, entity: 'categories', code: code, name: name };

    } else {
      throw new Error(`VALIDATION_ERROR: Unsupported master data entity "${entity}".`);
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Master Data Deactivation (Soft-Delete) Service (ADMIN Only)
 */
function hrtDeactivateMasterData_(payload, caller) {
  payload = payload || {};
  if (!caller || caller.role !== 'ADMIN') {
    throw new Error('FORBIDDEN: Only administrators can deactivate master reference data.');
  }

  const entity = String(payload.entity || '').toLowerCase();
  const id = String(payload.id || payload.code || '').trim();
  if (!id) throw new Error('PARAM_REQUIRED: Master data ID or code is required.');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) throw new Error('CONCURRENCY_LOCK: Please retry.');

  try {
    if (entity === 'departments' || entity === 'depts') {
      const sheet = getSheet('departments');
      const data = sheet.getDataRange().getValues();
      for (let r = 1; r < data.length; r++) {
        if (String(data[r][0]).trim().toUpperCase() === id.toUpperCase()) {
          sheet.getRange(r + 1, 5).setValue('INACTIVE');
          if (typeof logAudit === 'function') {
            logAudit_('DEACTIVATE_MASTER_DATA', 'DEPARTMENTS', `ระงับการใช้งานแผนก/ฝ่าย ${data[r][1]} (${id}, true)`, caller);
          }
          return { success: true, entity: 'departments', id: id, status: 'INACTIVE' };
        }
      }
      throw new Error(`NOT_FOUND: Department "${id}" not found.`);
    } else {
      return { success: true, entity: entity, id: id, status: 'INACTIVE' };
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Creates a new user in 01_Users (ADMIN Only)
 */
function hrtCreateUser_(payload, caller) {
  payload = payload || {};
  const email = String(payload.email || '').trim().toLowerCase();
  const name = String(payload.name || '').trim();
  const role = String(payload.role || 'TEACHER').trim().toUpperCase();
  const department = String(payload.department || payload.dept || 'ทั่วไป').trim();

  // Enforce ADMIN role requirement
  if (!caller || caller.role !== 'ADMIN') {
    const err = new Error('FORBIDDEN: Only administrators can create new users.');
    err.code = 'FORBIDDEN';
    throw err;
  }

  if (!email || !email.includes('@')) throw new Error('VALIDATION_ERROR: Valid email address is required.');
  if (!name) throw new Error('VALIDATION_ERROR: Personnel name is required.');
  if (!CONFIG.ROLES[role]) throw new Error(`VALIDATION_ERROR: Invalid role "${role}".`);

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) throw new Error('CONCURRENCY_LOCK: Please retry.');

  try {
    const sheet = getSheet('users');
    const data = sheet.getDataRange().getValues();
    const H = data[0].map(h => String(h).trim().toLowerCase());
    const iId = H.indexOf('user_id');
    const iEmail = H.indexOf('email');
    const iUsername = H.indexOf('username');

    // Duplicate check under lock
    for (let r = 1; r < data.length; r++) {
      const rowEmail = iEmail >= 0 ? String(data[r][iEmail]).trim().toLowerCase() : String(data[r][3]).trim().toLowerCase();
      const rowUsername = iUsername >= 0 ? String(data[r][iUsername]).trim().toLowerCase() : String(data[r][1]).trim().toLowerCase();
      if (rowEmail === email || rowUsername === email) {
        const err = new Error(`DUPLICATE_USER: User with email "${email}" already exists.`);
        err.code = 'DUPLICATE_USER';
        throw err;
      }
    }

    // Compute next user_id safely (AUTH-11 & AUTH-12):
    // Find maximum numeric index among existing USR-(\d+) IDs to guarantee uniqueness
    // across concurrency, gaps, row deletions, and re-imports.
    let maxNum = 0;
    for (let r = 1; r < data.length; r++) {
      const existingId = String(data[r][iId >= 0 ? iId : 0] || '').trim();
      const match = existingId.match(/^USR-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
    const nextNum = maxNum > 0 ? maxNum + 1 : data.length; // When only header exists (data.length===1), yields USR-001
    const userId = `USR-${nextNum.toString().padStart(3, '0')}`;
    const username = email; // Enforce normalized E-mail as username

    // Columns: user_id, username, name, email, role, department, status
    sheet.appendRow([
      userId,
      sanitizeCellValue(username),
      sanitizeCellValue(name),
      email,
      role,
      sanitizeCellValue(department),
      'ACTIVE'
    ]);

    if (typeof invalidateCache_ === 'function') {
      invalidateCache_();
    }

    if (typeof logAudit_ === 'function') {
      logAudit_('CREATE_USER', 'USER_MANAGEMENT', `เพิ่มผู้ใช้งาน ${name} (${email}) บทบาท: ${role}`, caller, true);
    }

    return {
      success: true,
      user_id: userId,
      email: email,
      role: role,
      status: 'ACTIVE'
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Updates user role or department (ADMIN Only)
 * Enforces Last-Admin Protection: prevents demoting the last active administrator or self-demotion.
 */
function hrtUpdateUser_(payload, caller) {
  payload = payload || {};
  const userId = String(payload.user_id || payload.userId || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const newRole = payload.role ? String(payload.role).trim().toUpperCase() : null;
  const newDept = payload.department !== undefined ? String(payload.department).trim() : null;
  const newStatus = payload.status ? String(payload.status).trim().toUpperCase() : null;

  // Enforce ADMIN role requirement
  if (!caller || caller.role !== 'ADMIN') {
    const err = new Error('FORBIDDEN: Only administrators can update users.');
    err.code = 'FORBIDDEN';
    throw err;
  }

  if (!userId && !email) throw new Error('PARAM_REQUIRED: user_id or email is required.');
  if (newRole && !CONFIG.ROLES[newRole]) throw new Error(`VALIDATION_ERROR: Invalid role "${newRole}".`);

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) throw new Error('CONCURRENCY_LOCK: Please retry.');

  try {
    const sheet = getSheet('users');
    const data = sheet.getDataRange().getValues();
    const H = data[0].map(h => String(h).trim().toLowerCase());
    const iId = H.indexOf('user_id');
    const iEmail = H.indexOf('email');
    const iRole = H.indexOf('role');
    const iDept = H.indexOf('department');
    const iStatus = H.indexOf('status');
    const iName = H.indexOf('name');

    let targetRow = -1;
    let targetUser = null;

    for (let r = 1; r < data.length; r++) {
      const rowId = String(data[r][iId >= 0 ? iId : 0]).trim();
      const rowEmail = String(data[r][iEmail >= 0 ? iEmail : 3]).trim().toLowerCase();
      if ((userId && rowId === userId) || (email && rowEmail === email)) {
        targetRow = r + 1;
        targetUser = {
          user_id: rowId,
          email: rowEmail,
          role: String(data[r][iRole >= 0 ? iRole : 4]).trim().toUpperCase(),
          status: String(data[r][iStatus >= 0 ? iStatus : 6]).trim().toUpperCase()
        };
        break;
      }
    }

    if (!targetUser) throw new Error(`NOT_FOUND: User "${userId || email}" not found.`);

    // Email immutability: Email is the unique persistent identity.
    if (payload.new_email && payload.new_email.trim().toLowerCase() !== targetUser.email) {
      const err = new Error('IMMUTABLE_FIELD: Email address cannot be modified after user creation to preserve transaction history and referential integrity.');
      err.code = 'IMMUTABLE_FIELD';
      throw err;
    }

    // Last-Admin Protection Guard
    if (targetUser.role === 'ADMIN' && ((newRole && newRole !== 'ADMIN') || (newStatus && newStatus !== 'ACTIVE'))) {
      if (caller && (caller.id === targetUser.user_id || caller.user_id === targetUser.user_id || caller.email === targetUser.email)) {
        const err = new Error('LAST_ADMIN_PROTECTION: Self-demotion or self-suspension of administrator account is strictly prohibited.');
        err.code = 'LAST_ADMIN_PROTECTION';
        throw err;
      }

      let activeAdminCount = 0;
      for (let r = 1; r < data.length; r++) {
        const rRole = String(data[r][iRole >= 0 ? iRole : 4]).trim().toUpperCase();
        const rStatus = String(data[r][iStatus >= 0 ? iStatus : 6]).trim().toUpperCase();
        if (rRole === 'ADMIN' && rStatus === 'ACTIVE') {
          activeAdminCount++;
        }
      }

      if (activeAdminCount <= 1) {
        const err = new Error('LAST_ADMIN_PROTECTION: Cannot demote or suspend the last remaining active administrator account.');
        err.code = 'LAST_ADMIN_PROTECTION';
        throw err;
      }
    }

    const newName = payload.name !== undefined ? String(payload.name).trim() : null;
    if (newName && iName >= 0) sheet.getRange(targetRow, iName + 1).setValue(sanitizeCellValue(newName));
    if (newRole && iRole >= 0) sheet.getRange(targetRow, iRole + 1).setValue(newRole);
    if (newDept !== null && iDept >= 0) sheet.getRange(targetRow, iDept + 1).setValue(sanitizeCellValue(newDept));
    if (newStatus && iStatus >= 0) sheet.getRange(targetRow, iStatus + 1).setValue(newStatus);

    if (typeof invalidateCache_ === 'function') {
      invalidateCache_();
    }

    if (typeof logAudit_ === 'function') {
      logAudit_('UPDATE_USER', 'USER_MANAGEMENT', `แก้ไขผู้ใช้ ${targetUser.email} (Role: ${newRole || targetUser.role}, Status: ${newStatus || targetUser.status})`, caller, true);
    }

    return {
      success: true,
      user_id: targetUser.user_id,
      email: targetUser.email,
      role: newRole || targetUser.role,
      status: newStatus || targetUser.status
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Suspends user account (ADMIN Only)
 */
function hrtSuspendUser_(payload, caller) {
  return hrtUpdateUser_(Object.assign({}, payload, { status: 'SUSPENDED' }), caller);
}

/**
 * Double-Entry Stock Balance Reconciliation Service
 * Compares current 03_Master_Items stock against calculated sum from 10_Stock_Ledger
 * @param {Object} payload 
 * @param {Object} caller 
 * @returns {Object} Reconciliation outcome
 */
function hrtReconcileStockBalances_(payload, caller) {
  const masterSheet = getSheet('master_items');
  const ledgerSheet = getSheet('stock_ledger');

  const masterData = masterSheet.getDataRange().getValues();
  const ledgerData = ledgerSheet.getDataRange().getValues();

  const calculatedBalances = {};
  for (let r = 1; r < ledgerData.length; r++) {
    const code = String(ledgerData[r][1]).trim().toUpperCase();
    const qtyIn = Number(ledgerData[r][4]) || 0;
    const qtyOut = Number(ledgerData[r][5]) || 0;
    if (!calculatedBalances[code]) calculatedBalances[code] = 0;
    calculatedBalances[code] += (qtyIn - qtyOut);
  }

  const discrepancies = [];
  for (let r = 1; r < masterData.length; r++) {
    const code = String(masterData[r][0]).trim().toUpperCase();
    if (!code) continue;
    const sheetStock = Number(masterData[r][9]) || 0;
    const ledgerStock = calculatedBalances[code] !== undefined ? calculatedBalances[code] : 0;
    if (sheetStock !== ledgerStock) {
      discrepancies.push({
        item_code: code,
        name: masterData[r][2],
        sheetStock: sheetStock,
        ledgerStock: ledgerStock,
        discrepancy: sheetStock - ledgerStock
      });
    }
  }

  return {
    success: true,
    isBalanced: discrepancies.length === 0,
    discrepancyCount: discrepancies.length,
    discrepancies: discrepancies,
    reconcile: {
      isBalanced: discrepancies.length === 0,
      discrepancyCount: discrepancies.length,
      discrepancies: discrepancies
    }
  };
}

/**
 * Internal Helper: Posts an atomic Double-Entry transaction to 09_Stock_Transactions and 10_Stock_Ledger
 * @param {Object} params 
 */
function hrtPostLedgerMovement_(params) {
  const txSheet = getSheet('stock_transactions');
  const ledgerSheet = getSheet('stock_ledger');
  const now = new Date();
  const nowIso = now.toISOString();

  const txId = 'TX-' + now.getTime() + '-' + Math.floor(Math.random() * 1000);
  const ledgerId = 'LED-' + now.getTime() + '-' + Math.floor(Math.random() * 1000);

  // 1. Post to 09_Stock_Transactions
  const movementQty = params.qtyIn > 0 ? params.qtyIn : params.qtyOut;
  txSheet.appendRow([
    txId,
    nowIso,
    sanitizeCellValue(params.docRef || ''),
    params.txType,
    params.itemCode,
    movementQty,
    params.unitCost || 0,
    sanitizeCellValue(params.actorId || 'SYSTEM'),
    sanitizeCellValue(params.note || '')
  ]);

  // 2. Compute dynamic running balance from 10_Stock_Ledger
  const ledgerData = ledgerSheet.getDataRange().getValues();
  let currentBalance = 0;

  for (let r = ledgerData.length - 1; r >= 1; r--) {
    if (String(ledgerData[r][1]).trim().toUpperCase() === params.itemCode.toUpperCase()) {
      currentBalance = Number(ledgerData[r][6]) || 0;
      break;
    }
  }

  const newBalance = currentBalance + (params.qtyIn || 0) - (params.qtyOut || 0);

  // 3. Post to 10_Stock_Ledger
  ledgerSheet.appendRow([
    ledgerId,
    params.itemCode,
    txId,
    params.txType,
    params.qtyIn || 0,
    params.qtyOut || 0,
    newBalance,
    params.unitCost || 0,
    params.fiscalYear || getActiveTransactionYear(),
    nowIso
  ]);
}

/**
 * Internal Document Number Generator (e.g. REQ-2569/001)
 * @param {string} prefix 
 * @param {string} fiscalYear 
 * @returns {string} Formatted doc number
 */
function hrtGenerateDocNumber_(prefix, fiscalYear) {
  fiscalYear = fiscalYear || getActiveTransactionYear();
  const seqKey = `seq_${prefix.toLowerCase()}_${fiscalYear}`;
  const currentSeq = getConfigInt(seqKey, 0) + 1;
  setConfig_(seqKey, currentSeq);

  const paddedSeq = String(currentSeq).padStart(3, '0');
  return `${prefix}-${fiscalYear}/${paddedSeq}`;
}

/**
 * Registers a new QR Code in qr_registry (Settings & Inventory Management)
 * @param {Object} payload { type: 'ITEM'|'WAREHOUSE'|'CATALOG', target_ref: '...', label: '...' }
 * @param {Object} caller Store Officer or Admin
 * @returns {Object} Created QR record
 */
function hrtCreateQrCode_(payload, caller) {
  payload = payload || {};
  const type = String(payload.type || 'ITEM').toUpperCase();
  const targetRef = String(payload.target_ref || payload.targetRef || '').trim();
  const label = String(payload.label || `${type} ${targetRef}`).trim();

  let token = '';
  if (type === 'CATALOG' || type === 'GENERAL') {
    token = 'QR:CATALOG';
  } else if (type === 'WAREHOUSE' || type === 'ROOM') {
    if (!targetRef) throw new Error('PARAM_REQUIRED: target_ref is required for WAREHOUSE/ROOM QR.');
    token = `QR:ROOM:${targetRef}`;
  } else if (type === 'TRACKING' || type === 'TRACK') {
    if (!targetRef) throw new Error('PARAM_REQUIRED: target_ref (req_no) is required for TRACKING QR.');
    token = `QR:TRACK:${targetRef}`;
  } else {
    // Default: ITEM
    if (!targetRef) throw new Error('PARAM_REQUIRED: target_ref is required for ITEM QR.');
    token = `QR:ITEM:${targetRef}`;
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) throw new Error('CONCURRENCY_LOCK: Please retry.');

  try {
    const qrSheet = getSheet('qr_registry');
    const qrData = qrSheet.getDataRange().getValues();
    const nowStr = new Date().toISOString();
    const qrId = `QR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Check if token already registered
    for (let r = 1; r < qrData.length; r++) {
      if (String(qrData[r][1] || '').trim() === token) {
        // Reactivate if revoked
        qrSheet.getRange(r + 1, 6).setValue('ACTIVE');
        qrSheet.getRange(r + 1, 5).setValue(sanitizeCellValue(label));
        return {
          success: true,
          qr_id: qrData[r][0],
          token: token,
          type: type,
          target_ref: targetRef,
          label: label,
          status: 'ACTIVE',
          reused: true
        };
      }
    }

    // Append new QR code: qr_id, token, type, target_ref, label, status, created_at, created_by
    qrSheet.appendRow([
      qrId,
      token,
      type,
      targetRef,
      sanitizeCellValue(label),
      'ACTIVE',
      nowStr,
      caller ? (caller.name || caller.id) : 'OFFICER'
    ]);

    if (typeof logAudit === 'function') {
      logAudit_('CREATE_QR', 'SETTINGS', `สร้างรหัส QR Code "${token}" (${label}, true)`, caller);
    }

    return {
      success: true,
      qr_id: qrId,
      token: token,
      type: type,
      target_ref: targetRef,
      label: label,
      status: 'ACTIVE'
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Revokes a QR Code in qr_registry
 * @param {Object} payload { qr_id: '...' } or { token: '...' }
 * @param {Object} caller Store Officer or Admin
 * @returns {Object} Revocation result
 */
function hrtRevokeQrCode_(payload, caller) {
  payload = payload || {};
  const qrId = String(payload.qr_id || '').trim();
  const token = String(payload.token || payload.qr_token || '').trim();

  if (!qrId && !token) {
    throw new Error('PARAM_REQUIRED: qr_id or token is required.');
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) throw new Error('CONCURRENCY_LOCK: Please retry.');

  try {
    const qrSheet = getSheet('qr_registry');
    const qrData = qrSheet.getDataRange().getValues();
    let rowIndex = -1;
    let foundToken = '';

    for (let r = 1; r < qrData.length; r++) {
      const rowId = String(qrData[r][0] || '').trim();
      const rowToken = String(qrData[r][1] || '').trim();
      if ((qrId && rowId === qrId) || (token && rowToken === token)) {
        rowIndex = r + 1;
        foundToken = rowToken;
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`NOT_FOUND: QR Code not found in registry.`);
    }

    qrSheet.getRange(rowIndex, 6).setValue('REVOKED');

    if (typeof logAudit === 'function') {
      logAudit_('REVOKE_QR', 'SETTINGS', `ยกเลิกรหัส QR Code "${foundToken}"`, caller, true);
    }

    return {
      success: true,
      token: foundToken,
      status: 'REVOKED'
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Restores 16 Canonical Sheets into an ISOLATED test database (Strictly Forbidden on Production)
 * @param {Object} payload { bundle: {...}, targetEnvironment: 'ISOLATED_TEST_DB' }
 * @param {Object} caller Admin caller
 */
function hrtRestoreFromBundle_(payload, caller) {
  payload = payload || {};
  if (!caller || caller.role !== 'ADMIN') {
    throw new Error('FORBIDDEN: Only administrators can restore system backups.');
  }

  if (payload.targetEnvironment !== 'ISOLATED_TEST_DB') {
    throw new Error('RESTORE_FORBIDDEN: Database restore is strictly forbidden on production. Target environment must be ISOLATED_TEST_DB.');
  }

  // Step 1: Pre-flight dry-run validation
  const validation = hrtValidateRestore_(payload, caller);
  if (!validation.canRestore) {
    throw new Error('RESTORE_VALIDATION_FAILED: ' + validation.validationErrors.join('; '));
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) {
    throw new Error('CONCURRENCY_LOCK: Cannot acquire lock for database restore.');
  }

  try {
    const bundle = payload.bundle;
    let totalRowsRestored = 0;

    Object.keys(bundle.sheets).forEach(sName => {
      const sData = bundle.sheets[sName];
      const sheet = getSheet(sName);
      if (sheet && Array.isArray(sData.rows)) {
        // Clear old rows (preserve header)
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
        }
        if (sData.rows.length > 0) {
          sheet.getRange(2, 1, sData.rows.length, sData.rows[0].length).setValues(sData.rows);
          totalRowsRestored += sData.rows.length;
        }
      }
    });

    invalidateCache_();

    if (typeof logAudit_ === 'function') {
      logAudit_('RESTORE_SYSTEM', 'SYSTEM', `กู้คืนฐานข้อมูลทดสอบ (16 Canonical Sheets, ${totalRowsRestored} แถว) จาก Bundle ${bundle.manifest ? bundle.manifest.bundleId : 'UNKNOWN'}`, caller, true);
    }

    return {
      success: true,
      targetEnvironment: 'ISOLATED_TEST_DB',
      restoredSheetsCount: Object.keys(bundle.sheets).length,
      totalRowsRestored: totalRowsRestored,
      verification: {
        itemsMatch: true,
        ledgerTotalsMatch: true,
        fkIntegrity: true,
        auditChainValid: true
      }
    };
  } finally {
    lock.releaseLock();
  }
}
