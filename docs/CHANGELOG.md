# บันทึกการเปลี่ยนแปลงระบบ (System Changelog)
## HRT Inventory System (โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี))

---

### [v2.7.0-rc.4] - 2026-10-28
#### การแยกโค้ดแอปใช้งานจริงออกจากข้อมูลจำลอง (Clean Code & Mock Data Separation), การกำจัดข้อมูลสังเคราะห์ออกจาก Live Runtime, การสร้าง Standalone Demo Sandbox และชุดทดสอบความสมบูรณ์ 82 รายการ (Prompt 09)
- **สถานะรุ่น**: `STAGING_RELEASE_CANDIDATE_4` (ผ่านเกณฑ์สำหรับทดสอบใน Staging; ระงับการขึ้น Production ไว้ชั่วคราวเนื่องจากต้องรอข้อมูลประจำตัวจริง)
- **รุ่นก่อนหน้า**: `v2.7.0-rc.3` $\rightarrow$ ส่งออกจริง: `v2.7.0-rc.4`
- **Git Base Commit**: `dd000c0`
- **ผลการทดสอบอัตโนมัติ**: ผ่าน 82 จาก 82 การทดสอบ (100% Pass Rate) ครอบคลุมชุดทดสอบ Prompt 00 ถึง Prompt 09 ทั้ง 8 ชุด

#### สรุปผลงานทางวิศวกรรมรอบ Clean Code & Mock Data Separation:
1. **การตรวจสอบและสืบเสาะข้อมูลจำลองเดิม (Mock & Synthetic Data Audit):**
   - สืบเสาะและสกัดข้อมูลพัสดุตัวอย่าง 100 รายการ (`rawMasterItems`), ประวัติการเคลื่อนไหว 20 รายการ (`mockHistories`), ใบเบิกตัวอย่าง 5 ฉบับ (`mockRequisitionPresets`), และรหัสพัสดุมาตรฐาน FSN 7 รายการ (`fsnData`) ออกจาก `index.html` และ `frontend/main/App.js` ไปยังไฟล์ JSON ใน `tests/fixtures/`
2. **การชำระล้างรันไทม์จริง (Live Runtime Cleansing):**
   - กำหนดให้ตัวแปรข้อมูลทั้งหมดในรันไทม์จริงเริ่มต้นเป็นอาเรย์ว่างเปล่า (`[]`)
   - รองรับสภาวะฐานข้อมูลว่างเปล่าของจริง (Genuine Empty State): แสดงผลคอนเทนเนอร์ `#tableEmptyState` พร้อมข้อความแจ้งเตือนอย่างถูกต้อง โดยไม่มีการแอบสร้างข้อมูลเริ่มต้น (Auto-seed) ลงในชีตจริง
3. **การบังคับใช้มาตรการความปลอดภัย Fail-Closed และการกำจัดอัตลักษณ์จำลอง:**
   - กำจัดอัตลักษณ์จำลองนายอนันต์ (`USR-ANANT-01`) ออกจาก `UserApi` และบันทึก Audit Trail อย่างสมบูรณ์; หากผู้ใช้ยังไม่เข้าสู่ระบบ `UserApi.getCurrentUser()` จะส่งคืน `null` ทันที และบันทึกผู้กระทำเป็น `SYSTEM_ANONYMOUS`
   - ยกเลิกระบบจำลองการเรียกใช้งานเงียบ (`mockDispatcher`) ใน `ApiServiceCore`; หากเปิดใช้งานนอกสภาพแวดล้อม Google Apps Script จะ Reject ด้วย Error Code `BACKEND_UNAVAILABLE` เพื่อป้องกันความเข้าใจผิดของผู้ใช้
   - ป้องกันการปลอมแปลงสิทธิ์ (Role Spoofing) ผ่าน URL Parameters หรือ LocalStorage อย่างเคร่งครัด
4. **การพัฒนา Test Fixtures และ In-Memory Adapters:**
   - พัฒนา `tests/fixtures/synthetic_fixtures.js` และ `tests/adapters/in_memory_repository.js` เพื่อจำลองคลังพัสดุ ใบเบิก สิทธิ์ผู้ใช้ นาฬิการะบบ และตัวสร้างรหัสสำหรับรันชุดทดสอบโดยไม่พึ่งพา Google Sheets จริง
5. **การสร้างทางเข้าสาธิตระบบแยกเดี่ยว (Standalone Demo Entry Point):**
   - พัฒนาสคริปต์ `scripts/build_demo_html.js` และสร้างไฟล์ `demo.html` ที่มีแบนเนอร์แจ้งเตือน `[DEMO & TESTING MODE]` ด้านบนสุด พร้อมตัวแปร `window.__DEMO_STORE__` และปุ่มสลับบทบาทผู้ใช้ (`window.switchDemoUserPrompt()`) ในหน่วยความจำอย่างปลอดภัย
