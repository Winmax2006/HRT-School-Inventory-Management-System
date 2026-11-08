/**
 * Module3_AuthTest.gs - Regression Test for Authentication & User Service (Module 3)
 * Scope: Auth.gs, AuthService.gs, UserService.gs, UserApi.gs
 */

function runModule3AuthTest() {
  const results = {
    suite: 'Module 3: Authentication & User Service',
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
    // Reset Database mock store for clean isolation
    Database.resetMockStore();
    Database.appendRow(Schema.TABLES.USERS, Schema.getHeaders(Schema.TABLES.USERS));

    // 1. Ensure Default Users
    const seeded = AuthService.ensureDefaultUsers();
    assert(seeded && seeded.length === 4, 'AuthService.ensureDefaultUsers created 4 default accounts');

    // 2. Auth Session Resolution
    Auth.setMockSessionUser('officer@school.ac.th');
    const currentUser = Auth.getCurrentUser();
    assert(currentUser && currentUser.role === 'OFFICER', 'Auth.getCurrentUser resolves OFFICER role');

    // 3. User Service Creation
    const newUser = UserService.createUser({
      email: 'somchai.sci@school.ac.th',
      name: 'ครูสมชาย (หมวดวิทย์)',
      role: 'TEACHER',
      department: 'กลุ่มสาระฯ วิทยาศาสตร์'
    });
    assert(newUser && newUser.user_id && newUser.email === 'somchai.sci@school.ac.th', 'UserService.createUser succeeds');

    // 4. Duplicate Email Conflict Rejection
    let dupThrew = false;
    try {
      UserService.createUser({
        email: 'somchai.sci@school.ac.th',
        name: 'ครูสมชาย ซ้ำ',
        role: 'TEACHER'
      });
    } catch (e) {
      dupThrew = true;
      assert(e.code === ErrorService.ERROR_CODES.CONFLICT, 'Rejection throws CONFLICT code');
    }
    assert(dupThrew, 'UserService.createUser blocks duplicate email');

    // 5. Invalid Email Format Rejection
    let badEmailThrew = false;
    try {
      UserService.createUser({
        email: 'invalid-email-string',
        name: 'ครูผิดพลาด',
        role: 'TEACHER'
      });
    } catch (e) {
      badEmailThrew = true;
    }
    assert(badEmailThrew, 'UserService.createUser blocks invalid email format');

    // 6. UserApi Envelope Response
    const apiRes = UserApi.apiGetCurrentUser('REQ-TEST-003');
    assert(apiRes.success === true && apiRes.data.role === 'OFFICER' && apiRes.requestId === 'REQ-TEST-003',
      'UserApi.apiGetCurrentUser returns standard success envelope');

    // 7. UserApi Permission Guard Check
    Auth.setMockSessionUser('teacher@school.ac.th'); // Switch to regular teacher
    const failCreateRes = UserApi.apiCreateUser({
      email: 'hacker@school.ac.th',
      name: 'Hacker',
      role: 'ADMIN'
    });
    assert(failCreateRes.success === false && failCreateRes.error.code === 'FORBIDDEN',
      'UserApi.apiCreateUser blocks non-admin/officer with FORBIDDEN');

  } catch (error) {
    results.testsFailed++;
    results.details.push({ status: 'ERROR', error: error.message, stack: error.stack });
  }

  return results;
}
