/**
 * ==============================================================================
 * HRT School Inventory Management System - Frontend Service Layer
 * File: js/services/UserApi.js
 * Description: User Management, Session State & Server-Aligned RBAC Client
 * ==============================================================================
 */

var UserApi = (function () {
  'use strict';

  // Master Users matching 01_Users table in Google Sheets
  var USERS = [
    {
      userId: 'USR-001',
      username: 'anant.m',
      name: 'นายอนันต์ มั่นคง',
      email: 'anant.m@hrt.ac.th',
      role: 'INVENTORY_OFFICER',
      roleName: 'เจ้าหน้าที่พัสดุและผู้คุมคลัง',
      department: 'กลุ่มบริหารงานงบประมาณ',
      position: 'เจ้าหน้าที่พัสดุชำนาญการ',
      permissions: [
        'ITEM_READ', 'ITEM_WRITE', 'REQUISITION_CREATE', 'REQUISITION_READ_OWN',
        'REQUISITION_READ_ALL', 'STOCK_RECEIVE', 'STOCK_ISSUE', 'STOCK_ADJUST',
        'AUDIT_READ', 'PHYSICAL_COUNT'
      ]
    },
    {
      userId: 'USR-002',
      username: 'kanya.j',
      name: 'ครูกัญญา ใจดี',
      email: 'kanya.j@hrt.ac.th',
      role: 'TEACHER',
      roleName: 'ครูและบุคลากรทางการศึกษา',
      department: 'กลุ่มสาระการเรียนรู้ภาษาไทย',
      position: 'ครู ค.ศ. 2',
      permissions: [
        'ITEM_READ', 'REQUISITION_CREATE', 'REQUISITION_READ_OWN'
      ]
    },
    {
      userId: 'USR-003',
      username: 'kulwadi.r',
      name: 'นางกุลวดี รักเรียน',
      email: 'kulwadi.r@hrt.ac.th',
      role: 'APPROVER',
      roleName: 'ผู้มีอำนาจอนุมัติคำขอเบิกพัสดุ',
      department: 'กลุ่มสาระการเรียนรู้คณิตศาสตร์',
      position: 'หัวหน้ากลุ่มสาระฯ',
      permissions: [
        'ITEM_READ', 'REQUISITION_CREATE', 'REQUISITION_READ_OWN',
        'REQUISITION_READ_ALL', 'REQUISITION_APPROVE'
      ]
    },
    {
      userId: 'USR-004',
      username: 'admin.hrt',
      name: 'ผู้ดูแลระบบสารสนเทศ',
      email: 'admin@hrt.ac.th',
      role: 'ADMIN',
      roleName: 'ผู้ดูแลระบบ (System Admin)',
      department: 'ศูนย์เทคโนโลยีสารสนเทศ',
      position: 'นักวิชาการคอมพิวเตอร์',
      permissions: ['*'] // Superadmin wildcard
    },
    {
      userId: 'USR-005',
      username: 'wilai.t',
      name: 'นางสาววิไล ตรวจสอบ',
      email: 'wilai.t@hrt.ac.th',
      role: 'AUDITOR',
      roleName: 'ผู้ตรวจสอบภายในและกรรมการตรวจนับ',
      department: 'งานตรวจสอบภายใน',
      position: 'กรรมการตรวจสอบพัสดุประจำปี',
      permissions: [
        'ITEM_READ', 'REQUISITION_READ_ALL', 'AUDIT_READ', 'PHYSICAL_COUNT'
      ]
    },
    {
      userId: 'USR-006',
      username: 'executive.hrt',
      name: 'นายสมศักดิ์ รุ่งเรือง',
      email: 'director@hrt.ac.th',
      role: 'EXECUTIVE',
      roleName: 'ผู้บริหารสถานศึกษา (ผู้อำนวยการ)',
      department: 'ฝ่ายบริหารโรงเรียน',
      position: 'ผู้อำนวยการโรงเรียน',
      permissions: [
        'ITEM_READ', 'REQUISITION_CREATE', 'REQUISITION_READ_OWN',
        'REQUISITION_READ_ALL', 'REQUISITION_APPROVE', 'AUDIT_READ',
        'PHYSICAL_COUNT', 'FISCAL_YEAR_CLOSE'
      ]
    }
  ];

  // Default active user (Inventory Officer)
  var currentUser = USERS[0];
  var listeners = [];

  /**
   * Retrieves the currently active user
   * @returns {Object} User session object
   */
  function getCurrentUser() {
    return currentUser;
  }

  /**
   * Switches active user session
   * @param {string} userId e.g. 'USR-001'
   * @returns {Object} Newly selected user
   */
  function switchUser(userId) {
    var found = USERS.find(function (u) { return u.userId === userId || u.role === userId; });
    if (found) {
      currentUser = found;
      notifyListeners(currentUser);
    }
    return currentUser;
  }

  /**
   * Checks whether active user holds a specific permission
   * @param {string} permission e.g. 'STOCK_ISSUE'
   * @returns {boolean}
   */
  function hasPermission(permission) {
    if (!currentUser || !currentUser.permissions) return false;
    if (currentUser.permissions.indexOf('*') !== -1) return true;
    return currentUser.permissions.indexOf(permission) !== -1;
  }

  /**
   * Returns list of all available users
   * @returns {Object[]}
   */
  function getAvailableUsers() {
    return USERS;
  }

  /**
   * Subscribes to user switch events
   * @param {Function} callback 
   */
  function onUserChange(callback) {
    if (typeof callback === 'function') {
      listeners.push(callback);
    }
  }

  function notifyListeners(user) {
    for (var i = 0; i < listeners.length; i++) {
      try {
        listeners[i](user);
      } catch (e) {
        console.error('Error in UserApi listener:', e);
      }
    }
  }

  return {
    getCurrentUser: getCurrentUser,
    switchUser: switchUser,
    hasPermission: hasPermission,
    getAvailableUsers: getAvailableUsers,
    onUserChange: onUserChange
  };
})();