6. **การพัฒนาชุดทดสอบความสมบูรณ์ 10 สถานการณ์ (Prompt 09 Separation Suite):**
   - พัฒนา `tests/p9_clean_separation_test.js` ครอบคลุม 10 กรณีทดสอบหลัก ส่งผลให้ผ่านการทดสอบอัตโนมัติครบถ้วน 82/82 รายการ (100%)

---

### [v2.7.0-rc.3] - 2026-10-28
#### การสังเคราะห์สถาปัตยกรรมแบ็กเอนด์, การรวมศูนย์ Single SSOT Writer, การกระทบยอดสคีมา 16 แผ่นงาน และชุดทดสอบความสมบูรณ์ 72 รายการ (Prompt 08)
- **สถานะรุ่น**: `STAGING_RELEASE_CANDIDATE_3` (ผ่านเกณฑ์สำหรับทดสอบใน Staging; ระงับการขึ้น Production ไว้ชั่วคราวเนื่องจากต้องรอข้อมูลประจำตัวจริง)
- **รุ่นก่อนหน้า**: `v2.7.0-rc.2` $\rightarrow$ ส่งออกจริง: `v2.7.0-rc.3`
- **Git Base Commit**: `dd000c0`
- **ผลการทดสอบอัตโนมัติ**: ผ่าน 72 จาก 72 การทดสอบ (100% Pass Rate) ครอบคลุมชุดทดสอบ Prompt 00 ถึง Prompt 08 ทั้ง 7 ชุด

#### สรุปผลงานทางวิศวกรรมรอบสถาปัตยกรรมแบ็กเอนด์และฐานข้อมูลชีต:
1. **การจำแนกความจริงเชิงประจักษ์และการรวมศูนย์ Single Project Writer:**
   - ชี้ขาดให้ Root `*.gs` (`Config.gs`, `Code.gs`, `Api.gs`, `Read.gs`, `Write.gs`, `Audit.gs`) เป็น Authoritative Single Source of Truth (SSOT) เพียงชุดเดียวในการอ่านและเขียนชีต
   - ระงับโค้ดในโฟลเดอร์ข้อเสนอ `backend/` และ `apps_script/` ไว้เป็น Archive/Reference เพื่อป้องกัน Multi-writer Conflict
   - ยืนยันว่า `CleanFilde.html` เป็นเพียง Snippet ความยาว 11 บรรทัด ไม่สามารถใช้ยืนยันการเชื่อมต่อแบ็กเอนด์ได้
   - บังคับการสื่อสารระหว่าง Frontend และ Backend ผ่าน `google.script.run` Universal Action Dispatcher (ไม่มี fake relative `/api`)
2. **การกระทบยอดสคีมา 16 แผ่นงานมาตรฐาน และการแมป 20 กลุ่มเชิงตรรกะ:**
   - คลี่คลายข้อขัดแย้งจำนวนแผ่นงานในประวัติศาสตร์ (15 vs 14 vs 16 vs 2 ชีต) ยืนยันการใช้ **16 แผ่นงานมาตรฐาน** ใน `Config.gs`
   - จำแนก 20 กลุ่มข้อมูลเชิงตรรกะ (Logical Entities) ลงสู่ 16 แผ่นงานจริงโดยไม่สร้างชีตเกินจำเป็น (ไม่ใช่ 26 ชีต)
3. **การพิทักษ์บัญชีคุมพัสดุเดี่ยว (SSOT Ledger) และวงจรชีวิตสต็อก:**
   - รวมศูนย์การเคลื่อนไหวของพัสดุทุกชนิดลงใน `10_Stock_Ledger` เพียงแผ่นงานเดียว
   - แยกอัตลักษณ์พัสดุหลัก (`item_id`) ออกจากยอดคงเหลือรายคลังและปีงบประมาณ (`fiscal_year + item_id + warehouse_id`)
   - บังคับใช้ทิศทางมาตรฐาน 7 ทิศทาง (`RECEIVE`, `ISSUE`, `OPENING`, `ADJUST_PLUS`, `ADJUST_MINUS`, `RETURN`, `DISPOSAL`) และปฏิเสธ `ADJUST` ที่ไม่ระบุทิศทางทันที
   - กำกับดูแลจำนวนพัสดุ 4 ระดับอย่างเคร่งครัด: `qty_requested`, `qty_approved`, `qty_issued`, `qty_received`
   - ยืนยันการตัดสต็อกแบบ Decoupled: ตัดสต็อกเฉพาะเมื่อเจ้าหน้าที่ส่งมอบพัสดุ (`ISSUED`) และไม่ตัดซ้ำเมื่อผู้รับกดยืนยัน (`RECEIVED`)
4. **การแยกแยะความหมายของการตรวจนับจริง (Physical Count Semantics):**
   - จำแนกความแตกต่างระหว่าง `null` (ยังไม่ได้ตรวจนับ - Uninspected) และ `0` (ตรวจนับแล้วพบศูนย์ชิ้น - Inspected Zero)
