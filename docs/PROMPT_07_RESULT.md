# สรุปผลการปฏิบัติงาน Prompt 07 — ศูนย์กลางการตั้งค่าระบบและเกณฑ์ตรวจรับ (Settings Hub & Candidate Verification)
## HRT Inventory System — โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)
### วันที่จัดทำรายงาน: 2026-10-28 | รุ่นรับเข้า: v2.7.0-rc.1 | รุ่นส่งออก: v2.7.0-rc.2

---

### 1. สรุปภาพรวมและสถานะการควบคุมรุ่น (Version Control & Summary)
- **Historical Baseline (เจ้าของระบบยืนยัน):** `v2.6.0` เป็นรุ่นสุดท้ายก่อนเริ่มกระบวนการ Clean File
- **รุ่นรับเข้าตามแผน (Incoming Version):** `v2.7.0-rc.1` (Git base commit: `dd000c0`)
- **รุ่นส่งออกจริง (Outgoing Version):** `v2.7.0-rc.2` (ปรับระดับรุ่นเนื่องจากผ่านเกณฑ์ Candidate Verification ครบ 100%)
- **ขอบเขตเป้าหมายรวม:** พัฒนาศูนย์กลางการตั้งค่าระบบ (Settings Center Level 3) ครบทั้ง 8 หมวดหมู่, กำหนดการควบคุมสิทธิ์อย่างละเอียด (Granular RBAC), ป้องกัน Last-Admin, เชื่อมโยงระบบ MiniUI / QR Code Generator, และยืนยันความคงทนของระบบผ่านชุดทดสอบ 6 ชุด รวม 62 รายการทดสอบ
- **สถานะการขึ้นระบบจริง (Production Deployment Status):** **`BLOCKED`** (ระงับการขึ้นระบบ Production จริงชั่วคราว เนื่องจากขาดข้อมูลประจำตัวจริงของโดเมน `@hrt.ac.th` และ Google Cloud OAuth Client Secret ใน Local Workspace; ซอฟต์แวร์ได้รับการรับรองความพร้อมระดับ Staging Release Candidate 2)

---

### 2. ผลงานการแก้ไขและพัฒนาสถาปัตยกรรม (Key Technical Deliverables)

#### 2.1 สถาปัตยกรรมศูนย์กลางการตั้งค่า 8 หมวดหมู่ (8-Category Settings Architecture)
1. **หมวด 1: ข้อมูลสถานศึกษาและเอกสารราชการ (School Profile & Documents):**
   - เชื่อมโยงฟอร์ม `setSec_school` เข้ากับคีย์ `school_name`, `school_short_name`, `school_org`, `school_agency`, `school_address`, `school_phone`, `school_email`
   - จัดการรูปแบบเลขที่เอกสาร `document_prefix` (เช่น `พด.`) และ Pattern `{PREFIX}-{YEAR}-{SEQ:4}` พร้อมระบบล็อก Sequence Mutex ป้องกันเลขซ้ำ
   - ยืนยันการทำงานของ `signatories_snapshot`: เอกสารในอดีตคงสภาพชื่อผู้ลงนามเดิม ณ วันที่จ่ายจริง ไม่ถูกเปลี่ยนแปลงย้อนหลัง
2. **หมวด 2: ผู้ใช้ การเข้าสู่ระบบ และสิทธิ์ (Users & Granular RBAC):**
   - พัฒนาฟอร์มและตารางจัดการผู้ใช้ `setSec_users` รองรับ 4 บทบาทหลัก: `ADMIN`, `DIRECTOR`, `OFFICER`, `REQUESTER`
   - ติดตั้งกลไก **Last-Admin Protection**: ปฏิเสธการลดสิทธิ์หรือระงับผู้ดูแลระบบคนสุดท้ายของระบบอย่างเด็ดขาดทั้งบนเซิร์ฟเวอร์และไคลเอนต์
   - บัญชีที่ถูกระงับ (`SUSPENDED`) จะถูกตัดสิทธิ์ทันทีในทุก RPC Endpoint
