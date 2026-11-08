/**
 * HRT School Inventory Management System - Date Utilities
 * File: frontend/utils/DateUtils.js
 * Description: Thai Buddhist calendar conversion, date parsing, fiscal year calculation
 */

(function (global) {
    'use strict';

    const THAI_MONTHS_SHORT = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];

    const THAI_MONTHS_FULL = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const DateUtils = {
        /**
         * Converts Gregorian year to Thai Buddhist year (พ.ศ.)
         * @param {number|string} year 
         * @returns {number}
         */
        toBuddhistYear(year) {
            const y = parseInt(year, 10);
            if (isNaN(y)) return 0;
            return y < 2400 ? y + 543 : y;
        },

        /**
         * Converts Thai Buddhist year to Gregorian year (ค.ศ.)
         * @param {number|string} bYear 
         * @returns {number}
         */
        toGregorianYear(bYear) {
            const y = parseInt(bYear, 10);
            if (isNaN(y)) return 0;
            return y > 2400 ? y - 543 : y;
        },

        /**
         * Parses various date formats (DD/MM/YYYY Buddhist, YYYY-MM-DD, ISO string) into Date object
         * @param {string|Date} dateVal 
         * @returns {Date|null}
         */
        parseDate(dateVal) {
            if (!dateVal) return null;
            if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
            
            const str = String(dateVal).trim();

            // Handle DD/MM/YYYY (Thai Buddhist format commonly used in school documents)
            if (str.includes('/')) {
                const parts = str.split('/');
                if (parts.length === 3) {
                    const day = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1;
                    let year = parseInt(parts[2], 10);
                    if (year > 2400) year = year - 543;
                    const d = new Date(year, month, day);
                    if (!isNaN(d.getTime())) return d;
                }
            }

            // Standard Date constructor (handles ISO 8601, YYYY-MM-DD)
            const parsed = new Date(str);
            return isNaN(parsed.getTime()) ? null : parsed;
        },

        /**
         * Formats date into Thai Buddhist representation: "15 พ.ค. 2567"
         * @param {string|Date} dateVal 
         * @param {boolean} [showTime=false] 
         * @param {boolean} [fullMonth=false]
         * @returns {string}
         */
        formatThaiDate(dateVal, showTime = false, fullMonth = false) {
            const d = this.parseDate(dateVal);
            if (!d) return '-';

            const day = d.getDate();
            const monthIdx = d.getMonth();
            const monthStr = fullMonth ? THAI_MONTHS_FULL[monthIdx] : THAI_MONTHS_SHORT[monthIdx];
            const bYear = this.toBuddhistYear(d.getFullYear());

            let result = `${day} ${monthStr} ${bYear}`;
            if (showTime) {
                const hours = String(d.getHours()).padStart(2, '0');
                const mins = String(d.getMinutes()).padStart(2, '0');
                result += ` ${hours}:${mins} น.`;
            }
            return result;
        },

        /**
         * Formats date for official Thai government forms: "15 พฤษภาคม 2567"
         * @param {string|Date} dateVal 
         * @returns {string}
         */
        formatOfficialDate(dateVal) {
            return this.formatThaiDate(dateVal, false, true);
        },

        /**
         * Calculates Thai fiscal year (starts 1 October of previous calendar year)
         * E.g. Oct 2023 - Sep 2024 is Fiscal Year 2567
         * @param {string|Date} [dateVal=new Date()] 
         * @returns {number}
         */
        getFiscalYear(dateVal = new Date()) {
            const d = this.parseDate(dateVal) || new Date();
            const month = d.getMonth() + 1; // 1-12
            const year = d.getFullYear();
            // If month is Oct, Nov, Dec (10, 11, 12), fiscal year is next calendar year
            const fiscalGregorian = month >= 10 ? year + 1 : year;
            return fiscalGregorian + 543;
        },

        /**
         * Formats ISO timestamp to local readable time string "HH:mm:ss"
         * @param {string|Date} dateVal 
         * @returns {string}
         */
        formatTimeOnly(dateVal) {
            const d = this.parseDate(dateVal);
            if (!d) return '-';
            const h = String(d.getHours()).padStart(2, '0');
            const m = String(d.getMinutes()).padStart(2, '0');
            const s = String(d.getSeconds()).padStart(2, '0');
            return `${h}:${m}:${s}`;
        },

        /**
         * Returns ISO Date string YYYY-MM-DD
         * @param {string|Date} [dateVal=new Date()]
         * @returns {string}
         */
        toIsoDateString(dateVal = new Date()) {
            const d = this.parseDate(dateVal) || new Date();
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }
    };

    // Export to global scope for 100% backward compatibility
    global.DateUtils = DateUtils;
    global.toBuddhistYear = DateUtils.toBuddhistYear.bind(DateUtils);
    global.formatThaiDate = DateUtils.formatThaiDate.bind(DateUtils);

})(typeof window !== 'undefined' ? window : this);