5. **กลไกการกู้คืนธุรกรรมและการทดสอบฉีดความล้มเหลว (Commit Markers & Failure Injection):**
   - วางสถาปัตยกรรม Commit Markers (`PENDING`, `COMMITTED`, `FAILED`) พร้อม Lease Expiration 30 วินาที
   - ยืนยันผลการทดสอบฉีดความล้มเหลวใน `tests/p8_backend_sheets_architecture_test.js` (Scenario 3): สต็อกไม่เสียหาย 100% เมื่อเกิด Timeout กลางคัน
6. **การป้องกันความปลอดภัยและการคัดกรองข้อมูล:**
   - ฟังก์ชัน `sanitizeCellValue` ป้องกัน Formula Injection (`=, +, -, @`)
   - ป้องกัน Concurrency ด้วย `LockService.getScriptLock()` 60 วินาที และการ Re-read สถานะใหม่ใน Critical Section
   - กรองและซ่อนรหัสลับ/โทเค็นออกจากบันทึก Audit Trail

---

### [v2.7.0-rc.2] - 2026-10-28
#### ศูนย์กลางการตั้งค่าระบบ 8 หมวดหมู่ (Settings Hub Level 3), การควบคุมสิทธิ์ RBAC รายเซกชัน และชุดทดสอบความสมบูรณ์ 62 รายการ (Prompt 07)
- **สถานะรุ่น**: `STAGING_RELEASE_CANDIDATE_2` (ผ่านเกณฑ์สำหรับทดสอบใน Staging; ระงับการขึ้น Production ไว้ชั่วคราวเนื่องจากต้องรอข้อมูลประจำตัวจริง)
- **รุ่นก่อนหน้า**: `v2.7.0-rc.1` $\rightarrow$ ส่งออกจริง: `v2.7.0-rc.2`
- **Git Base Commit**: `dd000c0`
- **ผลการทดสอบอัตโนมัติ**: ผ่าน 62 จาก 62 การทดสอบ (100% Pass Rate) ครอบคลุมทั้ง Regression Suite, P1-P4, P6 Acceptance และ P7 Settings Suite 10 หมวดหมู่

#### สรุปผลงานทางวิศวกรรมรอบ Settings Hub (8 Categories Architecture):
1. **หมวด 1: ข้อมูลสถานศึกษาและหัวเอกสาร (School Profile & Signatories):**
   - เชื่อมโยงข้อมูล `school_name`, `school_short_name`, `school_org`, `school_agency`, `school_address`, `school_phone`, `school_email`
   - กำหนดรูปแบบเลขที่เอกสาร (`document_prefix`, `document_pattern`) และบันทึกชื่อผู้ลงนาม (`officer_name`, `director_name`)
   - ยืนยันการทำงานของ `signatories_snapshot`: เอกสารและใบเบิกในอดีตจะคงสภาพลายเซ็น ณ วันที่จ่ายจริง แม้จะมีการเปลี่ยนผู้บริหารหรือเจ้าหน้าที่ในหน้าตั้งค่าภายหลัง
2. **หมวด 2: ผู้ใช้ การเข้าสู่ระบบ และสิทธิ์ (Users & Granular RBAC):**
   - พัฒนาตารางบริหารจัดการบัญชีผู้ใช้งาน ค้นหา และกรองตามบทบาท (ADMIN, DIRECTOR, OFFICER, REQUESTER)
   - ป้องกันสิทธิ์ระดับเซกชัน: ผู้ใช้บทบาท REQUESTER ถูกปฏิเสธเมื่อพยายามเข้าถึงหรือแก้ไขเซกชันระบบ บัญชี หรือการสำรองข้อมูล
   - เพิ่มระบบป้องกัน Last-Admin Protection: ปฏิเสธการลดสิทธิ์หรือระงับบัญชีผู้ดูแลระบบคนสุดท้ายของระบบอย่างเด็ดขาดทั้งฝั่งเซิร์ฟเวอร์และไคลเอนต์
3. **หมวด 3: ปีงบประมาณ (Fiscal Year Lifecycle):**
   - แยกปีงบประมาณที่กำลังดู (`viewingYear`) ออกจากปีที่เปิดทำธุรกรรม (`activeYear`) อย่างชัดเจน
   - บังคับใช้ Closed-Year Write Lock: ปฏิเสธการสร้างหรืออนุมัติธุรกรรมที่เจาะจงปีงบประมาณที่ปิดรอบบัญชีแล้ว
   - เพิ่ม Modal เตรียมเปิดรอบปีงบประมาณใหม่ตามปฏิทินหลวง (1 ต.ค. - 30 ก.ย.)
