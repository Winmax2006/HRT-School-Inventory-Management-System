/**
 * AuditApi.gs - Audit Trail API Handlers
 * Layer: API Layer
 * Standard: Envelope Wrapped, RBAC Enforced
 */

const AuditApi = (function() {
  function apiGetAuditLogs(filters, requestId) {
    try {
      RBAC.enforce(PermissionRegistry.ACTIONS.AUDIT_VIEW);
      const logs = AuditService.getAuditLogs(filters || {});
      return ErrorService.formatSuccess(logs, requestId);
    } catch (err) {
      return ErrorService.formatError(err, requestId);
    }
  }

  function apiVerifyAuditIntegrity(requestId) {
    try {
      RBAC.enforce(PermissionRegistry.ACTIONS.AUDIT_VIEW);
      const result = AuditService.verifyIntegrityChain();
      return ErrorService.formatSuccess(result, requestId);
    } catch (err) {
      return ErrorService.formatError(err, requestId);
    }
  }

  return {
    apiGetAuditLogs,
    apiVerifyAuditIntegrity
  };
})();
