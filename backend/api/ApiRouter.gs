/**
 * ApiRouter.gs - Central API Routing Gateway
 * Layer: API Layer
 * Standard: Unified Dispatcher for google.script.run and HTTP doPost
 */

const ApiRouter = (function() {
  const ROUTE_TABLE = {
    // Inventory Items
    'items.list': (p, reqId) => ItemApi.apiGetItems(p, reqId),
    'items.get': (p, reqId) => ItemApi.apiGetItemDetail(p ? p.item_code : '', reqId),
    'items.create': (p, reqId) => ItemApi.apiCreateItem(p, reqId),
    'items.update': (p, reqId) => ItemApi.apiUpdateItem(p, reqId),

    // Requisitions
    'requisitions.list': (p, reqId) => RequisitionApi.apiGetRequisitions(p, reqId),
    'requisitions.get': (p, reqId) => RequisitionApi.apiGetRequisitionDetail(p ? p.requisition_id : '', reqId),
    'requisitions.create': (p, reqId) => RequisitionApi.apiCreateRequisition(p, reqId),
    'requisitions.approve': (p, reqId) => RequisitionApi.apiApproveRequisition(p, reqId),
    'requisitions.reject': (p, reqId) => RequisitionApi.apiRejectRequisition(p, reqId),

    // Stock Movements
    'stock.receive': (p, reqId) => StockApi.apiReceiveStock(p, reqId),
    'stock.issue': (p, reqId) => StockApi.apiIssueStock(p, reqId),
    'stock.adjust': (p, reqId) => StockApi.apiAdjustStock(p, reqId),

    // Users & Session
    'users.current': (p, reqId) => UserApi.apiGetCurrentUser(reqId),
    'users.list': (p, reqId) => UserApi.apiGetUsers(reqId),
    'users.create': (p, reqId) => UserApi.apiCreateUser(p, reqId),
    'users.update': (p, reqId) => UserApi.apiUpdateUser(p, reqId),

    // Dashboard & Reports
    'dashboard.metrics': (p, reqId) => DashboardApi.apiGetDashboardMetrics(p, reqId),
    'reports.generate': (p, reqId) => DashboardApi.apiGetPdReport(p ? p.type : '', p ? p.params : {}, reqId),
    'fiscalYear.close': (p, reqId) => DashboardApi.apiCloseFiscalYear(p, reqId),

    // Audit
    'audit.list': (p, reqId) => AuditApi.apiGetAuditLogs(p, reqId),
    'audit.verify': (p, reqId) => AuditApi.apiVerifyAuditIntegrity(reqId),

    // Setup
    'setup.init': (p, reqId) => {
      try {
        const result = Setup.initDatabase();
        return ErrorService.formatSuccess(result, reqId);
      } catch (err) {
        return ErrorService.formatError(err, reqId);
      }
    }
  };

  function routeRequest(action, payload = {}, clientRequestId) {
    const requestId = clientRequestId || IdService.generateRequestId();

    if (!action) {
      return ErrorService.formatError(
        ErrorService.createError(ErrorService.ERROR_CODES.VALIDATION_ERROR, 'Action parameter is required'),
        requestId
      );
    }

    const cleanAction = String(action).trim();
    const handler = ROUTE_TABLE[cleanAction];

    if (!handler) {
      return ErrorService.formatError(
        ErrorService.createError(
          ErrorService.ERROR_CODES.NOT_FOUND,
          `No route handler registered for action "${cleanAction}"`,
          { action: cleanAction, availableActions: Object.keys(ROUTE_TABLE) }
        ),
        requestId
      );
    }

    try {
      return handler(payload, requestId);
    } catch (err) {
      return ErrorService.formatError(err, requestId);
    }
  }

  function getAvailableRoutes() {
    return Object.keys(ROUTE_TABLE);
  }

  return {
    routeRequest,
    getAvailableRoutes
  };
})();
