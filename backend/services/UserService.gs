/**
 * UserService.gs - User Directory & Profile Management Service
 * Layer: Domain Service Layer
 * Standard: Pure Business Rules & Input Validation
 */

const UserService = (function() {
  function getAllUsers() {
    return Repository.findAll(Schema.TABLES.USERS);
  }

  function getUserById(userId) {
    if (!userId) return null;
    return Repository.findById(Schema.TABLES.USERS, userId, 'user_id');
  }

  function getUserByEmail(email) {
    if (!email) return null;
    return Repository.findById(Schema.TABLES.USERS, email, 'email');
  }

  function createUser(payload) {
    const cleanPayload = ValidationService.sanitizeObject(payload);
    ValidationService.validateRequired(cleanPayload, ['email', 'name', 'role']);

    if (!ValidationService.validateEmail(cleanPayload.email)) {
      throw ErrorService.createError(
        ErrorService.ERROR_CODES.VALIDATION_ERROR,
        `Invalid email format: ${cleanPayload.email}`
      );
    }

    const validatedRole = ValidationService.validateRole(cleanPayload.role);
    const existing = getUserByEmail(cleanPayload.email);
    if (existing) {
      throw ErrorService.createError(
        ErrorService.ERROR_CODES.CONFLICT,
        `User with email "${cleanPayload.email}" already exists`
      );
    }

    const userCount = Repository.count(Schema.TABLES.USERS);
    const newUser = {
      user_id: cleanPayload.user_id || IdService.generateUserId(userCount + 1),
      email: cleanPayload.email.toLowerCase(),
      name: cleanPayload.name,
      role: validatedRole,
      department: cleanPayload.department || 'ทั่วไป',
      status: cleanPayload.status || 'ACTIVE',
      created_at: new Date().toISOString()
    };

    return Repository.insert(Schema.TABLES.USERS, newUser);
  }

  function updateUser(userId, updates) {
    if (!userId) {
      throw ErrorService.createError(ErrorService.ERROR_CODES.VALIDATION_ERROR, 'userId is required');
    }

    const existing = getUserById(userId);
    if (!existing) {
      throw ErrorService.createError(ErrorService.ERROR_CODES.NOT_FOUND, `User not found: ${userId}`);
    }

    const cleanUpdates = ValidationService.sanitizeObject(updates);
    if (cleanUpdates.role) {
      cleanUpdates.role = ValidationService.validateRole(cleanUpdates.role);
    }
    if (cleanUpdates.email && !ValidationService.validateEmail(cleanUpdates.email)) {
      throw ErrorService.createError(ErrorService.ERROR_CODES.VALIDATION_ERROR, 'Invalid email format');
    }

    delete cleanUpdates.user_id; // Immutable primary key
    return Repository.update(Schema.TABLES.USERS, userId, cleanUpdates, 'user_id');
  }

  return {
    getAllUsers,
    getUserById,
    getUserByEmail,
    createUser,
    updateUser
  };
})();
