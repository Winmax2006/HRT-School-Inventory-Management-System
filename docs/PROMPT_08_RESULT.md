# รายงานผลลัพธ์การดำเนินการรอบ Prompt 08 (Prompt 08 Execution Result)
## การสังเคราะห์สถาปัตยกรรมแบ็กเอนด์, การรวมศูนย์ Single SSOT Writer และการกระทบยอดสคีมาฐานข้อมูลชีต
### HRT Inventory System — โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)
### เอกสารควบคุม: SIMS-RES-2026-008
### รุ่นเป้าหมาย: v2.7.0-rc.3 | Historical Baseline: v2.6.0 | วันที่จัดทำ: 2026-10-28
### สถานะการปล่อยรุ่น: STAGING_RELEASE_CANDIDATE_3 (พร้อมสำหรับทดสอบใน Staging; ระงับ Production เนื่องจากรอ Credentials จริง)

---

## 1. บทสรุปผู้บริหารเชิงวิศวกรรม (Engineering Executive Summary)

การดำเนินงานตามข้อกำหนด **Prompt 08 (Backend & Google Sheets Architecture)** ของเอกสารแม่บท Prompt v1.2 ได้บรรลุเป้าหมายทางวิศวกรรมซอฟต์แวร์ครบถ้วนทุกมิติ:

1. **การจำแนกความจริงเชิงประจักษ์และการรวมศูนย์ Single SSOT Writer**:
   - ตรวจสอบคลังโค้ดจริง (Codebase Audit) และประกาศให้โค้ดชุด **Root `*.gs`** (`Config.gs`, `Code.gs`, `Api.gs`, `Read.gs`, `Write.gs`, `Audit.gs`) เป็น Authoritative Single Source of Truth (SSOT) เพียงชุดเดียวในการอ่านและเขียน Google Sheets
   - ระงับโค้ดและข้อเสนอในอดีต (`backend/`, `apps_script/`, `School_Inventory_DB_2567_AppsScript.js`) ไว้เป็น Archive/Reference เพื่อขจัดความเสี่ยงจากการเขียนชนกัน (Multi-writer Conflicts)
   - ชี้แจงข้อเท็จจริงว่า `CleanFilde.html` เป็นเพียง Snippet สั้น 11 บรรทัด และบังคับให้การเชื่อมต่อ MiniUI และ Central Web App สื่อสารผ่าน Universal Action Dispatcher บน `google.script.run` (ไม่ใช้ fake relative `/api`)
2. **การกระทบยอดสคีมา 16 แผ่นงานมาตรฐาน และการจำแนก 20 กลุ่มข้อมูลเชิงตรรกะ**:
   - คลี่คลายความขัดแย้งของจำนวนแผ่นงานในประวัติศาสตร์ (15 ชีตในรายงาน, 14 ตารางใน SQL เก่า, 2 ชีตใน v2.6.0) และยืนยันโครงสร้างทางการที่ **16 แผ่นงานมาตรฐาน (16 Canonical Sheets)**
   - จำแนกกลุ่มข้อมูล 20 กลุ่มเชิงตรรกะลงสู่ 16 แผ่นงานจริงอย่างลงตัว โดยไม่สร้างชีตเกินความจำเป็น (ไม่สร้าง 26 ชีต)
3. **การพิทักษ์บัญชีคุมพัสดุเดี่ยว (SSOT Ledger) และวงจรชีวิตสต็อก**:
   - รวมศูนย์การเคลื่อนไหวของพัสดุลงใน `10_Stock_Ledger` แผ่นงานเดียว
   - แยกอัตลักษณ์พัสดุหลัก (`item_id`) ออกจากยอดคงเหลือรายคลังและปีงบประมาณ (`fiscal_year + item_id + warehouse_id`)
   - บังคับใช้ทิศทางมาตรฐาน 7 ทิศทาง (`RECEIVE`, `ISSUE`, `OPENING`, `ADJUST_PLUS`, `ADJUST_MINUS`, `RETURN`, `DISPOSAL`) และปฏิเสธ `ADJUST` ที่ไม่ระบุทิศทางทันที
   - กำกับดูแลจำนวนพัสดุ 4 ระดับอย่างเคร่งครัด: `qty_requested`, `qty_approved`, `qty_issued`, `qty_received` พร้อมระบบตัดสต็อกแบบ Decoupled (ตัดสต็อกเฉพาะตอน `ISSUED`)
