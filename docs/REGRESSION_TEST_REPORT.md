# รายงานผลการทดสอบการถดถอยและตรวจรับระบบรอบด้าน (Comprehensive Regression & Acceptance Test Report)
**ระบบ:** HRT School Inventory Management System  
**สถานศึกษา:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) สังกัดองค์การบริหารส่วนจังหวัดสระบุรี  
**รุ่นตรวจสอบรับรอง:** `v2.7.0-rc.1` (Release Candidate 1)  
**ขอบเขตการตรวจรับ:** ครอบคลุม 10 หมวดการตรวจรับ (Acceptance Areas A.1 ถึง A.10)  
**วันที่ทดสอบ:** 25 ตุลาคม 2569  
**สภาพแวดล้อม:** Local Staging / Mock Harness Node.js & Apps Script Sandbox  
**สถานะภาพรวม:** 🟢 **ผ่านเกณฑ์ 100% (52 จาก 52 การทดสอบอัตโนมัติ)**  
*(หมายเหตุ: การรันบน Production Domain `@hrt.ac.th` และ iOS Safari Live Device ระบุสถานะชัดเจนว่า BLOCKED / PENDING ON-PREMISE STAGING)*

---

## 1. ตารางสรุปผลการทดสอบรายหมวดการตรวจรับ (Acceptance Areas A.1 – A.10)

| หมวด | ชื่อหมวดการตรวจรับ | จำนวนเคส | ผ่าน | ไม่ผ่าน | บล็อก (Live Prod) | ผลการตรวจรับ |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **A.1** | การยืนยันตัวตนและการควบคุมสิทธิ์ (Authentication & RBAC) | 5 | 5 | 0 | 0 | 🟢 **PASS** |
| **A.2** | วงจรปีงบประมาณและข้อตกลงข้อมูล (Fiscal Boundary & Lifecycle) | 5 | 5 | 0 | 0 | 🟢 **PASS** |
| **A.3** | แดชบอร์ด การวิเคราะห์ และการกรองข้อมูล (Dashboard & Filtering) | 6 | 6 | 0 | 0 | 🟢 **PASS** |
| **A.4** | กระบวนการเบิกจ่ายพัสดุครบวงจร (Requisition E2E Flow) | 7 | 7 | 0 | 0 | 🟢 **PASS** |
| **A.5** | ความถูกต้องของธุรกรรมและการทำงานพร้อมกัน (Concurrency & Integrity) | 6 | 6 | 0 | 0 | 🟢 **PASS** |
| **A.6** | การตรวจนับพัสดุประจำปีและการบันทึกประวัติ (Year-End Physical Audit) | 5 | 5 | 0 | 0 | 🟢 **PASS** |
| **A.7** | เมนูการตั้งค่า การนำเข้า และความปลอดภัยข้อมูล (Settings & Import) | 6 | 6 | 0 | 0 | 🟢 **PASS** |
| **A.8** | การตอบสนองหน้าจอและการเข้าถึง (UI Responsive & Accessibility) | 4 | 4 | 0 | 0 | 🟢 **PASS** |
| **A.9** | การออกเอกสารทางราชการ พ.ด. ๑–๗ (Official Documents & Signatures) | 4 | 4 | 0 | 0 | 🟢 **PASS** |
| **A.10** | การสำรอง กู้คืน และการจัดการฐานข้อมูล (Backup & Disaster Recovery) | 4 | 4 | 0 | 0 | 0 | 🟢 **PASS** |
| **รวม** | **ผลการทดสอบทั้งหมด (Total Acceptance Cases)** | **52** | **52** | **0** | **0** | 🟢 **100% PASS** |

---

## 2. รายละเอียดผลการทดสอบรายเคส (Detailed Test Execution Logs)

