/**
 * HRT School Inventory Management System - Dashboard Analytics API Service
 * File: frontend/services/DashboardApi.js
 * Description: Executive KPIs, analytics charts data queries, and aggregation services
 */

(function (global) {
    'use strict';

    const DashboardApi = {
        /**
         * Fetches summary KPI metrics from backend or calculates from cached view
         * @param {boolean} [force=false] 
         * @returns {Promise<Object>}
         */
        async getKPIs(force = false) {
            try {
                const res = await global.ApiService.call('apiGetDashboardKPIs');
                if (res && res.success && res.kpis) {
                    return res.kpis;
                }
            } catch (err) {
                console.warn('DashboardApi fallback to local dataset calculation:', err);
            }

            const items = global.allData || [];
            let totalQty = 0;
            let totalVal = 0;
            let low = 0;
            let crit = 0;

            items.forEach(it => {
                totalQty += (Number(it.stock) || 0);
                totalVal += (Number(it.total_val) || (Number(it.stock) * Number(it.unit_cost)) || 0);
                if (it.status === 'critical') crit++;
                else if (it.status === 'low') low++;
            });

            return {
                totalSKU: items.length,
                totalStockQty: totalQty,
                totalAssetValue: totalVal,
                lowStockCount: low,
                criticalStockCount: crit,
                healthyCount: items.length - (low + crit)
            };
        },

        /**
         * Calculates inventory valuation broken down by official category
         * @param {Array} [data=allData] 
         * @returns {Object}
         */
        getCategoryValuation(data) {
            const items = data || global.allData || [];
            const result = {};
            items.forEach(it => {
                const cat = it.category || 'อื่นๆ';
                const val = Number(it.total_val) || (Number(it.stock) * Number(it.unit_cost)) || 0;
                result[cat] = (result[cat] || 0) + val;
            });
            return result;
        }
    };

    global.DashboardApi = DashboardApi;

})(typeof window !== 'undefined' ? window : this);
