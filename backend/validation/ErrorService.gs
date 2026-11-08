/**
 * ErrorService.gs - Standard Error Types, Codes & API Response Envelope Builder
 * Layer: Validation Layer
 * Standard: Google Apps Script WebApp API Contract
 */

const ErrorService = (function() {
  const ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
    INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
    LEDGER_IMMUTABILITY_VIOLATION: 'LEDGER_IMMUTABILITY_VIOLATION',
    LOCK_TIMEOUT: 'LOCK_TIMEOUT',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
  };

  class AppError extends Error {
    constructor(code, message, details = null) {
      super(message || 'An application error occurred');
      this.name = 'AppError';
      this.code = code || ERROR_CODES.INTERNAL_ERROR;
      this.details = details;
    }
  }

  function createError(code, message, details) {
    return new AppError(code, message, details);
  }

  function formatSuccess(data, requestId) {
    return {
      success: true,
      data: data !== undefined ? data : null,
      requestId: requestId || (typeof IdService !== 'undefined' ? IdService.generateRequestId() : String(Date.now())),
      timestamp: new Date().toISOString()
    };
  }

  function formatError(error, requestId) {
    const isAppErr = error instanceof AppError;
    const code = isAppErr ? error.code : ERROR_CODES.INTERNAL_ERROR;
    const message = error && error.message ? error.message : 'Unknown server error';
    const details = isAppErr ? error.details : (error && error.stack ? error.stack : null);

    return {
      success: false,
      error: {
        code,
        message,
        details: details || null
      },
      requestId: requestId || (typeof IdService !== 'undefined' ? IdService.generateRequestId() : String(Date.now())),
      timestamp: new Date().toISOString()
    };
  }

  return {
    ERROR_CODES,
    AppError,
    createError,
    formatSuccess,
    formatError
  };
})();
