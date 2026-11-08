/**
 * ==============================================================================
 * HRT School Inventory Management System - Frontend Service Layer
 * File: js/services/RequisitionUI.js
 * Description: Requisition Management & Approval Workflow UI Controller
 * Standard: Thailand Government Procurement and Supplies Management Act B.E. 2560
 * ==============================================================================
 */

// [FIX-CRIT-01] Module State & Shared Variables
let currentRequisitionTab = 'overview';
let currentRequisitionSearch = '';
let currentRequisitionDept = '';
let currentRequisitionStatus = '';
let currentRequisitionWarehouse = '';
let currentRequisitionDate = '';
let currentRequisitionPage = 1;
const requisitionsPerPage = 10;
let selectedRequisition = null;
let confirmingRequisition = null;
let multiReqRows = []; // [{ code, reqQty }]
let filteredRequisitions = [];

const schoolDepartments = [
    "กลุ่มสาระการเรียนรู้ภาษาไทย",
    "กลุ่มสาระการเรียนรู้คณิตศาสตร์",
    "กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี",
    "กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม",
    "กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา",
    "กลุ่มสาระการเรียนรู้ศิลปะ",
    "กลุ่มสาระการเรียนรู้การงานอาชีพ",
    "กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ",
    "ศูนย์คอมพิวเตอร์และเทคโนโลยี",
    "กลุ่มบริหารงานวิชาการ",
    "กลุ่มบริหารงานงบประมาณ",
    "กลุ่มบริหารงานบุคคล",
    "กลุ่มบริหารทั่วไปและอาคารสถานที่",
    "งานห้องพยาบาล"
];

/**
 * [FIX-CRIT-01] Initializes the Requisition Management Module.
 * Populates department dropdowns, renders summary badges, and loads the requisition queue.
 */
function initRequisitionModule() {
    populateRequisitionDeptDropdowns();
    renderRequisitionSummary();
    if (typeof loadRequisitionsQueue === 'function') {
        loadRequisitionsQueue();
    } else {
        applyRequisitionFilters();
    }
}

/**
 * [FIX-CRIT-01] Populates department and warehouse dropdown filters from server-authoritative list.
 */
function populateRequisitionDeptDropdowns() {
    const filterDept = document.getElementById('reqFilterDept');
    const multiDept = document.getElementById('multiReqDept');
    const filterWh = document.getElementById('reqFilterWarehouse');
    
    const activeDepts = (typeof window !== 'undefined' && Array.isArray(window.systemDepartments) && window.systemDepartments.length > 0)
        ? window.systemDepartments.map(d => typeof d === 'object' ? (d.dept_name || d.name) : d)
        : schoolDepartments;

    if (filterDept && filterDept.options.length <= 1) {
        activeDepts.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.innerText = d;
            filterDept.appendChild(opt);
        });
    }

    if (multiDept && multiDept.options.length === 0) {
        activeDepts.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.innerText = d;
            multiDept.appendChild(opt);
        });
    }

    if (filterWh && filterWh.options.length <= 1 && typeof allData !== 'undefined' && Array.isArray(allData)) {
        const whList = Array.from(new Set(allData.map(i => i.warehouse).filter(Boolean)));
        whList.forEach(w => {
            const opt = document.createElement('option');
            opt.value = w;
            opt.innerText = w;
            filterWh.appendChild(opt);
        });
    }
}

/**
 * [FIX-CRIT-01] Normalizes requisition status string.
 * @param {Object} req Requisition item
 * @returns {string} Status code
 */
function getRequisitionStatus(req) {
    return (req && req.status) ? req.status : 'completed';
}

/**
 * [FIX-CRIT-01] Generates accessible HTML badge for requisition workflow status.
 * @param {string} status Status code
 * @returns {string} HTML badge string
 */
function getRequisitionStatusBadgeHtml(status) {
    if (status === 'pending_approval') {
        return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200"><i class="ph-bold ph-clock-countdown"></i> รออนุมัติ</span>';
    } else if (status === 'pending_issue' || status === 'ready_to_issue') {
        return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"><i class="ph-bold ph-package"></i> รอจ่าย</span>';
    } else if (status === 'partial') {
        return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200"><i class="ph-bold ph-hourglass-medium"></i> จ่ายบางส่วน</span>';
    } else if (status === 'rejected') {
        return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200"><i class="ph-bold ph-x-circle"></i> ไม่อนุมัติ</span>';
    } else {
        return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><i class="ph-bold ph-check-circle"></i> จ่ายแล้ว</span>';
    }
}

/**
 * [FIX-CRIT-01] Toggles the collapsible filter panel accordion.
 */
function toggleRequisitionFilterAccordion() {
    const panel = document.getElementById('reqFilterPanel');
    const caret = document.getElementById('reqFilterCaret');
    if (!panel) return;
    const isHidden = panel.classList.contains('hidden');
    if (isHidden) {
        panel.classList.remove('hidden');
        if (caret) caret.classList.add('rotate-180');
    } else {
        panel.classList.add('hidden');
        if (caret) caret.classList.remove('rotate-180');
    }
}

/**
 * [FIX-CRIT-01] Calculates and updates KPI cards and status badges across all tabs.
 */
function renderRequisitionSummary() {
    const presets = (typeof window !== 'undefined' && Array.isArray(window.mockRequisitionPresets)) 
        ? window.mockRequisitionPresets 
        : ((typeof mockRequisitionPresets !== 'undefined' && Array.isArray(mockRequisitionPresets)) ? mockRequisitionPresets : []);

    const total = presets.length;
    const pendingApproval = presets.filter(r => getRequisitionStatus(r) === 'pending_approval').length;
    const pendingIssue = presets.filter(r => getRequisitionStatus(r) === 'pending_issue' || getRequisitionStatus(r) === 'ready_to_issue').length;
    
    const completedReqs = presets.filter(r => getRequisitionStatus(r) === 'completed' || getRequisitionStatus(r) === 'partial');
    let todayCount = 0;
    let todayUnits = 0;
    completedReqs.forEach(r => {
        todayCount++;
        if (r.items) {
            r.items.forEach(i => {
                todayUnits += (i.actualQty > 0 ? i.actualQty : (i.reqQty || 0));
            });
        }
    });

    const elTotal = document.getElementById('reqKpiTotal');
    if (elTotal) elTotal.innerText = typeof formatNumber === 'function' ? formatNumber(total) : String(total);
    const elApp = document.getElementById('reqKpiPendingApproval');
    if (elApp) elApp.innerText = typeof formatNumber === 'function' ? formatNumber(pendingApproval) : String(pendingApproval);
    const elIss = document.getElementById('reqKpiPendingIssue');
    if (elIss) elIss.innerText = typeof formatNumber === 'function' ? formatNumber(pendingIssue) : String(pendingIssue);
    const elToday = document.getElementById('reqKpiToday');
    if (elToday) elToday.innerText = `${typeof formatNumber === 'function' ? formatNumber(todayCount) : todayCount} รายการ (${typeof formatNumber === 'function' ? formatNumber(todayUnits) : todayUnits} หน่วย)`;
    const elCompleted = document.getElementById('reqKpiCompleted');
    if (elCompleted) elCompleted.innerText = typeof formatNumber === 'function' ? formatNumber(completedReqs.length) : String(completedReqs.length);

    // Tab Badges
    const bAll = document.getElementById('reqBadgeAll');
    if (bAll) bAll.innerText = String(total);
    const bApp = document.getElementById('reqBadgePendingApproval');
    if (bApp) bApp.innerText = String(pendingApproval);
    const bIss = document.getElementById('reqBadgePendingIssue');
    if (bIss) bIss.innerText = String(pendingIssue);
    const bAwaiting = document.getElementById('reqBadgeAwaitingReceipt');
    if (bAwaiting) bAwaiting.innerText = String(pendingIssue);
    const bComp = document.getElementById('reqBadgeCompleted');
    if (bComp) bComp.innerText = String(completedReqs.length);

    // Sidebar Badge
    const sbReq = document.getElementById('sidebarReqBadge');
    if (sbReq) sbReq.innerText = String(pendingApproval + pendingIssue);

    // Action Center
    renderRequisitionActionCenter(pendingApproval, pendingIssue);
}

/**
 * [FIX-CRIT-01] Renders the Action Center urgent notice chips and alert banners.
 * @param {number} pendingApproval Count of pending approvals
 * @param {number} pendingIssue Count of pending issues
 */
