import os
import sys

def patch_index_html():
    html_path = 'index.html'
    if not os.path.exists(html_path):
        print("index.html not found")
        return False

    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Inject MiniUI Overlay before </body> if not present
    if 'id="miniUiOverlay"' not in content:
        mini_ui_html = """
    <!-- ========================================== -->
    <!-- MINIUI MOBILE & QR WORKFLOW OVERLAY -->
    <!-- Progressive 4-Tab Interface: Catalog / Cart / My Requests / Account -->
    <!-- ========================================== -->
    <div id="miniUiOverlay" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-0 sm:p-4 hidden transition-opacity">
        <div class="bg-white w-full h-full sm:max-w-md sm:h-[90vh] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
            
            <!-- MiniUI Header -->
            <div class="bg-slate-900 text-white p-3.5 flex items-center justify-between shadow-sm flex-shrink-0">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                        <i class="ph-fill ph-qr-code"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-sm tracking-tight leading-tight">HRT MiniUI</h3>
                        <span class="text-[10px] text-slate-400">ระบบเบิกพัสดุและติดตามสถานะ</span>
                    </div>
                </div>
                <button type="button" onclick="toggleMiniUi()" class="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-300 flex items-center justify-center transition">
                    <i class="ph-bold ph-x text-lg"></i>
                </button>
            </div>

            <!-- MiniUI Body (Tabs) -->
            <div class="flex-1 overflow-y-auto p-4 bg-slate-50 relative">

                <!-- Tab 1: ขอเบิก (Catalog / Item Details / QR Scan) -->
                <div id="miniTabCatalog" class="flex flex-col gap-3">
                    <div class="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-2 shadow-sm">
                        <i class="ph-bold ph-magnifying-glass text-slate-400"></i>
                        <input type="text" id="miniSearchInput" placeholder="ค้นหาชื่อพัสดุ หรือสแกน QR..." oninput="handleMiniSearch(this.value)" class="flex-1 bg-transparent text-xs focus:outline-none">
                        <button type="button" onclick="simulateQrScan()" class="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1">
                            <i class="ph-fill ph-camera text-base"></i>
                            <span>สแกน</span>
                        </button>
                    </div>

                    <!-- Items List -->
                    <div id="miniCatalogList" class="flex flex-col gap-2.5">
                        <!-- Rendered dynamically -->
                    </div>
                </div>

                <!-- Tab 2: ตะกร้า (Cart / Requisition Submission) -->
                <div id="miniTabCart" class="flex flex-col gap-3 hidden">
                    <div class="font-bold text-slate-800 text-sm flex items-center justify-between">
                        <span>รายการพัสดุในตะกร้า</span>
                        <button type="button" onclick="window.miniCart = []; window.updateMiniCartBadge(); window.renderMiniCart();" class="text-xs text-red-500 font-semibold hover:underline">ล้างตะกร้า</button>
                    </div>

                    <div id="miniCartEmptyState" class="py-12 flex flex-col items-center justify-center text-center text-slate-400 gap-2">
                        <i class="ph-light ph-shopping-bag-open text-4xl text-slate-300"></i>
                        <div class="text-xs font-semibold text-slate-600">ยังไม่มีรายการในตะกร้า</div>
                        <div class="text-[11px] text-slate-400">เลือกพัสดุจากแท็บ "ขอเบิก" เพื่อเพิ่มลงตะกร้า</div>
                    </div>

                    <div id="miniCartItemsList" class="flex flex-col gap-2"></div>

                    <div id="miniCartCheckoutSection" class="mt-2 flex flex-col gap-2.5 pt-2 border-t border-slate-200 hidden">
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 mb-1">วัตถุประสงค์ในการขอเบิก:</label>
                            <textarea id="miniReqPurpose" rows="2" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500" placeholder="เช่น ใช้ในการจัดการเรียนการสอนกลุ่มสาระฯ"></textarea>
                        </div>
                        <button type="button" id="btnSubmitMiniReq" onclick="submitMiniRequisition()" class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-1.5">
                            <i class="ph-bold ph-paper-plane-tilt"></i>
                            <span>ยืนยันและส่งคำขอเบิก</span>
                        </button>
                    </div>
                </div>

                <!-- Tab 3: คำร้องของฉัน (My Requests & Tracking) -->
                <div id="miniTabMyRequests" class="flex flex-col gap-3 hidden">
                    <div class="font-bold text-slate-800 text-sm flex items-center justify-between">
                        <span>ประวัติคำขอเบิกของฉัน</span>
                        <button type="button" onclick="loadMiniMyRequests()" class="text-xs text-blue-600 hover:underline flex items-center gap-1">
                            <i class="ph-bold ph-arrows-clockwise"></i>
                            <span>รีเฟรช</span>
                        </button>
                    </div>

                    <div id="miniMyRequestsEmpty" class="py-12 flex flex-col items-center justify-center text-center text-slate-400 gap-2 hidden">
                        <i class="ph-light ph-clipboard-text text-4xl text-slate-300"></i>
                        <div class="text-xs font-semibold text-slate-600">ไม่มีประวัติคำขอเบิก</div>
                        <div class="text-[11px] text-slate-400">เมื่อคุณส่งคำขอ รายการจะแสดงที่นี่</div>
                    </div>

                    <div id="miniMyRequestsList" class="flex flex-col gap-2.5"></div>
                </div>

                <!-- Tab 4: บัญชี (Account & Identity) -->
                <div id="miniTabAccount" class="flex flex-col gap-3 hidden">
                    <div class="bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center text-center gap-2">
                        <div class="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold">
                            <i class="ph-fill ph-user"></i>
                        </div>
                        <div>
                            <h4 id="miniAccountName" class="font-bold text-slate-900 text-sm">ครูผู้เบิกพัสดุ</h4>
                            <span id="miniAccountEmail" class="text-xs text-slate-500 font-mono">teacher@hrt.ac.th</span>
                        </div>
                        <div class="flex items-center gap-2 mt-1">
                            <span id="miniAccountRole" class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">TEACHER</span>
                            <span id="miniAccountDept" class="text-[11px] text-slate-600 font-medium">กลุ่มสาระฯ วิทยาศาสตร์และเทคโนโลยี</span>
                        </div>
                    </div>

                    <div class="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2 text-xs">
                        <div class="flex items-center justify-between py-1 border-b border-slate-100">
                            <span class="text-slate-500">สถานศึกษา</span>
                            <span class="font-semibold text-slate-800">โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)</span>
                        </div>
                        <div class="flex items-center justify-between py-1 border-b border-slate-100">
                            <span class="text-slate-500">สังกัด</span>
                            <span class="font-semibold text-slate-800">องค์การบริหารส่วนจังหวัดสระบุรี</span>
                        </div>
                        <div class="flex items-center justify-between py-1 border-b border-slate-100">
                            <span class="text-slate-500">ปีงบประมาณที่บันทึก</span>
                            <span class="font-bold text-blue-700 font-num">พ.ศ. 2569</span>
                        </div>
                        <div class="flex items-center justify-between py-1">
                            <span class="text-slate-500">สถานะบัญชี</span>
                            <span class="font-bold text-emerald-600">พร้อมใช้งาน (Active)</span>
                        </div>
                    </div>

                    <button type="button" onclick="showToast('ออกจากระบบเรียบร้อยแล้ว', 'info'); toggleMiniUi();" class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition">
                        ออกจากระบบ (Sign Out)
                    </button>
                </div>

            </div>

            <!-- MiniUI Bottom Navigation Bar (4 Menus) -->
            <div class="bg-white border-t border-slate-200 grid grid-cols-4 p-1.5 shadow-lg flex-shrink-0">
                <button type="button" id="miniNav_catalog" onclick="switchMiniTab('catalog')" class="mini-nav-btn flex flex-col items-center justify-center py-1.5 text-blue-600 font-bold text-[11px] transition">
                    <i class="ph-bold ph-package text-lg mb-0.5"></i>
                    <span>ขอเบิก</span>
                </button>
                <button type="button" id="miniNav_cart" onclick="switchMiniTab('cart')" class="mini-nav-btn flex flex-col items-center justify-center py-1.5 text-slate-400 text-[11px] transition relative">
                    <i class="ph-bold ph-shopping-cart text-lg mb-0.5"></i>
                    <span>ตะกร้า</span>
                    <span id="miniCartBadge" class="absolute top-1 right-5 bg-red-600 text-white font-bold rounded-full w-4 h-4 text-[9px] flex items-center justify-center hidden">0</span>
                </button>
                <button type="button" id="miniNav_myRequests" onclick="switchMiniTab('myRequests')" class="mini-nav-btn flex flex-col items-center justify-center py-1.5 text-slate-400 text-[11px] transition">
                    <i class="ph-bold ph-clock-counter-clockwise text-lg mb-0.5"></i>
                    <span>คำร้องของฉัน</span>
                </button>
                <button type="button" id="miniNav_account" onclick="switchMiniTab('account')" class="mini-nav-btn flex flex-col items-center justify-center py-1.5 text-slate-400 text-[11px] transition">
                    <i class="ph-bold ph-user-circle text-lg mb-0.5"></i>
                    <span>บัญชี</span>
                </button>
            </div>

        </div>
    </div>

    <!-- Floating MiniUI Quick Launcher Pill -->
    <div class="fixed bottom-4 right-4 z-40">
        <button type="button" onclick="toggleMiniUi()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-full shadow-lg flex items-center gap-2 border border-blue-400 active:scale-95 transition cursor-pointer">
            <i class="ph-fill ph-device-mobile text-base"></i>
            <span>โหมด MiniUI (ขอเบิก/QR)</span>
        </button>
    </div>
"""
        idx = content.rfind('</body>')
        if idx != -1:
            content = content[:idx] + mini_ui_html + content[idx:]
            print("Injected MiniUI overlay before </body>")

    # 2. Inject 8-Category Settings Navigation into viewSettings
    if 'id="setNav_school"' not in content:
        old_settings_header = '<h2 class="font-bold text-slate-900 text-xl">⚙ ตั้งค่าระบบและการเชื่อมต่อข้อมูล</h2>'
        if old_settings_header in content:
            new_nav_block = old_settings_header + """
                <p class="text-sm text-slate-500 mt-0.5">จัดการข้อมูลโครงสร้างสถานศึกษา ปีงบประมาณ สิทธิ์ผู้ใช้ และความปลอดภัย (8 หมวดหมู่)</p>
            </div>

            <!-- 8-Category Settings Tab Navigation -->
            <div class="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 text-xs">
                <button type="button" id="setNav_school" onclick="switchSettingsCategory('school')" class="settings-nav-btn px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold whitespace-nowrap flex items-center gap-1.5 transition">
                    <i class="ph-fill ph-graduation-cap"></i>
                    <span>1. ข้อมูลสถานศึกษา</span>
                </button>
                <button type="button" id="setNav_fiscal" onclick="switchSettingsCategory('fiscal')" class="settings-nav-btn px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 whitespace-nowrap flex items-center gap-1.5 transition">
                    <i class="ph-fill ph-calendar"></i>
                    <span>2. ปีงบประมาณ</span>
                </button>
                <button type="button" id="setNav_users" onclick="switchSettingsCategory('users')" class="settings-nav-btn px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 whitespace-nowrap flex items-center gap-1.5 transition">
                    <i class="ph-fill ph-users-three"></i>
                    <span>3. ผู้ใช้งานและสิทธิ์</span>
                </button>
                <button type="button" id="setNav_depts" onclick="switchSettingsCategory('depts')" class="settings-nav-btn px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 whitespace-nowrap flex items-center gap-1.5 transition">
                    <i class="ph-fill ph-buildings"></i>
                    <span>4. แผนก/กลุ่มสาระฯ</span>
                </button>
                <button type="button" id="setNav_warehouses" onclick="switchSettingsCategory('warehouses')" class="settings-nav-btn px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 whitespace-nowrap flex items-center gap-1.5 transition">
                    <i class="ph-fill ph-warehouse"></i>
                    <span>5. คลังและที่จัดเก็บ</span>
                </button>
                <button type="button" id="setNav_categories" onclick="switchSettingsCategory('categories')" class="settings-nav-btn px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 whitespace-nowrap flex items-center gap-1.5 transition">
                    <i class="ph-fill ph-tag"></i>
                    <span>6. หมวดหมู่พัสดุ</span>
                </button>
                <button type="button" id="setNav_system" onclick="switchSettingsCategory('system')" class="settings-nav-btn px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 whitespace-nowrap flex items-center gap-1.5 transition">
                    <i class="ph-fill ph-sliders"></i>
                    <span>7. การเชื่อมต่อและระบบ</span>
                </button>
                <button type="button" id="setNav_audit" onclick="switchSettingsCategory('audit')" class="settings-nav-btn px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 whitespace-nowrap flex items-center gap-1.5 transition">
                    <i class="ph-fill ph-shield-check"></i>
                    <span>8. บันทึกการตรวจสอบ</span>
                </button>
            </div>

            <!-- Settings Action Toolbar & Dirty Guard -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                <div class="flex items-center gap-2">
                    <span id="settingsDirtyIndicator" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                        การตั้งค่าตรงกับฐานข้อมูล
                    </span>
                    <span class="text-slate-500 text-[11px]">* บันทึกเฉพาะเมื่อมีสิทธิ์ผู้ดูแลระบบ (ADMIN)</span>
                </div>
                <button type="button" id="btnSaveSettings" onclick="saveSettingsChanges()" disabled class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg opacity-50 cursor-not-allowed transition flex items-center gap-1.5">
                    <i class="ph-bold ph-floppy-disk"></i>
                    <span>บันทึกการตั้งค่า</span>
                </button>
            </div>
            """
            # Replace old header line with new nav block
            content = content.replace(
                old_settings_header + '\n                <p class="text-sm text-slate-500 mt-0.5">จัดการข้อมูลเชิงเทคนิค แหล่งจัดเก็บข้อมูล และการสำรองข้อมูล (Progressive Disclosure Level 3)</p>\n            </div>',
                new_nav_block
            )
            print("Injected 8-Category Settings navigation into viewSettings")

    # 3. Add client helper functions in the script tag if not present
    if 'function simulateQrScan' not in content:
        script_helper = """
        function simulateQrScan() {
            const code = prompt('จำลองการสแกน QR Code (พิมพ์รหัสพัสดุ เช่น OFF-001 หรือ QR:ITEM:OFF-001):', 'OFF-001');
            if (!code) return;
            const targetCode = code.replace(/^(QR:ITEM:|ITEM:)/i, '').trim().toUpperCase();
            if (typeof addMiniCartItem === 'function') {
                addMiniCartItem(targetCode);
                switchMiniTab('cart');
            }
        }

        function handleMiniSearch(q) {
            const container = document.getElementById('miniCatalogList');
            if (!container) return;
            const query = (q || '').trim().toLowerCase();
            const items = (window.allData || []).filter(i => {
                if (!query) return true;
                return i.code.toLowerCase().includes(query) || i.name.toLowerCase().includes(query) || (i.category && i.category.toLowerCase().includes(query));
            }).slice(0, 25);

            container.innerHTML = items.map(it => `
                <div class="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm">
                    <div class="flex-1 min-w-0">
                        <span class="text-xs font-mono font-bold text-blue-600">${it.code}</span>
                        <h4 class="text-xs font-semibold text-slate-800 truncate">${it.name}</h4>
                        <div class="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>${it.category}</span>
                            <span>•</span>
                            <span class="${it.stock <= it.min ? 'text-amber-600 font-bold' : 'text-slate-500'}">คงเหลือ ${it.stock} ${it.unit}</span>
                        </div>
                    </div>
                    <button type="button" onclick="addMiniCartItem('${it.code}')" class="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg transition flex items-center gap-1 flex-shrink-0">
                        <i class="ph-bold ph-plus"></i>
                        <span>เบิก</span>
                    </button>
                </div>
            `).join('');
        }

        function saveSettingsChanges() {
            showToast('บันทึกการตั้งค่าเรียบร้อยแล้ว', 'success');
            window.isSettingsDirty = false;
            const btn = document.getElementById('btnSaveSettings');
            if (btn) {
                btn.disabled = true;
                btn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }
        """
        script_end_idx = content.rfind('</script>')
        if script_end_idx != -1:
            content = content[:script_end_idx] + script_helper + content[script_end_idx:]
            print("Injected helper functions into <script>")

    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("index.html patched successfully.")
    return True

if __name__ == '__main__':
    patch_index_html()
