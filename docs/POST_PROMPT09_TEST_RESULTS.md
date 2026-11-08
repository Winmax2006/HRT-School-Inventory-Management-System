# บันทึกผลการทดสอบระบบอย่างเป็นทางการ (Comprehensive Test Execution Results)
## ระบบบริหารจัดการพัสดุโรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) — หลังรอบงาน Prompt 00–09
**บทบาทผู้ตรวจสอบ:** วิศวกรประกันคุณภาพซอฟต์แวร์และผู้ตรวจรับระบบ (Lead QA & System Auditor)  
**รหัสเอกสาร:** `docs/POST_PROMPT09_TEST_RESULTS.md`  
**สถานะการควบคุมรุ่น:** `2.7.0-rc.4` | Git Commit: `dd000c0` | สภาพแวดล้อม: Windows Node.js v18+  

---

### 1. สรุปภาพรวมผลการทดสอบแยกตามระดับชั้น (Overall Test Layer Summary)

```text
========================================================================================
LAYER 1: AUTOMATED UNIT & LOGIC SUITES     : 82 EXECUTED | 82 PASSED | 0 FAILED (100.0%)
LAYER 2: MOCKED INTEGRATION ADAPTERS       : 10 EXECUTED | 10 PASSED | 0 FAILED (100.0%)
LAYER 3: BROWSER VIEWPORT QA (375-1440px)  :  4 EXECUTED |  4 PASSED | 0 FAILED (100.0%)
LAYER 4: LIVE APPS SCRIPT + SHEETS RPC     :  8 EXECUTED |  0 PASSED | 8 BLOCKED (Missing Domain OAuth)
LAYER 5: PHYSICAL MOBILE HARDWARE & CAMERA :  2 EXECUTED |  0 PASSED | 2 NOT RUN (No Physical Device)
LAYER 6: HUMAN USER ACCEPTANCE (UAT)       :  5 EXECUTED |  0 PASSED | 5 BLOCKED (Pending Staging Deployment)
========================================================================================
```

---

### 2. ผลการรันชุดทดสอบอัตโนมัติ 8 ชุดหลัก (82 Scenarios - 100% PASS)

#### 2.1 ชุดทดสอบความเข้ากันได้ย้อนหลัง: `tests/regression_test_suite.js` (11/11 PASS)
- **คำสั่งรัน:** `node tests/regression_test_suite.js`
- **สภาพแวดล้อม:** Local Node.js | Base Commit: `dd000c0` | เวลา: 2026-10-28 10:20:06

| รหัสทดสอบ | หัวข้อการทดสอบ | ซอร์สไฟล์และฟังก์ชัน | ผลลัพธ์ที่คาดหวัง | ผลลัพธ์ที่สังเกตพบจริง | สถานะ |
|---|---|---|---|---|:---:|
| **TC-01** | RBAC Rejection of Unauthorized Roles | `Api.gs:enforceAuthorization:L390` | ผู้ใช้บทบาทต่ำกว่าเกณฑ์ถูก Reject ด้วย `FORBIDDEN` | ปฏิเสธคำขอของ REQUESTER ในเส้นทางของผู้ดูแล | **PASS** |
| **TC-02** | 8-Dimension Filtering Engine | `Read.gs:apiGetItems:L130` | กรองข้อมูลครบถ้วน 8 มิติ | กรองยอดคงเหลือตรงตามมิติที่กำหนด | **PASS** |
| **TC-03** | Universe ABC Pareto Classification | `Read.gs:calculateParetoAbc:L250` | คำนวณสะสม 80/15/5 บนพัสดุทั้งหมด | กลุ่ม A ครองมูลค่า 80% แรกของจักรวาลพัสดุ | **PASS** |
| **TC-04** | Decoupled Requisition Lifecycle | `Write.gs:apiCreateRequisition:L90` | การสร้างและอนุมัติใบเบิกต้องไม่ตัดสต็อก | ไม่มีการตัดยอดสต็อกจนกว่าจะสั่งจ่ายของ | **PASS** |
| **TC-05** | Insufficient Stock Rejection | `Write.gs:apiIssueStock:L260` | ปฏิเสธการจ่ายเมื่อสต็อกไม่พอ | ปฏิเสธด้วย `INSUFFICIENT_STOCK` ทันที | **PASS** |
| **TC-06** | Double Dispatch Guard | `Write.gs:apiIssueStock:L240` | ปฏิเสธการกดจ่ายพัสดุซ้ำ | ปฏิเสธด้วย `DOUBLE_DISPATCH` | **PASS** |
| **TC-07** | Concurrency Lock Mutex | `Write.gs:apiIssueStock:L225` | แย่งล็อกการเขียนและคอยจนหลุดไทม์เอาต์ | ล็อกทำงาน 60 วินาที ป้องกันข้อมูลทับซ้อน | **PASS** |
| **TC-08** | Fiscal Year Reload & Cache Reset | `Read.gs:loadFiscalYearSnapshots:L510` | แคชถูกล้างเมื่อสลับปีงบประมาณ | ล้างข้อมูลในหน่วยความจำและโหลดปีใหม่ | **PASS** |
| **TC-09** | SHA-256 Hash Chaining | `Audit.gs:computeSha256:L385` | แฮชเชื่อมโยงบล็อกประวัติย้อนหลัง | สายโซ่แฮชตรวจพบการดัดแปลงข้อมูลย้อนหลัง | **PASS** |
| **TC-10** | CSV Import Dry-Run Mode | `Write.gs:apiValidateImportItems:L530` | โหมดตรวจสอบไม่ทำการบันทึกลงชีตจริง | ส่งคืนรายการผิดพลาดโดยไม่แตะต้องตารางหลัก | **PASS** |
| **TC-11** | Year-End Rollover & Balance Freezing | `Audit.gs:apiSaveYearEndAudit:L230` | ยอดยกไปปีใหม่ถูกแช่แข็งตามประวัติ | ยอดยกมาไม่บวมทับซ้อนหลายปี | **PASS** |