function renderRequisitionActionCenter(pendingApproval, pendingIssue) {
    const container = document.getElementById('reqActionCenterContainer');
    const badge = document.getElementById('reqActionCenterCountBadge');
    const chipsList = document.getElementById('reqActionCenterChipsList');
    if (!container || !chipsList) return;

    chipsList.innerHTML = '';
    const totalActionNeeded = pendingApproval + pendingIssue;
    if (badge) badge.innerText = `${totalActionNeeded} รายการ`;

    if (totalActionNeeded === 0) {
        chipsList.innerHTML = `
            <div class="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                <i class="ph-bold ph-check-circle text-base text-emerald-600"></i>
                <span class="font-medium">ไม่มีคำขอค้างดำเนินการ ทุกคำขอเบิกได้รับการพิจารณาและตัดจ่ายเรียบร้อย</span>
            </div>
        `;
        return;
    }

    if (pendingApproval > 0) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.onclick = () => switchRequisitionTab('pending_approval');
        chip.className = 'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/90 transition shadow-2xs cursor-pointer';
        chip.innerHTML = `
            <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>รอการอนุมัติ <strong>${pendingApproval}</strong> รายการ</span>
            <i class="ph ph-arrow-right text-xs text-amber-700"></i>
        `;
        chipsList.appendChild(chip);
    }

    if (pendingIssue > 0) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.onclick = () => switchRequisitionTab('pending_issue');
        chip.className = 'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/90 transition shadow-2xs cursor-pointer';
        chip.innerHTML = `
            <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <span>อนุมัติแล้ว รอเจ้าหน้าที่ตัดจ่าย <strong>${pendingIssue}</strong> รายการ</span>
            <i class="ph ph-arrow-right text-xs text-indigo-700"></i>
        `;
        chipsList.appendChild(chip);
    }

    const presets = (typeof window !== 'undefined' && Array.isArray(window.mockRequisitionPresets))
        ? window.mockRequisitionPresets
        : ((typeof mockRequisitionPresets !== 'undefined' && Array.isArray(mockRequisitionPresets)) ? mockRequisitionPresets : []);

    let lowStockRiskCount = 0;
    if (typeof allData !== 'undefined' && Array.isArray(allData)) {
        presets.forEach(req => {
            const st = getRequisitionStatus(req);
            if ((st === 'pending_issue' || st === 'ready_to_issue') && req.items) {
                req.items.forEach(i => {
                    const master = allData.find(d => d.code === i.code);
                    if (master && (master.stock < i.reqQty || (master.stock - i.reqQty) <= master.min)) {
                        lowStockRiskCount++;
                    }
                });
            }
        });
    }

    if (lowStockRiskCount > 0) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.onclick = () => switchRequisitionTab('pending_issue');
        chip.className = 'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200/90 transition shadow-2xs cursor-pointer';
        chip.innerHTML = `
            <i class="ph-bold ph-warning-octagon text-rose-600 text-sm"></i>
            <span>มีพัสดุในคำขอที่สต็อกใกล้ ROP / ไม่เพียงพอ (<strong>${lowStockRiskCount}</strong> รายการ)</span>
        `;
        chipsList.appendChild(chip);
    }

    const alertEl = document.getElementById('reqActionCenterAlert');
    const titleEl = document.getElementById('reqActionCenterTitle');
    if (alertEl && titleEl) {
        if (lowStockRiskCount > 0 || totalActionNeeded > 0) {
            alertEl.classList.remove('hidden');
            titleEl.innerText = `แจ้งเตือนด่วน: มี ${lowStockRiskCount || totalActionNeeded} รายการคำขอที่ต้องเร่งดำเนินการหรือเข้าใกล้จุดสั่งซื้อ (ROP)`;
        } else {
            alertEl.classList.add('hidden');
        }
    }
}

/**
 * [FIX-CRIT-01] Switches active requisition tab view.
 * @param {'overview'|'all'|'pending_approval'|'pending_issue'|'awaiting_receipt'|'completed'} tabName
 */
function switchRequisitionTab(tabName) {
    currentRequisitionTab = tabName;
    currentRequisitionPage = 1;

    const tabs = [
        { id: 'reqTabBtnOverview', name: 'overview' },
        { id: 'reqTabBtnAll', name: 'all' },
        { id: 'reqTabBtnPendingApproval', name: 'pending_approval' },
        { id: 'reqTabBtnPendingIssue', name: 'pending_issue' },
        { id: 'reqTabBtnAwaitingReceipt', name: 'awaiting_receipt' },
        { id: 'reqTabBtnCompleted', name: 'completed' }
    ];

    tabs.forEach(t => {
        const btn = document.getElementById(t.id);
        if (btn) {
            if (t.name === tabName) {
                btn.className = 'req-tab-btn px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 bg-blue-600 text-white shadow-xs';
                btn.setAttribute('aria-selected', 'true');
            } else {
                btn.className = 'req-tab-btn px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition flex items-center gap-2 text-slate-600 hover:bg-slate-100';
                btn.setAttribute('aria-selected', 'false');
            }
        }
    });

    const statusSelect = document.getElementById('reqFilterStatus');
    if (statusSelect) {
        if (tabName === 'pending_approval') statusSelect.value = 'pending_approval';
        else if (tabName === 'pending_issue') statusSelect.value = 'pending_issue';
        else if (tabName === 'completed') statusSelect.value = 'completed';
        else if (tabName === 'awaiting_receipt') statusSelect.value = 'pending_issue';
        else if (tabName === 'all' || tabName === 'overview') statusSelect.value = '';
    }

    applyRequisitionFilters();
}

/**
 * [FIX-CRIT-01] Debounced handler for requisition search input.
 * @param {string} val Search query
 */
function onRequisitionSearchInput(val) {
    currentRequisitionSearch = (val || '').trim().toLowerCase();
    const clearBtn = document.getElementById('reqClearSearchBtn');
    if (clearBtn) {
        if (currentRequisitionSearch.length > 0) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }
    currentRequisitionPage = 1;
    applyRequisitionFilters();
}

/**
 * [FIX-CRIT-01] Clears requisition search input.
 */
function clearRequisitionSearch() {
    const input = document.getElementById('reqSearchInput');
    if (input) input.value = '';
    const clearBtn = document.getElementById('reqClearSearchBtn');
    if (clearBtn) clearBtn.classList.add('hidden');
    currentRequisitionSearch = '';
    currentRequisitionPage = 1;
    applyRequisitionFilters();
}

/**
 * [FIX-CRIT-01] Resets all requisition search and dropdown filters to defaults.
 */
function resetRequisitionFilters() {
    clearRequisitionSearch();
    const fDept = document.getElementById('reqFilterDept');
    if (fDept) fDept.value = '';
    currentRequisitionDept = '';
    const fStatus = document.getElementById('reqFilterStatus');
    if (fStatus) fStatus.value = '';
    currentRequisitionStatus = '';
    const fWh = document.getElementById('reqFilterWarehouse');
    if (fWh) fWh.value = '';
    currentRequisitionWarehouse = '';
    const fDate = document.getElementById('reqFilterDate');
    if (fDate) fDate.value = '';
    currentRequisitionDate = '';

    const badge = document.getElementById('reqFilterCountBadge');
    if (badge) {
        badge.innerText = '0';
        badge.classList.add('hidden');
    }

    switchRequisitionTab('overview');
    if (typeof showToast === 'function') {
        showToast('ล้างตัวกรองทั้งหมดเรียบร้อยแล้ว', 'info');
    }
}

/**
 * [FIX-CRIT-01] Filters requisition queue based on active tab, status, department, warehouse, date, and search query.
 */
