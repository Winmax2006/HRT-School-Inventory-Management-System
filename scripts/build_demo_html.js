/**
 * build_demo_html.js - Builds Standalone Demo Entry Point (demo.html)
 * HRT Inventory System v2.7.0-rc.4 (Prompt 09)
 */

const fs = require('fs');

const items = JSON.parse(fs.readFileSync('tests/fixtures/sample_items.json', 'utf8'));
const histories = JSON.parse(fs.readFileSync('tests/fixtures/sample_histories.json', 'utf8'));
const requisitions = JSON.parse(fs.readFileSync('tests/fixtures/sample_requisitions.json', 'utf8'));
const users = JSON.parse(fs.readFileSync('tests/fixtures/sample_users.json', 'utf8'));
const fsn = JSON.parse(fs.readFileSync('tests/fixtures/sample_fsn.json', 'utf8'));

let indexHtml = fs.readFileSync('index.html', 'utf8');

// 1. Insert Demo Mode Top Banner immediately after <body>
const demoBanner = `
    <!-- ============================================================== -->
    <!-- DEMO & TESTING MODE PERSISTENT BANNER                         -->
    <!-- ============================================================== -->
    <div id="demoModeIndicator" class="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-md sticky top-0 z-50">
        <i class="ph-bold ph-flask text-base"></i>
        <span>[DEMO & TESTING MODE] โหมดสาธิตระบบด้วยข้อมูลจำลอง (Synthetic Fixtures) — ข้อมูลในหน้านี้ใช้สำหรับการทดสอบ/นำเสนอ ไม่เชื่อมต่อและไม่ถูกบันทึกลง Google Sheets จริง</span>
        <span class="bg-black/20 text-slate-900 px-2 py-0.5 rounded text-[11px] font-mono font-bold">ISOLATED SANDBOX</span>
        <button type="button" onclick="window.switchDemoUserPrompt()" class="ml-2 bg-slate-900 text-amber-300 hover:bg-black px-2.5 py-0.5 rounded text-[11px] font-bold transition">
            <i class="ph-bold ph-arrows-left-right"></i> สลับบทบาททดสอบ
        </button>
    </div>
`;

indexHtml = indexHtml.replace('<body class="h-screen w-screen flex text-slate-800 antialiased overflow-hidden">', '<body class="h-screen w-screen flex text-slate-800 antialiased overflow-hidden">' + demoBanner);

// 2. Set window.__HRT_MODE__ = 'DEMO' and inject isolated synthetic fixtures store
const demoDataScript = `
    <!-- DEMO FIXTURES ISOLATED STORE -->
    <script>
        window.__HRT_MODE__ = 'DEMO';
        window.__DEMO_STORE__ = {
            items: ${JSON.stringify(items)},
            histories: ${JSON.stringify(histories)},
            requisitions: ${JSON.stringify(requisitions)},
            users: ${JSON.stringify(users)},
            fsn: ${JSON.stringify(fsn)},
            currentUser: ${JSON.stringify(users[2])} // Default: Officer (นายอนันต์ มั่นคง)
        };

        window.switchDemoUserPrompt = function() {
            const roleChoices = window.__DEMO_STORE__.users.map((u, i) => \`\${i + 1}. \${u.name} [\${u.role}] - \${u.roleTitle}\`).join('\\n');
            const choice = prompt('เลือกบทบาทที่ต้องการทดสอบในโหมด Demo:\\n' + roleChoices, '1');
            if (!choice) return;
            const idx = parseInt(choice, 10) - 1;
            if (idx >= 0 && idx < window.__DEMO_STORE__.users.length) {
                window.__DEMO_STORE__.currentUser = window.__DEMO_STORE__.users[idx];
                window.currentUser = window.__DEMO_STORE__.currentUser;
                if (window.UserApi) window.UserApi.cachedUser = window.currentUser;
                alert('สลับบทบาทเป็น: ' + window.currentUser.name + ' (' + window.currentUser.role + ') เรียบร้อย');
                location.reload();
            }
        };
    </script>
`;

indexHtml = indexHtml.replace('</head>', demoDataScript + '\n</head>');

// 3. In demo.html, populate allData, mockRequisitionPresets, and fsnData from __DEMO_STORE__
const liveInitTarget = `const rawMasterItems = [];
        const mockHistories = [];
        let allData = [];
        window.rawMasterItems = rawMasterItems;
        window.mockHistories = mockHistories;
        window.allData = allData;
        window.filteredData = [];`;

