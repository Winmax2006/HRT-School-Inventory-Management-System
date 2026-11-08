/**
 * ApprovalService.gs - Requisition Approval Workflow State Machine
 * Layer: Domain Service Layer
 * Standard: Strict State Machine, Role Authorization & Audit Trail
 */

const ApprovalService = (function() {
  function approveRequisition(reqId, notes = '') {
    const user = Auth.requireAuthenticated();
    RBAC.checkPermission(user.role, PermissionRegistry.ACTIONS.REQUISITION_APPROVE);

    if (!reqId) {
      throw ErrorService.createError(ErrorService.ERROR_CODES.VALIDATION_ERROR, 'requisition_id is required');
    }

    const req = RequisitionService.getRequisitionById(reqId);
    if (req.status !== RequisitionService.STATUS.PENDING) {
      throw ErrorService.createError(
        ErrorService.ERROR_CODES.INVALID_STATE_TRANSITION,
        `Cannot approve requisition in status "${req.status}". Expected: "${RequisitionService.STATUS.PENDING}"`,
        { reqId, currentStatus: req.status }
      );
    }

    const timestamp = new Date().toISOString();
    const cleanNotes = ValidationService.sanitizeString(notes || '');

    // 1. Update Requisition Header
    const updatedHeader = Repository.update(
      Schema.TABLES.REQUISITIONS,
      reqId,
      {
        status: RequisitionService.STATUS.APPROVED,
        approved_by: `${user.name} (${user.email})`,
        approved_at: timestamp
      },
      'requisition_id'
    );

    // 2. Update all associated line items to APPROVED
    if (req.items && req.items.length > 0) {
      req.items.forEach(itemLine => {
        Repository.update(
          Schema.TABLES.REQUISITION_ITEMS,
          itemLine.item_line_id,
          {
            quantity_approved: itemLine.quantity_requested,
            status: RequisitionService.STATUS.APPROVED
          },
          'item_line_id'
        );
      });
    }

    // 3. Audit Log transition
    if (typeof AuditService !== 'undefined') {
      try {
        AuditService.logAction({
          action: 'REQUISITION_APPROVE',
          module: 'APPROVAL',
          entityType: 'REQUISITION',
          entityId: reqId,
          oldValue: { status: req.status },
          newValue: { status: RequisitionService.STATUS.APPROVED, approved_by: user.email, notes: cleanNotes }
        });
      } catch (e) {}
    }

    return {
      ...updatedHeader,
      items: RequisitionService.getRequisitionById(reqId).items
    };
  }

  function rejectRequisition(reqId, reason) {
    const user = Auth.requireAuthenticated();
    RBAC.checkPermission(user.role, PermissionRegistry.ACTIONS.REQUISITION_REJECT);

    if (!reqId) {
      throw ErrorService.createError(ErrorService.ERROR_CODES.VALIDATION_ERROR, 'requisition_id is required');
    }
    const cleanReason = ValidationService.sanitizeString(reason || '');
    if (!cleanReason) {
      throw ErrorService.createError(
        ErrorService.ERROR_CODES.VALIDATION_ERROR,
        'A reason is required when rejecting a requisition'
      );
    }

    const req = RequisitionService.getRequisitionById(reqId);
    if (req.status !== RequisitionService.STATUS.PENDING) {
      throw ErrorService.createError(
        ErrorService.ERROR_CODES.INVALID_STATE_TRANSITION,
        `Cannot reject requisition in status "${req.status}". Expected: "${RequisitionService.STATUS.PENDING}"`,
        { reqId, currentStatus: req.status }
      );
    }

    const timestamp = new Date().toISOString();

    // 1. Update Requisition Header
    const updatedHeader = Repository.update(
      Schema.TABLES.REQUISITIONS,
      reqId,
      {
        status: RequisitionService.STATUS.REJECTED,
        rejected_by: `${user.name} (${user.email})`,
        rejected_at: timestamp,
        reject_reason: cleanReason
      },
      'requisition_id'
    );

    // 2. Update line items
    if (req.items && req.items.length > 0) {
      req.items.forEach(itemLine => {
        Repository.update(
          Schema.TABLES.REQUISITION_ITEMS,
          itemLine.item_line_id,
          {
            quantity_approved: 0,
            status: RequisitionService.STATUS.REJECTED
          },
          'item_line_id'
        );
      });
    }

    // 3. Audit Log transition
    if (typeof AuditService !== 'undefined') {
      try {
        AuditService.logAction({
          action: 'REQUISITION_REJECT',
          module: 'APPROVAL',
          entityType: 'REQUISITION',
          entityId: reqId,
          oldValue: { status: req.status },
          newValue: { status: RequisitionService.STATUS.REJECTED, rejected_by: user.email, reason: cleanReason }
        });
      } catch (e) {}
    }

    return {
      ...updatedHeader,
      items: RequisitionService.getRequisitionById(reqId).items
    };
  }

  return {
    approveRequisition,
    rejectRequisition
  };
})();
