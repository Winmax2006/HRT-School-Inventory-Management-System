# ระบบบริหารคลังพัสดุ โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)
### HRT School Inventory Management System (Version v2.7.0-rc.6 / Fiscal Year 2569)
> สังกัด **องค์การบริหารส่วนจังหวัดสระบุรี (อบจ.สระบุรี)**  
> พัฒนาตามมาตรฐาน **ระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖๐**  
> ระบบรหัสพัสดุภาครัฐ **(Federal Supply Classification - FSN)** กรมบัญชีกลาง  
> **คู่มือการติดตั้งระบบบน Apps Script:** [`docs/INSTALL_GAS.md`](docs/INSTALL_GAS.md)  
> **สถานะโครงการและรายงานการตรวจสอบ:** [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md)  
> **ข้อกำหนดโครงสร้างฐานข้อมูล 16 ชีต:** [`docs/DATA_SCHEMA.md`](docs/DATA_SCHEMA.md)  
> **ข้อกำหนดสัญญา API Gateway:** [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md)  
> **คู่มือการทดสอบอัตโนมัติ:** [`docs/TESTING.md`](docs/TESTING.md)  

---

## ⚠️ ประกาศสถานะและความจริงเชิงประจักษ์ (Engineering Health & Evidence Disclosure)

| มิติความพร้อม | สถานะจริง | รายละเอียดเชิงประจักษ์ |
|---|:---:|---|
| **การเชื่อมโยง GitHub** | **เชื่อมต่อแล้ว (Connected)** | Remote Origin เชื่อมกับ `https://github.com/Winmax2006/HRT-School-Inventory-Management-System.git` |
| **การซิงก์ Source Code** | **พร้อมนำขึ้น (Ready to Push)** | รวบรวมและตรวจสอบความสมบูรณ์ของซอร์สโค้ดและชุดทดสอบในเครื่อง ผ่านการทดสอบ 59/59 ข้อ |
| **การ Deploy บน Apps Script** | **ยังไม่ Deploy (NOT VERIFIED)** | การ Push ขึ้น GitHub ไม่เท่ากับการ Deploy บน Apps Script การใช้งานจริงต้องนำ 9 ไฟล์หลักไปติดตั้งบน Google Apps Script Editor หรือผ่าน `clasp` |
| **ความพร้อมด้านธุรกรรม (Transactions)** | **แก้ไขแล้ว (BUG-01 - BUG-04 VERIFIED)** | แก้ไข False Success, Route Mismatch, Parameter Normalization และ Atomic Issuance พร้อมชุดทดสอบยืนยัน (ยังคงเหลือ BUG-05 ถึง BUG-07 ก่อน Production) |

---

