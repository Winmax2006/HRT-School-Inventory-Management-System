# บัญชีชุดไฟล์สำหรับขึ้นระบบสะอาด (Clean Build & Deployment Manifest)
## ระบบบริหารจัดการพัสดุโรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) — รุ่น v2.7.0-rc.4 (Prompt 09)
**บทบาทผู้ตรวจสอบ:** ผู้ตรวจประเมินระบบอิสระและวิศวกรประกันคุณภาพซอฟต์แวร์ (Independent System Auditor & Lead QA)  
**รหัสเอกสาร:** `docs/POST_PROMPT09_CLEAN_BUILD_MANIFEST.md`  
**สถานะการควบคุมรุ่น:** `2.7.0-rc.4` | Git Commit: `dd000c0`  

---

### 1. บัญชีไฟล์ชุดขึ้นระบบจริง (Effective Production Deploy File Set)

ชุดไฟล์สำหรับขึ้นระบบจริงบน Google Apps Script และ Web App มีจำนวน **9 ไฟล์มาตรฐาน** เท่านั้น โดยผ่านการคำนวณค่าแฮช SHA-256 จากดิสก์จริง:

| ลำดับ | ชื่อไฟล์และพาธ | ขนาดไฟล์ (Bytes) | ค่าแฮชตรวจสอบ SHA-256 (Empirical Hash) | หน้าที่และขอบเขตความรับผิดชอบ |
|:---:|---|:---:|---|---|
| 1 | [`Config.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Config.gs) | 18,203 | `986B1E1F75976C22F30246053EC7A0967211A16E635853C5F829492E7EF8D6E0` | คอนฟิกระบบ สคีมา 16 ชีต บทบาท RBAC และป้ายรุ่น `2.7.0-rc.4` |
| 2 | [`Api.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Api.gs) | 32,194 | `E1DBDB76E8B60A7D8FA07C61229C06698D9FF31687CB25D03D19DB6348145B6D` | Universal Action Dispatcher, RBAC Guard, Idempotency Cache |
| 3 | [`Read.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Read.gs) | 65,360 | `3115319C06998F8B432418F93EDA41E8B1DCD0F35576211099C161A655E6E182` | บริการอ่านข้อมูลพัสดุ ตัวกรอง 8 มิติ แดชบอร์ด และแบบฟอร์ม พ.ด. |
| 4 | [`Write.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs) | 83,961 | `B665E4A098E270D782457E675D49515030D8979E61055CE38EC7C05BBF74A8C8` | บริการบันทึก Single SSOT Writer ตัดสต็อกที่ `ISSUED` และคุมปีงบประมาณ |
| 5 | [`Audit.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Audit.gs) | 15,991 | `60993701BFC345AFA4D7D2F09FFCD15561BFE075ADD6C84B3ADFA8132C7609CA` | บริการบันทึกประวัติการเปลี่ยนแปลง สายโซ่แฮช SHA-256 และการตรวจนับสิ้นปี |
| 6 | [`Code.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Code.gs) | 12,509 | `6134B3EA35E35F438146CA659A705B3019FCE67D95FBC8B7549942B7B890D53D` | ตัวเรนเดอร์ Web App (`doGet`, `doPost`) และ Facade RPC Functions |
| 7 | [`index.html`](file:///c:/Users/Art/.gemini/antigravity/scratch/index.html) | 1,109,632 | `8556102B91DC0CF37BE4F671B6FAC2ACFA0CFD29DBD6ABEC547147CCF1136542` | แอปพลิเคชันหลักฝั่งไคลเอนต์ (สะอาด ไร้ mock data ปราศจาก `USR-ANANT-01`) |
| 8 | [`frontend/main/App.js`](file:///c:/Users/Art/.gemini/antigravity/scratch/frontend/main/App.js) | 151,862 | `CAA8715DFC2751292D523C499E4C968B3671FBA35AA869E44C9A75CC260F7E63` | คอนโทรลเลอร์กลางฝั่งไคลเอนต์ (สอดรับกับ index.html สะอาด 100%) |
| 9 | [`frontend/pages/Settings.html`](file:///c:/Users/Art/.gemini/antigravity/scratch/frontend/pages/Settings.html) | 100,193 | `DCEB621EEF75574E918508046F9955AB959D4A222933CB44CC19A21B76CDC7E8` | ส่วนติดต่อผู้ใช้หน้าศูนย์การตั้งค่าระบบ 8 หมวดหมู่ (Settings Hub) |

---

### 2. บัญชีรายการไฟล์ที่ถูกกันออกอย่างเด็ดขาด (Strict Exclusion Manifest)

ไฟล์และโฟลเดอร์ต่อไปนี้ถูกจำแนกให้เป็น **"เครื่องมือพัฒนาและการทดสอบ (Development & Test Tools)"** และ**จะต้องไม่ถูกรวมเข้าสู่การ Deploy จริงบน Production Web App หรืออัปโหลดขึ้น Google Apps Script**:

1. **โฟลเดอร์การทดสอบ (`tests/`):**
   - `tests/fixtures/*` (ไฟล์ JSON ข้อมูลสังเคราะห์: `sample_items.json`, `sample_histories.json`, `sample_requisitions.json`, `sample_users.json`, `sample_fsn.json`)
   - `tests/adapters/*` (`in_memory_repository.js`)
   - `tests/*.js` (ไฟล์ทดสอบทั้ง 8 ชุด: `regression_test_suite.js`, `p1_p2_contract_lifecycle_test.js`, `p3_miniui_critical_test.js`, `p4_settings_important_test.js`, `p6_acceptance_suite.js`, `p7_settings_comprehensive_test.js`, `p8_backend_sheets_architecture_test.js`, `p9_clean_separation_test.js`)
2. **ไฟล์โหมดสาธิต (Demo Sandbox):**
   - `demo.html` (ไฟล์สาธิตระบบแยกเดี่ยวพร้อมแบนเนอร์แจ้งเตือนและระบบสลับบทบาทในหน่วยความจำ)
   - `scripts/build_demo_html.js` (สคริปต์ประกอบไฟล์สาธิต)
3. **โฟลเดอร์ข้อเสนอเก่าและคลังประวัติศาสตร์:**
   - โฟลเดอร์ `backend/` และ `apps_script/` (ข้อเสนอสถาปัตยกรรมเก่าก่อนการชี้ขาด Root SSOT)
   - ไฟล์คลังบีบอัด: `backend.rar`, `frontend.rar`, `scratch.rar`
   - โฟลเดอร์ระบบอื่น: `student_care_system/`
4. **ไฟล์เอกสารและการรายงาน (`docs/`):**
   - ไฟล์ Markdown ทุกไฟล์ในโฟลเดอร์ `docs/`
5. **สคริปต์ช่วยการพัฒนาและทดสอบ (`scripts/`):**
   - ไฟล์สคริปต์ตัวช่วยทั้งหมดในไดเรกทอรี `scripts/`

---

### 3. รูปแบบคอนฟิกการเพิกเฉยสำหรับ Google Apps Script Deployment (`.claspignore`)

เพื่อป้องกันความผิดพลาดจากคำสั่ง `clasp push` ขอแนะนำให้ใช้คอนฟิก `.claspignore` ดังนี้:

```text
# .claspignore - Strict Production Deployment Filter
**/**
!Config.gs
!Api.gs
!Read.gs
!Write.gs
!Audit.gs
!Code.gs
!appsscript.json
!index.html
!frontend/main/App.js
!frontend/pages/Settings.html

# Explicitly exclude all testing, docs, and demo files
tests/**
scripts/**
docs/**
backups/**
backend/**
apps_script/**
student_care_system/**
*.rar
*.zip
*.csv
demo.html
*.md
```

---

### 4. การยืนยันความบริสุทธิ์ของชุดไฟล์ขึ้นระบบ (Purity Verification)

ผลการตรวจสอบโค้ดแบบ Static Analysis ยืนยันว่า:
- ในไฟล์สำหรับขึ้นระบบทั้ง 9 ไฟล์ **ไม่มีการนำเข้า (Import) หรืออ้างอิงถึง** ไฟล์ในโฟลเดอร์ `tests/fixtures/`
- **ไม่มีการฮาร์ดโค้ดอัตลักษณ์จำลอง** เช่น `USR-ANANT-01` หลงเหลืออยู่ในโค้ดจริง
- **ไม่มีการใช้ Silent Mock Fallback** ใน `ApiServiceCore`
- การเชื่อมต่อกับฐานข้อมูลที่ว่างเปล่าจะแสดงผลสภาวะว่างเปล่าอย่างแท้จริง (Genuine Empty State) โดยไม่มีการ Auto-seed ข้อมูลพัสดุตัวอย่างลงในฐานข้อมูลจริง