4. **หมวด 4: ข้อมูลกลางพัสดุ (Master Data Management):**
   - จัดการข้อมูลฝ่ายงาน/กลุ่มสาระฯ (Departments), คลังพัสดุ (Warehouses), หมวดหมู่ (Categories), และหน่วยนับ (Units)
   - แสดงจำนวนรายการพัสดุที่อ้างอิงข้อมูลกลาง (FK Dependency Count) เพื่อป้องกันการลบข้อมูลที่ยังใช้งานอยู่
   - บังคับใช้ Soft-delete: หากข้อมูลกลางถูกใช้อ้างอิงอยู่ ระบบจะเปลี่ยนสถานะเป็น `INACTIVE` แทนการลบแถว
5. **หมวด 5: กติกาการเบิกและสต็อก (Business Rules & Thresholds):**
   - ตั้งค่าเกณฑ์พาเรโต ABC โดยบังคับความถูกต้องทางตรรกะ $0 < A < B \le 100$
   - ตรวจสอบระดับสต็อกขั้นต่ำ (Min) และจุดสั่งซื้อซ้ำ (ROP) ห้ามเป็นค่าติดลบ
   - บังคับใช้กฎหน่วยนับ: ปฏิเสธจำนวนทศนิยมในหน่วยนับแบบจำนวนเต็ม (รีม, กล่อง, เล่ม, อัน, ชิ้น) และอนุญาตทศนิยมเฉพาะหน่วยนับต่อเนื่อง (กิโลกรัม, ลิตร, เมตร)
6. **หมวด 6: MiniUI และ QR Code Generator:**
   - สวิตช์ควบคุมระบบ MiniUI: เปิด/ปิดการเบิกด้วยตนเอง, การสแกนดูสารบบ, และการบันทึกร่างออฟไลน์
   - พัฒนาเครื่องมือสร้างป้าย QR Code 4 รูปแบบ: `ITEM`, `ROOM`, `TRACK`, `GENERAL`
   - เพิ่ม Live SVG QR Preview พร้อม Quiet Zone และข้อความกำกับที่อ่านได้
   - เพิ่มหน้าต่างพิมพ์ป้าย QR Code ในรูปแบบมาตรฐาน A4 พร้อมติดจุดบริการ
7. **หมวด 7: การเชื่อมต่อ นำเข้า และสำรองข้อมูล (Connection, Import & Backup):**
   - ปุ่มทดสอบความสมบูรณ์ฐานข้อมูล (Health Check Diagnostic) ตรวจสอบความพร้อมของทั้ง 16 ชีต
   - เครื่องมือตรวจสอบไฟล์นำเข้า CSV (Dry-Run Mode) พร้อมระบบป้องกัน Formula Injection
   - ระบบ Full Backup สร้าง Snapshot ฐานข้อมูลฉุกเฉิน และ Modal ทดสอบกู้คืนข้อมูลแบบ Staging Isolation
8. **หมวด 8: ประวัติและการตรวจสอบระบบ (Audit Trail & System Info):**
   - ตารางบันทึกประวัติการเปลี่ยนแปลงระบบ พร้อมฟิลเตอร์ค้นหาและการตรวจสอบ SHA-256 Hash Chain
   - แสดงข้อมูลจำเพาะระบบ: HRT Inventory System v2.7.0-rc.2 (Baseline v2.6.0)

---
### [v2.7.0-rc.1] - 2026-10-25
#### การตรวจสอบรับรองระบบรอบด้านและการจัดระดับรุ่น Release Candidate 1 (Prompt 06)
- **สถานะรุ่น**: `STAGING_RELEASE_CANDIDATE` (ผ่านเกณฑ์สำหรับทดสอบใน Staging; ระงับการขึ้น Production ไว้ชั่วคราวเนื่องจากต้องรอข้อมูลประจำตัวจริง)
- **รุ่นก่อนหน้า**: `v2.7.0-dev.5` $\rightarrow$ ส่งออกจริง: `v2.7.0-rc.1`
- **Git Base Commit**: `dd000c0`
- **ผลการทดสอบอัตโนมัติ**: ผ่าน 52 จาก 52 การทดสอบ (100% Pass Rate) ครอบคลุม 10 หมวดการตรวจรับ (A.1 – A.10)

#### สรุปการปรับปรุงและงานทางวิศวกรรมในรอบ Release Candidate:
1. **การปรับแต่งประสิทธิภาพระดับสถาปัตยกรรม (Architecture Optimizations Hardening):**
   - **O-1 (Real-Time Active User Verification):** ตรวจสอบสถานะ `ACTIVE` ของผู้ใช้โดยตรงจากแผ่นงาน `01_Users` ในทุกธุรกรรมเขียน ป้องกันบัญชีที่ถูกระงับทำรายการ
   - **O-2 (History Slicing & Pagination):** ปรับปรุง `getHistoryMap(fiscalYear, options)` ให้รองรับ `limit` ลดขนาด Payload ประวัติธุรกรรมลง 85% ถึง 99.7% และคงที่ที่ ~11.8 KB
   - **O-3 (Order-Invariant Line IDs):** ปรับปรุงการสร้างรหัสแถวใบเบิกใน `Write.gs` เป็น `RQI-${reqId}-${it.item_code}` ซึ่งคงทนต่อการเรียงลำดับและคำขอย้อนกลับ
   - **N-1 (Dynamic Scoped Cache Key):** เชื่อมโยงกุญแจแคชแดชบอร์ดเข้ากับ `getCacheScopePrefix()` และ `data_revision` เพื่อล้างแคชทันทีที่มีการเคลื่อนไหวสต็อกจริง
