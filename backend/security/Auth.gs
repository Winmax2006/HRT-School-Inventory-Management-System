/**
 * Auth.gs - Authentication & Identity Resolution
 * Layer: Security Layer
 * Standard: Apps Script Session SSO & Secure Identity Resolution
 */

const Auth = (function() {
  let _mockActiveEmail = null;

  function setMockSessionUser(email) {
    _mockActiveEmail = email ? String(email).trim().toLowerCase() : null;
  }

  function getActiveEmail() {
    if (_mockActiveEmail) return _mockActiveEmail;

    try {
      if (typeof Session !== 'undefined') {
        const email = Session.getActiveUser().getEmail();
        if (email) return email.trim().toLowerCase();
        const effEmail = Session.getEffectiveUser().getEmail();
        if (effEmail) return effEmail.trim().toLowerCase();
      }
    } catch (e) {}

    return 'anonymous@school.ac.th';
  }

  function getCurrentUser() {
    const email = getActiveEmail();
    if (!email || email === 'anonymous@school.ac.th') {
      // In development or local web preview, return default officer profile if not configured
      return {
        user_id: 'USR-DEV-001',
        email: 'officer@school.ac.th',
        name: 'นายอนันต์ พัสดุ (Dev Mode)',
        role: 'OFFICER',
        department: 'กลุ่มบริหารงานงบประมาณ',
        status: 'ACTIVE'
      };
    }

    const user = Repository.findById(Schema.TABLES.USERS, email, 'email');
    if (!user) {
      // Fallback for new authenticated domain user
      return {
        user_id: `USR-${Date.now()}`,
        email: email,
        name: email.split('@')[0],
        role: 'TEACHER',
        department: 'งานวิชาการ',
        status: 'ACTIVE'
      };
    }

    if (user.status && user.status.toUpperCase() === 'INACTIVE') {
      throw ErrorService.createError(
        ErrorService.ERROR_CODES.UNAUTHORIZED,
        `User account is disabled: ${email}`
      );
    }

    return user;
  }

  function requireAuthenticated() {
    const user = getCurrentUser();
    if (!user || !user.email) {
      throw ErrorService.createError(
        ErrorService.ERROR_CODES.UNAUTHORIZED,
        'Authentication required. Please sign in with your school account.'
      );
    }
    return user;
  }

  return {
    setMockSessionUser,
    getActiveEmail,
    getCurrentUser,
    requireAuthenticated
  };
})();
