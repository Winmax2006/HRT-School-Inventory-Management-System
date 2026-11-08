# บันทึกการตรวจรับรองบิลด์สะอาด (Clean Build Verification Report)
## ระบบบริหารจัดการพัสดุโรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) — รุ่น v2.7.0-rc.4 (Prompt 09)

เอกสารฉบับนี้จัดทำขึ้นเพื่อรับรองความบริสุทธิ์ของชุดไฟล์สำหรับขึ้นระบบ (Deployable Artifacts) ว่าปราศจากข้อมูลจำลอง มีค่าแฮชตรวจสอบความสมบูรณ์ที่ถูกต้อง และผ่านการทดสอบอัตโนมัติครบถ้วน 100%

---

### 1. ข้อมูลบิลด์และการควบคุมรุ่น (Build & Version Control Metadata)

- **ระบบ**: ระบบบริหารจัดการพัสดุโรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)
- **รุ่นมาตรฐานเป้าหมาย**: `v2.7.0` (Settings Hub, RBAC, MiniUI QR, Audit & Clean Architecture)
- **ประวัติศาสตร์อ้างอิง (Historical Baseline)**: `v2.6.0` (รุ่นสุดท้ายก่อน Clean File)
- **รุ่นรับเข้าจริง (Incoming Build)**: `v2.7.0-rc.3`
- **รุ่นส่งออกจริง (Outgoing Build)**: `v2.7.0-rc.4` *(ปรับเลื่อนตาม Semantic Pre-release จากการแก้ไขพฤติกรรมตัด Silent Mock Fallback และกำจัดข้อมูลจำลองออกจาก Live Runtime)*
- **สถานะการส่งมอบ (Release State)**: `STAGING_RELEASE_CANDIDATE_4`
- **สถานะการขึ้นระบบจริง (Production Status)**: **`BLOCKED`** *(ระงับการขึ้นระบบ Production ชั่วคราว เพื่อรอข้อมูลประจำตัวจริงจากผู้ดูแลระบบ)*

---

### 2. บัญชีไฟล์สำหรับขึ้นระบบและค่าแฮช SHA-256 (Deployable File Set & Hashes)

ชุดไฟล์สำหรับขึ้นระบบจริงประกอบด้วย **9 ไฟล์มาตรฐาน** เท่านั้น โดยผ่านการคำนวณค่าแฮช SHA-256 จริงจากดิสก์ดังนี้:

| ลำดับ | ชื่อไฟล์และพาธ | ขนาดไฟล์ (ไบต์) | ค่าแฮชตรวจสอบ SHA-256 | บทบาทในระบบจริง |
|:---:|---|:---:|---|---|
| 1 | `Config.gs` | 18,203 | `986B1E1F75976C22F30246053EC7A0967211A16E635853C5F829492E7EF8D6E0` | การกำหนดค่าระบบ สคีมา 16 ชีต และป้ายรุ่น `2.7.0-rc.4` |
| 2 | `Api.gs` | 32,194 | `E1DBDB76E8B60A7D8FA07C61229C06698D9FF31687CB25D03D19DB6348145B6D` | Universal Action Dispatcher และ Contract Router |
| 3 | `Read.gs` | 65,360 | `3115319C06998F8B432418F93EDA41E8B1DCD0F35576211099C161A655E6E182` | บริการอ่านข้อมูลพัสดุ บัญชีคุม และการตั้งค่า |
| 4 | `Write.gs` | 83,961 | `B665E4A098E270D782457E675D49515030D8979E61055CE38EC7C05BBF74A8C8` | บริการบันทึกข้อมูลธุรกรรม สต็อก และใบเบิก (Single SSOT Writer) |
| 5 | `Audit.gs` | 15,991 | `60993701BFC345AFA4D7D2F09FFCD15561BFE075ADD6C84B3ADFA8132C7609CA` | บริการบันทึกประวัติการเปลี่ยนแปลงและ SHA-256 Hash Chaining |
| 6 | `Code.gs` | 12,509 | `6134B3EA35E35F438146CA659A705B3019FCE67D95FBC8B7549942B7B890D53D` | ตัวเรนเดอร์ Web App (`doGet`) และการควบคุมความปลอดภัยหน้าเว็บ |
| 7 | `index.html` | 1,109,632 | `8556102B91DC0CF37BE4F671B6FAC2ACFA0CFD29DBD6ABEC547147CCF1136542` | แอปพลิเคชันหลักฝั่งฟรอนต์เอนด์ (สะอาด ปราศจาก mock data) |
| 8 | `frontend/main/App.js` | 151,862 | `CAA8715DFC2751292D523C499E4C968B3671FBA35AA869E44C9A75CC260F7E63` | คอนโทรลเลอร์กลางฝั่งฟรอนต์เอนด์ (สอดคล้องกับ index.html) |
| 9 | `frontend/pages/Settings.html` | 100,193 | `DCEB621EEF75574E918508046F9955AB959D4A222933CB44CC19A21B76CDC7E8` | ส่วนติดต่อผู้ใช้หน้าศูนย์การตั้งค่าระบบ (Settings Hub) |

