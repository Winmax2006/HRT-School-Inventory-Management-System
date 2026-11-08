const fs = require('fs');

const protoContent = fs.readFileSync('C:\\Users\\Art\\OneDrive\\เดสก์ท็อป\\HRT_MiniUI_Preview.html', 'utf8');

// Extract CSS style block exactly from prototype
const styleMatch = protoContent.match(/<style>([\s\S]*?)<\/style>/);
const cssStyles = styleMatch ? styleMatch[1] : '';

// Extract paths object
const pathsMatch = protoContent.match(/const paths=\{([\s\S]*?)\};/);
const pathsStr = pathsMatch ? pathsMatch[1] : '';

const miniUiHtml = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>HRT MiniUI — ขอเบิกพัสดุ (โรงเรียนหรเทพฯ)</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
${cssStyles}
/* Additional responsive adjustments for production */
.login-card {
  max-width: 440px;
  margin: 40px auto;
  padding: 32px 24px;
  background: white;
  border-radius: 24px;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01);
  border: 1px solid var(--line);
  text-align: center;
}
.google-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  font-weight: 700;
  font-size: 14px;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05);
}
.google-btn:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}
.badge-active { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
.badge-pending { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.badge-warn { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
.badge-danger { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #e2e8f0;
  border-top-color: var(--blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
<div id="root"></div>
<div id="dialog"></div>
<div id="toast" role="status" aria-live="polite"></div>

<script>
// ============================================================================
// HRT MINI REQUISITION WEB APP (PRODUCTION CANONICAL CLIENT)
// Shared Backend: Config.gs, Api.gs, Read.gs, Write.gs, Audit.gs
// Institutional SSOT: 16 Canonical Sheets
// ============================================================================

// 1. Icon Library
const paths = {${pathsStr}};
const ico = n => \`<svg aria-hidden="true" viewBox="0 0 24 24">\${paths[n] || paths.box}</svg>\`;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = s => document.querySelector(s);

// 2. Universal RPC Transport Bridge (google.script.run)
const ACTION_MAP = {
    'apiGetCurrentUser': 'users.current',
    'apiGetItems': 'items.list',
    'apiGetItemDetail': 'items.get',
    'apiCreateRequisition': 'requisitions.create',
    'apiGetRequisitions': 'requisitions.list',
    'apiConfirmReceipt': 'requisitions.receive',
    'apiCancelRequisition': 'requisitions.cancel',
    'apiResolveQr': 'qr.resolve'
};

class ApiServiceCore {
    constructor() {
        this.isGas = typeof google !== 'undefined' && typeof google.script !== 'undefined' && typeof google.script.run !== 'undefined';
        this.timeoutMs = 30000;
    }
    generateRequestId() {
        return \`REQ-\${Date.now().toString(36)}-\${Math.random().toString(36).substring(2, 7).toUpperCase()}\`;
    }
    call(fnName, ...args) {
        const reqId = this.generateRequestId();
        return new Promise((resolve, reject) => {
            if (this.isGas) {
                let isCompleted = false;
                const timer = setTimeout(() => {
                    if (!isCompleted) {
                        isCompleted = true;
                        reject(new Error(\`Timeout: Backend function [\${fnName}] timed out after \${this.timeoutMs}ms (\${reqId})\`));
                    }
                }, this.timeoutMs);

                const onSuccess = (response) => {
                    if (!isCompleted) {
                        isCompleted = true;
                        clearTimeout(timer);
                        resolve(response);
                    }
                };

                const onFailure = (error) => {
                    if (!isCompleted) {
                        isCompleted = true;
                        clearTimeout(timer);
                        reject(error);
                    }
                };

                try {
                    const runner = google.script.run
                        .withSuccessHandler(onSuccess)
                        .withFailureHandler(onFailure);

                    if (typeof runner[fnName] === 'function') {
                        runner[fnName](...args);
                    } else if (typeof runner.HRT_rpc === 'function') {
                        const action = ACTION_MAP[fnName] || fnName;
                        runner.HRT_rpc(action, args[0]);
                    } else if (typeof runner.apiCall === 'function') {
                        const action = ACTION_MAP[fnName] || fnName;
                        runner.apiCall(action, args[0]);
                    } else {
                        throw new Error(\`RPC_CONTRACT_MISMATCH: Function "\${fnName}" is not exported on backend bridge.\`);
                    }
                } catch (transportErr) {
                    if (!isCompleted) {
                        isCompleted = true;
                        clearTimeout(timer);
                        reject(transportErr);
                    }
                }
            } else {
                const err = new Error('BACKEND_UNAVAILABLE: Google Apps Script bridge is not detected. Please open via authorized Web App URL.');
                err.code = 'BACKEND_UNAVAILABLE';
                reject(err);
            }
        });
    }
}

window.ApiService = new ApiServiceCore();

// 3. Application State Store
const state = {
    authStatus: 'CHECKING', // CHECKING, AUTHENTICATED, UNAUTHENTICATED, ACCESS_DENIED
    user: null,
    items: [],
    requests: [],
    cart: {}, // { item_code: qty }
    purpose: 'ใช้ในการจัดการเรียนการสอนและกิจกรรมการเรียนรู้',
    needDate: '',
    urgency: 'NORMAL',
    view: 'catalog', // catalog, cart, requests, account
    category: 'ทั้งหมด',
    warehouse: 'all',
    search: '',
    requestFilter: 'all',
    isLoadingItems: false,
    isLoadingRequests: false,
    fiscalYear: '2569'
};

const stages = {
    DRAFT: 'ฉบับร่าง',
    SUBMITTED: 'ส่งคำขอแล้ว (รอตรวจสอบ)',
    PENDING_APPROVAL: 'ส่งคำขอแล้ว (รอตรวจสอบ)',
    REVIEWED: 'ตรวจสอบแล้ว (รออนุมัติ)',
    APPROVED: 'อนุมัติแล้ว (รอจัดจ่าย)',
    REJECTED: 'ไม่อนุมัติ',
    READY_TO_ISSUE: 'พร้อมจ่าย',
    ISSUED: 'จ่ายพัสดุแล้ว (รอรับของ)',
    RECEIVED: 'รับพัสดุเรียบร้อยแล้ว',
    CANCELLED: 'ยกเลิกคำร้องแล้ว'
};

// 4. Toast Notification
function toast(msg, type = 'info') {
    const el = $('#toast');
    if (!el) return;
    el.innerHTML = \`<div class="toast \${type}">\${esc(msg)}</div>\`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { el.innerHTML = ''; }, 3500);
}

// 5. Navigation
function nav(viewName) {
    state.view = viewName;
    render();
    window.scrollTo(0, 0);
}

function navButtons(cls) {
    const count = Object.values(state.cart).reduce((a, b) => a + b, 0);
    const tabs = [
        ['catalog', 'grid', 'ขอเบิก'],
        ['cart', 'cart', 'ตะกร้า'],
        ['requests', 'list', 'คำร้องของฉัน'],
        ['account', 'user', 'บัญชี']
    ];
    return \`<nav class="\${cls}" aria-label="เมนูหลัก">\${tabs.map(([v, i, t]) => \`
        <button data-nav="\${v}" class="\${state.view === v ? 'active' : ''}">
            \${ico(i)}
            <span>\${t}</span>
            \${v === 'cart' && count > 0 ? \`<b class="count">\${count}</b>\` : ''}
        </button>
    \`).join('')}</nav>\`;
}

// 6. UI Render Engine
function render() {
    const root = $('#root');
    if (!root) return;

    if (state.authStatus === 'CHECKING') {
        root.innerHTML = \`
            <div class="shell" style="padding-top:80px">
                <div class="login-card">
                    <div class="brandmark" style="margin:0 auto 16px">\${ico('box')}</div>
                    <h2 style="margin:0 0 8px">โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)</h2>
                    <p class="muted" style="margin:0 0 24px">ระบบขอเบิกพัสดุ (HRT MiniUI)</p>
                    <div class="spinner"></div>
                    <p class="meta" style="margin-top:16px">กำลังตรวจสอบสิทธิ์การเข้าสู่ระบบ...</p>
                </div>
            </div>\`;
        return;
    }

    if (state.authStatus === 'UNAUTHENTICATED') {
        root.innerHTML = \`
            <div class="shell" style="padding-top:60px">
                <div class="login-card">
                    <div class="brandmark" style="margin:0 auto 16px">\${ico('box')}</div>
                    <span class="pill bluepill">HRT MINI REQUISITION</span>
                    <h2 style="margin:16px 0 6px">ขอเบิกพัสดุง่าย<br>พร้อมใช้ในห้องเรียน</h2>
                    <p class="muted" style="margin:0 0 24px;font-size:13px">
                        โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)<br>
                        กรุณาเข้าสู่ระบบด้วยบัญชี Google ของสถานศึกษา
                    </p>
                    <button type="button" class="google-btn" onclick="signInWithGoogle()">
                        <svg style="width:20px;height:20px" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.98 0 12c0 2.02.45 3.84 1.25 5.42l4.03-3.15z"/>
                            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                        </svg>
                        <span>เข้าสู่ระบบด้วย Google Workspace</span>
                    </button>
                    <p class="meta" style="margin-top:20px">เชื่อมต่อฐานข้อมูลระบบบริหารคลังพัสดุกลาง</p>
                </div>
            </div>\`;
        return;
    }

    if (state.authStatus === 'ACCESS_DENIED') {
        root.innerHTML = \`
            <div class="shell" style="padding-top:60px">
                <div class="login-card">
                    <div style="font-size:36px;color:#dc2626;margin-bottom:12px">\${ico('scan')}</div>
                    <h2 style="margin:0 0 8px;color:#991b1b">บัญชียังไม่ได้รับสิทธิ์</h2>
                    <p class="muted" style="margin:0 0 20px;font-size:13px">
                        บัญชี Google (\${esc(state.user ? state.user.email : '')}) ยังไม่ได้รับการลงทะเบียน หรือถูกระงับสิทธิ์การใช้งานในสารบบบุคลากร
                    </p>
                    <p class="meta" style="margin-bottom:24px">กรุณาติดต่อผู้ดูแลระบบ (Admin) ฝ่ายบริหารงานงบประมาณเพื่อขอเปิดสิทธิ์ใช้งาน</p>
                    <button type="button" class="btn" style="width:100%" onclick="initApp()">ตรวจสอบอีกครั้ง</button>
                </div>
            </div>\`;
        return;
    }

    // Authenticated Shell
    const titles = {
        catalog: 'ขอเบิกพัสดุ',
        cart: 'ตะกร้าของฉัน',
        requests: 'คำร้องของฉัน',
        account: 'บัญชีผู้ใช้งาน'
    };

    root.innerHTML = \`
        <aside class="sidebar">
            <div class="brand">
                <div class="brandmark">\${ico('box')}</div>
                <div>HRT Inventory<small>MINI REQUISITION</small></div>
            </div>
            <div class="school">
                โรงเรียนหรเทพ<br>(รุ่งเรืองประชาสามัคคี)<br>
                <span style="font-size:10px;color:#94a3b8">องค์การบริหารส่วนจังหวัดสระบุรี</span>
            </div>
            <p class="navlabel">พื้นที่ผู้ขอเบิก</p>
            \${navButtons('snav')}
            <div class="sidebottom">
                <strong>ระบบบริหารคลังพัสดุ</strong><br>
                HRT MiniUI · v2.7.0<br>
                <span class="dot"></span> เชื่อมต่อระบบกลางแล้ว
            </div>
        </aside>

        <div class="shell">
            <header class="topbar">
                <div class="crumb">HRT Inventory <span style="margin:0 8px;color:#cbd5e1">/</span> <strong>\${titles[state.view]}</strong></div>
                <div class="brand">
                    <div class="brandmark">\${ico('box')}</div>
                    <div>HRT MiniUI<small>โรงเรียนหรเทพฯ</small></div>
                </div>
                <button class="userbtn" data-nav="account">
                    <span class="username">\${esc(state.user ? state.user.name : 'ผู้ใช้งาน')}</span>
                    <span class="avatar">\${ico('user')}</span>
                </button>
            </header>

            <main>
                <div class="pagehead">
                    <div>
                        <h1>\${titles[state.view]}</h1>
                        <p class="sub">
                            \${state.view === 'catalog' ? 'เลือกพัสดุที่ต้องการใช้ แล้วส่งคำร้องในไม่กี่ขั้นตอน' :
                              state.view === 'cart' ? 'ตรวจสอบรายการพัสดุ ระบุเหตุผล และส่งคำขอเบิก' :
                              state.view === 'requests' ? 'ติดตามสถานะคำร้องขอเบิกพัสดุและยืนยันการรับของ' :
                              'ข้อมูลบุคลากรและสิทธิ์การใช้งาน'}
                        </p>
                    </div>
                    <span class="pill bluepill">ปีงบประมาณ \${state.fiscalYear}</span>
                </div>

                \${state.view === 'catalog' ? renderCatalog() :
                  state.view === 'cart' ? renderCart() :
                  state.view === 'requests' ? renderRequests() :
                  renderAccount()}
            </main>

            \${navButtons('bottomnav')}
        </div>
    \`;

    bindEvents();
}

// 7. Catalog View
function renderCatalog() {
    const cats = ['ทั้งหมด', 'เครื่องเขียน', 'กระดาษ', 'คอมพิวเตอร์/ไอที', 'วัสดุวิทยาศาสตร์', 'วัสดุงานบ้านงานครัว', 'งานซ่อมบำรุง'];
    const filtered = state.items.filter(i => {
        const matchCat = (state.category === 'ทั้งหมด' || (i.category && i.category.includes(state.category)));
        const matchWh = (state.warehouse === 'all' || (state.warehouse === 'science' ? (i.warehouse && i.warehouse.includes('วิทย์')) : !(i.warehouse && i.warehouse.includes('วิทย์'))));
        const matchSearch = (!state.search || \`\${i.code} \${i.name} \${i.category}\`.toLowerCase().includes(state.search.toLowerCase()));
        return matchCat && matchWh && matchSearch;
    });

    return \`
        <section class="welcome">
            <div>
                <div class="eyebrow">Ready for your classroom</div>
                <h2>เตรียมของให้พร้อม เพื่อการเรียนรู้</h2>
                <p>สแกน QR พัสดุ หรือค้นหารายการที่ต้องการเบิกใช้ในการสอนได้ทันที</p>
            </div>
            <button class="btn primary" id="openScannerBtn" style="flex-shrink:0">
                \${ico('scan')}
                <span>สแกน QR พัสดุ</span>
            </button>
        </section>

        <div class="searchbox">
            \${ico('search')}
            <input id="catalogSearchInput" class="field" placeholder="ค้นหาชื่อพัสดุ หรือรหัสพัสดุ..." value="\${esc(state.search)}">
        </div>

        <div class="filterbar">
            <div class="chips">
                \${cats.map(c => \`<button class="chip \${state.category === c ? 'active' : ''}" data-cat="\${c}">\${c}</button>\`).join('')}
            </div>
            <div class="selectwrap">
                <select id="warehouseSelect" class="field" style="padding:6px 12px;font-size:12px;width:auto">
                    <option value="all" \${state.warehouse === 'all' ? 'selected' : ''}>ทุกคลังพัสดุ</option>
                    <option value="central" \${state.warehouse === 'central' ? 'selected' : ''}>คลังพัสดุกลาง</option>
                    <option value="science" \${state.warehouse === 'science' ? 'selected' : ''}>ห้องปฏิบัติการวิทย์</option>
                </select>
            </div>
        </div>

        \${state.isLoadingItems ? \`
            <div style="padding:60px 20px;text-align:center">
                <div class="spinner"></div>
                <p class="meta" style="margin-top:16px">กำลังโหลดรายการพัสดุจากระบบกลาง...</p>
            </div>
        \` : filtered.length ? \`
            <div class="grid">
                \${filtered.map(i => itemCard(i)).join('')}
            </div>
        \` : \`
            <div class="empty">
                <div class="avatar">\${ico('box')}</div>
                <h3>ไม่พบรายการพัสดุ</h3>
                <p class="muted">ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่น</p>
            </div>
        \`}
    \`;
}

function itemCard(item) {
    const isOutOfStock = (item.stock || 0) <= 0;
    const isLowStock = (item.stock || 0) <= (item.min || 0);

    return \`
        <article class="card">
            <div class="cardheader">
                <span class="code">\${esc(item.code)}</span>
                <span class="pill \${isOutOfStock ? 'badge-danger' : isLowStock ? 'badge-warn' : 'badge-active'}">
                    \${isOutOfStock ? 'หมด' : \`คงเหลือ \${item.stock} \${esc(item.unit || 'ชิ้น')}\`}
                </span>
            </div>
            <h3>\${esc(item.name)}</h3>
            <p class="meta">\${esc(item.category || 'ทั่วไป')} · \${esc(item.warehouse || 'คลังกลาง')}</p>
            <div class="cardfooter">
                <span class="price">\${item.unit_cost ? \`฿\${Number(item.unit_cost).toLocaleString()} / \${esc(item.unit || 'หน่วย')}\` : esc(item.unit || 'หน่วย')}</span>
                <button type="button" class="btn small" data-product="\${item.code}" \${isOutOfStock ? 'disabled' : ''}>
                    \${ico('plus')}
                    <span>เบิก</span>
                </button>
            </div>
        </article>
    \`;
}

// 8. Cart View
function renderCart() {
    const entries = Object.entries(state.cart).filter(([code, qty]) => qty > 0);
    if (!entries.length) {
        return \`
            <div class="empty">
                <div class="avatar">\${ico('cart')}</div>
                <h3>ตะกร้ายังว่างอยู่</h3>
                <p class="muted">เลือกพัสดุที่ต้องการใช้ แล้วเพิ่มลงในตะกร้าเพื่อส่งคำขอ</p>
                <button class="btn primary" style="margin-top:16px" data-nav="catalog">
                    \${ico('arrow')}
                    <span>ไปที่รายการพัสดุ</span>
                </button>
            </div>
        \`;
    }

    let totalUnits = 0;
    let totalEstimatedValue = 0;

    const lineItemsHtml = entries.map(([code, qty]) => {
        const it = state.items.find(i => i.code === code) || { code, name: code, unit: 'ชิ้น', unit_cost: 0, stock: 99 };
        totalUnits += qty;
        totalEstimatedValue += (qty * (it.unit_cost || 0));

        return \`
            <div class="cartitem">
                <div class="info">
                    <span class="code">\${esc(it.code)}</span>
                    <h4 style="margin:4px 0">\${esc(it.name)}</h4>
                    <p class="meta">พร้อมเบิก \${it.stock} \${esc(it.unit || 'ชิ้น')} \${it.unit_cost ? \`· ฿\${it.unit_cost} / \${it.unit}\` : ''}</p>
                </div>
                <div class="qtycontrols">
                    <button type="button" class="btn small" data-cart-dec="\${it.code}">-</button>
                    <span style="font-weight:700;font-size:15px;min-width:24px;text-align:center">\${qty}</span>
                    <button type="button" class="btn small" data-cart-inc="\${it.code}" \${qty >= it.stock ? 'disabled' : ''}>+</button>
                    <button type="button" class="btn small danger" data-cart-del="\${it.code}" style="margin-left:8px" title="ลบ">\${ico('scan')}</button>
                </div>
            </div>
        \`;
    }).join('');

    return \`
        <section class="panel">
            <div class="paneltitle">
                <h2 style="margin:0">รายการที่ต้องการขอเบิก</h2>
                <span class="pill">\${entries.length} รายการ (\${totalUnits} ชิ้น)</span>
            </div>

            <div class="cartlist">
                \${lineItemsHtml}
            </div>

            <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--line)">
                <label class="label" for="reqPurpose">วัตถุประสงค์ในการขอเบิก <span style="color:#dc2626">*</span></label>
                <textarea id="reqPurpose" class="field" rows="3" placeholder="ระบุเหตุผล เช่น ใช้ในการจัดการเรียนการสอนวิชาวิทยาศาสตร์...">\${esc(state.purpose)}</textarea>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">
                    <div>
                        <label class="label" for="reqNeedDate">วันที่ต้องการใช้พัสดุ</label>
                        <input type="date" id="reqNeedDate" class="field" value="\${esc(state.needDate)}">
                    </div>
                    <div>
                        <label class="label" for="reqUrgency">ระดับความจำเป็น</label>
                        <select id="reqUrgency" class="field">
                            <option value="NORMAL" \${state.urgency === 'NORMAL' ? 'selected' : ''}>ปกติ (ตามรอบเบิก)</option>
                            <option value="URGENT" \${state.urgency === 'URGENT' ? 'selected' : ''}>เร่งด่วน (ใช้ใน 1-2 วัน)</option>
                        </select>
                    </div>
                </div>

                <div class="notice" style="margin-top:20px">
                    <strong>การตัดยอดสต็อกตามระเบียบพัสดุ</strong><br>
                    การส่งคำร้องขอเบิกยังไม่ตัดยอดคงคลังทันที ยอดสต็อกจริงจะถูกตัดเมื่อเจ้าหน้าที่พัสดุได้ตรวจสอบ อนุมัติ และจัดจ่ายพัสดุเรียบร้อยแล้ว
                </div>

                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:24px;gap:16px">
                    <div>
                        <div class="muted" style="font-size:12px">มูลค่าประมาณการ</div>
                        <div style="font-size:18px;font-weight:800;color:var(--blue)">฿\${totalEstimatedValue.toLocaleString()}</div>
                    </div>
                    <button type="button" class="btn primary" id="btnSubmitCart" style="padding:12px 28px;font-size:15px">
                        \${ico('check')}
                        <span>ยืนยันส่งคำร้องขอเบิก</span>
                    </button>
                </div>
            </div>
        </section>
    \`;
}

// 9. My Requests View
function renderRequests() {
    const filters = [
        ['all', 'ทั้งหมด'],
        ['submitted', 'รอตรวจสอบ'],
        ['approved', 'รอจัดจ่าย'],
        ['issued', 'รอรับของ'],
        ['received', 'รับของแล้ว']
    ];

    const filtered = state.requests.filter(r => {
        if (state.requestFilter === 'all') return true;
        const st = String(r.status || '').toUpperCase();
        if (state.requestFilter === 'submitted') return st === 'SUBMITTED' || st === 'PENDING_APPROVAL' || st === 'REVIEWED';
        if (state.requestFilter === 'approved') return st === 'APPROVED';
        if (state.requestFilter === 'issued') return st === 'ISSUED' || st === 'READY_TO_ISSUE';
        if (state.requestFilter === 'received') return st === 'RECEIVED';
        return true;
    });

    return \`
        <div class="chips">
            \${filters.map(([f, label]) => \`
                <button class="chip \${state.requestFilter === f ? 'active' : ''}" data-reqfilter="\${f}">\${label}</button>
            \`).join('')}
        </div>

        \${state.isLoadingRequests ? \`
            <div style="padding:60px 20px;text-align:center">
                <div class="spinner"></div>
                <p class="meta" style="margin-top:16px">กำลังดึงข้อมูลคำร้องขอเบิก...</p>
            </div>
        \` : filtered.length ? \`
            <div class="requestlist">
                \${filtered.map(r => requestCard(r)).join('')}
            </div>
        \` : \`
            <div class="empty">
                <div class="avatar">\${ico('list')}</div>
                <h3>ไม่พบคำร้องขอเบิก</h3>
                <p class="muted">คุณยังไม่มีคำร้องในหมวดหมู่นี้</p>
                <button class="btn primary" style="margin-top:16px" data-nav="catalog">
                    \${ico('plus')}
                    <span>สร้างคำร้องขอเบิกใหม่</span>
                </button>
            </div>
        \`}
    \`;
}

function requestCard(r) {
    const st = String(r.status || 'SUBMITTED').toUpperCase();
    const isIssued = st === 'ISSUED';
    const isPending = st === 'SUBMITTED' || st === 'PENDING_APPROVAL';

    return \`
        <article class="card reqcard" data-req-id="\${r.req_id || r.id}">
            <div class="cardheader">
                <div>
                    <span class="code">\${esc(r.req_no || r.req_id || r.id)}</span>
                    <span class="meta" style="margin-left:8px">\${esc(r.req_date || r.created_at || 'วันนี้')}</span>
                </div>
                <span class="pill \${isIssued ? 'badge-warn' : st === 'RECEIVED' ? 'badge-active' : st === 'REJECTED' ? 'badge-danger' : 'badge-pending'}">
                    \${stages[st] || st}
                </span>
            </div>
            <h3 style="margin:10px 0 6px">\${esc(r.purpose || 'ใช้ในการจัดการเรียนการสอน')}</h3>
            <p class="meta">
                \${Array.isArray(r.items) ? \`\${r.items.length} รายการพัสดุ\` : 'มีรายการพัสดุ'} · \${esc(r.dept || r.department || 'กลุ่มสาระฯ')}
            </p>
            \${isIssued ? \`
                <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line);display:flex;justify-content:flex-end">
                    <button type="button" class="btn primary small" data-confirm-receipt="\${r.req_id || r.id}">
                        \${ico('check')}
                        <span>ยืนยันรับของแล้ว</span>
                    </button>
                </div>
            \` : ''}
        </article>
    \`;
}

// 10. Account View
function renderAccount() {
    const u = state.user || {};
    return \`
        <section class="panel">
            <div class="accountheader">
                <div class="avatar">\${ico('user')}</div>
                <div>
                    <h2 style="margin:0">\${esc(u.name || 'ผู้ใช้งาน')}</h2>
                    <span class="muted">\${esc(u.email || '')}</span>
                </div>
            </div>

            <div class="settingrow">
                <div>
                    <strong>ตำแหน่ง / บทบาท</strong>
                    <small>\${esc(u.role || 'TEACHER')}</small>
                </div>
                <span class="pill badge-active">ยืนยันตัวตนแล้ว</span>
            </div>

            <div class="settingrow">
                <div>
                    <strong>กลุ่มสาระฯ / ฝ่ายงาน</strong>
                    <small>\${esc(u.department || 'ทั่วไป')}</small>
                </div>
            </div>

            <div class="settingrow">
                <div>
                    <strong>รหัสบุคลากร (System ID)</strong>
                    <small>\${esc(u.id || u.user_id || '-')}</small>
                </div>
            </div>

            <div class="settingrow">
                <div>
                    <strong>ปีงบประมาณที่เปิดใช้งาน</strong>
                    <small>พ.ศ. \${state.fiscalYear}</small>
                </div>
            </div>

            <div style="margin-top:32px;display:flex;flex-direction:column;gap:12px">
                <a href="?view=central" class="btn" style="text-align:center;text-decoration:none">
                    \${ico('grid')}
                    <span>เปิดระบบคลังระบบกลาง (Central Desktop)</span>
                </a>
                <button type="button" class="btn danger" onclick="signOut()">
                    \${ico('scan')}
                    <span>ออกจากระบบ (Sign Out)</span>
                </button>
            </div>
        </section>
    \`;
}

// 11. Event Binding & Actions
function bindEvents() {
    // Navigation buttons
    document.querySelectorAll('[data-nav]').forEach(btn => {
        btn.onclick = () => nav(btn.dataset.nav);
    });

    // Scanner
    const scanBtn = $('#openScannerBtn');
    if (scanBtn) scanBtn.onclick = openScannerModal;

    // Search
    const searchInput = $('#catalogSearchInput');
    if (searchInput) {
        searchInput.oninput = e => {
            state.search = e.target.value;
            render();
            const reFocus = $('#catalogSearchInput');
            if (reFocus) {
                reFocus.focus();
                reFocus.setSelectionRange(state.search.length, state.search.length);
            }
        };
    }

    // Category chips
    document.querySelectorAll('[data-cat]').forEach(chip => {
        chip.onclick = () => {
            state.category = chip.dataset.cat;
            render();
        };
    });

    // Warehouse select
    const whSel = $('#warehouseSelect');
    if (whSel) {
        whSel.onchange = e => {
            state.warehouse = e.target.value;
            render();
        };
    }

    // Product cards (Click to open modal)
    document.querySelectorAll('[data-product]').forEach(btn => {
        btn.onclick = () => openProductModal(btn.dataset.product);
    });

    // Cart +/- controls
    document.querySelectorAll('[data-cart-inc]').forEach(btn => {
        btn.onclick = () => {
            const code = btn.dataset.cartInc;
            state.cart[code] = (state.cart[code] || 0) + 1;
            render();
        };
    });
    document.querySelectorAll('[data-cart-dec]').forEach(btn => {
        btn.onclick = () => {
            const code = btn.dataset.cartDec;
            if (state.cart[code] > 1) state.cart[code]--;
            else delete state.cart[code];
            render();
        };
    });
    document.querySelectorAll('[data-cart-del]').forEach(btn => {
        btn.onclick = () => {
            delete state.cart[btn.dataset.cartDel];
            render();
        };
    });

    // Submit Cart Button
    const btnSubmitCart = $('#btnSubmitCart');
    if (btnSubmitCart) {
        btnSubmitCart.onclick = submitRequisition;
    }

    // Request filter chips
    document.querySelectorAll('[data-reqfilter]').forEach(btn => {
        btn.onclick = () => {
            state.requestFilter = btn.dataset.reqfilter;
            render();
        };
    });

    // Request card click
    document.querySelectorAll('.reqcard').forEach(card => {
        card.onclick = (e) => {
            if (e.target.closest('[data-confirm-receipt]')) return;
            openRequestModal(card.dataset.reqId);
        };
    });

    // Confirm receipt buttons
    document.querySelectorAll('[data-confirm-receipt]').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            confirmReceipt(btn.dataset.confirmReceipt);
        };
    });
}

// 12. Modal System
function openModal(title, bodyHtml, actionsHtml) {
    const d = $('#dialog');
    if (!d) return;
    d.innerHTML = \`
        <div class="overlay" onclick="closeModal(event)">
            <div class="modal" onclick="event.stopPropagation()">
                <div class="modalhead">
                    <h3 style="margin:0">\${esc(title)}</h3>
                    <button class="closebtn" onclick="closeModal()">✕</button>
                </div>
                <div class="modalbody">\${bodyHtml}</div>
                \${actionsHtml ? \`<div class="modalfoot">\${actionsHtml}</div>\` : ''}
            </div>
        </div>
    \`;
}

function closeModal(e) {
    if (e && e.target && !e.target.classList.contains('overlay') && !e.target.classList.contains('closebtn')) return;
    const d = $('#dialog');
    if (d) d.innerHTML = '';
}

// 13. Product Detail Modal
function openProductModal(code) {
    const it = state.items.find(i => i.code === code);
    if (!it) return;

    let qty = 1;
    const isOut = (it.stock || 0) <= 0;

    const body = \`
        <div class="code">\${esc(it.code)}</div>
        <h2 style="margin:6px 0">\${esc(it.name)}</h2>
        <p class="muted">\${esc(it.category || 'ทั่วไป')} · \${esc(it.warehouse || 'คลังกลาง')}</p>
        
        <div style="margin:16px 0;padding:12px;background:var(--bg);border-radius:12px">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                <span class="muted">ยอดคงเหลือพร้อมเบิก</span>
                <strong>\${it.stock} \${esc(it.unit || 'ชิ้น')}</strong>
            </div>
            \${it.unit_cost ? \`
                <div style="display:flex;justify-content:space-between">
                    <span class="muted">ราคาต่อหน่วย</span>
                    <strong>฿\${Number(it.unit_cost).toLocaleString()}</strong>
                </div>
            \` : ''}
        </div>

        \${isOut ? \`
            <div class="notice danger">พัสดุรายการนี้หมดคลังชั่วคราว ไม่สามารถทำรายการเบิกได้</div>
        \` : \`
            <label class="label" for="modalItemQty">จำนวนที่ต้องการเบิก (\${esc(it.unit || 'ชิ้น')})</label>
            <div style="display:flex;align-items:center;gap:12px">
                <button type="button" class="btn" onclick="let inp=$('#modalItemQty');if(inp.value>1)inp.value--">-</button>
                <input type="number" id="modalItemQty" class="field" value="1" min="1" max="\${it.stock}" style="text-align:center;font-weight:700">
                <button type="button" class="btn" onclick="let inp=$('#modalItemQty');if(Number(inp.value)<Number(inp.max))inp.value++">+</button>
            </div>
        \`}
    \`;

    const actions = isOut ? '' : \`
        <button type="button" class="btn primary" id="btnAddModalToCart" style="width:100%">
            \${ico('plus')}
            <span>เพิ่มลงตะกร้า</span>
        </button>
    \`;

    openModal('รายละเอียดพัสดุ', body, actions);

    const btnAdd = $('#btnAddModalToCart');
    if (btnAdd) {
        btnAdd.onclick = () => {
            const addQty = parseInt($('#modalItemQty').value, 10) || 1;
            state.cart[code] = (state.cart[code] || 0) + addQty;
            closeModal();
            toast(\`เพิ่ม \${it.name} จำนวน \${addQty} \${it.unit} ลงตะกร้าแล้ว\`, 'success');
            render();
        };
    }
}

// 14. Request Detail Modal
function openRequestModal(reqId) {
    const r = state.requests.find(x => (x.req_id || x.id) === reqId);
    if (!r) return;

    const st = String(r.status || 'SUBMITTED').toUpperCase();
    const canCancel = st === 'SUBMITTED' || st === 'DRAFT' || st === 'PENDING_APPROVAL';

    const itemsHtml = Array.isArray(r.items) ? r.items.map(l => \`
        <div class="settingrow" style="padding:8px 0">
            <div>
                <strong>\${esc(l.item_name || l.name || l.item_code)}</strong>
                <small>\${esc(l.item_code)}</small>
            </div>
            <span style="font-weight:700">\${l.qty || l.quantity} \${esc(l.unit || 'ชิ้น')}</span>
        </div>
    \`).join('') : '<p class="muted">ไม่มีข้อมูลรายการย่อย</p>';

    const body = \`
        <div class="code">\${esc(r.req_no || r.req_id || r.id)}</div>
        <div style="margin:8px 0">
            <span class="pill badge-pending">\${stages[st] || st}</span>
        </div>
        <h3 style="margin:12px 0 4px">\${esc(r.purpose || 'ใช้ในการจัดการเรียนการสอน')}</h3>
        <p class="meta">ผู้ขอเบิก: \${esc(r.teacher || r.requester_name || (state.user ? state.user.name : ''))} · ฝ่าย: \${esc(r.dept || '')}</p>
        
        <div style="margin:16px 0;padding-top:12px;border-top:1px solid var(--line)">
            <h4 style="margin:0 0 8px">รายการพัสดุ</h4>
            \${itemsHtml}
        </div>
    \`;

    const actions = canCancel ? \`
        <button type="button" class="btn danger" id="btnCancelReqInModal" style="width:100%">
            \${ico('scan')}
            <span>ยกเลิกคำร้องขอเบิกนี้</span>
        </button>
    \` : '';

    openModal('รายละเอียดคำร้องขอเบิก', body, actions);

    const btnCancel = $('#btnCancelReqInModal');
    if (btnCancel) {
        btnCancel.onclick = () => cancelRequisition(r.req_id || r.id);
    }
}

// 15. QR Scanner Modal
function openScannerModal() {
    const body = \`
        <div class="scanframe" id="scanframe" style="background:#0f172a;border-radius:16px;height:220px;display:flex;align-items:center;justify-content:center;color:white">
            <div style="text-align:center">
                <div style="font-size:32px;margin-bottom:8px">\${ico('scan')}</div>
                <div class="muted">กล้องสแกน QR พัสดุ</div>
            </div>
        </div>
        <div style="margin-top:16px">
            <label class="label" for="manualQrCode">หรือป้อนรหัสพัสดุโดยตรง</label>
            <input id="manualQrCode" class="field" placeholder="เช่น OFF-001 หรือ ITEM:OFF-001" autocomplete="off">
        </div>
    \`;

    const actions = \`
        <button type="button" class="btn primary" id="btnResolveQrSubmit" style="width:100%">
            \${ico('arrow')}
            <span>ค้นหาพัสดุจากรหัส</span>
        </button>
    \`;

    openModal('สแกน QR Code พัสดุ', body, actions);

    const btn = $('#btnResolveQrSubmit');
    if (btn) {
        btn.onclick = () => {
            const val = ($('#manualQrCode').value || '').trim();
            if (!val) { toast('กรุณาระบุรหัสพัสดุ', 'warn'); return; }
            resolveQrCode(val);
        };
    }
}

async function resolveQrCode(qrData) {
    try {
        toast('กำลังตรวจสอบรหัสพัสดุ...', 'info');
        const res = await window.ApiService.call('apiResolveQr', { qr_data: qrData });
        if (res && res.success && res.item) {
            closeModal();
            openProductModal(res.item.code);
        } else {
            // Local fallback match
            const cleanCode = qrData.replace(/^QR:ITEM:|^ITEM:/i, '').trim().toUpperCase();
            const it = state.items.find(i => i.code === cleanCode);
            if (it) {
                closeModal();
                openProductModal(it.code);
            } else {
                toast(\`ไม่พบพัสดุสำหรับรหัส "\${qrData}"\`, 'warn');
            }
        }
    } catch (e) {
        const cleanCode = qrData.replace(/^QR:ITEM:|^ITEM:/i, '').trim().toUpperCase();
        const it = state.items.find(i => i.code === cleanCode);
        if (it) {
            closeModal();
            openProductModal(it.code);
        } else {
            toast(\`ไม่พบพัสดุ: \${e.message}\`, 'warn');
        }
    }
}

// 16. Submit Requisition to Backend
async function submitRequisition() {
    const entries = Object.entries(state.cart).filter(([code, q]) => q > 0);
    if (!entries.length) { toast('กรุณาเลือกพัสดุลงในตะกร้าก่อนส่งคำขอ', 'warn'); return; }

    const purpose = ($('#reqPurpose')?.value || '').trim();
    if (!purpose) { toast('กรุณาระบุวัตถุประสงค์ในการขอเบิก', 'warn'); $('#reqPurpose')?.focus(); return; }

    const needDate = $('#reqNeedDate')?.value || '';
    const urgency = $('#reqUrgency')?.value || 'NORMAL';

    const items = entries.map(([code, qty]) => {
        const it = state.items.find(i => i.code === code) || { unit: 'ชิ้น' };
        return {
            item_code: code,
            qty: qty,
            unit: it.unit || 'ชิ้น'
        };
    });

    const payload = {
        items: items,
        purpose: purpose,
        urgency: urgency,
        required_date: needDate,
        dept: state.user ? state.user.department : 'ทั่วไป',
        source: 'MINI_QR'
    };

    const btn = $('#btnSubmitCart');
    if (btn) { btn.disabled = true; btn.innerText = 'กำลังส่งคำขอ...'; }

    try {
        const res = await window.ApiService.call('apiCreateRequisition', payload);
        if (res && res.success) {
            state.cart = {};
            toast(\`ส่งคำร้องขอเบิกเลขที่ \${res.req_no || res.req_id} สำเร็จแล้ว\`, 'success');
            await loadRequests();
            nav('requests');
        } else {
            throw new Error(res && res.error ? res.error.message : 'ส่งคำขอไม่สำเร็จ');
        }
    } catch (err) {
        toast(\`เกิดข้อผิดพลาด: \${err.message}\`, 'danger');
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = 'ยืนยันส่งคำร้องขอเบิก'; }
    }
}

// 17. Confirm Receipt
async function confirmReceipt(reqId) {
    if (!confirm('ยืนยันว่าได้รับพัสดุครบถ้วนตามรายการแล้วหรือไม่?')) return;
    try {
        toast('กำลังบันทึกการรับของ...', 'info');
        const res = await window.ApiService.call('apiConfirmReceipt', { requisition_id: reqId });
        if (res && res.success) {
            toast('ยืนยันรับพัสดุเรียบร้อยแล้ว', 'success');
            await loadRequests();
            render();
        } else {
            throw new Error(res && res.error ? res.error.message : 'ไม่สามารถบันทึกได้');
        }
    } catch (e) {
        toast(\`ผิดพลาด: \${e.message}\`, 'danger');
    }
}

// 18. Cancel Requisition
async function cancelRequisition(reqId) {
    if (!confirm('ต้องการยกเลิกคำร้องขอเบิกนี้หรือไม่?')) return;
    try {
        toast('กำลังยกเลิกคำร้อง...', 'info');
        const res = await window.ApiService.call('apiCancelRequisition', { requisition_id: reqId });
        if (res && res.success) {
            closeModal();
            toast('ยกเลิกคำร้องเรียบร้อยแล้ว', 'info');
            await loadRequests();
            render();
        } else {
            throw new Error(res && res.error ? res.error.message : 'ไม่สามารถยกเลิกได้');
        }
    } catch (e) {
        toast(\`ผิดพลาด: \${e.message}\`, 'danger');
    }
}

// 19. Data Loaders
async function loadCatalog() {
    state.isLoadingItems = true;
    render();
    try {
        const res = await window.ApiService.call('apiGetItems');
        if (res && res.items) {
            state.items = res.items;
        } else if (Array.isArray(res)) {
            state.items = res;
        }
    } catch (e) {
        console.warn('Load catalog fallback:', e);
    } finally {
        state.isLoadingItems = false;
        render();
    }
}

async function loadRequests() {
    state.isLoadingRequests = true;
    try {
        const res = await window.ApiService.call('apiGetRequisitions', { user_id: state.user ? state.user.id : null });
        if (res && res.requisitions) {
            state.requests = res.requisitions;
        } else if (Array.isArray(res)) {
            state.requests = res;
        }
    } catch (e) {
        console.warn('Load requests error:', e);
    } finally {
        state.isLoadingRequests = false;
    }
}

// 20. Authentication Lifecycle
function signInWithGoogle() {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
        window.location.reload();
    } else {
        toast('กรุณาเปิดผ่าน Google Web App URL เพื่อเข้าสู่ระบบ', 'info');
    }
}

function signOut() {
    state.authStatus = 'UNAUTHENTICATED';
    state.user = null;
    state.cart = {};
    render();
    toast('ออกจากระบบเรียบร้อยแล้ว', 'info');
}

async function initApp() {
    state.authStatus = 'CHECKING';
    render();

    try {
        const res = await window.ApiService.call('apiGetCurrentUser');
        const user = (res && res.user) ? res.user : (res && res.email ? res : null);

        if (user && user.email) {
            if (user.status === 'SUSPENDED' || user.isActive === false || user.isPendingApproval) {
                state.authStatus = 'ACCESS_DENIED';
                state.user = user;
                render();
                return;
            }

            state.authStatus = 'AUTHENTICATED';
            state.user = user;
            render();

            // Load data in parallel
            await Promise.all([
                loadCatalog(),
                loadRequests()
            ]);
            render();
        } else {
            state.authStatus = 'UNAUTHENTICATED';
            render();
        }
    } catch (err) {
        console.warn('Init auth check error:', err);
        state.authStatus = 'UNAUTHENTICATED';
        render();
    }
}

// Start application
window.onload = initApp;

</script>
</body>
</html>
`;

fs.writeFileSync('MiniUI.html', miniUiHtml, 'utf8');
console.log('MiniUI.html successfully generated! Total size:', miniUiHtml.length, 'bytes');
