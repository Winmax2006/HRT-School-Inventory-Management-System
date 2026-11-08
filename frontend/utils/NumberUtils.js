/**
 * HRT School Inventory Management System - Number Utilities
 * File: frontend/utils/NumberUtils.js
 * Description: Mathematical calculations, rounding, numerical validations and aggregations
 */

(function (global) {
    'use strict';

    const NumberUtils = {
        /**
         * Formats number with commas: 1234.56 -> "1,234.56"
         * @param {number|string} num 
         * @param {number} [decimals] 
         * @returns {string}
         */
        formatNumber(num, decimals) {
            const n = parseFloat(num);
            if (isNaN(n)) return '0';
            if (typeof decimals === 'number') {
                return new Intl.NumberFormat('th-TH', {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals
                }).format(n);
            }
            return new Intl.NumberFormat('th-TH').format(n);
        },

        /**
         * Parses arbitrary input to float safely, returning fallback on NaN
         * @param {*} val 
         * @param {number} [fallback=0] 
         * @returns {number}
         */
        parseNumber(val, fallback = 0) {
            if (val === null || val === undefined) return fallback;
            if (typeof val === 'number') return isNaN(val) ? fallback : val;
            const cleaned = String(val).replace(/,/g, '').replace(/฿/g, '').trim();
            const n = parseFloat(cleaned);
            return isNaN(n) ? fallback : n;
        },

        /**
         * Clamps a number between min and max bounds
         * @param {number} val 
         * @param {number} min 
         * @param {number} max 
         * @returns {number}
         */
        clamp(val, min, max) {
            const n = this.parseNumber(val, min);
            return Math.min(Math.max(n, min), max);
        },

        /**
         * Rounds number to specific decimal precision
         * @param {number} num 
         * @param {number} [decimals=2] 
         * @returns {number}
         */
        roundTo(num, decimals = 2) {
            const n = this.parseNumber(num);
            const factor = Math.pow(10, decimals);
            return Math.round((n + Number.EPSILON) * factor) / factor;
        },

        /**
         * Calculates percentage with optional rounding
         * @param {number} part 
         * @param {number} total 
         * @param {number} [decimals=1] 
         * @returns {number}
         */
        calculatePercentage(part, total, decimals = 1) {
            const p = this.parseNumber(part);
            const t = this.parseNumber(total);
            if (t <= 0) return 0;
            return this.roundTo((p / t) * 100, decimals);
        },

        /**
         * Sums values from an array using value getter
         * @param {Array} arr 
         * @param {Function|string} [keyOrFn] 
         * @returns {number}
         */
        sum(arr, keyOrFn) {
            if (!Array.isArray(arr) || arr.length === 0) return 0;
            return arr.reduce((acc, item) => {
                let val = 0;
                if (!keyOrFn) {
                    val = this.parseNumber(item);
                } else if (typeof keyOrFn === 'function') {
                    val = this.parseNumber(keyOrFn(item));
                } else if (typeof keyOrFn === 'string' && item) {
                    val = this.parseNumber(item[keyOrFn]);
                }
                return acc + val;
            }, 0);
        }
    };

    // Export to global scope
    global.NumberUtils = NumberUtils;
    global.formatNumber = NumberUtils.formatNumber.bind(NumberUtils);

})(typeof window !== 'undefined' ? window : this);