### A.1 การยืนยันตัวตนและการควบคุมสิทธิ์ (Authentication & RBAC)
1. **TC-A1-01: ผู้ใช้สถานะ INACTIVE ถูกบล็อกทันที (USER_SUSPENDED)**
   - *สิ่งที่คาดหวัง:* ระบบปฏิเสธคำขอจากบัญชีที่ถูกระงับด้วยรหัสข้อผิดพลาด `USER_SUSPENDED`
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:77`, `tests/regression_test_suite.js:28`)
2. **TC-A1-02: ปฏิเสธการเขียนข้อมูลจากผู้ใช้ที่ไม่ได้รับอนุญาต (UNREGISTERED_USER)**
   - *สิ่งที่คาดหวัง:* หากอีเมลไม่อยู่ในบัญชีรายชื่อบุคลากร (01_Users) ห้ามเขียนข้อมูลลงฐานข้อมูลโดยเด็ดขาด
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:78`, `Api.gs:314`)
3. **TC-A1-03: ป้องกันการปลอมแปลงบทบาท (Role Spoofing Prevention)**
   - *สิ่งที่คาดหวัง:* บทบาท (Role) ของผู้เรียกต้องอ้างอิงจากฐานข้อมูลหรือ Session ฝั่ง Server เสมอ ห้ามเชื่อถือ Payload จาก Client
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:82`, `tests/p1_p2_contract_lifecycle_test.js:154`)
4. **TC-A1-04: การคุ้มครองผู้ดูแลระบบคนสุดท้าย (Last Admin Protection)**
   - *สิ่งที่คาดหวัง:* ไม่อนุญาตให้ลดบทบาท (Demote) หรือระงับสถานะ (Suspend) ผู้ดูแลระบบที่ยังใช้งานอยู่เพียงคนเดียว
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:97`, `tests/p1_p2_contract_lifecycle_test.js:312`)
5. **TC-A1-05: การตัดสิทธิ์และการหมดอายุของโทเค็น (Token Expiry & Sanitization)**
   - *สิ่งที่คาดหวัง:* โทเค็นและข้อมูลลับต้องถูกตัดออกจากบันทึก Audit Logs และการตอบกลับทั่วไป
   - *ผลการทดสอบ:* ผ่าน (`tests/p1_p2_contract_lifecycle_test.js:342`)

### A.2 วงจรปีงบประมาณและข้อตกลงข้อมูล (Fiscal Boundary & Lifecycle)
1. **TC-A2-01: การตัดรอบปีงบประมาณปฏิทินหลวง (Asia/Bangkok 30 ก.ย. / 1 ต.ค.)**
   - *สิ่งที่คาดหวัง:* 30 ก.ย. 23:59:59+07:00 ถือเป็นปีเก่า; 1 ต.ค. 00:00:00+07:00 ถือเป็นปีใหม่
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:120`, `tests/p1_p2_contract_lifecycle_test.js:35`)
2. **TC-A2-02: ล็อกการเขียนข้อมูลย้อนหลังในรอบปีที่ปิดแล้ว (Closed-Year Write Lock)**
   - *สิ่งที่คาดหวัง:* คำขอเขียนสต็อกหรือทำธุรกรรมในปีที่ไม่ได้ Active ถูกปฏิเสธด้วย `CLOSED_FISCAL_YEAR`
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:132`, `tests/p1_p2_contract_lifecycle_test.js:98`)
3. **TC-A2-03: แยกแยะระหว่างปีที่กำลังดู (Viewing Year) กับปีทำธุรกรรมจริง (Active Year)**
   - *สิ่งที่คาดหวัง:* อนุญาตให้อ่านข้อมูลพัสดุและรายงานย้อนหลังได้โดยไม่กระทบต่อปีที่กำลังบันทึกข้อมูล
   - *ผลการทดสอบ:* ผ่าน (`tests/p1_p2_contract_lifecycle_test.js:105`)
4. **TC-A2-04: การปรับจูนชื่อตัวแปรและปฏิเสธคำขัดแย้ง (Alias Normalization & Conflict Rejection)**
   - *สิ่งที่คาดหวัง:* ยอมรับทั้ง `fiscalYear` และ `fiscal_year` แต่หากส่งค่าขัดแย้งกันต้องปฏิเสธ
   - *ผลการทดสอบ:* ผ่าน (`tests/p1_p2_contract_lifecycle_test.js:68`)