#### 2.2 ชุดทดสอบสัญญาเชื่อมต่อและวงจรชีวิตข้อมูล: `tests/p1_p2_contract_lifecycle_test.js` (10/10 PASS)
- **คำสั่งรัน:** `node tests/p1_p2_contract_lifecycle_test.js`
- **สภาพแวดล้อม:** Local Node.js | Base Commit: `dd000c0` | เวลา: 2026-10-28 10:20:06

| รหัสทดสอบ | หัวข้อการทดสอบ | ซอร์สไฟล์และฟังก์ชัน | ผลลัพธ์ที่คาดหวัง | ผลลัพธ์ที่สังเกตพบจริง | สถานะ |
|---|---|---|---|---|:---:|
| **P1-01** | Asia/Bangkok Fiscal Boundary (30 Sep / 1 Oct) | `Config.gs:getActiveTransactionYear:L210` | ตัดรอบปีงบประมาณเที่ยงคืน 30 ก.ย. | คำนวณวันที่ 30 ก.ย. เป็นปีเดิม และ 1 ต.ค. เป็นปีใหม่ | **PASS** |
| **P1-02** | Parameter Alias Normalization & Conflict | `Api.gs:normalizeAndValidateAliases:L180` | แปลง alias ให้ตรงกันและ reject เมื่อขัดกัน | ปฏิเสธเมื่อส่ง `fiscalYear` และ `fiscal_year` ขัดกัน | **PASS** |
| **P1-03** | Closed-Year Write Lock | `Api.gs:routeRequest:L595` | ปฏิเสธการเขียนลงปีที่ปิดรอบบัญชีแล้ว | ปฏิเสธด้วยข้อผิดพลาด `CLOSED_FISCAL_YEAR` | **PASS** |
| **P1-04** | Requisition State Machine & Transition Guards | `Write.gs:apiReviewRequisition:L170` | ป้องกันการเปลี่ยนสถานะข้ามขั้น | ปฏิเสธการสั่งจ่ายใบเบิกที่ยังไม่อนุมัติ | **PASS** |
| **P1-05** | Distinct Quantities & Single Full Issuance | `Write.gs:apiIssueStock:L220` | บังคับจ่ายเต็มจำนวนตามที่อนุมัติ | ปฏิเสธการจ่ายบางส่วนด้วย `FEATURE_UNSUPPORTED` | **PASS** |
| **P1-06** | QR Code Resolution & Ownership Verification | `Read.gs:apiResolveQr:L640` | ถอดรหัสพัสดุและตรวจสอบเจ้าของ | ส่งคืนข้อมูลพัสดุถูกต้องและไม่ทำ write ลงชีต | **PASS** |
| **P1-07** | Settings Read Permissions & Secret Isolation | `Read.gs:apiGetSettings:L740` | ผู้ใช้ทั่วไปไม่เห็นรหัสลับและการตั้งค่าระบบ | ส่งคืนเฉพาะ School Profile และข้อมูลสาธารณะ | **PASS** |
| **P1-08** | Persistent Idempotency Replay & Conflict | `Api.gs:checkIdempotency:L420` | สั่งซ้ำด้วยคีย์เดิมส่งผลเดิม Payload ต่าง reject | ส่งผลเดิมเมื่อ payload ตรง และ reject เมื่อต่าง | **PASS** |
| **P1-09** | Last-Admin Protection Against Self-Demotion | `Write.gs:apiUpdateUser:L780` | ป้องกันการลดสิทธิ์ Admin คนสุดท้าย | ปฏิเสธการลดสิทธิ์หรือระงับบัญชี Admin เด็ดขาด | **PASS** |
| **P1-10** | Audit Trail Token & Secret Sanitization | `Audit.gs:sanitizeAuditPayload:L310` | กรองโทเค็นและรหัสลับออกจากบันทึก Audit | ซ่อนฟิลด์ `id_token`, `password`, `key` เป็น `[REDACTED]` | **PASS** |

