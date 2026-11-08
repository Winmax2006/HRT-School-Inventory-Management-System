const fs = require('fs');

let write = fs.readFileSync('Write.gs', 'utf8');

// 1. Update hrtApproveRequisition_
const oldApproveStart = write.indexOf('function hrtApproveRequisition_');
const oldApproveEnd = write.indexOf('function hrtRejectRequisition_', oldApproveStart);

if (oldApproveStart === -1 || oldApproveEnd === -1) {
  console.error('Could not find hrtApproveRequisition_ boundaries');
  process.exit(1);
}

const newApproveCode = `function hrtApproveRequisition_(payload, caller) {
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

`;

write = write.substring(0, oldApproveStart) + newApproveCode + write.substring(oldApproveEnd);

// 2. Update hrtIssueStock_
const oldIssueStart = write.indexOf('function hrtIssueStock_');
const oldIssueEnd = write.indexOf('function hrtConfirmReceipt_', oldIssueStart);

if (oldIssueStart === -1 || oldIssueEnd === -1) {
  console.error('Could not find hrtIssueStock_ boundaries');
  process.exit(1);
}

const newIssueCode = `function hrtIssueStock_(payload, caller) {
  payload = payload || {};
  const reqId = String(payload.requisition_id || payload.req_id || '').trim();
  if (!reqId) throw new Error('PARAM_REQUIRED: requisition_id is required.');

  // Guard: Single Full Issuance Requirement
  if (payload.is_partial === true || payload.isPartial === true) {
    const err = new Error('FEATURE_UNSUPPORTED: การจ่ายพัสดุบางส่วน (Partial Issue) ยังไม่เปิดให้บริการในเวอร์ชันนี้ โปรดดำเนินการจ่ายเต็มจำนวนตามที่อนุมัติ');
    err.code = 'FEATURE_UNSUPPORTED';
    throw err;
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)) {
    throw new Error('CONCURRENCY_LOCK: Stock issuance lock timeout. Another operation is active.');
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

    if (!reqRecord) throw new Error('NOT_FOUND: Requisition "' + reqId + '" not found.');

    if (reqRecord.status === 'ISSUED') {
      throw new Error('DOUBLE_DISPATCH: Requisition "' + reqRecord.req_no + '" has ALREADY been issued.');
    }

    if (reqRecord.status !== 'APPROVED' && reqRecord.status !== 'READY_TO_ISSUE') {
      const err = new Error('INVALID_STATE: Requisition must be APPROVED before stock can be issued. Current: ' + reqRecord.status);
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

        lineItems.push({
          rowIndex: i + 1,
          item_code: String(itemsData[i][2]).trim().toUpperCase(),
          qty: qtyApproved
        });
      }
    }

    if (lineItems.length === 0) {
      throw new Error('INVALID_DATA: Requisition contains no line items to issue.');
    }

    // Guard: Line-level partial quantities
    if (Array.isArray(payload.items) && payload.items.length > 0) {
      for (let p = 0; p < payload.items.length; p++) {
        const pItem = payload.items[p];
        const pCode = String(pItem.item_code || pItem.code || '').trim().toUpperCase();
        const pQty = Number(pItem.qty_issued !== undefined ? pItem.qty_issued : pItem.qty);
        const matchLine = lineItems.find(l => l.item_code === pCode);
        if (matchLine && !isNaN(pQty) && pQty < matchLine.qty) {
          const err = new Error('FEATURE_UNSUPPORTED: การจ่ายพัสดุบางส่วน (Partial Issue) ยังไม่เปิดให้บริการในเวอร์ชันนี้ โปรดดำเนินการจ่ายเต็มจำนวนตามที่อนุมัติ');
          err.code = 'FEATURE_UNSUPPORTED';
          throw err;
        }
      }
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
        stock: Number(masterData[r][9]) || 0
      };
    }

    // Verify stock availability for items with positive approved quantity (TX-04, TX-05)
    for (let k = 0; k < lineItems.length; k++) {
      const it = lineItems[k];
      if (it.qty <= 0) continue; // 0 qty approved requires 0 stock
      const master = itemRowMap[it.item_code];
      if (!master) {
        throw new Error('NOT_FOUND: Item code "' + it.item_code + '" does not exist in master catalog.');
      }
      if (master.stock < it.qty) {
        throw new Error('INSUFFICIENT_STOCK: Item "' + master.name + '" (' + it.item_code + ') has ' + master.stock + ' in stock, but ' + it.qty + ' requested.');
      }
    }

    const activeTxYear = getActiveTransactionYear();
    const nowStr = new Date().toISOString();

    // Atomic Execution: Deduct stock, post transactions, append ledger entries for items with qty > 0
    lineItems.forEach(it => {
      if (it.qty <= 0) return;
      const master = itemRowMap[it.item_code];
      const newStock = master.stock - it.qty;
      const newStatus = newStock <= 0 ? 'critical' : (newStock <= master.min ? 'low' : 'normal');

      // Update 03_Master_Items (stock col 10, status col 12)
      masterSheet.getRange(master.row, 10).setValue(newStock);
      masterSheet.getRange(master.row, 12).setValue(newStatus);
      master.stock = newStock; // update local

      // Post Double-Entry Ledger Movement
      hrtPostLedgerMovement_({
        itemCode: it.item_code,
        txType: 'ISSUE',
        qtyIn: 0,
        qtyOut: it.qty,
        unitCost: master.unitCost,
        docRef: reqRecord.req_no,
        note: 'จ่ายพัสดุตามใบเบิก ' + reqRecord.req_no + ' แผนก ' + reqRecord.dept,
        actorId: caller ? (caller.name || caller.id) : 'STORE_OFFICER',
        fiscalYear: activeTxYear
      });
    });

    // Mark Requisition as ISSUED
    reqSheet.getRange(reqRowIndex, 7).setValue('ISSUED');
    reqSheet.getRange(reqRowIndex, 10).setValue(nowStr);

    invalidateCache_();

    if (typeof logAudit === 'function') {
      logAudit_('ISSUE_STOCK', 'STOCK', 'จ่ายพัสดุตามใบเบิก ' + reqRecord.req_no + ' สำเร็จ', caller, true);
    }

    return {
      success: true,
      req_id: reqRecord.req_id,
      req_no: reqRecord.req_no,
      status: 'ISSUED',
      issued_at: nowStr,
      itemsCount: lineItems.length
    };

  } finally {
    lock.releaseLock();
  }
}

`;

write = write.substring(0, oldIssueStart) + newIssueCode + write.substring(oldIssueEnd);

// 3. Update hrtCloseFiscalYear_ (Prompt 17)
const oldCloseStart = write.indexOf('function hrtCloseFiscalYear_');
const oldCloseEnd = write.indexOf('function hrtSetupInitialFiscalYear_', oldCloseStart);

if (oldCloseStart === -1 || oldCloseEnd === -1) {
  console.error('Could not find hrtCloseFiscalYear_ boundaries');
  process.exit(1);
}

const newCloseCode = `function hrtCloseFiscalYear_(payload, caller) {
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
      const lType = String(ledgerData[l][2] || '').trim().toUpperCase();
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

`;

write = write.substring(0, oldCloseStart) + newCloseCode + write.substring(oldCloseEnd);

fs.writeFileSync('Write.gs', write, 'utf8');
console.log('Write.gs updated. Testing syntax...');
new Function(write);
console.log('Write.gs syntax check PASSED!');