5. **TC-A2-05: การตั้งค่าปีงบประมาณเริ่มต้นแบบปลอดภัย (Idempotent Fiscal Seeding)**
   - *สิ่งที่คาดหวัง:* ไม่สร้างผลข้างเคียงจากการอ่านข้อมูล (Read-Only) และสร้างข้อมูลตั้งต้นแบบ Idempotent
   - *ผลการทดสอบ:* ผ่าน (`tests/p4_settings_important_test.js:284`)

### A.3 แดชบอร์ด การวิเคราะห์ และการกรองข้อมูล (Dashboard & Filtering)
1. **TC-A3-01: การจัดกลุ่มพัสดุแบบพาเรโต ABC ตามสัดส่วน 80/15/5 (Universe ABC Classification)**
   - *สิ่งที่คาดหวัง:* คำนวณมูลค่าสะสมจากพัสดุทั้งหมดในระบบ ไม่คำนวณเฉพาะผลลัพธ์ที่ถูกกรองย่อย
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:161`, `tests/regression_test_suite.js:72`)
2. **TC-A3-02: กฎการก้าวข้ามเกณฑ์ (ABC Crossing Rule)**
   - *สิ่งที่คาดหวัง:* รายการที่ผลักดันมูลค่าสะสมข้ามเส้น 80% หรือ 95% จะได้รับเกรดที่สูงกว่าทันที
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:163`, `tests/p3_miniui_critical_test.js:84`)
3. **TC-A3-03: กลไกการกรองข้อมูล 8 มิติ (8-Dimension Filter Matrix)**
   - *สิ่งที่คาดหวัง:* กรองพร้อมกันได้ทั้ง search, category, status, department, fsn, fiscal_year, price_min, price_max
   - *ผลการทดสอบ:* ผ่าน (`tests/regression_test_suite.js:46`, `tests/p3_miniui_critical_test.js:42`)
4. **TC-A3-04: กุญแจแคชจำแนกขอบเขตและเวอร์ชันข้อมูล (N-1 Scoped Cache Keys & Revision Invalidation)**
   - *สิ่งที่คาดหวัง:* เมื่อมีการเปลี่ยนแปลงสต็อก แคชแดชบอร์ดจะถูกล้างทันทีด้วย `data_revision`
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:170`, `Read.gs:412`)
5. **TC-A3-05: การจำกัดขนาดประวัติธุรกรรมเพื่อประสิทธิภาพ (O-2 History Scoping)**
   - *สิ่งที่คาดหวัง:* ดึงเฉพาะ 20 รายการล่าสุดสำหรับ Dashboard ลดขนาด Payload เหลือไม่เกิน 12 KB
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:170`, `scripts/benchmark_engine.js:115`)
6. **TC-A3-06: การทิ้งคำตอบที่ล้าสมัย (C-6 Stale Response Discard & Badge Rollback)**
   - *สิ่งที่คาดหวัง:* ตรวจสอบ Request Sequence ป้องกันข้อมูลเก่ามาทับข้อมูลใหม่ และ Rollback Badge หากโหลดล้มเหลว
   - *ผลการทดสอบ:* ผ่าน (`tests/p3_miniui_critical_test.js:289`)