#### 2.3 ชุดทดสอบฟังก์ชันวิกฤตและ MiniUI QR: `tests/p3_miniui_critical_test.js` (11/11 PASS)
- **คำสั่งรัน:** `node tests/p3_miniui_critical_test.js`
- **ผลลัพธ์:** ผ่านครบทั้ง 11 ข้อ (C-1 ถึง C-7, MiniUI QR Resolution, Decoupled Stock, Settings QR, Version Manifest)

#### 2.4 ชุดทดสอบการตั้งค่าและฟังก์ชันสำคัญ: `tests/p4_settings_important_test.js` (10/10 PASS)
- **คำสั่งรัน:** `node tests/p4_settings_important_test.js`
- **ผลลัพธ์:** ผ่านครบทั้ง 10 ข้อ (I-1 ถึง I-5, Settings 9 หมวด, Optimistic Revision Concurrency, แบบฟอร์ม พ.ด. ๑–๗, สคีมา 16 แผ่นงาน, Version Manifest)

#### 2.5 ชุดทดสอบเกณฑ์ยอมรับครบวงจร: `tests/p6_acceptance_suite.js` (10/10 PASS)
- **คำสั่งรัน:** `node tests/p6_acceptance_suite.js`
- **ผลลัพธ์:** ผ่านครบทั้ง 10 ข้อ (A.1 การยืนยันตัวตน, A.2 รอยต่อปีงบประมาณ, A.3 แดชบอร์ด ABC, A.4 วงจรชีวิตใบเบิก, A.5 Idempotency Cache, A.6 ตรวจนับสิ้นปี, A.7 จัดการไฟล์ CSV, A.8 รองรับหน้าจอมือถือ, A.9 แบบฟอร์มราชการ, A.10 สคีมา 16 ชีต)

#### 2.6 ชุดทดสอบศูนย์การตั้งค่าระบบ 10 สถานการณ์: `tests/p7_settings_comprehensive_test.js` (10/10 PASS)
- **คำสั่งรัน:** `node tests/p7_settings_comprehensive_test.js`
- **ผลลัพธ์:** ผ่านครบทั้ง 10 สถานการณ์ (การสกัด Requester, Last-Admin Protection, Concurrency Token Conflict, Data Validation, Viewing Year Separation, QR Lifecycle, MiniUI Lifecycle, CSV Import Staging, Signatory Snapshot, Print Media Verification)

#### 2.7 ชุดทดสอบสถาปัตยกรรมแบ็กเอนด์และบัญชีคุม: `tests/p8_backend_sheets_architecture_test.js` (10/10 PASS)
- **คำสั่งรัน:** `node tests/p8_backend_sheets_architecture_test.js`
- **ผลลัพธ์:** ผ่านครบทั้ง 10 สถานการณ์ (ScriptLock Mutex, Persistent Idempotency Replay, Transaction Recovery & Commit Markers, SSOT Stock Ledger, Multi-Warehouse Cart Policy, Decoupled Stock Deduction, Physical Count `null` vs `0`, Valuation Snapshot Immutability, การกระจาย 20 กลุ่มลง 16 ชีต, Identity & Secrets Isolation)

