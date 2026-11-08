# คู่มือการติดตั้งและปรับใช้ระบบบน Google Apps Script (Deployment Guide)
**ระบบบริหารคลังพัสดุ โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)**  
**เวอร์ชัน:** `v2.7.0-rc.6`

---

## 1. ไฟล์สำหรับ Runtime Deployment (9 ไฟล์หลัก)

ระบบทำงานบน **Google Apps Script (V8 Engine)** โดยใช้ไฟล์ Allowlist ทั้งหมด 9 ไฟล์ที่อยู่ที่ root directory:
```text
├── appsscript.json    # Apps Script Manifest
├── Config.gs          # ค่าคงที่และการตั้งค่าระบบ
├── Api.gs             # API Gateway และตัวควบคุมสิทธิ์ (RBAC)
├── Read.gs            # บริการสืบค้นและรายงาน
├── Write.gs           # บริการบันทึกข้อมูลและตัดสต็อก (ACID Ledger)
├── Audit.gs           # บันทึก Audit Trail พร้อม SHA-256 Chaining
├── Code.gs            # จุดเชื่อมต่อ Web App (doGet, doPost, apiCall, HRT_rpc)
├── index.html         # หน้าจอหลัก Single-Page Application (Desktop)
└── MiniUI.html        # หน้าจอบริการตนเองและสแกน QR Code (Mobile)
```

---

## 2. วิธีการติดตั้งที่ 1: ผ่าน Google Clasp CLI (แนะนำ)

1. ตรวจสอบว่ามี Node.js และ clasp:
   ```bash
   npm install -g @google/clasp
   clasp login
   ```
2. สร้างโครงการ Apps Script ใหม่ หรือผูกกับโครงการเดิม:
   ```bash
   # หากสร้างใหม่
   clasp create --title "HRT_Inventory_Production_v2.7.0" --type webapp

   # หากมีโครงการเดิม ให้คัดลอก .clasp.example.json เป็น .clasp.json และระบุ scriptId
   cp .clasp.example.json .clasp.json
   ```
3. ส่งเฉพาะไฟล์ Runtime ขึ้น Apps Script (ระบบจะอ่านกฎจาก `.claspignore` อัตโนมัติ):
   ```bash
   clasp push
   ```

---

## 3. วิธีการติดตั้งที่ 2: ติดตั้งด้วยตนเองผ่าน Web Browser

1. ไปที่ [Google Apps Script Dashboard](https://script.google.com/) แล้วกด **New Project (โครงการใหม่)**
2. ไปที่ **Project Settings (การตั้งค่าโครงการ)** ติ๊กถูกที่ *"Show 'appsscript.json' manifest file in editor"*
3. คัดลอกเนื้อหาจาก `appsscript.json` ไปวางในแท็บ `appsscript.json`
4. สร้างไฟล์ Script (.gs) 6 ไฟล์ (`Config.gs`, `Api.gs`, `Read.gs`, `Write.gs`, `Audit.gs`, `Code.gs`) และคัดลอกโค้ดไปวาง
5. สร้างไฟล์ HTML (.html) 2 ไฟล์ (`index.html`, `MiniUI.html`) และคัดลอกโค้ดไปวาง

---

## 4. การตั้งค่าคุณสมบัติของสคริปต์ (Script Properties)

ไปที่ **Project Settings > Script Properties** แล้วเพิ่มตัวแปรระบบ:

| Property Key | ค่าตัวอย่าง (Example Placeholder) | คำอธิบาย |
|---|---|---|
| `SPREADSHEET_ID` | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` | ID ของ Google Sheets ฐานข้อมูลหลัก 16 ชีต |
| `GOOGLE_CLIENT_ID` | `1234567890-xxx.apps.googleusercontent.com` | Google Cloud OAuth 2.0 Web Client ID ของสถานศึกษา |
| `ALLOWED_DOMAINS` | `horathep.ac.th,hrt.ac.th,school.internal` | รายชื่อโดเมนอีเมลที่อนุญาตให้เข้าใช้งาน |
| `APP_ENV` | `production` | สภาพแวดล้อมระบบ (`production` หรือ `staging`) |

---

## 5. การสร้าง Web App Deployment

1. กดปุ่ม **Deploy > New deployment**
2. เลือกประเภท **Web app**
   - **Execute as:** `Me (USER_DEPLOYING)`
   - **Who has access:** `Anyone within [ชื่อโดเมนสถานศึกษา]` (หรือ `Anyone` ตามนโยบายการใช้งาน)
3. คัดลอก Web App URL เพื่อส่งมอบให้ผู้ใช้งาน