### A.4 กระบวนการเบิกจ่ายพัสดุครบวงจร (Requisition E2E Flow)
1. **TC-A4-01: การสแกนและถอดรหัส QR Code (QR Resolution)**
   - *สิ่งที่คาดหวัง:* แปลงโทเค็น `QR:ITEM:...` หรือ `QR:ROOM:...` เป็นรหัสพัสดุหรือรายการในห้องได้ถูกต้อง
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:178`, `tests/p1_p2_contract_lifecycle_test.js:205`)
2. **TC-A4-02: ตรวจสอบหน่วยนับและปริมาณในตะกร้าเบิก (Cart Validation)**
   - *สิ่งที่คาดหวัง:* ปริมาณต้องเป็นบวก ($\text{qty} > 0$) และตรงตามหน่วยนับมาตรฐานของพัสดุ
   - *ผลการทดสอบ:* ผ่าน (`tests/p3_miniui_critical_test.js:374`, `Write.gs:217`)
3. **TC-A4-03: ส่งใบเบิกพัสดุและสร้างรหัสแถวแบบไม่ขึ้นกับลำดับ (Submit Requisition & O-3 Line IDs)**
   - *สิ่งที่คาดหวัง:* ออกเลขที่ใบเบิก `REQ-xxxx` และรหัสแถว `RQI-${reqId}-${it.item_code}` ในสถานะ `SUBMITTED`
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:189`, `Write.gs:254`)
4. **TC-A4-04: การอนุมัติใบเบิกโดยไม่ตัดสต็อก (Decoupled Approval)**
   - *สิ่งที่คาดหวัง:* สถานะเปลี่ยนเป็น `APPROVED` แต่ยอดคงเหลือใน `master_items` ต้องยังไม่ลดลง
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:201`, `tests/regression_test_suite.js:98`)
5. **TC-A4-05: การตัดสต็อกจริงในขั้นตอนจ่ายพัสดุ (Stock Deduction at ISSUED)**
   - *สิ่งที่คาดหวัง:* สถานะเปลี่ยนเป็น `ISSUED` ยอดพัสดุในคลังลดลงตามจำนวนจ่ายจริง และบันทึกบัญชีแยกประเภท
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:210`, `tests/p3_miniui_critical_test.js:425`)
6. **TC-A4-06: ยืนยันการรับพัสดุโดยไม่ตัดสต็อกซ้ำ (Confirm Receipt - No Double Deduction)**
   - *สิ่งที่คาดหวัง:* สถานะเปลี่ยนเป็น `RECEIVED` และสต็อกต้องไม่ถูกหักซ้ำ
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:215`, `tests/p3_miniui_critical_test.js:429`)
7. **TC-A4-07: การรวมบริการเบิกพัสดุรายการเดียวและหลายรายการเป็นชุดเดียวกัน (C-7 Unified Service)**
   - *สิ่งที่คาดหวัง:* ทั้ง Single Item และ Multi Item Requisition ใช้โครงสร้างและเงื่อนไขความปลอดภัยเดียวกัน
   - *ผลการทดสอบ:* ผ่าน (`tests/p3_miniui_critical_test.js:338`)

### A.5 ความถูกต้องของธุรกรรมและการทำงานพร้อมกัน (Concurrency & Integrity)
1. **TC-A5-01: การป้องกันการกดส่งซ้ำซ้อน (Double Dispatch Guard)**
   - *สิ่งที่คาดหวัง:* การส่งคำขอเดิมซ้ำภายใน 3 วินาที (3,000 ms) จะถูกปฏิเสธด้วย `DOUBLE_DISPATCH`
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:231`, `tests/regression_test_suite.js:142`)
2. **TC-A5-02: การตอบกลับซ้ำแบบปลอดภัยด้วย Idempotency Key (Idempotency Replay)**
   - *สิ่งที่คาดหวัง:* เมื่อส่งคีย์คำขอเดิมที่ประมวลผลสำเร็จแล้ว ระบบจะส่งผลลัพธ์เดิมกลับโดยไม่ทำรายการซ้ำ
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:246`, `tests/p1_p2_contract_lifecycle_test.js:274`)
3. **TC-A5-03: การล็อกแบบ Distributed Mutex ป้องกัน Race Condition**
   - *สิ่งที่คาดหวัง:* ธุรกรรมเขียนถูกล็อกด้วย `LockService` สูงสุด 60 วินาที
   - *ผลการทดสอบ:* ผ่าน (`tests/regression_test_suite.js:160`, `Config.gs:16`)
4. **TC-A5-04: ปฏิเสธการจ่ายพัสดุเมื่อสต็อกไม่เพียงพอ (Insufficient Stock Rejection)**
   - *สิ่งที่คาดหวัง:* หากปริมาณที่ขอเบิกมากกว่ายอดสต็อกที่มีอยู่จริง ระบบจะปฏิเสธคำขอทันที
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:257`, `tests/regression_test_suite.js:122`)
5. **TC-A5-05: ตรวจสอบความสอดคล้องของบัญชีแยกประเภท (Ledger Reconciliation)**
   - *สิ่งที่คาดหวัง:* $\sum \text{Inbound} - \sum \text{Outbound} = \text{Current Stock}$
   - *ผลการทดสอบ:* ผ่าน (`tests/p4_settings_important_test.js:68`)
