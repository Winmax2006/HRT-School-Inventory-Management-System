# รายการตรวจสอบความพร้อมก่อนส่งมอบระบบ (Release Readiness Checklist)
## HRT School Inventory Management System — โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)
### รหัสเอกสารประเมิน: SIMS-REL-2026-008
### รุ่นประเมิน: `v2.7.0-rc.3` (Release Candidate 3) | Historical Baseline: `v2.6.0` | วันที่ประเมิน: 2026-10-28
### สถานะการอนุมัติระดับ Staging: 🟢 **ผ่านเกณฑ์สำหรับทดสอบใน Staging (GO FOR STAGING PILOT)**
### สถานะการขึ้นใช้งาน Production: ⛔ **ระงับไว้ชั่วคราว (BLOCKED - PENDING REAL DOMAIN CREDENTIALS)**

---

## 1. เกณฑ์ประตูการส่งมอบระบบ (Release Gate Assessment Matrix)

| ประตูตรวจสอบ (Gate) | เกณฑ์ชี้วัดความพร้อมตามข้อกำหนด | สถานะ | หลักฐานและผลการประเมินเชิงประจักษ์ |
| :--- | :--- | :---: | :--- |
| **Gate 1: สถาปัตยกรรมและโครงสร้างดั้งเดิม (Preservation)** | - คง Google Sheets (16 canonical sheets) + Apps Script + HTML SPA<br>- รวมศูนย์เป็น Single Project Writer (`Root *.gs`)<br>- ระงับโค้ดซ้ำซ้อนใน `backend/` และ `apps_script/`<br>- รักษา DOM IDs และหน้าจอเดิมครบถ้วน | 🟢 **ผ่าน** | - ซอร์สโค้ดคงโครงสร้างเดิม 100%<br>- มี 6 ไฟล์หลัก Backend (`Config.gs`, `Code.gs`, `Api.gs`, `Read.gs`, `Write.gs`, `Audit.gs`)<br>- เอกสาร `BACKEND_SHEETS_ARCHITECTURE.md` แยกความเป็นจริงออกจากข้อเสนอชัดเจน |
| **Gate 2: การแก้ไขข้อบกพร่องตามรายงาน Audit (Defect Remediation)** | - แก้ไขครบทั้ง 7 Critical (C-1 ถึง C-7)<br>- แก้ไขครบทั้ง 5 Important (I-1 ถึง I-5)<br>- แก้ไขครบทั้ง 5 Optimization (O-1 ถึง O-5)<br>- แก้ไขครบทั้ง 3 New Features (N-1 ถึง N-3)<br>- บัญชีคุมพัสดุ SSOT และ State Machine 9 สถานะ | 🟢 **ผ่าน** | - ตรวจสอบผ่านตาราง Master Remediation Matrix<br>- มีชุดทดสอบอัตโนมัติรับรองครบถ้วนใน `tests/`<br>- เอกสาร `SHEETS_SCHEMA_MAPPING.md` จำแนก 20 กลุ่มลง 16 ชีต |
| **Gate 3: ชุดการทดสอบการถดถอยรวม (Automated Test Pass Rate)** | - ผ่านการทดสอบอัตโนมัติ 100%<br>- ครอบคลุมชุดทดสอบ Prompt 00 ถึง 08 ครบทั้ง 7 Suites<br>- ไม่พบ Regression ในฟังก์ชันเดิม | 🟢 **ผ่าน** | - **ผ่าน 72 จาก 72 การทดสอบ (100% Pass Rate)**<br>- ครอบคลุมทั้ง Core Regression, P1-P4, P6 Acceptance, P7 Settings และ P8 Backend Architecture<br>- เอกสาร `COMBINED_00_08_REGRESSION_REPORT.md` |
| **Gate 4: ประสิทธิภาพและขนาดข้อมูล (Empirical Performance)** | - ลดขนาด Payload ประวัติธุรกรรม $\ge 80\%$<br>- ความเร็วการตอบสนองเพิ่มขึ้น $\ge 1.4\text{x}$<br>- ข้อมูลโหลดหน้าแรก (Bootstrap) $\le 50\text{ KB}$ | 🟢 **ผ่าน** | - ชุดข้อมูลใหญ่ลดขนาดลง 99.7% (จาก 4.09 MB เหลือ 11.8 KB)<br>- ความเร็วเร็วขึ้น 2.29x – 2.63x<br>- Bootstrap Payload ใช้เพียง 811 ไบต์ |
| **Gate 5: ความปลอดภัยและสิทธิ์การใช้งาน (Fail-Closed Security)** | - ปฏิเสธคำขอที่ไม่มีสิทธิ์ทันทีในระดับ Server<br>- ป้องกัน Role Spoofing และ Identity Tampering<br>- ป้องกัน Formula Injection (`=, +, -, @`) ในชีต<br>- พิทักษ์ Admin คนสุดท้าย (Last-Admin Protection)<br>- ติดตั้ง ScriptLock ป้องกัน Concurrent Writes | 🟢 **ผ่าน** | - `resolveAuthenticatedUser` ตรวจสอบ Session ฝั่งเซิร์ฟเวอร์<br>- `LockService.getScriptLock()` ควบคุมการเขียน 60 วินาที<br>- `sanitizeCellValue` กรองสูตรคำนวณอันตราย<br>- ทดสอบผ่านใน Scenario 1-3 และ 10 ของ P8 Suite |
| **Gate 6: การจัดการสิทธิ์และข้อมูลประจำตัวระดับ Production** | - มี Google Workspace OAuth Client ID/Secret ของโดเมนจริง `@hrt.ac.th`<br>- มีการยืนยันตัวตนบน Production Apps Script Deployment<br>- กำหนดค่า Script Properties บนระบบจริง | ⛔ **บล็อก** *(BLOCKED)* | - **ในพื้นที่พัฒนา Local ไม่มีและห้ามใส่ Credentials จริงของโรงเรียน เพื่อความปลอดภัยตามมาตรฐานความปลอดภัยข้อมูล**<br>- กำหนดให้ระบบอยู่ในสถานะ Staging Release Candidate เพื่อรอข้อมูลประจำตัวจริง |
| **Gate 7: การทดสอบบนอุปกรณ์จริงร่วมกับผู้ใช้ (User Acceptance Testing - UAT)** | - ครูและบุคลากรทดสอบสแกน QR บน iOS Safari และ Android Chrome ในพื้นที่โรงเรียนจริง<br>- ทดสอบการเบิกจ่ายจริงและการพิมพ์เอกสารราชการ | 🟡 **รอทดสอบ** *(PENDING)* | - เตรียมจัดทดสอบในช่วง Staging Verification ตามคู่มือ `USER_GUIDE_MINIUI.md` และ `SETTINGS_USER_GUIDE.md` |

