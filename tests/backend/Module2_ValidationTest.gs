/**
 * Module2_ValidationTest.gs - Regression Test for Validation & Error Layer (Module 2)
 * Scope: ErrorService.gs, ValidationService.gs
 */

function runModule2ValidationTest() {
  const results = {
    suite: 'Module 2: Validation & Error Layer',
    timestamp: new Date().toISOString(),
    testsPassed: 0,
    testsFailed: 0,
    details: []
  };

  function assert(condition, testName, message) {
    if (condition) {
      results.testsPassed++;
      results.details.push({ status: 'PASS', name: testName });
    } else {
      results.testsFailed++;
      results.details.push({ status: 'FAIL', name: testName, error: message || 'Assertion failed' });
    }
  }

  try {
    // 1. Envelope Format Tests
    const successEnv = ErrorService.formatSuccess({ test: 123 }, 'REQ-001');
    assert(successEnv.success === true && successEnv.data.test === 123 && successEnv.requestId === 'REQ-001',
      'ErrorService.formatSuccess envelope');

    const appErr = ErrorService.createError(ErrorService.ERROR_CODES.INSUFFICIENT_STOCK, 'Stock too low', { item: 'OFF-001' });
    const errEnv = ErrorService.formatError(appErr, 'REQ-002');
    assert(errEnv.success === false && errEnv.error.code === 'INSUFFICIENT_STOCK' && errEnv.error.details.item === 'OFF-001',
      'ErrorService.formatError envelope');

    // 2. Formula Injection Protection Test
    const formulaAttack = '=SUM(A1:B10)';
    const sanitizedFormula = ValidationService.sanitizeString(formulaAttack);
    assert(sanitizedFormula.startsWith("'="), 'Formula Injection Mitigation: prepends quote');

    // 3. Required Fields Validation Test
    let missingThrew = false;
    try {
      ValidationService.validateRequired({ name: 'Book' }, ['name', 'category', 'qty']);
    } catch (e) {
      missingThrew = true;
      assert(e.code === ErrorService.ERROR_CODES.VALIDATION_ERROR, 'Validation error code on missing fields');
    }
    assert(missingThrew, 'validateRequired throws when missing fields');

    // 4. Positive Number & Bounds Test
    let zeroThrew = false;
    try {
      ValidationService.validatePositiveNumber(0, 'quantity');
    } catch (e) {
      zeroThrew = true;
    }
    assert(zeroThrew, 'validatePositiveNumber rejects zero');

    const validNum = ValidationService.validatePositiveNumber(15.5, 'quantity');
    assert(validNum === 15.5, 'validatePositiveNumber accepts valid positive decimal');

    // 5. Stock Availability Rule Test
    let stockOverflowThrew = false;
    try {
      ValidationService.validateStockAvailability(100, 20, 'กระดาษ A4');
    } catch (e) {
      stockOverflowThrew = true;
      assert(e.code === ErrorService.ERROR_CODES.INSUFFICIENT_STOCK, 'Throws INSUFFICIENT_STOCK code');
    }
    assert(stockOverflowThrew, 'validateStockAvailability rejects requested > available');

    // 6. FSN Regex Validation Test
    assert(ValidationService.validateFsn('7520-00-1234') === true, 'FSN Regex accepts standard format');
    assert(ValidationService.validateFsn('invalid-fsn') === false, 'FSN Regex rejects invalid string');

    // 7. Role Validation Test
    assert(ValidationService.validateRole('officer') === 'OFFICER', 'validateRole normalizes valid role');
    let badRoleThrew = false;
    try {
      ValidationService.validateRole('SUPER_HACKER');
    } catch (e) {
      badRoleThrew = true;
    }
    assert(badRoleThrew, 'validateRole rejects unauthorized role string');

  } catch (error) {
    results.testsFailed++;
    results.details.push({ status: 'ERROR', error: error.message, stack: error.stack });
  }

  return results;
}