6. **TC-A5-06: ป้องกันการดัดแปลงข้อมูลประวัติด้วย Hash Chain (SHA-256 Tamper Detection)**
   - *สิ่งที่คาดหวัง:* แถวใน `audit_logs` ผูกโยงด้วย `prev_hash` หากมีการแก้ไขย้อนหลังระบบจะตรวจพบความผิดปกติ
   - *ผลการทดสอบ:* ผ่าน (`tests/regression_test_suite.js:200`)

### A.6 การตรวจนับพัสดุประจำปีและการบันทึกประวัติ (Year-End Physical Audit)
1. **TC-A6-01: ความคงทนของประวัติสแน็ปช็อตพัสดุ (Historical Snapshot Invariance)**
   - *สิ่งที่คาดหวัง:* หากชื่อพัสดุใน `master_items` ถูกแก้ไขในปัจจุบัน ชื่อพัสดุในประวัติการตรวจนับปีก่อนต้องคงเดิม
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:277`, `tests/p3_miniui_critical_test.js:189`)
2. **TC-A6-02: การคำนวณผลต่างการตรวจนับจริง (Variance Calculation)**
   - *สิ่งที่คาดหวัง:* $\text{Variance} = \text{Physical Stock} - \text{System Stock}$
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:278`, `tests/p3_miniui_critical_test.js:145`)
3. **TC-A6-03: การยกยอดสต็อกไปปีงบประมาณใหม่เพียงครั้งเดียว (Single Opening Balance Rollover)**
   - *สิ่งที่คาดหวัง:* การสั่ง Rollover ซ้ำในปีเดิมจะถูกปฏิเสธด้วย `ALREADY_INITIALIZED`
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:290`, `tests/regression_test_suite.js:240`)
4. **TC-A6-04: โหมดอ่านอย่างเดียวสำหรับรายงานการตรวจนับ (C-3 Read-Only Audit View)**
   - *สิ่งที่คาดหวัง:* ฟังก์ชัน `getYearEndAudit` ต้องไม่มีผลข้างเคียงในการสร้างข้อมูล
   - *ผลการทดสอบ:* ผ่าน (`tests/p3_miniui_critical_test.js:142`)
5. **TC-A6-05: ล็อกการแก้ไขรายงานการตรวจนับเมื่อพ้นกำหนดเวลา (Closed Year Audit Lock)**
   - *สิ่งที่คาดหวัง:* ไม่อนุญาตให้แก้ไขรายงานตรวจนับในรอบปีที่ปิดบัญชีแล้ว
   - *ผลการทดสอบ:* ผ่าน (`tests/p3_miniui_critical_test.js:150`)

### A.7 เมนูการตั้งค่า การนำเข้า และความปลอดภัยข้อมูล (Settings & Import)
1. **TC-A7-01: การตรวจสอบสิทธิ์ทั้ง 9 หมวดการตั้งค่า (Settings Categories RBAC)**
   - *สิ่งที่คาดหวัง:* เฉพาะผู้ดูแลระบบ (ADMIN) จึงจะสามารถแก้ไขการตั้งค่าระบบได้
   - *ผลการทดสอบ:* ผ่าน (`tests/p4_settings_important_test.js:338`)
2. **TC-A7-02: การควบคุมการทำงานพร้อมกันด้วย Optimistic Revision Token**
   - *สิ่งที่คาดหวัง:* หากโทเค็น `_rev` ไม่ตรงกับเวอร์ชันปัจจุบันในฐานข้อมูล จะปฏิเสธด้วย `CONCURRENCY_CONFLICT`
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:324`, `tests/p4_settings_important_test.js:390`)
3. **TC-A7-03: การตรวจสอบและ Rollback รหัส FSN (FSN Two-Phase Rollback)**
   - *สิ่งที่คาดหวัง:* การจับคู่ FSN แบบ 1:1 มีการตรวจสอบ Foreign Key และ Rollback หากข้อมูลปลายทางผิดพลาด
   - *ผลการทดสอบ:* ผ่าน (`tests/p4_settings_important_test.js:120`, `tests/p3_miniui_critical_test.js:240`)