---

## 2. มติการประเมินและการจัดระดับรุ่น (Release Decision & Version Disposition)

### 2.1 การเลื่อนระดับเป็น `v2.7.0-rc.3`
คณะทำงานวิศวกรรมระบบมีมติเห็นชอบเป็นเอกฉันท์ให้กำหนดระดับรุ่นของโค้ดชุดนี้เป็น **`v2.7.0-rc.3` (Release Candidate 3)** เนื่องจาก:
1. ผ่านการทดสอบอัตโนมัติครบถ้วนทั้ง 7 ชุดการทดสอบ รวม 72 ข้อสอบ (100% Pass Rate) โดยไม่มีข้อบกพร่องถดถอย
2. จัดการสถาปัตยกรรมแบ็กเอนด์เสร็จสมบูรณ์ โดยรวมศูนย์ Single Project Writer ที่ Root `*.gs` และระงับความเสี่ยงจาก Multi-writer ในไดเรกทอรีย่อย
3. วางกลไก Transaction Isolation ด้วย ScriptLock, Commit Markers และ Idempotency Log พร้อมผ่านการทดสอบฉีดความล้มเหลว (Failure Injection Test)
4. มีเอกสารควบคุมเชิงสถาปัตยกรรม สัญญา API สคีมาฐานข้อมูล และคู่มือการย้ายข้อมูลครบถ้วนทั้ง 10 รายการ

### 2.2 นโยบายการควบคุมและระงับการขึ้น Production (Production Gate Hold Policy)
**การขึ้นระบบใช้งานจริงบน Production ถูกระงับไว้อย่างเด็ดขาด (STRICTLY BLOCKED)** จนกว่าจะผ่านเงื่อนไขบังคับต่อไปนี้:
1. ผู้ดูแลระบบสารสนเทศของโรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) นำโค้ดชุด `v2.7.0-rc.3` ไปติดตั้งบน Google Apps Script ภายใต้บัญชีทางการของโรงเรียน
2. กำหนดค่า Script Properties ที่ปลอดภัยบนเซิร์ฟเวอร์จริง:
   - `ALLOWED_DOMAINS` = `hrt.ac.th`
   - `GOOGLE_CLIENT_ID` = `[Production_OAuth_Client_ID]`
   - `SESSION_SECRET` = `[Production_High_Entropy_Secret]`
   - `SPREADSHEET_ID` = `[Production_Canonical_Spreadsheet_ID]`
3. ดำเนินการทดสอบเบื้องต้น (Smoke Test) 1 รอบ เพื่อยืนยันว่าการเชื่อมต่อ Google Workspace SSO และ Google Sheets สำเร็จเรียบร้อย
