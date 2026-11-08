# ตารางสอบย้อนความครบถ้วนของระบบ (System Traceability Matrix)
## ระบบบริหารจัดการพัสดุโรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) — หลังรอบงาน Prompt 00–09
**บทบาทผู้ตรวจสอบ:** ผู้ตรวจประเมินระบบอิสระและวิศวกรประกันคุณภาพซอฟต์แวร์ (Independent System Auditor & Lead QA)  
**รหัสเอกสาร:** `docs/POST_PROMPT09_TRACEABILITY_MATRIX.md`  
**สถานะการควบคุมรุ่น:** Canonical `2.7.0-rc.4` | Git Commit: `dd000c0`  

---

### 1. คำอธิบายสัญลักษณ์และเกณฑ์การประเมิน (Evaluation Legend)

- **PASS**: ผ่านการตรวจสอบซอร์สโค้ด และมีชุดทดสอบอัตโนมัติยืนยันผลลัพธ์ตรงตามข้อกำหนด 100%
- **BLOCKED**: ฟังก์ชันฝั่งโค้ดสมบูรณ์ แต่การทดสอบกับเซิร์ฟเวอร์จริงต้องพึ่งพา Live Google Workspace Domain และสิทธิ์ Spreadsheet จริง
- **NOT RUN**: ยังไม่ได้ทดสอบบนอุปกรณ์ฮาร์ดแวร์จริง (เช่น กล้องโทรศัพท์มือถือจริง)
- **FAIL**: พบข้อผิดพลาดหรือพฤติกรรมที่ไม่ตรงตามข้อกำหนด

---

### 2. ตารางสอบย้อนข้อค้นพบเชิงเทคนิคเดิม (Audit Findings Traceability: C-1 ถึง N-3)

