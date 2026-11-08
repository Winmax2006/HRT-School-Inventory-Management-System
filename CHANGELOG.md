# บันทึกการเปลี่ยนแปลงระบบ (System Changelog)
## HRT School Inventory Management System
โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) สังกัดองค์การบริหารส่วนจังหวัดสระบุรี

---

### [v2.7.0-rc.6] - 2026-10-31
#### การรวมศูนย์สิ่งส่งมอบรุ่น Release Candidate 6 (Prompts 13-20 Consolidation), MiniUI Responsive QR, ACID Ledger & Audit Verification
- **สถานะรุ่น**: `CANDIDATE_RELEASE_CONSOLIDATED`
- **รุ่นก่อนหน้า**: `v2.7.0-rc.5` -> ส่งมอบ: `v2.7.0-rc.6`
- **Git Base Commit**: `dd000c0`
- **การเปลี่ยนแปลงหลัก**:
  1. **สถาปัตยกรรมรันไทม์ 9 ไฟล์หลัก (Runtime Allowlist):** จัดกลุ่มและตรวจสอบ Checksum ความสมบูรณ์ของ 9 ไฟล์หลักสำหรับขึ้นระบบ Apps Script
  2. **ระบบตรวจจับ QR บนมือถือ (MiniUI):** พัฒนาระบบสแกนผ่าน WebRTC MediaStream และ BarcodeDetector API รองรับกล้องจริงบนสมาร์ตโฟน
  3. **การพิทักษ์ความมั่นคงปลอดภัยแบบ Fail-Closed:** ตรวจสอบ Google ID Token, Dynamic RBAC 6 ระดับ และปฏิเสธการเข้าถึงจากภายนอกที่ไม่ได้รับอนุญาต
  4. **ระบบบัญชีคุมพัสดุคู่ (Double-Entry Stock Ledger):** รวมศูนย์การเคลื่อนไหวลงใน `10_Stock_Ledger` พร้อมระบบบันทึก Audit Trail ต่อเนื่องแบบ SHA-256 Hash Chain
  5. **รายงานเอกสารราชการ พ.ด. ๑–๗:** ออกเอกสารตามระเบียบกระทรวงการคลังฯ พ.ศ. ๒๕๖๐ แบบหน้าเดียว A4
  6. **แก้ไขข้อบกพร่องธุรกรรมจ่ายพัสดุ (Stock Issuance Defects Resolution):**
     - **BUG-01 (False Success Elimination):** ยกเลิก fallback ใน `index.html:executeIssueConfirmation` ที่ตัดสต็อกใน memory ฝั่ง client เมื่อเกิดข้อผิดพลาด อัปเดตแคชเฉพาะเมื่อ backend ยืนยันสำเร็จจริง พร้อมตรวจจับและแจ้งเตือน `UNKNOWN_OUTCOME` เมื่อเกิด Timeout
     - **BUG-02 (Route & Alias Contract):** แก้ `Code.gs:apiIssueStock` ให้เรียก action หลัก `'requisitions.issue'` และเพิ่ม `'stock.issue'` เป็น Action Alias ใน `Api.gs:ACTION_REGISTRY` โดยผูกกับสิทธิ์ `ISSUE_STOCK` และบทบาท `OFFICER`
     - **BUG-03 (Alias Normalization):** เพิ่ม `'requisitionId'` ใน `reqKeys` ของ `Api.gs:normalizeAndValidateAliases` และปฏิเสธพารามิเตอร์ขัดแย้งด้วยรหัส `PARAM_CONFLICT`
     - **BUG-04 (UI Loop Mismatch & Partial Issue):** ปรับ `executeIssueConfirmation` ให้ส่งคำขอจ่าย 1 ครั้งต่อ 1 ธุรกรรมใบเบิก พร้อมรายการพัสดุ (`items`) และเปิดใช้งานระบบจ่ายบางส่วน (Partial Issue) ใน `Write.gs:hrtIssueStock_` คำนวณยอดคงค้าง (`remainingApprovable = qtyApproved - previouslyIssued`) พร้อมบันทึกยอดสะสมใน `08_Requisition_Items` คอลัมน์ 7 และปรับสถานะเป็น `PARTIAL_ISSUED` หรือ `ISSUED`
     - **End-to-End Idempotency & Rollback:** ผูก `_idempotencyKey` ระดับโมดอลเซสชัน ป้องกันการกดปุ่มเบิ้ลด้วย `window._isIssueSubmitting` และสร้างขอบเขตธุรกรรมชดเชย (Compensatory Rollback) คืนค่าสต็อกและสถานะทันทีหากเกิดข้อผิดพลาดระหว่างเขียนหลายชีต
     - **Verification Suite:** เพิ่มชุดทดสอบ `tests/stock_issuance_fix_test.js` ผ่านการทดสอบ 10/10 Passed (รวมทั้งสิ้น 59/59 Passed ในระบบ)

---

### [v2.7.0-rc.5] - 2026-10-30
#### การปรับปรุงระบบตรวจสอบสิทธิ์ Google Workspace, ทะเบียนผู้ใช้งาน และความต่อเนื่องของหมายเลขเอกสาร (Prompts 13-19)
- **การเปลี่ยนแปลงหลัก**:
  - แก้ปัญหา Off-by-one ในการสร้าง User ID (`USR-001`) และป้องกันการชนของคีย์ต่างด้าว
  - เพิ่มระบบตรวจสอบนโยบายโดเมนสถานศึกษา (`horathep.ac.th`, `hrt.ac.th`)
  - ปรับปรุงการตรวจสอบ Idempotency Key ในการส่งคำขอแบบ Persistent ผ่านชีต `16_Idempotency_Log`

---

### [v2.7.0-rc.4] - 2026-10-28
#### การแยกโค้ดแอปใช้งานจริงออกจากข้อมูลจำลอง (Clean Code & Mock Data Separation)
- **การเปลี่ยนแปลงหลัก**:
  - สกัด Mock Data ออกจาก `index.html` ไปยังโฟลเดอร์ `tests/fixtures/`
  - สร้างไฟล์ทางเข้าสำหรับทดสอบเดี่ยว `demo.html` พร้อมฟังก์ชันสลับผู้ใช้จำลองในหน่วยความจำ
  - พัฒนาชุดทดสอบ `tests/p9_clean_separation_test.js`

---

### [v2.7.0-rc.3] - 2026-10-28
#### การรวมศูนย์ Single SSOT Writer และกระทบยอดสคีมา 16 แผ่นงานมาตรฐาน
- **การเปลี่ยนแปลงหลัก**:
  - ยืนยันโครงสร้างฐานข้อมูลมาตรฐาน 16 ชีต (`Config.gs:SHEETS`)
  - รวมศูนย์การตัดสต็อกไว้ใน `Write.gs` ภายใต้ Script Lock Mutex