3. **หมวด 3: ปีงบประมาณ (Fiscal Year Management):**
   - รองรับรอบปฏิทินหลวง (1 ต.ค. – 30 ก.ย.)
   - แยกปีที่กำลังดู (`viewingYear`) ออกจากปีที่เปิดทำธุรกรรม (`activeYear`) อย่างเด็ดขาด
   - บังคับใช้ **Closed-Year Write Lock**: ปฏิเสธการสร้างหรืออนุมัติธุรกรรมในรอบปีที่ปิดบัญชีแล้ว
   - เพิ่ม Modal เตรียมเปิดรอบปีงบประมาณใหม่ (`settingsPrepareFiscalModal`)
4. **หมวด 4: ข้อมูลกลางพัสดุ (Master Data Management):**
   - บริหารจัดการ 4 แท็บ: ฝ่ายงาน (`depts`), คลังพัสดุ (`warehouses`), หมวดหมู่ (`categories`), และหน่วยนับ (`units`)
   - แสดงการตรวจนับความสัมพันธ์ (FK Reference Count) เพื่อป้องกันการลบข้อมูลที่ถูกอ้างอิงอยู่
   - นำกลไก **Soft-Delete** มาใช้: หากมีพัสดุอ้างอิงอยู่ จะเปลี่ยนสถานะเป็น `INACTIVE` แทนการลบแถว
5. **หมวด 5: กติกาการเบิกและสต็อก (Business Rules & Thresholds):**
   - ตั้งค่าระดับสต็อกขั้นต่ำ (Min) และจุดสั่งซื้อซ้ำ (ROP) โดยค่าต้องไม่ติดลบ
   - กำหนดเกณฑ์พาเรโต ABC บังคับความถูกต้องทางคณิตศาสตร์ $0 < A < B \le 100$
   - บังคับใช้ **Decimal Unit Rule**: ปฏิเสธยอดขอเบิกทศนิยมในหน่วยนับเดี่ยว (รีม, กล่อง, เล่ม, อัน) และยอมรับทศนิยมเฉพาะหน่วยนับต่อเนื่อง (กิโลกรัม, ลิตร, เมตร)
6. **หมวด 6: MiniUI และ QR Code Generator:**
   - สวิตช์ควบคุมระบบ MiniUI: เปิด/ปิดการเบิกด้วยตนเอง, สารบบ QR, และร่างออฟไลน์
   - พัฒนาเครื่องมือสร้างป้าย QR Code 4 รูปแบบ: `ITEM`, `ROOM`, `TRACK`, `GENERAL`
   - ระบบ Live SVG Preview แสดงตัวอย่าง QR Code พร้อม Quiet Zone และข้อความกำกับ
   - ระบบพิมพ์ป้าย QR Code ขนาดมาตรฐาน A4 พร้อมติดจุดบริการ
7. **หมวด 7: การเชื่อมต่อ นำเข้า และสำรองข้อมูล (Connection & Backup):**
   - ปุ่มทดสอบความพร้อมฐานข้อมูล (Health Check) ตรวจสอบความถูกต้องของ 16 แผ่นงาน
   - ระบบนำเข้าข้อมูล CSV โหมด Dry-Run พร้อมการป้องกัน Formula Injection
   - ระบบ Full Backup และ Modal ทดสอบกู้คืนข้อมูลแบบ Staging Dry-Run
8. **หมวด 8: ประวัติและการตรวจสอบระบบ (Audit & System Info):**
   - ตารางบันทึก Audit Trail พร้อมการตรวจสอบความถูกต้องของ SHA-256 Hash Chain
   - แสดงข้อมูลจำเพาะระบบ: รุ่นปัจจุบัน `v2.7.0-rc.2`

#### 2.2 การควบคุมสถานะการแก้ไขและการป้องกันความขัดแย้ง (Dirty Guard & Concurrency)
- ไคลเอนต์มีตัวติดตามสถานะ `settingsState.isDirty`
- เมื่อมีการแก้ไข ฟอร์มจะแสดงสถานะสีส้ม *"มีการแก้ไขที่ยังไม่บันทึก"* และเปิดให้กดปุ่มยกเลิกหรือบันทึก
- การกด "ยกเลิก" จะคืนค่าเดิมทั้งหมดจาก `originalData`
- การกดบันทึกจะส่ง `expectedRevisionId` ไปยังเซิร์ฟเวอร์ หากมีผู้ใช้อื่นบันทึกตัดหน้า เซิร์ฟเวอร์จะคืนค่า `CONCURRENCY_CONFLICT (HTTP 409)` เพื่อป้องกันการเขียนทับ

