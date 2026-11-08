# Environment Attestation & Isolation Verification Report
**Document ID:** `ENV-ATT-20261031-01`  
**Evaluation Target:** HRT Inventory Management System `v2.7.0-rc.6`  
**Assessment Date:** 31 ตุลาคม 2569 (2026-10-31T12:50:00+07:00)  
**Safety Classification:** NON-DESTRUCTIVE STAGING INSPECTION & ISOLATION ATTESTATION  

---

## 1. Executive Summary: Environment Isolation Status

> [!CAUTION]
> **ENVIRONMENT ISOLATION DISPOSITION:** **`ENVIRONMENT_ISOLATION_BLOCKED`**  
> ในสภาพแวดล้อมปัจจุบัน **ยังไม่มีการส่งมอบ Script Project Identifier, Deployment ID (/exec URL) หรือ Disposable STAGING Spreadsheet ID ที่แยกขาดจากระบบโรงเรียนจริง**  
> ตามกฎความปลอดภัยข้อ 1 และ Phase B: **ห้ามเดา Spreadsheet ID หรือใช้ฐานโรงเรียนจริงมาทดสอบเขียน (Live Write) โดยเด็ดขาด**  
> ดังนั้น การทดสอบแบบ Live Write ต่อ Google Sheets จึงถูก **ระงับไว้ชั่วคราว (BLOCKED)** จนกว่าจะได้รับสิทธิ์เข้าถึง Staging Sandbox ที่ผ่านการรับรองความแยกขาด (Isolation Verification)

---

## 2. Environment Dimension & Identity Separation

ระบบ HRT Inventory แบ่งมิติของตัวตน (Identity Dimensions) ออกเป็น 3 ระดับอย่างเด็ดขาด:

| มิติตัวตน (Identity Dimension) | ตัวตนจริงในรอบการประเมินนี้ | บทบาทและความรับผิดชอบ | สิทธิ์การเข้าถึงฐานข้อมูล |
| :--- | :--- | :--- | :--- |
| **1. Local Test Operator** | `Art` (DESKTOP-P7FN09C) | ผู้รันสคริปต์ตรวจสอบ, รัน Node.js Test Harness, ออกรายงาน | เข้าถึงเฉพาะไฟล์ในเครื่อง Workspace เท่านั้น |
| **2. Deployer / Execution Identity** | *Pending Staging Provisioning* (`USER_DEPLOYING`) | เจ้าของ Google Apps Script Project ที่สคริปต์ใช้สิทธิ์เข้าถึง Sheets | สิทธิ์ Editor ต่อ STAGING Google Sheets |
| **3. Application Caller** | Verified Google Account (เช่น `teacher@hrt.ac.th`) | ครู/เจ้าหน้าที่ผู้เข้าใช้งานผ่าน Web App `/exec` | ไม่จำเป็นต้องมีสิทธิ์ Google Drive/Sheets; ได้รับสิทธิ์ตาม RBAC ใน `01_Users` เท่านั้น |

---

## 3. Project & Deployment Identifiers

| Parameter | สถานะปัจจุบันใน Repo / เครื่อง | Staging Requirements (ข้อกำหนดที่ต้องมีก่อน Live Test) | Production Safeguards (การป้องกันระบบจริง) |
| :--- | :--- | :--- | :--- |
| **Script Project ID** | *Not Bound in Local Workspace* (ไม่มี `.clasp.json`) | ต้องสร้าง Apps Script Project แยกต่างหากสำหรับ Staging | ห้ามใช้ Script Project ร่วมกับ Production |
| **Deployment ID (/exec)** | *Not Deployed* | ต้องเป็น Versioned Deployment ชนิด Web App (`.../exec`) | ห้ามทดสอบด้วย URL `/dev` เพราะ `/dev` อนุญาตเฉพาะ Editor |
| **Execution Mode** | `USER_DEPLOYING` (ใน `appsscript.json`) | คง `USER_DEPLOYING` เพื่อให้สคริปต์ใช้สิทธิ์ Service Account | ป้องกันการแชร์สิทธิ์ชีตแก่ผู้ใช้ทั่วไป |
| **Access Mode** | `DOMAIN` (ใน `appsscript.json`) | `DOMAIN` (จำกัดเฉพาะ Workspace) หรือ `ANYONE` ใน Sandbox | ห้ามเปิด public บนโปรเจกต์จริง |
| **GCP Cloud Project** | *Unlinked / Standalone Apps Script* | GCP Project สำหรับออก OAuth Client ID (กรณีใช้ GIS) | ต้องผูกกับ GCP Project ภายในสถานศึกษา |
| **Configured SPREADSHEET_ID** | `""` (Empty fallback ใน `Config.gs`) | ต้องระบุ ID ของ Disposable STAGING Spreadsheet | ห้ามระบุ ID ฐานจริง (`1Bxi...pms` ถูก Masked) |

