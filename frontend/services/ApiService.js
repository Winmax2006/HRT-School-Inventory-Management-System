/**
 * HRT School Inventory Management System - Central API Service Gateway
 * File: frontend/services/ApiService.js
 * Description: RPC Transport Layer for Google Apps Script & Resilient Error Handling
 * 
 * Non-Negotiable Architectural Rules:
 * 1. Frontend MUST NEVER write to Google Sheets directly.
 * 2. Frontend Cache updates ONLY after Backend returns success.
 * 3. Stock Balance calculation on frontend is strictly a view projection, NOT the Source of Truth.
 * 4. Dual-mode support: Seamlessly executes google.script.run in GAS or in-memory mock locally.
 */

(function (global) {
    'use strict';

    const ACTION_MAP = {
        'apiGetCurrentUser': 'users.current',
        'apiGetUsers': 'users.list',
        'apiCreateUser': 'users.create',
        'apiUpdateUser': 'users.update',
        'apiSuspendUser': 'users.suspend',
        'apiGetItems': 'items.list',
        'apiGetItemDetail': 'items.get',
        'apiCreateItem': 'items.create',
        'apiUpdateItem': 'items.update',
        'apiGetDashboardKPIs': 'dashboard.metrics',
        'apiGetDashboardMetrics': 'dashboard.metrics',
        'apiCreateRequisition': 'requisitions.create',
        'apiSubmitRequisition': 'requisitions.submit',
        'apiGetRequisitions': 'requisitions.list',
        'apiReviewRequisition': 'requisitions.review',
        'apiApproveRequisition': 'requisitions.approve',
        'apiRejectRequisition': 'requisitions.reject',
        'apiIssueStock': 'requisitions.issue',
        'apiConfirmReceipt': 'requisitions.receive',
        'apiReceiveStock': 'stock.receive',
        'apiAdjustStock': 'stock.adjust',
        'apiGetItemLedger': 'stock.ledger',
        'apiReconcileBalance': 'stock.reconcile',
        'apiGetAuditTrail': 'audit.list',
        'apiGetAuditLogs': 'audit.list',
        'apiVerifyAuditIntegrity': 'audit.verify',
        'apiGetSettings': 'settings.get',
        'apiUpdateSettings': 'settings.update',
        'apiUpdateSettingsSection': 'settings.updateSection',
        'apiResolveQr': 'qr.resolve',
        'apiListQrCodes': 'qr.list',
        'apiCreateQrCode': 'qr.create',
        'apiRevokeQrCode': 'qr.revoke',
        'apiGetDepartments': 'departments.list',
        'apiGetFsnList': 'fsn.list',
        'apiCheckHealth': 'settings.healthCheck'
    };

    class ApiServiceCore {
        constructor() {
            this.isGas = typeof google !== 'undefined' && 
                         typeof google.script !== 'undefined' && 
                         typeof google.script.run !== 'undefined';
            this.timeoutMs = 30000;
            this.backendUrl = (typeof global.HRT_BACKEND_URL !== 'undefined') ? global.HRT_BACKEND_URL : '';
        }

        /**
         * Generates a unique traceable request ID
         * @returns {string}
         */
        generateRequestId() {
            return `REQ-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        }

        /**
         * Dispatches API request to Google Apps Script backend with fallback routing
         * @param {string} fnName Function/Action name
         * @param  {...any} args Request parameters
         * @returns {Promise<Object>}
         */
        call(fnName, ...args) {
            const reqId = this.generateRequestId();

            return new Promise((resolve, reject) => {
                if (this.isGas) {
                    let isCompleted = false;
                    const timer = setTimeout(() => {
                        if (!isCompleted) {
                            isCompleted = true;
                            reject(new Error(`Timeout: Backend function [${fnName}] timed out after ${this.timeoutMs}ms (${reqId})`));
                        }
                    }, this.timeoutMs);

                    const onSuccess = (response) => {
                        if (!isCompleted) {
                            isCompleted = true;
                            clearTimeout(timer);
                            resolve(response);
                        }
                    };

                    const onFailure = (error) => {
                        if (!isCompleted) {
                            isCompleted = true;
                            clearTimeout(timer);
                            reject(error);
                        }
                    };

                    try {
                        const runner = google.script.run
                            .withSuccessHandler(onSuccess)
                            .withFailureHandler(onFailure);

                        if (typeof runner[fnName] === 'function') {
                            runner[fnName](...args);
                        } else if (typeof runner.HRT_rpc === 'function') {
                            const action = ACTION_MAP[fnName] || fnName;
                            runner.HRT_rpc(action, args[0]);
                        } else if (typeof runner.apiCall === 'function') {
                            const action = ACTION_MAP[fnName] || fnName;
                            runner.apiCall(action, args[0]);
                        } else {
                            throw new Error(`RPC_CONTRACT_MISMATCH: Function "${fnName}" is not exported on backend bridge.`);
                        }
                    } catch (transportErr) {
                        if (!isCompleted) {
                            isCompleted = true;
                            clearTimeout(timer);
                            reject(transportErr);
                        }
                    }
                } else {
                    // Live Clean Mode: NO silent mock fallback!
                    const err = new Error('BACKEND_UNAVAILABLE: Google Apps Script bridge is not detected. Please open via authorized Web App URL or use demo.html for standalone preview.');
                    err.code = 'BACKEND_UNAVAILABLE';
                    reject(err);
                }
            });
        }
    }

    const apiInstance = new ApiServiceCore();

    // Export globally
    global.ApiServiceCore = ApiServiceCore;
    global.ApiService = apiInstance;
    global.HRT_ACTION_MAP = ACTION_MAP;

})(typeof window !== 'undefined' ? window : this);
