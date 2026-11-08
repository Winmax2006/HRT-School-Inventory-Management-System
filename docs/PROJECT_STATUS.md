# สถานะโครงการและความพร้อมทางวิศวกรรม (Project Status & Engineering Health)
**ระบบบริหารคลังพัสดุ โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)**  
**เวอร์ชันปัจจุบัน:** `v2.7.0-rc.6`  
**วันที่ตรวจสอบ:** 8 พฤศจิกายน 2569  
**โหมดการตรวจสอบ:** READ-ONLY Source Verification

---

## 1. การจำแนกสถานะตามข้อเท็จจริงเชิงประจักษ์

เพื่อความโปร่งใสและถูกต้องตามหลักวิศวกรรมซอฟต์แวร์ จำแนกสถานะของระบบออกเป็น 3 ระดับ:

| ด้าน | สถานะ | หลักฐานเชิงประจักษ์ |
|---|:---:|---|
| **การเชื่อมต่อ GitHub** | **เชื่อมต่อแล้ว** | Local Git Repository มี `remote.origin.url` ชี้ไปยัง `https://github.com/Winmax2006/HRT-School-Inventory-Management-System.git` |
| **การซิงก์ Source ขึ้น GitHub** | **ซิงก์แล้ว (Synced)** | Push ขึ้น branch main ที่ `https://github.com/Winmax2006/HRT-School-Inventory-Management-System.git` เรียบร้อยแล้ว พร้อมระบบ CI Quality Gate |
| **การ Deploy บน Apps Script** | **ยังไม่ Deploy (NOT VERIFIED)** | ไม่พบไฟล์ `.clasp.json`, ไม่พบ Script ID และยังไม่มีการผูกอัตโนมัติกับ Google Apps Script Web App |

---

## 2. ผลการตรวจสอบประเด็นความมั่นคงปลอดภัยและตรรกะระบบ (Audit Findings)

จากการตรวจสอบ Source Code ปัจจุบัน พบข้อบกพร่องที่ต้องแก้ไขก่อนการใช้งานจริง (Pre-Production Blockers):

| รหัส | รายการ | ระดับ | สถานะ | ผลกระทบและการแก้ไข |
|---|---|:---:|:---:|---|
| **BUG-01** | False Success ใน `executeIssueConfirmation` | **CRITICAL** | **แก้ไขแล้ว (VERIFIED)** | ลบการหักสต็อกใน Memory ฝั่ง Client ในบล็อก `catch` ออกทั้งหมด อัปเดต UI และแคชเฉพาะเมื่อได้รับ `success === true` จาก Backend พร้อมแจ้งเตือน `UNKNOWN_OUTCOME` เมื่อเกิด Timeout (ผ่านการทดสอบ FIX-07) |
| **BUG-02** | Route Mismatch (`stock.issue` vs `requisitions.issue`) | **HIGH** | **แก้ไขแล้ว (VERIFIED)** | ปรับ `Code.gs:202-205` ให้ `apiIssueStock()` และ `issueStock()` เรียก Action หลัก `'requisitions.issue'` พร้อมเพิ่ม Action Alias `'stock.issue'` ใน `Api.gs:ACTION_REGISTRY` โดยใช้สิทธิ์ `ISSUE_STOCK` (ผ่านการทดสอบ FIX-01) |
| **BUG-03** | Alias Normalization ขาด `requisitionId` | **HIGH** | **แก้ไขแล้ว (VERIFIED)** | เพิ่ม `'requisitionId'` ใน `reqKeys` ของ `Api.gs:normalizeAndValidateAliases` พร้อมระบบตรวจสอบและปฏิเสธพารามิเตอร์ขัดแย้ง (`PARAM_CONFLICT`) (ผ่านการทดสอบ FIX-02) |
| **BUG-04** | UI Loop Mismatch ในการจ่ายพัสดุ | **HIGH** | **แก้ไขแล้ว (VERIFIED)** | ปรับ `index.html` ให้ส่งคำขอจ่ายพัสดุ 1 คำขอต่อ 1 ธุรกรรมใบเบิก พร้อมรายการพัสดุ (`items`) และรองรับการจ่ายบางส่วน (Partial Issue) ใน `Write.gs:hrtIssueStock_` พร้อมบันทึกยอดสะสมในชีต `08_Requisition_Items` คอลัมน์ 7 (ผ่านการทดสอบ FIX-03, FIX-04) |
| **BUG-05** | Role Casing ใน Frontend ไม่ตรงกับ Backend | **MEDIUM** | **ยังพบ** | Frontend มีการเปรียบเทียบ Role ด้วยตัวพิมพ์เล็ก (`'teacher'`, `'officer'`) ไม่ตรงกับค่ามาตรฐานตัวพิมพ์ใหญ่ |
| **BUG-06** | การ Sign Out ทำงานเฉพาะฝั่ง Client | **MEDIUM** | **ยังพบ** | การ Sign Out ทำเพียงล้าง DOM ไม่ได้เพิกถอนสิทธิ์ฝั่ง Server เมื่อรีเฟรชหน้าจะยังคงล็อกอินด้วยบัญชีเดิม |
| **BUG-07** | นโยบายการเข้าถึงใน `appsscript.json` | **MEDIUM** | **ยังพบ** | กำหนด `"access": "DOMAIN"` ทำให้ผู้ใช้ภายนอกโดเมน Google Workspace ไม่สามารถเข้าใช้งานได้ |

---

## 3. ผลการทดสอบอัตโนมัติที่รันจริงในเครื่อง (Isolated Test Suite Results)

ทดสอบผ่าน Node.js ในสภาพแวดล้อม In-Memory Mock (ไม่เขียนข้อมูลจริงลง Google Sheets):
1. `tests/release_consolidation_test.js`: **VERIFIED PASS** (10/10 Passed)
2. `tests/stock_transaction_idempotency_test.js`: **VERIFIED PASS** (15/15 Passed)
3. `tests/auth_rbac_test.js`: **VERIFIED PASS** (12/12 Passed)
4. `tests/rpc_contract_test.js`: **VERIFIED PASS** (12/12 Passed)
5. `tests/stock_issuance_fix_test.js`: **VERIFIED PASS** (10/10 Passed)
**รวมผลการทดสอบทั้งหมด: 59/59 Passed (100% Pass Rate)**