---

## 4. Source & Build Integrity Attestation

ไฟล์ Runtime Allowlist ทั้ง 9 ไฟล์ได้รับการตรวจสอบความถูกต้องเชิงตัวเลข (Cryptographic SHA-256 Checksums):

| Runtime File | File Size (Bytes) | SHA-256 Digest | Build Verification Status |
| :--- | :---: | :--- | :---: |
| `Config.gs` | 18,737 | `4cd1ef31d89849147075795e5666779c27ee36cd8ffc68fe022ea93f3bd37d7f` | **MATCHED SSOT** |
| `Api.gs` | 57,504 | `55a463864208431bfa8e21b4d8369d0589ec83547efddcd5afb269a39cdd1b2a` | **MATCHED SSOT** |
| `Read.gs` | 85,315 | `791bf5fc5693c35a2a5b8192addee270f6c2c6f0833433ad52700b02d961f825` | **MATCHED SSOT** |
| `Write.gs` | 100,939 | `575ab957c86bfe8fca6a2376dd3d492ce5a2277e594fc68651ea4c0664097857` | **MATCHED SSOT** |
| `Audit.gs` | 16,712 | `00d914bcbd2c953062e9fbe5dd2e9e9d93597685e370a9b0ba5031c20fab9e47` | **MATCHED SSOT** |
| `Code.gs` | 16,684 | `8e00de0fc095036d7001a228dc65f2d8ff9ede07b484b2eeac8786cfcf69aa1b` | **MATCHED SSOT** |
| `index.html` | 985,263 | `0d468f6e8ad6b61baf4cac46da4951448ae2689213a0af567b9f57d969feb298` | **MATCHED SSOT** |
| `MiniUI.html` | 84,248 | `e4d7a4e52ae65fa588ef4e4fda14a94566c77548c1507323c102f80f115c9523` | **MATCHED SSOT** |
| `appsscript.json` | 381 | `2e88517c17942abd0a15f3c99383a12c11f04080ccd2d573d1d1449f4609e092` | **MATCHED SSOT** |

- **Release Package Hash (Runtime.zip):** `359b034110f27ae54f5365563cd244722e843340e5d71a986608381018004fa0`
- **Release Package Hash (Handover.zip):** `cd4bc8c1b26835c0beb9db0f6a23d806ea2ed6109a996d65716e4beeb4d50689`
- **Local Unit / AST Test Suite Status:** **17/17 Suites PASS (100%), 195/195 Tests PASS**

---

## 5. Critical Apps Script Architecture Warning (Cross-Deployment Bleed)

> [!WARNING]
> **พฤติกรรมของ Google Apps Script Script Properties:**
> ใน Google Apps Script ทุก Deployment (รวมถึง `/dev` และ `/exec` ทุกเวอร์ชัน) ที่สร้างขึ้นภายใต้ Script Project เดียวกัน จะอ่านและเขียนค่า `PropertiesService.getScriptProperties()` **ร่วมกันที่ระดับ Project Level**  
> **ผลกระทบ:**  
> หากผู้ดูแลระบบนำ Script Project ที่กำลังให้บริการ Production อยู่ แล้วทำการเปลี่ยน `SPREADSHEET_ID` ใน Script Properties ให้ชี้ไปยังฐานข้อมูลทดสอบ (Test DB) **ระบบ Production ของผู้ใช้จริงทุกคนจะถูกสลับไปใช้ฐานข้อมูลทดสอบทันที**  
> **ข้อกำหนดเชิงบังคับ:**
> 1. การทดสอบ Staging จะต้องสร้างเป็น **Standalone Script Project ชุดใหม่แยกต่างหาก 100%**
> 2. ห้ามสลับ `SPREADSHEET_ID` บน Project Production เดิมเพื่อวัตถุประสงค์การทดสอบเป็นอันขาด

---

## 6. Pre-Flight Database Validation Gate (Write Allowlist)

ก่อนที่สคริปต์ทดสอบใดๆ จะได้รับอนุญาตให้ทำการยิงคำสั่ง Write/Mutation ในระบบ Live:
1. ฟังก์ชัน Pre-Flight จะต้องเรียก `SpreadsheetApp.openById(configuredId).getId()` และเปรียบเทียบกับค่า `EXACT_STAGING_ALLOWLIST_ID`
2. หาก ID ไม่ตรง หรือตรวจพบว่าเป็น Production Database Identifier ให้ยกเลิกการทำงานทันที (`ABORT_WRITE_MISMATCH`)
3. ในรอบการตรวจสอบนี้ เนื่องจากยังไม่มีการระบุ `EXACT_STAGING_ALLOWLIST_ID` จึงคงสถานะ **`BLOCKED`** สำหรับการยิงคำสั่งเขียนจริง
