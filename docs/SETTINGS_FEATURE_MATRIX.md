# ตารางเมทริกซ์ฟังก์ชันการตั้งค่าระบบ (Settings Feature Matrix)
## HRT Inventory System — โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)
### รุ่นเป้าหมาย: v2.7.0-rc.2 | Baseline: v2.6.0

---

### ภาพรวมการจัดการสิทธิ์และฟังก์ชัน (Overview)
ระบบตั้งค่าศูนย์กลาง (Settings Hub Level 3) แบ่งออกเป็น 8 หมวดหมู่หลัก ครอบคลุมการกำหนดค่าโครงสร้างสถานศึกษา, สิทธิ์ผู้ใช้งาน, รอบปีงบประมาณ, ข้อมูลกลางพัสดุ, กติกาการเบิกจ่าย, ระบบ MiniUI / QR Code, การเชื่อมต่อและสำรองข้อมูล, และบันทึกประวัติการตรวจสอบ โดยบังคับใช้การควบคุมสิทธิ์อย่างเข้มงวด (Granular Role-Based Access Control) ตามหลักการ Fail-Closed

---

### ตารางเมทริกซ์ 8 หมวดหมู่การตั้งค่า (The 8-Category Settings Matrix)

| หมวดหมู่ (Category) | ฟังก์ชันย่อย / การทำงาน (Action) | สิทธิ์ที่อนุญาต (Roles) | RPC Endpoint | แผ่นงานที่เกี่ยวข้อง (Target Sheet) | สถานะความพร้อม (Status) | หมายเหตุทางเทคนิค / เหตุผล |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **1. ข้อมูลสถานศึกษาและเอกสาร (School Profile & Docs)** | ดูข้อมูลชื่อสถานศึกษาและผู้ลงนาม | ADMIN, OFFICER, DIRECTOR, REQUESTER | `settings.getSection('school')` | `12_Settings` | **COMPLETE** | อ่านค่าชื่อโรงเรียน สังกัด ที่อยู่ และรูปแบบเอกสาร |
| | แก้ไขข้อมูลสถานศึกษาและผู้ลงนาม | ADMIN Only | `settings.updateSection('school')` | `12_Settings` | **COMPLETE** | ตรวจสอบ Concurrency Revision และป้องกัน Formula Injection |
| | ออกเลขที่เอกสารตาม Pattern | ADMIN, OFFICER, DIRECTOR | `documents.generateNumber` | `12_Settings`, `07_Requisitions` | **COMPLETE** | ล็อก Transaction Sequence ป้องกันเลขที่เอกสารชนกัน |
| | คงสภาพลายเซ็นในเอกสารอดีต | ALL (System Automatic) | `requisitions.issue` / `docs.render` | `07_Requisitions` | **COMPLETE** | บันทึก `signatories_snapshot` ณ วันที่จ่ายจริง |
| **2. ผู้ใช้ การเข้าสู่ระบบ และสิทธิ์ (Users & RBAC)** | เรียกดูรายชื่อบัญชีผู้ใช้งาน | ADMIN Only | `users.list` / `settings.getSection('users')` | `01_Users` | **COMPLETE** | ซ่อนข้อมูลผู้ใช้จากกลุ่มครูและเจ้าหน้าที่ทั่วไป |
| | เพิ่ม / แก้ไขบัญชีและสิทธิ์ | ADMIN Only | `users.updateAccess` | `01_Users` | **COMPLETE** | บังคับใช้บทบาท ADMIN, DIRECTOR, OFFICER, REQUESTER |
| | ระงับการใช้งานบัญชี (Suspend) | ADMIN Only | `users.deactivate` | `01_Users` | **COMPLETE** | บัญชีถูกระงับจะถูกตัดสิทธิ์ทันทีในทุก Endpoint |
| | ป้องกันแอดมินคนสุดท้าย (Last-Admin) | ALL (System Automatic) | `users.updateAccess` / `users.deactivate` | `01_Users` | **COMPLETE** | ปฏิเสธการลดสิทธิ์หรือระงับแอดมินคนสุดท้ายอย่างเด็ดขาด |
| | เข้าสู่ระบบด้วย Google Workspace SSO | ALL (Domain Users) | Google Identity Platform | External Domain | **BLOCKED** | รอการติดตั้ง OAuth Client Secret และ Domain `@hrt.ac.th` จริง |
| **3. ปีงบประมาณ (Fiscal Year Lifecycle)** | ตรวจสอบรอบปีงบประมาณและสถานะ | ADMIN, OFFICER, DIRECTOR | `fiscalYears.list` | `02_Fiscal_Years` | **COMPLETE** | แสดงรอบปฏิทินหลวง (1 ต.ค. – 30 ก.ย.) และสถานะ OPEN/CLOSED |
| | สลับปีที่กำลังดู (Viewing Year) | ADMIN, OFFICER, DIRECTOR | Client-Side Controller (`setViewingYear`) | Memory Cache | **COMPLETE** | แยกปีที่กำลังตรวจสอบออกจากปีที่เปิดทำธุรกรรมจริง |
| | เตรียมเปิดรอบปีงบประมาณใหม่ | ADMIN Only | `fiscalYears.prepare` | `02_Fiscal_Years` | **COMPLETE** | เตรียมโครงสร้างปีถัดไปโดยไม่กระทบปีปัจจุบัน |
| | ปิดรอบบัญชีสิ้นปี (Year-End Rollover) | ADMIN Only | `fiscalYears.closeAndRollover` | `02_Fiscal_Years`, `03_Master_Items` | **COMPLETE** | ตรวจนับ สรุปผลต่าง และยกยอดเปิดบัญชีปีใหม่เพียงครั้งเดียว |
| | ล็อกธุรกรรมในรอบปีที่ปิดแล้ว | ALL (System Automatic) | `requisitions.create`, `stock.issue` | `07_Requisitions`, `09_Stock_Transactions` | **COMPLETE** | บังคับใช้ Closed-Year Write Lock ห้ามเขียนในรอบปีที่ปิด |
| **4. ข้อมูลกลางพัสดุ (Master Data)** | ดูรายการฝ่ายงาน, คลัง, หมวด, หน่วยนับ | ADMIN, OFFICER | `masterData.list` | `13_Departments`, `03_Master_Items` | **COMPLETE** | ดึงข้อมูลพร้อมคำนวณจำนวนรายการพัสดุที่อ้างอิง (FK Count) |
| | เพิ่ม / แก้ไขข้อมูลกลาง | ADMIN Only | `masterData.upsert` | `13_Departments`, `03_Master_Items` | **COMPLETE** | ป้องกัน Formula Injection และตรวจความซ้ำซ้อนของรหัส |
| | ระงับการใช้งานข้อมูลกลาง (Soft-Delete) | ADMIN Only | `masterData.deactivate` | `13_Departments`, `03_Master_Items` | **COMPLETE** | หากมีพัสดุอ้างอิงอยู่ จะเปลี่ยนสถานะเป็น INACTIVE แทนการลบแถว |
| **5. กติกาการเบิกและสต็อก (Business Rules)** | ดูเกณฑ์สต็อก, ROP, พาเรโต ABC | ADMIN, OFFICER, REQUESTER | `settings.getSection('rules')` | `12_Settings` | **COMPLETE** | แสดงเกณฑ์ Min, ROP, และระดับสต็อกปลอดภัย |
| | แก้ไขเกณฑ์สต็อกและ ROP Factor | ADMIN Only | `settings.updateSection('rules')` | `12_Settings` | **COMPLETE** | ตรวจสอบค่าต้องไม่ติดลบ ($Min \ge 0, ROP \ge 0$) |
| | ปรับเกณฑ์พาเรโต ABC ($A < B \le 100$) | ADMIN Only | `settings.updateSection('rules')` | `12_Settings` | **COMPLETE** | บังคับความถูกต้องทางคณิตศาสตร์ $0 < A < B \le 100$ |
| | บังคับใช้กฎหน่วยนับทศนิยม (Decimal Rule) | ALL (System Automatic) | `requisitions.validateItem`, `imports.validate` | `03_Master_Items` | **COMPLETE** | อนุญาตทศนิยมเฉพาะ กิโลกรัม, ลิตร, เมตร; ห้ามทศนิยมใน รีม, กล่อง |
| **6. MiniUI และ QR Code Generator** | สลับเปิด/ปิดระบบ MiniUI และสิทธิ์ครู | ADMIN Only | `settings.updateSection('miniui')` | `12_Settings` | **COMPLETE** | ควบคุมการเปิดให้ครูเบิกด้วยตนเองและร่างออฟไลน์ |
| | สร้างป้าย QR Code 4 รูปแบบ | ADMIN, OFFICER | `qr.create` / `apiCreateQrCode` | `14_QR_Registry` | **COMPLETE** | รองรับรูปแบบ `ITEM`, `ROOM`, `TRACK`, `GENERAL` |
| | แสดงตัวอย่าง Live SVG Preview | ADMIN, OFFICER | `qr.preview` / `apiPreviewQr` | Client Engine | **COMPLETE** | เรนเดอร์ SVG พร้อม Quiet Zone และข้อความกำกับ |
| | สั่งพิมพ์ป้าย QR Code ขนาดมาตรฐาน A4 | ADMIN, OFFICER | Print Modal (`printQrBadge`) | Client Print Engine | **COMPLETE** | ปรับแต่ง CSS สำหรับเครื่องพิมพ์ ไม่แสดงแถบเมนูข้าง |
| | เพิกถอน / ระงับป้าย QR Code | ADMIN Only | `qr.disable` / `qr.revoke` | `14_QR_Registry` | **COMPLETE** | เปลี่ยนสถานะเป็น REVOKED; เมื่อสแกนจะถูกปฏิเสธทันที |
| | สแกน QR ด้วยกล้องสมาร์ตโฟนจริง | REQUESTER (ครู/บุคลากร) | HTML5 QR Code Scanner | Mobile Browser / Camera | **DEMO** | ฟังก์ชันจำลองสำเร็จบน Sandbox; รองรับกล้องจริงเมื่อเชื่อม HTTPS |
| **7. การเชื่อมต่อ นำเข้า และสำรองข้อมูล** | ทดสอบความสมบูรณ์ฐานข้อมูล (Health Check) | ADMIN Only | `system.healthCheck` | All 16 Sheets | **COMPLETE** | ตรวจสอบโครงสร้าง คอลัมน์ และสิทธิ์ของชีตทั้ง 16 แผ่น |
| | ตรวจสอบไฟล์นำเข้า CSV (Dry-Run) | ADMIN, OFFICER | `imports.validate` | Memory Staging | **COMPLETE** | ตรวจโครงสร้างและสูตรอันตรายโดยไม่แตะต้องฐานข้อมูลจริง |
| | ยืนยันการนำเข้าข้อมูลพัสดุ (Commit) | ADMIN Only | `imports.commit` | `03_Master_Items`, `09_Stock_Transactions` | **COMPLETE** | ห้ามลบข้อมูลเดิม (Forbid Delete-First) และลงบัญชีคุมสต็อก |
| | สร้างจุดสำรองข้อมูลระบบ (Full Backup) | ADMIN Only | `backups.create` | Drive Backup Folder | **COMPLETE** | สร้าง Snapshot ไฟล์ชีตและประวัติธุรกรรมแบบแยกส่วน |
| | ทดสอบกู้คืนข้อมูลแบบ Staging Dry-Run | ADMIN Only | `backups.validateRestore` | Staging Sandbox | **COMPLETE** | จำลองการตรวจสอบ Checksum และโครงสร้างโดยไม่ทับ Production |
| **8. ประวัติและการตรวจสอบระบบ (Audit & About)** | ตรวจสอบประวัติการเปลี่ยนแปลงระบบ | ADMIN, OFFICER, DIRECTOR | `audit.list` | `11_Audit_Logs` | **COMPLETE** | แสดงเวลา ผู้กระทำ รายละเอียด และลายพิมพ์ SHA-256 |
| | ตรวจสอบความถูกต้องของ Hash Chain | ADMIN Only | `audit.verifyChain` | `11_Audit_Logs` | **COMPLETE** | ตรวจเทียบแฮชต่อเนื่อง ป้องกันการแก้ไขหรือลบแถวย้อนหลัง |
| | ตรวจสอบข้อมูลรุ่นซอฟต์แวร์และสัญญา | ALL Roles | `system.about` | `Config.gs` | **COMPLETE** | แสดงรุ่น `v2.7.0-rc.2`, Baseline `v2.6.0`, และ Git Commit |

---

### สรุปสถานะความพร้อมตามเกณฑ์ตรวจรับ (Summary Status)
- **ฟังก์ชันระดับ COMPLETE**: 31 ฟังก์ชัน (94.0%)
- **ฟังก์ชันระดับ DEMO (Staging Ready)**: 1 ฟังก์ชัน (3.0% — การสแกนผ่านกล้อง WebCam ในสภาพแวดล้อมจริง)
- **ฟังก์ชันระดับ BLOCKED**: 1 ฟังก์ชัน (3.0% — การเชื่อมต่อ Live Google Workspace Domain OAuth `@hrt.ac.th`)
- **ฟังก์ชันระดับ NOT IMPLEMENTED**: 0 ฟังก์ชัน (0.0%)