| รหัสข้อค้นพบ | หัวข้อความต้องการ / ข้อค้นพบเดิม | โค้ดและฟังก์ชันที่รับผิดชอบ (`file:function:line`) | API Route | แผ่นงาน / Storage | สิทธิ์ที่ควบคุม (RBAC) | ชุดทดสอบที่ครอบคลุม | หลักฐานเชิงประจักษ์ (Evidence Path) | สถานะทางเทคนิค |
| :---: |---|---|---|---|---|---|---|:---:|
| **C-1** | กรองข้อมูลครบถ้วน 8 มิติ (Warehouse, Category, Status, FY, Movement, ABC, FSN, Dept) | `Read.gs:apiGetItems:L130-L245`<br>`index.html:L6290` | `items.list` | `03_Master_Items`<br>`10_Stock_Ledger` | `VIEW_INVENTORY` | `tests/p3_miniui_critical_test.js`<br>(Scenario C-1) | ผ่านการทดสอบ 8 มิติเดี่ยวและร่วม ยอดคงเหลือตรงตามฟิลเตอร์ | **PASS** |
| **C-2** | คำนวณการจัดกลุ่มต้นทุน ABC Pareto บน Universe พัสดุทั้งหมด | `Read.gs:calculateParetoAbc:L250-L310` | `items.list`<br>`dashboard.metrics` | `03_Master_Items` | `VIEW_INVENTORY` | `tests/p3_miniui_critical_test.js`<br>(Scenario C-2) | พัสดุกลุ่ม A คุมมูลค่าสะสม 80% แรก โดยไม่คำนวณตัดตอนเฉพาะ Sub-filter | **PASS** |
| **C-3** | รองรับการตรวจนับพัสดุประจำปี (`getYearEndAudit`, `saveYearEndAudit`) | `Audit.gs:apiGetYearEndAudit:L120-L220`<br>`Audit.gs:apiSaveYearEndAudit:L230-L310` | `getYearEndAudit`<br>`saveYearEndAudit` | `13_Year_End_Audits` | `YEAR_END_AUDIT` | `tests/p3_miniui_critical_test.js`<br>(Scenario C-3) | บันทึกผลนับจริง แยก `physical_count=null` (ยังไม่นับ) ออกจาก `0` (นับพบศูนย์) | **PASS** |
| **C-4** | สแนปช็อตปีงบประมาณไม่ผันแปรตามการแก้ไขรายการพัสดุหลักในอนาคต | `Read.gs:loadFiscalYearSnapshots:L510-L570`<br>`Write.gs:postLedgerMovement:L340` | `bootstrap`<br>`fiscalYear.snapshots` | `10_Stock_Ledger`<br>`12_Fiscal_Years` | `VIEW_INVENTORY` | `tests/p3_miniui_critical_test.js`<br>(Scenario C-4) | ปริมาณและมูลค่าคงเหลือในอดีตถูกแช่แข็งตามรอบปีงบประมาณ ไม่เปลี่ยนตามราคาใหม่ | **PASS** |
| **C-5** | การค้นหา Foreign Key ของ FSN ต้องคืนค่า `linked_name` ถูกต้อง (ไม่ใช่คืนรหัสซ้ำ) | `Read.gs:apiGetFsnList:L380-L440` | `fsn.list` | `06_FSN_Catalog`<br>`03_Master_Items` | `MANAGE_FSN` | `tests/p3_miniui_critical_test.js`<br>(Scenario C-5) | ตรวจสอบแมปปิ้ง FSN คืนชื่อพัสดุภาษาไทยที่ถูกต้อง และตรวจจับ Orphan Code ได้ | **PASS** |
| **C-6** | การเปลี่ยนปีงบประมาณ (`changeFiscalYear`) ต้องโหลด Asynchronous ไม่ค้างแคชเก่า | `frontend/main/App.js:changeFiscalYear:L210`<br>`index.html:L6400` | `items.list`<br>`dashboard.metrics` | Memory Cache / UI | `VIEW_INVENTORY` | `tests/p3_miniui_critical_test.js`<br>(Scenario C-6) | การสลับปีล้าง Cache ทันที ไม่แสดงป้ายปีเก่าหากเครือข่ายล้มเหลว (Rollback Badge) | **PASS** |
| **C-7** | วงจรขอเบิกตัดสต็อกแบบ Decoupled (ตัดสต็อกเฉพาะเมื่อจ่ายของ `ISSUED` เท่านั้น) | `Write.gs:apiCreateRequisition:L90-L160`<br>`Write.gs:apiIssueStock:L220-L315` | `requisitions.create`<br>`stock.issue` | `07_Requisitions`<br>`10_Stock_Ledger` | `CREATE_REQUISITION`<br>`ISSUE_STOCK` | `tests/p3_miniui_critical_test.js`<br>(Scenario C-7) | การสร้างและอนุมัติใบเบิกไม่ตัดสต็อก; ตัดสต็อกครั้งเดียวเมื่อสถานะเปลี่ยนเป็น `ISSUED` | **PASS** |
| **I-1** | บังคับใช้ Enum `transaction_type` มาตรฐานและคำนวณการเคลื่อนไหวเฉพาะ Outbound | `Read.gs:getHistoryMap:L450-L510`<br>`Config.gs:TRANSACTION_TYPES` | `items.list` | `10_Stock_Ledger` | `VIEW_INVENTORY` | `tests/p4_settings_important_test.js`<br>(Scenario I-1) | รองรับ 7 ทิศทางมาตรฐาน (`RECEIVE`, `ISSUE`, `OPENING`, `ADJUST_PLUS`, `ADJUST_MINUS`, `RETURN`, `DISPOSAL`) | **PASS** |
| **I-2** | ซิงค์รหัส FSN กลับไปยังตารางพัสดุหลักแบบ Two-Phase Atomic Write พร้อม Rollback | `Write.gs:apiAddFsn:L410-L470`<br>`Write.gs:apiLinkFsnToItem:L480-L520` | `fsn.add`<br>`fsn.link` | `06_FSN_Catalog`<br>`03_Master_Items` | `MANAGE_FSN` | `tests/p4_settings_important_test.js`<br>(Scenario I-2) | อัปเดต `master_items.fsn_code` และตรวจสอบ Foreign Key หากล้มเหลวจะย้อนสถานะ | **PASS** |
| **I-3** | ตรวจสอบไฟล์ CSV ก่อนนำเข้า ป้องกัน Formula Injection (`=,+,-,@`) และมีโหมด Dry-run | `Write.gs:apiValidateImportItems:L530-L590`<br>`Write.gs:apiImportItems:L600-L680` | `items.validateImport`<br>`items.import` | `03_Master_Items`<br>`10_Stock_Ledger` | `IMPORT_ITEMS` | `tests/p4_settings_important_test.js`<br>(Scenario I-3) | ฟังก์ชัน `sanitizeCellValue` สกัดอักขระอันตราย; Dry-run ตรวจสอบความถูกต้องโดยไม่แตะชีตจริง | **PASS** |
| **I-4** | โหลดรายชื่อกลุ่มสาระ/ฝ่ายจากเซิร์ฟเวอร์แบบ Authoritative ไม่ฮาร์ดโค้ดใน UI | `Read.gs:getAllDepartments:L580-L620`<br>`index.html:L7820` | `departments.list` | `02_Departments` | ทุกบทบาท | `tests/p4_settings_important_test.js`<br>(Scenario I-4) | เมนูดรอปดาวน์ในระบบกลางและ MiniUI โหลดรายชื่อฝ่ายจากชีต `02_Departments` ตรงกัน | **PASS** |
| **I-5** | รองรับการตั้งต้นปีงบประมาณในฐานข้อมูลว่างเปล่าแบบ Idempotent | `Write.gs:apiSetupInitialFiscalYear:L690-L740`<br>`Read.gs:getAllFiscalYears:L630` | `fiscalYear.setupInitial` | `12_Fiscal_Years` | `ADMIN` | `tests/p4_settings_important_test.js`<br>(Scenario I-5) | การสร้างรอบปีงบประมาณเริ่มต้นทำซ้ำได้โดยไม่สร้างเรคอร์ดซ้ำซ้อน | **PASS** |
| **O-1** | การแคชการตั้งค่าระบบ Multi-Tier Caching ในหน่วยความจำและ Script Cache | `Config.gs:getConfig:L125-L165`<br>`Config.gs:setConfig:L180-L215` | ทุกเส้นทาง RPC | `15_Settings_Config`<br>CacheService | ทุกบทบาท | `tests/regression_test_suite.js`<br>(Scenario TC-08) | ลดการอ่านสเปรดชีตซ้ำซ้อนด้วย Script Cache อายุ 600 วินาที | **PASS** |
| **O-2** | จำกัดขอบเขตการสแกนประวัติธุรกรรมเฉพาะปีงบประมาณที่ระบุ | `Read.gs:getHistoryMap:L460-L495` | `items.list` | `10_Stock_Ledger` | `VIEW_INVENTORY` | `tests/p4_settings_important_test.js`<br>(Scenario I-1) | ไม่สแกนธุรกรรมย้อนหลังทั้งหมด ช่วยประหยัดเวลา Execution Time | **PASS** |
| **O-3** | โครงสร้าง ID แบบเสถียร (Stable ID) และ In-Memory Index ไม่พึ่งพา Row Number | `Read.gs:getFsnIndexMap:L480-L510`<br>`Config.gs:L230` | ทุกเส้นทาง RPC | ทุกแผ่นงาน | ทุกบทบาท | `tests/p8_backend_sheets_architecture_test.js` (S.9) | ใช้อัตลักษณ์คงที่ เช่น `code`, `user_id`, `req_id` แม้จะมีการแทรก/ลบแถว | **PASS** |
| **O-4** | ป้องกันคำขอซ้ำซ้อนด้วย Idempotency Key (Actor + Action + Payload Hash) และ Mutex Lock | `Api.gs:checkIdempotency:L420-L485`<br>`Api.gs:recordIdempotency:L490-L530` | ทุกเส้นทาง Write RPC | `16_Idempotency_Log`<br>ScriptLock | ทุกบทบาท | `tests/p8_backend_sheets_architecture_test.js` (S.2) | ส่งคำขอซ้ำได้รับผลเดิมทันที หาก Payload ต่างกันจะปฏิเสธด้วย `IDEMPOTENCY_CONFLICT` | **PASS** |
| **O-5** | การบังคับใช้สิทธิ์ฝั่งเซิร์ฟเวอร์แบบ Fail-Closed Security และ Granular RBAC | `Api.gs:resolveAuthenticatedUser:L225-L348`<br>`Api.gs:enforceAuthorization:L388-L418` | ทุกเส้นทาง RPC | `01_Users`<br>Google Session | ทุกบทบาท | `tests/p6_acceptance_suite.js`<br>(Scenario A.1) | บัญชีระงับ (`SUSPENDED`) หรือสิทธิ์ไม่ถึงจะถูกปฏิเสธทันที ไม่เชื่อสิทธิ์จากไคลเอนต์ | **PASS** |
| **N-1** | ซิกเนเจอร์แคชของแดชบอร์ดผูกกับมิติปีงบประมาณและเลข Data Revision | `index.html:getActiveDashboardData:L6280-L6320` | UI Dashboard Cache | Browser RAM | ทุกบทบาท | `tests/p6_acceptance_suite.js`<br>(Scenario A.3) | การแก้ไขข้อมูลหรือเปลี่ยนปีทำให้แคชเดิมสลายทันที ป้องกันข้อมูลปนเปื้อนข้ามปี | **PASS** |
| **N-2** | แก้ไขปัญหา String Interpolation ในข้อความบันทึกประวัติการแก้ไข Audit Trail | `index.html:L6240-L6270`<br>`Audit.gs:computeSha256:L385-L420` | `audit.list` | `11_Audit_Trail` | `VIEW_AUDIT_LOG` | `tests/regression_test_suite.js`<br>(Scenario TC-09) | ข้อความบันทึกไม่เสียหาย และสายโซ่แฮช SHA-256 เชื่อมโยงต่อเนื่องถูกต้อง | **PASS** |
| **N-3** | การแมปชื่อและบทบาทแบบฟอร์มทางราชการ แบบ พ.ด. ๑–๗ ให้สอดคล้องกับระเบียบพัสดุ | `Read.gs:apiGetPdReport:L650-L730`<br>`docs/DOCUMENT_TEMPLATE_MAPPING.md` | `reports.generate` | `03_Master_Items`<br>`07_Requisitions` | `OFFICER`, `DIRECTOR` | `tests/p4_settings_important_test.js`<br>(Scenario N-3) | แบบ พ.ด. ๑ และ ๓ ยืนยันสมบูรณ์ (`OFFICIAL_VERIFIED`); แบบที่รอยืนยันระบุ `PENDING_TEMPLATE` | **PASS** |