---

### 3. บัญชีรายการไฟล์ที่ถูกกันออกจากการขึ้นระบบ (Exclusion Manifest)

ไฟล์ต่อไปนี้จัดทำขึ้นเพื่อการทดสอบ การจำลอง หรือเป็นเอกสารอ้างอิง และ**จะต้องไม่ถูกรวมเข้าสู่การ Deploy จริงบน Production Web App**:

1. โฟลเดอร์ `tests/` ทั้งหมด:
   - `tests/fixtures/*` (ไฟล์ JSON ข้อมูลสังเคราะห์)
   - `tests/adapters/*` (ตัวแปลง In-Memory Repository)
   - `tests/*.js` (ชุดทดสอบทั้ง 8 ชุด)
2. ไฟล์โหมดสาธิต:
   - `demo.html` (สำหรับทดสอบ Standalone Preview ในเครื่องเท่านั้น)
   - `scripts/build_demo_html.js`
3. สคริปต์ช่วยการพัฒนาใน `scripts/`
4. ไฟล์เอกสารประกอบใน `docs/`
5. ไฟล์สำรองเก่าใน `backups/` และไฟล์คลังบีบอัด (`.rar`, `.zip`)

---

### 4. รายงานการตรวจสอบการรั่วไหล (Static Code Leak Check)

| รายการตรวจสอบ | วิธีการทดสอบ | ผลลัพธ์ที่พบ | สถานะ |
|---|---|---|:---:|
| ข้อมูลพัสดุตัวอย่างในรันไทม์จริง | ค้นหา `กระดาษถ่ายเอกสาร A4 80 แกรม Idea Work` และ `rawMasterItems` ใน `index.html` / `App.js` | พบ `const rawMasterItems = [];` เป็นอาเรย์ว่างเปล่า 100% | **ผ่าน (CLEAN)** |
| อัตลักษณ์ตัวตนจำลอง `USR-ANANT-01` | ค้นหาคำว่า `USR-ANANT-01` ทั่วทั้งโค้ดฝั่งฟรอนต์เอนด์ | ไม่พบคำว่า `USR-ANANT-01` หลงเหลือในรันไทม์จริง | **ผ่าน (CLEAN)** |
| การจำลองผลสำเร็จเงียบ (Silent Fallback) | ค้นหา `mockDispatcher` และการตอบผลสำเร็จเมื่อไม่มี GAS ใน `ApiService` | ตัดทิ้งแล้ว; ส่งคืน `BACKEND_UNAVAILABLE` ทันที | **ผ่าน (CLEAN)** |
| การแอบบันทึกข้อมูลจำลองลง Storage | ตรวจสอบการใช้งาน `localStorage` และ `sessionStorage` ในหน้าโหลดเริ่มต้น | มีเฉพาะคีย์คอนฟิก UI (`hrt_active_tab`, `hrt_sidebar_collapsed`) | **ผ่าน (CLEAN)** |
| การบายพาสสิทธิ์ผ่านพารามิเตอร์ URL | ตรวจสอบคำสั่งอ่าน `window.location.search` เพื่อเปลี่ยนสิทธิ์ | ไม่มีการอ่านสิทธิ์จาก URL; อ่านผ่าน RPC บนเซิร์ฟเวอร์เท่านั้น | **ผ่าน (CLEAN)** |

---

### 5. สรุปผลการรันชุดทดสอบความสมบูรณ์ (Test Execution Summary)

```
==================================================
SUMMARY OF ALL 8 TEST SUITES (82/82 TESTS PASSED)
==================================================
1. tests/regression_test_suite.js               : 11/11 PASS (100%)
2. tests/p1_p2_contract_lifecycle_test.js       : 10/10 PASS (100%)
3. tests/p3_miniui_critical_test.js             : 11/11 PASS (100%)
4. tests/p4_settings_important_test.js          : 10/10 PASS (100%)
5. tests/p6_acceptance_suite.js                 : 10/10 PASS (100%)
6. tests/p7_settings_comprehensive_test.js      : 10/10 PASS (100%)
7. tests/p8_backend_sheets_architecture_test.js : 10/10 PASS (100%)
8. tests/p9_clean_separation_test.js            : 10/10 PASS (100%)
--------------------------------------------------
TOTAL AUTOMATED TESTS : 82
PASSED                : 82
FAILED                : 0
PASS RATE             : 100.0%
==================================================
```
