# รายงานการตรวจรับรองและประเมินระบบอย่างละเอียด (Comprehensive System Audit Report)
## ระบบบริหารจัดการพัสดุโรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) — หลังรอบงาน Prompt 00–09
**บทบาทผู้ตรวจสอบ:** ผู้ตรวจประเมินระบบอิสระและวิศวกรประกันคุณภาพซอฟต์แวร์ (Independent System Auditor & Lead QA)  
**วันที่ดำเนินการตรวจ:** 28 ตุลาคม 2569 (2026-10-28)  
**รหัสเอกสาร:** `docs/POST_PROMPT09_SYSTEM_AUDIT.md`  

---

### 1. เป้าหมาย ขอบเขต และหลักเกณฑ์การตรวจสอบ (Audit Mandate & Principles)

การตรวจประเมินรอบนี้จัดทำขึ้นเพื่อตรวจสอบสภาพจริงเชิงประจักษ์ (Empirical Source & Runtime Audit) ของระบบบริหารจัดการพัสดุโรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) หลังจากการดำเนินงานใน Prompt 00 ถึง Prompt 09 ทั้งหมด โดยยึดหลักเกณฑ์ทางวิศวกรรมเคร่งครัด:

1. **ไม่เชื่อคำกล่าวอ้างโดยไม่มีหลักฐาน (Zero Assumption):** ข้อความในคอมมิทหรือเอกสาร เช่น `"completed"`, `"passed"`, `"clean"`, หรือ `"connected"` จะไม่ถูกนับเป็นผลตรวจรับ หากไม่มีซอร์สโค้ด คำสั่งทดสอบ หรือรันไทม์ที่พิสูจน์ได้รองรับ
2. **การควบคุมรุ่นเทียบประวัติศาสตร์จริง (Version & Baseline Integrity):**
   - **Historical Baseline**: `v2.6.0` (รุ่นสุดท้ายก่อน Clean File ตามการยืนยันของเจ้าของระบบ)
   - **Actual Build Version**: `2.7.0-rc.4` (ใน `Config.gs`, `index.html`, `frontend/main/App.js`)
   - **Git Base Commit**: `dd000c0077e506093b5cc316fbd77a963656eb65` (`dd000c0`) บนกิ่ง `main`
   - **ข้อห้าม**: ห้ามปลอมแปลงการ bump version หรือเปลี่ยนสถานะเป็น stable เพื่อให้รายงานดูผ่านเกณฑ์โดยพลการ
3. **การตรวจสอบแบบอ่านอย่างเดียว (Strict Read-Only Inspection):**
   - ไม่มีการแก้ไขซอร์สโค้ดจริง ไม่มีการแก้สิทธิ์ในระบบ ไม่มีการ Deploy ขึ้นเซิร์ฟเวอร์จริง
   - ไม่มีการแตะต้อง ข้อมูลลบ ล้าง หรือปิดรอบปีงบประมาณใน Google Sheets จริงของโรงเรียน
   - การทดสอบสถานะการทำงานใช้ชุดข้อมูลสังเคราะห์ (Synthetic Fixtures) และ In-Memory Adapters ที่ตัดขาดจากฐานข้อมูลจริง 100%

---

### 2. การตรวจสอบความสอดคล้องของป้ายรุ่นและค่าแฮช (Version Discrepancies & Artifact Hashes)

จากการตรวจสอบไฟล์ทั้งหมดบนดิสก์จริง พบความแตกต่างของป้ายกำกับรุ่น (Version Heterogeneity) ดังตาราง:

| ไฟล์ที่ตรวจสอบ | ป้ายรุ่นที่ปรากฏในไฟล์ | สถานะความสอดคล้อง | บันทึกเชิงเทคนิคของผู้ตรวจ |
|---|:---:|:---:|---|
| [`Config.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Config.gs) | `CONFIG.VERSION = '2.7.0-rc.4'` | **Canonical** | ป้ายรุ่นมาตรฐานของระบบแบ็กเอนด์ (L.11) |
| [`index.html`](file:///c:/Users/Art/.gemini/antigravity/scratch/index.html) | `v2.7.0-rc.4` | **ตรงกัน** | แสดงบน Title และ Header UI คอนโซล |
| [`frontend/main/App.js`](file:///c:/Users/Art/.gemini/antigravity/scratch/frontend/main/App.js) | `v2.7.0-rc.4` | **ตรงกัน** | ระบุใน Docblock Header |
| [`frontend/pages/Settings.html`](file:///c:/Users/Art/.gemini/antigravity/scratch/frontend/pages/Settings.html) | `v2.7.0-rc.1` | **DISCREPANCY (DEF-01)** | ป้าย Badge ใน Header ของหน้า Settings ยังค้างอยู่ที่ `rc.1` |
| [`Api.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Api.gs) | `v2.6.0` | **DISCREPANCY (DEF-01)** | Docblock ด้านบนยังระบุรุ่นอิง Baseline `v2.6.0` |
| [`Read.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Read.gs) | `v2.6.0` | **DISCREPANCY (DEF-01)** | Docblock ด้านบนยังระบุรุ่นอิง Baseline `v2.6.0` |
| [`Write.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs) | `v2.6.0` | **DISCREPANCY (DEF-01)** | Docblock ด้านบนยังระบุรุ่นอิง Baseline `v2.6.0` |
| [`Audit.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Audit.gs) | `v2.6.0` | **DISCREPANCY (DEF-01)** | Docblock ด้านบนยังระบุรุ่นอิง Baseline `v2.6.0` |
| [`README.md`](file:///c:/Users/Art/.gemini/antigravity/scratch/README.md) | `v2.6.0` | **DISCREPANCY (DEF-01)** | เอกสารแนะนำโครงการยังไม่อัปเดตตามรอบงาน v2.7.0 |

#### ค่าแฮชตรวจสอบความสมบูรณ์ SHA-256 ของชุดไฟล์ขึ้นระบบจริง (Deployable File Set):

1. `Config.gs`: `986B1E1F75976C22F30246053EC7A0967211A16E635853C5F829492E7EF8D6E0` (18,203 ไบต์)
2. `Api.gs`: `E1DBDB76E8B60A7D8FA07C61229C06698D9FF31687CB25D03D19DB6348145B6D` (32,194 ไบต์)
3. `Read.gs`: `3115319C06998F8B432418F93EDA41E8B1DCD0F35576211099C161A655E6E182` (65,360 ไบต์)
4. `Write.gs`: `B665E4A098E270D782457E675D49515030D8979E61055CE38EC7C05BBF74A8C8` (83,961 ไบต์)
5. `Audit.gs`: `60993701BFC345AFA4D7D2F09FFCD15561BFE075ADD6C84B3ADFA8132C7609CA` (15,991 ไบต์)
6. `Code.gs`: `6134B3EA35E35F438146CA659A705B3019FCE67D95FBC8B7549942B7B890D53D` (12,509 ไบต์)
7. `index.html`: `8556102B91DC0CF37BE4F671B6FAC2ACFA0CFD29DBD6ABEC547147CCF1136542` (1,109,632 ไบต์)
8. `frontend/main/App.js`: `CAA8715DFC2751292D523C499E4C968B3671FBA35AA869E44C9A75CC260F7E63` (151,862 ไบต์)
9. `frontend/pages/Settings.html`: `DCEB621EEF75574E918508046F9955AB959D4A222933CB44CC19A21B76CDC7E8` (100,193 ไบต์)

---

### 3. สรุปผลการตรวจสอบแยกตามชั้นการทดสอบ (Multi-Layer Verification Summary)

| ลำดับชั้นการทดสอบ (Verification Layer) | เครื่องมือ/สภาพแวดล้อมที่ใช้ | จำนวนที่ตรวจ | ผลลัพธ์ | บันทึกข้อจำกัด |
|---|---|:---:|:---:|---|
| **1. Source Inspection & Static Analysis** | Node.js Script / Regex / AST check | 10 รายการ | **PASS (10/10)** | ไม่พบ mock data, `USR-ANANT-01`, หรือสูตรอันตรายใน live bundle |
| **2. Automated Unit & Architectural Tests** | Node.js Test Runner (8 Suites) | 82 รายการ | **PASS (82/82)** | ผ่านเกณฑ์ตรรกะทางธุรกิจ, Concurrency Mutex, และ State Machine 100% |
| **3. Mocked Integration Tests** | `tests/adapters/in_memory_repository.js` | 10 รายการ | **PASS (10/10)** | จำลองการทำงานคลังพัสดุและใบเบิกบน RAM ผ่านฉลุย |
| **4. Live Apps Script & Sheets Integration** | Google Cloud / Google Workspace Domain | 8 รายการ | **BLOCKED** | ขาดข้อมูลประจำตัวจริง (Live Credentials) และสิทธิ์การเข้าถึงสเปรดชีตจริง |
| **5. Browser QA (Responsive Layout)** | Headless & DOM Breakpoint Emulation | 4 วิวพอร์ต | **PASS (4/4)** | แสดงผลได้ถูกต้องบน 375px, 768px, 1024px, 1440px ไม่มี Horizontal Scroll |
| **6. Real Mobile Hardware & Camera QA** | อุปกรณ์มือถือจริง (iOS / Android) | 2 การทดสอบ | **NOT RUN** | ไม่มีอุปกรณ์โทรศัพท์มือถือและกล้องสแกนจริงในสภาพแวดล้อม Headless Sandbox |
| **7. Human User Acceptance Testing (UAT)** | ผู้บริหาร ครู และเจ้าหน้าที่จริงของโรงเรียน | 5 กรณีศึกษา | **BLOCKED** | อยู่ระหว่างรอการขึ้นระบบ Staging Pilot หลังได้รับข้อมูลประจำตัวจริง |

---

### 4. สรุปรายการข้อค้นพบและความเสี่ยง (Audit Defect Summary)

ผู้ตรวจประเมินได้บันทึกข้อบกพร่องและข้อค้นพบทางเทคนิคจำนวน 6 รายการ (DEF-01 ถึง DEF-06) ลงใน [`docs/POST_PROMPT09_DEFECT_REGISTER.md`](file:///c:/Users/Art/.gemini/antigravity/scratch/docs/POST_PROMPT09_DEFECT_REGISTER.md) โดยจัดลำดับความสำคัญตามผลกระทบต่อความปลอดภัยและข้อมูลดังนี้:

1. **DEF-02 (Severity: MEDIUM - Security Hazard):** โค้ดใน `Api.gs` (L.255–272) มีการ Fallback สิทธิ์เป็น `ADMIN` อัตโนมัติ (`USR-DEV-01`) หากมีการตั้งค่า `DEV_MODE = 'true'` ใน ScriptProperties หากนำไปเปิดบน Production อาจเป็นช่องโหว่ความปลอดภัย
2. **DEF-03 (Severity: MEDIUM - Quota & Performance):** ฟังก์ชัน `verifyGoogleIdToken` ใน `Api.gs` เรียก `UrlFetchApp` ไปยัง `oauth2.googleapis.com/tokeninfo` ทุกครั้งโดยไม่มีการทำแคชโทเค็น อาจทำให้โควตา URL Fetch ประจำวันของ Google Apps Script เต็มได้เมื่อมีการเรียกใช้งานหนาแน่น
3. **DEF-04 (Severity: MEDIUM - Deployment Confusion):** มีโฟลเดอร์ข้อเสนอเก่าที่ยังไม่ได้ใช้งานตกค้างใน Workspace (`backend/`, `apps_script/`, และไฟล์ `.rar`) ซึ่งอาจทำให้นักพัฒนาใหม่สับสนและ Deploy ไฟล์ผิดชุด
4. **DEF-01 (Severity: LOW - Version Label Inconsistency):** ป้ายกำกับรุ่นใน `frontend/pages/Settings.html` ยังค้างอยู่ที่ `v2.7.0-rc.1` และหัวข้อ docblock ใน `Api.gs`, `Read.gs`, `Write.gs`, `Audit.gs` ยังระบุ `v2.6.0`
5. **DEF-05 (Severity: LOW - Environmental Limitation):** การทดสอบการสแกนกล้อง QR บนมือถือจริงยังเป็น `NOT RUN` เนื่องจากไม่มีอุปกรณ์ฮาร์ดแวร์จริงในเครื่องทดสอบ
6. **DEF-06 (Severity: LOW - Operational Blocker):** การเชื่อมต่อกับฐานข้อมูล Google Sheets และระบบสมาชิกโดเมนจริงยังเป็น `BLOCKED` จนกว่าจะได้รับสิทธิ์ Production OAuth

---

### 5. ข้อเสนอแนะและลำดับความสำคัญถัดไป (Top 3 Recommendations)

1. **ด้านความปลอดภัยและคอนฟิก (Code Remediation):**
   - ลบหรือปิดกั้นการ Fallback `DEV_MODE` ใน `Api.gs` สำหรับ Production Build
   - เพิ่มระบบแคชโทเค็นยืนยันตัวตนใน `CacheService` 5-10 นาทีเพื่อประหยัดโควตา `UrlFetchApp`
   - ปรับป้ายกำกับรุ่นใน `Settings.html` และ docblock ให้ตรงกับ `2.7.0-rc.4`
2. **ด้านการทดสอบรันไทม์จริง (Runtime Testing):**
   - จัดเตรียม Staging Spreadsheet และบริการบัญชี Google Workspace ทดสอบเพื่อปลดล็อกสถานะ `BLOCKED` ในการทดสอบ Live Integration
3. **ด้านการตรวจรับผู้ใช้งาน (User UAT & Pilot):**
   - นำไฟล์ `demo.html` หรือ Staging Deployment ให้เจ้าหน้าที่พัสดุและผู้อำนวยการทดลองใช้งานและตรวจรับ (UAT Sign-off) ก่อนพิจารณาขึ้น Production