## 📌 สารบัญ (Table of Contents)
1. [ภาพรวมของระบบ (System Overview)](#1-ภาพรวมของระบบ-system-overview)
2. [สถาปัตยกรรมและเทคโนโลยี (Architecture & Tech Stack)](#2-สถาปัตยกรรมและเทคโนโลยี-architecture--tech-stack)
3. [โครงสร้างโมดูลหลัก 8 ส่วน (Core System Modules)](#3-โครงสร้างโมดูลหลัก-8-ส่วน-core-system-modules)
4. [โครงสร้างฐานข้อมูลมาตรฐาน 16 ชีต (Database Schema & SSOT Model)](#4-โครงสร้างฐานข้อมูลมาตรฐาน-16-ชีต-database-schema--ssot-model)
5. [ความมั่นคงปลอดภัยและการควบคุมสิทธิ์ (Security & Dynamic RBAC)](#5-ความมั่นคงปลอดภัยและการควบคุมสิทธิ์-security--dynamic-rbac)
6. [โครงสร้างไฟล์รันไทม์ 9 ไฟล์หลัก (Runtime Allowlist)](#6-โครงสร้างไฟล์รันไทม์-9-ไฟล์หลัก-runtime-allowlist)
7. [คู่มือการติดตั้งและการใช้งาน (Installation Guide)](#7-คู่มือการติดตั้งและการใช้งาน-installation-guide)
8. [ผลการทดสอบและการรับรองคุณภาพ (Quality Assurance & Test Results)](#8-ผลการทดสอบและการรับรองคุณภาพ-quality-assurance--test-results)
9. [ข้อควรระวังและงานที่ต้องทำก่อนใช้งานจริง (Pre-Production Roadmap)](#9-ข้อควรระวังและงานที่ต้องทำก่อนใช้งานจริง-pre-production-roadmap)

---

## 1. ภาพรวมของระบบ (System Overview)

**ระบบบริหารคลังพัสดุ HRT Inventory System รุ่น `v2.7.0-rc.6`** เป็นเว็บแอปพลิเคชันรูปแบบ **Single-File Web Application (SPA)** ร่วมกับ **Google Apps Script V8 Engine** และ **Google Sheets Database (16 ชีตมาตรฐาน)** ออกแบบมาเพื่อบริหารจัดการพัสดุโรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) สังกัด อบจ.สระบุรี:
* **ติดตามสถานะสต็อก**: แจ้งเตือนจุดสั่งซื้อซ้ำ (Reorder Point - ROP) และพัสดุวิกฤติต่ำกว่าเกณฑ์ขั้นต่ำ (Min Stock)
* **ควบคุมวงจรการเบิกจ่ายพัสดุ**: วงจรคำขอเบิก -> ตรวจสอบ -> อนุมัติ -> จ่ายพัสดุ -> ตรวจรับมอบ (ตามการออกแบบ ยอดสต็อกจะถูกตัดจริงเฉพาะขั้นตอนจ่ายพัสดุ)
* **ระบบบริการตนเองบนมือถือ (MiniUI Self-Service)**: สแกน QR Code พัสดุผ่าน WebRTC MediaStream + BarcodeDetector API และติดตามคำขอเบิก
* **ออกเอกสารราชการมาตรฐาน พ.ด. ๑ ถึง พ.ด. ๗**: รองรับการจัดพิมพ์ลงกระดาษ A4 ตามแบบราชการ

```mermaid
flowchart TD
    subgraph Users [ผู้ใช้งานสถานศึกษา]
        Teacher["ครู / บุคลากรผู้เบิก<br/>(TEACHER / REQUESTER)"]
        Officer["เจ้าหน้าที่พัสดุ<br/>(OFFICER)"]
        Director["ผู้อำนวยการ / ผู้บริหาร<br/>(DIRECTOR / APPROVER / ADMIN)"]
    end

    subgraph Frontends [ส่วนติดต่อผู้ใช้ (Frontend Clients)]
        MiniUI["📱 MiniUI Mobile Portal<br/>(MiniUI.html)<br/>- WebRTC QR Camera Scan<br/>- Scoped Cart Draft<br/>- My Requests Tracking"]
        MainWeb["💻 Central Desktop Web SPA<br/>(index.html)<br/>- Executive Dashboard<br/>- Catalog & Stock Card<br/>- Official Forms พ.ด. ๑-๗<br/>- Settings & Diagnostics"]
    end

    subgraph Gateways [เกตเวย์ความปลอดภัย (Security Boundary)]
        Router["🛡️ Api.gs (ApiRouter Core)<br/>- Google ID Token / Session Auth<br/>- Dynamic RBAC (6 Roles)<br/>- Fiscal Year Write Guard<br/>- Idempotency Cache"]
    end

    subgraph BackendServices [บริการหลังบ้าน (Backend Service Layer)]
        ReadSvc["Read.gs (Pure Queries)<br/>- Full-Universe Aggregations<br/>- Multi-Prefix QR Resolver<br/>- Official Forms Builder"]
        WriteSvc["Write.gs (Mutator & Ledger)<br/>- LockService Script Mutex<br/>- Double-Entry Stock Ledger<br/>- Anti-Formula CSV Import"]
        AuditSvc["Audit.gs (Audit Chaining)<br/>- SHA-256 Hash Chained Logs<br/>- Sensitive Secret Masking"]
    end

    subgraph Database [ฐานข้อมูลหลัก (16 Canonical Physical Sheets)]
        Sheets[("📊 Google Sheets Database<br/>- 01_Users to 16_Idempotency_Log<br/>- Single Source of Truth (SSOT)")]
    end

    Teacher --> MiniUI
    Teacher --> MainWeb
    Officer --> MainWeb
    Director --> MainWeb

    MiniUI -->|google.script.run / RPC| Router
    MainWeb -->|google.script.run / RPC| Router

    Router --> ReadSvc
    Router --> WriteSvc
    WriteSvc --> AuditSvc
    ReadSvc --> Sheets
    WriteSvc --> Sheets
    AuditSvc --> Sheets
```

---

## 2. สถาปัตยกรรมและเทคโนโลยี (Architecture & Tech Stack)

| ส่วนประกอบ | เทคโนโลยี | บทบาทในระบบ |
|---|---|---|
| **Backend Engine** | Google Apps Script (V8 Runtime) | โค้ด Backend 6 ไฟล์หลัก (`Config.gs`, `Api.gs`, `Read.gs`, `Write.gs`, `Audit.gs`, `Code.gs`) ไม่พึ่งพาเซิร์ฟเวอร์ภายนอก |
| **Database SSOT** | Google Sheets (16 Canonical Sheets) | สมุดทะเบียนและบัญชีคุมพัสดุ 16 ชีตมาตรฐาน พร้อมกลไก LockService |
| **Frontend Desktop SPA** | Vanilla HTML5, ES6+, Tailwind CSS CDN | หน้าจอหลักสำหรับ Desktop จัดการพัสดุเต็มรูปแบบ ไม่ใช้ build tools |
| **Mobile Client** | HTML5, WebRTC MediaStream, BarcodeDetector | หน้าจอ MiniUI สำหรับสมาร์ตโฟน รองรับการสแกน QR Code ด้วยกล้อง |
| **Security & Identity** | Google Identity Services + Apps Script Session | ยืนยันตัวตนผ่าน Google Workspace โดเมนสถานศึกษา ควบคุมสิทธิ์ 6 บทบาท |
| **Transaction Integrity** | SHA-256 Idempotency + LockService Mutex | สถาปัตยกรรมป้องกันการส่งคำขอเบิกซ้ำและการกดปุ่มเบิ้ล |

---

## 3. โครงสร้างโมดูลหลัก 8 ส่วน (Core System Modules)
1. **Executive Command Dashboard**: สรุปภาพรวมและสถิติคลังพัสดุ
2. **Inventory Catalog & Stock Ledger SSOT**: ทะเบียนพัสดุและประวัติบัญชีคุมพัสดุ
3. **Requisition & Approval Lifecycle**: ระบบสร้าง ตรวจสอบ อนุมัติ จ่าย และตรวจรับพัสดุ
4. **MiniUI Mobile & Responsive QR Portal**: ระบบบริการตนเองบนมือถือผ่านการสแกนคิวอาร์โค้ด
5. **FSN Standard Management**: ทะเบียนรหัสพัสดุมาตรฐานภาครัฐ 13 หลัก
6. **Fiscal Year Lifecycle & Year-End Audit**: การตรวจนับพัสดุสิ้นปีงบประมาณและรอบบัญชี (ต.ค. - ก.ย.)
7. **Official Forms Engine (พ.ด. ๑–๗)**: ระบบออกเอกสารราชการมาตรฐานตามระเบียบกระทรวงการคลังฯ
8. **Settings, Database Diagnostics & Backup/Restore**: ตั้งค่าระบบ ตรวจสอบความสมบูรณ์ และสำรองข้อมูล

---

## 4. โครงสร้างฐานข้อมูลมาตรฐาน 16 ชีต (Database Schema & SSOT Model)

อ้างอิงจาก [`docs/DATA_SCHEMA.md`](docs/DATA_SCHEMA.md) และค่าคงที่ `CONFIG.SHEETS` ใน `Config.gs`:
1. `01_Users` — ทะเบียนผู้ใช้งานและบทบาท
2. `02_Roles` — นิยามสิทธิ์และโครงสร้างลำดับชั้นบทบาท
3. `03_Master_Items` — ทะเบียนพัสดุหลักและยอดคงเหลือ
4. `04_Categories` — หมวดหมู่พัสดุ
5. `05_Departments` — กลุ่มสาระการเรียนรู้และฝ่ายงาน
6. `06_FSN` — ทะเบียนรหัสพัสดุมาตรฐานภาครัฐ 13 หลัก
7. `07_Requisitions` — หัวเอกสารคำขอเบิกพัสดุ
8. `08_Requisition_Items` — รายการพัสดุย่อยในคำขอเบิก
9. `09_Stock_Transactions` — วารสารบันทึกธุรกรรมการเคลื่อนไหว
10. `10_Stock_Ledger` — บัญชีคุมพัสดุคู่ (Double-Entry Ledger)
11. `11_Audit_Logs` — บันทึก Audit Trail พร้อม SHA-256 Chaining
12. `12_YearEnd_Audit` — บันทึกผลการตรวจนับพัสดุสิ้นปี
13. `13_Settings` — ค่าระบบและการตั้งค่าลำดับเอกสาร
14. `14_QR_Registry` — ทะเบียนผูกรหัส QR Code
15. `15_Fiscal_Years` — ทะเบียนรอบปีงบประมาณ
16. `16_Idempotency_Log` — บันทึกกุญแจตรวจสอบธุรกรรมซ้ำ

---

## 5. ความมั่นคงปลอดภัยและการควบคุมสิทธิ์ (Security & Dynamic RBAC)

ระบบควบคุมสิทธิ์แบบ **Fail-Closed Dynamic RBAC** กำหนดใน `Config.gs` และ `Api.gs`:
* **ADMIN** (ระดับ 60): ดูแลระบบทั้งหมด ตั้งค่า และปิดปีงบประมาณ
* **DIRECTOR** (ระดับ 50): ผู้อำนวยการสถานศึกษา พิจารณาอนุมัติ
* **APPROVER** (ระดับ 40): ผู้มีอำนาจอนุมัติคำขอเบิก
* **OFFICER** (ระดับ 30): เจ้าหน้าที่พัสดุ ตรวจสอบคำขอ จ่ายพัสดุ และรับพัสดุเข้า
* **TEACHER** (ระดับ 10): ครูผู้สอน ขอเบิกพัสดุ ตรวจรับพัสดุ
* **REQUESTER** (ระดับ 10): ผู้ขอเบิกทั่วไป

---

## 6. โครงสร้างไฟล์รันไทม์ 9 ไฟล์หลัก (Runtime Allowlist)

ไฟล์สำหรับการ Deploy บน Apps Script ประกอบด้วย 9 ไฟล์หลักที่ root:
```text
├── appsscript.json    # Manifest & OAuth Scopes
├── Config.gs          # Root Configuration & Constants
├── Api.gs             # API Gateway & RBAC Router
├── Read.gs            # Query Services
├── Write.gs           # Mutations & ACID Stock Ledger
├── Audit.gs           # SHA-256 Audit Trail
├── Code.gs            # Entry Points (doGet, doPost, apiCall, HRT_rpc)
├── index.html         # Desktop Management SPA
└── MiniUI.html        # Mobile QR Portal
```

---

## 7. คู่มือการติดตั้งและการใช้งาน (Installation Guide)

โปรดดูรายละเอียดขั้นตอนการติดตั้งฉบับเต็มที่ [`docs/INSTALL_GAS.md`](docs/INSTALL_GAS.md)
1. **การติดตั้งผ่าน Clasp:**
   ```bash
   cp .clasp.example.json .clasp.json
   # แก้ไข scriptId เป็นของโครงการคุณ
   clasp push
   ```
2. **การกำหนด Script Properties:**
   - `SPREADSHEET_ID`: ID ของ Google Sheets 16 ชีต
   - `GOOGLE_CLIENT_ID`: Google OAuth Web Client ID
   - `ALLOWED_DOMAINS`: `horathep.ac.th,hrt.ac.th,school.internal`

---

## 8. ผลการทดสอบและการรับรองคุณภาพ (Quality Assurance & Test Results)

### 8.1 การทดสอบอัตโนมัติในเครื่อง (Isolated In-Memory Runner)
รันบน Node.js v24 (คำสั่ง `npm test`):
* `tests/release_consolidation_test.js`: **10/10 PASS** (REL-01 ถึง REL-10)
* `tests/stock_transaction_idempotency_test.js`: **15/15 PASS** (TX-01 ถึง TX-15)
* `tests/auth_rbac_test.js`: **12/12 PASS** (AUTH-01 ถึง AUTH-12)
* `tests/rpc_contract_test.js`: **12/12 PASS** (RPC-01 ถึง RPC-12)

### 8.2 ข้อจำกัดของการทดสอบ (Audit Caveats)
* การทดสอบข้างต้นรันบน In-Memory Adapter และ Fixtures เพื่อไม่ให้เขียนข้อมูลลง Google Sheets จริง
* ยัง **ไม่ได้รันบน Live Google Apps Script Runtime** และยังไม่ได้เชื่อมต่อกล้องจริงบนอุปกรณ์สมาร์ตโฟน

---

## 9. ข้อควรระวังและงานที่ต้องทำก่อนใช้งานจริง (Pre-Production Roadmap)

ก่อนนำระบบขึ้น Production ผู้พัฒนาต้องดำเนินการแก้ไขจุดบกพร่องตามรายงาน [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md):
1. **แก้ปัญหา False Success ในการตัดสต็อก ([index.html:14672](index.html#L14672)):** ป้องกันไม่ให้ UI แจ้งว่าตัดสต็อกสำเร็จเมื่อเกิดข้อผิดพลาดจาก Backend
2. **แก้ปัญหา Route Mismatch ([Code.gs:202](Code.gs#L202)):** ปรับ Action ให้ตรงกับ `'requisitions.issue'` ใน `Api.gs`
3. **เพิ่มการ Normalization คีย์ `requisitionId` ([Api.gs:256](Api.gs#L256))**
4. **ปรับ UI ไม่ให้วนลูปตัดสต็อกรายชิ้น ([index.html:14627](index.html#L14627)):** ให้ส่งตัดสต็อกระดับใบเบิก
5. **ปรับตัวพิมพ์ Role ใน UI ให้เป็นตัวพิมพ์ใหญ่สม่ำเสมอ**
