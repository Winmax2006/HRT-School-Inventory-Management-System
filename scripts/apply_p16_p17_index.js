const fs = require('fs');

let index = fs.readFileSync('index.html', 'utf8');

// 1. Add escapeHtml and escapeAttr helpers before formatMoney
const helperCode = `
        // Context-Aware Output Encoders (P0 Security against Injection / DOC-04)
        function escapeHtml(str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function escapeAttr(str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }
`;

if (!index.includes('function escapeHtml(')) {
  index = index.replace(
    '// Number Formatters',
    helperCode + '\n        // Number Formatters'
  );
}

// 2. Update getFsnCodeForItem to NEVER generate fake FSN codes
const oldFsnFn = `function getFsnCodeForItem(item) {
            if (!item) return '7510-00-000-0000';
            // 1. Direct match with registered FSN items
            if (typeof fsnData !== 'undefined' && fsnData.length > 0) {
                const matched = fsnData.find(f => f.linked_code === item.code);
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

            const numMatch = code.match(/\\d+/);
            const num = numMatch ? parseInt(numMatch[0], 10) : 1;
            const part1 = String(100 + (num * 17) % 899).padStart(3, '0');
            const part2 = String(1000 + (num * 37) % 8999).padStart(4, '0');
            return \`\${fsc}-00-\${part1}-\${part2}\`;
        }`;

const newFsnFn = `function getFsnCodeForItem(item) {
            if (!item) return '-';
            // 1. Item record direct FSN code
            if (item.fsn_code && String(item.fsn_code).trim() !== '') {
                return String(item.fsn_code).trim();
            }
            if (item.fsnCode && String(item.fsnCode).trim() !== '') {
                return String(item.fsnCode).trim();
            }
            // 2. Direct match with registered FSN items catalog
            if (typeof fsnData !== 'undefined' && Array.isArray(fsnData) && fsnData.length > 0) {
                const matched = fsnData.find(f => f.linked_code === item.code);
                if (matched && matched.fsn_code) return String(matched.fsn_code).trim();
            }
            // Real government data requirement: If unassigned, report '-' (Never fabricate fake FSN codes!) (DOC-03)
            return '-';
        }`;

if (index.includes(oldFsnFn)) {
  index = index.replace(oldFsnFn, newFsnFn);
} else {
  console.warn('oldFsnFn not matched directly in index.html');
}

// 3. Update openAddStockModal, closeAddStockModal, submitRestock
const oldRestockStart = index.indexOf('function openAddStockModal(');
const oldRestockEnd = index.indexOf('\n        function showToast', oldRestockStart);