---

### 3. ตารางสอบย้อนกระบวนการแยกส่วนข้อมูลจำลอง (Prompt 09 Clean Code Separation)

| หัวข้อการแยกส่วน | สถานะใน Live Code (index.html / App.js) | สถานะใน Test Sandbox (`tests/`) | สถานะใน Demo Sandbox (`demo.html`) | ผลการตรวจจริง |
|---|---|---|---|:---:|
| **พัสดุตัวอย่าง 100 รายการ** | เป็นอาเรย์ว่าง `rawMasterItems = [];` โหลดจากชีตจริงเท่านั้น | อยู่ใน `tests/fixtures/sample_items.json` | โหลดจาก `__DEMO_STORE__.items` | **PASS** |
| **ประวัติการเคลื่อนไหว 20 รายการ** | เป็นอาเรย์ว่าง `mockHistories = [];` โหลดจากชีตจริงเท่านั้น | อยู่ใน `tests/fixtures/sample_histories.json` | โหลดจาก `__DEMO_STORE__.histories` | **PASS** |
| **อัตลักษณ์จำลองนายอนันต์** | ลบออกจาก `UserApi` และ Audit Log อย่างสมบูรณ์ | อยู่ใน `tests/fixtures/sample_users.json` | โหลดใน `__DEMO_STORE__.currentUser` | **PASS** |
| **การจำลองผลสำเร็จเงียบ** | ตัดทิ้ง; หากเปิดนอก GAS จะส่ง `BACKEND_UNAVAILABLE` | ทดสอบผ่าน In-Memory Repository | ทำงานผ่าน `window.demoMockDispatcher` | **PASS** |
| **การแสดงผลสภาวะว่างเปล่า** | เรนเดอร์ `#tableEmptyState` เมื่อฐานข้อมูลไม่มีข้อมูล | ทดสอบผ่าน Scenario 4 ใน P9 Test | แสดงข้อมูลจำลองให้ดูเป็นตัวอย่าง | **PASS** |

