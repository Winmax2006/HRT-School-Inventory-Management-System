# 📜 BUSINESS RULES SPECIFICATION
## กฎระเบียบและตรรกะทางธุรกิจระบบบริหารคลังพัสดุสถานศึกษา
### โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)

**รหัสเอกสาร:** SIMS-BR-2026-001  
**เวอร์ชันข้อกำหนด:** 1.0.0 (MOE Procurement Regulation Aligned)  
**อ้างอิงทางกฎหมาย:** ระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖๐  

---

## 1. กฎการควบคุมยอดสต็อกและบัญชีคุม (Inventory Balance Invariant Rules)

- **BR-INV-01 (Non-Negative Stock Balance):** ยอดคงเหลือของพัสดุทุกรายการต้องไม่ติดลบ ($Balance \ge 0$) ตลอดเวลา หากคำขอเบิกหรือการตัดจ่ายทำให้ยอดคงเหลือติดลบ ระบบต้องปฏิเสธทันทีด้วย `InsufficientStockException`
- **BR-INV-02 (Conservation of Stock Equation):** ยอดคงเหลือในคลังต้องสอดคล้องกับสมการอนุรักษ์ยอดพัสดุ 100%:
  $$\text{Opening Balance} + \sum \text{Qty In} - \sum \text{Qty Out} \pm \sum \text{Adjustments} = \text{Current Balance}$$
- **BR-INV-03 (Immutable Append-Only Ledger):** ทุกการเคลื่อนไหวทางกายภาพของพัสดุต้องบันทึกเป็นแถวรายการใหม่ใน `Stock_Ledger` เสมอ ห้าม `UPDATE` หรือ `DELETE` รายการในอดีตโดยเด็ดขาด

---

## 2. กฎวงจรชีวิตคำขอเบิกพัสดุ (Requisition Lifecycle Rules)

- **BR-REQ-01 (Mandatory Requisition Form):** การเบิกพัสดุทุกครั้งต้องสร้างเอกสารคำขอเบิกพัสดุ (แบบ พ.ด. ๑) มีรหัสกำกับชัดเจน (`HRT-INV-REQ-2569/xxx`)
- **BR-REQ-02 (Draft Editing):** ผู้ขอเบิกสามารถแก้ไขหรือลบรายการพัสดุได้เฉพาะขณะที่คำขออยู่ในสถานะ `DRAFT` เท่านั้น
- **BR-REQ-03 (Locking upon Submit):** เมื่อคำขอถูกส่ง (`SUBMIT`) ไปเป็นสถานะ `PENDING_APPROVAL` เอกสารจะถูกล็อก ไม่สามารถแก้ไขข้อมูลรายการได้
- **BR-REQ-04 (Mandatory Approval Before Issue):** เจ้าหน้าที่พัสดุจะตัดจ่ายพัสดุได้เฉพาะคำขอที่อยู่ในสถานะ `APPROVED` เท่านั้น ปฏิเสธการตัดจ่ายคำขอที่ยังไม่อนุมัติ (`InvalidStateTransitionException`)
- **BR-REQ-05 (Single Issue per Requisition):** คำขอเบิกหนึ่งใบสามารถทำการตัดจ่ายพัสดุได้เพียงครั้งเดียว (One-to-One Issue) หากสถานะเป็น `ISSUED` แล้ว ปฏิเสธการจ่ายซ้ำ (`DuplicateIssueException`)
- **BR-REQ-06 (Rejection Justification):** ผู้อนุมัติที่ปฏิเสธคำขอ (`REJECT`) ต้องระบุเหตุผลความจำเป็นประกอบเสมอ เพื่อความโปร่งใสตรวจสอบได้

---

## 3. กฎการตรวจสอบสิทธิ์และการยืนยันตัวตน (Authentication & Authorization Rules)

- **BR-SEC-01 (Zero-Trust Client Role):** Backend ต้องไม่เชื่อถือค่า `role` หรือ `userId` ที่ส่งมาจากเบราว์เซอร์หรือ Payload ตัวตนของผู้ใช้งานต้องตรวจสอบจาก Google Workspace Session (`Session.getActiveUser().getEmail()`) เท่านั้น
- **BR-SEC-02 (Strict Role-Based Access Control):**
  - ครูผู้ขอเบิก (`TEACHER`): สร้างคำขอ, ส่งคำขอ, ยกเลิกคำขอของตนเอง
  - ผู้อนุมัติ (`DIRECTOR` / หัวหน้างาน): อนุมัติ, ปฏิเสธ
  - เจ้าหน้าที่พัสดุ (`STAFF_SUPPLY`): รับเข้า, ตัดจ่าย, ปรับยอดสต็อก, ดูบัญชีคุม
- **BR-SEC-03 (Disabled Account Blocking):** บัญชีผู้ใช้งานที่มีสถานะเป็น `DISABLED` หรือ `INACTIVE` จะถูกบล็อกการทำงานทุกชนิดในระบบทันทีด้วย `DisabledUserException`

---

## 4. กฎการประมวลผลพร้อมกันและการควบคุมความเสี่ยง (Concurrency & Safety Rules)

- **BR-CON-01 (LockService Critical Section):** ทุกธุรกรรมที่กระทบต่อยอดคงเหลือพัสดุ (รับเข้า, ตัดจ่าย, ปรับยอด) ต้องครอบด้วย `LockService.getScriptLock()` พร้อม Timeout 10 วินาที เพื่อจัดคิวแบบ Sequential Serialization
- **BR-CON-02 (Always Release Lock):** การปล่อย Lock ต้องอยู่ในบล็อก `finally` เสมอ เพื่อรับประกันว่าจะไม่เกิดปัญหา Deadlock แม้ระบบจะเกิด Error ในขั้นตอนใดก็ตาม
- **BR-CON-03 (Comprehensive Audit Trail):** ทุกกิจกรรมที่มีการเปลี่ยนแปลงสถานะหรือยอดเงิน ต้องสร้างประวัติการตรวจสอบใน `Audit_Log` พร้อมแฮช SHA-256 เชื่อมโยงบล็อกต่อเนื่อง
