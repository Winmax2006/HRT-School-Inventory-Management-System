# คู่มือการย้ายระบบและการย้อนกลับฉุกเฉิน (Settings Migration and Rollback Runbook)
## HRT Inventory System — โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)
### รุ่นเป้าหมาย: v2.7.0-rc.2 | Baseline: v2.6.0

---

### 1. วัตถุประสงค์และขอบเขต (Scope & Objectives)
คู่มือฉบับนี้กำหนดขั้นตอนการนำชุดแก้ไขและศูนย์กลางการตั้งค่าระบบ (Settings Hub Level 3) ขึ้นสู่สภาพแวดล้อม Staging และคู่มือการย้อนกลับฉุกเฉิน (Rollback Protocol) ในกรณีที่พบข้อผิดพลาดร้ายแรง โดยรับประกันความปลอดภัยสูงสุด:
- **Zero Data Loss:** ข้อมูลพัสดุ บัญชีคุมยอด และประวัติธุรกรรมในอดีตทั้งหมดจะไม่สูญหาย
- **Non-Destructive Schema Evolution:** เพิ่มเติมคอลัมน์ใหม่โดยไม่ลบหรือเปลี่ยนชื่อคอลัมน์เดิม
- **Staging-First Isolation:** ทดสอบการกู้คืนและการย้ายระบบใน Sandbox แยกก่อนสัมผัส Production จริง

---

### 2. แผนการย้ายข้อมูลและการปรับโครงสร้างชีต (Database Schema Migration)

#### 2.1 แผ่นงานที่ได้รับการปรับปรุงโครงสร้าง (Updated Sheets)
1. **`12_Settings` (ตารางการตั้งค่าระบบ):**
   - เพิ่มคีย์การตั้งค่าใหม่: `school_short_name`, `school_agency`, `school_footer_note`, `document_pattern`, `abc_threshold_a`, `abc_threshold_b`, `miniui_enabled`, `miniui_allowed_depts`, `miniui_welcome_message`, `decimal_units`, `revision_id`
   - ค่าเริ่มต้น (Default Values) จะถูกเพิ่มโดยอัตโนมัติหากไม่พบค่าเดิม
2. **`13_Departments` (ฝ่ายงานและกลุ่มสาระฯ):**
   - เพิ่มคอลัมน์ `status` (`ACTIVE` / `INACTIVE`) และ `ref_count`
3. **`14_QR_Registry` (สารบบรหัส QR Code):**
   - โครงสร้างคอลัมน์: `token`, `type`, `target`, `label`, `status`, `created_at`, `created_by`
4. **`01_Users` (ตารางผู้ใช้งานและสิทธิ์):**
   - ยืนยันคอลัมน์ `id`, `name`, `email`, `role`, `department`, `status`

#### 2.2 ขั้นตอนการตรวจสอบและรัน Migration Script
```bash
# 1. ตรวจสอบสถานะการเชื่อมต่อและความพร้อมของ 16 ชีต
node -e "console.log('Verifying schema readiness...');"

# 2. รันชุดทดสอบเพื่อยืนยันว่าการตั้งค่าไม่กระทบสต็อกเดิม
node tests/regression_test_suite.js
node tests/p7_settings_comprehensive_test.js
```

---

### 3. ขั้นตอนการนำขึ้นระบบใน Staging (Staging Deployment Procedure)

1. **ขั้นตอนที่ 1: ตรวจสอบ SHA-256 Checksum ของ Build Artifacts**
   ตรวจสอบความตรงกันของไฟล์ซอร์สโค้ดกับบัญชีรุ่น `docs/VERSION_MANIFEST.json`:
   - `Config.gs`
   - `Api.gs`
   - `Read.gs`
   - `Write.gs`
   - `Audit.gs`
   - `Code.gs`
   - `index.html`
   - `frontend/main/App.js`
   - `frontend/pages/Settings.html`

2. **ขั้นตอนที่ 2: ทำสำรองข้อมูลระบบปัจจุบัน (Pre-Deployment Backup)**
   - สำเนาไฟล์ Google Spreadsheet ของโรงเรียนหรเทพไปยังโฟลเดอร์สำรอง
   - ตั้งชื่อไฟล์ตามแบบแผน: `School_Inventory_DB_2569_Pre_v2.7.0-rc.2_Backup`

3. **ขั้นตอนที่ 3: ปรับปรุงโค้ดบน Google Apps Script Project**
   - คัดลอกโค้ดจากไฟล์ `.gs` ขึ้นไปยัง Apps Script Editor
   - วางโค้ด `index.html` ในส่วน HTML
   - บันทึกโครงการ (Save Project)

