# คำตัดสินความพร้อมในการใช้งานและขึ้นระบบ (System Readiness Decision)
## ระบบบริหารจัดการพัสดุโรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) — หลังรอบงาน Prompt 00–09
**บทบาทผู้ตรวจสอบ:** ผู้ตรวจประเมินระบบอิสระและวิศวกรประกันคุณภาพซอฟต์แวร์ (Independent System Auditor & Lead QA)  
**รหัสเอกสาร:** `docs/POST_PROMPT09_READINESS_DECISION.md`  
**สถานะการควบคุมรุ่น:** `2.7.0-rc.4` | Git Commit: `dd000c0`  

---

### 1. คำตัดสินความพร้อมแยกตามระดับ (Tiered Readiness Verdicts)

| ลำดับชั้นการประเมิน (Readiness Tier) | คำตัดสินอย่างเป็นทางการ (Official Verdict) | เกณฑ์และหลักฐานเชิงประจักษ์ (Criteria & Evidence) |
|---|:---:|---|
| **1. การรับรองชุดบิลด์สะอาด (Clean Build Verification)** | **`CLEAN_BUILD_VERIFIED`** | ชุดไฟล์สำหรับขึ้นระบบ 9 ไฟล์หลักได้รับการชำระล้าง ปราศจาก mock data ฝังในตัว ไม่มี fallback `USR-ANANT-01`, ไม่มี Silent Mock Fallback, มีค่าแฮช SHA-256 ยืนยันบนดิสก์จริง และไฟล์ทดสอบถูกกันออกนอกขอบเขตการดีพลอย 100% |
| **2. การทดสอบตรรกะในเครื่อง (Local Unit & Architectural Tests)** | **`LOCAL_TESTS_PASSED`** | ผ่านการทดสอบอัตโนมัติครบทั้ง 8 ชุด รวม 82 กรณีทดสอบ (82/82 PASS — 100.0%) ครอบคลุม RBAC, ตัวกรอง 8 มิติ, ABC Pareto, วงจรชีวิตใบเบิก, Decoupled Stock Deduction, Mutex Lock, Idempotency Cache, และสคีมา 16 แผ่นงาน |
| **3. การทดสอบการเชื่อมต่อเซิร์ฟเวอร์จริง (Staging Integration)** | **`STAGING_INTEGRATION_BLOCKED`** | ระงับการทดสอบเนื่องจากขาดการตั้งค่า `SPREADSHEET_ID` จริง, ขาดบัญชี Google Workspace Domain (`@hrt.ac.th`) และ OAuth Secrets ของสถานศึกษา (ตามข้อกำหนดความปลอดภัย P0) |
| **4. ความพร้อมสำหรับเปิดทดสอบนำร่อง (Pilot Readiness)** | **`PILOT_NOT_READY`** | **ยังไม่พร้อมสำหรับเปิด Pilot แก่ครูและผู้บริหารจริง** จนกว่าจะดำเนินการติดตั้งบน Staging Disposable Spreadsheet และทำการทดสอบ Live Domain Authentication และ Token Cache ผ่านเกณฑ์เรียบร้อยก่อน |
| **5. การปล่อยขึ้นระบบใช้งานจริง (Production Release)** | **`NOT_PERFORMED`** | **ไม่มีการขึ้นระบบ Production ในรอบการตรวจประเมินนี้** (การตรวจประเมินทำในโหมด Read-Only ตามข้อกำหนดเคร่งครัด) |

---

### 2. สรุปตัวเลขผลการประเมินเชิงปริมาณ (Quantitative Assessment Breakdown)

เพื่อความโปร่งใสและปฏิบัติตามมาตรฐานการตรวจสอบโดยไม่ใช้การถ่วงน้ำหนักเปอร์เซ็นต์ที่ไม่มีนิยามรองรับ ตัวเลขผลการประเมินทั้งหมดจำแนกตามรายการตรวจสอบจริง (Total Evaluated Items: 111 รายการ):

