import os
import sys

def patch_files():
    # 1. Patch index.html
    html_path = 'index.html'
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()

    # Version labels
    html = html.replace(
        '<span class="text-[10px] bg-blue-500/20 text-blue-400 font-semibold px-1.5 py-0.5 rounded">v2.6.0</span>',
        '<span class="text-[10px] bg-blue-500/20 text-blue-400 font-semibold px-1.5 py-0.5 rounded">v2.7.0-dev.3</span>'
    )
    html = html.replace(
        '<div><b>ระบบ:</b> HRT Inventory System v2.6.0 (Responsive & Document Zoom Edition)</div>',
        '<div><b>ระบบ:</b> HRT Inventory System v2.7.0-dev.3 (Responsive & Document Zoom Edition)</div>'
    )
    html = html.replace(
        '<h3 class="font-bold text-sm tracking-tight leading-tight">HRT MiniUI</h3>',
        '<h3 class="font-bold text-sm tracking-tight leading-tight flex items-center gap-1.5"><span>HRT MiniUI</span><span class="text-[9px] bg-blue-500/30 text-blue-300 font-semibold px-1.5 py-0.5 rounded">v2.7.0-dev.3</span></h3>'
    )

    # Add awaiting receipt tab if not present
    if 'id="reqTabBtnAwaitingReceipt"' not in html:
        target_tab = '<button type="button" id="reqTabBtnCompleted"'
        awaiting_tab_html = """<button type="button" id="reqTabBtnAwaitingReceipt" onclick="switchRequisitionTab('awaiting_receipt')" role="tab" aria-selected="false" class="req-tab-btn px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition flex items-center gap-2 text-slate-600 hover:bg-slate-100">
                            <i class="ph ph-hand-heart"></i>
                            <span>รอรับของ</span>
                            <span class="px-1.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 font-num" id="reqBadgeAwaitingReceipt">0</span>
                        </button>
                        <button type="button" id="reqTabBtnCompleted" """
        html = html.replace(target_tab, awaiting_tab_html, 1)

    # Add polling indicator if not present
    if 'id="reqQueuePollingStatus"' not in html:
        target_nav_end = '</nav>\n                </div>'
        if target_nav_end in html:
            polling_html = """</nav>
                </div>
                <div id="reqQueuePollingStatus" class="flex items-center justify-between text-xs text-slate-500 pt-1 pb-1 px-1">
                    <div class="flex items-center gap-1.5">
                        <i class="ph-bold ph-arrows-clockwise text-blue-500 animate-spin-slow"></i>
                        <span>สถานะคิวคำขอเบิก • อัปเดตล่าสุด: <span id="reqQueueLastUpdated" class="font-num font-semibold text-slate-700">--:--:--</span> (Polling อัตโนมัติทุก 30 วินาที)</span>
                    </div>
                    <button type="button" onclick="if(typeof loadRequisitionsQueue==='function') loadRequisitionsQueue(false)" class="text-blue-600 hover:text-blue-800 text-xs font-semibold flex items-center gap-1 cursor-pointer">
                        <i class="ph-bold ph-arrow-clockwise"></i>
                        <span>รีเฟรชคิว</span>
                    </button>
                </div>"""
            html = html.replace(target_nav_end, polling_html, 1)

    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("index.html patched successfully.")

    # 2. Patch frontend/main/App.js
    app_path = 'frontend/main/App.js'
    with open(app_path, 'r', encoding='utf-8') as f:
        app_code = f.read()

    # Inject miniUi additions before App.init or at end of file if not present
    if 'window.resolveMiniQr' not in app_code:
        mini_enhancements = """
    // ==========================================
    // MINIUI QR RESOLVER & DEEP-LINK HANDLERS
    // ==========================================
    window.lastMiniIdempotencyKey = null;

    window.resolveMiniQr = function(qrToken) {
        if (!qrToken) return;
        qrToken = qrToken.trim();

        // 1. Check if authenticated; if not, persist pending QR in sessionStorage for post-login return
        if (!window.currentUser && !window.currentUserRole) {
            sessionStorage.setItem('hrt_pending_qr', qrToken);
            window.showToast('กรุณาเข้าสู่ระบบก่อนดำเนินการตาม QR Code', 'info');
            return;
        }

        window.showToast(`กำลังตรวจสอบ QR: ${qrToken}...`, 'info');

        const handleQrResult = function(res) {
            if (!res) return;
            if (res.type === 'CATALOG') {
                window.switchMiniTab('catalog');
                window.showToast('เปิดแคตตาล็อกพัสดุเรียบร้อยแล้ว', 'success');
            } else if (res.type === 'WAREHOUSE') {
                window.switchMiniTab('catalog');
                window.miniWarehouseFilter = res.warehouse ? res.warehouse.name : '';
                window.showToast(`จำกัดการแสดงผลเฉพาะคลัง: ${window.miniWarehouseFilter}`, 'info');
                window.renderMiniCatalog();
            } else if (res.type === 'ITEM') {
                window.switchMiniTab('catalog');
                window.addMiniCartItem(res.item.code);
                window.showToast(`เลือกพัสดุ "${res.item.name}" ลงในตะกร้าเรียบร้อยแล้ว`, 'success');
            } else if (res.type === 'TRACKING') {
                window.switchMiniTab('myRequests');
                window.showToast(`กำลังเปิดสถานะคำขอเบิก ${res.requisition ? res.requisition.req_no : ''}`, 'info');
                window.loadMiniMyRequests();
            }
        };

        if (window.ReadApi && typeof window.ReadApi.resolveQr === 'function') {
            window.ReadApi.resolveQr({ qr_token: qrToken })
                .then(handleQrResult)
                .catch(err => window.showToast(`ไม่สามารถประมวลผล QR Code: ${err.message}`, 'error'));
        } else if (typeof google !== 'undefined' && google.script && google.script.run) {
            google.script.run
                .withSuccessHandler(handleQrResult)
                .withFailureHandler(err => window.showToast(`ไม่สามารถประมวลผล QR Code: ${err.message}`, 'error'))
                .apiResolveQr({ qr_token: qrToken });
        } else {
            // Local fallback parser
            if (qrToken.startsWith('QR:ITEM:') || qrToken.startsWith('ITEM:')) {
                const code = qrToken.replace(/^QR:ITEM:|^ITEM:/, '');
                window.switchMiniTab('catalog');
                window.addMiniCartItem(code);
            } else if (qrToken.startsWith('QR:WH:') || qrToken.startsWith('WH:')) {
                window.switchMiniTab('catalog');
                window.miniWarehouseFilter = qrToken.replace(/^QR:WH:|^WH:/, '');
                window.renderMiniCatalog();
            } else if (qrToken.startsWith('QR:TRK:') || qrToken.startsWith('TRK:')) {
                window.switchMiniTab('myRequests');
            } else {
                window.switchMiniTab('catalog');
            }
        }
    };

    window.checkMiniSubmitStatus = function(idempKey) {
        if (!idempKey) {
            window.showToast('ไม่พบ Idempotency Key ของคำขอล่าสุด', 'warning');
            return;
        }
        window.showToast('กำลังตรวจสอบสถานะคำขอเดิมจากเซิร์ฟเวอร์...', 'info');
        if (typeof google !== 'undefined' && google.script && google.script.run) {
            google.script.run
                .withSuccessHandler(res => {
                    if (res && res.committed) {
                        window.miniCart = [];
                        window.updateMiniCartBadge();
                        window.showToast(`คำขอเลขที่ ${res.response.req_no} ได้รับการบันทึกแล้ว (สถานะ: ${res.response.status})`, 'success');
                        window.switchMiniTab('myRequests');
                    } else {
                        window.showToast('ไม่พบรายการคำขอเดิมในระบบ สามารถกดยืนยันส่งใหม่ได้', 'info');
                    }
                })
                .withFailureHandler(err => window.showToast(err.message, 'error'))
                .apiCheckIdempotency({ idempotency_key: idempKey });
        } else {
            window.showToast('ระบบพร้อมส่งคำขอใหม่', 'info');
        }
    };

    // Queue Polling Support
    window.startRequisitionQueuePolling = function() {
        if (window.reqQueuePollingTimer) clearInterval(window.reqQueuePollingTimer);
        window.reqQueuePollingTimer = setInterval(() => {
            if (typeof window.loadRequisitionsQueue === 'function') {
                window.loadRequisitionsQueue(true);
            }
        }, 30000);
    };

    window.loadRequisitionsQueue = function(isSilent) {
        const timeEl = document.getElementById('reqQueueLastUpdated');
        if (timeEl) timeEl.innerText = new Date().toLocaleTimeString('th-TH');

        if (window.RequisitionApi && typeof window.RequisitionApi.getRequisitions === 'function') {
            window.RequisitionApi.getRequisitions({})
                .then(list => {
                    if (!list) return;
                    let countAll = list.length;
                    let countPending = 0;
                    let countIssue = 0;
                    let countAwaiting = 0;
                    let countDone = 0;

                    list.forEach(r => {
                        const st = String(r.status || '').toUpperCase();
                        if (st === 'SUBMITTED' || st === 'REVIEWED' || st === 'PENDING_APPROVAL') countPending++;
                        else if (st === 'APPROVED' || st === 'READY_TO_ISSUE') countIssue++;
                        else if (st === 'ISSUED') countAwaiting++;
                        else if (st === 'RECEIVED' || st === 'CANCELLED' || st === 'REJECTED') countDone++;
                    });

                    const bAll = document.getElementById('reqBadgeAll');
                    const bPen = document.getElementById('reqBadgePendingApproval');
                    const bIss = document.getElementById('reqBadgePendingIssue');
                    const bAwa = document.getElementById('reqBadgeAwaitingReceipt');
                    const bDon = document.getElementById('reqBadgeCompleted');

                    if (bAll) bAll.innerText = countAll;
                    if (bPen) bPen.innerText = countPending;
                    if (bIss) bIss.innerText = countIssue;
                    if (bAwa) bAwa.innerText = countAwaiting;
                    if (bDon) bDon.innerText = countDone;

                    const kpiTotal = document.getElementById('reqKpiTotal');
                    const kpiPending = document.getElementById('reqKpiPendingApproval');
                    const kpiIssue = document.getElementById('reqKpiPendingIssue');
                    if (kpiTotal) kpiTotal.innerText = countAll;
                    if (kpiPending) kpiPending.innerText = countPending;
                    if (kpiIssue) kpiIssue.innerText = countIssue;

                    if (!isSilent) window.showToast('อัปเดตข้อมูลคิวคำขอเบิกเรียบร้อย', 'info');
                })
                .catch(err => {
                    if (!isSilent) window.showToast(`โหลดคิวล้มเหลว: ${err.message}`, 'error');
                });
        }
    };
"""
        app_code = app_code.replace("    window.App = App;", mini_enhancements + "\n    window.App = App;")
        with open(app_path, 'w', encoding='utf-8') as f:
            f.write(app_code)
        print("frontend/main/App.js patched successfully.")

if __name__ == '__main__':
    patch_files()
