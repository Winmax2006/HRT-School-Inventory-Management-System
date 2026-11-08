/**
 * AuthService.gs - Authentication Session & Directory Bootstrapping
 * Layer: Domain Service Layer
 * Standard: Identity Verification & Safe SSO Directory Sync
 */

const AuthService = (function() {
  function verifySession() {
    const user = Auth.requireAuthenticated();
    return {
      authenticated: true,
      user
    };
  }

  function ensureDefaultUsers() {
    const existingUsers = Repository.findAll(Schema.TABLES.USERS);
    if (existingUsers && existingUsers.length > 0) {
      return existingUsers;
    }

    const defaultUsers = [
      {
        user_id: 'USR-0001',
        email: 'admin@school.ac.th',
        name: 'ผู้ดูแลระบบ (Admin)',
        role: 'ADMIN',
        department: 'บริหารทั่วไป',
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      },
      {
        user_id: 'USR-0002',
        email: 'officer@school.ac.th',
        name: 'นายอนันต์ พัสดุ (เจ้าหน้าที่พัสดุ)',
        role: 'OFFICER',
        department: 'กลุ่มบริหารงานงบประมาณ',
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      },
      {
        user_id: 'USR-0003',
        email: 'director@school.ac.th',
        name: 'ผู้อำนวยการโรงเรียน (ผู้อนุมัติ)',
        role: 'APPROVER',
        department: 'สำนักผู้บริหาร',
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      },
      {
        user_id: 'USR-0004',
        email: 'teacher@school.ac.th',
        name: 'ครูกัญญา รักการสอน (ครูผู้ขอเบิก)',
        role: 'TEACHER',
        department: 'กลุ่มสาระฯ ภาษาไทย',
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      }
    ];

    Repository.insertBatch(Schema.TABLES.USERS, defaultUsers);
    return defaultUsers;
  }

  return {
    verifySession,
    ensureDefaultUsers
  };
})();
