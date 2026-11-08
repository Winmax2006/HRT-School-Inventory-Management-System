/**
 * HRT School Inventory Management System - Formatting & Presentation Utilities
 * File: frontend/utils/FormatUtils.js
 * Description: Currency formatters, FSN codes, badges, and category presentation metadata
 */

(function (global) {
    'use strict';

    const FormatUtils = {
        /**
         * Formats numerical value as Thai Baht currency (฿#,##0.00)
         * @param {number|string} val 
         * @returns {string}
         */
        formatCurrency(val) {
            const num = (typeof val === 'number') ? val : (parseFloat(String(val).replace(/,/g, '')) || 0);
            return '฿' + new Intl.NumberFormat('th-TH', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            }).format(num);
        },

        /**
         * Alias for formatCurrency matching existing monolithic code signature
         */
        formatMoney(val) {
            return this.formatCurrency(val);
        },

        /**
         * Formats raw digits into standardized FSN pattern (e.g. 7510-00-582-4112)
         * @param {string} code 
         * @returns {string}
         */
        formatFsnCode(code) {
            if (!code) return '';
            const digits = String(code).replace(/[^0-9]/g, '');
            if (digits.length === 13) {
                return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 9)}-${digits.slice(9, 13)}`;
            }
            if (digits.length === 11) {
                return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 11)}`;
            }
            return String(code).trim();
        },

        /**
         * Deterministic FSN 13-digit code mapping by official government FSC group/class
         * @param {Object} item 
         * @returns {string}
         */
        getFsnCodeForItem(item) {
            if (!item) return '7510-00-000-0000';
            
            // 1. Direct match with registered FSN items in fsnData
            if (typeof global.fsnData !== 'undefined' && Array.isArray(global.fsnData) && global.fsnData.length > 0) {
                const matched = global.fsnData.find(f => f.linked_code === item.code);
                if (matched && matched.fsn_code) return matched.fsn_code;
            }
            
            // 2. Deterministic FSN 13-digit code mapping by official government FSC group/class
            let fsc = '7510';
            const cat = item.category || '';
            const code = item.code || '';
            if (cat.includes('สำนักงาน')) {
                fsc = code.startsWith('OFF-01') ? '7520' : '7510';
            } else if (cat.includes('คอมพิวเตอร์')) {
                fsc = '7025';
            } else if (cat.includes('การศึกษา')) {
                fsc = '7530';
            } else if (cat.includes('กีฬา')) {
                fsc = '7810';
            } else if (cat.includes('งานบ้านงานครัว')) {
                fsc = '7930';
            } else if (cat.includes('วิทยาศาสตร์') || cat.includes('การแพทย์')) {
                fsc = '6505';
            } else if (cat.includes('ไฟฟ้า') || cat.includes('วิทยุ')) {
                fsc = '6240';
            } else if (cat.includes('ก่อสร้าง')) {
                fsc = '5340';
            }

            const numMatch = code.match(/\d+/);
            const num = numMatch ? parseInt(numMatch[0], 10) : 1;
            const part1 = String(100 + (num * 17) % 899).padStart(3, '0');
            const part2 = String(1000 + (num * 37) % 8999).padStart(4, '0');
            return `${fsc}-00-${part1}-${part2}`;
        },

        /**
         * Status Badge Helper (WCAG AA Compliant: Shape + Icon + Explicit Label + Semantic Color + High Contrast + ARIA)
         * @param {string} status 'normal' | 'low' | 'critical'
         * @param {boolean} [clickable=false]
         * @returns {string} HTML string
         */
        getStatusBadge(status, clickable = false) {
            let cls = '', icon = '', text = '', aria = '';
            if (status === 'normal') {
                cls = 'status-normal';
                icon = 'ph-check-circle text-emerald-600';
                text = 'ปกติ (พร้อมใช้)';
                aria = 'สถานะ: ปกติ พร้อมใช้งาน';
            } else if (status === 'low') {
                cls = 'status-low';
                icon = 'ph-warning text-amber-600';
                text = 'เฝ้าระวัง (ใกล้ขั้นต่ำ)';
                aria = 'สถานะ: เฝ้าระวัง ใกล้จุดสั่งซื้อ';
            } else if (status === 'critical') {
                cls = 'status-critical';
                icon = 'ph-warning-octagon text-rose-600';
                text = 'วิกฤติ (ต่ำกว่าขั้นต่ำ)';
                aria = 'สถานะ: วิกฤติ ต่ำกว่าเกณฑ์ขั้นต่ำ';
            } else {
                return '';
            }

            if (clickable) {
                return `<button type="button" onclick="event.stopPropagation(); if (typeof switchMainView === 'function') switchMainView('inventory'); if (typeof setQuickStatusFilter === 'function') setQuickStatusFilter('${status}');" class="status-badge ${cls} inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold hover:ring-2 hover:ring-offset-1 hover:opacity-90 active:scale-95 transition cursor-pointer" role="status" aria-label="${aria} (คลิกเพื่อกรองสถานะนี้)" title="คลิกเพื่อกรองเฉพาะพัสดุสถานะ ${text}"><i class="ph-bold ${icon} text-sm" aria-hidden="true"></i><span>${text}</span></button>`;
            }
            return `<span class="status-badge ${cls} inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" role="status" aria-label="${aria}"><i class="ph-bold ${icon} text-sm" aria-hidden="true"></i><span>${text}</span></span>`;
        },

        /**
         * Category Metadata (8 Official Thai Government Categories: Strictly Neutral / Subtle Slate Tone)
         * @param {string} category 
         * @returns {Object}
         */
        getCategoryMeta(category) {
            let icon = 'ph-cube';
            if (category.includes('สำนักงาน')) icon = 'ph-pencil-line';
            else if (category.includes('การศึกษา')) icon = 'ph-chalkboard-teacher';
            else if (category.includes('คอมพิวเตอร์')) icon = 'ph-laptop';
            else if (category.includes('กีฬา')) icon = 'ph-soccer-ball';
            else if (category.includes('งานบ้านงานครัว')) icon = 'ph-broom';
            else if (category.includes('วิทยาศาสตร์') || category.includes('การแพทย์')) icon = 'ph-first-aid';
            else if (category.includes('ไฟฟ้า') || category.includes('วิทยุ')) icon = 'ph-lightning';
            else if (category.includes('ก่อสร้าง')) icon = 'ph-wrench';
            
            return {
                icon: icon,
                color: 'slate',
                bg: 'bg-slate-100',
                text: 'text-slate-700',
                border: 'border-slate-200/80'
            };
        },

        /**
         * Safe HTML escaping to prevent XSS
         * @param {string} str 
         * @returns {string}
         */
        escapeHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
    };

    // Export to global scope
    global.FormatUtils = FormatUtils;
    global.formatMoney = FormatUtils.formatMoney.bind(FormatUtils);
    global.formatCurrency = FormatUtils.formatCurrency.bind(FormatUtils);
    global.getFsnCodeForItem = FormatUtils.getFsnCodeForItem.bind(FormatUtils);
    global.getStatusBadge = FormatUtils.getStatusBadge.bind(FormatUtils);
    global.getCategoryMeta = FormatUtils.getCategoryMeta.bind(FormatUtils);

})(typeof window !== 'undefined' ? window : this);