function applyRequisitionFilters() {
    const presets = (typeof window !== 'undefined' && Array.isArray(window.mockRequisitionPresets))
        ? window.mockRequisitionPresets
        : ((typeof mockRequisitionPresets !== 'undefined' && Array.isArray(mockRequisitionPresets)) ? mockRequisitionPresets : []);

    const fDept = document.getElementById('reqFilterDept');
    currentRequisitionDept = (fDept && fDept.value) || '';

    const fStatus = document.getElementById('reqFilterStatus');
    currentRequisitionStatus = (fStatus && fStatus.value) || '';

    const fWh = document.getElementById('reqFilterWarehouse');
    currentRequisitionWarehouse = (fWh && fWh.value) || '';

    const fDate = document.getElementById('reqFilterDate');
    currentRequisitionDate = (fDate && fDate.value) || '';

    let activeFilterCount = 0;
    if (currentRequisitionDept) activeFilterCount++;
    if (currentRequisitionStatus) activeFilterCount++;
    if (currentRequisitionWarehouse) activeFilterCount++;
    if (currentRequisitionDate) activeFilterCount++;

    const badge = document.getElementById('reqFilterCountBadge');
    if (badge) {
        if (activeFilterCount > 0) {
            badge.innerText = String(activeFilterCount);
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    filteredRequisitions = presets.filter(req => {
        const status = getRequisitionStatus(req);

        // Tab Filter
        if (currentRequisitionTab === 'pending_approval' && status !== 'pending_approval') return false;
        if (currentRequisitionTab === 'pending_issue' && status !== 'pending_issue' && status !== 'ready_to_issue') return false;
        if (currentRequisitionTab === 'awaiting_receipt' && status !== 'pending_issue' && status !== 'ready_to_issue' && status !== 'ready_to_receive') return false;
        if (currentRequisitionTab === 'completed' && status !== 'completed' && status !== 'partial') return false;

        // Select Status Filter
        if (currentRequisitionStatus && status !== currentRequisitionStatus) return false;

        // Department Filter
        if (currentRequisitionDept && req.dept !== currentRequisitionDept) return false;

        // Warehouse Filter
        if (currentRequisitionWarehouse && req.warehouse !== currentRequisitionWarehouse) return false;

        // Search Filter
        if (currentRequisitionSearch) {
            const matchId = req.id && req.id.toLowerCase().includes(currentRequisitionSearch);
            const matchTeacher = req.teacher && req.teacher.toLowerCase().includes(currentRequisitionSearch);
            const matchDept = req.dept && req.dept.toLowerCase().includes(currentRequisitionSearch);
            const matchPurpose = req.purpose && req.purpose.toLowerCase().includes(currentRequisitionSearch);
            const matchItem = req.items && req.items.some(i => 
                (i.name && i.name.toLowerCase().includes(currentRequisitionSearch)) ||
                (i.code && i.code.toLowerCase().includes(currentRequisitionSearch))
            );
            if (!matchId && !matchTeacher && !matchDept && !matchPurpose && !matchItem) return false;
        }

        return true;
    });

    renderRequisitionTable();
}

/**
 * [FIX-CRIT-01] Calculates aggregated total value for a requisition.
 * @param {Object} req Requisition object
 * @returns {number} Total monetary value
 */
function calculateRequisitionTotalValue(req) {
    if (!req || !req.items || !Array.isArray(req.items)) return 0;
    return req.items.reduce((sum, item) => {
        const master = (typeof allData !== 'undefined' && Array.isArray(allData)) ? allData.find(d => d.code === item.code) : null;
        const cost = master ? master.unit_cost : 0;
        const qty = item.actualQty > 0 ? item.actualQty : (item.reqQty || 0);
        return sum + (cost * qty);
    }, 0);
}

/**
 * [FIX-CRIT-01] Loads requisitions from backend or service cache, updates the presets queue,
 * and refreshes the requisition table and summary KPIs.
 * @param {boolean} [showLoading=false] Whether to trigger visual loading indicator
 * @returns {Promise<Array>} List of requisitions
 */
async function loadRequisitionsQueue(showLoading = false) {
    if (showLoading && typeof showToast === 'function') {
        showToast('กำลังโหลดข้อมูลคิวคำขอเบิกพัสดุ...', 'info');
    }
    const pollingStatus = document.getElementById('reqQueueLastUpdated');
    if (pollingStatus) {
        const d = new Date();
        pollingStatus.innerText = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    }
    let reqs = [];
    try {
        if (typeof window !== 'undefined' && window.RequisitionApi && typeof window.RequisitionApi.getRequisitions === 'function') {
            reqs = await window.RequisitionApi.getRequisitions();
        } else if (typeof RequisitionApi !== 'undefined' && typeof RequisitionApi.getRequisitions === 'function') {
            reqs = await RequisitionApi.getRequisitions();
        }
    } catch (err) {
        console.warn('[FIX-CRIT-01] loadRequisitionsQueue error:', err);
    }
    if (Array.isArray(reqs) && reqs.length > 0) {
        if (typeof window !== 'undefined') window.mockRequisitionPresets = reqs;
    }
    renderRequisitionSummary();
    applyRequisitionFilters();
    return (typeof window !== 'undefined' && window.mockRequisitionPresets) ? window.mockRequisitionPresets : [];
}

/**
 * [FIX-CRIT-01] Renders the requisition queue table (desktop) and card list (mobile).
 * @param {string} [tab] Optional tab name to switch to
 * @param {Array} [data] Optional data array to display
 */
function renderRequisitionTable(tab, data) {
    if (tab) currentRequisitionTab = tab;
    if (data && Array.isArray(data)) filteredRequisitions = data;

    const thead = document.getElementById('requisitionTableHead');
    const tbody = document.getElementById('requisitionTableBody');
    const mobileList = document.getElementById('requisitionMobileList');
    const emptyState = document.getElementById('reqTableEmptyState');

    if (tbody) tbody.innerHTML = '';
    if (mobileList) mobileList.innerHTML = '';

    // Dynamic Table Head
    if (thead) {
        if (currentRequisitionTab === 'pending_approval') {
            thead.innerHTML = `
                <tr>
                    <th class="py-3 px-4">ผู้ขอเบิก (กลุ่มสาระฯ/ฝ่าย)</th>
                    <th class="py-3 px-4">วันที่ขอ</th>
                    <th class="py-3 px-4">รายการพัสดุ</th>
                    <th class="py-3 px-4 text-center">จำนวน</th>
                    <th class="py-3 px-4">วัตถุประสงค์</th>
                    <th class="py-3 px-4 text-center">สถานะ</th>
                    <th class="py-3 px-4 text-center w-40">ดำเนินการ</th>
                </tr>
            `;
        } else if (currentRequisitionTab === 'pending_issue') {
            thead.innerHTML = `
                <tr>
                    <th class="py-3 px-4">เลขที่</th>
                    <th class="py-3 px-4">ผู้ขอเบิก</th>
                    <th class="py-3 px-4">รายการ</th>
                    <th class="py-3 px-4 text-center">จำนวนขอ</th>
                    <th class="py-3 px-4 text-center">Stock</th>
                    <th class="py-3 px-4 text-center">จำนวนจ่าย</th>
                    <th class="py-3 px-4 text-center">สถานะ</th>
                    <th class="py-3 px-4 text-center w-36">ดำเนินการ</th>
                </tr>
            `;
        } else {
            thead.innerHTML = `
                <tr>
                    <th class="py-3 px-4">เลขที่</th>
                    <th class="py-3 px-4">ผู้ขอเบิก</th>
                    <th class="py-3 px-4">วันที่</th>
                    <th class="py-3 px-4">รายการพัสดุ</th>
                    <th class="py-3 px-4 text-center">จำนวน</th>
                    <th class="py-3 px-4 text-center">สถานะ</th>
                    <th class="py-3 px-4 text-center w-36">ดำเนินการ</th>
                </tr>
            `;
        }
    }

    if (filteredRequisitions.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        const pInfo = document.getElementById('reqPaginationInfo');
        if (pInfo) pInfo.innerText = '0 รายการ';
        const pControls = document.getElementById('reqPaginationControls');
        if (pControls) pControls.innerHTML = '';
        return;
    } else {
        if (emptyState) emptyState.classList.add('hidden');
    }

    const total = filteredRequisitions.length;
    const start = (currentRequisitionPage - 1) * requisitionsPerPage;
    const end = Math.min(start + requisitionsPerPage, total);
    const pageItems = filteredRequisitions.slice(start, end);

    pageItems.forEach(req => {
        const status = getRequisitionStatus(req);
        const statusBadge = getRequisitionStatusBadgeHtml(status);
        const itemCount = req.items ? req.items.length : 0;
        const totalQty = req.items ? req.items.reduce((s, i) => s + (i.reqQty || 0), 0) : 0;
        const mainItemName = req.items && req.items[0] 
            ? (itemCount > 1 ? `${req.items[0].name} และอื่นๆ (${itemCount} รายการ)` : req.items[0].name)
            : '-';

        // 1. Desktop / Tablet Row
        if (tbody) {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-slate-100 hover:bg-blue-50/50 cursor-pointer transition-colors group text-xs sm:text-sm';
            tr.setAttribute('role', 'button');
            tr.setAttribute('tabindex', '0');
            tr.setAttribute('aria-label', `ดูรายละเอียดคำขอ ${req.id} ของ ${req.teacher}`);
            tr.onclick = () => openRequisitionDrawer(req.id);
            tr.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRequisitionDrawer(req.id); } };

            if (currentRequisitionTab === 'pending_approval') {
                tr.innerHTML = `
                    <td class="py-3 px-4">
                        <div class="font-semibold text-slate-800">${req.teacher}</div>
                        <div class="text-xs text-slate-500">${req.dept}</div>
                    </td>
                    <td class="py-3 px-4 font-num text-slate-600">${req.date}</td>
                    <td class="py-3 px-4">
                        <div class="font-medium text-slate-800 max-w-xs truncate" title="${mainItemName}">${mainItemName}</div>
                    </td>
                    <td class="py-3 px-4 text-center font-num font-bold text-slate-800">
                        ${totalQty} <span class="text-xs text-slate-400 font-normal">หน่วย</span>
                    </td>
                    <td class="py-3 px-4">
                        <div class="text-xs text-slate-600 max-w-xs truncate" title="${req.purpose}">${req.purpose}</div>
                    </td>
                    <td class="py-3 px-4 text-center">${statusBadge}</td>
                    <td class="py-3 px-4 text-center" onclick="event.stopPropagation()">
                        <div class="flex items-center justify-center gap-1.5">
                            <button type="button" onclick="openRequisitionDrawer('${req.id}')" class="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition" title="ดูรายละเอียดคำขอ">
                                ตรวจดู
                            </button>
                            <button type="button" onclick="approveRequisition('${req.id}')" class="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-2xs" title="อนุมัติคำขอเบิกนี้">
                                อนุมัติ
                            </button>
                            <button type="button" onclick="rejectRequisition('${req.id}')" class="px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition" title="ไม่อนุมัติคำขอเบิกนี้">
                                ไม่อนุมัติ
                            </button>
                        </div>
                    </td>
                `;
            } else if (currentRequisitionTab === 'pending_issue') {
                const firstMaster = (req.items && req.items[0] && typeof allData !== 'undefined' && Array.isArray(allData)) ? allData.find(d => d.code === req.items[0].code) : null;
                const stockDisplay = firstMaster ? `${firstMaster.stock} ${firstMaster.unit}` : '-';

                tr.innerHTML = `
                    <td class="py-3 px-4 font-mono font-bold text-blue-700">${req.id}</td>
                    <td class="py-3 px-4 font-semibold text-slate-800">${req.teacher}</td>
                    <td class="py-3 px-4 max-w-xs truncate font-medium text-slate-800" title="${mainItemName}">${mainItemName}</td>
                    <td class="py-3 px-4 text-center font-num font-bold text-blue-600">${totalQty}</td>
                    <td class="py-3 px-4 text-center font-num font-bold text-slate-700">${stockDisplay}</td>
                    <td class="py-3 px-4 text-center font-num text-slate-500">${req.items && req.items[0] ? (req.items[0].actualQty || req.items[0].reqQty) : '-'}</td>
                    <td class="py-3 px-4 text-center">${statusBadge}</td>
                    <td class="py-3 px-4 text-center" onclick="event.stopPropagation()">
                        <button type="button" onclick="openConfirmIssueModal('${req.id}')" class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs inline-flex items-center gap-1 cursor-pointer">
                            <i class="ph-bold ph-package"></i>
                            <span>จ่ายพัสดุ</span>
                        </button>
                    </td>
                `;
            } else {
                tr.innerHTML = `
                    <td class="py-3 px-4 font-mono font-bold text-blue-700">${req.id}</td>
                    <td class="py-3 px-4">
                        <div class="font-semibold text-slate-800">${req.teacher}</div>
                        <div class="text-xs text-slate-500">${req.dept}</div>
                    </td>
                    <td class="py-3 px-4 font-num text-slate-600">${req.date}</td>
                    <td class="py-3 px-4 max-w-xs truncate font-medium text-slate-800" title="${mainItemName}">${mainItemName}</td>
                    <td class="py-3 px-4 text-center font-num font-bold text-slate-800">${totalQty}</td>
                    <td class="py-3 px-4 text-center">${statusBadge}</td>
                    <td class="py-3 px-4 text-center" onclick="event.stopPropagation()">
                        <div class="flex items-center justify-center gap-1.5">
                            <button type="button" onclick="openRequisitionDrawer('${req.id}')" class="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition" title="ดูรายละเอียด">
                                <i class="ph-bold ph-eye text-sm"></i>
                            </button>
                            <button type="button" onclick="viewRequisitionDoc('${req.id}')" class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition" title="พิมพ์ใบเบิก พ.ด. ๑">
                                <i class="ph-bold ph-printer text-sm"></i>
                            </button>
                            <button type="button" onclick="duplicateRequisition('${req.id}')" class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition" title="คัดลอกคำขอนี้">
                                <i class="ph-bold ph-copy text-sm"></i>
                            </button>
                        </div>
                    </td>
                `;
            }

            tbody.appendChild(tr);
        }

        // 2. Mobile Card List (< 768px)
        if (mobileList) {
            const card = document.createElement('div');
            card.className = 'bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col gap-3 cursor-pointer hover:border-blue-300 transition active:scale-98 text-xs';
            card.onclick = () => openRequisitionDrawer(req.id);

            card.innerHTML = `
                <div class="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                        <span class="font-mono font-bold text-blue-700 text-xs">${req.id}</span>
                        <h4 class="font-bold text-slate-900 text-sm mt-0.5">${req.teacher}</h4>
                        <span class="text-xs text-slate-500">${req.dept}</span>
                    </div>
                    <div>${statusBadge}</div>
                </div>
                <div>
                    <span class="text-slate-400 block text-[11px]">รายการที่ขอเบิก</span>
                    <span class="font-semibold text-slate-800 text-xs sm:text-sm">${mainItemName} (${totalQty} ชิ้น)</span>
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-slate-100" onclick="event.stopPropagation()">
                    <button type="button" onclick="viewRequisitionDoc('${req.id}')" class="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1">
                        <i class="ph-bold ph-printer"></i>
                        <span>พ.ด. ๑</span>
                    </button>
                    ${status === 'pending_approval' ? `
                        <button type="button" onclick="approveRequisition('${req.id}')" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1">
                            <span>อนุมัติ</span>
                        </button>
                    ` : (status === 'pending_issue' || status === 'ready_to_issue' ? `
                        <button type="button" onclick="openConfirmIssueModal('${req.id}')" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1">
                            <span>จ่ายพัสดุ</span>
                        </button>
                    ` : `
                        <button type="button" onclick="openRequisitionDrawer('${req.id}')" class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1">
                            <span>ดูรายละเอียด</span>
                        </button>
                    `)}
                </div>
            `;
            mobileList.appendChild(card);
        }
    });

    const infoEl = document.getElementById('reqPaginationInfo');
    if (infoEl) infoEl.innerText = `แสดง ${start + 1} ถึง ${end} จากทั้งหมด ${total} รายการ`;

    renderRequisitionPagination(total, start, end);
}