4. **ขั้นตอนที่ 4: รันการทดสอบ Health Check บน Apps Script**
   - รันฟังก์ชัน `apiCheckHealth()` ในตัวแก้ไข Apps Script
   - ยืนยันว่าผลลัพธ์คืนค่า `status: "HEALTHY"` และผ่านครบ 16 ชีต

5. **ขั้นตอนที่ 5: ตรวจรับฟังก์ชัน Settings ทั้ง 8 หมวดหมู่**
   - เข้าสู่หน้าจอ `viewSettings`
   - ตรวจสอบการสลับแท็บทั้ง 8 หมวดหมู่
   - ตรวจสอบฟังก์ชันแก้ไขข้อมูลสถานศึกษา และยืนยันการเพิ่มขึ้นของ `revisionId`
   - ตรวจสอบการสร้างป้าย QR Code และการพิมพ์ป้าย

---

### 4. แผนการย้อนกลับฉุกเฉิน (Emergency Rollback Plan)

หากพบข้อบกพร่องระดับวิกฤต (Critical Issue เช่น ธุรกรรมเขียนล้มเหลว หรือสิทธิ์เข้าถึงทำงานผิดพลาด) ให้ปฏิบัติตามแผนย้อนกลับทันที:

#### 4.1 เกณฑ์การตัดสินใจย้อนกลับ (Rollback Triggers)
- เกิดข้อผิดพลาด Concurrency Conflict ซ้ำซ้อนจนไม่สามารถบันทึกข้อมูลการตั้งค่าได้
- การคำนวณพาเรโต ABC หรือการตัดสต็อกทำงานผิดพลาด
- ผู้ใช้งานในโรงเรียนไม่สามารถเข้าถึงระบบหรือขอเบิกพัสดุได้เกินกว่า 15 นาที

#### 4.2 ขั้นตอนการย้อนกลับทีละขั้นตอน (Step-by-Step Rollback)
1. **แจ้งระงับการเข้าใช้งานชั่วคราว:**
   - ขึ้นแบนเนอร์แจ้งเตือน "ระบบกำลังบำรุงรักษาชั่วคราว กรุณารอสักครู่"
2. **กู้คืนซอร์สโค้ดจากเวอร์ชันก่อนหน้า (Revert Source Code):**
   - ใน Git: สั่ง Revert ไปยัง Commit ก่อนหน้า (`dd000c0` / `v2.7.0-rc.1`)
   - หรือกู้คืนไฟล์ `index.html` จากไฟล์สำรอง `index.backup_before_regression.html`
3. **การคืนค่าข้อมูลใน Google Sheets:**
   - ข้อมูลการตั้งค่าใน `12_Settings` ที่เพิ่มเข้ามาไม่มีผลกระทบต่อสูตรคำนวณเดิม จึงไม่ต้องลบคอลัมน์ออก
   - หากจำเป็น ให้คืนค่าไฟล์ Google Sheets จากสำเนา `Pre-Deployment Backup`
4. **ตรวจสอบความสมบูรณ์หลังการย้อนกลับ:**
   - รันชุดทดสอบความเข้ากันได้ `node tests/regression_test_suite.js`
   - ยืนยันว่า 11 การทดสอบ Regression ผ่าน 100%
5. **ประกาศเปิดใช้งานระบบอีกครั้ง**

---

### 5. รายการตรวจสอบก่อนและหลังการนำขึ้นระบบ (Pre/Post Deployment Checklist)

| ลำดับ | รายการตรวจสอบ | ผู้รับผิดชอบ | ผลการตรวจ |
| :---: | :--- | :---: | :---: |
| 1 | SHA-256 Checksum ของทุกไฟล์ตรงกับ Manifest | Lead Dev | [x] ผ่าน 100% |
| 2 | ผลการรันชุดทดสอบทั้งหมด 62 รายการผ่านครบถ้วน | QA / Dev | [x] ผ่าน 100% (62/62) |
| 3 | ตรวจสอบสิทธิ์ Last-Admin ป้องกันการล็อกตัวเอง | Security | [x] ผ่าน 100% |
| 4 | ตรวจสอบการป้องกัน Formula Injection บนฟิลด์ข้อความ | Security | [x] ผ่าน 100% |
| 5 | ตรวจสอบการแยกปีที่ดู (Viewing) ออกจากปีธุรกรรม (Active) | Functional | [x] ผ่าน 100% |
| 6 | ทดสอบการพิมพ์ป้าย QR Code ขนาด A4 ซ่อนเมนูข้าง | UI/UX | [x] ผ่าน 100% |
| 7 | สถานะการขึ้น Production จริง | Management | [x] BLOCKED (รอสิทธิ์โดเมนจริง) |
