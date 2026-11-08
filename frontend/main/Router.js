/**
 * Router.js - Client-Side Navigation and View Management
 * Handles progressive view transitions, tab switching, and role-based access control.
 * Preserves 100% backward compatibility with window.switchMainView.
 */

(function(window) {
    'use strict';

    const Router = {
        currentView: 'dashboard',
        routes: {
            'dashboard': {
                viewId: 'viewDashboard',
                menuId: 'menuItemDashboard',
                title: 'ภาพรวมคลังพัสดุ',
                subtitle: 'ศูนย์ควบคุมและติดตามสถานะพัสดุสถานศึกษา',
                init: function() {
                    if (typeof window.renderKPIs === 'function') window.renderKPIs();
                    if (typeof window.renderChart === 'function') window.renderChart();
                }
            },
            'inventory': {
                viewId: 'viewInventory',
                menuId: 'menuItemInventory',
                title: 'คลังพัสดุคงคลัง',
                subtitle: 'กลุ่มบริหารงานงบประมาณ',
                init: function() {
                    if (typeof window.renderTable === 'function') window.renderTable();
                }
            },
            'requisition': {
                viewId: 'viewRequisition',
                menuId: 'menuItemRequisition',
                title: 'ศูนย์ควบคุมการเบิก–จ่ายพัสดุ',
                subtitle: 'บริหารจัดการคำขอเบิก ตรวจสอบสต็อก และประวัติการจ่ายพัสดุสถานศึกษา',
                init: function() {
                    if (typeof window.initRequisitionModule === 'function') window.initRequisitionModule();
                }
            },
            'approval': {
                viewId: 'viewApproval',
                fallbackViewId: 'viewRequisition',
                menuId: 'menuItemRequisition',
                title: 'ศูนย์พิจารณาอนุมัติคำขอเบิกพัสดุ',
                subtitle: 'ตรวจสอบรายการเบิก ลงลายมือชื่อดิจิทัล และอนุมัติตัดจ่ายสต็อก',
                init: function() {
                    if (document.getElementById('viewApproval')) {
                        if (typeof window.initApprovalModule === 'function') window.initApprovalModule();
                    } else if (typeof window.switchRequisitionTab === 'function') {
                        window.switchRequisitionTab('pending_approval');
                    }
                }
            },
            'stock': {
                viewId: 'viewStock',
                fallbackViewId: 'viewFSN',
                menuId: 'menuItemFsn',
                title: 'ทะเบียนพัสดุตามระบบ FSN',
                subtitle: 'รหัสพัสดุมาตรฐาน 13 หลัก e-GP กรมบัญชีกลาง',
                init: function() {
                    if (typeof window.renderFsnTable === 'function') window.renderFsnTable();
                }
            },
            'fsn': {
                viewId: 'viewFSN',
                fallbackViewId: 'viewStock',
                menuId: 'menuItemFsn',
                title: 'ทะเบียนพัสดุตามระบบ FSN',
                subtitle: 'รหัสพัสดุมาตรฐาน 13 หลัก e-GP กรมบัญชีกลาง',
                init: function() {
                    if (typeof window.renderFsnTable === 'function') window.renderFsnTable();
                }
            },
            'ledger': {
                viewId: 'viewLedger',
                fallbackViewId: 'viewDocs',
                menuId: 'menuItemDocs',
                title: 'บัญชีคุมพัสดุ (Stock Card แบบ พ.ด. ๔)',
                subtitle: 'บันทึกประวัติการรับเข้าและจ่ายออกพัสดุรายชิ้น (Double-Entry SSOT)',
                init: function() {
                    if (document.getElementById('viewLedger')) {
                        if (typeof window.renderLedgerView === 'function') window.renderLedgerView();
                    } else if (typeof window.switchDocTab === 'function') {
                        window.switchDocTab('stockCard');
                    }
                }
            },
            'audit': {
                viewId: 'viewAudit',
                fallbackViewId: 'viewYearEndAudit',
                menuId: 'menuItemYearEndAudit',
                title: 'ตรวจนับพัสดุ สิ้นปีงบประมาณ',
                subtitle: 'ตรวจสอบยอดนับจริง ยอดคงเหลือตามบัญชี และประเมินสภาพพัสดุ',
                requiresAdmin: true,
                init: function() {
                    if (typeof window.initYearEndAudit === 'function') window.initYearEndAudit();
                }
            },
            'yearEndAudit': {
                viewId: 'viewYearEndAudit',
                fallbackViewId: 'viewAudit',
                menuId: 'menuItemYearEndAudit',
                title: 'ตรวจนับพัสดุ สิ้นปีงบประมาณ',
                subtitle: 'ตรวจสอบยอดนับจริง ยอดคงเหลือตามบัญชี และประเมินสภาพพัสดุ',
                requiresAdmin: true,
                init: function() {
                    if (typeof window.initYearEndAudit === 'function') window.initYearEndAudit();
                }
            },
            'reports': {
                viewId: 'viewReports',
                fallbackViewId: 'viewDocs',
                menuId: 'menuItemDocs',
                title: 'จัดการเอกสารคลังพัสดุ (แบบ พ.ด. ๑ - ๗)',
                subtitle: 'พิมพ์และออกรายงานแบบฟอร์มพัสดุราชการตามระเบียบกระทรวงการคลัง',
                init: function() {
                    if (typeof window.initDocsModule === 'function') window.initDocsModule();
                }
            },
            'docs': {
                viewId: 'viewDocs',
                fallbackViewId: 'viewReports',
                menuId: 'menuItemDocs',
                title: 'จัดการเอกสารคลังพัสดุ (แบบ พ.ด. ๑ - ๗)',
                subtitle: 'พิมพ์และออกรายงานแบบฟอร์มพัสดุราชการตามระเบียบกระทรวงการคลัง',
                init: function() {
                    if (typeof window.initDocsModule === 'function') window.initDocsModule();
                }
            },
            'settings': {
                viewId: 'viewSettings',
                menuId: 'menuItemSettings',
                title: 'ตั้งค่าระบบและการเชื่อมต่อ',
                subtitle: 'จัดการข้อมูลเชิงเทคนิค แหล่งจัดเก็บข้อมูล และการสำรองข้อมูล (Level 3)',
                init: function() {
                    // Settings view initialization if any
                }
            }
        },

        init: function() {
            // Listen to browser hash changes for seamless navigation
            window.addEventListener('hashchange', () => {
                const hash = window.location.hash.replace(/^#\/?/, '').trim();
                if (hash && this.routes[hash]) {
                    this.navigate(hash, false);
                }
            });

            // Initial view from hash or default to dashboard
            const initialHash = window.location.hash.replace(/^#\/?/, '').trim();
            if (initialHash && this.routes[initialHash]) {
                this.navigate(initialHash, false);
            }
        },

        navigate: function(viewName, updateHash = true) {
            if (typeof window.triggerViewLoading === 'function') {
                window.triggerViewLoading();
            }

            // Cleanup active chart when leaving dashboard to prevent memory leaks
            if (this.currentView === 'dashboard' && viewName !== 'dashboard') {
                const ctx = document.getElementById('inventoryChart');
                if (typeof Chart !== 'undefined' && ctx) {
                    const existingChart = Chart.getChart(ctx) || window.chartInstance;
                    if (existingChart) {
                        try {
                            existingChart.destroy();
                        } catch (e) {
                            console.warn('Error destroying chart on view navigation:', e);
                        }
                        window.chartInstance = null;
                    }
                }
            }

            const targetRoute = this.routes[viewName] || this.routes['dashboard'];

            // Role-based access guard
            if (targetRoute.requiresAdmin && window.currentUserRole === 'teacher') {
                if (typeof window.showToast === 'function') {
                    window.showToast('สิทธิ์ไม่เพียงพอ: กลุ่มครูและบุคลากรไม่สามารถเข้าถึงระบบนี้ได้', 'warning');
                }
                return this.navigate('inventory', updateHash);
            }

            this.currentView = viewName;
            window.currentMainView = viewName;

            // Hide all known main views
            const allViewIds = [
                'viewDashboard', 'viewInventory', 'viewRequisition', 'viewApproval',
                'viewStock', 'viewFSN', 'viewLedger', 'viewAudit', 'viewYearEndAudit',
                'viewReports', 'viewDocs', 'viewSettings'
            ];
            allViewIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });

            // Show active view container (try primary viewId, then fallbackViewId)
            let activeEl = document.getElementById(targetRoute.viewId);
            if (!activeEl && targetRoute.fallbackViewId) {
                activeEl = document.getElementById(targetRoute.fallbackViewId);
            }
            if (activeEl) {
                activeEl.classList.remove('hidden');
            }

            // Update sidebar active menu items
            const allMenuIds = [
                'menuItemDashboard', 'menuItemInventory', 'menuItemRequisition',
                'menuItemActionNeeded', 'menuItemYearEndAudit', 'menuItemFsn',
                'menuItemDocs', 'menuItemSettings'
            ];
            allMenuIds.forEach(id => {
                const m = document.getElementById(id);
                if (m) m.classList.remove('active', 'bg-blue-600', 'text-white');
            });

            if (targetRoute.menuId) {
                const activeMenu = document.getElementById(targetRoute.menuId);
                if (activeMenu) activeMenu.classList.add('active');
            }

            // Update Topbar headings
            const tbHeading = document.getElementById('topbarHeading');
            const tbSub = document.getElementById('topbarSub');
            if (tbHeading && targetRoute.title) {
                if (viewName === 'yearEndAudit' || viewName === 'audit') {
                    tbHeading.innerText = `${targetRoute.title} พ.ศ. ${window.currentFiscalYear || '2569'}`;
                } else {
                    tbHeading.innerText = targetRoute.title;
                }
            }
            if (tbSub && targetRoute.subtitle) {
                tbSub.innerText = targetRoute.subtitle;
            }

            // Close mobile drawer on navigation if open (< 768px)
            const sidebar = document.getElementById('mainSidebar');
            const backdrop = document.getElementById('sidebarBackdrop');
            if (window.innerWidth < 768 && sidebar && backdrop) {
                sidebar.classList.add('-translate-x-full');
                backdrop.classList.add('hidden');
            }

            // Optional hash update
            if (updateHash && window.location.hash !== `#${viewName}`) {
                try {
                    history.pushState(null, '', `#${viewName}`);
                } catch(e) {
                    window.location.hash = `#${viewName}`;
                }
            }

            // Execute view initialization callback
            try {
                if (typeof targetRoute.init === 'function') {
                    targetRoute.init();
                }
            } catch (err) {
                console.warn(`Error running route init for [${viewName}]:`, err);
            }

            return true;
        },

        getCurrentView: function() {
            return this.currentView;
        }
    };

    // Global backward-compatibility facade
    window.Router = Router;
    window.switchMainView = function(viewName) {
        return Router.navigate(viewName);
    };

})(window);