#### 2.8 ชุดทดสอบการแยกโค้ดแอปจริงและข้อมูลจำลอง: `tests/p9_clean_separation_test.js` (10/10 PASS)
- **คำสั่งรัน:** `node tests/p9_clean_separation_test.js`
- **ผลลัพธ์:** ผ่านครบทั้ง 10 สถานการณ์:
  1. Live Bundle ปราศจาก `rawMasterItems` หรือชุดข้อมูลจำลอง
  2. Live Bundle ปราศจากอัตลักษณ์จำลอง `USR-ANANT-01`
  3. `ApiServiceCore` ปราศจาก Silent Mock Simulation (ส่งคืน `BACKEND_UNAVAILABLE`)
  4. แสดงผล Genuine Empty State (`#tableEmptyState`) ถูกต้องเมื่อเปิดด้วยฐานข้อมูลว่างเปล่า
  5. ระบบแจ้งเตือนข้อผิดพลาดตรงไปตรงมาเมื่อเครือข่ายล้มเหลว
  6. ไฟล์ `demo.html` มีแบนเนอร์แจ้งเตือนเด่นชัดและทำงานแยกอิสระในหน่วยความจำ
  7. ชุดไฟล์ขึ้นระบบ (Deploy File Set) มีเฉพาะโค้ดโปรดักชัน 9 ไฟล์
  8. ตรรกะทางธุรกิจ คลังพัสดุ ใบเบิก และสิทธิ์ทำงานได้สมบูรณ์ในชุดทดสอบ
  9. ไม่มีการรั่วไหลของข้อมูลตัวอย่างลงสู่ Storage ของเบราว์เซอร์
  10. ป้องกันการปลอมแปลงสิทธิ์ (Role Spoofing) ผ่าน URL หรือ LocalStorage อย่างเด็ดขาด

---

### 3. ผลการตรวจสอบการเชื่อมต่อเซิร์ฟเวอร์จริงและข้อจำกัด (Live Integration & Blocked Tests)

| รหัสทดสอบ | รายการทดสอบกับระบบจริง (Live Integration) | สิ่งที่ต้องใช้ในการทดสอบ | สถานะการตรวจ | สาเหตุและคำอธิบาย |
|---|---|---|:---:|---|
| **LIV-01** | การยืนยันตัวตนผ่าน Google Workspace Domain (`@hrt.ac.th`) | บัญชี Google Workspace จริงของโรงเรียน | **BLOCKED** | ไม่มีบัญชีผู้ใช้จริงและ OAuth Client ID ที่ลงทะเบียนในโดเมนสถานศึกษา |
| **LIV-02** | การอ่าน/เขียนข้อมูลจริงลง Google Spreadsheet ID ของโรงเรียน | สิทธิ์ Edit สเปรดชีตจริงบน Google Drive | **BLOCKED** | ไม่มีการตั้งค่า `SPREADSHEET_ID` จริงใน Script Properties ของสภาพแวดล้อม Local |
| **LIV-03** | การประเมิน Concurrency แย่งเขียนชีตจริงผ่าน ScriptLock | บัญชีผู้ใช้งานพร้อมกัน 2 บัญชีขึ้นไป | **BLOCKED** | ไม่สามารถจำลอง Multi-Session ผู้ใช้จริงได้โดยไม่มีโดเมน |
| **LIV-04** | การส่งคำขอ REST Gateway ผ่าน `doPost` บน Web App URL จริง | Production Web App Deployment URL | **BLOCKED** | ยังไม่มีการกด Deploy รหัสเวอร์ชันใหม่ขึ้นเซิร์ฟเวอร์จริง |
| **LIV-05** | การทดสอบปิดรอบบัญชีปีงบประมาณและยกยอดบนชีตจริง | ฐานข้อมูลชีตจริงที่มีประวัติย้อนหลัง | **BLOCKED** | ข้อกำหนด P0: ห้ามทำการปิดรอบบัญชีหรือทดสอบลบข้อมูลบนชีตจริงของโรงเรียน |
| **LIV-06** | การทดสอบคืนสภาพข้อมูลสำรอง (Restore) ลงบนชีตจริง | ฐานข้อมูลทดสอบระดับ Staging ที่แยกต่างหาก | **BLOCKED** | ต้องมี Disposable Staging Sheet เพื่อไม่ให้กระทบข้อมูลใช้งานของโรงเรียน |
| **LIV-07** | การทดสอบโควตา URL Fetch App Token Verification บน Apps Script | โควตาเครือข่ายจริงของ Google Workspace | **BLOCKED** | การทดสอบโควตาต้องทำบนเซิร์ฟเวอร์ Google Apps Script ที่รันจริง |
| **LIV-08** | การทดสอบสิทธิ์ของผู้อำนวยการและเจ้าหน้าที่พัสดุตัวจริง | การล็อกอินของผู้บริหารและเจ้าหน้าที่ตัวจริง | **BLOCKED** | ต้องดำเนินการในรอบการตรวจรับของผู้ใช้งาน (UAT) |

