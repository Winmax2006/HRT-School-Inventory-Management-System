const fs = require('fs');
const path = require('path');

const matrixRows = [
  {
    role: 'ADMIN',
    role_name_th: 'ผู้ดูแลระบบสารสนเทศ',
    hierarchy_weight: 60,
    ui_menu_access: 'Dashboard; Inventory; Requisitions; Action Needed; FSN Catalog; Documents/Reports; Year-End Audit; System Settings',
    ui_buttons_access: 'New Item; Import Items; Restock; Review Requisition; Approve Requisition; Reject Requisition; Issue Stock; Manage Users; Update Settings; Reconcile Stock; Year-End Audit; Manage QR',
    allowed_permissions: 'VIEW_INVENTORY; CREATE_REQUISITION; CANCEL_OWN_REQUISITION; VIEW_OWN_REQUISITIONS; VIEW_ALL_REQUISITIONS; REVIEW_REQUISITION; APPROVE_REQUISITION; REJECT_REQUISITION; ISSUE_STOCK; RECEIVE_STOCK; ADJUST_STOCK; MANAGE_ITEMS; IMPORT_ITEMS; MANAGE_FSN; MANAGE_USERS; MANAGE_SETTINGS; CLOSE_FISCAL_YEAR; VIEW_AUDIT_LOG; VERIFY_AUDIT_LOG; YEAR_END_AUDIT; QR_RESOLVE; MANAGE_QR',
    allowed_actions: 'ALL (bootstrap; items.*; requisitions.*; stock.*; audit.*; qr.*; users.*; settings.*; fiscalYear.*)',
    object_scope: 'Global School Universe (All departments, all users, all fiscal years, master catalog, audit trail)',
    separation_of_duties: 'Subject to Last-Admin Protection (cannot self-demote or suspend last admin); cannot approve own submitted requisition (self-approval prohibited)'
  },
  {
    role: 'DIRECTOR',
    role_name_th: 'ผู้อำนวยการสถานศึกษา / รองผู้อำนวยการ',
    hierarchy_weight: 50,
    ui_menu_access: 'Dashboard; Inventory; Requisitions; Action Needed; Documents/Reports',
    ui_buttons_access: 'Approve Requisition; Reject Requisition; Print Official Reports',
    allowed_permissions: 'VIEW_INVENTORY; VIEW_ALL_REQUISITIONS; APPROVE_REQUISITION; REJECT_REQUISITION; VIEW_AUDIT_LOG; QR_RESOLVE',
    allowed_actions: 'bootstrap; items.list; items.get; requisitions.list; requisitions.get; requisitions.approve; requisitions.reject; dashboard.metrics; audit.list; qr.resolve',
    object_scope: 'School-wide Requisitions Queue, Executive Dashboard, Asset Valuation Reports, Audit Logs (Read-only)',
    separation_of_duties: 'Strict executive approval only; cannot issue physical stock; cannot manage items/users/settings; cannot approve own submitted requisition'
  },
  {
    role: 'APPROVER',
    role_name_th: 'ผู้มีอำนาจอนุมัติ / หัวหน้ากลุ่มสาระฯ',
    hierarchy_weight: 40,
    ui_menu_access: 'Dashboard; Inventory; Requisitions; Action Needed; Documents/Reports',
    ui_buttons_access: 'Review Requisition; Approve Requisition; Reject Requisition',
    allowed_permissions: 'VIEW_INVENTORY; VIEW_ALL_REQUISITIONS; REVIEW_REQUISITION; APPROVE_REQUISITION; REJECT_REQUISITION; VIEW_AUDIT_LOG; QR_RESOLVE',
    allowed_actions: 'bootstrap; items.list; items.get; requisitions.list; requisitions.get; requisitions.review; requisitions.approve; requisitions.reject; dashboard.metrics; audit.list; qr.resolve',
    object_scope: 'Department Requisitions Queue, Department Inventory, Audit Logs (Read-only)',
    separation_of_duties: 'Review and approve department requests; cannot issue physical warehouse stock; cannot manage catalog/users; cannot approve own requisition'
  },
  {
    role: 'OFFICER',
    role_name_th: 'เจ้าหน้าที่พัสดุ / เจ้าหน้าที่คลัง',
    hierarchy_weight: 30,
    ui_menu_access: 'Dashboard; Inventory; Requisitions; Action Needed; FSN Catalog; Documents/Reports; Year-End Audit',
    ui_buttons_access: 'New Item; Import Items; Restock; Review Requisition; Issue Stock; Receive Stock; Adjust Stock; Manage FSN; Year-End Audit Count; Manage QR',
    allowed_permissions: 'VIEW_INVENTORY; CREATE_REQUISITION; CANCEL_OWN_REQUISITION; VIEW_OWN_REQUISITIONS; VIEW_ALL_REQUISITIONS; REVIEW_REQUISITION; ISSUE_STOCK; RECEIVE_STOCK; ADJUST_STOCK; MANAGE_ITEMS; IMPORT_ITEMS; MANAGE_FSN; YEAR_END_AUDIT; VIEW_AUDIT_LOG; QR_RESOLVE; MANAGE_QR',
    allowed_actions: 'bootstrap; items.*; requisitions.list; requisitions.get; requisitions.create; requisitions.review; stock.issue; stock.receive; stock.adjust; stock.ledger; fsn.*; audit.yearEnd; qr.*; dashboard.metrics',
    object_scope: 'Physical Inventory, Master Warehouse, Complete Requisitions Queue, Stock Ledger, FSN Catalog, Annual Audit Count',
    separation_of_duties: 'Warehouse custody and stock issuance; reviews line items but cannot execute final approval (approval reserved for Approver/Director); cannot manage user accounts or modify institutional settings'
  },
  {
    role: 'TEACHER',
    role_name_th: 'ครูผู้สอน / บุคลากรทางการศึกษา',
    hierarchy_weight: 10,
    ui_menu_access: 'Dashboard; Inventory; Requisitions',
    ui_buttons_access: 'Create Requisition; Cancel Own Requisition; Print Own Requisition Slip; Scan QR',
    allowed_permissions: 'VIEW_INVENTORY; CREATE_REQUISITION; CANCEL_OWN_REQUISITION; VIEW_OWN_REQUISITIONS; QR_RESOLVE',
    allowed_actions: 'bootstrap; items.list; items.get; requisitions.create; requisitions.get; requisitions.cancel; qr.resolve; users.current',
    object_scope: 'Own Department / Class Inventory View, Own Requisitions Queue (Scoped strictly to caller.user_id)',
    separation_of_duties: 'Self-service requisition creation; cannot view other teachers\' draft/unapproved requests; cannot review, approve, issue, or adjust stock; cannot view system audit logs or manage catalog'
  },
  {
    role: 'REQUESTER',
    role_name_th: 'ผู้ขอเบิกพัสดุทั่วไป / เจ้าหน้าที่สนับสนุน',
    hierarchy_weight: 10,
    ui_menu_access: 'Dashboard; Inventory; Requisitions (MiniUI & Self-Service Portal)',
    ui_buttons_access: 'Create Requisition; Cancel Own Requisition; Scan QR to Cart',
    allowed_permissions: 'VIEW_INVENTORY; CREATE_REQUISITION; CANCEL_OWN_REQUISITION; VIEW_OWN_REQUISITIONS; QR_RESOLVE',
    allowed_actions: 'bootstrap; items.list; items.get; requisitions.create; requisitions.get; requisitions.cancel; qr.resolve; users.current',
    object_scope: 'Own Requisitions (Scoped strictly to caller.user_id), Public Inventory Catalog View',
    separation_of_duties: 'Base requester privileges; cannot access administrative menus, officer review queue, stock adjustments, or system settings'
  }
];

const headers = [
  'role',
  'role_name_th',
  'hierarchy_weight',
  'ui_menu_access',
  'ui_buttons_access',
  'allowed_permissions',
  'allowed_actions',
  'object_scope',
  'separation_of_duties'
];

const csvLines = [headers.join(',')];
matrixRows.forEach(r => {
  const line = headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(',');
  csvLines.push(line);
});

const outputPath = path.join(__dirname, '../docs/repair/USER_PERMISSION_MATRIX.csv');
fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf8');
console.log('Successfully generated ' + outputPath);