2. **การจัดทำชุดทดสอบรับรอง 10 หมวดหลัก (10-Area Acceptance Test Suite):**
   - สร้างไฟล์ `tests/p6_acceptance_suite.js` ครอบคลุม A.1 (Auth/RBAC), A.2 (Fiscal Lifecycle), A.3 (Dashboard/ABC), A.4 (Requisition E2E), A.5 (Integrity/Concurrency), A.6 (Year-End Audit), A.7 (Settings/CSV), A.8 (UI/A11y), A.9 (Gov Forms พ.ด. ๑–๗), และ A.10 (Backup/Restore)
3. **การจัดทำชุดเอกสารตรวจรับและส่งมอบฉบับสมบูรณ์ (7 Canonical Deliverables):**
   - `docs/REGRESSION_TEST_REPORT.md`: รายงานผลทดสอบ 10 หมวดอย่างละเอียด
   - `docs/RELEASE_READINESS_CHECKLIST.md`: รายการตรวจสอบเกณฑ์ประตูการส่งมอบ
   - `docs/DEPLOYMENT_AND_ROLLBACK_RUNBOOK.md`: คู่มือการนำขึ้นระบบและการย้อนกลับ
   - `docs/USER_GUIDE_MINIUI.md`: คู่มือการใช้งานสำหรับครูและเจ้าหน้าที่พัสดุ
   - `docs/FINAL_REMEDIATION_REPORT.md`: ตารางเมทริกซ์การแก้ไข 20 ข้อบกพร่องตามรายงาน Audit
   - `docs/PERFORMANCE_BASELINE_AND_RESULTS.md`: รายงานผลการวัดประสิทธิภาพเชิงประจักษ์ 3 ระดับขนาดข้อมูล
   - `docs/VERSION_MANIFEST.json`: บัญชีข้อมูลจำเพาะรุ่นพร้อมลายพิมพ์นิ้วมือ SHA-256

---

### [v2.7.0-dev.5] - 2026-10-24
#### การทดสอบประสิทธิภาพเชิงประจักษ์และระบบแคชจำแนกขอบเขต (Prompt 05)
- **สถานะรุ่น**: `DEV_STAGING_PREVIEW`
- **รุ่นก่อนหน้า**: `v2.7.0-dev.4` $\rightarrow$ ส่งออกจริง: `v2.7.0-dev.5`
- **เครื่องมือวัดประสิทธิภาพ**: พัฒนา `scripts/benchmark_engine.js` วัดผล 30 รอบในขนาดข้อมูล 100, 1,000, และ 5,000 รายการ
- **การปรับปรุงระบบแคช**: เพิ่ม `getCacheScopePrefix()` (`hrt_{env}_v{ver}_db{dbId}_`) และตัวติดตามการแก้ไขข้อมูล `data_revision`
- **ผลการวัด**: ลดขนาด Payload ลง 85.3% - 99.7% และเพิ่มความเร็วในการตอบสนอง 1.48x - 2.63x

---

### [v2.7.0-dev.4] - 2026-10-24
#### การเปลี่ยนแปลงสำคัญในรอบ Prompt 04 (Important Findings I-1 to I-5 & Settings 9 Areas)
- **สถานะรุ่น**: `DEV_STAGING_PREVIEW` (ยังไม่ใช่รุ่น Production ปล่อยจริง)
- **รุ่นก่อนหน้า**: `v2.7.0-dev.3` $\rightarrow$ ส่งออกจริง: `v2.7.0-dev.4`
- **Git Base Commit**: `dd000c0`

#### การแก้ไขข้อบกพร่องระดับสำคัญ (Important Findings I-1 to I-5 Fixed):
1. **I-1: เพิ่ม Canonical Transaction Types และจำกัดการคำนวณอัตราการเคลื่อนไหวตามธุรกรรมจ่ายจริง**
   - เพิ่ม `history.transaction_type` Canonical Enum: `RECEIVE`, `ISSUE`, `OPENING`, `ADJUSTMENT_ADD`, `ADJUSTMENT_SUB`, `RETURN`, `DISPOSAL`
   - ปรับปรุงการคำนวณอัตราการเคลื่อนไหวพัสดุ (Movement Velocity) ใน `apiGetItems` ให้นับเฉพาะธุรกรรมจ่ายออก (`ISSUE`, `DISPOSAL`, `ADJUSTMENT_SUB`) เท่านั้น พัสดุที่มีเพียงยอดเปิดบัญชี (OPENING) หรือรับเข้า จะคงสถานะเป็น `non_moving`
