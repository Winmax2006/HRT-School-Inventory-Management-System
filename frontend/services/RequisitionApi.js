/**
 * HRT School Inventory Management System - Requisition API Service
 * File: frontend/services/RequisitionApi.js
 * Description: Requisition lifecycle (Draft, Submit, Approve, Reject, Query)
 * 
 * Non-Negotiable Rules:
 * 1. Physical stock is NOT deducted on requisition submission or approval.
 * 2. Deductions occur strictly upon physical issuance via StockApi.
 */

(function (global) {
    'use strict';

    const RequisitionApi = {
        /**
         * Creates a new requisition draft or basket
         * @param {Object} payload 
         * @returns {Promise<Object>}
         */
        async createRequisition(payload) {
            return await global.ApiService.call('apiCreateRequisition', payload);
        },

        /**
         * Submits requisition for managerial approval
         * @param {string} reqId 
         * @returns {Promise<Object>}
         */
        async submitRequisition(reqId) {
            return await global.ApiService.call('apiSubmitRequisition', reqId);
        },

        /**
         * Approves requisition (Authority Role required)
         * @param {string} reqId 
         * @param {Object} [data={}] 
         * @returns {Promise<Object>}
         */
        async approveRequisition(reqId, data = {}) {
            return await global.ApiService.call('apiApproveRequisition', reqId, data);
        },

        /**
         * Rejects requisition with explanatory reason
         * @param {string} reqId 
         * @param {string} [reason=''] 
         * @returns {Promise<Object>}
         */
        async rejectRequisition(reqId, reason = '') {
            return await global.ApiService.call('apiRejectRequisition', reqId, reason);
        },

        /**
         * Retrieves requisition queue list
         * @param {Object} [filters={}] 
         * @returns {Promise<Array>}
         */
        async getRequisitions(filters = {}) {
            const res = await global.ApiService.call('apiGetRequisitions', filters);
            if (res && res.success && Array.isArray(res.data)) {
                return res.data;
            }
            return global.mockRequisitions || [];
        }
    };

    global.RequisitionApi = RequisitionApi;

})(typeof window !== 'undefined' ? window : this);
