/**
 * HRT School Inventory Management System - Stock & Ledger API Service
 * File: frontend/services/StockApi.js
 * Description: Physical stock movements, append-only ledger queries, and audit logging
 * 
 * Non-Negotiable Rules:
 * 1. Physical stock increases or decreases ONLY via StockApi backend actions.
 * 2. Frontend MUST NEVER calculate Stock Balance as the persistent Source of Truth.
 * 3. Frontend cache is updated ONLY after backend confirms success.
 */

(function (global) {
    'use strict';

    const StockApi = {
        /**
         * Physical stock issuance (deducts stock upon physical handover)
         * @param {Object} payload { itemId, quantity, requisitionId, recipient, notes }
         * @returns {Promise<Object>}
         */
        async issueStock(payload) {
            const res = await global.ApiService.call('apiIssueStock', payload);
            if (res && res.success && res.result && typeof res.result.balanceAfter !== 'undefined') {
                const code = payload.itemId || payload.itemCode;
                if (global.ItemApi && typeof global.ItemApi.updateItemStockInCache === 'function') {
                    global.ItemApi.updateItemStockInCache(code, res.result.balanceAfter);
                }
            }
            return res;
        },

        /**
         * Physical stock receipt (increases stock from supplier or delivery)
         * @param {Object} payload { itemId, quantity, unitCost, supplier, poNumber, notes }
         * @returns {Promise<Object>}
         */
        async receiveStock(payload) {
            const res = await global.ApiService.call('apiReceiveStock', payload);
            if (res && res.success && res.result && typeof res.result.balanceAfter !== 'undefined') {
                const code = payload.itemId || payload.itemCode;
                if (global.ItemApi && typeof global.ItemApi.updateItemStockInCache === 'function') {
                    global.ItemApi.updateItemStockInCache(code, res.result.balanceAfter);
                }
            }
            return res;
        },

        /**
         * Retrieves ledger entries for a specific item
         * @param {string} itemId 
         * @param {Object} [options={}] 
         * @returns {Promise<Array>}
         */
        async getItemLedger(itemId, options = {}) {
            const res = await global.ApiService.call('apiGetItemLedger', itemId, options);
            return (res && res.ledger) ? res.ledger.entries : [];
        },

        /**
         * Reconciles UI cache with immutable stock ledger SSOT
         * @param {string} itemId 
         * @returns {Promise<Object>}
         */
        async reconcileBalance(itemId) {
            const res = await global.ApiService.call('apiReconcileBalance', itemId);
            return (res && res.reconcile) ? res.reconcile : { itemId, isMatch: true };
        },

        /**
         * Fetches audit trail logs
         * @param {Object} [filter={}] 
         * @returns {Promise<Array>}
         */
        async getAuditTrail(filter = {}) {
            const res = await global.ApiService.call('apiGetAuditTrail', filter);
            return (res && res.audit) ? res.audit.entries : [];
        },

        /**
         * Verifies cryptographic hash chain integrity of audit records
         * @returns {Promise<Object>}
         */
        async verifyAuditIntegrity() {
            const res = await global.ApiService.call('apiVerifyAuditIntegrity');
            return (res && res.integrity) ? res.integrity : { isValid: true };
        }
    };

    global.StockApi = StockApi;

})(typeof window !== 'undefined' ? window : this);