2. **I-2: ตรวจสอบ Cardinality 1:1 และการเขียน FSN แบบ 2 เฟสพร้อมระบบกู้คืน (Two-Phase Write with Rollback)**
   - เพิ่มการตรวจสอบความมีอยู่จริงของ Master Item (`FK_NOT_FOUND`) และตรวจสอบความขัดแย้งหากพัสดุถูกผูกกับ FSN อื่นอยู่แล้ว (`LINK_CONFLICT`)
   - นำ Two-Phase Write มาใช้ใน `apiAddFsn` และ `apiLinkFsnToItem`: หากการอัปเดต Master Items ล้มเหลว ระบบจะทำการลบแถว FSN ใน Catalog กลับทันที (`ROLLBACK_SUCCESS`)
3. **I-3: กระบวนการนำเข้า CSV เต็มรูปแบบ พร้อมระบบป้องกัน Formula Injection และลงบัญชีคุมสต็อก**
   - เพิ่มฟังก์ชัน `apiValidateImportItems` สำหรับตรวจสอบข้อมูลแบบ Dry-Run พร้อมแจ้งเตือนข้อผิดพลาดแยกตามแถวและคอลัมน์
   - ระบบป้องกัน Formula Injection: เติมเครื่องหมาย `'` นำหน้าข้อความที่ขึ้นต้นด้วย `=`, `+`, `-`, `@`, `\t`, `\r`
   - บังคับใช้กฎหน่วยนับจำนวนเต็ม (`DECIMAL_NOT_ALLOWED`) ห้ามกรอกทศนิยมในหน่วยชิ้น กล่อง เล่ม
   - จับคู่รายการตาม Composite Key (`code + warehouse`)
   - ห้ามการลบข้อมูลเดิม (Forbid Delete-First) และผลต่างสต็อกจะถูกสร้างเป็นธุรกรรมปรับยอดใน `09_Stock_Transactions` และ `10_Stock_Ledger`
4. **I-4: โหลดข้อมูลกลุ่มสาระ/แผนกจากเซิร์ฟเวอร์ (Server-Authoritative Departments)**
   - ยกเลิกการใช้ Hardcoded Array 14-16 รายชื่อในหน้าเว็บ
   - โหลดข้อมูลจากชีต `02_Departments` โดยตรง พร้อมสถานะ `status`
   - เพิ่มเอนด์พอยต์ `departments.list` / `getDepartments` และเชื่อมต่อทั้งระบบกลางและ MiniUI
5. **I-5: สถานะรอตั้งค่าปีงบประมาณและการ Seed ข้อมูลแบบไม่เกิด Side-Effect บน Read**
   - ปรับปรุง `getAllFiscalYears` ให้เป็น Pure Read-Only 100% ไม่มีการเรียก `appendRow`
   - ส่งคืนอาเรย์ว่าง `[]` พร้อมสถานะ `isConfigured: false` เมื่อยังไม่มีข้อมูล เพื่อเปิดหน้า Setup State
   - เพิ่มเอนด์พอยต์ `apiSetupInitialFiscalYear` สงวนสิทธิ์เฉพาะ ADMIN และทำงานแบบ Idempotent

#### การพัฒนาระบบตั้งค่า 9 หมวดหมู่ (9 Settings Areas):
- **1. ข้อมูลสถานศึกษา (School Profile):** ชื่อ, สังกัด, ที่อยู่, ตราสัญลักษณ์ พร้อม Live Preview
- **2. เอกสารและผู้ลงนาม (Documents & Signatories):** ผู้ลงนามตามสายบังคับบัญชา, `effective_date`, A4 Print Preview, และ Frozen Snapshot บนเอกสารที่จ่ายแล้ว
- **3. ข้อมูลอ้างอิงหลัก (Master Reference Data):** แผนก, คลัง, หมวดหมู่, หน่วยนับ, Dependency Counter และ Soft-Delete (`status = 'INACTIVE'`)
- **4. กฎเกณฑ์ทางธุรกิจ (Business Rules):** Workflow Mode (2-step/3-step), Over-quota, Min/ROP/ABC/Movement rules
- **5. การเชื่อมต่อและระบบ (Connection & Diagnostics):** Masked Spreadsheet ID (`1BxiM...***`), `apiCheckHealth` ตรวจสอบสถานะ Read, Schema (16 ชีต), และ Auth
- **6. นำเข้า/ส่งออกข้อมูล (Import & Export):** CSV Template, Formula Injection Protection, Dry-Run Batch Validation
- **7. สำรองและกู้คืน (Backup & Restore):** Full Backup Bundle (16 Canonical Sheets), Staging-Only Restore Policy
- **8. บันทึกและกู้คืนธุรกรรม (Audit History & Recovery):** ตัวกรองประวัติหลายมิติ, Hash Chain Integrity, Transaction Inspector
- **9. แบบฟอร์มราชการ (N-3 Forms Mapping):** แบบ พ.ด. ๑–๗ แยกสถานะ `OFFICIAL_VERIFIED` และ `PENDING_TEMPLATE`
- **ระบบป้องกันการแก้ไขทับซ้อน (Optimistic Concurrency Control):** ตรวจสอบ `expectedRevisionId` ก่อนบันทึกการตั้งค่า ป้องกันการบันทึกทับ

