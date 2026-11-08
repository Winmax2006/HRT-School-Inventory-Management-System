# คู่มือการนำระบบขึ้นใช้งานและการย้อนกลับระบบ (Deployment & Rollback Runbook)
**ระบบ:** HRT School Inventory Management System  
**สถานศึกษา:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) สังกัดองค์การบริหารส่วนจังหวัดสระบุรี  
**รุ่นเป้าหมาย:** `v2.7.0-rc.1` (Release Candidate 1)  
**สถาปัตยกรรมเป้าหมาย:** Google Sheets Database + Google Apps Script Web App + Single Page Application

---

## 1. ข้อกำหนดและสิ่งที่ต้องเตรียมก่อนดำเนินการ (Prerequisites)

1. **บัญชี Google Workspace ของโรงเรียน:** บัญชีผู้ดูแลระบบโดเมน `@hrt.ac.th` (เช่น `admin@hrt.ac.th`)
2. **Google Spreadsheet ฐานข้อมูลหลัก:** สเปรดชีตที่มี 16 แผ่นงานมาตรฐาน (Canonical Sheets) ครบถ้วน
3. **Google Cloud Console Project:** โปรเจกต์ที่มีการเปิดใช้งาน Google Identity Services สำหรับ OAuth 2.0 Client ID
4. **ไฟล์โค้ดสำหรับนำขึ้นระบบ:**
   - ฝั่ง Backend (Apps Script Files): `Config.gs`, `Code.gs`, `Api.gs`, `Read.gs`, `Write.gs`, `Audit.gs`
   - ฝั่ง Frontend (HTML File): `index.html` (พร้อมไฟล์ JavaScript โมดูลในโฟลเดอร์ `frontend/`)
   - ไฟล์การกำหนดค่า: `appsscript.json`

---

## 2. ขั้นตอนการนำขึ้นระบบในสภาพแวดล้อม Staging (Step-by-Step Staging Deployment)

### ขั้นตอนที่ 1: ตรวจสอบและสำรองข้อมูล Google Sheets เดิม
1. เปิด Google Spreadsheet ฐานข้อมูลของโรงเรียน
2. ไปที่เมนู **ไฟล์ (File)** $\rightarrow$ **ทำสำเนา (Make a copy)**
3. ตั้งชื่อไฟล์สำรอง: `HRT_Inventory_DB_Backup_Before_v2.7.0-rc.1_YYYYMMDD`
4. บันทึก Spreadsheet ID ของไฟล์ฐานข้อมูลหลักไว้ใช้งานในขั้นตอนถัดไป

### ขั้นตอนที่ 2: อัปโหลดโค้ดเข้าสู่ Google Apps Script
1. เปิดโครงการ Apps Script ที่เชื่อมโยงกับฐานข้อมูล (หรือสร้าง Standalone Project ใหม่)
2. อัปเดตไฟล์ `appsscript.json` เพื่อรองรับสิทธิ์การเข้าถึง:
   ```json
   {
     "timeZone": "Asia/Bangkok",
     "dependencies": {},
     "exceptionLogging": "STACKDRIVER",
     "runtimeVersion": "V8",
     "webapp": {
       "executeAs": "USER_DEPLOYING",
       "access": "ANYONE"
     }
   }
   ```
3. นำเข้าไฟล์สคริปต์ทั้ง 6 ไฟล์ (`Config.gs`, `Code.gs`, `Api.gs`, `Read.gs`, `Write.gs`, `Audit.gs`)
4. นำเข้าไฟล์ `index.html`

### ขั้นตอนที่ 3: กำหนดค่า Script Properties (การตั้งค่าความลับและความปลอดภัย)
ไปที่ **การตั้งค่าโครงการ (Project Settings)** $\rightarrow$ เลื่อนลงมาที่หัวข้อ **คุณสมบัติของสคริปต์ (Script Properties)** $\rightarrow$ กด **เพิ่มคุณสมบัติของสคริปต์ (Add script property)** และกรอกค่าดังนี้:

| Property Key | ค่าตัวอย่าง (Example Value) | คำอธิบาย |
| :--- | :--- | :--- |
| `ALLOWED_DOMAINS` | `hrt.ac.th` | โดเมนอีเมลที่ได้รับอนุญาตเข้าใช้งานระบบ |
| `SPREADSHEET_ID` | `1abc...xyz` | Spreadsheet ID ของ Google Sheets ฐานข้อมูลโรงเรียน |
| `GOOGLE_CLIENT_ID` | `123456...apps.googleusercontent.com` | Google OAuth Client ID สำหรับระบบ Google SSO |
| `ACTIVE_FISCAL_YEAR`| `2569` | ปีงบประมาณหลักที่เปิดให้ทำธุรกรรมเบิกจ่าย |
| `DATA_REVISION` | `1` | ตัวนับเวอร์ชันข้อมูลสำหรับการควบคุมแคชแดชบอร์ด |

