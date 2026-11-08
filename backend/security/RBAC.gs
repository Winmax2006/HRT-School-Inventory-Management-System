/**
 * RBAC.gs - Role-Based Access Control & Permission Enforcement
 * Layer: Security Layer
 * Standard: Least Privilege & Server-Side Security Enforcement
 */

const RBAC = (function() {
  function can(role, action) {
    return PermissionRegistry.isPermitted(role, action);
  }

  function checkPermission(role, action) {
    if (!can(role, action)) {
      throw ErrorService.createError(
        ErrorService.ERROR_CODES.FORBIDDEN,
        `Permission denied. Role "${role || 'UNKNOWN'}" is not authorized to perform action "${action}".`,
        { role, action, allowedRoles: PermissionRegistry.getAllowedRoles(action) }
      );
    }
    return true;
  }

  function enforce(action) {
    const user = Auth.requireAuthenticated();
    checkPermission(user.role, action);
    return user;
  }

  function requireRoles(allowedRoles) {
    const user = Auth.requireAuthenticated();
    const cleanRole = String(user.role || '').toUpperCase().trim();
    const cleanAllowed = (allowedRoles || []).map(r => String(r).toUpperCase().trim());

    if (!cleanAllowed.includes(cleanRole)) {
      throw ErrorService.createError(
        ErrorService.ERROR_CODES.FORBIDDEN,
        `Access denied. Role "${user.role}" does not match required roles: [${cleanAllowed.join(', ')}]`,
        { userRole: user.role, requiredRoles: cleanAllowed }
      );
    }
    return user;
  }

  return {
    can,
    checkPermission,
    enforce,
    requireRoles
  };
})();