---

### [v2.7.0-dev.3] - 2026-10-24
#### การเปลี่ยนแปลงสำคัญในรอบ Prompt 03 (Critical Findings & MiniUI End-to-End)
- **สถานะรุ่น**: `DEV_STAGING_PREVIEW` (ยังไม่ใช่รุ่น Production ปล่อยจริง)
- **รุ่นก่อนหน้า (Baseline)**: `v2.6.0` (Historical Baseline ยืนยันโดยเจ้าของระบบ) $\rightarrow$ แผนรับเข้า `v2.7.0-dev.2` $\rightarrow$ ส่งออก `v2.7.0-dev.3`
- **Git Base Commit**: `dd000c0`

#### แก้ไขข้อบกพร่องระดับวิกฤต (Critical Findings C-1 to C-7 Fixed):
1. **C-1: ระบบกรองข้อมูลโครงสร้าง 8 มิติ (8-Dimension Filtering Engine)**
   - รองรับการกรองพัสดุครบ 8 มิติ: `warehouse`, `category`, `status`, `date` (ช่วงวันที่สร้าง/เคลื่อนไหว ISO `startDate`/`endDate`), `movement` (`fast_moving`, `slow_moving`, `non_moving`), `abc` (`A`, `B`, `C`), `fsn` (`fsn_code` หรือ `fsnOnly`), `department` (`department_id` หรือ `dept`) ร่วมกับระบบค้นหาข้อความเดิม
   - กำหนดขอบเขตการคำนวณ KPI และกราฟสอดคล้องกับภาพรวม Universe ไม่บิดเบือนเมื่อมีการกรอง
2. **C-2: การจำแนกกลุ่ม ABC Pareto และกฎการตัดรอบ (Pareto Classification & Boundary Rule)**
   - กำหนดเกณฑ์มูลค่า: $\text{total\_val} = \text{unit\_cost} \times \max(0, \text{stock})$ บนกลุ่มประชากรพัสดุทั้งหมดก่อนการกรอง
   - เกณฑ์ร้อยละสะสม 70% (Class A) และ 90% (Class B)
   - กฎ Tie/Crossing Rule: รายการพัสดุที่ทำให้มูลค่าสะสมข้ามขอบเขต 70% จัดเป็น Class A และรายการที่ข้าม 90% จัดเป็น Class B
   - พัสดุยอดสต็อกหรือมูลค่าเป็นศูนย์/ติดลบถูกกำหนดเป็น Class C เสมอ
   - ป้องกันการคำนวณกลุ่ม ABC ซ้ำซ้อนเมื่อผู้ใช้เลือกดูตัวกรอง ABC เอง
3. **C-3: ระบบตรวจนับพัสดุประจำปี (Year-End Physical Inventory Audit)**
   - `getYearEndAudit`: อ่านข้อมูลที่บันทึกจริงจากชีต `13_Year_End_Audits` โดยไม่สร้างรายการอัตโนมัติเมื่อเปิดอ่าน
   - `saveYearEndAudit`: บันทึกยอดตรวจนับจริง (`count_qty`), คำนวณผลต่าง (`variance`), และสภาพพัสดุ (`condition`)
   - ล็อกการแก้ไขปีงบประมาณที่ปิดรอบแล้ว (`isFiscalYearClosed`) ด้วยข้อผิดพลาด `CLOSED_FISCAL_YEAR`
4. **C-4: ความคงอยู่ของยอดประวัติศาสตร์ (Server Snapshot Persistence)**
   - ยอดสต็อกประวัติศาสตร์ของปีงบประมาณที่ปิดแล้วถูกแช่แข็งในฝั่ง Server และโหลดกลับผ่าน `loadFiscalYearSnapshots` อย่างคงที่ ไม่ผันแปรตามการเพิ่ม/ลดสต็อกใน Master Catalog ปีใหม่
5. **C-5: การตรวจสอบ Foreign Key ของ FSN (Linked Name & Orphan Detection)**
   - `apiGetFsnList`: ตรวจสอบความสัมพันธ์ `linked_code` ไปยังรหัสพัสดุใน Master Items
   - หากพบรายการ: ส่งคืนชื่อพัสดุจริง `linked_name` และสถานะ `LINKED`
   - หากไม่พบรายการ (Orphan Reference): ระบุ `[ไม่พบรายการพัสดุ: {code}]` และสถานะ `ORPHAN` โดยไม่ส่งรหัสแทนชื่อพัสดุเงียบๆ
   - หากพบรหัสซ้ำซ้อน: ระบุสถานะ `CONFLICT`
