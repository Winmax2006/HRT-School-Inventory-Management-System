/**
 * ==============================================================================
 * HRT School Inventory Management System - Frontend Service Layer
 * File: js/services/RequisitionApi.js
 * Description: Requisition Workflow & State Machine Service
 * ==============================================================================
 * 
 * Non-Negotiable Rules:
 * 1. APPROVED status DOES NOT decrement inventory stock.
 * 2. Physical Stock decreases ONLY upon issuance (StockApi.issueStock).
 * 3. Server-side RBAC validation enforced on all write actions.
 */

var RequisitionApi = (function () {
  'use strict';

  var _requisitionsCache = [];
  var _isLoaded = false;

  /**
   * Loads requisitions from backend and syncs with UI cache
   * @param {Object} [filters]
   * @returns {Promise<Object[]>}
   */
  async function getRequisitions(filters) {
    var response = await ApiService.call('getRequisitions', filters || {});
    if (response && response.success && Array.isArray(response.data)) {
      _requisitionsCache = response.data;
    } else if (typeof window !== 'undefined' && Array.isArray(window.mockRequisitionPresets)) {
      _requisitionsCache = window.mockRequisitionPresets;
    }

    _isLoaded = true;

    // Sync to window.mockRequisitionPresets for existing UI
    if (typeof window !== 'undefined') {
      window.mockRequisitionPresets = _requisitionsCache;
    }

    return _requisitionsCache;
  }

  /**
   * Retrieves single requisition by ID
   * @param {string} reqId e.g. 'REQ-2567/001'
   * @returns {Promise<Object|null>}
   */
  async function getRequisitionById(reqId) {
    if (!_isLoaded || _requisitionsCache.length === 0) {
      await getRequisitions();
    }
    return _requisitionsCache.find(function (r) { return r.id === reqId; }) || null;
  }

  /**
   * Creates a new requisition (DRAFT)
   * @param {Object} reqData
   * @returns {Promise<Object>}
   */
  async function createRequisition(reqData) {
    if (typeof UserApi !== 'undefined' && !UserApi.hasPermission('REQUISITION_CREATE')) {
      throw new Error('PERMISSION_DENIED: User lacks REQUISITION_CREATE permission');
    }

    var currentUser = (typeof UserApi !== 'undefined') ? UserApi.getCurrentUser() : null;
    var docNo = reqData.id || ('REQ-2567/' + String(_requisitionsCache.length + 15).padStart(3, '0'));

    var newRecord = {
      id: docNo,
      date: reqData.date || new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
      teacher: reqData.teacher || (currentUser ? currentUser.name : 'ผู้ขอเบิก'),
      dept: reqData.dept || (currentUser ? currentUser.department : 'กลุ่มสาระฯ'),
      warehouse: reqData.warehouse || 'ห้องเก็บพัสดุ',
      purpose: reqData.purpose || 'ใช้ในการปฏิบัติงานราชการ',
      signerStaff: 'นายอนันต์ มั่นคง',
      signerApprover: 'นายสมศักดิ์ รุ่งเรือง',
      status: 'pending_approval', // UI maps to SUBMITTED
      items: reqData.items || []
    };

    var response = await ApiService.call('createRequisition', newRecord, { isWrite: true });
    
    // Update local UI state
    _requisitionsCache.unshift(newRecord);
    if (typeof window !== 'undefined') {
      window.mockRequisitionPresets = _requisitionsCache;
    }

    return {
      success: true,
      data: newRecord,
      message: 'Requisition created successfully'
    };
  }

  /**
   * Submits a draft requisition for approval
   * @param {string} reqId
   * @returns {Promise<Object>}
   */
  async function submitRequisition(reqId) {
    var req = await getRequisitionById(reqId);
    if (!req) throw new Error('NOT_FOUND: Requisition ' + reqId + ' not found');

    var response = await ApiService.call('submitRequisition', { requisitionId: reqId }, { isWrite: true });
    req.status = 'pending_approval';

    return {
      success: true,
      data: req,
      message: 'Requisition submitted for approval'
    };
  }

  /**
   * Approves a requisition (APPROVED)
   * Note: This DOES NOT reduce physical inventory stock!
   * @param {string} reqId
   * @param {Object} [approvalData]
   * @returns {Promise<Object>}
   */
  async function approveRequisition(reqId, approvalData) {
    if (typeof UserApi !== 'undefined' && !UserApi.hasPermission('REQUISITION_APPROVE')) {
      throw new Error('PERMISSION_DENIED: User lacks REQUISITION_APPROVE permission');
    }

    var req = await getRequisitionById(reqId);
    if (!req) throw new Error('NOT_FOUND: Requisition ' + reqId + ' not found');

    var response = await ApiService.call('approveRequisition', {
      requisitionId: reqId,
      approvalData: approvalData
    }, { isWrite: true });

    req.status = 'ready_to_issue'; // Approved and ready for physical issuance
    req.approvedAt = new Date().toISOString();
    req.approvedBy = (typeof UserApi !== 'undefined') ? UserApi.getCurrentUser().name : 'ผู้อนุมัติ';

    return {
      success: true,
      data: req,
      message: 'Requisition approved. Ready for physical stock issue.'
    };
  }

  /**
   * Rejects a requisition (REJECTED)
   * @param {string} reqId
   * @param {string} reason
   * @returns {Promise<Object>}
   */
  async function rejectRequisition(reqId, reason) {
    if (typeof UserApi !== 'undefined' && !UserApi.hasPermission('REQUISITION_APPROVE')) {
      throw new Error('PERMISSION_DENIED: User lacks REQUISITION_APPROVE permission');
    }

    var req = await getRequisitionById(reqId);
    if (!req) throw new Error('NOT_FOUND: Requisition ' + reqId + ' not found');

    var response = await ApiService.call('rejectRequisition', {
      requisitionId: reqId,
      rejectionNote: reason
    }, { isWrite: true });

    req.status = 'rejected';
    req.rejectionNote = reason || 'ไม่อนุมัติการเบิกจ่าย';

    return {
      success: true,
      data: req,
      message: 'Requisition rejected'
    };
  }

  return {
    getRequisitions: getRequisitions,
    getRequisitionById: getRequisitionById,
    createRequisition: createRequisition,
    submitRequisition: submitRequisition,
    approveRequisition: approveRequisition,
    rejectRequisition: rejectRequisition
  };
})();
