/**
 * RequisitionApi.gs - Requisition API Handlers
 * Layer: API Layer
 * Standard: Envelope Wrapped, RBAC Enforced
 */

const RequisitionApi = (function() {
  function apiCreateRequisition(payload, requestId) {
    try {
      RBAC.enforce(PermissionRegistry.ACTIONS.REQUISITION_CREATE);
      const created = RequisitionService.createRequisition(payload);
      return ErrorService.formatSuccess(created, requestId);
    } catch (err) {
      return ErrorService.formatError(err, requestId);
    }
  }

  function apiGetRequisitions(filters = {}, requestId) {
    try {
      const user = Auth.requireAuthenticated();
      const canViewAll = RBAC.can(user.role, PermissionRegistry.ACTIONS.REQUISITION_VIEW_ALL);

      const queryFilters = { ...filters };
      if (!canViewAll) {
        queryFilters.requester_id = user.user_id;
      }

      const list = RequisitionService.getAllRequisitions(queryFilters);
      return ErrorService.formatSuccess(list, requestId);
    } catch (err) {
      return ErrorService.formatError(err, requestId);
    }
  }

  function apiGetRequisitionDetail(reqId, requestId) {
    try {
      const user = Auth.requireAuthenticated();
      const detail = RequisitionService.getRequisitionById(reqId);

      const canViewAll = RBAC.can(user.role, PermissionRegistry.ACTIONS.REQUISITION_VIEW_ALL);
      if (!canViewAll && detail.requester_id !== user.user_id) {
        throw ErrorService.createError(
          ErrorService.ERROR_CODES.FORBIDDEN,
          'Access denied. You can only view your own requisitions.'
        );
      }

      return ErrorService.formatSuccess(detail, requestId);
    } catch (err) {
      return ErrorService.formatError(err, requestId);
    }
  }

  function apiApproveRequisition(payload, requestId) {
    try {
      if (!payload || !payload.requisition_id) {
        throw ErrorService.createError(ErrorService.ERROR_CODES.VALIDATION_ERROR, 'requisition_id is required');
      }
      const result = ApprovalService.approveRequisition(payload.requisition_id, payload.notes);
      return ErrorService.formatSuccess(result, requestId);
    } catch (err) {
      return ErrorService.formatError(err, requestId);
    }
  }

  function apiRejectRequisition(payload, requestId) {
    try {
      if (!payload || !payload.requisition_id) {
        throw ErrorService.createError(ErrorService.ERROR_CODES.VALIDATION_ERROR, 'requisition_id is required');
      }
      const result = ApprovalService.rejectRequisition(payload.requisition_id, payload.reason);
      return ErrorService.formatSuccess(result, requestId);
    } catch (err) {
      return ErrorService.formatError(err, requestId);
    }
  }

  return {
    apiCreateRequisition,
    apiGetRequisitions,
    apiGetRequisitionDetail,
    apiApproveRequisition,
    apiRejectRequisition
  };
})();
