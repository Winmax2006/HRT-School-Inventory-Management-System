/**
 * HRT School Inventory Management System - DOM Utilities
 * File: frontend/utils/DomUtils.js
 * Description: DOM selection, class toggling, layout reflow prevention, debounce utilities
 */

(function (global) {
    'use strict';

    const DomUtils = {
        /**
         * Debounce function limiting execution rate for high-frequency input events
         * @param {Function} fn 
         * @param {number} [wait=300] 
         * @returns {Function}
         */
        debounce(fn, wait = 300) {
            let timeout;
            return function (...args) {
                const context = this;
                clearTimeout(timeout);
                timeout = setTimeout(() => fn.apply(context, args), wait);
            };
        },

        /**
         * Layout Reflow Prevention Helper: Only updates DOM text when value actually changes
         * @param {HTMLElement|string} el 
         * @param {*} val 
         */
        setDomText(el, val) {
            const target = (typeof el === 'string') ? document.getElementById(el) : el;
            if (target && target.innerText !== String(val)) {
                target.innerText = String(val);
            }
        },

        /**
         * Safely gets element by ID or returns null
         * @param {string|HTMLElement} el 
         * @returns {HTMLElement|null}
         */
        get(el) {
            if (!el) return null;
            return (typeof el === 'string') ? document.getElementById(el) : el;
        },

        /**
         * Shows an element by removing 'hidden' class
         * @param {HTMLElement|string} el 
         */
        show(el) {
            const target = this.get(el);
            if (target) {
                target.classList.remove('hidden');
            }
        },

        /**
         * Hides an element by adding 'hidden' class
         * @param {HTMLElement|string} el 
         */
        hide(el) {
            const target = this.get(el);
            if (target) {
                target.classList.add('hidden');
            }
        },

        /**
         * Toggles visibility of an element
         * @param {HTMLElement|string} el 
         * @param {boolean} [force] 
         */
        toggle(el, force) {
            const target = this.get(el);
            if (target) {
                if (typeof force === 'boolean') {
                    target.classList.toggle('hidden', !force);
                } else {
                    target.classList.toggle('hidden');
                }
            }
        },

        /**
         * Sets loading spinner state on an element or button
         * @param {HTMLElement|string} el 
         * @param {boolean} isLoading 
         * @param {string} [loadingText] 
         */
        setLoading(el, isLoading, loadingText) {
            const target = this.get(el);
            if (!target) return;
            if (isLoading) {
                target.disabled = true;
                target.dataset.originalText = target.innerHTML;
                target.innerHTML = `<i class="ph ph-spinner animate-spin mr-1"></i> ${loadingText || 'กำลังโหลด...'}`;
            } else {
                target.disabled = false;
                if (target.dataset.originalText) {
                    target.innerHTML = target.dataset.originalText;
                    delete target.dataset.originalText;
                }
            }
        },

        /**
         * Queries single element inside container
         * @param {string} selector 
         * @param {HTMLElement|Document} [context=document] 
         * @returns {HTMLElement|null}
         */
        $(selector, context = document) {
            return context.querySelector(selector);
        },

        /**
         * Queries all matching elements as Array
         * @param {string} selector 
         * @param {HTMLElement|Document} [context=document] 
         * @returns {HTMLElement[]}
         */
        $$(selector, context = document) {
            return Array.from(context.querySelectorAll(selector));
        }
    };

    // Export to global scope
    global.DomUtils = DomUtils;
    global.debounce = DomUtils.debounce.bind(DomUtils);
    global.setDomText = DomUtils.setDomText.bind(DomUtils);

})(typeof window !== 'undefined' ? window : this);