---

### 3. ตารางสรุปผลการตรวจสอบรับรอง (Master Acceptance Table)

| ฟังก์ชันการทำงาน | ไฟล์และฟังก์ชันโค้ดที่รับผิดชอบ | การทดสอบที่ครอบคลุม | หลักฐานเชิงประจักษ์ (Evidence) | สถานะความพร้อม |
| :--- | :--- | :--- | :--- | :---: |
| **1. การอ่าน/แก้ไขข้อมูลสถานศึกษา** | `Read.gs`: `apiGetSettingsSection`<br>`Write.gs`: `apiUpdateSettingsSection`<br>`index.html`: `saveCurrentSectionChanges` | Scenario 1, Scenario 3 | `revisionId` ขยับเป็น `REV-SETTINGS-002`<br>ปฏิเสธ Formula Injection ขึ้นต้นด้วย `=` | **COMPLETE** |
| **2. การคงสภาพผู้ลงนามในเอกสารอดีต** | `Write.gs`: `apiIssueRequisition`<br>`index.html`: `viewRequisitionDoc` | Scenario 9 | เอกสารปีก่อนหน้ายังคงชื่อ `นายสมบัติ พัสถาน`<br>แม้ใน Settings จะเปลี่ยนชื่อใหม่แล้ว | **COMPLETE** |
| **3. การจัดการผู้ใช้ และ Granular RBAC** | `Write.gs`: `apiUpdateUser`<br>`Write.gs`: `apiSuspendUser`<br>`index.html`: `renderUsersTable` | Scenario 1, Scenario 2 | ผู้ใช้บทบาท REQUESTER ถูกปฏิเสธด้วย `FORBIDDEN`<br>บัญชี `SUSPENDED` ถูกตัดสิทธิ์ | **COMPLETE** |
| **4. การป้องกันแอดมินคนสุดท้าย (Last-Admin)** | `Write.gs`: `apiSuspendUser`<br>`index.html`: `submitSaveUser` | Scenario 2 | ปฏิเสธการลดสิทธิ์แอดมินคนสุดท้าย<br>แจ้งเตือน `LAST_ADMIN_PROTECTED` | **COMPLETE** |
| **5. การแยกปีที่ดู และล็อกปีที่ปิดแล้ว** | `Read.gs`: `getAllFiscalYears`<br>`Write.gs`: `validateFiscalYearActive`<br>`index.html`: `setViewingYear` | Scenario 5 | สลับดูปี 2568 ได้โดยไม่กระทบปี 2569<br>ธุรกรรมในรอบปี 2568 ถูกปฏิเสธ (`FISCAL_YEAR_CLOSED`) | **COMPLETE** |
| **6. ข้อมูลกลางและการระงับแบบ Soft-delete** | `Read.gs`: `apiGetMasterData`<br>`Write.gs`: `apiUpsertMasterData`<br>`Write.gs`: `apiDeactivateMasterData` | Scenario 4, Scenario 10 | คืนค่าจำนวนพัสดุที่อ้างอิง (FK Count)<br>เปลี่ยนสถานะเป็น `INACTIVE` เมื่อมีพัสดุผูกอยู่ | **COMPLETE** |
| **7. กติกาเบิกจ่าย พาเรโต ABC และหน่วยนับ** | `Write.gs`: `apiUpdateSettings`<br>`Write.gs`: `validateItemQuantity`<br>`index.html`: `saveCurrentSectionChanges` | Scenario 4 | บังคับ $0 < A < B \le 100$<br>ปฏิเสธยอด 2.5 รีม แต่อนุญาต 2.5 กก. | **COMPLETE** |
| **8. MiniUI และการสร้างป้าย QR Code** | `Read.gs`: `apiPreviewQr`<br>`Write.gs`: `apiCreateQrCode`<br>`index.html`: `updateLiveQrPreview` | Scenario 6, Scenario 7 | สร้างรหัส 4 รูปแบบพร้อม SVG Quiet Zone<br>สแกนเป็น Read-Only ไม่ตัดสต็อก<br>รหัสเพิกถอนถูกปฏิเสธ | **COMPLETE** |
| **9. สแกน QR Code ผ่านกล้องสมาร์ตโฟนจริง** | `index.html`: HTML5 QR Reader | MiniUI Integration | ทำงานสมบูรณ์ใน Sandbox จำลอง<br>รอเชื่อมต่อกล้องจริงบนอุปกรณ์ที่มี HTTPS | **DEMO** |
| **10. การทดสอบฐานข้อมูล นำเข้า และสำรอง** | `Read.gs`: `apiCheckHealth`<br>`Write.gs`: `apiValidateImportItems`<br>`Read.gs`: `apiValidateRestore` | Scenario 8, Scenario 10 | Health Check ผ่าน 16 ชีตครบถ้วน<br>CSV Dry-Run ไม่เขียนทับ DB จริง<br>จำลอง Restore ใน Staging Sandbox | **COMPLETE** |
| **11. การตรวจสอบ Hash Chain และประวัติ** | `Read.gs`: `apiGetAuditTrail`<br>`Audit.gs`: `verifyHashChain`<br>`index.html`: `renderAuditTable` | Scenario 10 | ตรวจสอบความต่อเนื่องของ SHA-256 Hash<br>แสดงผลในตารางพร้อมตัวกรอง | **COMPLETE** |
| **12. หน้าจอ Responsive และ ESC LIFO Stack** | `frontend/pages/Settings.html`<br>`index.html`: `pushOverlay`, `popOverlay` | Scenario 10 | รองรับขนาด 375/768/1024/1440px<br>กด ESC ปิดเฉพาะ Modal บนสุดตามลำดับ LIFO | **COMPLETE** |
| **13. การเข้าสู่ระบบจริงด้วย Google Domain SSO** | Google Identity Service | Auth Pipeline | รหัสจำลองทำงานสมบูรณ์<br>ขาด OAuth Client Secret และโดเมน `@hrt.ac.th` จริง | **BLOCKED** |