6. **C-6: สลับปีงบประมาณและป้องกัน Stale Response (Fiscal Year Reload Guard)**
   - กำหนดหมายเลขลำดับคำขอ (Monotonic Sequence Guard) ป้องกันการนำผลลัพธ์คำขอเก่าที่ตอบกลับช้ามาทับปีล่าสุด
   - แสดงสถานะ Loading บนป้ายปี และ Invalidate Cache ในเครื่อง
   - หากการโหลดข้อมูลปีงบประมาณใหม่ล้มเหลว ระบบจะคืนค่า (Rollback) ป้ายปีและตัวแปรสถานะกลับสู่ปีก่อนหน้าทันที ไม่แสดงป้ายปีใหม่เหนือข้อมูลเก่า
7. **C-7: รวมศูนย์บริการคำขอเบิกเดี่ยว/กลุ่มและการตัดสต็อก Decoupled**
   - รวมคำขอเบิกรายชิ้นและตะกร้าหลายชิ้นให้ใช้บริการ `RequisitionApi.createRequisition` ร่วมกัน
   - ยืนยันการบันทึกลง Google Sheets ฝั่ง Server ก่อนปิดฟอร์ม
   - การตัดสต็อกทางกายภาพเกิดขึ้นเฉพาะขั้นตอน `apiIssueStock` (สถานะ `ISSUED`) เท่านั้น ไม่มีการตัดสต็อกล่วงหน้าใน Local

#### ส่วนติดต่อ MiniUI Mobile & QR Shell (End-to-End Workflow):
- **Deep-Link Session Return**: สแกน QR Code ขณะยังไม่ล็อกอิน ระบบจะจำค่า `hrt_pending_qr` และเปิดหน้าที่สแกนให้อัตโนมัติหลังยืนยันตัวตนสำเร็จ
- **4 QR Types Resolution**:
  - `QR:CATALOG` $\rightarrow$ เปิดแคตตาล็อกพัสดุกลาง
  - `QR:ITEM:<code>` $\rightarrow$ เปิดรายละเอียดพัสดุพร้อมระบุจำนวนและเพิ่มลงตะกร้า
  - `QR:WH:<id>` $\rightarrow$ กรองพัสดุเฉพาะคลังนั้นๆ
  - `QR:TRK:<req_id>` $\rightarrow$ ตรวจสอบสิทธิ์และเปิดไทม์ไลน์ติดตามสถานะ
- **Unit Validation**: ตรวจสอบหน่วยนับ (หน่วยนับจำนวนเต็ม เช่น ชิ้น, รีม, ด้าม ปฏิเสธทศนิยม)
- **Network Timeout Recovery**: เก็บ `lastMiniIdempotencyKey` ให้ตรวจสอบผลการบันทึกเดิมก่อนส่งซ้ำ
- **Awaiting Receipt Counter**: แยกตัวนับ "รอรับของ" (`ISSUED`) ออกจาก "จ่าย/รับครบแล้ว" (`RECEIVED`) โดยไม่อนุมัติรับของอัตโนมัติ
- **Queue Polling Indicator**: แสดงเวลาการอัปเดตล่าสุด "อัปเดตล่าสุด: HH:mm:ss" พร้อมระบบ Polling ตรวจสอบคิวทุก 30 วินาที

---

### [v2.7.0-dev.2] - 2026-10-24
#### การเปลี่ยนแปลงในรอบ Prompt 02 (Contract Standardization & Settings Shell)
- จัดทำมาตรฐานสัญญา API และ Data Lifecycle ครอบคลุม 16 ชีต
- ระบบตั้งค่า Settings Shell 8 หมวดหมู่ พร้อม Unsaved Changes (Dirty Form) Guard
- สถาปัตยกรรมคุ้มครองแอดมินคนสุดท้าย (`LAST_ADMIN_PROTECTION`)
- การชำระโทเค็นและข้อมูลลับออกจาก Audit Trail ก่อนคำนวณ SHA-256 Hash Chain

---

### [v2.7.0-dev.1] - 2026-10-24
#### การเปลี่ยนแปลงในรอบ Prompt 01 (Authentication & RBAC Foundation)
- การยืนยันตัวตน Google Workspace SSO และตรวจสอบ Domain Claim (`hrt.ac.th`, `school.internal`)
- ระบบควบคุมสิทธิ์ Granular RBAC Fail-Closed ป้องกันสิทธิ์แบบ Client-Side Spoofing
- ระบบความปลอดภัย Persistent Idempotency Log

---

### [v2.6.0] - Baseline Release
- เวอร์ชันตั้งต้น (Historical Baseline) ก่อนการทำ Clean File และ Audit Remediation
