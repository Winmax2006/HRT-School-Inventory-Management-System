/**
 * HRT School Inventory Management System - Item API Service
 * File: frontend/services/ItemApi.js
 * Description: Catalog queries, single item detail fetch, and UI cache updates
 * 
 * Non-Negotiable Rules:
 * 1. allData is strictly a UI View Cache, NEVER the persistent Source of Truth.
 * 2. Cache updates only after Backend confirms successful transaction.
 */

(function (global) {
    'use strict';

    const ItemApi = {
        /**
         * Fetches items matching filter query
         * @param {Object} [filter={}] 
         * @param {boolean} [force=false] 
         * @returns {Promise<Array>}
         */
        async getItems(filter = {}, force = false) {
            try {
                const res = await global.ApiService.call('apiGetItems', filter);
                if (res && res.success) {
                    const items = res.items || res.data || [];
                    if (!filter.search && (!filter.category || filter.category === 'ALL')) {
                        global.allData = items;
                    }
                    return items;
                }
            } catch (err) {
                console.warn('ItemApi.getItems falling back to local memory:', err);
            }
            return global.allData || [];
        },

        /**
         * Retrieves single item by code
         * @param {string} code 
         * @returns {Promise<Object|null>}
         */
        async getItemByCode(code) {
            if (!code) return null;
            if (global.allData && Array.isArray(global.allData)) {
                const found = global.allData.find(i => i.code === code);
                if (found) return found;
            }
            const items = await this.getItems({ search: code }, true);
            return items.find(i => i.code === code) || null;
        },

        /**
         * Updates item stock in UI view cache ONLY after backend confirmation
         * @param {string} code 
         * @param {number} newStock 
         */
        updateItemStockInCache(code, newStock) {
            if (!global.allData || !Array.isArray(global.allData)) return;
            const item = global.allData.find(i => i.code === code);
            if (item) {
                item.stock = newStock;
                item.total_val = Math.round(newStock * item.unit_cost * 100) / 100;
                if (newStock <= item.min) item.status = 'critical';
                else if (newStock <= item.rop) item.status = 'low';
                else item.status = 'normal';
            }
        }
    };

    global.ItemApi = ItemApi;

})(typeof window !== 'undefined' ? window : this);
