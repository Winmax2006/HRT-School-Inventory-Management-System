/**
 * HRT School Inventory Management System - User & Authorization Service
 * File: frontend/services/UserApi.js
 * Description: Client-side user profile, role display, and UX permissions check
 * 
 * Non-Negotiable Rules:
 * 1. Role on frontend is used STRICTLY for UX/UI rendering adaptation.
 * 2. True authorization must ALWAYS be enforced server-side by Backend AuthGuard.
 */

(function (global) {
    'use strict';

    const UserApi = {
        cachedUser: null,

        /**
         * Retrieves authenticated user session
         * @param {boolean} [force=false] 
         * @returns {Promise<Object>}
         */
        async getCurrentUser(force = false) {
            if (!force && this.cachedUser) return this.cachedUser;
            try {
                const res = await global.ApiService.call('apiGetCurrentUser');
                if (res && res.success && res.user) {
                    this.cachedUser = res.user;
                    global.currentUser = res.user;
                    return res.user;
                }
            } catch (err) {
                console.warn('UserApi fallback to default profile:', err);
            }
            const fallback = {
                id: 'USR-ANANT-01',
                name: 'นายอนันต์ มั่นคง',
                email: 'anant.m@school.ac.th',
                role: 'STAFF_SUPPLY',
                roleTitle: 'เจ้าหน้าที่พัสดุ',
                department: 'กลุ่มบริหารงานงบประมาณและพัสดุ',
                permissions: ['READ_ITEMS', 'CREATE_REQ', 'APPROVE_REQ', 'ISSUE_STOCK', 'RECEIVE_STOCK', 'VIEW_LEDGER', 'VIEW_AUDIT']
            };
            this.cachedUser = fallback;
            global.currentUser = fallback;
            return fallback;
        },

        /**
         * Checks UX-level permission for conditional UI display
         * @param {string} permission 
         * @returns {boolean}
         */
        hasPermission(permission) {
            const user = this.cachedUser || global.currentUser;
            if (!user) return false;
            if (user.role === 'ADMIN' || user.role === 'STAFF_SUPPLY') return true;
            return Array.isArray(user.permissions) && user.permissions.includes(permission);
        },

        /**
         * Switches current user role for testing / demo UX
         * @param {string} role 'officer' | 'teacher' | 'approver' | 'admin'
         */
        switchRole(role) {
            if (!this.cachedUser) {
                this.cachedUser = Object.assign({}, global.currentUser || {});
            }
            this.cachedUser.role = role;
            global.currentUserRole = role;
            global.currentUser = this.cachedUser;
        }
    };

    global.UserApi = UserApi;

})(typeof window !== 'undefined' ? window : this);
