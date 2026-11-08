/**
 * HRT School Inventory Management System - Central Cache Store
 * File: frontend/state/CacheStore.js
 * Description: Client-side in-memory projection cache, append-only ledger store, and audit logging
 * 
 * Non-Negotiable Rules:
 * 1. allData is strictly a UI View Projection, NEVER the persistent Source of Truth.
 * 2. Stock Ledger is append-only and serves as the single financial/quantity Source of Truth.
 * 3. Cache updates ONLY after backend confirms successful transaction.
 */

(function (global) {
    'use strict';

    const CacheStore = {
        /**
         * Returns master items cache
         * @returns {Array}
         */
        getItems() {
            return global.allData || [];
        },

        /**
         * Sets master items cache (called on initial load or backend fetch)
         * @param {Array} items 
         */
        setItems(items) {
            global.allData = items;
            if (global.AppState) {
                global.AppState.emit('items:updated', items);
            }
        },

        /**
         * Updates a single item's stock in cache projection after confirmed backend transaction
         * @param {string} code 
         * @param {number} newBalance 
         */
        updateItemStock(code, newBalance) {
            if (!global.allData || !Array.isArray(global.allData)) return;
            const item = global.allData.find(i => i.code === code);
            if (item) {
                item.stock = newBalance;
                item.total_val = Math.round(newBalance * item.unit_cost * 100) / 100;
                if (newBalance <= item.min) item.status = 'critical';
                else if (newBalance <= item.rop) item.status = 'low';
                else item.status = 'normal';
                
                if (global.AppState) {
                    global.AppState.emit('item:stockChanged', item);
                }
            }
        },

        /**
         * Appends transaction to immutable stock ledger store
         * @param {Object} entry 
         */
        appendLedgerEntry(entry) {
            if (!global.stockLedgerEntries) {
                global.stockLedgerEntries = [];
            }
            const frozen = Object.freeze(Object.assign({}, entry));
            global.stockLedgerEntries.push(frozen);
            return frozen;
        },

        /**
         * Appends audit record to immutable audit trail
         * @param {Object} entry 
         */
        appendAuditEntry(entry) {
            if (!global.auditTrailEntries) {
                global.auditTrailEntries = [];
            }
            const frozen = Object.freeze(Object.assign({}, entry));
            global.auditTrailEntries.push(frozen);
            return frozen;
        },

        /**
         * Calculates available balance of an item from stock ledger entries (SSOT)
         * @param {string} itemId 
         * @returns {number}
         */
        calculateCurrentBalance(itemId) {
            if (typeof global.calculateCurrentBalance === 'function') {
                return global.calculateCurrentBalance(itemId);
            }
            const entries = (global.stockLedgerEntries || []).filter(e => e.Item_ID === itemId);
            if (entries.length === 0) {
                const item = (global.allData || []).find(i => i.code === itemId);
                return item ? item.stock : 0;
            }
            const last = entries[entries.length - 1];
            return typeof last.Balance_After === 'number' ? last.Balance_After : (last.balance_qty || 0);
        }
    };

    global.CacheStore = CacheStore;

})(typeof window !== 'undefined' ? window : this);
