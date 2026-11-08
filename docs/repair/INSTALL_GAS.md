# คู่มือการติดตั้งและปรับใช้ระบบ HRT Inventory บน Google Apps Script
**HRT School Inventory Management System**  
**เวอร์ชันเป้าหมาย:** `v2.7.0-rc.6`  
**หน่วยงาน:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) องค์การบริหารส่วนจังหวัดสระบุรี  
**วันที่จัดทำ:** 30 ตุลาคม 2569  

---

## 1. บทนำและสถาปัตยกรรมระบบ (Architecture Overview)

ระบบ HRT Inventory เป็น Web Application ที่ทำงานบน **Google Apps Script (V8 Runtime)** ร่วมกับ **Google Sheets (16 Canonical Tables)** เป็นฐานข้อมูลหลัก มีโครงสร้างไฟล์สำหรับ Runtime Deployment ทั้งสิ้น 9 ไฟล์หลัก ดังนี้:

### โครงสร้างไฟล์สำหรับ Apps Script Project (Runtime Allowlist)
```text
├── appsscript.json    (Apps Script Manifest & OAuth Scopes)
├── Config.gs          (Configuration, Environment Variables & Constants)
├── Api.gs             (ApiRouter Core, RBAC & Request Routing)
├── Read.gs            (Query Services & Read Probes)
├── Write.gs           (ACID Transactions, Ledger Mutex & Mutations)
├── Audit.gs           (SHA-256 Audit Trail Chaining)
├── Code.gs            (HTTP Entry Points: doGet, doPost, apiCall, HRT_rpc)
├── index.html         (Desktop Management SPA)
└── MiniUI.html        (Mobile Self-Service & QR Code Web Portal)
```

> [!NOTE]
> ระบบนี้ถูกออกแบบให้ทำงานแบบ Standalone บน Google Cloud / Google Workspace โดยไม่พึ่งพาเครื่องมือพัฒนาเฉพาะทางใดๆ (รวมถึงไม่ต้องใช้ Antigravity IDE) สามารถติดตั้งผ่านเว็บเบราว์เซอร์หรือเครื่องมือ Google Clasp มาตรฐานได้ทันที

---

## 2. ข้อกำหนดเบื้องต้น (Prerequisites)

1. บัญชี Google Workspace ของโรงเรียน (เช่น `@hrt.ac.th`) ที่มีสิทธิ์สร้าง Apps Script และ Google Sheets
2. Google Spreadsheet ฐานข้อมูลหลักของโรงเรียนที่ประกอบด้วย 16 ชีตมาตรฐาน (ห้ามเปลี่ยนชื่อชีตหรือลำดับคอลัมน์)
3. สิทธิ์การเข้าถึง Google Cloud Console ของโดเมน เพื่อกำหนดค่า OAuth 2.0 Client ID (สำหรับฟังก์ชัน Sign-In with Google)

---

## 3. ขั้นตอนการติดตั้งผ่านเว็บเบราว์เซอร์ (Manual Setup via Browser)

