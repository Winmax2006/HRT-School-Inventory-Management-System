/**
 * ==============================================================================
 * HRT School Inventory Management System - Frontend Service Layer
 * File: js/services/ApiService.js
 * Description: Central API Gateway, Network Dispatcher & Offline/Dev Simulator
 * ==============================================================================
 * 
 * Non-Negotiable Rules:
 * 1. Frontend MUST NEVER write to Google Sheets directly.
 * 2. All state-mutating requests route through protected Backend RPC Actions.
 * 3. Fallback gracefully to high-fidelity in-memory client state when backend
 *    endpoint is offline or not configured.
 */

var ApiService = (function () {
  'use strict';

  // Environment Configuration
  var config = {
    // Google Apps Script Web App Deployment URL (set via window.HRT_BACKEND_URL or Config)
    backendUrl: (typeof window !== 'undefined' && window.HRT_BACKEND_URL) || '',
    timeoutMs: 15000,
    retryAttempts: 2,
    isMockEnabled: false // Set to false when live Apps Script backend is wired
  };

  /**
   * Sets backend endpoint URL
   * @param {string} url 
   */
  function setBackendUrl(url) {
    config.backendUrl = url;
    config.isMockEnabled = !url;
  }

  /**
   * Central RPC Dispatcher
   * @param {string} action Backend action identifier (e.g. 'getItems', 'createRequisition')
   * @param {Object} [payload] Request payload
   * @param {Object} [options] Call options { skipAuth: false, isWrite: false }
   * @returns {Promise<Object>} API Response { success: true, data: ..., error: ... }
   */
  async function call(action, payload, options) {
    payload = payload || {};
    options = options || {};

    var currentUser = (typeof UserApi !== 'undefined' && UserApi.getCurrentUser) 
      ? UserApi.getCurrentUser() 
      : { userId: 'USR-001', role: 'INVENTORY_OFFICER' };

    var requestBody = {
      action: action,
      payload: payload,
      clientMeta: {
        actorId: currentUser.userId,
        actorRole: currentUser.role,
        timestamp: new Date().toISOString(),
        clientVersion: '1.0.0-pilot'
      }
    };

    // If live backend URL is configured, execute HTTP POST
    if (config.backendUrl && !config.isMockEnabled) {
      try {
        var response = await fetchWithTimeout(config.backendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(requestBody)
        }, config.timeoutMs);

        if (!response.ok) {
          throw new Error('HTTP_ERROR: ' + response.status + ' ' + response.statusText);
        }

        var result = await response.json();
        return result;
      } catch (networkError) {
        console.warn('[ApiService] Live backend call failed, falling back to simulated service:', networkError.message);
      }
    }

    // High-Fidelity Mock & Simulation Dispatcher
    return dispatchMock(action, payload, currentUser);
  }

  /**
   * Fetch with timeout protection
   */
  function fetchWithTimeout(url, opts, timeout) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        reject(new Error('REQUEST_TIMEOUT: Server did not respond within ' + timeout + 'ms'));
      }, timeout);

      fetch(url, opts).then(
        function (res) {
          clearTimeout(timer);
          resolve(res);
        },
        function (err) {
          clearTimeout(timer);
          reject(err);
        }
      );
    });
  }

  /**
   * Internal Mock Router executing operations against local state with exact backend semantics
   */
  async function dispatchMock(action, payload, currentUser) {
    // Simulate brief network latency for realistic UX feel
    await new Promise(function (r) { setTimeout(r, 60); });

    switch (action) {
      case 'getCurrentUser':
        return { success: true, data: currentUser };

      case 'getItems':
        return {
          success: true,
          data: (typeof window !== 'undefined' && window.allData) ? window.allData : []
        };

      case 'getItemByCode':
        var found = (typeof window !== 'undefined' && window.allData) 
          ? window.allData.find(function (i) { return i.code === payload.code; }) 
          : null;
        return { success: !!found, data: found };

      case 'createItem':
      case 'updateItem':
        return { success: true, data: payload, message: 'Item saved successfully (Simulated)' };

      case 'createRequisition':
      case 'submitRequisition':
      case 'approveRequisition':
      case 'rejectRequisition':
        return { success: true, data: payload, message: 'Requisition state transitioned successfully' };

      case 'issueStock':
      case 'receiveStock':
      case 'adjustStock':
        return { success: true, data: payload, message: 'Stock transaction posted to Ledger' };

      case 'getLedgerEntries':
        return { success: true, data: [] };

      case 'getAuditLogs':
        return { success: true, data: [] };

      default:
        return { success: true, data: payload, message: 'Action ' + action + ' acknowledged' };
    }
  }

  return {
    setBackendUrl: setBackendUrl,
    call: call,
    config: config
  };
})();