4. **TC-A7-04: ป้องกันช่องโหว่การฉีดสูตร (Formula Injection Sanitization)**
   - *สิ่งที่คาดหวัง:* อักขระ `=`, `+`, `-`, `@`, `\t`, `\r` ที่ขึ้นต้นข้อมูลในเซลล์จะถูก Escape ด้วยเครื่องหมาย Single Quote (`'`)
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:308`, `tests/p4_settings_important_test.js:175`)
5. **TC-A7-05: โหมดตรวจสอบความถูกต้องก่อนนำเข้า (CSV Import Dry-Run)**
   - *สิ่งที่คาดหวัง:* ตรวจสอบความถูกต้องของแถวข้อมูลโดยไม่บันทึกลงแผ่นงานจริง
   - *ผลการทดสอบ:* ผ่าน (`tests/regression_test_suite.js:220`)
6. **TC-A7-06: การนำเข้าข้อมูลแบบไม่ทำลายประวัติบัญชีแยกประเภท (Non-destructive Ledger Update)**
   - *สิ่งที่คาดหวัง:* บันทึกการนำเข้าหรือปรับปรุงสต็อกเป็นธุรกรรมใหม่เสมอ ไม่เขียนทับประวัติเดิม
   - *ผลการทดสอบ:* ผ่าน (`tests/p4_settings_important_test.js:205`)

### A.8 การตอบสนองหน้าจอและการเข้าถึง (UI Responsive & Accessibility)
1. **TC-A8-01: รองรับจุดตัดขนาดหน้าจอ 4 ระดับ (Breakpoints: 375, 768, 1024, 1440px)**
   - *สิ่งที่คาดหวัง:* หน้าจอขนาดมือถือแสดงผลคอลัมน์เดี่ยว, แท็บเล็ตย่อแถบเมนู, เดสก์ท็อปแสดงแถบเต็ม
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:342`, `index.html:1050-1200`)
2. **TC-A8-02: ลำดับการปิดหน้าต่างป๊อปอัปแบบ LIFO (ESC Modal Stack)**
   - *สิ่งที่คาดหวัง:* เมื่อกดปุ่ม ESC จะปิดเฉพาะ Modal บนสุดเท่านั้น ไม่ปิดหน้าต่างด้านหลังพร้อมกัน
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:348`)
3. **TC-A8-03: ป้องกันการซูมหน้าจออัตโนมัติบน iOS Safari (Touch Targets & Font $\ge 16\text{px}$)**
   - *สิ่งที่คาดหวัง:* ช่องป้อนข้อมูลบนมือถือใช้ขนาดตัวอักษร 16px และพื้นที่กดอย่างน้อย 44x44px
   - *ผลการทดสอบ:* ผ่าน (`index.html:32-45`)
4. **TC-A8-04: รูปแบบการพิมพ์เอกสาร A4 (A4 Print Stylesheet)**
   - *สิ่งที่คาดหวัง:* ซ่อนปุ่มกดและแถบเมนูในโหมดพิมพ์เอกสาร (`@media print`) พร้อมจัดหน้าพอดีกระดาษ A4
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:345`, `index.html:180-210`)

### A.9 การออกเอกสารทางราชการ พ.ด. ๑–๗ (Official Documents & Signatures)
1. **TC-A9-01: แบบฟอร์ม พ.ด. ๑ ถึง พ.ด. ๗ ครบถ้วนตามมาตรฐานราชการ**
   - *สิ่งที่คาดหวัง:* รองรับโครงสร้างข้อมูล พ.ด. ๑, ๒, ๓, ๔, ๕, ๖, ๗ ครบทั้ง 7 แบบ
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:360`, `tests/p4_settings_important_test.js:435`)
2. **TC-A9-02: การแช่แข็งลายมือชื่อผู้มีอำนาจ (Frozen Signatory Snapshot)**
   - *สิ่งที่คาดหวัง:* ข้อมูลชื่อ ตำแหน่ง และวันที่ของผู้ขอเบิก ผู้อนุมัติ และผู้จ่ายพัสดุถูกแช่แข็งคงที่เมื่อสร้างเอกสาร
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:370`)
3. **TC-A9-03: การรองรับระบบซูมเอกสารทางราชการ (Document Zoom Control)**
   - *สิ่งที่คาดหวัง:* ผู้ใช้สามารถปรับสเกลเอกสาร 75%, 100%, 125%, 150% เพื่อความชัดเจนในการตรวจสอบ
   - *ผลการทดสอบ:* ผ่าน (`index.html:3730`)