if (oldRestockStart !== -1 && oldRestockEnd !== -1) {
  const newRestockSection = `let currentRestockIdempotencyKey = null;

        function openAddStockModal(item) {
            currentRestockIdempotencyKey = 'RESTOCK-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            const select = document.getElementById('restockItemSelect');
            select.innerHTML = '';
            (allData || []).forEach(i => {
                const opt = document.createElement('option');
                opt.value = i.code;
                opt.innerText = \`[\${i.code}] \${i.name} (คงเหลือ: \${i.stock} \${i.unit})\`;
                if (item && item.code === i.code) opt.selected = true;
                select.appendChild(opt);
            });
            document.getElementById('addStockModal').classList.remove('hidden');
            pushOverlay('addStockModal', closeAddStockModal);
        }

        function closeAddStockModal() {
            popOverlay('addStockModal');
            document.getElementById('addStockModal').classList.add('hidden');
            currentRestockIdempotencyKey = null;
        }

        async function submitRestock() {
            const selectEl = document.getElementById('restockItemSelect');
            const code = selectEl ? selectEl.value : '';
            if (!code) {
                showToast('กรุณาเลือกรายการพัสดุที่จะรับเข้า', 'warning');
                return;
            }

            // 1. Resolve item from canonical catalog
            const item = (allData || []).find(i => i.code === code);
            if (!item) {
                showToast('ไม่พบข้อมูลพัสดุรหัส ' + code + ' ในระบบแค็ตตาล็อก', 'error');
                return;
            }

            // 2. Validate quantity as finite positive number (no parseInt truncation without check, no negative masking)
            const qtyRaw = document.getElementById('restockQty')?.value;
            const qty = Number(qtyRaw);
            if (qtyRaw === '' || isNaN(qty) || !isFinite(qty) || qty <= 0) {
                showToast('กรุณาระบุจำนวนที่รับเข้าสต็อกให้ถูกต้อง (ต้องเป็นตัวเลขจำนวนจริงที่มากกว่า 0)', 'warning');
                document.getElementById('restockQty')?.focus();
                return;
            }

            // 3. Resolve unit cost, reference doc, staff
            const unitCost = Number(item.unit_cost !== undefined ? item.unit_cost : item.unitCost) || 0;
            const staffInput = document.getElementById('restockStaff')?.value;
            const restockStaff = (staffInput && staffInput.trim()) || 
                (window.currentUser ? (window.currentUser.name || window.currentUser.email) : 'เจ้าหน้าที่พัสดุ');

            if (!currentRestockIdempotencyKey) {
                currentRestockIdempotencyKey = 'RESTOCK-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            }

            const docRef = 'RCV-' + Date.now().toString().slice(-6);

            const payload = {
                item_code: item.code,
                code: item.code,
                itemId: item.code,
                qty: qty,
                quantity: qty,
                qtyIn: qty,
                unit_cost: unitCost,
                unitCost: unitCost,
                doc_ref: docRef,
                note: 'รับพัสดุเข้าคลังโดย ' + restockStaff,
                idempotency_key: currentRestockIdempotencyKey,
                idempotencyKey: currentRestockIdempotencyKey
            };

            const submitBtn = document.querySelector('#addStockModal button[onclick="submitRestock()"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = 'กำลังบันทึก...';
            }

            try {
                // 4. Await Server Commit
                let res = null;
                if (window.StockApi && typeof window.StockApi.receiveStock === 'function') {
                    res = await window.StockApi.receiveStock(payload);
                } else if (window.ApiService && typeof window.ApiService.call === 'function') {
                    res = await window.ApiService.call('apiReceiveStock', payload);
                } else {
                    throw new Error('SERVICE_UNAVAILABLE: ระบบเชื่อมต่อคลังพัสดุไม่พร้อมใช้งาน');
                }

                if (!res || res.success === false) {
                    const errMsg = (res && res.error && res.error.message) || (res && res.message) || 'การบันทึกรับเข้าคลังล้มเหลว';
                    throw new Error(errMsg);
                }

                // 5. Update local state ONLY AFTER server commit succeeds
                if (res.result && typeof res.result.balanceAfter === 'number') {
                    item.stock = res.result.balanceAfter;
                } else if (res.data && typeof res.data.new_stock === 'number') {
                    item.stock = res.data.new_stock;
                } else {
                    item.stock += qty;
                }
                item.total_val = item.stock * unitCost;
                if (item.stock <= item.min) item.status = 'critical';
                else if (item.stock <= (item.rop || item.min)) item.status = 'low';
                else item.status = 'normal';

                if (!item.history) item.history = [];
                const today = new Date();
                const dd = String(today.getDate()).padStart(2, '0');
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const yyyy = today.getFullYear() + 543;
                item.history.push({
                    code: item.code,
                    teacher: restockStaff,
                    qty: qty,
                    date: dd + '/' + mm + '/' + yyyy,
                    type: 'in',
                    transaction_type: 'รับเข้าสต็อก'
                });

                closeAddStockModal();
                applyFilters();
                if (typeof applyDashFilters === 'function') applyDashFilters();
                showToast('รับเข้า ' + item.name + ' จำนวน ' + qty + ' ' + item.unit + ' เข้าสต็อกเรียบร้อยแล้ว', 'success');

            } catch (err) {
                console.error("Restock failed:", err);
                showToast('เกิดข้อผิดพลาดในการรับเข้าสต็อก: ' + (err.message || err), 'error');
                // Failure preserves form inputs and currentRestockIdempotencyKey for retry!
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = 'บันทึกรับเข้าคลัง';
                }
            }
        }`;

  index = index.substring(0, oldRestockStart) + newRestockSection + index.substring(oldRestockEnd);
} else {
  console.warn('Could not find restock boundaries in index.html');
}

// 4. Remove fake heuristics in renderMonthlyReport
const oldMonthlyStart = index.indexOf('function renderMonthlyReport() {');
const oldMonthlyEnd = index.indexOf('\n        function ', oldMonthlyStart + 10);

