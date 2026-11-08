# Staging Configuration Change Management & Rollback Specification
**Release Target:** HRT Inventory `v2.7.0-rc.6`  
**Execution Timestamp:** 31 ตุลาคม 2569 (2026-10-31T12:50:00+07:00)  
**Safety Protocol:** STRICT NON-DESTRUCTIVE / ZERO PRODUCTION MUTATION  

---

## 1. Zero Production Mutation Confirmation

ผู้ประเมินขอยืนยันตามข้อกำหนดความปลอดภัยสูงสุด:
1. **ไม่มีการแก้ไข Production Script Properties ใดๆ ทั้งสิ้น**
2. **ไม่มีการแก้ไข OAuth Policy, Cloud Consent Screen หรือ Google Workspace Directory ของสถานศึกษาจริง**
3. **ไม่มีการเชื่อมต่อ หรือส่งคำสั่งเขียน (Write Mutation) ไปยัง Google Spreadsheet ใดๆ ของโรงเรียนจริง (`1Bxi...pms` ถูกป้องกันโดยเด็ดขาด)**
4. **ไม่มีการสร้างบัญชีผู้ใช้ Google ปลอม หรือส่ง Email/Invitation ออกนอกระบบ**
5. **ทุกการทดสอบในรอบนี้กระทำบน Local Mock / Unit Test Harness ในพื้นที่แยกต่างหาก 100%**

---

## 2. Configuration Baseline (Before vs. After State)

| Parameter Key | Pre-Inspection Baseline | Post-Inspection State | Difference / Modification | Reason for Change |
| :--- | :--- | :--- | :---: | :--- |
| `SPREADSHEET_ID` | `""` (Empty string in `Config.gs`) | `""` (Unchanged) | **ZERO CHANGE** | ป้องกันการเขียนทับฐานข้อมูลจริงโดยไม่ทราบเป้าหมาย |
| `GOOGLE_CLIENT_ID` | `""` (Empty string in `Config.gs`) | `""` (Unchanged) | **ZERO CHANGE** | พิสูจน์แล้วว่า Native Session ไม่จำเป็นต้องใช้ Client ID |
| `ALLOWED_DOMAINS` | `hrt.ac.th,school.internal` | `hrt.ac.th,school.internal` | **ZERO CHANGE** | คงค่านโยบายโดเมนมาตรฐานของโรงเรียน |
| `DEFAULT_FISCAL_YEAR` | `'2569'` | `'2569'` | **ZERO CHANGE** | คงปีงบประมาณปัจจุบัน |
| `LOCK_TIMEOUT_MS` | `30000` | `30000` | **ZERO CHANGE** | คงค่าขีดจำกัดการรอคิว |
| `WRITE_LOCK_TIMEOUT_MS` | `60000` | `60000` | **ZERO CHANGE** | คงค่าขีดจำกัดการเขียนธุรกรรม |
| `CACHE_TTL_SECONDS` | `300` | `300` | **ZERO CHANGE** | คงอายุแคช 5 นาที |

---

## 3. Staging Provisioning Plan (ขั้นตอนเมื่อได้รับสิทธิ์ Staging ในอนาคต)

เมื่อผู้ดูแลระบบไอทีของโรงเรียนพร้อมจัดสรร Staging Sandbox ให้ดำเนินการตามขั้นตอนนี้:

### ขั้นตอนที่ 1: จัดเตรียม Google Spreadsheet ชุดทดสอบ (Disposable Staging Sheet)
1. ทำสำเนา Google Sheets จากต้นแบบ 16 ชีต
2. ตั้งชื่อไฟล์เป็น `[STAGING-DISPOSABLE] HRT Inventory Database`
3. บันทึก Spreadsheet ID (เช่น `1AbC...XyZ`) ลงในเอกสารควบคุมภายใน
4. ตรวจสอบว่าชีต `01_Users` มีข้อมูล Admin ทดสอบ 1 แถว (`USR-001`, `ACTIVE`)

### ขั้นตอนที่ 2: สร้าง Standalone Apps Script Project สำหรับ Staging
1. เข้า [script.google.com](https://script.google.com/) $\rightarrow$ New project
2. ตั้งชื่อโปรเจกต์: `HRT Inventory - STAGING SANDBOX`
3. อัปโหลดไฟล์จาก `HRT_Inventory_v2.7.0-rc.6_Runtime.zip` ทั้ง 9 ไฟล์
4. ไปที่ **Project Settings** $\rightarrow$ **Script Properties** $\rightarrow$ เพิ่มค่า:
   - `SPREADSHEET_ID`: `<ID_ของ_Staging_Spreadsheet>`
   - `ALLOWED_DOMAINS`: `hrt.ac.th,school.internal`
   - `APP_ENV`: `staging`

### ขั้นตอนที่ 3: Deploy เป็น Web App บน Staging
1. คลิก Deploy $\rightarrow$ New deployment $\rightarrow$ Web app
2. Description: `HRT Inventory v2.7.0-rc.6 Staging Test`
3. Execute as: `User accessing the web app` (หรือ `Me`)
4. Who has access: `Anyone within [hrt.ac.th]` (หรือ `Anyone with Google Account`)
5. Deploy แล้วบันทึก Web App URL สำหรับรันการทดสอบ LA-01 ถึง LA-14 และ LS-01 ถึง LS-12

---

## 4. Rollback Plan (แผนการย้อนกลับฉุกเฉิน)

หากการทดสอบบน Staging เกิดข้อผิดพลาด หรือจำเป็นต้องรีเซ็ตข้อมูล:
1. **การรีเซ็ตฐานข้อมูลทดสอบ (Database Reset):**
   - ลบไฟล์ Google Spreadsheet ชุดทดสอบ (`[STAGING-DISPOSABLE]`) ทิ้งทันที
   - สร้างสำเนาใหม่จาก Template 16 ชีตเปล่า
   - นำ ID ใหม่ไปอัปเดตใน Script Properties ของโปรเจกต์ Staging
2. **การระงับการเข้าถึง (Access Revocation):**
   - เข้าเมนู Deploy $\rightarrow$ Manage deployments บน Staging Project
   - คลิกไอคอนถังขยะ เพื่อ Archive / Delete deployment URL ทันที
3. **การรับรองความปลอดภัยของ Production:**
   - เนื่องจาก Staging แยกขาดทั้ง Script Project และ Spreadsheet ID การ Rollback บน Staging จะ**ไม่มีผลกระทบใดๆ ต่อระบบ Production ทั้งสิ้น (Zero Impact Guaranteed)**