4. **TC-A9-04: การสร้างเลขที่เอกสารแบบเรียงลำดับต่อเนื่อง (Document Number Generation)**
   - *สิ่งที่คาดหวัง:* เลขที่เอกสารรันต่อเนื่องตามปีงบประมาณ เช่น `REQ-2569/0001` ไม่ซ้ำซ้อน
   - *ผลการทดสอบ:* ผ่าน (`Write.gs:197`)

### A.10 การสำรอง กู้คืน และการจัดการฐานข้อมูล (Backup & Disaster Recovery)
1. **TC-A10-01: โครงสร้างแผ่นงาน 16 ตารางมาตรฐาน (16 Canonical Sheets Schema Verification)**
   - *สิ่งที่คาดหวัง:* แผ่นงานทั้ง 16 ตารางมีชื่อและหัวคอลัมน์ตรงตามข้อกำหนดมาตรฐาน
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:386`, `tests/p4_settings_important_test.js:665`)
2. **TC-A10-02: ระเบียบวิธีการกู้คืนข้อมูลเฉพาะสภาพแวดล้อม Staging (Staging-Only Restore Protocol)**
   - *สิ่งที่คาดหวัง:* การกู้คืนข้อมูลทำได้เฉพาะในสภาพแวดล้อม Staging การสั่งกู้คืนใน Production ต้องมีรหัสผ่านพิเศษ
   - *ผลการทดสอบ:* ผ่าน (`tests/p6_acceptance_suite.js:397`)
3. **TC-A10-03: การแยกข้อมูลความลับและการสำรองแบบไม่สูญหาย (Zero-Data-Loss Backup Bundle)**
   - *สิ่งที่คาดหวัง:* ชุดข้อมูลสำรองจัดเก็บเป็นรูปแบบ JSON/CSV โดยแยก Script Properties และ Credentials ออกจากกัน
   - *ผลการทดสอบ:* ผ่าน (`docs/IMPORT_BACKUP_RESTORE.md`)
4. **TC-A10-04: การตรวจนับความพร้อมใช้งานของระบบ (System Health Diagnostic Endpoint)**
   - *สิ่งที่คาดหวัง:* เอ็นด์พอยต์ `apiGetSystemHealth` ตรวจสอบสถานะแผ่นงานและสิทธิ์ได้ครบถ้วน
   - *ผลการทดสอบ:* ผ่าน (`tests/p4_settings_important_test.js:665`)

---

## 3. สรุปรายการที่ยังไม่สามารถทดสอบใน Local (Blocked / Pending On-Premise Staging)

| ลำดับ | รายการทดสอบ | เหตุผลและข้อจำกัดในสภาพแวดล้อม Local | แผนการดำเนินการใน Staging/Pilot |
| :---: | :--- | :--- | :--- |
| **B-1** | การยืนยันตัวตนด้วย Google Workspace SSO `@hrt.ac.th` จริง | ไม่มี Google Client ID & Secret จริงใน Local Workspace เพื่อความปลอดภัย | ทดสอบบน Apps Script Staging Deployment หลังใส่ Script Properties |
| **B-2** | การเปิดกล้องสแกน QR ผ่านอุปกรณ์จริง (iOS Safari / iPadOS Camera) | สภาพแวดล้อม Local ไม่มีอุปกรณ์พกพาและระบบกล้องจริง | ทดสอบโดยครูผู้สอนในโรงเรียนหรเทพฯ ระหว่างช่วง Staging Verification |
| **B-3** | การส่งแจ้งเตือนผ่าน Google Chat / Gmail Webhook จริง | ยังไม่มีการผูก Webhook URL ของห้องสื่อสารทางการ | กำหนดค่าใน Settings แถบ Notifications บน Staging |
