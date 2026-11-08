const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const targetDropdown = `                    <!-- Role Dropdown Menu (Floating UI - Keeps Elevation Shadow) -->
                    <div id="roleDropdownMenu" class="hidden absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 text-xs">
                        <div class="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                            <span class="font-bold text-slate-500 uppercase text-[10px]">สลับบทบาทผู้ใช้ (RBAC)</span>
                            <span class="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-bold">2 กลุ่มหลัก</span>
                        </div>
                        <button type="button" onclick="setUserRole('officer')" class="w-full px-3 py-2 text-left flex items-start gap-2.5 hover:bg-blue-50 transition border-b border-slate-50">
                            <i class="ph-fill ph-shield-check text-blue-600 text-base mt-0.5"></i>
                            <div>
                                <div class="font-bold text-slate-800 flex items-center gap-1">
                                    <span>เจ้าหน้าที่พัสดุและผู้บริหาร</span>
                                    <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                                </div>
                                <div class="text-[10px] text-slate-500 mt-0.5">สิทธิ์เต็ม: รับเข้า, อนุมัติ, ตรวจนับ, ปิดบัญชี, ตั้งค่า</div>
                            </div>
                        </button>
                        <button type="button" onclick="setUserRole('teacher')" class="w-full px-3 py-2 text-left flex items-start gap-2.5 hover:bg-emerald-50 transition">
                            <i class="ph-fill ph-chalkboard-teacher text-emerald-600 text-base mt-0.5"></i>
                            <div>
                                <div class="font-bold text-slate-800">กลุ่มครูและบุคลากร</div>
                                <div class="text-[10px] text-slate-500 mt-0.5">สิทธิ์จำกัด: ดูพัสดุ, ทำเรื่องขอเบิก, ดูประวัติการเบิก</div>
                            </div>
                        </button>
                    </div>`;

const newDropdown = `                    <!-- Real Authenticated Account Menu -->
                    <div id="roleDropdownMenu" class="hidden absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-50 text-xs">
                        <div class="px-4 py-2 border-b border-slate-100">
                            <span class="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">บัญชีผู้ใช้งานที่เข้าสู่ระบบ</span>
                            <div class="font-bold text-slate-800 text-sm mt-0.5" id="profileMenuName">ผู้ใช้งาน</div>
                            <div class="text-slate-500 font-mono text-[11px]" id="profileMenuEmail">user@hrt.ac.th</div>
                        </div>
                        <div class="p-2 space-y-1">
                            <a href="?view=mini" class="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition">
                                <i class="ph-bold ph-device-mobile text-blue-600 text-base"></i>
                                <div>
                                    <div class="font-bold text-xs">เปิดหน้าขอเบิกพัสดุ (MiniUI)</div>
                                    <div class="text-[10px] text-slate-400">มุมมองมือถือสำหรับครูผู้ขอเบิก</div>
                                </div>
                            </a>
                            <button type="button" onclick="executeGoogleSignOut()" class="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 hover:bg-rose-50 text-rose-600 transition text-left cursor-pointer">
                                <i class="ph-bold ph-sign-out text-rose-600 text-base"></i>
                                <div>
                                    <div class="font-bold text-xs">ออกจากระบบ (Sign Out)</div>
                                    <div class="text-[10px] text-rose-400">ปิดการทำงานและกลับสู่หน้าล็อกอิน</div>
                                </div>
                            </button>
                        </div>
                    </div>`;

if (content.includes(targetDropdown)) {
  content = content.replace(targetDropdown, newDropdown);
  fs.writeFileSync('index.html', content, 'utf8');
  console.log('Account Menu patched successfully!');
} else {
  console.log('Target dropdown still not found');
}