---

### 4. การจำแนกประเภทฟังก์ชันระบบ (Feature Reality Classification)

1. **ฟังก์ชันที่ใช้งานได้จริงในระบบหลัก (Real Implemented Features):**
   - การสืบค้นพัสดุ ตัวกรอง 8 มิติ และการจัดกลุ่มต้นทุน ABC Pareto บนฐานข้อมูลจริง
   - วงจรชีวิตใบเบิก 4 ระดับปริมาณ (`requested`, `approved`, `issued`, `received`) พร้อมการตัดสต็อกที่ขั้นตอน `ISSUED`
   - ระบบควบคุมสิทธิ์ฝั่งเซิร์ฟเวอร์แบบหลายระดับ (Granular RBAC) และระบบป้องกัน Last-Admin Protection
   - การบันทึกบัญชีคุมพัสดุเดี่ยว (SSOT Stock Ledger) และการบันทึกประวัติพร้อมแฮช SHA-256
   - หน้าจอศูนย์การตั้งค่าระบบ (Settings Hub) ครบ 8 หมวดหมู่ พร้อมการคุม Concurrency Revision
   - การนำเข้า CSV พร้อมระบบป้องกัน Formula Injection และโหมด Dry-run
2. **ฟังก์ชันที่มีเฉพาะในโหมดสาธิต (Demo-Only Features):**
   - ปุ่มสลับบทบาทผู้ใช้ทันที (`window.switchDemoUserPrompt()`) เพื่อทดสอบ UI
   - ข้อมูลพัสดุและใบเบิกตัวอย่างที่ถูกฝังไว้ในหน่วยความจำ (`window.__DEMO_STORE__`)
3. **ฟังก์ชันที่ยังรอยืนยันแม่แบบทางการ (Pending Template Features):**
   - แบบฟอร์ม พ.ด. ๒ (ใบยืมพัสดุ), พ.ด. ๔, พ.ด. ๕, พ.ด. ๖, พ.ด. ๗ ระบุสถานะชัดเจนว่า `PENDING_TEMPLATE` โดยระบบจะยังไม่อนุญาตให้พิมพ์จนกว่าจะได้แม่แบบทางการจากสถานศึกษา
4. **ฟังก์ชันที่ถูกนำออกหลังกระบวนการ Clean Code:**
   - การ Fallback เป็นผู้ใช้นายอนันต์อัตโนมัติเมื่อยังไม่ได้เข้าสู่ระบบ
   - การจำลองผลสำเร็จเงียบ (`mockDispatcher`) เมื่อไม่มีการเชื่อมต่อกับเซิร์ฟเวอร์
   - การแอบสร้างประวัติเท็จในแรมตอนโหลดหน้าเว็บ (`initAuditTrailStore`)
