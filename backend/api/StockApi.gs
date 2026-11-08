/**
 * StockApi.gs - Stock Movement API Handlers
 * Layer: API Layer
 * Standard: Envelope Wrapped, Mutex & Double-Entry Invariant Guarded
 */

const StockApi = (function() {
  function apiReceiveStock(payload, requestId) {
    try {
      const result = StockService.receiveStock(payload);
      return ErrorService.formatSuccess(result, requestId);
    } catch (err) {
      return ErrorService.formatError(err, requestId);
    }
  }

  function apiIssueStock(payload, requestId) {
    try {
      if (!payload || !payload.requisition_id) {
        throw ErrorService.createError(ErrorService.ERROR_CODES.VALIDATION_ERROR, 'requisition_id is required');
      }
      const result = StockService.issueRequisitionStock(payload.requisition_id);
      return ErrorService.formatSuccess(result, requestId);
    } catch (err) {
      return ErrorService.formatError(err, requestId);
    }
  }

  function apiAdjustStock(payload, requestId) {
    try {
      const result = StockService.adjustStock(payload);
      return ErrorService.formatSuccess(result, requestId);
    } catch (err) {
      return ErrorService.formatError(err, requestId);
    }
  }

  return {
    apiReceiveStock,
    apiIssueStock,
    apiAdjustStock
  };
})();