const demoInitReplacement = `const rawMasterItems = window.__DEMO_STORE__.items;
        const mockHistories = window.__DEMO_STORE__.histories;
        let allData = rawMasterItems.map((item, index) => {
            let currentStock = item.stock;
            if (item.code === "OFF-003") currentStock = 8;
            if (item.code === "IT-011") currentStock = 2;
            if (item.code === "SPT-014") currentStock = 1;
            if (item.code === "JAN-006") currentStock = 3;
            if (item.code === "MED-003") currentStock = 4;
            let status = 'normal';
            if (currentStock <= item.min) status = 'critical';
            else if (currentStock <= item.rop) status = 'low';
            const itemHist = mockHistories.filter(h => h.code === item.code);
            return {
                id: index + 1,
                code: item.code,
                name: item.name,
                category: item.category,
                warehouse: item.warehouse,
                unit: item.unit,
                stock: currentStock,
                min: item.min,
                rop: item.rop,
                unit_cost: item.unit_cost,
                total_val: currentStock * item.unit_cost,
                supplier: item.supplier,
                status: status,
                history: itemHist
            };
        });
        window.rawMasterItems = rawMasterItems;
        window.mockHistories = mockHistories;
        window.allData = allData;
        window.filteredData = [...allData];
        let mockRequisitionPresets = window.__DEMO_STORE__.requisitions;
        window.mockRequisitionPresets = mockRequisitionPresets;
        let fsnData = window.__DEMO_STORE__.fsn;
        window.fsnData = fsnData;`;

indexHtml = indexHtml.replace(liveInitTarget, demoInitReplacement);

// 4. In demo.html, configure ApiService to execute against in-memory __DEMO_STORE__
const cleanApiTarget = `// Live Clean Mode: NO silent mock fallback!
                        // When opened standalone outside Google Apps Script, reject with explicit status
                        const err = new Error('BACKEND_UNAVAILABLE: Google Apps Script bridge is not detected. Please open via authorized Web App URL or use demo.html for standalone preview.');
                        err.code = 'BACKEND_UNAVAILABLE';
                        reject(err);
                    }
                });
            }
        }`;

const demoApiReplacement = `// Demo Mode Mock Dispatcher
                        setTimeout(() => {
                            try {
                                const res = window.demoMockDispatcher(fnName, args, reqId);
                                resolve(res);
                            } catch (e) {
                                reject(e);
                            }
                        }, 60);
                    }
                });
            }
        }

        window.demoMockDispatcher = function(fnName, args, reqId) {
            console.log('[DEMO RPC]', fnName, args);
            switch(fnName) {
                case 'apiGetCurrentUser':
                    return { success: true, user: window.__DEMO_STORE__.currentUser };
                case 'apiGetItems': {
                    const filter = args[0] || {};
                    let items = [...window.allData];
                    if (filter.category && filter.category !== 'ALL') {
                        items = items.filter(it => it.category && it.category.includes(filter.category));
                    }
                    if (filter.search) {
                        const kw = filter.search.toLowerCase();
                        items = items.filter(it => (it.code && it.code.toLowerCase().includes(kw)) || (it.name && it.name.toLowerCase().includes(kw)));
                    }
                    return { success: true, items: items, total: items.length };
                }
                case 'apiCreateRequisition': {
                    const p = args[0] || {};
                    const newReq = {
                        id: 'REQ-2569/' + String(window.__DEMO_STORE__.requisitions.length + 1).padStart(3, '0'),
                        date: new Date().toLocaleDateString('th-TH'),
                        teacher: window.__DEMO_STORE__.currentUser.name,
                        dept: window.__DEMO_STORE__.currentUser.department,
                        warehouse: p.warehouse_id || 'ห้องเก็บพัสดุ',
                        purpose: p.purpose || 'ใช้ในการจัดการเรียนการสอน',
                        status: 'pending_approval',
                        items: p.items || []
                    };
                    window.__DEMO_STORE__.requisitions.unshift(newReq);
                    window.mockRequisitionPresets = window.__DEMO_STORE__.requisitions;
                    return { success: true, reqId: newReq.id, requisition: newReq, status: 'SUBMITTED' };
                }
                case 'apiApproveRequisition': {
                    const reqId = args[0];
                    const req = window.__DEMO_STORE__.requisitions.find(r => r.id === reqId);
                    if (req) req.status = 'pending_issue';
                    return { success: true, reqId: reqId, status: 'APPROVED' };
                }
                case 'apiIssueStock': {
                    const payload = args[0] || {};
                    const req = window.__DEMO_STORE__.requisitions.find(r => r.id === payload.requisition_id);
                    if (req) req.status = 'completed';
                    return { success: true, status: 'ISSUED', deducted: true };
                }
                default:
                    return { success: true, message: 'Mock response for ' + fnName };
            }
        };`;

indexHtml = indexHtml.replace(cleanApiTarget, demoApiReplacement);

fs.writeFileSync('demo.html', indexHtml, 'utf8');
console.log('[COMPLETED] Successfully regenerated standalone demo.html with FSN fixtures');