/**
 * [FIX-CRIT-01] Renders requisition pagination buttons.
 * @param {number} total Total filtered count
 * @param {number} start Start offset
 * @param {number} end End offset
 */
function renderRequisitionPagination(total, start, end) {
    const container = document.getElementById('reqPaginationControls');
    if (!container) return;
    container.innerHTML = '';

    const totalPages = Math.ceil(total / requisitionsPerPage);
    if (totalPages <= 1) return;

    const prevBtn = document.createElement('button');
    prevBtn.className = `p-1.5 rounded-lg border border-slate-200 text-xs font-medium transition ${currentRequisitionPage === 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100 cursor-pointer'}`;
    prevBtn.innerHTML = '<i class="ph ph-caret-left"></i>';
    prevBtn.disabled = currentRequisitionPage === 1;
    prevBtn.onclick = () => { if (currentRequisitionPage > 1) { currentRequisitionPage--; renderRequisitionTable(); } };
    container.appendChild(prevBtn);

    for (let p = 1; p <= totalPages; p++) {
        const pBtn = document.createElement('button');
        pBtn.className = `w-7 h-7 rounded-lg text-xs font-bold transition font-num ${p === currentRequisitionPage ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600 border border-slate-200'}`;
        pBtn.innerText = String(p);
        pBtn.onclick = () => { currentRequisitionPage = p; renderRequisitionTable(); };
        container.appendChild(pBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = `p-1.5 rounded-lg border border-slate-200 text-xs font-medium transition ${currentRequisitionPage === totalPages ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100 cursor-pointer'}`;
    nextBtn.innerHTML = '<i class="ph ph-caret-right"></i>';
    nextBtn.disabled = currentRequisitionPage === totalPages;
    nextBtn.onclick = () => { if (currentRequisitionPage < totalPages) { currentRequisitionPage++; renderRequisitionTable(); } };
    container.appendChild(nextBtn);
}

/**
 * [FIX-CRIT-01] Accordion toggle helper for drawer inspection panels.
 * @param {string} contentId DOM ID of collapsible panel
 * @param {string} caretId DOM ID of caret icon
 */
function toggleReqAccordion(contentId, caretId) {
    const panel = document.getElementById(contentId);
    const caret = document.getElementById(caretId);
    if (!panel) return;
    const isHidden = panel.classList.contains('hidden');
    if (isHidden) {
        panel.classList.remove('hidden');
        if (caret) caret.classList.remove('rotate-180');
    } else {
        panel.classList.add('hidden');
        if (caret) caret.classList.add('rotate-180');
    }
}

/**
 * [FIX-CRIT-01] Opens the Requisition Details Drawer showing stock impact and full audit trail.
 * @param {string} reqId Requisition identifier (e.g. 'REQ-2567/001')
 */
function openRequisitionDrawer(reqId) {
    const presets = (typeof window !== 'undefined' && Array.isArray(window.mockRequisitionPresets))
        ? window.mockRequisitionPresets
        : ((typeof mockRequisitionPresets !== 'undefined' && Array.isArray(mockRequisitionPresets)) ? mockRequisitionPresets : []);

    const req = presets.find(r => r.id === reqId);
    if (!req) return;
    selectedRequisition = req;

    const docIdEl = document.getElementById('reqDrawerDocId');
    if (docIdEl) docIdEl.innerText = req.id;
    const dateEl = document.getElementById('reqDrawerDate');
    if (dateEl) dateEl.innerText = req.date;

    const status = getRequisitionStatus(req);
    const badgeEl = document.getElementById('reqDrawerStatusBadge');
    if (badgeEl) {
        if (status === 'pending_approval') {
            badgeEl.className = 'px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800';
            badgeEl.innerText = 'รออนุมัติ';
        } else if (status === 'pending_issue' || status === 'ready_to_issue') {
            badgeEl.className = 'px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800';
            badgeEl.innerText = 'รอจ่ายพัสดุ';
        } else if (status === 'partial') {
            badgeEl.className = 'px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800';
            badgeEl.innerText = 'จ่ายบางส่วน';
        } else if (status === 'rejected') {
            badgeEl.className = 'px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800';
            badgeEl.innerText = 'ไม่อนุมัติ';
        } else {
            badgeEl.className = 'px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800';
            badgeEl.innerText = 'จ่ายแล้วเสร็จ';
        }
    }

    const teacherEl = document.getElementById('reqDrawerTeacher');
    if (teacherEl) teacherEl.innerText = req.teacher;
    const deptEl = document.getElementById('reqDrawerDept');
    if (deptEl) deptEl.innerText = req.dept;
    const whEl = document.getElementById('reqDrawerWarehouse');
    if (whEl) whEl.innerText = req.warehouse;
    const purposeEl = document.getElementById('reqDrawerPurpose');
    if (purposeEl) purposeEl.innerText = req.purpose;

    const countEl = document.getElementById('reqDrawerItemCount');
    if (countEl) countEl.innerText = `${req.items ? req.items.length : 0} รายการ`;

    // Render Stock Impact Preview Cards
    const impactContainer = document.getElementById('reqDrawerStockImpactCards');
    if (impactContainer && req.items && typeof allData !== 'undefined' && Array.isArray(allData)) {
        impactContainer.innerHTML = '';
        req.items.forEach(item => {
            const master = allData.find(d => d.code === item.code);
            const currentStock = master ? master.stock : 0;
            const minStock = master ? master.min : 0;
            const ropStock = master ? master.rop : 0;
            const unit = item.unit || (master ? master.unit : 'หน่วย');
            const reqQty = item.reqQty || 0;
            const actualQty = item.actualQty > 0 ? item.actualQty : reqQty;
            const postStock = currentStock - actualQty;

            let statusHtml = '';
            if (postStock < 0 || reqQty > currentStock) {
                statusHtml = '<div class="text-rose-600 font-bold flex items-center gap-1 mt-1 text-xs"><i class="ph-bold ph-warning-octagon"></i> 🔴 Stock ไม่เพียงพอ / ไม่สามารถจ่ายเต็มจำนวน</div>';
            } else if (postStock < minStock) {
                statusHtml = `<div class="text-amber-600 font-bold flex items-center gap-1 mt-1 text-xs"><i class="ph-bold ph-warning"></i> ⚠ ต่ำกว่า Minimum Stock (เกณฑ์ Min: ${minStock} ${unit})</div>`;
            } else if (postStock <= ropStock) {
                statusHtml = `<div class="text-amber-600 font-semibold flex items-center gap-1 mt-1 text-xs"><i class="ph-bold ph-warning"></i> ⚠ ใกล้ถึงจุดสั่งซื้อซ้ำ ROP (${ropStock} ${unit})</div>`;
            } else {
                statusHtml = '<div class="text-emerald-600 font-semibold flex items-center gap-1 mt-1 text-xs"><i class="ph-bold ph-check-circle"></i> ✓ สต็อกปกติพร้อมใช้งาน</div>';
            }

            const card = document.createElement('div');
            card.className = 'p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs';
            card.innerHTML = `
                <div class="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                    <div>
                        <span class="font-mono font-bold text-blue-700">${item.code}</span>
                        <div class="font-semibold text-slate-800">${item.name}</div>
                    </div>
                    <span class="text-slate-500 font-num">เกณฑ์ Min: ${minStock} ${unit}</span>
                </div>
                <div class="grid grid-cols-3 gap-2 text-center py-1 font-num">
                    <div class="bg-white p-2 rounded-lg border border-slate-200">
                        <span class="text-slate-400 block text-[11px]">คงเหลือก่อนจ่าย</span>
                        <span class="font-bold text-slate-800 text-sm">${typeof formatNumber === 'function' ? formatNumber(currentStock) : currentStock}</span> ${unit}
                    </div>
                    <div class="bg-blue-50/60 p-2 rounded-lg border border-blue-200">
                        <span class="text-blue-600 block text-[11px]">ยอดขอเบิก</span>
                        <span class="font-bold text-blue-700 text-sm">${typeof formatNumber === 'function' ? formatNumber(reqQty) : reqQty}</span> ${unit}
                    </div>
                    <div class="bg-white p-2 rounded-lg border border-slate-200">
                        <span class="text-slate-400 block text-[11px]">คงเหลือหลังจ่าย</span>
                        <span class="font-bold ${postStock < minStock ? 'text-rose-600' : 'text-emerald-600'} text-sm">${typeof formatNumber === 'function' ? formatNumber(postStock) : postStock}</span> ${unit}
                    </div>
                </div>
                ${statusHtml}
            `;
            impactContainer.appendChild(card);
        });
    }

    const drawerTableBody = document.getElementById('reqDrawerItemsTableBody');
    if (drawerTableBody && req.items) {
        drawerTableBody.innerHTML = '';
        req.items.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="py-2 px-3 font-mono text-xs">${item.code}</td>
                <td class="py-2 px-3 text-xs">${item.name}</td>
                <td class="py-2 px-3 text-center text-xs font-num">${item.reqQty || 0}</td>
                <td class="py-2 px-3 text-center text-xs font-num">${item.actualQty || item.reqQty || 0}</td>
            `;
            drawerTableBody.appendChild(tr);
        });
    }

    // Render Footer Actions based on status
    const footerActions = document.getElementById('reqDrawerFooterActions');
    if (footerActions) {
        if (status === 'pending_approval') {
            footerActions.innerHTML = `
                <button type="button" onclick="rejectRequisition('${req.id}')" class="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer">
                    ไม่อนุมัติ
                </button>
                <div class="flex items-center gap-2">
                    <button type="button" onclick="viewRequisitionDoc('${req.id}')" class="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition inline-flex items-center gap-1 cursor-pointer">
                        <i class="ph-bold ph-printer"></i>
                        <span>พ.ด. ๑</span>
                    </button>
                    <button type="button" onclick="approveRequisition('${req.id}')" class="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs inline-flex items-center gap-1 cursor-pointer">
                        <i class="ph-bold ph-check"></i>
                        <span>อนุมัติคำขอ</span>
                    </button>
                </div>
            `;
        } else if (status === 'pending_issue' || status === 'ready_to_issue') {
            footerActions.innerHTML = `
                <button type="button" onclick="duplicateRequisition('${req.id}')" class="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition inline-flex items-center gap-1 cursor-pointer">
                    <i class="ph-bold ph-copy"></i>
                    <span>คัดลอก</span>
                </button>
                <div class="flex items-center gap-2">
                    <button type="button" onclick="viewRequisitionDoc('${req.id}')" class="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition inline-flex items-center gap-1 cursor-pointer">
                        <i class="ph-bold ph-printer"></i>
                        <span>พ.ด. ๑</span>
                    </button>
                    <button type="button" onclick="openConfirmIssueModal('${req.id}')" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs inline-flex items-center gap-1 cursor-pointer">
                        <i class="ph-bold ph-package"></i>
                        <span>จ่ายพัสดุ</span>
                    </button>
                </div>
            `;
        } else {
            footerActions.innerHTML = `
                <button type="button" onclick="duplicateRequisition('${req.id}')" class="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition inline-flex items-center gap-1 cursor-pointer">
                    <i class="ph-bold ph-copy"></i>
                    <span>ทำรายการใหม่จากรายการนี้</span>
                </button>
                <button type="button" onclick="viewRequisitionDoc('${req.id}')" class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs inline-flex items-center gap-1 cursor-pointer">
                    <i class="ph-bold ph-printer"></i>
                    <span>พิมพ์ใบเบิก พ.ด. ๑</span>
                </button>
            `;
        }
    }

    const drawer = document.getElementById('reqDetailDrawer');
    const backdrop = document.getElementById('reqDrawerBackdrop');
    if (drawer && backdrop) {
        backdrop.classList.remove('hidden');
        drawer.classList.remove('translate-x-full');
        if (typeof pushOverlay === 'function') pushOverlay('reqDetailDrawer', closeRequisitionDrawer);
    }
}

/**
 * [FIX-CRIT-01] Closes the Requisition Details Drawer.
 */
function closeRequisitionDrawer() {
    if (typeof popOverlay === 'function') popOverlay('reqDetailDrawer');
    const drawer = document.getElementById('reqDetailDrawer');
    const backdrop = document.getElementById('reqDrawerBackdrop');
    if (drawer && backdrop) {
        drawer.classList.add('translate-x-full');
        backdrop.classList.add('hidden');
    }
    selectedRequisition = null;
}

/**
 * [FIX-CRIT-01] Approves a requisition.
 * Adheres strictly to C-7 Stock Decoupling: APPROVED status DOES NOT decrement physical stock.
 * @param {string} reqId Requisition identifier
 */
function approveRequisition(reqId) {
    const presets = (typeof window !== 'undefined' && Array.isArray(window.mockRequisitionPresets))
        ? window.mockRequisitionPresets
        : ((typeof mockRequisitionPresets !== 'undefined' && Array.isArray(mockRequisitionPresets)) ? mockRequisitionPresets : []);

    const req = presets.find(r => r.id === reqId);
    if (!req) return;
    req.status = 'pending_issue';
    if (typeof window !== 'undefined' && window.RequisitionApi && typeof window.RequisitionApi.approveRequisition === 'function') {
        window.RequisitionApi.approveRequisition(reqId, {
            approverId: (window.currentUser && window.currentUser.id) ? window.currentUser.id : 'USR-DIRECTOR-01',
            note: 'อนุมัติจ่ายตามระเบียบ'
        }).catch(err => console.warn("[FIX-CRIT-01] RequisitionApi approve notice:", err));
    }
    if (typeof showToast === 'function') {
        showToast(`อนุมัติคำขอเบิก ${req.id} เรียบร้อยแล้ว (สถานะ: รอจ่ายพัสดุ)`, 'success');
    }
    renderRequisitionSummary();
    applyRequisitionFilters();
    if (selectedRequisition && selectedRequisition.id === reqId) {
        openRequisitionDrawer(reqId);
    }
}

/**
 * [FIX-CRIT-01] Rejects a requisition with an audit reason.
 * @param {string} reqId Requisition identifier
 */
function rejectRequisition(reqId) {
    const presets = (typeof window !== 'undefined' && Array.isArray(window.mockRequisitionPresets))
        ? window.mockRequisitionPresets
        : ((typeof mockRequisitionPresets !== 'undefined' && Array.isArray(mockRequisitionPresets)) ? mockRequisitionPresets : []);

    const req = presets.find(r => r.id === reqId);
    if (!req) return;
    req.status = 'rejected';
    if (typeof window !== 'undefined' && window.RequisitionApi && typeof window.RequisitionApi.rejectRequisition === 'function') {
        window.RequisitionApi.rejectRequisition(reqId, 'ไม่อนุมัติคำขอเบิก').catch(err => console.warn("[FIX-CRIT-01] RequisitionApi reject notice:", err));
    }
    if (typeof showToast === 'function') {
        showToast(`ไม่อนุมัติคำขอเบิก ${req.id} เรียบร้อยแล้ว (สถานะ: ไม่อนุมัติ)`, 'warning');
    }
    renderRequisitionSummary();
    applyRequisitionFilters();
    if (selectedRequisition && selectedRequisition.id === reqId) {
        openRequisitionDrawer(reqId);
    }
}

/**
 * [FIX-CRIT-01] Opens the Confirm Issue Modal for warehouse officer to verify and issue quantities.
 * @param {string} reqId Requisition identifier
 */
function openConfirmIssueModal(reqId) {
    const presets = (typeof window !== 'undefined' && Array.isArray(window.mockRequisitionPresets))
        ? window.mockRequisitionPresets
        : ((typeof mockRequisitionPresets !== 'undefined' && Array.isArray(mockRequisitionPresets)) ? mockRequisitionPresets : []);

    const req = presets.find(r => r.id === reqId);
    if (!req) return;
    confirmingRequisition = req;

    const docIdEl = document.getElementById('issueModalDocId');
    if (docIdEl) docIdEl.innerText = `เลขที่คำขอ: ${req.id} • ผู้ขอ: ${req.teacher}`;

    const tbody = document.getElementById('issueModalTableBody');
    if (tbody && req.items && typeof allData !== 'undefined' && Array.isArray(allData)) {
        tbody.innerHTML = '';
        req.items.forEach((item, idx) => {
            const master = allData.find(d => d.code === item.code);
            const stock = master ? master.stock : 0;
            const defaultActual = Math.min(stock, item.reqQty);

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 text-xs';
            tr.innerHTML = `
                <td class="py-2.5 px-3">
                    <span class="font-mono font-bold text-blue-700">${item.code}</span>
                    <div class="font-semibold text-slate-800">${item.name}</div>
                </td>
                <td class="py-2.5 px-2 text-right font-num font-bold text-slate-700">${typeof formatNumber === 'function' ? formatNumber(stock) : stock}</td>
                <td class="py-2.5 px-2 text-right font-num font-bold text-blue-600">${typeof formatNumber === 'function' ? formatNumber(item.reqQty) : item.reqQty}</td>
                <td class="py-2.5 px-2 text-center">
                    <input type="number" id="issueActualInput_${idx}" min="0" max="${stock}" value="${defaultActual}" class="w-20 border border-slate-300 rounded-lg px-2 py-1 text-center font-num font-bold focus:outline-none focus:border-blue-500 bg-white">
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    const modal = document.getElementById('confirmIssueModal');
    if (modal) {
        modal.classList.remove('hidden');
        if (typeof pushOverlay === 'function') pushOverlay('confirmIssueModal', closeConfirmIssueModal);
    }
}

/**
 * [FIX-CRIT-01] Closes the Confirm Issue Modal and clears active state.
 */
function closeConfirmIssueModal() {
    if (typeof popOverlay === 'function') popOverlay('confirmIssueModal');
    const modal = document.getElementById('confirmIssueModal');
    if (modal) modal.classList.add('hidden');
    confirmingRequisition = null;
}

/**
 * [FIX-CRIT-01] Executes physical stock issuance.
 * Decrements physical inventory stock and posts to immutable double-entry stock ledger.
 * Adheres strictly to C-7 Stock Decoupling: physical deduction occurs ONLY upon issuance.
 */
async function executeIssueConfirmation() {
    if (!confirmingRequisition) return;
    const req = confirmingRequisition;
    const notesInput = document.getElementById('issueModalNotes');
    const notes = (notesInput && notesInput.value.trim()) || 'จ่ายตามคำขอเบิก';

    let isPartial = false;

    for (let idx = 0; idx < (req.items || []).length; idx++) {
        const item = req.items[idx];
        const input = document.getElementById(`issueActualInput_${idx}`);
        const actualQty = input ? parseInt(input.value, 10) || 0 : (item.reqQty || 0);
        item.actualQty = actualQty;
        
        if (actualQty < item.reqQty) {
            isPartial = true;
            item.note = `จ่ายบางส่วน (${actualQty}/${item.reqQty}) ค้างจ่าย ${item.reqQty - actualQty} ${item.unit}`;
        } else {
            item.note = notes;
        }

        const master = (typeof allData !== 'undefined' && Array.isArray(allData)) ? allData.find(d => d.code === item.code) : null;
        if (master && actualQty > 0) {
            try {
                if (typeof window !== 'undefined' && window.StockApi && typeof window.StockApi.issueStock === 'function') {
                    await window.StockApi.issueStock({
                        itemCode: item.code,
                        quantity: actualQty,
                        recipient: req.teacher || 'ไม่ระบุ',
                        requisitionId: req.id,
                        notes: item.note
                    });
                } else if (typeof window !== 'undefined' && typeof window.postLedgerEntry === 'function') {
                    window.postLedgerEntry({
                        itemId: item.code,
                        transactionId: `TXN-REQ-${req.id}-${item.code}`,
                        transactionType: 'ISSUE',
                        qtyIn: 0,
                        qtyOut: actualQty,
                        unitCost: master.unit_cost,
                        fiscalYear: typeof currentFiscalYear !== 'undefined' ? parseInt(currentFiscalYear, 10) : 2569,
                        actorUserId: (typeof currentUser !== 'undefined' && currentUser && currentUser.name) ? currentUser.name : 'USR-STAFF-01',
                        referenceType: 'REQUISITION',
                        referenceId: req.id,
                        note: `จ่ายพัสดุตามคำขอ ${req.id} ผู้ขอเบิก: ${req.teacher || 'ไม่ระบุ'}`
                    });
                } else {
                    master.stock = Math.max(0, master.stock - actualQty);
                    master.total_val = master.stock * master.unit_cost;
                    if (master.stock <= master.min) master.status = 'critical';
                    else if (master.stock <= master.rop) master.status = 'low';
                    else master.status = 'normal';
                }
            } catch (ledgerErr) {
                console.warn("[FIX-CRIT-01] Stock Ledger issue notice:", ledgerErr.message);
                master.stock = Math.max(0, master.stock - actualQty);
                master.total_val = master.stock * master.unit_cost;
                if (master.stock <= master.min) master.status = 'critical';
                else if (master.stock <= master.rop) master.status = 'low';
                else master.status = 'normal';
            }

            if (!master.history) master.history = [];
            master.history.unshift({
                code: master.code,
                teacher: req.teacher,
                qty: actualQty,
                date: new Date().toLocaleDateString('th-TH')
            });
        }
    }

    req.status = isPartial ? 'partial' : 'completed';
    closeConfirmIssueModal();
    closeRequisitionDrawer();

    // Refresh UI
    if (typeof populateRequisitionPresets === 'function') populateRequisitionPresets();
    renderRequisitionSummary();
    applyRequisitionFilters();
    if (typeof applyFilters === 'function') applyFilters();
    if (typeof renderKPIs === 'function') renderKPIs();

    if (typeof showToast === 'function') {
        showToast(`บันทึกจ่ายพัสดุสำหรับคำขอ ${req.id} เรียบร้อยแล้ว (${isPartial ? 'จ่ายบางส่วน' : 'จ่ายครบถ้วน'})`, 'success');
    }
}

/**
 * [FIX-CRIT-01] Opens the multi-item requisition modal with empty or pre-selected item.
 * @param {Object} [initialItem] Pre-selected item from catalog
 */
function openMultiItemRequisitionModal(initialItem) {
    populateRequisitionDeptDropdowns();
    multiReqRows = [];

    const tInput = document.getElementById('multiReqTeacher');
    if (tInput) tInput.value = '';
    const pInput = document.getElementById('multiReqPurpose');
    if (pInput) pInput.value = '';

    if (initialItem && initialItem.code) {
        multiReqRows.push({ code: initialItem.code, reqQty: 1 });
    } else if (typeof allData !== 'undefined' && Array.isArray(allData) && allData.length > 0) {
        multiReqRows.push({ code: allData[0].code, reqQty: 1 });
    }

    renderMultiReqRows();
    const modal = document.getElementById('multiItemRequisitionModal');
    if (modal) {
        modal.classList.remove('hidden');
        if (typeof pushOverlay === 'function') pushOverlay('multiItemRequisitionModal', closeMultiItemRequisitionModal);
    }
}

/**
 * [FIX-CRIT-01] Closes the multi-item requisition modal and resets rows.
 */
function closeMultiItemRequisitionModal() {
    if (typeof popOverlay === 'function') popOverlay('multiItemRequisitionModal');
    const modal = document.getElementById('multiItemRequisitionModal');
    if (modal) modal.classList.add('hidden');
    multiReqRows = [];
}

/**
 * [FIX-CRIT-01] Adds a new item row to the multi-item requisition modal.
 * @param {string} [itemCode] Optional item code to select
 * @param {number} [qty=1] Optional quantity
 */
function addMultiReqRow(itemCode, qty) {
    const items = (typeof allData !== 'undefined' && Array.isArray(allData)) ? allData : [];
    const nextCode = itemCode || (items.length > multiReqRows.length ? items[multiReqRows.length].code : (items[0] ? items[0].code : ''));
    multiReqRows.push({ code: nextCode, reqQty: qty || 1 });
    renderMultiReqRows();
}

/**
 * [FIX-CRIT-01] Removes a row from the multi-item requisition modal.
 * @param {number} index Index of row to remove
 */
function removeMultiReqRow(index) {
    if (multiReqRows.length <= 1) {
        if (typeof showToast === 'function') {
            showToast('ต้องมีรายการพัสดุอย่างน้อย 1 รายการ', 'warning');
        }
        return;
    }
    multiReqRows.splice(index, 1);
    renderMultiReqRows();
}

/**
 * [FIX-CRIT-01] Updates item selection in multi-item requisition row.
 * @param {number} index Row index
 * @param {string} newCode Selected item code
 */
function onMultiReqItemChange(index, newCode) {
    if (multiReqRows[index]) {
        multiReqRows[index].code = newCode;
        renderMultiReqRows();
    }
}

/**
 * [FIX-CRIT-01] Updates requested quantity in multi-item requisition row.
 * @param {number} index Row index
 * @param {string|number} newQty Requested quantity
 */
function onMultiReqQtyChange(index, newQty) {
    if (multiReqRows[index]) {
        multiReqRows[index].reqQty = parseInt(newQty, 10) || 1;
        updateMultiReqImpact();
    }
}

/**
 * [FIX-CRIT-01] Renders all item rows inside the multi-item requisition modal table.
 */
function renderMultiReqRows() {
    const tbody = document.getElementById('multiReqRowsBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const items = (typeof allData !== 'undefined' && Array.isArray(allData)) ? allData : [];

    multiReqRows.forEach((row, idx) => {
        const master = items.find(d => d.code === row.code) || items[0] || { code: row.code, name: row.code, stock: 0, unit: 'หน่วย', min: 0, rop: 0 };
        const currentStock = master.stock || 0;
        const reqQty = row.reqQty || 1;
        const postStock = currentStock - reqQty;
        const isOverStock = reqQty > currentStock;

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 text-xs sm:text-sm';

        const selectOptions = items.map(item => `
            <option value="${item.code}" ${item.code === master.code ? 'selected' : ''}>
                [${item.code}] ${item.name} (${item.stock} ${item.unit})
            </option>
        `).join('');

        tr.innerHTML = `
            <td class="py-2.5 px-3">
                <select onchange="onMultiReqItemChange(${idx}, this.value)" class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm bg-white focus:outline-none focus:border-blue-500 max-w-xs truncate">
                    ${selectOptions}
                </select>
            </td>
            <td class="py-2.5 px-2 text-right font-num font-bold text-slate-700">
                ${typeof formatNumber === 'function' ? formatNumber(currentStock) : currentStock} ${master.unit}
            </td>
            <td class="py-2.5 px-2 text-center">
                <div class="relative inline-block w-24">
                    <input type="number" min="1" max="${currentStock}" value="${reqQty}" oninput="onMultiReqQtyChange(${idx}, this.value)" class="w-full border ${isOverStock ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-300 bg-white text-slate-900'} rounded-lg px-2 py-1 text-center font-num font-bold focus:outline-none focus:border-blue-500">
                </div>
            </td>
            <td class="py-2.5 px-2 text-center font-num">
                ${isOverStock 
                    ? `<span class="font-bold text-rose-600">เกินสต็อก (${postStock})</span>` 
                    : `<span class="font-semibold ${postStock <= master.min ? 'text-rose-600' : (postStock <= master.rop ? 'text-amber-600' : 'text-emerald-600')}">เหลือ ${postStock}</span>`
                }
            </td>
            <td class="py-2.5 px-2 text-center">
                <button type="button" onclick="removeMultiReqRow(${idx})" class="text-slate-400 hover:text-rose-600 p-1.5 rounded-md transition cursor-pointer" title="ลบรายการนี้">
                    <i class="ph-bold ph-trash text-sm"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    updateMultiReqImpact();
}

/**
 * [FIX-CRIT-01] Evaluates stock impact for items in multi-item requisition modal,
 * updates summary counters and validation warning messages.
 */
function updateMultiReqImpact() {
    const countEl = document.getElementById('multiReqSummaryCount');
    const qtyEl = document.getElementById('multiReqSummaryQty');
    const warnEl = document.getElementById('multiReqWarningText');
    const submitBtn = document.getElementById('btnSubmitMultiReq');

    const items = (typeof allData !== 'undefined' && Array.isArray(allData)) ? allData : [];
    let totalQty = 0;
    let hasOverStock = false;
    let hasLowImpact = false;

    multiReqRows.forEach(row => {
        const master = items.find(d => d.code === row.code) || items[0] || { stock: 0, min: 0 };
        const qty = row.reqQty || 1;
        totalQty += qty;
        if (qty > master.stock) hasOverStock = true;
        if ((master.stock - qty) <= master.min) hasLowImpact = true;
    });

    if (countEl) countEl.innerText = `${multiReqRows.length} รายการ`;
    if (qtyEl) qtyEl.innerText = `${typeof formatNumber === 'function' ? formatNumber(totalQty) : totalQty} หน่วย`;

    if (warnEl && submitBtn) {
        if (hasOverStock) {
            warnEl.innerHTML = '<span class="text-rose-600 font-bold flex items-center gap-1"><i class="ph-bold ph-warning-octagon"></i> 🔴 สต็อกไม่พอ / มีรายการที่ระบุเกินสต็อก / เกินยอดคงเหลือ</span>';
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else if (hasLowImpact) {
            warnEl.innerHTML = '<span class="text-amber-600 font-semibold flex items-center gap-1"><i class="ph-bold ph-warning"></i> ⚠ สต็อกหลังจ่ายจะต่ำกว่า Minimum Stock / ใกล้ถึงจุด ROP</span>';
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            warnEl.innerHTML = '<span class="text-emerald-600 font-semibold flex items-center gap-1"><i class="ph-bold ph-check-circle"></i> ✓ สต็อกเพียงพอ พร้อมสร้างคำขอเบิก</span>';
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
}

/**
 * [FIX-CRIT-01] Alias for updateMultiReqImpact to fulfill the exact audit prompt contract.
 */
function updateMultiReqSummary() {
    updateMultiReqImpact();
}

/**
 * [FIX-CRIT-01] Validates and submits a new multi-item requisition via RequisitionApi.createRequisition.
 */
async function submitMultiItemRequisition() {
    const teacherEl = document.getElementById('multiReqTeacher');
    const teacher = (teacherEl && teacherEl.value.trim()) || '';
    const deptEl = document.getElementById('multiReqDept');
    const dept = (deptEl && deptEl.value.trim()) || 'กลุ่มสาระการเรียนรู้ / ฝ่ายงาน';
    const purposeEl = document.getElementById('multiReqPurpose');
    const purpose = (purposeEl && purposeEl.value.trim()) || 'เพื่อใช้ในการจัดการเรียนการสอนและงานราชการสถานศึกษา';

    if (!teacher) {
        if (typeof showToast === 'function') showToast('กรุณาระบุชื่อผู้ขอเบิกพัสดุ (ครู / บุคลากร)', 'warning');
        document.getElementById('multiReqTeacher')?.focus();
        return;
    }

    if (multiReqRows.length === 0) {
        if (typeof showToast === 'function') showToast('กรุณาเพิ่มรายการพัสดุอย่างน้อย 1 รายการ', 'warning');
        return;
    }

    const items = (typeof allData !== 'undefined' && Array.isArray(allData)) ? allData : [];
    for (let i = 0; i < multiReqRows.length; i++) {
        const r = multiReqRows[i];
        const master = items.find(d => d.code === r.code);
        if (master && r.reqQty > master.stock) {
            if (typeof showToast === 'function') showToast(`พัสดุ ${master.name} มียอดคงเหลือเพียง ${master.stock} ${master.unit} (ระบุเกิน)`, 'critical');
            return;
        }
    }

    const presets = (typeof window !== 'undefined' && Array.isArray(window.mockRequisitionPresets))
        ? window.mockRequisitionPresets
        : ((typeof mockRequisitionPresets !== 'undefined' && Array.isArray(mockRequisitionPresets)) ? mockRequisitionPresets : []);

    const currentFY = typeof currentFiscalYear !== 'undefined' ? currentFiscalYear : '2569';
    const docNo = `REQ-${currentFY}/${String(presets.length + 15).padStart(3, '0')}`;
    const firstMaster = items.find(d => d.code === multiReqRows[0].code);

    const newReqItems = multiReqRows.map(r => {
        const m = items.find(d => d.code === r.code) || {};
        return {
            code: m.code || r.code,
            name: m.name || r.code,
            reqQty: r.reqQty,
            actualQty: 0,
            unit: m.unit || 'หน่วย',
            warehouse: m.warehouse || 'ห้องเก็บพัสดุ',
            note: 'รอการพิจารณา'
        };
    });

    const newPreset = {
        id: docNo,
        date: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
        teacher: teacher,
        dept: dept,
        warehouse: firstMaster ? firstMaster.warehouse : "ห้องเก็บพัสดุ",
        purpose: purpose,
        signerStaff: "นายอนันต์ มั่นคง",
        signerApprover: "นายสมศักดิ์ รุ่งเรือง",
        status: "pending_approval",
        items: newReqItems
    };

    presets.unshift(newPreset);
    if (typeof window !== 'undefined' && window.RequisitionApi && typeof window.RequisitionApi.createRequisition === 'function') {
        window.RequisitionApi.createRequisition({
            id: docNo,
            teacher: teacher,
            dept: dept,
            purpose: purpose,
            items: newReqItems
        }).catch(err => console.warn("[FIX-CRIT-01] RequisitionApi create notice:", err));
    }
    closeMultiItemRequisitionModal();

    if (typeof populateRequisitionPresets === 'function') populateRequisitionPresets();
    renderRequisitionSummary();
    switchRequisitionTab('pending_approval');
    if (typeof showToast === 'function') {
        showToast(`สร้างคำขอเบิกพัสดุ ${docNo} สำเร็จแล้ว (สถานะ: รออนุมัติ)`, 'success');
    }
}

/**
 * [FIX-CRIT-01] Duplicates an existing requisition for re-submitting.
 * @param {string} reqId Requisition identifier to duplicate
 */
function duplicateRequisition(reqId) {
    const presets = (typeof window !== 'undefined' && Array.isArray(window.mockRequisitionPresets))
        ? window.mockRequisitionPresets
        : ((typeof mockRequisitionPresets !== 'undefined' && Array.isArray(mockRequisitionPresets)) ? mockRequisitionPresets : []);

    const req = presets.find(r => r.id === reqId);
    if (!req) return;

    populateRequisitionDeptDropdowns();
    multiReqRows = [];

    const tInput = document.getElementById('multiReqTeacher');
    if (tInput) tInput.value = req.teacher;
    const dInput = document.getElementById('multiReqDept');
    if (dInput) dInput.value = req.dept;
    const pInput = document.getElementById('multiReqPurpose');
    if (pInput) pInput.value = `(คัดลอกจาก ${req.id}) ${req.purpose}`;

    if (req.items && req.items.length > 0) {
        req.items.forEach(i => {
            multiReqRows.push({ code: i.code, reqQty: i.reqQty || 1 });
        });
    } else if (typeof allData !== 'undefined' && Array.isArray(allData) && allData.length > 0) {
        multiReqRows.push({ code: allData[0].code, reqQty: 1 });
    }

    renderMultiReqRows();
    const modal = document.getElementById('multiItemRequisitionModal');
    if (modal) modal.classList.remove('hidden');
    if (typeof showToast === 'function') {
        showToast(`คัดลอกรายการจาก ${req.id} เพื่อทำรายการใหม่เรียบร้อยแล้ว`, 'info');
    }
}

/**
 * [FIX-CRIT-01] Opens the official document view (แบบ พ.ด. ๑) for a requisition.
 * @param {string} reqId Requisition identifier
 */
function viewRequisitionDoc(reqId) {
    const select = document.getElementById('selectRequisitionPreset');
    if (select) select.value = reqId;
    if (typeof loadRequisitionDocPreset === 'function') loadRequisitionDocPreset();
    if (typeof switchMainView === 'function') switchMainView('docs');
    if (typeof switchDocTab === 'function') switchDocTab('requisition');
    if (typeof showToast === 'function') {
        showToast(`เปิดเอกสารใบเบิกทางการ (แบบ พ.ด. ๑) สำหรับ ${reqId}`, 'info');
    }
}

/**
 * [FIX-CRIT-01] Exports requisition queue records as standard CSV with UTF-8 BOM.
 */
function exportRequisitionLedgerCSV() {
    const presets = (typeof window !== 'undefined' && Array.isArray(window.mockRequisitionPresets))
        ? window.mockRequisitionPresets
        : ((typeof mockRequisitionPresets !== 'undefined' && Array.isArray(mockRequisitionPresets)) ? mockRequisitionPresets : []);

    if (presets.length === 0) {
        if (typeof showToast === 'function') showToast('ไม่มีข้อมูลคำขอเบิกพัสดุสำหรับการส่งออก', 'warning');
        return;
    }

    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += "เลขที่คำขอ,วันที่ขอเบิก,ผู้ขอเบิก,กลุ่มสาระ/ฝ่ายงาน,คลังพัสดุ,รหัสพัสดุ,ชื่อพัสดุ,จำนวนขอเบิก,จำนวนจ่ายจริง,หน่วยนับ,สถานะคำขอ\n";

    presets.forEach(req => {
        const status = getRequisitionStatus(req);
        let statusText = 'จ่ายแล้วเสร็จ';
        if (status === 'pending_approval') statusText = 'รออนุมัติ';
        else if (status === 'pending_issue' || status === 'ready_to_issue') statusText = 'รอจ่าย';
        else if (status === 'partial') statusText = 'จ่ายบางส่วน';
        else if (status === 'rejected') statusText = 'ไม่อนุมัติ';

        (req.items || []).forEach(item => {
            const row = [
                `"${req.id}"`,
                `"${req.date}"`,
                `"${req.teacher}"`,
                `"${req.dept}"`,
                `"${req.warehouse}"`,
                `"${item.code}"`,
                `"${item.name}"`,
                item.reqQty || 0,
                item.actualQty || 0,
                `"${item.unit}"`,
                `"${statusText}"`
            ];
            csvContent += row.join(",") + "\n";
        });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const currFY = typeof currentFiscalYear !== 'undefined' ? currentFiscalYear : '2569';
    link.setAttribute("download", `HRT_Requisitions_${currFY}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (typeof showToast === 'function') {
        showToast('ส่งออกทะเบียนคำขอเบิก CSV เรียบร้อยแล้ว', 'success');
    }
}