```text
========================================================================================
TOTAL EVALUATED ITEMS (DENOMINATOR) : 111 รายการ
----------------------------------------------------------------------------------------
- PASS (ผ่านเกณฑ์การทดสอบพร้อมหลักฐาน)         :  96 รายการ (86.49%)
  • Automated Unit & Logic Scenarios         :  82 รายการ
  • Mocked Integration Adapter Scenarios     :  10 รายการ
  • Browser Responsive Viewport Scenarios    :   4 รายการ
- FAIL (พบข้อผิดพลาดหรือทำงานขัดสเปก)         :   0 รายการ ( 0.00%)
- BLOCKED (ขาด Credentials/Domain สภาพแวดล้อมจริง) :  13 รายการ (11.71%)
  • Live Apps Script + Sheets RPC Calls      :   8 รายการ
  • Human User Acceptance Scenarios (UAT)    :   5 รายการ
- NOT RUN (ยังไม่ได้ทดสอบบนฮาร์ดแวร์มือถือจริง)   :   2 รายการ ( 1.80%)
  • Physical Mobile Camera Scanning          :   2 รายการ
- N/A (ไม่อยู่ในขอบเขตการตรวจสอบ)             :   0 รายการ ( 0.00%)
========================================================================================
```

---

### 3. เหตุผลชี้ขาดที่ไม่รับรองสถานะ Production-Ready (Non-Production Justification)

ตามระเบียบการตรวจสอบระบบสารสนเทศระดับสถาบัน การจะประกาศรับรองสถานะ **`PRODUCTION_READY`** ได้นั้น ทุกมิติสำคัญจะต้องได้รับการยืนยันอย่างสมบูรณ์ สำหรับระบบนี้ยังคงมีข้อจำกัดและเงื่อนไขตกค้าง 4 ประการ:

1. **ขาดการทดสอบ Live Domain Authentication:** ระบบยังไม่เคยถูกทดสอบเชื่อมต่อจริงกับบัญชีผู้ใช้ในโดเมน `@hrt.ac.th` ภายใต้โหมด `access: "DOMAIN"` และ `executeAs: "USER_DEPLOYING"`
2. **ความเสี่ยงของช่องทาง Dev Mode (`DEF-02`):** ยังคงมีโค้ด Fallback เป็นสิทธิ์ `ADMIN` อัตโนมัติใน `Api.gs` บรรทัดที่ 255–272 หากมีการเผลอเปิด `DEV_MODE = true` ใน Script Properties
3. **ความเสี่ยงต่อโควตา URL Fetch (`DEF-03`):** การยืนยัน Google ID Token ยังไม่มีการแคชผลใน `CacheService` อาจกระทบต่อความเสถียรเมื่อมีผู้ใช้งานพร้อมกันจำนวนมาก
4. **ยังไม่ผ่านการตรวจรับจากผู้ใช้งานจริง (Human UAT):** ครูผู้ขอเบิก เจ้าหน้าที่พัสดุ และผู้อำนวยการโรงเรียนยังไม่ได้ร่วมทดสอบการใช้งานจริงในสภาพแวดล้อมนำร่อง (Staging Pilot)

---

### 4. เกณฑ์การปลดล็อกเพื่อก้าวสู่ Pilot และ Production (Exit Gate Criteria)

ระบบจะสามารถเลื่อนสถานะเป็น **`PILOT_READY`** และพิจารณาขึ้น Production ได้ เมื่อผ่านเกณฑ์ครบถ้วน 5 ข้อดังต่อไปนี้:

1. [ ] **Remediation DEF-02**: ตัดโค้ด Fallback `isMockEnv` ออกจาก `Api.gs` ในชุด Production Build
2. [ ] **Remediation DEF-03**: เพิ่มระบบแคช ID Token ใน `CacheService` (TTL 300 วินาที)
3. [ ] **Remediation DEF-01**: ปรับป้ายรุ่นใน `Settings.html` และ docblocks ให้ตรงกับ `2.7.0-rc.4`
4. [ ] **Staging Verification**: ติดตั้งชุดไฟล์ 9 ไฟล์ลงใน Staging Google Apps Script ที่เชื่อมต่อกับ Disposable Spreadsheet 16 ชีต และทดสอบยืนยันตัวตนด้วยบัญชีโดเมนจริงสำเร็จ
5. [ ] **UAT Sign-off**: เจ้าหน้าที่พัสดุและผู้อำนวยการโรงเรียนลงนามรับรองผลการทดสอบใบเบิกและการออกรายงาน แบบ พ.ด. บน Staging