### ขั้นตอนที่ 1: สร้างโครงการ Apps Script ใหม่
1. ไปที่ [Google Apps Script Dashboard](https://script.google.com/)
2. คลิกปุ่ม **"โครงการใหม่" (New Project)**
3. ตั้งชื่อโครงการ เช่น `HRT_Inventory_Production_v2.7.0`

### ขั้นตอนที่ 2: อัปเดต Manifest (`appsscript.json`)
1. ที่แถบเมนูด้านซ้าย เลือก **"การตั้งค่าโครงการ" (Project Settings)**
2. ติ๊กเลือกช่อง **"แสดงไฟล์ Manifest 'appsscript.json' ในตัวแก้ไข" (Show "appsscript.json" manifest file in editor)**
3. กลับไปที่แท็บตัวแก้ไข (Editor) คลิกเปิดไฟล์ `appsscript.json`
4. คัดลอกเนื้อหาจากไฟล์ `appsscript.json` ไปวางทับทั้งหมด:
```json
{
  "timeZone": "Asia/Bangkok",
  "dependencies": {},
  "exceptionLogging": "CLOUD",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "DOMAIN"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

### ขั้นตอนที่ 3: สร้างและวางโค้ดสคริปต์ (Server Files: `.gs`)
สร้างไฟล์ Script ตามลำดับและคัดลอกโค้ดจากแพ็กเกจ Runtime:
1. `Config.gs`: ค่าคงที่ระบบ การแคช และรายชื่อชีต
2. `Api.gs`: ตัวควบคุมสิทธิ์ (RBAC) และเส้นทาง API
3. `Read.gs`: บริการอ่านและประมวลผลข้อมูล
4. `Write.gs`: บริการบันทึกข้อมูลและตัดสต็อก
5. `Audit.gs`: บันทึก Audit Trail พร้อม Chaining Hash
6. `Code.gs`: จุดเชื่อมต่อ Web App และ API Facades

### ขั้นตอนที่ 4: สร้างและวางโค้ดหน้าจอ (HTML Files: `.html`)
สร้างไฟล์ HTML ทั้ง 2 หน้าจอ:
1. `index.html`: หน้าจอหลักสำหรับ Admin, เจ้าหน้าที่พัสดุ และครู
2. `MiniUI.html`: หน้าจอบริการตนเองบนมือถือและสแกน QR Code

---

## 4. การกำหนดค่าสภาพแวดล้อม (Script Properties Configuration)

เพื่อความปลอดภัยสูงสุด ห้ามเขียน Spreadsheet ID หรือ OAuth Credentials ลงใน Source Code โดยตรง ให้กำหนดผ่าน **Script Properties (คุณสมบัติของสคริปต์)**:

1. ในหน้า Apps Script Editor ไปที่ **"การตั้งค่าโครงการ" (Project Settings)**
2. เลื่อนลงไปที่หัวข้อ **"คุณสมบัติของสคริปต์" (Script Properties)**
3. คลิก **"แก้ไขคุณสมบัติของสคริปต์" (Edit script properties)** แล้วเพิ่มตัวแปรดังต่อไปนี้:

| Property Key | ค่าตัวอย่าง (Example Value) | คำอธิบาย |
| :--- | :--- | :--- |
| `SPREADSHEET_ID` | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` | ID ของ Google Sheets ฐานข้อมูลจริง |
| `GOOGLE_CLIENT_ID` | `1234567890-xxx.apps.googleusercontent.com` | Google OAuth Client ID สำหรับระบบล็อกอิน |
| `ALLOWED_DOMAINS` | `hrt.ac.th,school.internal` | โดเมนอีเมลที่ได้รับอนุญาตเข้าใช้งาน |
| `APP_ENV` | `production` | ระบุสภาพแวดล้อม (`production` หรือ `staging`) |

---

## 5. การปรับใช้เว็บแอปพลิเคชัน (Deployment Steps)

1. คลิกปุ่ม **"การทำให้ใช้งานได้" (Deploy)** ที่มุมขวาบน $\rightarrow$ เลือก **"การทำให้ใช้งานได้รายการใหม่" (New deployment)**
2. คลิกเลือกประเภทเป็น **"เว็บแอป" (Web app)**
3. กำหนดค่าดังนี้:
   - **คำอธิบาย (Description):** `HRT Inventory Production v2.7.0-rc.6`
   - **ดำเนินการในฐานะ (Execute as):** `ผู้ใช้ที่เข้าถึงเว็บแอป (User accessing the web app)` หรือ `ฉัน (Me / USER_DEPLOYING)` ตามนโยบายองค์กร (แนะนำ: `USER_DEPLOYING` ร่วมกับการควบคุมโดเมน)
   - **ผู้ที่มีสิทธิ์เข้าถึง (Who has access):** `ทุกคนภายในองค์กร (Anyone within [domain])`
4. คลิก **"ทำให้ใช้งานได้" (Deploy)**
5. ให้สิทธิ์การเข้าถึงข้อมูล (Review Permissions) ในครั้งแรก
6. คัดลอก **URL เว็บแอป (Web App URL)** ที่ได้ เพื่อนำไปเผยแพร่ให้บุคลากรใช้งาน:
   - ลิงก์ระบบหลัก (Desktop): `https://script.google.com/a/macros/hrt.ac.th/s/[DEPLOYMENT_ID]/exec`
   - ลิงก์ระบบมือถือ (MiniUI): `https://script.google.com/a/macros/hrt.ac.th/s/[DEPLOYMENT_ID]/exec?view=mini`

---

## 6. การทดสอบความสมบูรณ์หลังการติดตั้ง (Post-Deployment Sanity Check)

1. **ตรวจสอบการเชื่อมต่อฐานข้อมูล (Database Diagnostics):**
   - เข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ (Admin)
   - ไปที่เมนู **การตั้งค่าระบบ (Settings)** $\rightarrow$ แท็บ **ฐานข้อมูล (Database Diagnostics)**
   - สังเกตผลลัพธ์การตรวจสอบ ต้องแสดงสถานะ `HEALTHY` (16/16 ชีตสมบูรณ์ และ ID ฐานข้อมูลตรงกัน)
2. **ทดสอบสิทธิ์ผู้ใช้งาน (RBAC Sanity):**
   - ทดสอบล็อกอินด้วยบัญชีครูทั่วไป (`TEACHER`) $\rightarrow$ ต้องไม่สามารถเข้าถึงหน้าตั้งค่าระบบ หรือเมนูจัดการผู้ใช้ได้
3. **ทดสอบระบบมือถือ (MiniUI Sanity):**
   - เปิด URL ด้วยพารามิเตอร์ `?view=mini` บนมือถือ
   - ตรวจสอบว่าระบบขอสิทธิ์เข้าถึงกล้องสำหรับสแกน QR Code และโหลดข้อมูลแคตตาล็อกได้ถูกต้อง
