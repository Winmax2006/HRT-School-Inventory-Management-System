/**
 * HRT School Inventory Management System - Central Application State & Event Bus
 * File: frontend/state/AppState.js
 * Description: Pub/Sub Reactive Event Bus, UI State, and Mutex Lock Service
 */

(function (global) {
    'use strict';

    // Event Bus listeners map
    const _listeners = new Map();

    // Client-side Mutex Lock to prevent double-click submissions
    const ClientLockService = {
        isLocked: false,
        holder: null,
        lockTimestamp: 0,
        
        tryLock(timeoutMs = 5000) {
            const now = Date.now();
            // Automatically release stale lock after 10s
            if (this.isLocked && (now - this.lockTimestamp > 10000)) {
                this.isLocked = false;
                this.holder = null;
            }
            if (this.isLocked) return false;
            this.isLocked = true;
            this.lockTimestamp = now;
            setTimeout(() => {
                if (this.isLocked && Date.now() - this.lockTimestamp >= timeoutMs) {
                    this.isLocked = false;
                    this.holder = null;
                }
            }, timeoutMs);
            return true;
        },

        releaseLock() {
            this.isLocked = false;
            this.holder = null;
            this.lockTimestamp = 0;
        }
    };

    const AppState = {
        // Active view and navigation
        currentView: 'dashboard',
        currentFiscalYear: '2569',
        currentUserRole: 'officer',
        currentUser: null,

        // Inventory table pagination & sorting
        currentPage: 1,
        itemsPerPage: 20,
        sortColumn: 'code',
        sortAsc: true,
        selectedItem: null,

        // Mutex lock service
        lock: ClientLockService,

        /**
         * Subscribes a listener to a state event
         * @param {string} event 
         * @param {Function} callback 
         * @returns {Function} Unsubscribe function
         */
        subscribe(event, callback) {
            if (!_listeners.has(event)) {
                _listeners.set(event, new Set());
            }
            _listeners.get(event).add(callback);
            return () => _listeners.get(event).delete(callback);
        },

        /**
         * Emits an event to all registered listeners
         * @param {string} event 
         * @param {*} data 
         */
        emit(event, data) {
            if (_listeners.has(event)) {
                _listeners.get(event).forEach(cb => {
                    try {
                        cb(data);
                    } catch (e) {
                        console.error(`Error in event listener for [${event}]:`, e);
                    }
                });
            }
        },

        /**
         * Sets active main view and emits 'view:changed'
         * @param {string} viewName 
         */
        setView(viewName) {
            this.currentView = viewName;
            global.currentMainView = viewName;
            this.emit('view:changed', viewName);
        },

        /**
         * Sets active user session
         * @param {Object} user 
         */
        setUser(user) {
            this.currentUser = user;
            global.currentUser = user;
            this.emit('user:changed', user);
        }
    };

    // Export to global scope
    global.AppState = AppState;
    global.ClientLockService = ClientLockService;

})(typeof window !== 'undefined' ? window : this);