if (oldMonthlyStart !== -1 && oldMonthlyEnd !== -1) {
  const newMonthlyReport = `function renderMonthlyReport() {
            const select = document.getElementById('monthlySelect');
            const monthText = select ? select.options[select.selectedIndex].text.split('(')[0].trim() : 'พฤษภาคม 2567';
            
            const elMonth = document.getElementById('monthlyDocMonth');
            if (elMonth) elMonth.innerText = monthText;

            const mVal = select ? select.value : '5/2567';
            const mParts = mVal.split('/');
            const targetMonth = parseInt(mParts[0], 10);
            const targetYear = parseInt(mParts[1], 10);

            const serialEl = document.getElementById('monthlyDocSerialNo');
            if (serialEl) serialEl.innerText = \`รหัสเอกสาร: HRT-INV-MTH-\${mParts[1] || '2567'}/\${String(mParts[0] || '05').padStart(2, '0')}\`;

            // 8 Official Thai Government Categories
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

            const catStats = categories.map((cat, idx) => {
                const items = allData.filter(i => i.category === cat);
                const count = items.length;
                grandItems += count;

                let inVal = 0;
                let outVal = 0;
                let closingVal = 0;

                items.forEach(i => {
                    const uCost = Number(i.unit_cost) || 0;
                    closingVal += (Number(i.stock) || 0) * uCost;

                    if (Array.isArray(i.history)) {
                        i.history.forEach(h => {
                            const q = Number(h.qty) || 0;
                            // Check if transaction date matches selected month & year
                            let matchPeriod = false;
                            if (h.date && typeof h.date === 'string') {
                                const dParts = h.date.split('/');
                                if (dParts.length === 3) {
                                    const hMonth = parseInt(dParts[1], 10);
                                    const hYear = parseInt(dParts[2], 10);
                                    if (hMonth === targetMonth && hYear === targetYear) {
                                        matchPeriod = true;
                                    }
                                }
                            }
                            if (matchPeriod) {
                                if (h.type === 'in' || h.transaction_type === 'รับเข้าสต็อก') {
                                    inVal += q * uCost;
                                } else if (h.type === 'out' || h.transaction_type === 'เบิกจ่ายพัสดุ' || h.transaction_type === 'จำหน่าย') {
                                    outVal += q * uCost;
                                }
                            }
                        });
                    }
                });

                // Mathematical SSOT: Opening + In - Out = Closing (DOC-01)
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
                tr.innerHTML = \`
                    <td class="border border-slate-300 py-1 px-1 text-center font-num">\${c.seq}</td>
                    <td class="border border-slate-300 py-1 px-2 font-semibold text-slate-900 text-[10pt]">\${escapeHtml(c.category)}</td>
                    <td class="border border-slate-300 py-1 px-1 text-center font-num text-[10pt]">\${c.count} ชนิด</td>
                    <td class="border border-slate-300 py-1 px-1.5 text-right font-num text-[10pt]">\${formatMoney(c.opening)}</td>
                    <td class="border border-slate-300 py-1 px-1.5 text-right font-num text-[10pt] text-emerald-800">\${formatMoney(c.incoming)}</td>
                    <td class="border border-slate-300 py-1 px-1.5 text-right font-num text-[10pt] text-red-700">\${formatMoney(c.outgoing)}</td>
                    <td class="border border-slate-300 py-1 px-1.5 text-right font-num font-bold text-slate-900 text-[10pt]">\${formatMoney(c.closing)}</td>
                    <td class="border border-slate-300 py-1 px-1 text-center font-num font-semibold text-blue-900 text-[10pt]">\${pct}%</td>
                \`;
                tbody.appendChild(tr);
            });

            tfoot.innerHTML = \`
                <tr class="bg-slate-100 font-bold text-slate-900 text-[10.5pt]">
                    <td class="border border-slate-300 py-1.5 px-2 text-center" colspan="2">รวมมูลค่าทั้งสิ้น (8 หมวดพัสดุ)</td>
                    <td class="border border-slate-300 py-1.5 px-1 text-center font-num">\${grandItems} ชนิด</td>
                    <td class="border border-slate-300 py-1.5 px-1.5 text-right font-num">\${formatMoney(grandOpening)}</td>
                    <td class="border border-slate-300 py-1.5 px-1.5 text-right font-num text-emerald-800">\${formatMoney(grandIn)}</td>
                    <td class="border border-slate-300 py-1.5 px-1.5 text-right font-num text-red-700">\${formatMoney(grandOut)}</td>
                    <td class="border border-slate-300 py-1.5 px-1.5 text-right font-num text-blue-950 font-extrabold">\${formatMoney(grandClosing)}</td>
                    <td class="border border-slate-300 py-1.5 px-1 text-center font-num">100.0%</td>
                </tr>
            \`;
        }`;

  index = index.substring(0, oldMonthlyStart) + newMonthlyReport + index.substring(oldMonthlyEnd);
}

