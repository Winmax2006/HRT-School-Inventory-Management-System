/**
 * ValidationService.gs - Schema Constraints, Bounds Checking & Formula Injection Protection
 * Layer: Validation Layer
 * Standard: Security and Data Integrity Invariants
 */

const ValidationService = (function() {
  const FSN_REGEX = /^\d{4}-\d{2}-\d{4}$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const ALLOWED_ROLES = ['ADMIN', 'OFFICER', 'APPROVER', 'TEACHER', 'REQUESTER'];

  function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    let s = str.trim();
    // Neutralize Google Sheets formula injection
    if (/^[=+\-@]/.test(s)) {
      s = "'" + s;
    }
    // Remove dangerous script tags
    s = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    return s;
  }

  function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const sanitized = Array.isArray(obj) ? [] : {};
    for (let key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (typeof val === 'string') {
          sanitized[key] = sanitizeString(val);
        } else if (typeof val === 'object' && val !== null) {
          sanitized[key] = sanitizeObject(val);
        } else {
          sanitized[key] = val;
        }
      }
    }
    return sanitized;
  }

  function validateRequired(obj, fields) {
    const missing = [];
    fields.forEach(field => {
      const val = obj ? obj[field] : undefined;
      if (val === undefined || val === null || val === '') {
        missing.push(field);
      }
    });

    if (missing.length > 0) {
      throw ErrorService.createError(
        ErrorService.ERROR_CODES.VALIDATION_ERROR,
        `Missing required fields: ${missing.join(', ')}`,
        { missingFields: missing }
      );
    }
    return true;
  }

  function validatePositiveNumber(val, fieldName) {
    const num = Number(val);
    if (isNaN(num) || num <= 0) {
      throw ErrorService.createError(
        ErrorService.ERROR_CODES.VALIDATION_ERROR,
        `Field "${fieldName}" must be a positive number greater than zero (received: ${val})`,
        { field: fieldName, value: val }
      );
    }
    return num;
  }

  function validateNonNegativeNumber(val, fieldName) {
    const num = Number(val);
    if (isNaN(num) || num < 0) {
      throw ErrorService.createError(
        ErrorService.ERROR_CODES.VALIDATION_ERROR,
        `Field "${fieldName}" must be a non-negative number (received: ${val})`,
        { field: fieldName, value: val }
      );
    }
    return num;
  }

  function validateStockAvailability(requestedQty, availableQty, itemName) {
    const req = Number(requestedQty);
    const avail = Number(availableQty);
    if (req > avail) {
      throw ErrorService.createError(
        ErrorService.ERROR_CODES.INSUFFICIENT_STOCK,
        `Insufficient stock for item "${itemName || 'Item'}". Requested: ${req}, Available: ${avail}`,
        { requested: req, available: avail, itemName }
      );
    }
    return true;
  }

  function validateFsn(code) {
    if (!code) return false;
    const clean = String(code).trim();
    return FSN_REGEX.test(clean);
  }

  function validateEmail(email) {
    if (!email) return false;
    return EMAIL_REGEX.test(String(email).trim());
  }

  function validateRole(role) {
    const clean = String(role || '').toUpperCase().trim();
    if (!ALLOWED_ROLES.includes(clean)) {
      throw ErrorService.createError(
        ErrorService.ERROR_CODES.VALIDATION_ERROR,
        `Invalid role: "${role}". Must be one of: ${ALLOWED_ROLES.join(', ')}`,
        { role, allowed: ALLOWED_ROLES }
      );
    }
    return clean;
  }

  return {
    sanitizeString,
    sanitizeObject,
    validateRequired,
    validatePositiveNumber,
    validateNonNegativeNumber,
    validateStockAvailability,
    validateFsn,
    validateEmail,
    validateRole,
    ALLOWED_ROLES
  };
})();
