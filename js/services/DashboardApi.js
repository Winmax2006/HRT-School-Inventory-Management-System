/**
 * ==============================================================================
 * HRT School Inventory Management System - Frontend Service Layer
 * File: js/services/DashboardApi.js
 * Description: Analytics, KPI Summaries & Chart Data Aggregation Service
 * ==============================================================================
 */

var DashboardApi = (function () {
  'use strict';

  /**
   * Calculates dashboard KPI metrics across catalog items
   * @param {Object[]} [items] Optional item dataset (defaults to ItemApi cache)
   * @param {Object} [filters] Optional filters (date, dept, warehouse)
   * @returns {Object} KPI summary metrics
   */
  function getDashboardMetrics(items, filters) {
    var data = items || (typeof window !== 'undefined' && window.allData) || [];
    filters = filters || {};

    if (filters.warehouse) {
      data = data.filter(function (i) { return i.warehouse === filters.warehouse; });
    }
    if (filters.category) {
      data = data.filter(function (i) { return i.category === filters.category; });
    }

    var totalItems = data.length;
    var totalStock = 0;
    var totalVal = 0;
    var normalCount = 0;
    var lowCount = 0;
    var criticalCount = 0;

    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      var qty = Number(item.stock) || 0;
      var val = Number(item.total_val) || 0;

      totalStock += qty;
      totalVal += val;

      if (item.status === 'critical') {
        criticalCount++;
      } else if (item.status === 'low') {
        lowCount++;
      } else {
        normalCount++;
      }
    }

    var healthRate = totalItems > 0 ? Math.round((normalCount / totalItems) * 100) : 0;

    return {
      totalItems: totalItems,
      totalStock: totalStock,
      totalValue: Math.round(totalVal * 100) / 100,
      normalCount: normalCount,
      lowCount: lowCount,
      criticalCount: criticalCount,
      healthRate: healthRate
    };
  }

  /**
   * Aggregates stock aging into 4 tiers
   * @param {Object[]} [items]
   * @param {number} [refTimestamp]
   * @returns {Object} Aging distribution
   */
  function getAgingMetrics(items, refTimestamp) {
    var data = items || (typeof window !== 'undefined' && window.allData) || [];
    var now = refTimestamp || Date.now();

    var tier1 = []; // < 30 days
    var tier2 = []; // 31 - 90 days
    var tier3 = []; // 91 - 180 days
    var tier4 = []; // > 180 days (Dead Stock)

    data.forEach(function (item) {
      var latestTime = 0;
      var hist = item.history || [];

      hist.forEach(function (h) {
        if (h.date) {
          var t = new Date(h.date).getTime();
          if (!isNaN(t) && t > latestTime) latestTime = t;
        }
      });

      if (latestTime === 0) {
        tier4.push(item);
      } else {
        var diffDays = Math.floor((now - latestTime) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) tier1.push(item);
        else if (diffDays <= 90) tier2.push(item);
        else if (diffDays <= 180) tier3.push(item);
        else tier4.push(item);
      }
    });

    return {
      fresh: { label: '< 30 วัน', count: tier1.length, items: tier1 },
      normal: { label: '31 - 90 วัน', count: tier2.length, items: tier2 },
      warning: { label: '91 - 180 วัน', count: tier3.length, items: tier3 },
      deadStock: { label: '> 180 วัน (Dead Stock)', count: tier4.length, items: tier4 }
    };
  }

  return {
    getDashboardMetrics: getDashboardMetrics,
    getAgingMetrics: getAgingMetrics
  };
})();
