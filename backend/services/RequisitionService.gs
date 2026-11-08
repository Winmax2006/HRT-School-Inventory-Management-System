/**
 * RequisitionService.gs - Multi-Item Requisition Basket & Workflow Service
 * Layer: Domain Service Layer
 * Standard: Double-Entry Compliant, Line Item Validation & Stock Bounds
 */

const RequisitionService = (function() {
  const STATUS = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    ISSUED: 'ISSUED'
  };

  function createRequisition(payload) {
    const user = Auth.requireAuthenticated();
    const clean = ValidationService.sanitizeObject(payload);
    ValidationService.validateRequired(clean, ['purpose', 'items']);

    if (!Array.isArray(clean.items) || clean.items.length === 0) {
      throw ErrorService.createError(
        ErrorService.ERROR_CODES.VALIDATION_ERROR,
        'Requisition must include at least one item line in basket'
      );
    }

    const currentYear = IdService.getBuddhistYear();
    const existingReqCount = Repository.count(Schema.TABLES.REQUISITIONS);
    const reqId = clean.requisition_id || IdService.generateRequisitionId(existingReqCount + 1, currentYear);
    const docNo = clean.doc_no || `REQ-${currentYear}-${IdService.padZero(existingReqCount + 1, 4)}`;

    let calculatedTotalItems = 0;
    let calculatedTotalCost = 0;
    const validatedLines = [];

    clean.items.forEach((itemLine, idx) => {
      ValidationService.validateRequired(itemLine, ['item_code', 'quantity_requested']);
      const qtyRequested = ValidationService.validatePositiveNumber(
        itemLine.quantity_requested,
        `items[${idx}].quantity_requested`
      );

      // Verify item exists and check stock availability
      const masterItem = ItemService.getItemByCode(itemLine.item_code);
      ValidationService.validateStockAvailability(qtyRequested, masterItem.current_stock, masterItem.item_name);

      const unitCost = Number(masterItem.unit_price) || 0;
      const lineCost = Math.round(qtyRequested * unitCost * 100) / 100;

      calculatedTotalItems += qtyRequested;
      calculatedTotalCost += lineCost;

      validatedLines.push({
        item_line_id: `${reqId}-L${idx + 1}`,
        requisition_id: reqId,
        item_id: masterItem.item_id,
        item_code: masterItem.item_code,
        item_name: masterItem.item_name,
        unit: masterItem.unit,
        quantity_requested: qtyRequested,
        quantity_approved: 0,
        quantity_issued: 0,
        unit_cost: unitCost,
        total_cost: lineCost,
        status: STATUS.PENDING
      });
    });

    const header = {
      requisition_id: reqId,
      doc_no: docNo,
      fiscal_year: String(clean.fiscal_year || currentYear),
      requester_id: user.user_id,
      requester_name: user.name,
      department: user.department || clean.department || 'งานวิชาการ',
      purpose: clean.purpose,
      status: STATUS.PENDING,
      urgency: clean.urgency || 'ปกติ',
      total_items: calculatedTotalItems,
      total_cost: Math.round(calculatedTotalCost * 100) / 100,
      created_at: new Date().toISOString(),
      approved_by: '',
      approved_at: '',
      issued_by: '',
      issued_at: '',
      rejected_by: '',
      rejected_at: '',
      reject_reason: ''
    };

    Repository.insert(Schema.TABLES.REQUISITIONS, header);
    Repository.insertBatch(Schema.TABLES.REQUISITION_ITEMS, validatedLines);

    return {
      ...header,
      items: validatedLines
    };
  }

  function getRequisitionById(reqId) {
    if (!reqId) {
      throw ErrorService.createError(ErrorService.ERROR_CODES.VALIDATION_ERROR, 'requisition_id is required');
    }
    const cleanId = String(reqId).trim();
    const header = Repository.findById(Schema.TABLES.REQUISITIONS, cleanId, 'requisition_id');
    if (!header) {
      throw ErrorService.createError(
        ErrorService.ERROR_CODES.NOT_FOUND,
        `Requisition not found: ${reqId}`
      );
    }

    const items = Repository.findBy(Schema.TABLES.REQUISITION_ITEMS, 'requisition_id', cleanId);
    return {
      ...header,
      items
    };
  }

  function getAllRequisitions(filters = {}) {
    const list = Repository.findAll(Schema.TABLES.REQUISITIONS);

    return list.filter(req => {
      if (filters.status && filters.status !== 'all') {
        if (String(req.status).toUpperCase() !== String(filters.status).toUpperCase()) return false;
      }
      if (filters.requester_id && req.requester_id !== filters.requester_id) {
        return false;
      }
      if (filters.fiscal_year && req.fiscal_year !== String(filters.fiscal_year)) {
        return false;
      }
      if (filters.department && filters.department !== 'all') {
        if (req.department !== filters.department) return false;
      }
      return true;
    });
  }

  function getPendingRequisitions() {
    return getAllRequisitions({ status: STATUS.PENDING });
  }

  return {
    STATUS,
    createRequisition,
    getRequisitionById,
    getAllRequisitions,
    getPendingRequisitions
  };
})();