### ขั้นตอนที่ 4: การสร้างการเผยแพร่ (Deploy Web App)
1. กดปุ่ม **การทำให้ใช้งานได้ (Deploy)** $\rightarrow$ **การทำให้ใช้งานได้รายการใหม่ (New deployment)**
2. เลือกประเภท: **เว็บแอป (Web app)**
3. กำหนดค่า:
   - **คำอธิบาย (Description):** `HRT Inventory System v2.7.0-rc.1 (Staging Acceptance)`
   - **เรียกใช้ในฐานะ (Execute as):** `ฉัน (Me / บัญชีเจ้าหน้าที่ผู้ดูแล)`
   - **ผู้ที่มีสิทธิ์เข้าถึง (Who has access):** `ทุกคน (Anyone)` *(ระบบภายในมีเกตเวย์ตรวจสิทธิ์ `@hrt.ac.th` แบบ Fail-Closed กำกับดูแลความปลอดภัย)*
4. กด **ทำให้ใช้งานได้ (Deploy)** และคัดลอก **URL เว็บแอป (Web app URL)**

---

## 3. การทดสอบการทำงานเบื้องต้นหลังการขึ้นระบบ (Post-Deployment Smoke Tests)

ดำเนินการทดสอบตามลำดับ 5 ข้อเพื่อยืนยันความพร้อมของระบบ:

1. **การโหลดหน้าเว็บหลัก (Bootstrap Health Check):**
   - เปิด Web app URL ในเบราว์เซอร์
   - ตรวจสอบว่าหน้าจอแสดงป้ายชื่อ `v2.7.0-rc.1` และโหลดหน้าเข้าสู่ระบบสำเร็จภายใน 3 วินาที
2. **การเข้าสู่ระบบด้วยบัญชีโรงเรียน (Authentication Test):**
   - ล็อกอินด้วยบัญชี `admin@hrt.ac.th` หรือครูในโรงเรียน
   - ตรวจสอบว่าระบบแสดงชื่อ-นามสกุล, ตำแหน่ง, และฝ่ายงานถูกต้องตรงตามชีต `01_Users`
3. **การเข้าใช้งาน MiniUI ผ่านสมาร์ตโฟน (MiniUI Quick Scan):**
   - กดปุ่มเปิด MiniUI หรือสแกน QR Code จำลอง
   - ตรวจสอบว่าสามารถค้นหาพัสดุและเพิ่มลงในตะกร้าได้
4. **การส่งคำขอเบิกพัสดุ (Requisition Creation Test):**
   - ส่งคำขอเบิกทดสอบ 1 รายการ
   - ตรวจสอบว่าในแผ่นงาน `07_Requisitions` และ `08_Requisition_Items` มีแถวข้อมูลใหม่เกิดขึ้นในสถานะ `SUBMITTED` และสต็อกใน `03_Master_Items` ยังคงเดิม
5. **การอนุมัติและจ่ายพัสดุ (Issue & Stock Check):**
   - ในฐานะเจ้าหน้าที่พัสดุ ดำเนินการอนุมัติ (`APPROVED`) และจ่ายพัสดุ (`ISSUED`)
   - ตรวจสอบว่าสต็อกลดลงถูกต้อง และมีรายการบันทึกใน `10_Stock_Transactions`

---

## 4. แผนการย้อนกลับระบบฉุกเฉิน (Emergency Rollback Protocol)

ในกรณีที่พบข้อผิดพลาดร้ายแรง (Critical Defect) ระหว่างการทดสอบ Staging ที่กระทบต่อการทำงานเดิม:

### ขั้นตอนการ Rollback:
1. **การสลับเวอร์ชันใน Apps Script Deployment (ใช้เวลาไม่เกิน 2 นาที):**
   - ไปที่ **Deploy** $\rightarrow$ **Manage deployments**
   - เลือก Web app ปัจจุบัน $\rightarrow$ กดแก้ไข (ดินสอ)
   - ในช่อง **Version** เลือกย้อนกลับไปยัง **Version ก่อนหน้า (v2.6.0 Stable / Previous Deployment)**
   - กด **Deploy** เพื่อให้ผู้ใช้กลับไปใช้เวอร์ชันเดิมทันทีโดยไม่ต้องเปลี่ยน URL ลิงก์
2. **การกู้คืนฐานข้อมูล Google Sheets (กรณีมีข้อมูลผิดปกติ):**
   - หากมีการทดสอบที่ทำให้ข้อมูลสต็อกหรือธุรกรรมคลาดเคลื่อน
   - กู้คืนข้อมูลจากไฟล์สำรองที่ทำไว้ในขั้นตอนที่ 1 โดยการนำเข้าเฉพาะชีตที่ได้รับผลกระทบ
3. **การล้างแคชระบบ (Cache Invalidation):**
   - เรียกใช้ฟังก์ชัน `invalidateFiscalYearCaches('2569')` ใน Apps Script Editor เพื่อให้ข้อมูลเก่าที่แคชไว้ถูกล้างทิ้งทันที
4. **การบันทึกอุบัติการณ์ (Post-Incident Review):**
   - บันทึกรหัสข้อผิดพลาดและ Log จาก Google Cloud Logging (Stackdriver) เพื่อนำมาวิเคราะห์และแก้ไขในรอบถัดไป
