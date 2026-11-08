# คู่มือสภาพแวดล้อมการทดสอบและโหมดสาธิต (Test Environment & Demo Guide)
## ระบบบริหารจัดการพัสดุโรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) — รุ่น v2.7.0-rc.4 (Prompt 09)

เอกสารฉบับนี้จัดทำขึ้นเพื่อให้วิศวกรซอฟต์แวร์ ผู้ทดสอบระบบ (QA) และผู้ตรวจประเมิน สามารถรันชุดทดสอบอัตโนมัติ (Automated Test Suites) และเปิดใช้งานสภาพแวดล้อมสาธิต (Demo Sandbox) ได้อย่างปลอดภัย โดยไม่กระทบต่อข้อมูลจริงใน Google Sheets ของโรงเรียน

---

### 1. ข้อกำหนดเบื้องต้นของสภาพแวดล้อม (Prerequisites)

- **Node.js**: เวอร์ชัน 18.x ขึ้นไป (รองรับ ES Modules, Built-in `crypto`, และ `async/await`)
- **เว็บเบราว์เซอร์**: Google Chrome, Microsoft Edge, หรือเบราว์เซอร์มาตรฐานที่รองรับ ES6+
- **การแยกส่วนระบบ**: ชุดทดสอบและโหมดสาธิตทั้งหมดทำงานในเครื่อง (Local) หรือ In-Memory Sandbox โดยไม่จำเป็นต้องเชื่อมต่ออินเทอร์เน็ตหรือบริการภายนอก

---

### 2. คำสั่งรันชุดทดสอบอัตโนมัติ (Automated Test Execution)

ระบบมีชุดทดสอบอัตโนมัติทั้งหมด **8 ชุด รวม 82 กรณีทดสอบ (82/82 Tests — 100% Pass Rate)** ซึ่งครอบคลุมทุกมิติของระบบตั้งแต่โครงสร้างสิทธิ, บัญชีคุมพัสดุ, สัญญาณ API, การตัดสต็อก, การตั้งค่า, แบ็กเอนด์ชีต ไปจนถึงการแยกโค้ดข้อมูลจำลอง

#### 2.1 คำสั่งรันการทดสอบทั้งหมดในคำสั่งเดียว (Full Verification Run)

```bash
node tests/regression_test_suite.js
node tests/p1_p2_contract_lifecycle_test.js
node tests/p3_miniui_critical_test.js
node tests/p4_settings_important_test.js
node tests/p6_acceptance_suite.js
node tests/p7_settings_comprehensive_test.js
node tests/p8_backend_sheets_architecture_test.js
node tests/p9_clean_separation_test.js
```

#### 2.2 สรุปรายละเอียดชุดทดสอบทั้ง 8 ชุด

| ลำดับ | ชื่อชุดทดสอบ | จำนวนข้อ | ขอบเขตการทดสอบหลัก | สถานะ |
|:---:|---|:---:|---|:---:|
| 1 | `tests/regression_test_suite.js` | 11 | การควบคุมสิทธิ์ RBAC, ตัวกรอง 8 มิติ, การจำแนก ABC Pareto, การตัดสต็อกแบบ Decoupled, Concurrency Mutex, SHA-256 Chaining | **PASS (11/11)** |
| 2 | `tests/p1_p2_contract_lifecycle_test.js` | 10 | รอยต่อปีงบประมาณ Asia/Bangkok (30 ก.ย./1 ต.ค.), นอร์มัลไลซ์พารามิเตอร์, Closed-Year Lock, Idempotency Cache, Last-Admin Guard | **PASS (10/10)** |
| 3 | `tests/p3_miniui_critical_test.js` | 11 | การค้นหาพัสดุ FSN Foreign Key, การสแกน QR Code MiniUI, การกู้คืน Timeout Idempotency, การคงสภาพสแนปช็อตประวัติศาสตร์ | **PASS (11/11)** |
| 4 | `tests/p4_settings_important_test.js` | 10 | ทิศทางธุรกรรมมาตรฐาน, การนำเข้า CSV ป้องกัน Formula Injection, สคีมา 16 แผ่นงาน, สิทธิรายหมวด Settings 9 หมวดหมู่ | **PASS (10/10)** |
| 5 | `tests/p6_acceptance_suite.js` | 10 | เกณฑ์ยอมรับ 10 ข้อ (A.1–A.10): วงจรชีวิตใบเบิกครบวงจร, แบบฟอร์มราชการ พ.ด. ๑–๗, Responsive Breakpoints (375–1440px), ESC Modal Stack | **PASS (10/10)** |
| 6 | `tests/p7_settings_comprehensive_test.js` | 10 | การควบคุมการตั้งค่า 8 หมวดหมู่, สแนปช็อตลายเซ็นผู้บริหารแช่แข็ง, การปฏิเสธ Requester เรียก RPC ตั้งค่าตรง, Staging Restore Protocol | **PASS (10/10)** |
| 7 | `tests/p8_backend_sheets_architecture_test.js` | 10 | สถาปัตยกรรม ScriptLock Mutex, Commit Markers & Transaction Recovery, การกระจาย 20 กลุ่มลง 16 ชีต, Physical Count (`null` vs `0`) | **PASS (10/10)** |
| 8 | `tests/p9_clean_separation_test.js` | 10 | **Clean Runtime Separation**: ปราศจาก mock data ฝังใน live, การกำจัด `USR-ANANT-01`, Genuine Empty State, In-Memory Repository, การป้องกัน Role Spoofing | **PASS (10/10)** |

