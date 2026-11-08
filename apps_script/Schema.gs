/**
 * ==============================================================================
 * HRT School Inventory Management System - Central Database Engine
 * File: Schema.gs
 * Description: Complete Database Schema Definitions, Column Formatting, Validations & Seed Data
 * ==============================================================================
 */

var Schema = (function () {
  'use strict';

  var S = Config.SHEET_NAMES;

  // Complete Schema Definition for all 15 Tables
  var TABLES = {};

  // 1. 01_Users
  TABLES[S.USERS] = {
    name: S.USERS,
    description: 'ทะเบียนผู้ใช้งานและบุคลากรสถานศึกษา',
    pkField: 'user_id',
    columns: [
      { field: 'user_id', label: 'User ID (PK)', width: 120, align: 'center', format: '@', protected: true },
      { field: 'username', label: 'Username (UK)', width: 140, align: 'left', format: '@', protected: false },
      { field: 'email', label: 'Email (UK)', width: 220, align: 'left', format: '@', protected: false },
      { field: 'full_name', label: 'ชื่อ-นามสกุล', width: 220, align: 'left', format: '@', protected: false },
      { field: 'role_id', label: 'Role ID (FK)', width: 140, align: 'center', format: '@', validation: ['ADMIN', 'INVENTORY_OFFICER', 'APPROVER', 'TEACHER', 'AUDITOR', 'EXECUTIVE'], protected: false },
      { field: 'department', label: 'กลุ่มสาระฯ / ฝ่ายงาน', width: 180, align: 'left', format: '@', protected: false },
      { field: 'position', label: 'ตำแหน่งหน้าที่', width: 160, align: 'left', format: '@', protected: false },
      { field: 'is_active', label: 'สถานะใช้งาน', width: 100, align: 'center', format: '@', validation: ['TRUE', 'FALSE'], protected: false },
      { field: 'created_at', label: 'วันที่สร้าง (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true },
      { field: 'updated_at', label: 'วันที่แก้ไข (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true }
    ]
  };

  // 2. 02_Roles
  TABLES[S.ROLES] = {
    name: S.ROLES,
    description: 'ทะเบียนบทบาทและสิทธิ์การเข้าถึง (RBAC)',
    pkField: 'role_id',
    columns: [
      { field: 'role_id', label: 'Role ID (PK)', width: 140, align: 'center', format: '@', protected: true },
      { field: 'role_name', label: 'ชื่อบทบาททางการ', width: 180, align: 'left', format: '@', protected: false },
      { field: 'description', label: 'รายละเอียดหน้าที่', width: 260, align: 'left', format: '@', protected: false },
      { field: 'permissions', label: 'สิทธิ์การใช้งาน (JSON)', width: 300, align: 'left', format: '@', protected: false },
      { field: 'created_at', label: 'วันที่สร้าง (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true },
      { field: 'updated_at', label: 'วันที่แก้ไข (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true }
    ],
    initialData: [
      ['ADMIN', 'ผู้ดูแลระบบและผู้บริหารระบบสารสนเทศ', 'สิทธิ์สูงสุดในการตั้งค่า จัดการผู้ใช้ อนุมัติ และปิดบัญชีประจำปี', '["*"]'],
      ['INVENTORY_OFFICER', 'เจ้าหน้าที่พัสดุและผู้คุมคลัง', 'บริหารจัดการคลังพัสดุ รับพัสดุ จ่ายพัสดุ บันทึกบัญชีคุม ปรับยอด และตรวจนับ', '["ITEM_READ","ITEM_WRITE","REQUISITION_CREATE","REQUISITION_READ_OWN","REQUISITION_READ_ALL","STOCK_RECEIVE","STOCK_ISSUE","STOCK_ADJUST","AUDIT_READ","PHYSICAL_COUNT"]'],
      ['APPROVER', 'ผู้มีอำนาจอนุมัติคำขอเบิกพัสดุ', 'หัวหน้ากลุ่มสาระฯ และหัวหน้าฝ่ายบริหารงบประมาณ ผู้พิจารณาและอนุมัติใบเบิก', '["ITEM_READ","REQUISITION_CREATE","REQUISITION_READ_OWN","REQUISITION_READ_ALL","REQUISITION_APPROVE"]'],
      ['TEACHER', 'ครูและบุคลากรทางการศึกษา', 'ดูแคตตาล็อกพัสดุ จัดทำและยื่นคำขอเบิกพัสดุสำหรับใช้ในการเรียนการสอนและงานประจำ', '["ITEM_READ","REQUISITION_CREATE","REQUISITION_READ_OWN"]'],
      ['AUDITOR', 'ผู้ตรวจสอบภายในและกรรมการตรวจนับ', 'ตรวจสอบความถูกต้องของบัญชีคุม รายงาน พ.ด. ๑-๗ และบันทึกผลการสุ่มนับพัสดุ', '["ITEM_READ","REQUISITION_READ_ALL","AUDIT_READ","PHYSICAL_COUNT"]'],
      ['EXECUTIVE', 'ผู้บริหารสถานศึกษา', 'ผู้อำนวยการและรองผู้อำนวยการ ตรวจสอบภาพรวม อนุมัติขั้นสูงสุด และปิดรอบปีงบประมาณ', '["ITEM_READ","REQUISITION_CREATE","REQUISITION_READ_OWN","REQUISITION_READ_ALL","REQUISITION_APPROVE","AUDIT_READ","PHYSICAL_COUNT","FISCAL_YEAR_CLOSE"]']
    ]
  };

  // 3. 03_Items
  TABLES[S.ITEMS] = {
    name: S.ITEMS,
    description: 'ทะเบียนพัสดุหลัก (Master Catalog)',
    pkField: 'item_id',
    columns: [
      { field: 'item_id', label: 'Item ID (PK)', width: 130, align: 'center', format: '@', protected: true },
      { field: 'item_code', label: 'รหัสพัสดุ (UK)', width: 110, align: 'center', format: '@', protected: false },
      { field: 'item_name', label: 'ชื่อรายการพัสดุ', width: 280, align: 'left', format: '@', protected: false },
      { field: 'category_id', label: 'Category ID (FK)', width: 130, align: 'center', format: '@', protected: false },
      { field: 'location_id', label: 'Location ID (FK)', width: 130, align: 'center', format: '@', protected: false },
      { field: 'fsn_code', label: 'รหัส FSN 13 หลัก', width: 160, align: 'center', format: '@', protected: false },
      { field: 'unit', label: 'หน่วยนับ', width: 90, align: 'center', format: '@', protected: false },
      { field: 'unit_cost', label: 'ราคาต่อหน่วย (฿)', width: 120, align: 'right', format: '#,##0.00', protected: false },
      { field: 'min_stock', label: 'เกณฑ์ขั้นต่ำ (Min)', width: 120, align: 'right', format: '#,##0', protected: false },
      { field: 'reorder_point', label: 'จุดสั่งซื้อซ้ำ (ROP)', width: 130, align: 'right', format: '#,##0', protected: false },
      { field: 'supplier_name', label: 'ผู้จัดจำหน่าย/คู่สัญญา', width: 180, align: 'left', format: '@', protected: false },
      { field: 'spec_summary', label: 'คุณลักษณะเฉพาะสังเขป', width: 250, align: 'left', format: '@', protected: false },
      { field: 'is_active', label: 'สถานะใช้งาน', width: 100, align: 'center', format: '@', validation: ['TRUE', 'FALSE'], protected: false },
      { field: 'created_at', label: 'วันที่สร้าง (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true },
      { field: 'updated_at', label: 'วันที่แก้ไข (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true }
    ]
  };

  // 4. 04_Requisitions
  TABLES[S.REQUISITIONS] = {
    name: S.REQUISITIONS,
    description: 'ส่วนหัวใบขอเบิกพัสดุ (Requisition Header - แบบ พ.ด. ๑)',
    pkField: 'requisition_id',
    columns: [
      { field: 'requisition_id', label: 'Requisition ID (PK)', width: 160, align: 'center', format: '@', protected: true },
      { field: 'doc_no', label: 'เลขที่ใบเบิก (UK)', width: 140, align: 'center', format: '@', protected: false },
      { field: 'fiscal_year_id', label: 'Fiscal Year (FK)', width: 120, align: 'center', format: '@', protected: false },
      { field: 'requester_id', label: 'Requester ID (FK)', width: 140, align: 'center', format: '@', protected: false },
      { field: 'requester_name', label: 'ชื่อผู้ขอเบิก', width: 180, align: 'left', format: '@', protected: false },
      { field: 'department', label: 'กลุ่มสาระฯ / ฝ่ายงาน', width: 180, align: 'left', format: '@', protected: false },
      { field: 'purpose', label: 'วัตถุประสงค์การขอเบิก', width: 240, align: 'left', format: '@', protected: false },
      { field: 'status', label: 'สถานะคำขอ', width: 140, align: 'center', format: '@', 
        validation: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'READY_TO_ISSUE', 'PARTIALLY_ISSUED', 'ISSUED', 'CANCELLED'], 
        protected: false 
      },
      { field: 'request_date', label: 'วันที่ขอเบิก', width: 120, align: 'center', format: 'yyyy-mm-dd', protected: false },
      { field: 'approved_by', label: 'Approved By (FK)', width: 140, align: 'center', format: '@', protected: false },
      { field: 'approved_at', label: 'วันเวลาอนุมัติ', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: false },
      { field: 'rejection_note', label: 'เหตุผลการไม่อนุมัติ/ยกเลิก', width: 220, align: 'left', format: '@', protected: false },
      { field: 'created_at', label: 'วันที่สร้าง (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true },
      { field: 'updated_at', label: 'วันที่แก้ไข (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true }
    ]
  };

  // 5. 05_Requisition_Items
  TABLES[S.REQUISITION_ITEMS] = {
    name: S.REQUISITION_ITEMS,
    description: 'รายละเอียดรายการในใบขอเบิกพัสดุ (Requisition Detail)',
    pkField: 'req_item_id',
    columns: [
      { field: 'req_item_id', label: 'Req Item ID (PK)', width: 160, align: 'center', format: '@', protected: true },
      { field: 'requisition_id', label: 'Requisition ID (FK)', width: 160, align: 'center', format: '@', protected: false },
      { field: 'item_id', label: 'Item ID (FK)', width: 130, align: 'center', format: '@', protected: false },
      { field: 'requested_qty', label: 'จำนวนขอเบิก', width: 110, align: 'right', format: '#,##0', protected: false },
      { field: 'approved_qty', label: 'จำนวนอนุมัติ', width: 110, align: 'right', format: '#,##0', protected: false },
      { field: 'issued_qty', label: 'จำนวนจ่ายจริง', width: 110, align: 'right', format: '#,##0', protected: true },
      { field: 'unit', label: 'หน่วยนับ', width: 90, align: 'center', format: '@', protected: false },
      { field: 'item_status', label: 'สถานะรายการ', width: 120, align: 'center', format: '@', 
        validation: ['PENDING', 'APPROVED', 'PARTIAL', 'FULFILLED', 'REJECTED'], 
        protected: false 
      },
      { field: 'notes', label: 'หมายเหตุ', width: 200, align: 'left', format: '@', protected: false },
      { field: 'created_at', label: 'วันที่สร้าง (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true },
      { field: 'updated_at', label: 'วันที่แก้ไข (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true }
    ]
  };

  // 6. 06_Transactions
  TABLES[S.TRANSACTIONS] = {
    name: S.TRANSACTIONS,
    description: 'ส่วนหัวธุรกรรมการเคลื่อนไหวทางกายภาพ (Transaction Header)',
    pkField: 'transaction_id',
    columns: [
      { field: 'transaction_id', label: 'Transaction ID (PK)', width: 160, align: 'center', format: '@', protected: true },
      { field: 'doc_no', label: 'เลขที่เอกสารทางบัญชี (UK)', width: 150, align: 'center', format: '@', protected: false },
      { field: 'fiscal_year_id', label: 'Fiscal Year (FK)', width: 120, align: 'center', format: '@', protected: false },
      { field: 'transaction_type', label: 'ชนิดธุรกรรม', width: 140, align: 'center', format: '@', 
        validation: ['RECEIVE', 'ISSUE', 'ADJUSTMENT', 'RETURN', 'TRANSFER'], 
        protected: false 
      },
      { field: 'ref_doc_type', label: 'ประเภทเอกสารอ้างอิง', width: 160, align: 'center', format: '@', 
        validation: ['REQUISITION', 'PURCHASE_ORDER', 'PHYSICAL_COUNT', 'RETURN_SLIP', 'MANUAL'], 
        protected: false 
      },
      { field: 'ref_doc_id', label: 'รหัสเอกสารอ้างอิง', width: 160, align: 'center', format: '@', protected: false },
      { field: 'transaction_date', label: 'วันที่เกิดธุรกรรม', width: 120, align: 'center', format: 'yyyy-mm-dd', protected: false },
      { field: 'performed_by', label: 'Performed By (FK)', width: 140, align: 'center', format: '@', protected: false },
      { field: 'counterparty', label: 'ผู้รับมอบ / ผู้ส่งมอบ', width: 180, align: 'left', format: '@', protected: false },
      { field: 'notes', label: 'หมายเหตุ', width: 220, align: 'left', format: '@', protected: false },
      { field: 'status', label: 'สถานะ', width: 110, align: 'center', format: '@', validation: ['POSTED', 'VOIDED'], protected: false },
      { field: 'created_at', label: 'วันที่สร้าง (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true },
      { field: 'updated_at', label: 'วันที่แก้ไข (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true }
    ]
  };

  // 7. 07_Transaction_Items
  TABLES[S.TRANSACTION_ITEMS] = {
    name: S.TRANSACTION_ITEMS,
    description: 'รายละเอียดรายการในธุรกรรมพัสดุ (Transaction Detail)',
    pkField: 'txn_item_id',
    columns: [
      { field: 'txn_item_id', label: 'Txn Item ID (PK)', width: 160, align: 'center', format: '@', protected: true },
      { field: 'transaction_id', label: 'Transaction ID (FK)', width: 160, align: 'center', format: '@', protected: false },
      { field: 'item_id', label: 'Item ID (FK)', width: 130, align: 'center', format: '@', protected: false },
      { field: 'location_id', label: 'Location ID (FK)', width: 130, align: 'center', format: '@', protected: false },
      { field: 'quantity', label: 'จำนวนเคลื่อนไหว', width: 120, align: 'right', format: '#,##0', protected: false },
      { field: 'unit_cost', label: 'ราคาต่อหน่วย (฿)', width: 120, align: 'right', format: '#,##0.00', protected: false },
      { field: 'total_cost', label: 'มูลค่ารวม (฿)', width: 130, align: 'right', format: '#,##0.00', protected: false },
      { field: 'ref_req_item_id', label: 'Ref Req Item (FK)', width: 160, align: 'center', format: '@', protected: false },
      { field: 'notes', label: 'หมายเหตุ', width: 200, align: 'left', format: '@', protected: false },
      { field: 'created_at', label: 'วันที่สร้าง (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true }
    ]
  };

  // 8. 08_Stock_Ledger
  TABLES[S.STOCK_LEDGER] = {
    name: S.STOCK_LEDGER,
    description: 'บัญชีคุมพัสดุคงคลังแบบ Append-Only (Double-Entry Ledger - แบบ พ.ด. ๔)',
    pkField: 'ledger_id',
    columns: [
      { field: 'ledger_id', label: 'Ledger ID (PK)', width: 160, align: 'center', format: '@', protected: true },
      { field: 'fiscal_year_id', label: 'Fiscal Year (FK)', width: 120, align: 'center', format: '@', protected: true },
      { field: 'entry_timestamp', label: 'เวลาบันทึกบัญชี', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true },
      { field: 'item_id', label: 'Item ID (FK)', width: 130, align: 'center', format: '@', protected: true },
      { field: 'location_id', label: 'Location ID (FK)', width: 130, align: 'center', format: '@', protected: true },
      { field: 'movement_type', label: 'ประเภทการเคลื่อนไหว', width: 150, align: 'center', format: '@', 
        validation: ['OPENING', 'RECEIVE', 'ISSUE', 'ADJUST_IN', 'ADJUST_OUT', 'RETURN', 'CANCEL'], 
        protected: true 
      },
      { field: 'transaction_id', label: 'Transaction ID (FK)', width: 160, align: 'center', format: '@', protected: true },
      { field: 'txn_item_id', label: 'Txn Item ID (FK)', width: 160, align: 'center', format: '@', protected: true },
      { field: 'qty_in', label: 'รับเข้า (หน่วย)', width: 110, align: 'right', format: '#,##0', protected: true },
      { field: 'qty_out', label: 'จ่ายออก (หน่วย)', width: 110, align: 'right', format: '#,##0', protected: true },
      { field: 'qty_net', label: 'สุทธิ (หน่วย)', width: 110, align: 'right', format: '#,##0', protected: true },
      { field: 'unit_cost', label: 'ราคาต่อหน่วย (฿)', width: 120, align: 'right', format: '#,##0.00', protected: true },
      { field: 'val_in', label: 'มูลค่ารับเข้า (฿)', width: 130, align: 'right', format: '#,##0.00', protected: true },
      { field: 'val_out', label: 'มูลค่าจ่ายออก (฿)', width: 130, align: 'right', format: '#,##0.00', protected: true },
      { field: 'val_net', label: 'มูลค่าสุทธิ (฿)', width: 130, align: 'right', format: '#,##0.00', protected: true },
      { field: 'balance_qty', label: 'ยอดคงเหลือสะสม', width: 130, align: 'right', format: '#,##0', protected: true },
      { field: 'balance_val', label: 'มูลค่าคงเหลือสะสม', width: 140, align: 'right', format: '#,##0.00', protected: true },
      { field: 'ref_doc_no', label: 'เลขที่เอกสารอ้างอิง', width: 150, align: 'center', format: '@', protected: true },
      { field: 'created_by', label: 'Created By (FK)', width: 130, align: 'center', format: '@', protected: true },
      { field: 'is_voided', label: 'สถานะโมฆะ', width: 100, align: 'center', format: '@', validation: ['TRUE', 'FALSE'], protected: true }
    ]
  };

  // 9. 09_Audit_Log
  TABLES[S.AUDIT_LOG] = {
    name: S.AUDIT_LOG,
    description: 'บันทึกประวัติการกระทำในระบบ (System Audit Trail)',
    pkField: 'audit_id',
    columns: [
      { field: 'audit_id', label: 'Audit ID (PK)', width: 160, align: 'center', format: '@', protected: true },
      { field: 'timestamp', label: 'วันเวลาเกิดเหตุการณ์', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true },
      { field: 'user_id', label: 'User ID (FK)', width: 130, align: 'center', format: '@', protected: true },
      { field: 'action', label: 'การกระทำ', width: 120, align: 'center', format: '@', 
        validation: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'POST', 'VOID', 'AUDIT_COUNT', 'CLOSE_FY'], 
        protected: true 
      },
      { field: 'entity_name', label: 'ตารางที่เกี่ยวข้อง', width: 160, align: 'left', format: '@', protected: true },
      { field: 'entity_id', label: 'รหัสข้อมูล (Entity ID)', width: 160, align: 'center', format: '@', protected: true },
      { field: 'old_values', label: 'ข้อมูลก่อนแก้ไข (Snapshot)', width: 250, align: 'left', format: '@', protected: true },
      { field: 'new_values', label: 'ข้อมูลหลังแก้ไข (Snapshot)', width: 250, align: 'left', format: '@', protected: true },
      { field: 'ip_address', label: 'IP Address', width: 130, align: 'center', format: '@', protected: true },
      { field: 'user_agent', label: 'User Agent', width: 180, align: 'left', format: '@', protected: true },
      { field: 'status', label: 'สถานะ', width: 100, align: 'center', format: '@', validation: ['SUCCESS', 'FAILURE'], protected: true },
      { field: 'details', label: 'รายละเอียดเพิ่มเติม', width: 240, align: 'left', format: '@', protected: true }
    ]
  };

  // 10. 10_System_Config
  TABLES[S.SYSTEM_CONFIG] = {
    name: S.SYSTEM_CONFIG,
    description: 'พารามิเตอร์และการตั้งค่าระบบ (Key-Value Configuration)',
    pkField: 'config_key',
    columns: [
      { field: 'config_key', label: 'Config Key (PK)', width: 220, align: 'left', format: '@', protected: true },
      { field: 'config_value', label: 'Config Value', width: 220, align: 'left', format: '@', protected: false },
      { field: 'value_type', label: 'ชนิดข้อมูล', width: 120, align: 'center', format: '@', validation: ['STRING', 'NUMBER', 'BOOLEAN', 'JSON'], protected: false },
      { field: 'description', label: 'คำอธิบายตัวแปรตั้งค่า', width: 300, align: 'left', format: '@', protected: false },
      { field: 'is_locked', label: 'ล็อกระบบ', width: 100, align: 'center', format: '@', validation: ['TRUE', 'FALSE'], protected: false },
      { field: 'updated_by', label: 'Updated By (FK)', width: 130, align: 'center', format: '@', protected: true },
      { field: 'updated_at', label: 'วันที่แก้ไข (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true }
    ],
    initialData: [
      ['SYS_INSTITUTION_NAME', 'โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)', 'STRING', 'ชื่อสถานศึกษาทางการ', 'TRUE'],
      ['SYS_ORGANIZATION_AFFILIATION', 'องค์การบริหารส่วนจังหวัดสระบุรี', 'STRING', 'หน่วยงานต้นสังกัด', 'TRUE'],
      ['SYS_ACTIVE_FISCAL_YEAR', '2569', 'STRING', 'ปีงบประมาณที่กำลังเปิดใช้งาน', 'TRUE'],
      ['STOCK_ALLOW_NEGATIVE', 'FALSE', 'BOOLEAN', 'อนุญาตให้สต็อกติดลบหรือไม่ (ค่าเริ่มต้นคือ FALSE ห้ามติดลบ)', 'TRUE'],
      ['ROP_DEFAULT_MULTIPLIER', '1.5', 'NUMBER', 'ตัวคูณคำนวณจุดสั่งซื้อซ้ำ ROP = min_stock * multiplier', 'FALSE'],
      ['DOC_DEFAULT_SIGNER_OFFICER', 'นายอนันต์ มั่นคง', 'STRING', 'ชื่อเจ้าหน้าที่พัสดุผู้ลงนามในแบบฟอร์ม', 'FALSE'],
      ['DOC_DEFAULT_SIGNER_CHIEF', 'นายวิชัย สุวรรณโชติ', 'STRING', 'ชื่อหัวหน้าเจ้าหน้าที่พัสดุผู้ตรวจ', 'FALSE'],
      ['DOC_DEFAULT_SIGNER_APPROVER', 'นางกัลยาณี เกษมสุข', 'STRING', 'ชื่อหัวหน้ากลุ่มบริหารงานงบประมาณ / ผู้เห็นชอบ', 'FALSE']
    ]
  };

  // 11. 11_Fiscal_Years
  TABLES[S.FISCAL_YEARS] = {
    name: S.FISCAL_YEARS,
    description: 'ทะเบียนรอบปีงบประมาณและการปิดบัญชีประจำปี',
    pkField: 'fiscal_year_id',
    columns: [
      { field: 'fiscal_year_id', label: 'Fiscal Year ID (PK)', width: 140, align: 'center', format: '@', protected: true },
      { field: 'year_th', label: 'ปี พ.ศ. (UK)', width: 100, align: 'center', format: '#,##0', protected: false },
      { field: 'year_en', label: 'ปี ค.ศ. (UK)', width: 100, align: 'center', format: '#,##0', protected: false },
      { field: 'start_date', label: 'วันเริ่มต้น (1 ต.ค.)', width: 130, align: 'center', format: 'yyyy-mm-dd', protected: false },
      { field: 'end_date', label: 'วันสิ้นสุด (30 ก.ย.)', width: 130, align: 'center', format: 'yyyy-mm-dd', protected: false },
      { field: 'status', label: 'สถานะรอบปีงบ', width: 150, align: 'center', format: '@', 
        validation: ['PLANNED', 'ACTIVE', 'CLOSING_IN_PROGRESS', 'CLOSED', 'ARCHIVED'], 
        protected: false 
      },
      { field: 'closed_at', label: 'วันเวลาปิดบัญชี', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true },
      { field: 'closed_by', label: 'Closed By (FK)', width: 130, align: 'center', format: '@', protected: true },
      { field: 'notes', label: 'หมายเหตุ', width: 220, align: 'left', format: '@', protected: false },
      { field: 'created_at', label: 'วันที่สร้าง (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true },
      { field: 'updated_at', label: 'วันที่แก้ไข (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true }
    ],
    initialData: [
      ['FY-2567', '2567', '2024', '2023-10-01', '2024-09-30', 'CLOSED', 'รอบประวัติศาสตร์เดิม'],
      ['FY-2568', '2568', '2025', '2024-10-01', '2025-09-30', 'CLOSED', 'รอบเตรียมการปรับปรุงฐานข้อมูล'],
      ['FY-2569', '2569', '2026', '2025-10-01', '2026-09-30', 'ACTIVE', 'รอบปีงบประมาณปัจจุบัน (Pilot Launch)'],
      ['FY-2570', '2570', '2027', '2026-10-01', '2027-09-30', 'PLANNED', 'รอบปีงบประมาณล่วงหน้า']
    ]
  };

  // 12. 12_Physical_Counts
  TABLES[S.PHYSICAL_COUNTS] = {
    name: S.PHYSICAL_COUNTS,
    description: 'ส่วนหัวการตรวจนับพัสดุสิ้นปีงบประมาณ (Audit Header - แบบ พ.ด. ๕-๖)',
    pkField: 'count_id',
    columns: [
      { field: 'count_id', label: 'Count ID (PK)', width: 160, align: 'center', format: '@', protected: true },
      { field: 'fiscal_year_id', label: 'Fiscal Year (FK)', width: 120, align: 'center', format: '@', protected: false },
      { field: 'count_type', label: 'ประเภทการตรวจนับ', width: 150, align: 'center', format: '@', 
        validation: ['ANNUAL_CLOSING', 'MID_YEAR', 'CYCLE_COUNT', 'SPOT_CHECK'], 
        protected: false 
      },
      { field: 'count_date', label: 'วันที่ตรวจนับ (30 ก.ย.)', width: 140, align: 'center', format: 'yyyy-mm-dd', protected: false },
      { field: 'title', label: 'ชื่อหัวข้อรายงานตรวจนับ', width: 260, align: 'left', format: '@', protected: false },
      { field: 'status', label: 'สถานะการดำเนินงาน', width: 150, align: 'center', format: '@', 
        validation: ['DRAFT', 'IN_PROGRESS', 'RECONCILED', 'APPROVED', 'POSTED_TO_LEDGER'], 
        protected: false 
      },
      { field: 'committee_head', label: 'ประธานกรรมการตรวจนับ', width: 180, align: 'left', format: '@', protected: false },
      { field: 'inspector_name', label: 'หัวหน้าเจ้าหน้าที่พัสดุ', width: 180, align: 'left', format: '@', protected: false },
      { field: 'approver_name', label: 'ผู้อำนวยการ/ผู้เห็นชอบ', width: 180, align: 'left', format: '@', protected: false },
      { field: 'total_items', label: 'จำนวนชนิดที่นับ', width: 120, align: 'right', format: '#,##0', protected: false },
      { field: 'variance_items', label: 'รายการที่ไม่ตรง', width: 120, align: 'right', format: '#,##0', protected: false },
      { field: 'created_at', label: 'วันที่สร้าง (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true },
      { field: 'updated_at', label: 'วันที่แก้ไข (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true }
    ]
  };

  // 13. 13_Physical_Count_Items
  TABLES[S.PHYSICAL_COUNT_ITEMS] = {
    name: S.PHYSICAL_COUNT_ITEMS,
    description: 'รายละเอียดผลการตรวจนับพัสดุรายรายการ (Audit Detail - แบบ พ.ด. ๗)',
    pkField: 'count_item_id',
    columns: [
      { field: 'count_item_id', label: 'Count Item ID (PK)', width: 170, align: 'center', format: '@', protected: true },
      { field: 'count_id', label: 'Count ID (FK)', width: 160, align: 'center', format: '@', protected: false },
      { field: 'item_id', label: 'Item ID (FK)', width: 130, align: 'center', format: '@', protected: false },
      { field: 'location_id', label: 'Location ID (FK)', width: 130, align: 'center', format: '@', protected: false },
      { field: 'book_qty', label: 'ยอดตามบัญชี', width: 110, align: 'right', format: '#,##0', protected: false },
      { field: 'counted_qty', label: 'ยอดนับได้จริง', width: 110, align: 'right', format: '#,##0', protected: false },
      { field: 'variance_qty', label: 'ผลต่าง (+/-)', width: 110, align: 'right', format: '#,##0', protected: true },
      { field: 'unit_cost', label: 'ราคาต่อหน่วย (฿)', width: 120, align: 'right', format: '#,##0.00', protected: false },
      { field: 'variance_val', label: 'มูลค่าผลต่าง (฿)', width: 130, align: 'right', format: '#,##0.00', protected: true },
      { field: 'condition', label: 'สภาพพัสดุ', width: 140, align: 'center', format: '@', 
        validation: ['NORMAL', 'REPAIRABLE', 'DISPOSED', 'LOST'], 
        protected: false 
      },
      { field: 'action_needed', label: 'มาตรการเสนอแนะ', width: 150, align: 'center', format: '@', 
        validation: ['NONE', 'ADJUST_IN', 'ADJUST_OUT', 'REPAIR_ORDER', 'WRITE_OFF'], 
        protected: false 
      },
      { field: 'is_reconciled', label: 'ปรับยอดแล้ว', width: 110, align: 'center', format: '@', validation: ['TRUE', 'FALSE'], protected: true },
      { field: 'notes', label: 'หมายเหตุชี้แจง', width: 220, align: 'left', format: '@', protected: false },
      { field: 'created_at', label: 'วันที่สร้าง (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true },
      { field: 'updated_at', label: 'วันที่แก้ไข (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true }
    ]
  };

  // 14. 14_Locations
  TABLES[S.LOCATIONS] = {
    name: S.LOCATIONS,
    description: 'ทะเบียนคลังพัสดุและสถานที่จัดเก็บ',
    pkField: 'location_id',
    columns: [
      { field: 'location_id', label: 'Location ID (PK)', width: 140, align: 'center', format: '@', protected: true },
      { field: 'location_name', label: 'ชื่อสถานที่จัดเก็บ (UK)', width: 220, align: 'left', format: '@', protected: false },
      { field: 'building', label: 'ชื่ออาคาร', width: 150, align: 'left', format: '@', protected: false },
      { field: 'floor', label: 'ชั้น', width: 90, align: 'center', format: '@', protected: false },
      { field: 'keeper_id', label: 'Keeper ID (FK)', width: 130, align: 'center', format: '@', protected: false },
      { field: 'is_active', label: 'สถานะใช้งาน', width: 100, align: 'center', format: '@', validation: ['TRUE', 'FALSE'], protected: false },
      { field: 'created_at', label: 'วันที่สร้าง (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true },
      { field: 'updated_at', label: 'วันที่แก้ไข (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true }
    ],
    initialData: [
      ['LOC-MAIN', 'ห้องเก็บพัสดุกลาง ชั้น 1', 'อาคาร 1 (อำนวยการ)', 'ชั้น 1', 'USR-001', 'TRUE'],
      ['LOC-SRV2', 'ห้องเซิร์ฟเวอร์ อาคาร 2', 'อาคาร 2 (ปฏิบัติการ)', 'ชั้น 2', 'USR-001', 'TRUE'],
      ['LOC-LAB1', 'ห้องปฏิบัติการคอมพิวเตอร์ 1', 'อาคาร 2 (ปฏิบัติการ)', 'ชั้น 1', 'USR-001', 'TRUE'],
      ['LOC-GYM', 'ห้องพักครูพลศึกษา / โรงยิม', 'อาคารพลศึกษา', 'ชั้น 1', 'USR-001', 'TRUE'],
      ['LOC-JAN', 'ห้องเก็บอุปกรณ์แม่บ้าน', 'อาคารบริการ', 'ชั้น 1', 'USR-001', 'TRUE'],
      ['LOC-MED', 'ห้องพยาบาล อาคาร 1', 'อาคาร 1 (อำนวยการ)', 'ชั้น 1', 'USR-001', 'TRUE']
    ]
  };

  // 15. 15_Categories
  TABLES[S.CATEGORIES] = {
    name: S.CATEGORIES,
    description: 'ทะเบียน 8 หมวดหมู่วัสดุราชการ (ตาม ว ๙๖)',
    pkField: 'category_id',
    columns: [
      { field: 'category_id', label: 'Category ID (PK)', width: 130, align: 'center', format: '@', protected: true },
      { field: 'category_name', label: 'ชื่อหมวดหมู่วัสดุราชการ (UK)', width: 220, align: 'left', format: '@', protected: false },
      { field: 'fsc_group', label: 'กลุ่ม FSN 2 หลัก', width: 130, align: 'center', format: '@', protected: false },
      { field: 'fsc_group_name', label: 'ชื่อกลุ่มมาตรฐาน FSN', width: 240, align: 'left', format: '@', protected: false },
      { field: 'description', label: 'คำอธิบายขอบเขตวัสดุ', width: 260, align: 'left', format: '@', protected: false },
      { field: 'is_active', label: 'สถานะใช้งาน', width: 100, align: 'center', format: '@', validation: ['TRUE', 'FALSE'], protected: false },
      { field: 'created_at', label: 'วันที่สร้าง (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true },
      { field: 'updated_at', label: 'วันที่แก้ไข (ISO)', width: 180, align: 'center', format: 'yyyy-mm-dd hh:mm:ss', protected: true }
    ],
    initialData: [
      ['CAT-OFF', 'วัสดุสำนักงาน', '75', '75 - เครื่องเขียนและอุปกรณ์สำนักงาน', 'กระดาษ แฟ้ม ปากกา และเครื่องใช้สำนักงานทั่วไป', 'TRUE'],
      ['CAT-EDU', 'วัสดุการศึกษา', '75', '75 - เครื่องเขียนและอุปกรณ์สำนักงาน', 'อุปกรณ์สนับสนุนการเรียนการสอน สื่อการศึกษา', 'TRUE'],
      ['CAT-COM', 'วัสดุคอมพิวเตอร์', '70', '70 - อุปกรณ์ประมวลผลข้อมูลและไอที', 'หมึกพิมพ์ สายสัญญาณ เม้าส์ คีย์บอร์ด อุปกรณ์ไอที', 'TRUE'],
      ['CAT-SPT', 'วัสดุกีฬา', '78', '78 - อุปกรณ์กีฬาและนันทนาการ', 'ลูกฟุตบอล บาสเกตบอล ตาข่าย และอุปกรณ์ฝึกซ้อม', 'TRUE'],
      ['CAT-JAN', 'วัสดุงานบ้านงานครัว', '79', '79 - อุปกรณ์และน้ำยาทำความสะอาด', 'น้ำยาทำความสะอาด ไม้กวาด ถุงขยะ สบู่ล้างมือ', 'TRUE'],
      ['CAT-MED', 'วัสดุวิทยาศาสตร์หรือการแพทย์', '65', '65 - อุปกรณ์การแพทย์และเวชภัณฑ์', 'ยาปฐมพยาบาล แอลกอฮอล์ ผ้าก๊อซ หน้ากากอนามัย', 'TRUE'],
      ['CAT-ELE', 'วัสดุไฟฟ้าและวิทยุ', '62', '62 - โคมไฟฟ้าและหลอดไฟแสงสว่าง', 'หลอดไฟ ปลั๊กพ่วง สายไฟ แบตเตอรี่', 'TRUE'],
      ['CAT-CON', 'วัสดุก่อสร้าง', '53', '53 - วัสดุฮาร์ดแวร์และก่อสร้าง', 'ตะปู สี แปรงทาสี กุญแจ อุปกรณ์ซ่อมบำรุงอาคาร', 'TRUE']
    ]
  };

  return {
    TABLES: TABLES
  };
})();