---

### 4. เอกสารที่จัดทำและส่งมอบในรอบ Prompt 07 (Deliverables Inventory)
1. [`docs/SETTINGS_FEATURE_MATRIX.md`](file:///c:/Users/Art/.gemini/antigravity/scratch/docs/SETTINGS_FEATURE_MATRIX.md) — ตารางเมทริกซ์ 8 หมวดหมู่ สิทธิ์ บทบาท และแผ่นงานเป้าหมาย
2. [`docs/SETTINGS_API_CONTRACT.md`](file:///c:/Users/Art/.gemini/antigravity/scratch/docs/SETTINGS_API_CONTRACT.md) — ข้อกำหนดและสัญญาเกตเวย์ RPC สคีมา และรหัสข้อผิดพลาด
3. [`docs/SETTINGS_MIGRATION_AND_ROLLBACK.md`](file:///c:/Users/Art/.gemini/antigravity/scratch/docs/SETTINGS_MIGRATION_AND_ROLLBACK.md) — แผนการย้ายระบบและคู่มือการย้อนกลับฉุกเฉิน
4. [`docs/SETTINGS_TEST_REPORT.md`](file:///c:/Users/Art/.gemini/antigravity/scratch/docs/SETTINGS_TEST_REPORT.md) — รายงานผลการทดสอบระบบ 6 ชุด รวม 62 รายการทดสอบ (100% Pass)
5. [`docs/SETTINGS_USER_GUIDE.md`](file:///c:/Users/Art/.gemini/antigravity/scratch/docs/SETTINGS_USER_GUIDE.md) — คู่มือการใช้งานสำหรับผู้บริหารและเจ้าหน้าที่
6. [`docs/VERSION_MANIFEST.json`](file:///c:/Users/Art/.gemini/antigravity/scratch/docs/VERSION_MANIFEST.json) — บัญชีข้อมูลจำเพาะรุ่น v2.7.0-rc.2 พร้อม SHA-256 ล่าสุด
7. [`docs/CHANGELOG.md`](file:///c:/Users/Art/.gemini/antigravity/scratch/docs/CHANGELOG.md) — บันทึกประวัติการเปลี่ยนแปลงระบบ