// 5. Remove fake heuristics in renderYearEndSummaryReport
const oldSummaryStart = index.indexOf('function renderYearEndSummaryReport() {');
const oldSummaryEnd = index.indexOf('\n        function renderYearEndCategoryReport() {', oldSummaryStart);

if (oldSummaryStart !== -1 && oldSummaryEnd !== -1) {
  const newSummaryReport = `function renderYearEndSummaryReport() {
            const prevYear = String(parseInt(currentFiscalYear, 10) - 1);
            
            const yeSumDocYear = document.getElementById('yeSumDocYear');
            if (yeSumDocYear) yeSumDocYear.innerText = currentFiscalYear;
            const yeSumDocYearDate = document.getElementById('yeSumDocYearDate');
            if (yeSumDocYearDate) yeSumDocYearDate.innerText = currentFiscalYear;
            const yeSumDocSerial = document.getElementById('yeSumDocSerialNo');
            if (yeSumDocSerial) yeSumDocSerial.innerText = \`รหัสเอกสาร: HRT-INV-YE-SUM-\${currentFiscalYear}/001\`;

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
            if (elInQty) elInQty.innerText = \`+\${formatNumber(inQty)}\`;
            const elInVal = document.getElementById('yeSumInVal');
            if (elInVal) elInVal.innerText = \`+\${formatMoney(inVal)}\`;

            const elOutQty = document.getElementById('yeSumOutQty');
            if (elOutQty) elOutQty.innerText = \`-\${formatNumber(outQty)}\`;
            const elOutVal = document.getElementById('yeSumOutVal');
            if (elOutVal) elOutVal.innerText = \`-\${formatMoney(outVal)}\`;

            const elBookQty = document.getElementById('yeSumBookQty');
            if (elBookQty) elBookQty.innerText = formatNumber(bookQty);
            const elBookVal = document.getElementById('yeSumBookVal');
            if (elBookVal) elBookVal.innerText = formatMoney(bookVal);

            const elActualQty = document.getElementById('yeSumActualQty');
            if (elActualQty) elActualQty.innerText = formatNumber(actualQty);
            const elActualVal = document.getElementById('yeSumActualVal');
            if (elActualVal) elActualVal.innerText = formatMoney(actualVal);

            const elDiffQty = document.getElementById('yeSumDiffQty');
            if (elDiffQty) elDiffQty.innerText = diffQty === 0 ? '0' : (diffQty > 0 ? \`+\${diffQty}\` : String(diffQty));
            const elDiffVal = document.getElementById('yeSumDiffVal');
            if (elDiffVal) elDiffVal.innerText = diffVal === 0 ? '฿0.00' : (diffVal > 0 ? \`+\${formatMoney(diffVal)}\` : \`-\${formatMoney(Math.abs(diffVal))}\`);

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
        }`;

  index = index.substring(0, oldSummaryStart) + newSummaryReport + index.substring(oldSummaryEnd);
}

// 6. Remove fake heuristics in renderYearEndCategoryReport
const oldCatStart = index.indexOf('function renderYearEndCategoryReport() {');
const oldCatEnd = index.indexOf('\n        function renderYearEndAllItemsReport() {', oldCatStart);

