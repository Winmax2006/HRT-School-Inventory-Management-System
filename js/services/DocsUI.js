/**
 * ==============================================================================
 * HRT School Inventory Management System - Frontend Service Layer
 * File: js/services/DocsUI.js
 * Description: Official Document Templates (แบบ พ.ด. ๑–๗) UI Controller
 * Standard: Thailand Government Procurement and Supplies Management Act B.E. 2560
 * ==============================================================================
 */

// [FIX-CRIT-01] Module State & Shared Variables
let currentDocTab = 'requisition';
if (typeof window !== 'undefined' && typeof window.docPreviewZoom === 'undefined') {
    window.docPreviewZoom = 1.0;
}

/**
 * [FIX-CRIT-01] Updates @page CSS size rule: portrait for 'requisition' and 'yearEndAllItems' (portrait mode),
 * landscape for 'monthly', 'stockCard', 'yearEndSummary', 'yearEndCategory'.
 * @param {string} docType Document type or tab identifier
 */
function updatePrintPageStyle(docType) {
    const styleEl = document.getElementById('printPageStyle');
    if (!styleEl) return;
    if (docType === 'requisition') {
        styleEl.innerHTML = `
            @page {
                size: A4 portrait;
                margin: 8mm 10mm;
            }
        `;
    } else if (docType === 'yearEndAllItems') {
        const orientSelect = document.getElementById('yeDocOrientation');
        const isPortrait = orientSelect ? orientSelect.value === 'portrait' : true;
        if (isPortrait) {
            styleEl.innerHTML = `
                @page {
                    size: A4 portrait;
                    margin: 8mm 8mm;
                }
            `;
        } else {
            styleEl.innerHTML = `
                @page {
                    size: A4 landscape;
                    margin: 6mm 8mm;
                }
            `;
        }
    } else {
        styleEl.innerHTML = `
            @page {
                size: A4 landscape;
                margin: 6mm 8mm;
            }
        `;
    }
}

/**
 * [FIX-CRIT-01] Initializes the Documents Management Module.
 * Populates presets and dropdowns, loads initial document views, and sets the active tab.
 */
function initDocsModule() {
    populateRequisitionPresets();
    loadRequisitionDocPreset();
    renderDailyReport();
    renderMonthlyReport();
    populateStockCardDropdown();
    loadStockCardItem();
    switchDocTab('requisition');
}

/**
 * [FIX-CRIT-01] Switches active document tab and updates visible printable container and print styles.
 * @param {'requisition'|'daily'|'monthly'|'stockCard'|'yearEndSummary'|'yearEndCategory'|'yearEndAllItems'} tabName
 */
