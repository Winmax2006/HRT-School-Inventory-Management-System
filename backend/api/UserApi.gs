/**
 * UserApi.gs - User and Authentication API Handlers
 * Layer: API Layer
 * Standard: Envelope Wrapped, Zero Direct Sheet Access
 */

const UserApi = (function() {
  function apiGetCurrentUser(requestId) {
    try {
      const user = Auth.getCurrentUser();
      return ErrorService.formatSuccess(user, requestId);
    } catch (err) {
      return ErrorService.formatError(err, requestId);
    }
  }

  function apiGetUsers(requestId) {
    try {
      Auth.requireAuthenticated();
      const users = UserService.getAllUsers();
      return ErrorService.formatSuccess(users, requestId);
    } catch (err) {
      return ErrorService.formatError(err, requestId);
    }
  }

  function apiCreateUser(payload, requestId) {
    try {
      const currentUser = Auth.requireAuthenticated();
      if (currentUser.role !== 'ADMIN' && currentUser.role !== 'OFFICER') {
        throw ErrorService.createError(
          ErrorService.ERROR_CODES.FORBIDDEN,
          'Only Administrator or Inventory Officer can create user accounts'
        );
      }

      const created = UserService.createUser(payload);
      return ErrorService.formatSuccess(created, requestId);
    } catch (err) {
      return ErrorService.formatError(err, requestId);
    }
  }

  function apiUpdateUser(payload, requestId) {
    try {
      const currentUser = Auth.requireAuthenticated();
      if (!payload || !payload.user_id) {
        throw ErrorService.createError(ErrorService.ERROR_CODES.VALIDATION_ERROR, 'user_id is required');
      }

      // Non-admins can only update their own profile, not roles
      if (currentUser.role !== 'ADMIN' && currentUser.user_id !== payload.user_id) {
        throw ErrorService.createError(
          ErrorService.ERROR_CODES.FORBIDDEN,
          'Insufficient permissions to modify other user accounts'
        );
      }

      if (payload.role && currentUser.role !== 'ADMIN') {
        throw ErrorService.createError(
          ErrorService.ERROR_CODES.FORBIDDEN,
          'Only Administrator can change user roles'
        );
      }

      const updated = UserService.updateUser(payload.user_id, payload);
      return ErrorService.formatSuccess(updated, requestId);
    } catch (err) {
      return ErrorService.formatError(err, requestId);
    }
  }

  return {
    apiGetCurrentUser,
    apiGetUsers,
    apiCreateUser,
    apiUpdateUser
  };
})();