if (oldCatStart !== -1 && oldCatEnd !== -1) {
  const newCatReport = `function renderYearEndCategoryReport() {
            const yeCatDocYear = document.getElementById('yeCatDocYear');
            if (yeCatDocYear) yeCatDocYear.innerText = currentFiscalYear;
            const yeCatDocYearDate = document.getElementById('yeCatDocYearDate');
            if (yeCatDocYearDate) yeCatDocYearDate.innerText = currentFiscalYear;
            const yeCatDocSerial = document.getElementById('yeCatDocSerialNo');
            if (yeCatDocSerial) yeCatDocSerial.innerText = \`รหัสเอกสาร: HRT-INV-YE-CAT-\${currentFiscalYear}/001\`;

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

                let condSummary = \`<span class="text-emerald-700 font-semibold">ปกติ (\${normalCount})</span>\`;
                if (repairCount > 0) condSummary += \`, <span class="text-amber-700">ชำรุด (\${repairCount})</span>\`;
                if (dispCount > 0) condSummary += \`, <span class="text-red-700">จำหน่าย (\${dispCount})</span>\`;

                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-50 text-slate-800 text-[10pt] leading-tight';
                tr.innerHTML = \`
                    <td class="border border-slate-300 py-1 px-1 text-center font-num">\${idx + 1}</td>
                    <td class="border border-slate-300 py-1 px-2">
                        <div class="font-bold text-slate-900 text-[10pt]">\${escapeHtml(catObj.name)}</div>
                        <div class="text-[8pt] text-slate-500 font-mono">\${escapeHtml(catObj.group)}</div>
                    </td>
                    <td class="border border-slate-300 py-1 px-1 text-center font-num text-[10pt]">\${count} รายการ</td>
                    <td class="border border-slate-300 py-1 px-1.5 text-right font-num text-[10pt]">\${formatMoney(openVal)}</td>
                    <td class="border border-slate-300 py-1 px-1.5 text-right font-num text-[10pt] text-emerald-800">\${formatMoney(inVal)}</td>
                    <td class="border border-slate-300 py-1 px-1.5 text-right font-num text-[10pt] text-red-700">\${formatMoney(outVal)}</td>
                    <td class="border border-slate-300 py-1 px-1.5 text-right font-num font-bold text-slate-900 text-[10pt]">\${formatMoney(closeVal)}</td>
                    <td class="border border-slate-300 py-1 px-1 text-center font-num font-semibold text-blue-900 text-[10pt]">\${pct}%</td>
                    <td class="border border-slate-300 py-1 px-1.5 text-[9pt] leading-normal">\${condSummary}</td>
                \`;
                tbody.appendChild(tr);
            });

            tfoot.innerHTML = \`
                <tr class="bg-slate-100 font-bold text-slate-900 text-[10.5pt]">
                    <td class="border border-slate-300 py-1.5 px-2 text-center" colspan="2">รวมมูลค่าทั้งสิ้น (8 หมวดพัสดุ)</td>
                    <td class="border border-slate-300 py-1.5 px-1 text-center font-num">\${grandItems} รายการ</td>
                    <td class="border border-slate-300 py-1.5 px-1.5 text-right font-num">\${formatMoney(grandOpen)}</td>
                    <td class="border border-slate-300 py-1.5 px-1.5 text-right font-num text-emerald-800">\${formatMoney(grandIn)}</td>
                    <td class="border border-slate-300 py-1.5 px-1.5 text-right font-num text-red-700">\${formatMoney(grandOut)}</td>
                    <td class="border border-slate-300 py-1.5 px-1.5 text-right font-num text-blue-950 font-extrabold">\${formatMoney(grandClose)}</td>
                    <td class="border border-slate-300 py-1.5 px-1 text-center font-num">100.0%</td>
                    <td class="border border-slate-300 py-1.5 px-1 text-center text-slate-500 font-normal text-[9pt]">-</td>
                </tr>
            \`;
        }`;

  index = index.substring(0, oldCatStart) + newCatReport + index.substring(oldCatEnd);
}

// 7. Context-Aware escaping in renderYearEndAllItemsReport
index = index.replace(
  '<td class="border border-slate-300 py-0.5 px-1.5 font-medium text-slate-900 ${isPortrait ? \'text-[9.5pt]\' : \'text-[10pt]\'} truncate">${item.name}</td>',
  '<td class="border border-slate-300 py-0.5 px-1.5 font-medium text-slate-900 ${isPortrait ? \'text-[9.5pt]\' : \'text-[10pt]\'} truncate">${escapeHtml(item.name)}</td>'
);

index = index.replace(
  '<td class="border border-slate-300 py-0.5 px-1 text-slate-600 ${isPortrait ? \'text-[8.5pt]\' : \'text-[9pt]\'} truncate">${item.category}</td>',
  '<td class="border border-slate-300 py-0.5 px-1 text-slate-600 ${isPortrait ? \'text-[8.5pt]\' : \'text-[9pt]\'} truncate">${escapeHtml(item.category)}</td>'
);

index = index.replace(
  '<td class="border border-slate-300 py-0.5 px-1 text-slate-600 ${isPortrait ? \'text-[8.5pt]\' : \'text-[9pt]\'} truncate">${item.warehouse}</td>',
  '<td class="border border-slate-300 py-0.5 px-1 text-slate-600 ${isPortrait ? \'text-[8.5pt]\' : \'text-[9pt]\'} truncate">${escapeHtml(item.warehouse)}</td>'
);

fs.writeFileSync('index.html', index, 'utf8');
console.log('index.html updated successfully!');