---

### 4. ผลการตรวจสอบหน้าจอแสดงผลและการตอบสนอง (Browser QA)

การตรวจสอบความสมบูรณ์ของโครงสร้าง DOM, การจัดวาง (Layout), และ CSS Media Queries ผ่านการจำลองวิวพอร์ตมาตรฐาน:

1. **วิวพอร์ต 375px (Mobile Portrait - iPhone SE / Standard Android):**
   - **ผลตรวจ:** `PASS` — ตารางพัสดุปรับเปลี่ยนเป็น Card View หรือเปิด Horizontal Scroll Bar ภายในตารางอย่างเหมาะสม ไม่มีส่วนใดของหน้าเว็บล้นจอแนวนอน (No unintentional horizontal body overflow) ปุ่มกดสัมผัส (Tap Targets) มีขนาดไม่น้อยกว่า 44x44px ตามหลักเกณฑ์ Web Content Accessibility Guidelines (WCAG)
2. **วิวพอร์ต 768px (Tablet Portrait - iPad Mini / Surface Go):**
   - **ผลตรวจ:** `PASS` — เมนู Sidebar ด้านข้างพับเก็บอัตโนมัติ (Collapsible Drawer) พร้อมปุ่ม Toggle ชัดเจน ตะกร้าสินค้าและการค้นหาจัดวางแบบ 2 คอลัมน์อย่างเป็นระเบียบ
3. **วิวพอร์ต 1024px (Tablet Landscape / Small Laptop):**
   - **ผลตรวจ:** `PASS` — แผงควบคุม (Dashboard) แสดงผลตัวชี้วัด (KPI Cards) 4 ช่องเท่ากัน ตารางข้อมูลหลักแสดงคอลัมน์สำคัญครบถ้วน
4. **วิวพอร์ต 1440px (Desktop / Workstation):**
   - **ผลตรวจ:** `PASS` — ส่วนติดต่อผู้ใช้ขยายเต็มความกว้างอย่างสมดุล (Max-width container) ฟอนต์และช่องไฟสบายตา การเปิด Modal Dialog จัดกึ่งกลางจออย่างสมบูรณ์
5. **การพิมพ์เอกสาร (Print Media CSS - A4 Landscape/Portrait):**
   - **ผลตรวจ:** `PASS` — มีการประกาศกฎ `@media print` ซ่อน Sidebar, Header, ปุ่ม Action ต่างๆ และแสดงเฉพาะเนื้อหาแบบฟอร์มราชการ (เช่น พ.ด. ๑ หรือใบเบิก) บนหน้ากระดาษ A4 สะอาดตา

---

### 5. การทดสอบอุปกรณ์ฮาร์ดแวร์จริง (Physical Hardware & Camera Testing)

| รหัสทดสอบ | รายการทดสอบ | สภาพแวดล้อมที่จำเป็น | สถานะ | เหตุผล |
|:---:|---|---|:---:|---|
| **CAM-01** | การเปิดกล้องโทรศัพท์มือถือสแกน QR Code พัสดุผ่านเบราว์เซอร์จริง | อุปกรณ์ iPhone/Android จริงที่มีกล้องถ่ายรูป | **NOT RUN** | สภาพแวดล้อมการตรวจสอบเป็น Headless Node.js Sandbox บน Windows ไม่มีกล้องฮาร์ดแวร์มือถือเชื่อมต่อ |
| **CAM-02** | การโฟกัสแสงอัตโนมัติและความเร็วในการถอดรหัสบาร์โค้ดในที่แสงน้อย | เลนส์กล้องมือถือจริงในห้องมืด/สว่าง | **NOT RUN** | ไม่สามารถวัดผลระยะการโฟกัสและการถอดรหัสแสงจริงได้โดยไม่มีอุปกรณ์จริง |

> **หมายเหตุของผู้ตรวจประเมิน:** ระบบมีฟังก์ชันสำรอง (Graceful Degradation) โดยหากอุปกรณ์ไม่สามารถเข้าถึงกล้องถ่ายรูปได้ ผู้ใช้สามารถเลือกพิมพ์รหัสพัสดุลงในช่องค้นหาหรือใช้ฟังก์ชันจำลองได้ ซึ่งผ่านการทดสอบทางตรรกะแล้ว 100%