function switchDocTab(tabName) {
    currentDocTab = tabName;
    
    const tabs = ['requisition', 'daily', 'monthly', 'stockCard', 'yearEndSummary', 'yearEndCategory', 'yearEndAllItems'];
    tabs.forEach(t => {
        const btn = document.getElementById(`docTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
        const content = document.getElementById(`docContent${t.charAt(0).toUpperCase() + t.slice(1)}`);
        if (btn && content) {
            if (t === tabName) {
                btn.className = 'doc-tab-btn px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-blue-600 text-white';
                content.classList.remove('hidden');
                content.classList.add('flex', 'active-print-doc');
            } else {
                btn.className = 'doc-tab-btn px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700';
                content.classList.add('hidden');
                content.classList.remove('flex', 'active-print-doc');
            }
        }
    });

    updatePrintPageStyle(tabName);

    if (tabName === 'daily') renderDailyReport();
    if (tabName === 'monthly') renderMonthlyReport();
    if (tabName === 'stockCard') loadStockCardItem();
    if (tabName === 'yearEndSummary' && typeof renderYearEndSummaryReport === 'function') renderYearEndSummaryReport();
    if (tabName === 'yearEndCategory' && typeof renderYearEndCategoryReport === 'function') renderYearEndCategoryReport();
    if (tabName === 'yearEndAllItems' && typeof renderYearEndAllItemsReport === 'function') renderYearEndAllItemsReport();

    if (typeof applyDocZoom === 'function') setTimeout(applyDocZoom, 15);
}

/**
 * [FIX-CRIT-01] Applies zoom scale to document containers and updates zoom badge indicator.
 */
function applyDocZoom() {
    const docs = document.querySelectorAll('#viewDocs .printable-document, #viewDocs .doc-page-sheet');
    const badge = document.getElementById('docZoomLevelBadge');
    const zoomVal = (typeof window !== 'undefined' && typeof window.docPreviewZoom === 'number') ? window.docPreviewZoom : 1.0;
    if (badge) badge.innerText = `${Math.round(zoomVal * 100)}%`;

    docs.forEach(doc => {
        if (zoomVal === 1) {
            doc.style.transform = '';
            doc.style.transformOrigin = '';
            doc.style.marginBottom = '';
        } else {
            doc.style.transform = `scale(${zoomVal})`;
            doc.style.transformOrigin = 'top center';
            const h = doc.offsetHeight || (doc.classList.contains('doc-landscape-a4') ? 794 : 1122);
            const diff = h * (zoomVal - 1);
            doc.style.marginBottom = `${diff}px`;
        }
    });
}

/**
 * [FIX-CRIT-01] Adjusts document preview zoom level by delta (+/- 0.1).
 * @param {number} delta
 */
function zoomDocPreview(delta) {
    if (typeof window !== 'undefined') {
        const currentZoom = typeof window.docPreviewZoom === 'number' ? window.docPreviewZoom : 1.0;
        window.docPreviewZoom = Math.min(1.5, Math.max(0.4, Math.round((currentZoom + delta) * 10) / 10));
    }
    applyDocZoom();
}

/**
 * [FIX-CRIT-01] Resets document zoom scale to 1.0 (100%).
 */
function resetDocZoom() {
    if (typeof window !== 'undefined') {
        window.docPreviewZoom = 1.0;
    }
    applyDocZoom();
}

/**
 * [FIX-CRIT-01] Fits document preview scale to the container width.
 */
function fitDocPreview() {
    const activeSheet = document.querySelector('#viewDocs > div:not(.hidden) .printable-document, #viewDocs > div:not(.hidden) .doc-page-sheet');
    const wrapper = document.querySelector('#viewDocs > div:not(.hidden) .doc-preview-wrapper') || document.getElementById('viewDocs');
    if (activeSheet && wrapper) {
        const sheetWidth = activeSheet.offsetWidth || (activeSheet.classList.contains('doc-landscape-a4') ? 1122 : 794);
        const availableWidth = wrapper.clientWidth - 24;
        if (availableWidth > 0 && sheetWidth > 0) {
            const fitScale = Math.min(1.0, Math.max(0.4, Math.floor((availableWidth / sheetWidth) * 100) / 100));
            if (typeof window !== 'undefined') window.docPreviewZoom = fitScale;
            applyDocZoom();
            if (typeof showToast === 'function') {
                showToast(`ปรับขนาดแสดงผลให้พอดีหน้าจอ (${Math.round(fitScale * 100)}%)`, 'info');
            }
            return;
        }
    }
    const w = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 1024;
    let fallbackScale = 1.0;
    if (w < 640) fallbackScale = 0.5;
    else if (w < 1024) fallbackScale = 0.75;
    if (typeof window !== 'undefined') window.docPreviewZoom = fallbackScale;
    applyDocZoom();
}

/**
 * [FIX-CRIT-01] Populates the requisition dropdown preset selector.
 */
function populateRequisitionPresets() {
    const select = document.getElementById('selectRequisitionPreset');
    if (!select) return;
    select.innerHTML = '';
    const presets = (typeof window !== 'undefined' && Array.isArray(window.mockRequisitionPresets))
        ? window.mockRequisitionPresets
        : ((typeof mockRequisitionPresets !== 'undefined' && Array.isArray(mockRequisitionPresets)) ? mockRequisitionPresets : []);

    if (presets.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.innerText = '-- ไม่พบเอกสารคำขอเบิกในระบบ --';
        select.appendChild(opt);
        return;
    }
    presets.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.innerText = `${p.id} — ${p.teacher} (${p.dept})`;
        select.appendChild(opt);
    });
}

/**
 * [FIX-CRIT-01] Loads and renders the selected requisition slip preset (แบบ พ.ด. ๑).
 */
function loadRequisitionDocPreset() {
    const select = document.getElementById('selectRequisitionPreset');
    if (!select) return;
    const presets = (typeof window !== 'undefined' && Array.isArray(window.mockRequisitionPresets))
        ? window.mockRequisitionPresets
        : ((typeof mockRequisitionPresets !== 'undefined' && Array.isArray(mockRequisitionPresets)) ? mockRequisitionPresets : []);

    const presetId = select.value;
    const preset = presets.find(p => p.id === presetId) || presets[0];
    if (!preset) return;

    const elNo = document.getElementById('reqDocNo');
    if (elNo) elNo.innerText = preset.id;
    const serialEl = document.getElementById('reqDocSerialNo');
    if (serialEl) serialEl.innerText = `รหัสเอกสาร: HRT-INV-${preset.id}`;
    const elDate = document.getElementById('reqDocDate');
    if (elDate) elDate.innerText = preset.date;
    const elTeacher = document.getElementById('reqDocTeacher');
    if (elTeacher) elTeacher.innerText = preset.teacher;
    const elDept = document.getElementById('reqDocDept');
    if (elDept) elDept.innerText = preset.dept;
    const elWh = document.getElementById('reqDocWarehouse');
    if (elWh) elWh.innerText = preset.warehouse;
    const elPurpose = document.getElementById('reqDocPurpose');
    if (elPurpose) elPurpose.innerText = preset.purpose;
    const elSign = document.getElementById('signTeacherName');
    if (elSign) elSign.innerText = `(${preset.teacher})`;

    const tbody = document.getElementById('reqDocTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    (preset.items || []).forEach((item, idx) => {
        const fsnCode = typeof getFsnCodeForItem === 'function' ? getFsnCodeForItem(item) : (item.fsnCode || item.code);
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 text-slate-800 text-[10pt] leading-tight';
        tr.innerHTML = `
            <td class="border border-slate-300 py-1 px-1 text-center font-num">${idx + 1}</td>
            <td class="border border-slate-300 py-1 px-1 text-center">
                <div class="font-mono font-bold text-blue-800 text-[9.5pt] leading-none">${item.code}</div>
                <div class="font-mono text-[8pt] text-slate-600 tracking-tight leading-none">${fsnCode}</div>
            </td>
            <td class="border border-slate-300 py-1 px-1.5 font-medium text-slate-900 text-[10pt]">${item.name}</td>
            <td class="border border-slate-300 py-1 px-1 text-center font-num text-[10pt]">${item.reqQty || 0}</td>
            <td class="border border-slate-300 py-1 px-1 text-center font-num font-bold text-slate-900 text-[10pt]">${item.actualQty || 0}</td>
            <td class="border border-slate-300 py-1 px-1 text-center text-[9.5pt] text-slate-700">${item.unit || 'หน่วย'}</td>
            <td class="border border-slate-300 py-1 px-1 text-slate-600 text-[9pt]">${item.warehouse || 'ห้องเก็บพัสดุ'}</td>
            <td class="border border-slate-300 py-1 px-1 text-center text-slate-500 text-[9pt]">${item.note || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * [FIX-CRIT-01] Renders the official daily inventory balance report (แบบ พ.ด. ๒) with multi-page support.
 */
function renderDailyReport() {
    const container = document.getElementById('dailyDocPagesContainer');
    if (!container) return;
    container.innerHTML = '';

    const picker = document.getElementById('dailyReportDatePicker');
    const selectedDateVal = picker ? picker.value : '2024-05-15';
    
    // Format Thai Display Date
    const parts = selectedDateVal.split('-');
    const yearThai = parseInt(parts[0], 10) + 543;
    const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const monthThai = monthNames[parseInt(parts[1], 10) - 1] || 'พฤษภาคม';
    const dayThai = parseInt(parts[2], 10) || 15;
    const formattedThaiDate = `${dayThai} ${monthThai} ${yearThai}`;
    const dateSerial = `${yearThai}/${String(parts[1]).padStart(2, '0')}${String(parts[2]).padStart(2, '0')}`;

    // 8 Government Categories
    const dailyCatMap = {
        'ALL': { code: 'CAT-ALL', label: 'ทุกหมวดพัสดุ (8 หมวดหมู่วัสดุราชการ)', short: 'ทุกหมวดพัสดุ', subTitle: 'สรุปยอดคงเหลือประจำวัน (ทุกหมวด)', matchKeyword: '' },
        'OFF': { code: 'CAT01-OFF', label: 'หมวด 1 วัสดุสำนักงาน', short: 'หมวด 1', subTitle: 'หมวด 1 วัสดุสำนักงาน', matchKeyword: 'สำนักงาน' },
        'EDU': { code: 'CAT02-EDU', label: 'หมวด 2 วัสดุการศึกษา', short: 'หมวด 2', subTitle: 'หมวด 2 วัสดุการศึกษา', matchKeyword: 'การศึกษา' },
        'COM': { code: 'CAT03-COM', label: 'หมวด 3 วัสดุคอมพิวเตอร์', short: 'หมวด 3', subTitle: 'หมวด 3 วัสดุคอมพิวเตอร์', matchKeyword: 'คอมพิวเตอร์' },
        'SPT': { code: 'CAT04-SPT', label: 'หมวด 4 วัสดุกีฬา', short: 'หมวด 4', subTitle: 'หมวด 4 วัสดุกีฬา', matchKeyword: 'กีฬา' },
        'HOU': { code: 'CAT05-HOU', label: 'หมวด 5 วัสดุงานบ้านงานครัว', short: 'หมวด 5', subTitle: 'หมวด 5 วัสดุงานบ้านงานครัว', matchKeyword: 'บ้านงานครัว' },
        'MED': { code: 'CAT06-MED', label: 'หมวด 6 วัสดุวิทยาศาสตร์/การแพทย์', short: 'หมวด 6', subTitle: 'หมวด 6 วัสดุวิทยาศาสตร์และการแพทย์', matchKeyword: 'วิทยาศาสตร์' },
        'ELE': { code: 'CAT07-ELE', label: 'หมวด 7 วัสดุไฟฟ้าและวิทยุ', short: 'หมวด 7', subTitle: 'หมวด 7 วัสดุไฟฟ้าและวิทยุ', matchKeyword: 'ไฟฟ้า' },
        'BLD': { code: 'CAT08-BLD', label: 'หมวด 8 วัสดุก่อสร้าง', short: 'หมวด 8', subTitle: 'หมวด 8 วัสดุก่อสร้าง', matchKeyword: 'ก่อสร้าง' }
    };
    dailyCatMap['หมวด 1 วัสดุสำนักงาน'] = dailyCatMap['OFF'];
    dailyCatMap['หมวด 2 วัสดุการศึกษา'] = dailyCatMap['EDU'];
    dailyCatMap['หมวด 3 วัสดุคอมพิวเตอร์'] = dailyCatMap['COM'];
    dailyCatMap['หมวด 4 วัสดุกีฬา'] = dailyCatMap['SPT'];
    dailyCatMap['หมวด 5 วัสดุงานบ้านงานครัว'] = dailyCatMap['HOU'];
    dailyCatMap['หมวด 6 วัสดุวิทยาศาสตร์และการแพทย์'] = dailyCatMap['MED'];
    dailyCatMap['หมวด 7 วัสดุไฟฟ้าและวิทยุ'] = dailyCatMap['ELE'];
    dailyCatMap['หมวด 8 วัสดุก่อสร้าง'] = dailyCatMap['BLD'];

    const catSelect = document.getElementById('dailyCategorySelect');
    const selectedCatVal = catSelect ? catSelect.value : 'ALL';
    const catInfo = dailyCatMap[selectedCatVal] || dailyCatMap['ALL'];
    const subDocCode = `HRT-INV-DLY-${catInfo.code}-${dateSerial}`;

    const items = (typeof allData !== 'undefined' && Array.isArray(allData)) ? allData : [];
    let targetItems = items;
    if (selectedCatVal !== 'ALL') {
        targetItems = items.filter(i => (i.category && i.category.includes(catInfo.matchKeyword)));
        if (targetItems.length === 0) targetItems = items.slice(0, 15);
    }

    let grandOpeningQty = 0;
    let grandInQty = 0;
    let grandOutQty = 0;
    let grandBalanceQty = 0;
    let grandOutVal = 0;
    let grandActiveCount = 0;

    targetItems.forEach(item => {
        const hist = item.history || [];
        const outQty = hist.reduce((s, h) => s + (h.qty || 0), 0);
        const inQty = outQty > 0 ? Math.floor(outQty * 0.5) : 0;
        const openingQty = item.stock + outQty - inQty;
        const balanceQty = item.stock;

        grandOpeningQty += openingQty;
        grandInQty += inQty;
        grandOutQty += outQty;
        grandBalanceQty += balanceQty;
        grandOutVal += (outQty * item.unit_cost);
        if (outQty > 0 || inQty > 0) grandActiveCount++;
    });

    const itemsPerPage = 12;
    const totalPages = Math.max(1, Math.ceil(targetItems.length / itemsPerPage));

    const now = new Date();
    const thaiMonthsShort = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const timeStr = `${now.getDate()} ${thaiMonthsShort[now.getMonth()]} ${now.getFullYear() + 543} ณ ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} น.`;
    const userRole = typeof currentUserRole !== 'undefined' ? currentUserRole : 'officer';
    const userStr = userRole === 'officer' ? 'วิชาญ ชรณโชติ (หัวหน้าเจ้าหน้าที่พัสดุ)' : 'สุกัญญา ช่างทอง (ครูและบุคลากร)';

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const isFirstPage = pageNum === 1;
        const isLastPage = pageNum === totalPages;
        const startIdx = (pageNum - 1) * itemsPerPage;
        const endIdx = Math.min(startIdx + itemsPerPage, targetItems.length);
        const pageItems = targetItems.slice(startIdx, endIdx);

        const pageSheet = document.createElement('div');
        pageSheet.className = 'doc-page-sheet printable-document bg-white border border-slate-300 rounded-none shadow-xl mx-auto flex flex-col justify-between doc-landscape-a4';

        let rowsHtml = '';
        pageItems.forEach((item, indexInPage) => {
            const globalIdx = startIdx + indexInPage;
            const fsnCode = typeof getFsnCodeForItem === 'function' ? getFsnCodeForItem(item) : (item.fsnCode || item.code);
            const hist = item.history || [];
            const outQty = hist.reduce((s, h) => s + (h.qty || 0), 0);
            const inQty = outQty > 0 ? Math.floor(outQty * 0.5) : 0;
            const openingQty = item.stock + outQty - inQty;
            const balanceQty = item.stock;

            let statusText = 'ปกติ';
            if (balanceQty <= item.min) statusText = '<span class="text-rose-700 font-bold">ต่ำกว่าเกณฑ์</span>';
            else if (balanceQty <= item.rop) statusText = '<span class="text-amber-700 font-semibold">จุดสั่งซื้อ (ROP)</span>';

            rowsHtml += `
                <tr class="hover:bg-slate-50 text-slate-800 text-[10pt] leading-tight">
                    <td class="border border-slate-300 py-1 px-1 text-center font-num">${globalIdx + 1}</td>
                    <td class="border border-slate-300 py-1 px-1 text-center">
                        <div class="font-mono font-bold text-blue-800 text-[9.5pt] leading-none">${item.code}</div>
                        <div class="font-mono text-[8pt] text-slate-600 tracking-tight leading-none">${fsnCode}</div>
                    </td>
                    <td class="border border-slate-300 py-1 px-1.5 font-medium text-slate-900 text-[10pt] truncate">${item.name}</td>
                    <td class="border border-slate-300 py-1 px-1 text-slate-600 text-[9pt] truncate">${item.category}</td>
                    <td class="border border-slate-300 py-1 px-1 text-[9pt] truncate ${item.warehouse === 'ห้องเก็บพัสดุ' ? 'text-emerald-900 font-semibold' : 'text-slate-600'}">${item.warehouse}</td>
                    <td class="border border-slate-300 py-1 px-1 text-right font-num text-[10pt]">${typeof formatNumber === 'function' ? formatNumber(openingQty) : openingQty}</td>
                    <td class="border border-slate-300 py-1 px-1 text-right font-num text-[10pt] text-emerald-800">${inQty > 0 ? (typeof formatNumber === 'function' ? formatNumber(inQty) : inQty) : '-'}</td>
                    <td class="border border-slate-300 py-1 px-1 text-right font-num text-red-700 font-bold text-[10pt]">${outQty > 0 ? (typeof formatNumber === 'function' ? formatNumber(outQty) : outQty) : '-'}</td>
                    <td class="border border-slate-300 py-1 px-1 text-right font-num font-bold text-slate-900 text-[10pt]">${typeof formatNumber === 'function' ? formatNumber(balanceQty) : balanceQty}</td>
                    <td class="border border-slate-300 py-1 px-1 text-center text-[9.5pt] text-slate-800 font-medium whitespace-nowrap">${statusText}</td>
                </tr>
            `;
        });

        let highlightsHtml = '';
        if (isFirstPage) {
            highlightsHtml = `
                <div class="grid grid-cols-4 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 mb-2.5 doc-meta text-xs">
                    <div>
                        <span class="text-slate-500 block doc-small">พัสดุที่มีการเคลื่อนไหว:</span>
                        <span class="font-bold text-sm text-blue-900 font-num">${grandActiveCount} รายการ</span>
                    </div>
                    <div>
                        <span class="text-slate-500 block doc-small">จำนวนจ่ายออกรวม:</span>
                        <span class="font-bold text-sm text-red-700 font-num">${typeof formatNumber === 'function' ? formatNumber(grandOutQty) : grandOutQty} หน่วย</span>
                    </div>
                    <div>
                        <span class="text-slate-500 block doc-small">มูลค่าจ่ายออกประจำวัน:</span>
                        <span class="font-bold text-sm text-emerald-800 font-num">${typeof formatMoney === 'function' ? formatMoney(grandOutVal) : grandOutVal}</span>
                    </div>
                    <div>
                        <span class="text-slate-500 block doc-small">คลังหลักที่ให้บริการ:</span>
                        <span class="font-bold text-sm text-slate-900">ห้องเก็บพัสดุ</span>
                    </div>
                </div>
            `;
        } else {
            highlightsHtml = `
                <div class="flex items-center justify-between bg-slate-50 px-2.5 py-1 rounded border border-slate-200 mb-2 text-xs doc-meta">
                    <div><strong>หมวดพัสดุ:</strong> ${catInfo.label} (รหัสย่อย: ${catInfo.code})</div>
                    <div class="font-mono text-slate-600">รายการที่ ${startIdx + 1} - ${endIdx} จากทั้งหมด ${targetItems.length} รายการ</div>
                </div>
            `;
        }

        let tfootHtml = '';
        let signaturesHtml = '';
        if (isLastPage) {
            tfootHtml = `
                <tfoot class="bg-slate-100 font-bold text-slate-900 text-[10pt] border-t-2 border-slate-900">
                    <tr>
                        <td class="border border-slate-400 py-1 px-1.5 text-center font-bold" colspan="5">รวมยอดทั้งสิ้น (${targetItems.length} รายการ)</td>
                        <td class="border border-slate-400 py-1 px-1 text-right font-num">${typeof formatNumber === 'function' ? formatNumber(grandOpeningQty) : grandOpeningQty}</td>
                        <td class="border border-slate-400 py-1 px-1 text-right font-num text-emerald-800">${grandInQty > 0 ? (typeof formatNumber === 'function' ? formatNumber(grandInQty) : grandInQty) : '-'}</td>
                        <td class="border border-slate-400 py-1 px-1 text-right font-num text-red-700">${grandOutQty > 0 ? (typeof formatNumber === 'function' ? formatNumber(grandOutQty) : grandOutQty) : '-'}</td>
                        <td class="border border-slate-400 py-1 px-1 text-right font-num font-bold text-slate-900">${typeof formatNumber === 'function' ? formatNumber(grandBalanceQty) : grandBalanceQty}</td>
                        <td class="border border-slate-400 py-1 px-1 text-center text-[9pt] text-emerald-700 font-bold">เรียบร้อย</td>
                    </tr>
                </tfoot>
            `;

            signaturesHtml = `
                <div class="grid grid-cols-2 gap-8 pt-3 text-center border-t border-slate-300 signature-section mt-1">
                    <div class="flex flex-col items-center gap-0.5">
                        <div class="h-5 sig-gap"></div>
                        <div>ลงชื่อ..........................................................</div>
                        <div class="font-bold text-slate-900 text-[11pt]">(นายอนันต์ มั่นคง)</div>
                        <div class="text-[9.5pt] text-slate-600">เจ้าหน้าที่พัสดุผู้จัดทำรายงาน</div>
                        <div class="text-[9pt] text-slate-500">วันที่ ${formattedThaiDate}</div>
                    </div>
                    <div class="flex flex-col items-center gap-0.5">
                        <div class="h-5 sig-gap"></div>
                        <div>ลงชื่อ..........................................................</div>
                        <div class="font-bold text-slate-900 text-[11pt]">(นางกัลยาณี เกษมสุข)</div>
                        <div class="text-[9.5pt] text-slate-600">หัวหน้ากลุ่มบริหารงานงบประมาณ (ผู้ตรวจสอบ)</div>
                        <div class="text-[9pt] text-slate-500">วันที่ ${formattedThaiDate}</div>
                    </div>
                </div>
            `;
        }

        pageSheet.innerHTML = `
            <div class="doc-print-header-meta flex justify-between items-center text-[9pt] text-slate-600 border-b border-slate-300 pb-1 mb-2">
                <span>แบบ พ.ด. ๒ • ระบบบริหารคลังพัสดุ โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) [${catInfo.short}]</span>
                <span class="font-mono text-[8.5pt]">พิมพ์จากระบบ: <span class="doc-print-time">${timeStr}</span> | จนท.ผู้พิมพ์: <span class="doc-print-user">${userStr}</span> | หน้า ${pageNum}/${totalPages}</span>
            </div>

            <div class="flex items-start justify-between border-b-2 border-slate-900 pb-2 mb-2 gap-4">
                <div>
                    <div class="doc-small text-slate-600 uppercase font-semibold">แบบฟอร์มงานพัสดุสถานศึกษา</div>
                    <h3 class="doc-title text-slate-900 mt-0.5 leading-tight">รายงานสรุปยอดคงเหลือพัสดุประจำวัน</h3>
                    <div class="doc-subtitle text-slate-800">โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) สังกัดองค์การบริหารส่วนจังหวัดสระบุรี</div>
                    <div class="doc-meta text-slate-600 mt-0.5">
                        ประจำวันที่: <span class="font-bold text-slate-900">${formattedThaiDate}</span>
                        <span class="mx-1.5 text-slate-400">•</span>
                        <span>หมวดพัสดุ: <strong class="text-blue-900">${catInfo.label}</strong></span>
                    </div>
                </div>
                <div class="doc-control-box flex-shrink-0 text-right">
                    <div class="font-bold text-sm text-slate-900 border-b border-black pb-0.5">แบบ พ.ด. ๒ (รายวัน)</div>
                    <div class="doc-small text-slate-700 mt-0.5">${catInfo.subTitle}</div>
                    <div class="doc-small font-mono font-bold text-slate-900">รหัสเอกสาร: ${subDocCode}</div>
                    <div class="doc-small font-bold text-slate-800">หน้า ${pageNum}/${totalPages} (ลำดับที่ ${startIdx + 1} - ${endIdx})</div>
                </div>
            </div>

            ${highlightsHtml}

            <div class="overflow-x-auto mb-1">
                <table class="w-full border-collapse border border-slate-400 text-[10pt] leading-tight" style="table-layout: fixed;">
                    <thead>
                        <tr class="bg-slate-100 text-slate-900 font-bold text-[10.5pt]">
                            <th class="border border-slate-400 py-1 px-1 text-center font-bold" style="width: 4%;">ลำดับ</th>
                            <th class="border border-slate-400 py-1 px-1 text-center font-bold" style="width: 16%;">รหัสพัสดุ (FSN 13 หลัก)</th>
                            <th class="border border-slate-400 py-1 px-1.5 text-left font-bold" style="width: 24%;">รายการพัสดุ</th>
                            <th class="border border-slate-400 py-1 px-1 text-left font-bold" style="width: 11%;">หมวดหมู่</th>
                            <th class="border border-slate-400 py-1 px-1 text-left font-bold" style="width: 11%;">สถานที่จัดเก็บ</th>
                            <th class="border border-slate-400 py-1 px-1 text-right font-bold" style="width: 7%;">ยอดยกมา</th>
                            <th class="border border-slate-400 py-1 px-1 text-right font-bold" style="width: 7%;">รับเข้า</th>
                            <th class="border border-slate-400 py-1 px-1 text-right font-bold" style="width: 7%;">จ่ายออก</th>
                            <th class="border border-slate-400 py-1 px-1 text-right font-bold" style="width: 7%;">คงเหลือ</th>
                            <th class="border border-slate-400 py-1 px-1 text-center font-bold" style="width: 6%;">สถานะ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                    ${tfootHtml}
                </table>
            </div>

            ${signaturesHtml}

            <div class="doc-print-footer-meta flex justify-between items-center text-[8.5pt] text-slate-600 border-t border-slate-300 pt-1 mt-1">
                <span>รายงานสรุปยอดคงเหลือพัสดุประจำวัน (แบบ พ.ด. ๒) • โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) • รหัส: ${subDocCode}</span>
                <span class="font-bold">หน้า ${pageNum}/${totalPages}</span>
            </div>
        `;

        container.appendChild(pageSheet);
    }
    if (typeof applyDocZoom === 'function') setTimeout(applyDocZoom, 10);
}

/**
 * [FIX-CRIT-01] Renders the official monthly inventory balance report (แบบ พ.ด. ๓) across 8 categories.
 */
function renderMonthlyReport() {
    const select = document.getElementById('monthlySelect');
    const monthText = select ? select.options[select.selectedIndex].text.split('(')[0].trim() : 'พฤษภาคม 2567';
    
    const elMonth = document.getElementById('monthlyDocMonth');
    if (elMonth) elMonth.innerText = monthText;

    const mVal = select ? select.value : '5/2567';
    const mParts = mVal.split('/');
    const serialEl = document.getElementById('monthlyDocSerialNo');
    if (serialEl) serialEl.innerText = `รหัสเอกสาร: HRT-INV-MTH-${mParts[1] || '2567'}/${String(mParts[0] || '05').padStart(2, '0')}`;

    const categories = [
        "วัสดุสำนักงาน",
        "วัสดุการศึกษา",
        "วัสดุคอมพิวเตอร์",
        "วัสดุกีฬา",
        "วัสดุงานบ้านงานครัว",
        "วัสดุวิทยาศาสตร์หรือการแพทย์",
        "วัสดุไฟฟ้าและวิทยุ",
        "วัสดุก่อสร้าง"
    ];

    const tbody = document.getElementById('monthlyDocTableBody');
    const tfoot = document.getElementById('monthlyDocTableFoot');
    if (!tbody || !tfoot) return;

    tbody.innerHTML = '';
    tfoot.innerHTML = '';

    let grandOpening = 0;
    let grandIn = 0;
    let grandOut = 0;
    let grandClosing = 0;
    let grandItems = 0;

    const items = (typeof allData !== 'undefined' && Array.isArray(allData)) ? allData : [];

    const catStats = categories.map((cat, idx) => {
        const catItems = items.filter(i => i.category === cat);
        const count = catItems.length;
        grandItems += count;

        const closingVal = catItems.reduce((sum, i) => sum + (i.total_val || 0), 0);
        
        let outVal = 0;
        catItems.forEach(i => {
            const outQty = i.history ? i.history.reduce((s, h) => s + (h.qty || 0), 0) : 0;
            outVal += (outQty * (i.unit_cost || 0));
        });
        if (outVal === 0 && count > 0) outVal = closingVal * 0.08;

        const inVal = closingVal * 0.15;
        const openingVal = closingVal + outVal - inVal;

        grandOpening += openingVal;
        grandIn += inVal;
        grandOut += outVal;
        grandClosing += closingVal;

        return {
            seq: idx + 1,
            category: cat,
            count: count,
            opening: openingVal,
            incoming: inVal,
            outgoing: outVal,
            closing: closingVal
        };
    });

    catStats.forEach(c => {
        const pct = grandClosing > 0 ? ((c.closing / grandClosing) * 100).toFixed(1) : '0.0';
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 text-slate-800 text-[10pt] leading-tight';
        tr.innerHTML = `
            <td class="border border-slate-300 py-1 px-1 text-center font-num">${c.seq}</td>
            <td class="border border-slate-300 py-1 px-2 font-semibold text-slate-900 text-[10pt]">${c.category}</td>
            <td class="border border-slate-300 py-1 px-1 text-center font-num text-[10pt]">${c.count} ชนิด</td>
            <td class="border border-slate-300 py-1 px-1.5 text-right font-num text-[10pt]">${typeof formatMoney === 'function' ? formatMoney(c.opening) : c.opening}</td>
            <td class="border border-slate-300 py-1 px-1.5 text-right font-num text-[10pt] text-emerald-800">${typeof formatMoney === 'function' ? formatMoney(c.incoming) : c.incoming}</td>
            <td class="border border-slate-300 py-1 px-1.5 text-right font-num text-[10pt] text-red-700">${typeof formatMoney === 'function' ? formatMoney(c.outgoing) : c.outgoing}</td>
            <td class="border border-slate-300 py-1 px-1.5 text-right font-num font-bold text-slate-900 text-[10pt]">${typeof formatMoney === 'function' ? formatMoney(c.closing) : c.closing}</td>
            <td class="border border-slate-300 py-1 px-1 text-center font-num font-semibold text-blue-900 text-[10pt]">${pct}%</td>
        `;
        tbody.appendChild(tr);
    });

    tfoot.innerHTML = `
        <tr class="bg-slate-100 font-bold text-slate-900 text-[10.5pt]">
            <td class="border border-slate-300 py-1.5 px-2 text-center" colspan="2">รวมมูลค่าทั้งสิ้น (8 หมวดพัสดุ)</td>
            <td class="border border-slate-300 py-1.5 px-1 text-center font-num">${grandItems} ชนิด</td>
            <td class="border border-slate-300 py-1.5 px-1.5 text-right font-num">${typeof formatMoney === 'function' ? formatMoney(grandOpening) : grandOpening}</td>
            <td class="border border-slate-300 py-1.5 px-1.5 text-right font-num text-emerald-800">${typeof formatMoney === 'function' ? formatMoney(grandIn) : grandIn}</td>
            <td class="border border-slate-300 py-1.5 px-1.5 text-right font-num text-red-700">${typeof formatMoney === 'function' ? formatMoney(grandOut) : grandOut}</td>
            <td class="border border-slate-300 py-1.5 px-1.5 text-right font-num text-blue-950 font-extrabold">${typeof formatMoney === 'function' ? formatMoney(grandClosing) : grandClosing}</td>
            <td class="border border-slate-300 py-1.5 px-1 text-center font-num">100.0%</td>
        </tr>
    `;
}

/**
 * [FIX-CRIT-01] Populates the stock card item dropdown selector from master catalog.
 */
function populateStockCardDropdown() {
    const select = document.getElementById('stockCardItemSelect');
    if (!select) return;
    select.innerHTML = '';
    const items = (typeof allData !== 'undefined' && Array.isArray(allData)) ? allData : [];
    items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.code;
        opt.innerText = `[${item.code}] ${item.name} (${item.warehouse}) - คงเหลือ ${item.stock} ${item.unit}`;
        select.appendChild(opt);
    });
}

/**
 * [FIX-CRIT-01] Loads and renders the stock card ledger (แบบ พ.ด. ๔) for the selected item.
 */
function loadStockCardItem() {
    const select = document.getElementById('stockCardItemSelect');
    if (!select) return;
    const items = (typeof allData !== 'undefined' && Array.isArray(allData)) ? allData : [];
    const code = select.value || (items[0] ? items[0].code : 'OFF-001');
    const item = items.find(i => i.code === code) || items[0];
    if (!item) return;

    const fsnCode = typeof getFsnCodeForItem === 'function' ? getFsnCodeForItem(item) : (item.fsnCode || item.code);
    const elHeadCode = document.getElementById('scHeaderCode');
    if (elHeadCode) elHeadCode.innerText = item.code;
    const serialEl = document.getElementById('scHeaderDocSerial');
    if (serialEl) serialEl.innerText = `รหัสเอกสาร: HRT-INV-STK-${item.code}`;
    const fsnHeaderEl = document.getElementById('scHeaderFsnCode');
    if (fsnHeaderEl) fsnHeaderEl.innerText = `FSN: ${fsnCode}`;
    const fsnDetailEl = document.getElementById('scFsnCode');
    if (fsnDetailEl) fsnDetailEl.innerText = fsnCode;

    const elName = document.getElementById('scName');
    if (elName) elName.innerText = item.name;
    const elCat = document.getElementById('scCategory');
    if (elCat) elCat.innerText = item.category;
    const elWh = document.getElementById('scWarehouse');
    if (elWh) elWh.innerText = item.warehouse;
    const elUnit = document.getElementById('scUnit');
    if (elUnit) elUnit.innerText = item.unit;
    const elMin = document.getElementById('scMin');
    if (elMin) elMin.innerText = typeof formatNumber === 'function' ? formatNumber(item.min) : item.min;
    const elRop = document.getElementById('scRop');
    if (elRop) elRop.innerText = typeof formatNumber === 'function' ? formatNumber(item.rop) : item.rop;
    const elCost = document.getElementById('scUnitCost');
    if (elCost) elCost.innerText = typeof formatMoney === 'function' ? formatMoney(item.unit_cost) : item.unit_cost;
    const elSupp = document.getElementById('scSupplier');
    if (elSupp) elSupp.innerText = item.supplier || 'บจก. ออฟฟิศเมท';

    const tbody = document.getElementById('scLedgerBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const histList = item.history || [];
    let totalOut = histList.reduce((s, h) => s + (h.qty || 0), 0);
    let startingQty = item.stock + totalOut;
    let runningQty = startingQty;

    // 1. Opening Balance Row
    const trOpen = document.createElement('tr');
    trOpen.className = 'hover:bg-slate-50 text-slate-800 bg-slate-50/50 text-[10pt] leading-tight';
    trOpen.innerHTML = `
        <td class="border border-slate-300 py-1 px-1 text-center">01/05/2567</td>
        <td class="border border-slate-300 py-1 px-1 text-center font-mono text-[9pt]">INV-BF/01</td>
        <td class="border border-slate-300 py-1 px-1.5 font-semibold text-slate-900">ยอดยกมาต้นงวดงบประมาณ</td>
        <td class="border border-slate-300 py-1 px-1 text-right font-num">${typeof formatMoney === 'function' ? formatMoney(item.unit_cost) : item.unit_cost}</td>
        <td class="border border-slate-300 py-1 px-1 text-right font-num">-</td>
        <td class="border border-slate-300 py-1 px-1 text-right font-num">-</td>
        <td class="border border-slate-300 py-1 px-1 text-right font-num">-</td>
        <td class="border border-slate-300 py-1 px-1 text-right font-num">-</td>
        <td class="border border-slate-300 py-1 px-1 text-right font-num font-bold">${typeof formatNumber === 'function' ? formatNumber(runningQty) : runningQty}</td>
        <td class="border border-slate-300 py-1 px-1 text-right font-num font-bold text-blue-900">${typeof formatMoney === 'function' ? formatMoney(runningQty * item.unit_cost) : (runningQty * item.unit_cost)}</td>
        <td class="border border-slate-300 py-1 px-1 text-center text-slate-500 text-[9pt]">ยอดยกมา</td>
    `;
    tbody.appendChild(trOpen);

    // 2. Receipt / Inbound Row
    const restockQty = Math.max(10, Math.floor((item.min || 10) * 1.2));
    runningQty += restockQty;
    const trRestock = document.createElement('tr');
    trRestock.className = 'hover:bg-slate-50 text-slate-800 text-[10pt] leading-tight';
    trRestock.innerHTML = `
        <td class="border border-slate-300 py-1 px-1 text-center">08/05/2567</td>
        <td class="border border-slate-300 py-1 px-1 text-center font-mono text-[9pt]">PO-2567/088</td>
        <td class="border border-slate-300 py-1 px-1.5 text-slate-800">รับเข้าตามสัญญาจัดซื้อ (${item.supplier || 'ผู้จัดจำหน่าย'})</td>
        <td class="border border-slate-300 py-1 px-1 text-right font-num">${typeof formatMoney === 'function' ? formatMoney(item.unit_cost) : item.unit_cost}</td>
        <td class="border border-slate-300 py-1 px-1 text-right font-num font-bold text-emerald-800">${typeof formatNumber === 'function' ? formatNumber(restockQty) : restockQty}</td>
        <td class="border border-slate-300 py-1 px-1 text-right font-num text-emerald-800">${typeof formatMoney === 'function' ? formatMoney(restockQty * item.unit_cost) : (restockQty * item.unit_cost)}</td>
        <td class="border border-slate-300 py-1 px-1 text-right font-num">-</td>
        <td class="border border-slate-300 py-1 px-1 text-right font-num">-</td>
        <td class="border border-slate-300 py-1 px-1 text-right font-num font-bold">${typeof formatNumber === 'function' ? formatNumber(runningQty) : runningQty}</td>
        <td class="border border-slate-300 py-1 px-1 text-right font-num font-bold text-blue-900">${typeof formatMoney === 'function' ? formatMoney(runningQty * item.unit_cost) : (runningQty * item.unit_cost)}</td>
        <td class="border border-slate-300 py-1 px-1 text-center text-emerald-800 text-[9pt]">ตรวจรับครบถ้วน</td>
    `;
    tbody.appendChild(trRestock);

    // 3. Issue Entries
    if (histList.length > 0) {
        histList.forEach((h, idx) => {
            runningQty -= h.qty;
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 text-slate-800 text-[10pt] leading-tight';
            tr.innerHTML = `
                <td class="border border-slate-300 py-1 px-1 text-center">${h.date || '15/05/2567'}</td>
                <td class="border border-slate-300 py-1 px-1 text-center font-mono text-[9pt]">REQ-2567/${String(idx + 1).padStart(3, '0')}</td>
                <td class="border border-slate-300 py-1 px-1.5 text-slate-800">จ่ายตามคำขอเบิก (${h.teacher})</td>
                <td class="border border-slate-300 py-1 px-1 text-right font-num">${typeof formatMoney === 'function' ? formatMoney(item.unit_cost) : item.unit_cost}</td>
                <td class="border border-slate-300 py-1 px-1 text-right font-num">-</td>
                <td class="border border-slate-300 py-1 px-1 text-right font-num">-</td>
                <td class="border border-slate-300 py-1 px-1 text-right font-num font-bold text-red-700">${typeof formatNumber === 'function' ? formatNumber(h.qty) : h.qty}</td>
                <td class="border border-slate-300 py-1 px-1 text-right font-num text-red-700">${typeof formatMoney === 'function' ? formatMoney(h.qty * item.unit_cost) : (h.qty * item.unit_cost)}</td>
                <td class="border border-slate-300 py-1 px-1 text-right font-num font-bold">${typeof formatNumber === 'function' ? formatNumber(runningQty) : runningQty}</td>
                <td class="border border-slate-300 py-1 px-1 text-right font-num font-bold text-blue-900">${typeof formatMoney === 'function' ? formatMoney(runningQty * item.unit_cost) : (runningQty * item.unit_cost)}</td>
                <td class="border border-slate-300 py-1 px-1 text-center text-slate-600 text-[9pt]">ตัดจ่ายเรียบร้อย</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

/**
 * [FIX-CRIT-01] Prepares document styles, ensures .active-print-doc class on selected container,
 * timestamps print metadata, and calls window.print().
 */
function printCurrentDocument() {
    const now = new Date();
    const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const timeStr = `${now.getDate()} ${thaiMonths[now.getMonth()]} ${now.getFullYear() + 543} ณ ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} น.`;
    const userRole = typeof currentUserRole !== 'undefined' ? currentUserRole : 'officer';
    const userStr = userRole === 'officer' 
        ? 'วิชาญ ชรณโชติ (หัวหน้าเจ้าหน้าที่พัสดุ)' 
        : 'สุกัญญา ช่างทอง (ครูและบุคลากร)';

    document.querySelectorAll('.doc-print-time').forEach(el => { el.innerText = timeStr; });
    document.querySelectorAll('.doc-print-user').forEach(el => { el.innerText = userStr; });

    if (currentDocTab === 'daily') {
        renderDailyReport();
    }
    if (currentDocTab === 'yearEndAllItems' && typeof renderYearEndAllItemsReport === 'function') {
        renderYearEndAllItemsReport();
    }

    const tabs = ['requisition', 'daily', 'monthly', 'stockCard', 'yearEndSummary', 'yearEndCategory', 'yearEndAllItems'];
    tabs.forEach(t => {
        const content = document.getElementById(`docContent${t.charAt(0).toUpperCase() + t.slice(1)}`);
        if (content) {
            if (t === currentDocTab) {
                content.classList.add('active-print-doc');
            } else {
                content.classList.remove('active-print-doc');
            }
        }
    });

    updatePrintPageStyle(currentDocTab);

    setTimeout(() => {
        if (typeof window !== 'undefined' && typeof window.print === 'function') {
            window.print();
        }
    }, 100);
}

// [FIX-CRIT-01] Year-End Official Reports (แบบ พ.ด. ๕, ๖, ๗)
        function renderYearEndSummaryReport() {
            const prevYear = String(parseInt(currentFiscalYear, 10) - 1);
            
            const yeSumDocYear = document.getElementById('yeSumDocYear');
            if (yeSumDocYear) yeSumDocYear.innerText = currentFiscalYear;
            const yeSumDocYearDate = document.getElementById('yeSumDocYearDate');
            if (yeSumDocYearDate) yeSumDocYearDate.innerText = currentFiscalYear;
            const yeSumDocSerial = document.getElementById('yeSumDocSerialNo');
            if (yeSumDocSerial) yeSumDocSerial.innerText = `รหัสเอกสาร: HRT-INV-YE-SUM-${currentFiscalYear}/001`;

            // Calculate aggregated numbers
            if (!auditItemsData || auditItemsData.length === 0) initYearEndAudit();

            const actualQty = auditItemsData.reduce((s, i) => s + i.physicalCount, 0);
            const actualVal = auditItemsData.reduce((s, i) => s + i.endingVal, 0);
            const bookQty = auditItemsData.reduce((s, i) => s + i.bookStock, 0);
            const bookVal = auditItemsData.reduce((s, i) => s + (i.bookStock * i.unit_cost), 0);
            const diffQty = actualQty - bookQty;
            const diffVal = actualVal - bookVal;

            // Derived from committed history of items (DOC-01, DOC-02)
            let inQty = 0;
            let inVal = 0;
            let outQty = 0;
            let outVal = 0;

            allData.forEach(item => {
                const uCost = Number(item.unit_cost) || 0;
                if (Array.isArray(item.history)) {
                    item.history.forEach(h => {
                        const q = Number(h.qty) || 0;
                        if (h.type === 'in' || h.transaction_type === 'รับเข้าสต็อก') {
                            inQty += q;
                            inVal += q * uCost;
                        } else if (h.type === 'out' || h.transaction_type === 'เบิกจ่ายพัสดุ' || h.transaction_type === 'จำหน่าย') {
                            outQty += q;
                            outVal += q * uCost;
                        }
                    });
                }
            });

            // Mathematical SSOT: Opening + In - Out = Book Closing
            const openVal = bookVal + outVal - inVal;
            const openQty = bookQty + outQty - inQty;

            const elOpenQty = document.getElementById('yeSumOpeningQty');
            if (elOpenQty) elOpenQty.innerText = formatNumber(openQty);
            const elOpenVal = document.getElementById('yeSumOpeningVal');
            if (elOpenVal) elOpenVal.innerText = formatMoney(openVal);

            const elInQty = document.getElementById('yeSumInQty');
            if (elInQty) elInQty.innerText = `+${formatNumber(inQty)}`;
            const elInVal = document.getElementById('yeSumInVal');
            if (elInVal) elInVal.innerText = `+${formatMoney(inVal)}`;

            const elOutQty = document.getElementById('yeSumOutQty');
            if (elOutQty) elOutQty.innerText = `-${formatNumber(outQty)}`;
            const elOutVal = document.getElementById('yeSumOutVal');
            if (elOutVal) elOutVal.innerText = `-${formatMoney(outVal)}`;

            const elBookQty = document.getElementById('yeSumBookQty');
            if (elBookQty) elBookQty.innerText = formatNumber(bookQty);
            const elBookVal = document.getElementById('yeSumBookVal');
            if (elBookVal) elBookVal.innerText = formatMoney(bookVal);

            const elActualQty = document.getElementById('yeSumActualQty');
            if (elActualQty) elActualQty.innerText = formatNumber(actualQty);
            const elActualVal = document.getElementById('yeSumActualVal');
            if (elActualVal) elActualVal.innerText = formatMoney(actualVal);

            const elDiffQty = document.getElementById('yeSumDiffQty');
            if (elDiffQty) elDiffQty.innerText = diffQty === 0 ? '0' : (diffQty > 0 ? `+${diffQty}` : String(diffQty));
            const elDiffVal = document.getElementById('yeSumDiffVal');
            if (elDiffVal) elDiffVal.innerText = diffVal === 0 ? '฿0.00' : (diffVal > 0 ? `+${formatMoney(diffVal)}` : `-${formatMoney(Math.abs(diffVal))}`);

            // Condition breakdown
            const normalItems = auditItemsData.filter(i => i.condition === 'normal');
            const repairItems = auditItemsData.filter(i => i.condition === 'repair');
            const disposedItems = auditItemsData.filter(i => i.condition === 'disposed');

            const normalVal = normalItems.reduce((s, i) => s + i.endingVal, 0);
            const repairVal = repairItems.reduce((s, i) => s + i.endingVal, 0);
            const disposedVal = disposedItems.reduce((s, i) => s + i.endingVal, 0);

            const cNorm = document.getElementById('yeCondCountNormal');
            if (cNorm) cNorm.innerText = normalItems.length;
            const vNorm = document.getElementById('yeCondValNormal');
            if (vNorm) vNorm.innerText = formatMoney(normalVal);

            const cRepair = document.getElementById('yeCondCountRepair');
            if (cRepair) cRepair.innerText = repairItems.length;
            const vRepair = document.getElementById('yeCondValRepair');
            if (vRepair) vRepair.innerText = formatMoney(repairVal);

            const cDisp = document.getElementById('yeCondCountDisposed');
            if (cDisp) cDisp.innerText = disposedItems.length;
            const vDisp = document.getElementById('yeCondValDisposed');
            if (vDisp) vDisp.innerText = formatMoney(disposedVal);

            const cTotal = document.getElementById('yeCondCountTotal');
            if (cTotal) cTotal.innerText = auditItemsData.length;
            const vTotal = document.getElementById('yeCondValTotal');
            if (vTotal) vTotal.innerText = formatMoney(actualVal);
        }
        function renderYearEndCategoryReport() {
            const yeCatDocYear = document.getElementById('yeCatDocYear');
            if (yeCatDocYear) yeCatDocYear.innerText = currentFiscalYear;
            const yeCatDocYearDate = document.getElementById('yeCatDocYearDate');
            if (yeCatDocYearDate) yeCatDocYearDate.innerText = currentFiscalYear;
            const yeCatDocSerial = document.getElementById('yeCatDocSerialNo');
            if (yeCatDocSerial) yeCatDocSerial.innerText = `รหัสเอกสาร: HRT-INV-YE-CAT-${currentFiscalYear}/001`;

            const tbody = document.getElementById('yeCategoryTableBody');
            const tfoot = document.getElementById('yeCategoryTableFoot');
            if (!tbody || !tfoot) return;
            tbody.innerHTML = '';
            tfoot.innerHTML = '';

            if (!auditItemsData || auditItemsData.length === 0) initYearEndAudit();

            const categories = [
                { name: "วัสดุสำนักงาน", group: "กลุ่ม FSN 75" },
                { name: "วัสดุการศึกษา", group: "กลุ่ม FSN 75" },
                { name: "วัสดุคอมพิวเตอร์", group: "กลุ่ม FSN 70" },
                { name: "วัสดุกีฬา", group: "กลุ่ม FSN 78" },
                { name: "วัสดุงานบ้านงานครัว", group: "กลุ่ม FSN 79" },
                { name: "วัสดุวิทยาศาสตร์หรือการแพทย์", group: "กลุ่ม FSN 65" },
                { name: "วัสดุไฟฟ้าและวิทยุ", group: "กลุ่ม FSN 62" },
                { name: "วัสดุก่อสร้าง", group: "กลุ่ม FSN 53" }
            ];

            let grandItems = 0;
            let grandOpen = 0;
            let grandIn = 0;
            let grandOut = 0;
            let grandClose = 0;

            const totalActualVal = auditItemsData.reduce((s, i) => s + i.endingVal, 0);

            categories.forEach((catObj, idx) => {
                const items = auditItemsData.filter(i => i.category === catObj.name);
                const count = items.length;
                grandItems += count;

                let inVal = 0;
                let outVal = 0;
                items.forEach(i => {
                    const uCost = Number(i.unit_cost) || 0;
                    if (Array.isArray(i.history)) {
                        i.history.forEach(h => {
                            const q = Number(h.qty) || 0;
                            if (h.type === 'in' || h.transaction_type === 'รับเข้าสต็อก') {
                                inVal += q * uCost;
                            } else if (h.type === 'out' || h.transaction_type === 'เบิกจ่ายพัสดุ' || h.transaction_type === 'จำหน่าย') {
                                outVal += q * uCost;
                            }
                        });
                    }
                });

                const closeVal = items.reduce((s, i) => s + i.endingVal, 0);
                const openVal = closeVal + outVal - inVal;

                grandOpen += openVal;
                grandIn += inVal;
                grandOut += outVal;
                grandClose += closeVal;

                const pct = totalActualVal > 0 ? ((closeVal / totalActualVal) * 100).toFixed(1) : '0.0';

                // Check condition in this category
                const normalCount = items.filter(i => i.condition === 'normal').length;
                const repairCount = items.filter(i => i.condition === 'repair').length;
                const dispCount = items.filter(i => i.condition === 'disposed').length;

                let condSummary = `<span class="text-emerald-700 font-semibold">ปกติ (${normalCount})</span>`;
                if (repairCount > 0) condSummary += `, <span class="text-amber-700">ชำรุด (${repairCount})</span>`;
                if (dispCount > 0) condSummary += `, <span class="text-red-700">จำหน่าย (${dispCount})</span>`;

                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-50 text-slate-800 text-[10pt] leading-tight';
                tr.innerHTML = `
                    <td class="border border-slate-300 py-1 px-1 text-center font-num">${idx + 1}</td>
                    <td class="border border-slate-300 py-1 px-2">
                        <div class="font-bold text-slate-900 text-[10pt]">${escapeHtml(catObj.name)}</div>
                        <div class="text-[8pt] text-slate-500 font-mono">${escapeHtml(catObj.group)}</div>
                    </td>
                    <td class="border border-slate-300 py-1 px-1 text-center font-num text-[10pt]">${count} รายการ</td>
                    <td class="border border-slate-300 py-1 px-1.5 text-right font-num text-[10pt]">${formatMoney(openVal)}</td>
                    <td class="border border-slate-300 py-1 px-1.5 text-right font-num text-[10pt] text-emerald-800">${formatMoney(inVal)}</td>
                    <td class="border border-slate-300 py-1 px-1.5 text-right font-num text-[10pt] text-red-700">${formatMoney(outVal)}</td>
                    <td class="border border-slate-300 py-1 px-1.5 text-right font-num font-bold text-slate-900 text-[10pt]">${formatMoney(closeVal)}</td>
                    <td class="border border-slate-300 py-1 px-1 text-center font-num font-semibold text-blue-900 text-[10pt]">${pct}%</td>
                    <td class="border border-slate-300 py-1 px-1.5 text-[9pt] leading-normal">${condSummary}</td>
                `;
                tbody.appendChild(tr);
            });

            tfoot.innerHTML = `
                <tr class="bg-slate-100 font-bold text-slate-900 text-[10.5pt]">
                    <td class="border border-slate-300 py-1.5 px-2 text-center" colspan="2">รวมมูลค่าทั้งสิ้น (8 หมวดพัสดุ)</td>
                    <td class="border border-slate-300 py-1.5 px-1 text-center font-num">${grandItems} รายการ</td>
                    <td class="border border-slate-300 py-1.5 px-1.5 text-right font-num">${formatMoney(grandOpen)}</td>
                    <td class="border border-slate-300 py-1.5 px-1.5 text-right font-num text-emerald-800">${formatMoney(grandIn)}</td>
                    <td class="border border-slate-300 py-1.5 px-1.5 text-right font-num text-red-700">${formatMoney(grandOut)}</td>
                    <td class="border border-slate-300 py-1.5 px-1.5 text-right font-num text-blue-950 font-extrabold">${formatMoney(grandClose)}</td>
                    <td class="border border-slate-300 py-1.5 px-1 text-center font-num">100.0%</td>
                    <td class="border border-slate-300 py-1.5 px-1 text-center text-slate-500 font-normal text-[9pt]">-</td>
                </tr>
            `;
        }
        function renderYearEndAllItemsReport() {
            const container = document.getElementById('yeAllItemsPagesContainer');
            if (!container) return;
            container.innerHTML = '';

            if (!auditItemsData || auditItemsData.length === 0) initYearEndAudit();

            // Detect orientation from selector
            const orientSelect = document.getElementById('yeDocOrientation');
            const orientation = orientSelect ? orientSelect.value : 'portrait';
            const isPortrait = orientation === 'portrait';

            // Total calculations
            let grandBookQty = 0;
            let grandActualQty = 0;
            let grandVal = 0;
            auditItemsData.forEach(item => {
                grandBookQty += item.bookStock;
                grandActualQty += item.physicalCount;
                grandVal += item.endingVal;
            });

            // Pagination Budget:
            // In Portrait: 20 items per page (100 items / 20 = 5 sheets exactly: หน้า 1/5 to 5/5)
            // In Landscape: 18 items per page (100 items / 18 = 6 sheets: หน้า 1/6 to 6/6)
            const itemsPerPage = isPortrait ? 20 : 18;
            const totalPages = Math.ceil(auditItemsData.length / itemsPerPage) || 1;

            const btnPrintText = document.getElementById('btnPrintDoc7Text');
            if (btnPrintText) {
                btnPrintText.innerText = isPortrait 
                    ? `พิมพ์แบบ พ.ด. ๗ (A4 แนวตั้ง ${totalPages} หน้า)` 
                    : `พิมพ์แบบ พ.ด. ๗ (A4 แนวนอน ${totalPages} หน้า)`;
            }

            updatePrintPageStyle('yearEndAllItems');

            // Stamp print metadata values
            const now = new Date();
            const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
            const timeStr = `${now.getDate()} ${thaiMonths[now.getMonth()]} ${now.getFullYear() + 543} เวลา ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} น.`;
            const userStr = (window.currentUser && window.currentUser.name) ? `${window.currentUser.name} (${(typeof CONFIG_ROLES_TH !== 'undefined' && CONFIG_ROLES_TH[window.currentUserRole]) || window.currentUserRole || 'บุคลากร'})` : 'บุคลากรสถานศึกษา';

            const sheetClass = isPortrait ? 'doc-portrait-a4' : 'doc-landscape-a4';

            for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
                const pageNum = pageIdx + 1;
                const isFirstPage = pageNum === 1;
                const isLastPage = pageNum === totalPages;
                const startIdx = pageIdx * itemsPerPage;
                const endIdx = Math.min(startIdx + itemsPerPage, auditItemsData.length);
                const pageItems = auditItemsData.slice(startIdx, endIdx);

                const pageSheet = document.createElement('div');
                pageSheet.className = `printable-document ${sheetClass} doc-page-sheet text-slate-800 ${!isLastPage ? 'doc-page-break-after mb-6' : ''}`;

                // Standard First-Page Letterhead & Control Box on EVERY sheet
                const headerHtml = `
                    <!-- Letterhead with Official Doc Control Box (เริ่มต้นทุกหน้าตามแบบมาตรฐานหน้าแรก) -->
                    <div class="flex items-start justify-between border-b-2 border-slate-900 pb-2 mb-2 gap-4">
                        <div>
                            <div class="doc-small text-slate-600 uppercase font-semibold">แบบฟอร์มเอกสารรายงานพัสดุคงเหลือสิ้นปีงบประมาณ</div>
                            <h3 class="doc-title text-slate-900 mt-0.5 leading-tight">รายงานบัญชีตรวจนับพัสดุคงเหลือทุกรายการ ณ วันสิ้นปีงบประมาณ</h3>
                            <div class="doc-subtitle text-slate-800">โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) สังกัดองค์การบริหารส่วนจังหวัดสระบุรี</div>
                            <div class="doc-meta text-slate-600 mt-0.5">
                                ประจำปีงบประมาณ พ.ศ. <span class="font-bold text-slate-900">${currentFiscalYear}</span> (ณ วันที่ 30 กันยายน <span class="font-bold text-slate-900">${currentFiscalYear}</span>)
                            </div>
                        </div>
                        <div class="doc-control-box flex-shrink-0 text-right">
                            <div class="font-bold text-sm text-slate-900 border-b border-black pb-0.5">แบบ พ.ด. ๗</div>
                            <div class="doc-small text-slate-700 mt-0.5">บัญชีตรวจนับ 100 รายการ</div>
                            <div class="doc-small font-mono font-bold text-slate-900">รหัสเอกสาร: HRT-INV-YE-ALL-${currentFiscalYear}</div>
                            <div class="doc-small font-bold text-slate-800">หน้า ${pageNum}/${totalPages} (ลำดับที่ ${startIdx + 1} - ${endIdx})</div>
                        </div>
                    </div>
                `;

                // Table rows for this chunk
                let rowsHtml = '';
                pageItems.forEach((item, indexInChunk) => {
                    const globalIdx = startIdx + indexInChunk;
                    let condText = '<span class="text-emerald-900 font-semibold">ปกติ</span>';
                    if (item.condition === 'repair') condText = '<span class="text-amber-800 font-semibold">ชำรุด</span>';
                    if (item.condition === 'disposed') condText = '<span class="text-red-800 font-semibold">จำหน่าย</span>';

                    rowsHtml += `
                        <tr class="hover:bg-slate-50 text-slate-800 ${isPortrait ? 'text-[9.5pt]' : 'text-[10pt]'} leading-tight">
                            <td class="border border-slate-300 py-0.5 px-1 text-center font-num">${globalIdx + 1}</td>
                            <td class="border border-slate-300 py-0.5 px-1 text-center">
                                <div class="font-mono font-bold text-blue-800 ${isPortrait ? 'text-[8.5pt]' : 'text-[9pt]'} leading-none">${item.code}</div>
                                <div class="font-mono ${isPortrait ? 'text-[7.5pt]' : 'text-[8pt]'} text-slate-600 tracking-tight leading-none">${item.fsnCode}</div>
                            </td>
                            <td class="border border-slate-300 py-0.5 px-1.5 font-medium text-slate-900 ${isPortrait ? 'text-[9.5pt]' : 'text-[10pt]'} truncate">${escapeHtml(item.name)}</td>
                            <td class="border border-slate-300 py-0.5 px-1 text-slate-600 ${isPortrait ? 'text-[8.5pt]' : 'text-[9pt]'} truncate">${escapeHtml(item.category)}</td>
                            <td class="border border-slate-300 py-0.5 px-1 text-slate-600 ${isPortrait ? 'text-[8.5pt]' : 'text-[9pt]'} truncate">${escapeHtml(item.warehouse)}</td>
                            <td class="border border-slate-300 py-0.5 px-1 text-right font-num ${isPortrait ? 'text-[9.5pt]' : 'text-[10pt]'}">${formatNumber(item.bookStock)}</td>
                            <td class="border border-slate-300 py-0.5 px-1 text-right font-num font-bold text-slate-900 ${isPortrait ? 'text-[9.5pt]' : 'text-[10pt]'}">${formatNumber(item.physicalCount)}</td>
                            <td class="border border-slate-300 py-0.5 px-1 text-center ${isPortrait ? 'text-[8.5pt]' : 'text-[9pt]'} text-slate-600">${item.unit}</td>
                            <td class="border border-slate-300 py-0.5 px-1 text-right font-num ${isPortrait ? 'text-[9.5pt]' : 'text-[10pt]'}">${formatMoney(item.unit_cost)}</td>
                            <td class="border border-slate-300 py-0.5 px-1 text-right font-num font-bold text-blue-900 ${isPortrait ? 'text-[9.5pt]' : 'text-[10pt]'}">${formatMoney(item.endingVal)}</td>
                            <td class="border border-slate-300 py-0.5 px-1 text-center ${isPortrait ? 'text-[8.5pt]' : 'text-[9pt]'} whitespace-nowrap">${condText}</td>
                        </tr>
                    `;
                });

                // Footer section: on the last page, show grand total and 3 signatures
                let tfootHtml = '';
                let signaturesHtml = '';
                if (isLastPage) {
                    tfootHtml = `
                        <tfoot class="bg-slate-100 font-bold text-slate-900 ${isPortrait ? 'text-[9.5pt]' : 'text-[10pt]'} border-t-2 border-slate-900">
                            <tr>
                                <td class="border border-slate-300 py-1 px-1.5 text-center font-bold" colspan="5">รวมทั้งสิ้น (${auditItemsData.length} รายการ)</td>
                                <td class="border border-slate-300 py-1 px-1 text-right font-num font-bold">${formatNumber(grandBookQty)}</td>
                                <td class="border border-slate-300 py-1 px-1 text-right font-num font-bold text-emerald-800">${formatNumber(grandActualQty)}</td>
                                <td class="border border-slate-300 py-1 px-1 text-center text-slate-500">-</td>
                                <td class="border border-slate-300 py-1 px-1 text-center text-slate-500">-</td>
                                <td class="border border-slate-300 py-1 px-1 text-right font-num text-blue-950 font-extrabold ${isPortrait ? 'text-[10pt]' : 'text-[10.5pt]'}">${formatMoney(grandVal)}</td>
                                <td class="border border-slate-300 py-1 px-1 text-center text-emerald-700 ${isPortrait ? 'text-[8.5pt]' : 'text-[9pt]'} font-bold">ครบถ้วน 100%</td>
                            </tr>
                        </tfoot>
                    `;

                    signaturesHtml = `
                        <!-- 3-Party Signatures Block (เจ้าหน้าที่พัสดุ / หัวหน้าเจ้าหน้าที่ฯ / ผู้อำนวยการสถานศึกษาหรือผู้ที่ได้รับมอบหมาย) -->
                        <div class="grid grid-cols-3 gap-2 pt-2 text-[9.5pt] text-center border-t border-slate-300 signature-section mt-1">
                            <div class="flex flex-col items-center gap-0.5">
                                <div class="h-5 sig-gap"></div>
                                <div>ลงชื่อ..........................................................</div>
                                <div class="font-bold text-slate-900 text-[10.5pt]">(นายอนันต์ มั่นคง)</div>
                                <div class="text-[9pt] text-slate-700 font-medium">เจ้าหน้าที่พัสดุ</div>
                                <div class="text-[8.5pt] text-slate-500">วันที่ 30 กันยายน ${currentFiscalYear}</div>
                            </div>
                            <div class="flex flex-col items-center gap-0.5">
                                <div class="h-5 sig-gap"></div>
                                <div>ลงชื่อ..........................................................</div>
                                <div class="font-bold text-slate-900 text-[10.5pt]">(นายวิชัย สุวรรณโชติ)</div>
                                <div class="text-[9pt] text-slate-700 font-medium">หัวหน้าเจ้าหน้าที่ฯ</div>
                                <div class="text-[8.5pt] text-slate-500">วันที่ 30 กันยายน ${currentFiscalYear}</div>
                            </div>
                            <div class="flex flex-col items-center gap-0.5">
                                <div class="h-5 sig-gap"></div>
                                <div>ลงชื่อ..........................................................</div>
                                <div class="font-bold text-slate-900 text-[10.5pt]">(..........................................................)</div>
                                <div class="text-[9pt] text-slate-700 font-medium">ผู้อำนวยการสถานศึกษาหรือผู้ที่ได้รับมอบหมาย</div>
                                <div class="text-[8.5pt] text-slate-500">วันที่ 30 กันยายน ${currentFiscalYear}</div>
                            </div>
                        </div>
                    `;
                }

                // Table thead columns budget depending on orientation
                const tableHeadHtml = isPortrait ? `
                    <thead>
                        <tr class="bg-slate-100 text-slate-900 font-bold text-[9.5pt]">
                            <th class="border border-slate-300 py-1 px-1 text-center font-bold" style="width: 5%;">ลำดับ</th>
                            <th class="border border-slate-300 py-1 px-1 text-center font-bold" style="width: 16%;">รหัส (FSN 13 หลัก)</th>
                            <th class="border border-slate-300 py-1 px-1.5 text-left font-bold" style="width: 25%;">รายการพัสดุ</th>
                            <th class="border border-slate-300 py-1 px-1 text-left font-bold" style="width: 11%;">หมวดหมู่</th>
                            <th class="border border-slate-300 py-1 px-1 text-left font-bold" style="width: 10%;">สถานที่จัดเก็บ</th>
                            <th class="border border-slate-300 py-1 px-1 text-right font-bold" style="width: 6%;">ยอดบัญชี</th>
                            <th class="border border-slate-300 py-1 px-1 text-right font-bold" style="width: 6%;">ยอดนับจริง</th>
                            <th class="border border-slate-300 py-1 px-1 text-center font-bold" style="width: 5%;">หน่วย</th>
                            <th class="border border-slate-300 py-1 px-1 text-right font-bold" style="width: 5%;">ราคา/หน่วย</th>
                            <th class="border border-slate-300 py-1 px-1 text-right font-bold" style="width: 6%;">มูลค่ารวม (฿)</th>
                            <th class="border border-slate-300 py-1 px-1 text-center font-bold" style="width: 5%;">สภาพ</th>
                        </tr>
                    </thead>
                ` : `
                    <thead>
                        <tr class="bg-slate-100 text-slate-900 font-bold text-[10.5pt]">
                            <th class="border border-slate-300 py-1 px-1 text-center font-bold" style="width: 4%;">ลำดับ</th>
                            <th class="border border-slate-300 py-1 px-1 text-center font-bold" style="width: 15%;">รหัส (FSN 13 หลัก)</th>
                            <th class="border border-slate-300 py-1 px-1.5 text-left font-bold" style="width: 25%;">รายการพัสดุ</th>
                            <th class="border border-slate-300 py-1 px-1 text-left font-bold" style="width: 10%;">หมวดหมู่</th>
                            <th class="border border-slate-300 py-1 px-1 text-left font-bold" style="width: 9%;">สถานที่จัดเก็บ</th>
                            <th class="border border-slate-300 py-1 px-1 text-right font-bold" style="width: 6%;">ยอดบัญชี</th>
                            <th class="border border-slate-300 py-1 px-1 text-right font-bold" style="width: 6%;">ยอดนับจริง</th>
                            <th class="border border-slate-300 py-1 px-1 text-center font-bold" style="width: 5%;">หน่วย</th>
                            <th class="border border-slate-300 py-1 px-1 text-right font-bold" style="width: 7%;">ราคา/หน่วย</th>
                            <th class="border border-slate-300 py-1 px-1 text-right font-bold" style="width: 8%;">มูลค่ารวม (฿)</th>
                            <th class="border border-slate-300 py-1 px-1 text-center font-bold" style="width: 5%;">สภาพพัสดุ</th>
                        </tr>
                    </thead>
                `;

                pageSheet.innerHTML = `
                    <!-- Print Running Header Meta -->
                    <div class="doc-print-header-meta flex justify-between items-center text-[9pt] text-slate-600 border-b border-slate-300 pb-1 mb-2">
                        <span>แบบ พ.ด. ๗ • ระบบบริหารคลังพัสดุ โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)</span>
                        <span class="font-mono text-[8.5pt]">พิมพ์จากระบบ: <span class="doc-print-time">${timeStr}</span> | จนท.ผู้พิมพ์: <span class="doc-print-user">${userStr}</span> | หน้า ${pageNum}/${totalPages}</span>
                    </div>

                    ${headerHtml}

                    <!-- Inventory Audit Table for Page ${pageNum} -->
                    <div class="overflow-x-auto mb-1">
                        <table class="w-full border-collapse border border-slate-300 ${isPortrait ? 'text-[9.5pt]' : 'text-[10pt]'} leading-tight" style="table-layout: fixed;">
                            ${tableHeadHtml}
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                            ${tfootHtml}
                        </table>
                    </div>

                    ${signaturesHtml}

                    <!-- Print Running Footer Meta -->
                    <div class="doc-print-footer-meta flex justify-between items-center text-[8.5pt] text-slate-600 border-t border-slate-300 pt-1 mt-1">
                        <span>แบบฟอร์มเอกสารรายงานพัสดุคงเหลือสิ้นปีงบประมาณ (แบบ พ.ด. ๗) • โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)</span>
                        <span class="font-bold">หน้า ${pageNum}/${totalPages}</span>
                    </div>
                `;

                container.appendChild(pageSheet);
            }
            if (typeof applyDocZoom === 'function') setTimeout(applyDocZoom, 10);
        }