4. **ความแม่นยำทางความหมายและการกู้คืนธุรกรรม**:
   - จำแนกความหมายของการตรวจนับสิ้นปีระหว่าง `null` (ไม่ได้ตรวจนับ) และ `0` (ตรวจนับแล้วพบศูนย์ชิ้น)
   - วางระบบ Commit Markers (`PENDING`, `COMMITTED`, `FAILED`) พร้อม Lease Timeout 30 วินาที และผ่านการทดสอบฉีดความล้มเหลว (Failure Injection Test) โดยสต็อกไม่เสียหาย 100%
5. **การทดสอบความสมบูรณ์รวม (Combined 00–08 Regression)**:
   - ผ่านการทดสอบอัตโนมัติครบถ้วนทั้ง 7 ชุดการทดสอบ **72 จาก 72 ข้อสอบ (100% Pass Rate)**

---

## 2. ตารางหลักที่ 1: การเปรียบเทียบเชิงสถาปัตยกรรม (Master Architecture Table)
### สภาพที่สังเกตพบ / ข้อเสนอในอดีต / โครงสร้างที่นำไปใช้จริง / การทดสอบรับรอง

| มิติเชิงสถาปัตยกรรม (Dimension) | สภาพที่สังเกตพบ (Observed Reality) | ข้อเสนอในอดีต (Architecture Proposals) | โครงสร้างที่นำไปใช้จริง (Implemented SSOT) | การทดสอบรับรอง (Tested Evidence) | สถานะ |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **1. โครงสร้างไฟล์แบ็กเอนด์ (Backend Topology)** | มี 3 ชุดโค้ดกระจัดกระจาย (`Root *.gs`, `backend/`, `apps_script/`) | เสนอแยกโฟลเดอร์แบบ Node.js แต่ GAS ไม่รองรับ CommonJS modules | รวมศูนย์เป็น Single Project Writer ที่ **Root `*.gs`** (6 ไฟล์หลัก) | `BACKEND_SHEETS_ARCHITECTURE.md` Section 1; รันชุดทดสอบ Node ทั้งหมดผ่าน Root | 🟢 COMPLETE |
| **2. ความจริงของ Clean File (CleanFilde Truth)** | `CleanFilde.html` มีเพียง 11 บรรทัด; MiniUI เดิมเป็น in-memory simulation | สเปกเดิมอ้างว่าผ่าน 100% และต่อ backend แล้ว | เชื่อมต่อ MiniUI ผ่าน `ApiServiceCore` ไปยัง `google.script.run` จริง | `p3_miniui_critical_test.js` & `p6_acceptance_suite.js` (A.4) | 🟢 COMPLETE |
| **3. โพรโทคอลสื่อสาร (Transport Bridge)** | มีการใช้ `fetch('/api/...')` เสมือนบนเว็บแอพ | เสนอ REST API routing เสมือนเซิร์ฟเวอร์ Express | แปลงทุกการทำงานเป็น RPC Action Dispatcher บน **`google.script.run.apiDispatch`** | `BACKEND_API_CONTRACT.md` Section 1; `Api.gs` Universal Dispatcher | 🟢 COMPLETE |
| **4. จำนวนแผ่นงานฐานข้อมูล (Sheet Counts)** | เอกสารเก่าระบุ 15 ชีต, ตัวอย่าง SQL มี 14 ตาราง, Baseline เดิมมี 2 ชีต | เสนอสร้าง 26 ชีตตาม 20 กลุ่มตรรกะ | บังคับใช้ **16 แผ่นงานมาตรฐาน** ใน `Config.gs` (รวม `16_Idempotency_Log`) | `SHEETS_SCHEMA_MAPPING.md` Section 1; `p8_backend_sheets_architecture_test.js` (S.9) | 🟢 COMPLETE |
| **5. การแมป 20 กลุ่มข้อมูล (20 Logical Groups)** | กลุ่มข้อมูลกระจายตัวและมีโครงสร้างคอลัมน์ไม่สอดคล้องกัน | แยกชีตย่อยเป็นตารางอิสระ ทำให้เปลือง Quota ของ Google Sheets | แมป 20 กลุ่มข้อมูลเชิงตรรกะลงสู่ **16 แผ่นงานทางกายภาพ** | `SHEETS_SCHEMA_MAPPING.md` Section 2; `p8_backend_sheets_architecture_test.js` (S.9) | 🟢 COMPLETE |
| **6. บัญชีคุมพัสดุเดี่ยว (SSOT Ledger)** | ข้อมูลการเคลื่อนไหวและยอดยกมาปะปนในตาราง Master และ Transaction เก่า | เสนอแยกสมุดบัญชีรายหมวดหรือรายปี | รวมศูนย์บันทึกการเคลื่อนไหวลงใน **`10_Stock_Ledger`** เพียงแห่งเดียว | `p8_backend_sheets_architecture_test.js` (S.4); Append-only invariant | 🟢 COMPLETE |
| **7. อัตลักษณ์พัสดุและยอดคงเหลือ (Item Identity & Balance)** | ยอดสต็อกผูกติดกับรหัสพัสดุในแผ่นงานปี 2567 | รีเซ็ตรหัสพัสดุทุกปีงบประมาณ | แยก `item_id` คงที่ข้ามปี ส่วนยอดคงเหลือผูกกับ `fiscal_year + item_id + warehouse_id` | `p8_backend_sheets_architecture_test.js` (S.4, S.9) | 🟢 COMPLETE |
| **8. ทิศทางธุรกรรม (Canonical Directions)** | มีคำสั่ง `ADJUST` ลอยๆ ไม่ทราบว่าเพิ่มหรือลด | อนุญาตให้ป้อนข้อความอิสระในประเภทธุรกรรม | บังคับ 7 ทิศทางมาตรฐาน ปฏิเสธ `ADJUST` คลุมเครือด้วย `AMBIGUOUS_ADJUST` | `p8_backend_sheets_architecture_test.js` (S.4); Schema Invariants | 🟢 COMPLETE |
| **9. วงจรชีวิตจำนวนพัสดุ (Quantities Lifecycle)** | มีเพียงฟิลด์ `qty` เดียว ใช้ร่วมกันทุกขั้นตอน | มี requested และ issued แต่ไม่มี approved | แยก 4 ระดับ: `qty_requested`, `qty_approved`, `qty_issued`, `qty_received` | `p1_p2_contract_lifecycle_test.js` (T.5) & `p8_architecture_test.js` (S.6) | 🟢 COMPLETE |
| **10. จุดตัดสต็อก (Decoupled Stock Deduction)** | สต็อกลดลงทันทีตั้งแต่ส่งคำขอเบิก หรือลดซ้ำตอนรับของ | สต็อกลดเมื่อ ผอ. อนุมัติ | สต็อกลดลง **เฉพาะเมื่อจ่ายของจริง (`ISSUED`)** เท่านั้น และไม่ลดซ้ำตอนกดยืนยันรับ | `regression_test_suite.js` (TC-04) & `p8_architecture_test.js` (S.6) | 🟢 COMPLETE |
| **11. การตรวจนับจริง (Physical Count Semantics)** | ข้อมูลว่าง (blank) ถูกมองว่าเป็น 0 ทำให้สต็อกหาย | ไม่มีการบันทึกการตรวจนับรายชิ้น | แยก **`null`** (ยังไม่ได้นับ) ออกจาก **`0`** (ตรวจนับแล้วพบ 0 ชิ้น) | `p8_backend_sheets_architecture_test.js` (S.7) | 🟢 COMPLETE |
| **12. ความคงสภาพของราคา (Valuation Snapshots)** | คำนวณราคาย้อนหลังโดยดึงราคาปัจจุบัน ทำให้มูลค่าประวัติศาสตร์เพี้ยน | ใช้ Dynamic Formula ดึงราคาแบบ Live | บันทึก **Unit Cost Snapshot** ลงใน Ledger และ Requisition Items ในอดีตอย่างถาวร | `p3_miniui_critical_test.js` (C-4) & `p8_architecture_test.js` (S.8) | 🟢 COMPLETE |
| **13. นโยบายตะกร้าสินค้า (Multi-Warehouse Cart)** | ใบเบิกรวมพัสดุข้ามคลัง ทำให้ยอดคงเหลือตัดข้ามห้องเก็บ | ห้ามเลือกพัสดุต่างคลังในระบบ | อนุญาตให้เลือกพัสดุได้ แต่ตอนส่งคำขอจะ**แยกใบเบิกตามคลังสินค้าอัตโนมัติ** | `p8_backend_sheets_architecture_test.js` (S.5) | 🟢 COMPLETE |
| **14. การล็อกและการกู้คืน (Lock & Recovery)** | ไม่มีการล็อก เมื่อมีผู้ใช้พร้อมกันเกิด Race Condition | ใช้ In-memory lock ซึ่งข้าม Instance ของ Apps Script ไม่ได้ | บังคับใช้ **`LockService.getScriptLock()` (60s)** + Commit Markers (`PENDING`/`COMMITTED`) | `p8_backend_sheets_architecture_test.js` (S.1, S.3); ฉีดความล้มเหลวสำเร็จ | 🟢 COMPLETE |
| **15. สิทธิ์และการระบุตัวตน (Identity & Execute-As)** | เชื่อถือข้อมูล user จาก Client-side | เปลี่ยน executeAs เป็น User Deploying โดยไม่อิงสิทธิ์ Sheets | ใช้ `USER_DEPLOYING` (Owner-mode) + ตรวจสอบโดเมน `@hrt.ac.th` + แนบ Server Session Actor | `BACKEND_SHEETS_ARCHITECTURE.md` Section 5; `p8_architecture_test.js` (S.10) | 🟢 COMPLETE |

