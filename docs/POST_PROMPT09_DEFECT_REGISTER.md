# ทะเบียนข้อบกพร่องและข้อค้นพบทางเทคนิค (Comprehensive Defect & Finding Register)
## ระบบบริหารจัดการพัสดุโรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) — หลังรอบงาน Prompt 00–09
**บทบาทผู้ตรวจสอบ:** ผู้ตรวจประเมินระบบอิสระและวิศวกรประกันคุณภาพซอฟต์แวร์ (Independent System Auditor & Lead QA)  
**รหัสเอกสาร:** `docs/POST_PROMPT09_DEFECT_REGISTER.md`  
**สถานะการควบคุมรุ่น:** `2.7.0-rc.4` | Git Commit: `dd000c0`  

---

### 1. ตารางสรุปทะเบียนข้อค้นพบ (Defect Register Summary)

| รหัสข้อค้นพบ | ระดับความรุนแรง | หัวข้อข้อค้นพบ | โมดูลที่ได้รับผลกระทบ | ผลกระทบต่อระบบ | สถานะปัจจุบัน |
|:---:|:---:|---|---|---|:---:|
| **DEF-01** | 🟡 LOW | ป้ายกำกับรุ่นไม่สอดคล้องกันข้ามไฟล์ (`Settings.html` แสดง `rc.1`, `*.gs` แสดง `v2.6.0`) | Frontend Settings / Backend Docblocks | ความสับสนในการตรวจสอบและจัดเก็บประวัติรุ่น | **OPEN** |
| **DEF-02** | 🟠 MEDIUM | กลไก Fallback สิทธิ์ Admin อัตโนมัติใน `Api.gs` เมื่อเปิด `DEV_MODE` | Backend Authentication (`Api.gs`) | หากเปิดทิ้งไว้บน Production จะเป็นช่องโหว่ความปลอดภัย | **OPEN** |
| **DEF-03** | 🟠 MEDIUM | การยืนยัน ID Token ด้วย `UrlFetchApp` ไม่มีระบบแคช เสี่ยงโควตาเต็ม | Authentication / Performance (`Api.gs`) | อาจสิ้นเปลืองโควตา URL Fetch รายวันของ Google Apps Script | **OPEN** |
| **DEF-04** | 🟠 MEDIUM | โฟลเดอร์ข้อเสนอเก่าและไฟล์คลังบีบอัดตกค้างใน Workspace เสี่ยงดีพลอยผิด | Workspace File Structure | อาจทำให้นักพัฒนา Deploy ไฟล์ทับซ้อนกับ Single SSOT Writer | **OPEN** |
| **DEF-05** | 🟡 LOW | การสแกนกล้อง QR บนอุปกรณ์มือถือจริงยังไม่ได้รับการทดสอบ (NOT RUN) | MiniUI QR Scanner | ขาดการยืนยันการทำงานของเลนส์กล้องมือถือจริงในสภาพแสงน้อย | **OPEN** |
| **DEF-06** | 🔴 HIGH | การเชื่อมต่อกับฐานข้อมูล Google Sheets และระบบสมาชิกโดเมนจริงถูกระงับ (BLOCKED) | Live Deployment / Production Gate | ระบบยังไม่สามารถเปิดให้บริการใช้งานจริงแก่บุคลากรได้ | **BLOCKED** |

---

### 2. รายละเอียดข้อค้นพบเชิงลึก (Detailed Defect Specifications)

---