---

### 3. การสร้างและเปิดใช้งานโหมดสาธิต (Standalone Demo Experience)

เพื่อความสะดวกในการนำเสนอ นิทรรศการ หรือทดลองใช้งานระบบโดยไม่ต้องเชื่อมต่อ Google Apps Script โครงการได้จัดเตรียมระบบสร้างไฟล์สาธิต `demo.html` ที่ทำงานแยกเป็นอิสระ 100%

#### 3.1 คำสั่งสร้างไฟล์สาธิต (Build Demo HTML)

```bash
node scripts/build_demo_html.js
```
*ผลลัพธ์*: ระบบจะอ่านซอร์สโค้ดสะอาดจาก `index.html` และนำเข้าชุดข้อมูลสังเคราะห์จาก `tests/fixtures/` เข้าสู่ `demo.html` พร้อมฝังแถบแบนเนอร์แจ้งเตือน `[DEMO & TESTING MODE]` และระบบสลับบทบาท

#### 3.2 การเปิดใช้งานและการสลับบทบาทในโหมดสาธิต

1. ดับเบิลคลิกเปิดไฟล์ `demo.html` ในเว็บเบราว์เซอร์
2. สังเกตแถบสีส้มด้านบนสุดที่ระบุ:
   > `[DEMO & TESTING MODE] โหมดสาธิตระบบด้วยข้อมูลจำลอง (Synthetic Fixtures) — ข้อมูลในหน้านี้ใช้สำหรับการทดสอบ/นำเสนอ ไม่เชื่อมต่อและไม่ถูกบันทึกลง Google Sheets จริง`
3. คลิกปุ่ม **"สลับบทบาททดสอบ"** เพื่อเปลี่ยนตัวตนจำลองเป็น:
   - **ลำดับ 1: ผู้ดูแลระบบ (ADMIN)** — นายสมชาย ใจดี
   - **ลำดับ 2: ผู้บริหารสถานศึกษา (DIRECTOR)** — ดร.สมศักดิ์ รุ่งเรือง
   - **ลำดับ 3: เจ้าหน้าที่พัสดุ (OFFICER)** — นายอนันต์ มั่นคง
   - **ลำดับ 4: ผู้ขอเบิก/ครูผู้สอน (REQUESTER)** — นางสาวดวงใจ มีสุข
4. ระบบจะทำการโหลดหน้าใหม่และปรับเปลี่ยนสิทธิ์การเข้าถึงเมนู, การอนุมัติใบเบิก, และหน้าตั้งค่าระบบตามบทบาทที่เลือกทันทีในหน่วยความจำ

---

### 4. ขอบเขตความปลอดภัยและข้อห้าม (Safety Boundaries & Deployment Restrictions)

> [!CAUTION]
> **สถานะการขึ้นระบบจริง: ถูกระงับชั่วคราว (`BLOCKED`)**
> 
> เนื่องจากโครงการยังอยู่ระหว่างการทดสอบในสภาพแวดล้อม Local / Staging และยังไม่ได้รับรหัสลับประจำตัวจริง (Production Google Workspace Domain OAuth Secrets) จากผู้ดูแลระบบของโรงเรียน
> 
> **ข้อห้ามเด็ดขาด:**
> 1. **ห้ามทำการ Deploy รหัสขึ้น Production Web App จริง** จนกว่าผู้ดูแลระบบจะยืนยันและส่งมอบข้อมูลประจำตัว
> 2. **ห้ามทำการ Drop, Truncate, หรือลบข้อมูลใน Google Sheets จริง** ของโรงเรียน
> 3. **ห้ามนำไฟล์ทดสอบ (`tests/`) หรือไฟล์สาธิต (`demo.html`) ไปอัปโหลดขึ้น Google Apps Script** ร่วมกับไฟล์แอปหลัก