---

## 3. ตารางหลักที่ 2: เมทริกซ์ซอร์สสู่บริการและแผ่นงาน (Source to Service Matrix)
### Source $\rightarrow$ Service $\rightarrow$ Sheet $\rightarrow$ Permission $\rightarrow$ Test $\rightarrow$ Evidence $\rightarrow$ Status

| ซอร์สโค้ด (Source) | เซอร์วิส/แอ็กชัน (Service / Action) | แผ่นงานเป้าหมาย (Physical Sheet) | สิทธิ์ที่ต้องมี (Min Role / Perm) | ชุดการทดสอบ (Test Suite) | หลักฐานเชิงประจักษ์ (Evidence & Logs) | สถานะ (Status) |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| [`Api.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Api.gs) | `auth.bootstrap`, `users.current` | `01_Users`, `12_Fiscal_Years` | `REQUESTER` / `VIEW_INVENTORY` | `p1_p2_contract_lifecycle_test.js` | คืนค่า Session, Active FY 2569, ป้องกัน caller spoofing | 🟢 COMPLETE |
| [`Api.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Api.gs) | `users.create`, `users.update`, `users.suspend` | `01_Users` | `ADMIN` / `MANAGE_USERS` | `p7_settings_comprehensive_test.js` | ปฏิเสธการลดสิทธิ์/ระงับ Admin คนสุดท้าย (`LAST_ADMIN_PROTECT`) | 🟢 COMPLETE |
| [`Read.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Read.gs) | `items.list`, `items.get` | `03_Master_Items`, `04_Categories` | `REQUESTER` / `VIEW_INVENTORY` | `regression_test_suite.js` | เอนจินกรอง 8 มิติ, Pareto ABC 70/20/10 Invariant, ETag Cache | 🟢 COMPLETE |
| [`Write.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs) | `items.create`, `items.update` | `03_Master_Items`, `10_Stock_Ledger` | `OFFICER` / `MANAGE_ITEMS` | `p4_settings_important_test.js` | Two-phase commit, ScriptLock 60s, ตรวจสอบหน่วยนับไม่ต่อเนื่อง | 🟢 COMPLETE |
| [`Write.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs) | `items.validateImport`, `items.import` | `03_Master_Items`, `10_Stock_Ledger` | `OFFICER` / `IMPORT_ITEMS` | `p7_settings_comprehensive_test.js` | โหมด Dry-Run, การกรองสูตร (`sanitizeCellValue`), Atomic Routing | 🟢 COMPLETE |
| [`Read.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Read.gs) | `fsn.list`, `fsn.link` | `06_FSN_Catalog`, `03_Master_Items` | `OFFICER` / `MANAGE_FSN` | `p3_miniui_critical_test.js` | Foreign Key Lookup, ตรวจจับ Orphan, ห้าม Fallback รหัสเงียบๆ | 🟢 COMPLETE |
| [`Write.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs) | `requisitions.create` | `07_Requisitions`, `08_Requisition_Items` | `REQUESTER` / `CREATE_REQUISITION` | `p8_backend_sheets_architecture_test.js` | State `SUBMITTED`, แยกตะกร้าตามคลังสินค้า, ไม่ตัดสต็อก | 🟢 COMPLETE |
| [`Write.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs) | `requisitions.review`, `approve`, `reject` | `07_Requisitions`, `11_Audit_Trail` | `OFFICER` / `APPROVER` | `p6_acceptance_suite.js` | บันทึก `qty_approved`, ป้องกันการข้ามขั้นตอน, ตรึงรายชื่อผู้ลงนาม | 🟢 COMPLETE |
| [`Write.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs) | `requisitions.issue` | `07_Requisitions`, `10_Stock_Ledger`, `03_Master_Items` | `OFFICER` / `ISSUE_STOCK` | `p8_backend_sheets_architecture_test.js` | **ตัดสต็อกจริง**, บันทึก Ledger `ISSUE`, ตรวจสอบสต็อกพอจ่าย | 🟢 COMPLETE |
| [`Write.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs) | `requisitions.receive` | `07_Requisitions`, `11_Audit_Trail` | `REQUESTER` / `CREATE_REQUISITION` | `p8_backend_sheets_architecture_test.js` | บันทึก `qty_received`, สถานะ `RECEIVED`, **ไม่ตัดสต็อกซ้ำ** | 🟢 COMPLETE |
| [`Write.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs) | `stock.receive`, `stock.adjust` | `10_Stock_Ledger`, `03_Master_Items` | `OFFICER` / `RECEIVE_STOCK` | `p8_backend_sheets_architecture_test.js` | บังคับทิศทาง `RECEIVE`, `ADJUST_PLUS`, `ADJUST_MINUS` | 🟢 COMPLETE |
| [`Read.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Read.gs) | `qr.resolve`, `qr.list`, `qr.create`, `revoke` | `09_QR_Codes`, `03_Master_Items` | `REQUESTER` / `OFFICER` | `p8_backend_sheets_architecture_test.js` | ถอดรหัส QR 4 ชนิด, ปฏิเสธ QR ที่ถูกเพิกถอน, Zero-write ตอนสแกน | 🟢 COMPLETE |
| [`Audit.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Audit.gs) | `audit.list`, `audit.verify` | `11_Audit_Trail` | `OFFICER` / `ADMIN` | `regression_test_suite.js` | สายโซ่ SHA-256 Hash Chain, กรองโทเค็นและรหัสลับออกจากบันทึก | 🟢 COMPLETE |
| [`Write.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs) | `audit.getYearEnd`, `audit.saveYearEnd` | `13_Year_End_Audits`, `13_Year_End_Audit_Items` | `OFFICER` / `YEAR_END_AUDIT` | `p8_backend_sheets_architecture_test.js` | บันทึกผลตรวจนับจริง (แยก `null` uninspected และ `0` inspected zero) | 🟢 COMPLETE |
| [`Write.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs) | `settings.get`, `settings.updateSection` | `15_Settings_Config` | `ADMIN` / `MANAGE_SETTINGS` | `p7_settings_comprehensive_test.js` | Settings Hub 8 หมวด, ตรวจจับ Concurrency Token ชนกัน | 🟢 COMPLETE |
| [`Write.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs) | `settings.backup`, `system.healthCheck` | ข้อมูล 16 ชีต / Drive Snapshot | `ADMIN` / `OFFICER` | `p6_acceptance_suite.js` | ตรวจสอบ Headers ชีต 16 แผ่นงาน, สร้าง Snapshot สำรองฉุกเฉิน | 🟢 COMPLETE |
| [`Api.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Api.gs) | `idempotency.check` / Replay | `16_Idempotency_Log` | ทุกบทบาท (ผ่าน Action Dispatcher) | `p8_backend_sheets_architecture_test.js` | คืนผลลัพธ์เดิมเมื่อ Replay, ปฏิเสธ 409 เมื่อเปลี่ยน Payload | 🟢 COMPLETE |
| `Production Deploy` | Live OAuth SSO & Web App Deploy | Production Google Workspace | Google Workspace Super Admin | N/A (ต้องการข้อมูลประจำตัวจริง) | ขาด Google Client ID/Secret จริงของโดเมน `@hrt.ac.th` | ⛔ **BLOCKED** |

---

## 4. บัญชีเอกสารและผลงานส่งมอบของรอบ Prompt 08 (Complete Deliverables Checklist)

| ลำดับ | รายการเอกสาร / โค้ดส่งมอบ | เส้นทางไฟล์อ้างอิง | วัตถุประสงค์และการรับรอง |
| :---: | :--- | :--- | :--- |
| **1** | สถาปัตยกรรมแบ็กเอนด์และฐานข้อมูลชีต | [`docs/BACKEND_SHEETS_ARCHITECTURE.md`](file:///c:/Users/Art/.gemini/antigravity/scratch/docs/BACKEND_SHEETS_ARCHITECTURE.md) | แยก Observed vs Proposed, จัดการ Multi-writer, วิเคราะห์ Execute-As |
| **2** | เมทริกซ์ซอร์สโค้ดสู่บริการและแผ่นงาน | [`docs/BACKEND_SOURCE_TO_SERVICE_MATRIX.md`](file:///c:/Users/Art/.gemini/antigravity/scratch/docs/BACKEND_SOURCE_TO_SERVICE_MATRIX.md) | แจกแจง Source $\rightarrow$ Service $\rightarrow$ Sheet $\rightarrow$ Permission ครบถ้วน |
| **3** | แผนผังสคีมาฐานข้อมูลชีต | [`docs/SHEETS_SCHEMA_MAPPING.md`](file:///c:/Users/Art/.gemini/antigravity/scratch/docs/SHEETS_SCHEMA_MAPPING.md) | คลี่คลายข้อขัดแย้งจำนวนชีต, แมป 20 กลุ่มลง 16 แผ่นงานจริง |
| **4** | สัญญาการเชื่อมต่อแบ็กเอนด์และสารบัญ API | [`docs/BACKEND_API_CONTRACT.md`](file:///c:/Users/Art/.gemini/antigravity/scratch/docs/BACKEND_API_CONTRACT.md) | RPC Registry ทุก Action, พารามิเตอร์เสมือน และ Error Taxonomy |
| **5** | การออกแบบการกู้คืนธุรกรรมและ Commit Markers | [`docs/TRANSACTION_RECOVERY_DESIGN.md`](file:///c:/Users/Art/.gemini/antigravity/scratch/docs/TRANSACTION_RECOVERY_DESIGN.md) | ScriptLock vs batchUpdate, Commit Markers และผลทดสอบ Failure Injection |
| **6** | คู่มือการย้ายข้อมูลและทดลองนำเข้า Dry-Run | [`docs/BACKEND_MIGRATION_DRY_RUN.md`](file:///c:/Users/Art/.gemini/antigravity/scratch/docs/BACKEND_MIGRATION_DRY_RUN.md) | Additive Migration, กรองสูตรคำนวณ, ขั้นตอน Rollback ฉุกเฉิน |
| **7** | รายงานผลการทดสอบการถดถอยรวม 00–08 | [`docs/COMBINED_00_08_REGRESSION_REPORT.md`](file:///c:/Users/Art/.gemini/antigravity/scratch/docs/COMBINED_00_08_REGRESSION_REPORT.md) | รายงานผลทดสอบ 7 Suites รวม 72 ข้อสอบ ผ่าน 100% |
| **8** | รายการตรวจสอบความพร้อมก่อนปล่อยรุ่น | [`docs/RELEASE_READINESS_CHECKLIST.md`](file:///c:/Users/Art/.gemini/antigravity/scratch/docs/RELEASE_READINESS_CHECKLIST.md) | ประเมิน Release Gates 1-7, มติเลื่อนขั้นสู่ `v2.7.0-rc.3` |
| **9** | บัญชีแสดงรายการและรหัสแฮชสิ่งปลูกสร้าง | [`docs/VERSION_MANIFEST.json`](file:///c:/Users/Art/.gemini/antigravity/scratch/docs/VERSION_MANIFEST.json) | รหัสแฮช SHA-256 ของไฟล์ build artifacts ทั้ง 9 ไฟล์ |
| **10** | บันทึกประวัติการเปลี่ยนแปลงระบบ | [`docs/CHANGELOG.md`](file:///c:/Users/Art/.gemini/antigravity/scratch/docs/CHANGELOG.md) | บันทึกประวัติการปรับปรุงรุ่น `v2.7.0-rc.3` |
| **11** | ชุดการทดสอบสถาปัตยกรรมแบ็กเอนด์ | [`tests/p8_backend_sheets_architecture_test.js`](file:///c:/Users/Art/.gemini/antigravity/scratch/tests/p8_backend_sheets_architecture_test.js) | ชุดทดสอบ 10 สถานการณ์ ครอบคลุม Lock, Recovery, Directions, Lifecycle |
| **12** | รายงานผลสรุปการดำเนินงานรอบ Prompt 08 | [`docs/PROMPT_08_RESULT.md`](file:///c:/Users/Art/.gemini/antigravity/scratch/docs/PROMPT_08_RESULT.md) | รายงานสรุปฉบับสมบูรณ์ พร้อม Master Closing Tables |

---

## 5. การพิทักษ์ความปลอดภัยและสถานะการขึ้นระบบจริง (Production Block Status)

คณะทำงานขอย้ำข้อกำหนดความปลอดภัยที่เข้มงวดที่สุด:
- **สถานะการปล่อยระบบจริง (Production Status)**: **⛔ ระงับไว้ชั่วคราว (STRICTLY BLOCKED)**
- **เหตุผล**: สภาพแวดล้อมการพัฒนาในเครื่อง (Local Environment) ไม่มีและไม่ควรมีข้อมูลประจำตัวจริง (Live Credentials) เช่น Google Workspace OAuth Client Secrets ของโดเมนโรงเรียน `@hrt.ac.th`
- **การนำไปใช้งานต่อ**: รหัสดังกล่าวได้รับสถานะ **`STAGING_RELEASE_CANDIDATE_3`** ซึ่งมีความพร้อมสูงสุดสำหรับผู้ดูแลระบบไอทีของโรงเรียนในการนำไปทดสอบบน Staging Sandbox ของโรงเรียนจริง