#### 📌 [DEF-01] ป้ายกำกับรุ่นไม่สอดคล้องกันข้ามไฟล์ในชุดซอร์สโค้ด
- **ระดับความรุนแรง:** `LOW (Documentation & Visual Consistency)`
- **โมดูลที่ได้รับผลกระทบ:** [`frontend/pages/Settings.html`](file:///c:/Users/Art/.gemini/antigravity/scratch/frontend/pages/Settings.html), [`Api.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Api.gs), [`Read.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Read.gs), [`Write.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs), [`Audit.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Audit.gs), [`README.md`](file:///c:/Users/Art/.gemini/antigravity/scratch/README.md)
- **ขั้นตอนการทำซ้ำ (Reproduction Steps):**
  1. ค้นหาข้อความระบุเวอร์ชันใน `frontend/pages/Settings.html`:
     ```bash
     grep -n "rc\." frontend/pages/Settings.html
     ```
  2. สังเกตพบป้ายแสดงผลระบุ `v2.7.0-rc.1`
  3. ตรวจสอบหัวข้อ docblock ใน `Api.gs`, `Read.gs`, `Write.gs`, `Audit.gs` สังเกตพบข้อความ `HRT Inventory System v2.6.0`
- **พฤติกรรมที่คาดหวัง (Expected):**
  ไฟล์ทั้งหมดในชุด Deployable Artifacts ควรอ้างอิงป้ายกำกับรุ่นมาตรฐาน `2.7.0-rc.4` ให้สอดคล้องกันทุกจุด
- **พฤติกรรมที่สังเกตพบจริง (Observed):**
  `Config.gs`, `index.html`, และ `App.js` ระบุ `2.7.0-rc.4` แต่ `Settings.html` ยังค้างอยู่ที่ `rc.1` และไฟล์ `*.gs` docblocks ยังค้างอยู่ที่ `v2.6.0`
- **สาเหตุที่แท้จริง (Root Cause):**
  การปรับปรุงรอบ Prompt 07 ถึง Prompt 09 มีการปรับแก้ตัวแปรคอนฟิกหลัก แต่ไม่ได้ทำการค้นหาและอัปเดตสตริงเทมเพลตในหน้าย่อยและคอมเมนต์หัวไฟล์
- **ข้อเสนอแนะในการแก้ไข (Remediation):**
  ปรับปรุงข้อความ badge ใน `Settings.html` ให้ดึงจาก `CONFIG.VERSION` แบบไดนามิก หรือแทนที่ด้วยสตริง `v2.7.0-rc.4` และอัปเดต docblocks ใน `*.gs`
- **เกณฑ์การตรวจซ้ำเพื่อปิดข้อค้นพบ (Retest Criteria):**
  รันสคริปต์สแกนเวอร์ชันแล้วพบว่าทุกไฟล์ระบุตรงกันเป็น `2.7.0-rc.4` โดยไม่มีป้ายรุ่นเก่าตกค้าง

---

#### 📌 [DEF-02] กลไก Fallback สิทธิ์ Admin อัตโนมัติใน `Api.gs` เมื่อเปิด `DEV_MODE`
- **ระดับความรุนแรง:** `MEDIUM (Security Hazard in Production)`
- **โมดูลที่ได้รับผลกระทบ:** [`Api.gs:resolveAuthenticatedUser:L255-L272`](file:///c:/Users/Art/.gemini/antigravity/scratch/Api.gs#L255-L272)
- **ขั้นตอนการทำซ้ำ (Reproduction Steps):**
  1. ตรวจสอบโค้ดใน `Api.gs` บรรทัดที่ 256–272:
     ```javascript
     const isMockEnv = !email && (
       (typeof PropertiesService !== 'undefined' && PropertiesService.getScriptProperties().getProperty('DEV_MODE') === 'true') ||
       (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test')
     );
     if (!email && isMockEnv) {
       return { id: 'USR-DEV-01', role: 'ADMIN', ... };
     }
     ```
  2. หากผู้ดูแลระบบเผลอตั้งค่า `DEV_MODE = true` ใน Script Properties ของ Apps Script บน Production
  3. ผู้ใช้ภายนอกทุกคนที่ไม่ระบุตัวตนจะได้รับการสถาปนาเป็น `ADMIN` ทันที
- **พฤติกรรมที่คาดหวัง (Expected):**
  บน Production Web App ระบบจะต้องไม่ยอมรับการเปิด `DEV_MODE` และต้องบังคับใช้ Fail-Closed ปฏิเสธคำขอที่ไม่มียืนยันตัวตนเสมอ
- **พฤติกรรมที่สังเกตพบจริง (Observed):**
  โค้ดยังคงมีช่องทางจำลองผู้ใช้ `USR-DEV-01` เป็น `ADMIN` หากตัวแปร `DEV_MODE` ถูกตั้งค่าเป็นจริง
- **สาเหตุที่แท้จริง (Root Cause):**
  การคงสภาพ Mock Helper สำหรับนักพัฒนาไว้ในซอร์สโค้ดหลักเพื่อความสะดวกในการทดสอบฟังก์ชันฝั่งเซิร์ฟเวอร์
- **ข้อเสนอแนะในการแก้ไข (Remediation):**
  1. เพิ่มเงื่อนไขตรวจสอบว่าต้องไม่ใช่ Production Deployment หรือ
  2. แยกโค้ด Dev Mock ออกไปไว้ในไฟล์ทดสอบเฉพาะสำหรับ Node.js (`tests/`) โดยไม่รวมไว้ในไฟล์ขึ้นระบบจริง (`Api.gs`)
- **เกณฑ์การตรวจซ้ำเพื่อปิดข้อค้นพบ (Retest Criteria):**
  แม้จะตั้งค่า `DEV_MODE = true` บน Apps Script คำขอที่ไม่มีอีเมลผู้ใช้จริงต้องถูก Reject ด้วย `UNAUTHORIZED` 100%

---

#### 📌 [DEF-03] การยืนยัน ID Token ด้วย `UrlFetchApp` ไม่มีระบบแคช เสี่ยงโควตาเต็ม
- **ระดับความรุนแรง:** `MEDIUM (Platform Quota & Performance Limitation)`
- **โมดูลที่ได้รับผลกระทบ:** [`Api.gs:verifyGoogleIdToken:L355-L385`](file:///c:/Users/Art/.gemini/antigravity/scratch/Api.gs#L355-L385)
- **ขั้นตอนการทำซ้ำ (Reproduction Steps):**
  1. ส่งคำขอ API ที่แนบ `id_token` เข้ามายัง `routeRequest` จำนวน 50 คำขอติดต่อกัน
  2. ฟังก์ชัน `verifyGoogleIdToken` จะเรียก `UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?...')` ครบทั้ง 50 ครั้ง
- **พฤติกรรมที่คาดหวัง (Expected):**
  โทเค็นเดิมที่เคยผ่านการตรวจสอบความถูกต้องแล้วและยังไม่หมดอายุ (Valid JWT) ควรถูกแคชไว้ใน `CacheService` ชั่วคราว (เช่น 5 นาที) เพื่อลดการเรียกเครือข่ายภายนอก
- **พฤติกรรมที่สังเกตพบจริง (Observed):**
  มีการส่ง HTTP Request ออกไปยัง Google OAuth endpoint ทุกครั้งที่มีคำขอเข้ามา
- **สาเหตุที่แท้จริง (Root Cause):**
  ขาดชั้นการทำ Token Verification Caching ใน `Api.gs`
- **ข้อเสนอแนะในการแก้ไข (Remediation):**
  สร้างฟังก์ชันแคชโดยนำ SHA-256 ของ `id_token` มาเป็นคีย์ และบันทึกผลการตรวจสอบลงใน `CacheService.getScriptCache()` กำหนดเวลาหมดอายุ 300 วินาที
- **เกณฑ์การตรวจซ้ำเพื่อปิดข้อค้นพบ (Retest Criteria):**
  การเรียกคำขอด้วยโทเค็นเดิมซ้ำหลายครั้งต้องใช้เวลาต่ำกว่า 10ms และไม่เพิ่มจำนวน URL Fetch Call

---

#### 📌 [DEF-04] โฟลเดอร์ข้อเสนอเก่าและไฟล์คลังบีบอัดตกค้างใน Workspace เสี่ยงดีพลอยผิด
- **ระดับความรุนแรง:** `MEDIUM (Deployment Hazard & Workspace Purity)`
- **โมดูลที่ได้รับผลกระทบ:** โฟลเดอร์ `backend/`, `apps_script/`, `student_care_system/`, และไฟล์ `backend.rar`, `frontend.rar`, `scratch.rar`
- **ขั้นตอนการทำซ้ำ (Reproduction Steps):**
  1. ตรวจสอบรายการไฟล์ในไดเรกทอรีราก (Root Directory):
     ```bash
     git status --short
     ```
  2. พบไฟล์และโฟลเดอร์ที่ไม่ถูกติดตาม (Untracked) ตกค้างอยู่เป็นจำนวนมาก
  3. หากผู้ดูแลใช้คำสั่ง `clasp push` โดยไม่กำหนดไฟล์ `.claspignore` อาจทำให้ไฟล์ใน `backend/` หรือ `apps_script/` ถูกอัปโหลดไปทับ Root `*.gs`
- **พฤติกรรมที่คาดหวัง (Expected):**
  ไดเรกทอรีโครงการควรมีความสะอาด โดยไฟล์ข้อเสนอเดิมควรถูกย้ายไปเก็บในโฟลเดอร์คลังประวัติศาสตร์ (เช่น `archive/`) และระบุการยกเว้นใน `.claspignore` อย่างชัดเจน
- **พฤติกรรมที่สังเกตพบจริง (Observed):**
  โฟลเดอร์ข้อเสนอเก่ายังคงวางอยู่ที่รูทของเวิร์กสเปซ
- **สาเหตุที่แท้จริง (Root Cause):**
  การทดลองสร้างโครงสร้างโฟลเดอร์ในรอบ Prompt ก่อนหน้าโดยยังไม่ได้ทำความสะอาดพื้นที่ทำงาน
- **ข้อเสนอแนะในการแก้ไข (Remediation):**
  ย้ายโฟลเดอร์ที่ไม่เกี่ยวข้องออกจากรูท หรือสร้างไฟล์ `.claspignore` เพื่อระบุขอบเขตการดีพลอยเฉพาะ 9 ไฟล์มาตรฐานอย่างรัดกุม
- **เกณฑ์การตรวจซ้ำเพื่อปิดข้อค้นพบ (Retest Criteria):**
  การตรวจสอบ Deployment File Set ต้องไม่มีการดึงไฟล์จาก `backend/` หรือ `apps_script/` ไปใช้งาน

---

#### 📌 [DEF-05] การสแกนกล้อง QR บนอุปกรณ์มือถือจริงยังไม่ได้รับการทดสอบ (NOT RUN)
- **ระดับความรุนแรง:** `LOW (Environmental Hardware Limitation)`
- **โมดูลที่ได้รับผลกระทบ:** ฟังก์ชันการเปิดกล้องสแกน QR Code บน MiniUI
- **ขั้นตอนการทำซ้ำ (Reproduction Steps):**
  1. ตรวจสอบการทดสอบในสภาพแวดล้อม Headless Node.js / CLI
  2. ไม่มีอุปกรณ์โทรศัพท์มือถือ iPhone หรือ Android เชื่อมต่ออยู่
- **พฤติกรรมที่คาดหวัง (Expected):**
  การทดสอบความสามารถในการเข้าถึง `navigator.mediaDevices.getUserMedia()` และการสแกน QR Code จากป้ายครุภัณฑ์จริงในที่แสงน้อย
- **พฤติกรรมที่สังเกตพบจริง (Observed):**
  ทดสอบได้เฉพาะการจำลองการถอดรหัสสตริง (String Decode Simulation) และ Responsive Breakpoints (375px) บนเบราว์เซอร์จำลอง
- **สาเหตุที่แท้จริง (Root Cause):**
  ข้อจำกัดของสภาพแวดล้อมทดสอบการพัฒนา (Development Sandbox Environment) ที่ไม่มีกล้องมือถือจริง
- **ข้อเสนอแนะในการแก้ไข (Remediation):**
  บรรจุการทดสอบกล้องสแกนจริงไว้ในแผนการตรวจรับของผู้ใช้งาน (UAT Plan) บนโทรศัพท์มือถือของครูผู้ทดสอบจริง
- **เกณฑ์การตรวจซ้ำเพื่อปิดข้อค้นพบ (Retest Criteria):**
  ทำการสแกน QR Code พัสดุผ่านกล้องมือถือจริงสำเร็จและนำทางไปยังหน้าขอเบิกได้อย่างถูกต้อง

---

#### 📌 [DEF-06] การเชื่อมต่อกับฐานข้อมูล Google Sheets และระบบสมาชิกโดเมนจริงถูกระงับ (BLOCKED)
- **ระดับความรุนแรง:** `HIGH (Operational Deployment Blocker)`
- **โมดูลที่ได้รับผลกระทบ:** Production Web App Gateway & Google Workspace Domain Auth
- **ขั้นตอนการทำซ้ำ (Reproduction Steps):**
  1. ตรวจสอบการตั้งค่าใน `Config.gs`:
     - `SPREADSHEET_ID`: ยังไม่มีการผูกกับสเปรดชีตจริงของโรงเรียน
     - `GOOGLE_CLIENT_ID`: ยังไม่มีการผูกกับ OAuth Client ID ของโรงเรียน
  2. พยายามเรียกฟังก์ชันที่ต้องเข้าถึงสเปรดชีตจริง
- **พฤติกรรมที่คาดหวัง (Expected):**
  ระบบเชื่อมต่อกับสเปรดชีต 16 แผ่นงานจริงของโรงเรียน และผู้ใช้งานสามารถเข้าสู่ระบบผ่านบัญชีอีเมลโดเมน `@hrt.ac.th`
- **พฤติกรรมที่สังเกตพบจริง (Observed):**
  ระบบทำงานได้เฉพาะในสภาพแวดล้อมจำลอง (In-Memory Sandbox / Demo Mode) การเชื่อมต่อจริงถูกระงับ (`BLOCKED`) ตามข้อกำหนด P0
- **สาเหตุที่แท้จริง (Root Cause):**
  ยังไม่ได้รับมอบสิทธิ์ผู้ดูแลระบบ (Google Workspace Admin Access) และข้อมูลสเปรดชีตจริงจากโรงเรียน
- **ข้อเสนอแนะในการแก้ไข (Remediation):**
  ประสานงานกับผู้ดูแลระบบสารสนเทศของโรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) เพื่อ:
  1. สร้างสเปรดชีต 16 แผ่นงานตามสคีมามาตรฐาน
  2. ตั้งค่า Script Properties (`SPREADSHEET_ID`, `GOOGLE_CLIENT_ID`)
  3. ทำการทดสอบบนสภาพแวดล้อม Staging ก่อนขึ้น Production
- **เกณฑ์การตรวจซ้ำเพื่อปิดข้อค้นพบ (Retest Criteria):**
  สามารถล็อกอินด้วยอีเมล `@hrt.ac.th` จริง อ่านข้อมูลพัสดุ และบันทึกคำขอเบิกลงชีตจริงได้สำเร็จ
