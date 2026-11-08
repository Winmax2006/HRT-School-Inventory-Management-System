# แผนผังสคีมาฐานข้อมูลและตารางจำแนกกลุ่มข้อมูล (Sheets Schema & Entity Mapping Specification)
## HRT Inventory System — โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)
### เอกสารควบคุม: SIMS-SCH-2026-008 | รุ่นเป้าหมาย: v2.7.0-rc.3

---

## 1. การคลี่คลายข้อขัดแย้งจำนวนแผ่นงานในประวัติศาสตร์ (Reconciliation of Sheet Counts)

จากการตรวจสอบประวัติและเอกสารอ้างอิง พบความแตกต่างของจำนวนแผ่นงานในเอกสารต่างๆ ซึ่งระบบได้ทำข้อสรุปเชิงโครงสร้าง (Schema Reconciliation) ดังนี้:

| แหล่งอ้างอิง (Reference) | จำนวนชีตที่ระบุ | รายการแผ่นงานและสถาปัตยกรรม | ข้อยุติและการปรับเทียบ (Reconciliation Analysis) |
| :--- | :---: | :--- | :--- |
| **Historical Baseline (v2.6.0)** | **2** | `Master_Items`, `Transactions` | ระบบเดิมเริ่มแรกปี 2567 เป็นเพียง Spreadsheet เก็บสต็อก 100 รายการและบันทึกการเบิก |
| **Sample SQL Script** | **14** | 14 ตาราง `CREATE TABLE` ตามรูปแบบ RDBMS ทั่วไป | เป็นข้อเสนอโครงสร้างเชิงทฤษฎีในรายงาน Audit เก่า ไม่ได้สร้างชีตจริงบน GAS |
| **ข้อเสนอ `apps_script/`** | **15** | `01_Users` ถึง `15_Categories` | เป็นแบบร่างที่มีการแยกชีตย่อย แต่ขาดระบบ Idempotency Log |
| **Active Canonical Schema (v2.7.0)** | **16** | **16 Canonical Sheets** ใน [`Config.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Config.gs) (`01_Users` ถึง `16_Idempotency_Log`) | **โครงสร้างทางการที่ใช้งานจริงและผ่านการทดสอบ 100% ครบทุกระบบ** |

> **กฎสำคัญ (Audit Guard):** ห้ามสมมติว่ามีแผ่นงาน `_config` หรือชีตอื่นอยู่นอกเหนือจากที่นิยามไว้ใน `CONFIG.SHEETS` โดยระบบมีระบบ Alias Adapter คอยจับคู่ชื่อเดิมอย่างปลอดภัย

---

## 2. การจำแนก 20 กลุ่มข้อมูลเชิงตรรกะ สู่ 16 แผ่นงานจริง (20 Logical Groups Mapping)

กลุ่มข้อมูลทั้ง 20 กลุ่มหลักและกลุ่มประกอบเป็น **กลุ่มเชิงตรรกะ (Logical Entities)** สำหรับการออกแบบ ไม่ใช่คำสั่งให้สร้าง 26 แผ่นงานใหม่ โดยระบบได้รวมศูนย์ตามวงจรชีวิต (Lifecycle) และระดับสิทธิ์จริงลงใน **16 แผ่นงานทางกายภาพ**:

```
+───────────────────────────────────────────────────────────────────────────────────+
|                  20 LOGICAL GROUPS TO 16 CANONICAL SHEETS MAPPING                 |
+───────────────────────────────────────────────────────────────────────────────────+
  1. Settings & School Profile ──────────────► 15_Settings_Config
  2. Users & Accounts ───────────────────────► 01_Users
  3. Permissions & Roles ────────────────────► Config.gs (In-Memory Role Matrix)
  4. Departments (ฝ่ายงาน/กลุ่มสาระ) ──────────► 02_Departments
  5. Categories (หมวดหมู่พัสดุ) ─────────────► 04_Categories
  6. Warehouses (คลังพัสดุ/ห้องเก็บ) ──────────► 05_Warehouses
  7. Units (หน่วยนับจำนวนเต็ม/ทศนิยม) ─────────► In-Memory Registry / Master_Items
  8. Suppliers (คู่ค้า/ร้านค้า) ──────────────► 03_Master_Items (Column Supplier)
  9. Items (พัสดุหลัก 100 รายการ) ───────────► 03_Master_Items (Identity across years)
 10. FSN (ระบบรหัสพัสดุภาครัฐ) ──────────────► 06_FSN_Catalog
 11. Balances (ยอดคงเหลือรายปี/คลัง) ────────► 03_Master_Items + 10_Stock_Ledger
 12. Ledger (บัญชีคุมพัสดุ SSOT) ────────────► 10_Stock_Ledger
 13. Requisitions (หัวใบเบิก) ──────────────► 07_Requisitions
 14. Lines (รายการพัสดุในใบเบิก) ───────────► 08_Requisition_Items
 15. Events (ประวัติการเปลี่ยนสถานะ) ────────► 11_Audit_Trail
 16. Fiscal (ปีงบประมาณและสถานะ) ──────────► 12_Fiscal_Years
 17. Audits (หัวบันทึกตรวจนับสิ้นปี) ────────► 13_Year_End_Audits
 18. Audit Items (รายการตรวจนับ/ผลต่าง) ────► 13_Year_End_Audit_Items
 19. Operations (บันทึกจำหน่ายพัสดุ) ───────► 14_Disposal_Records
 20. Audit Log (บันทึกความปลอดภัย) ─────────► 11_Audit_Trail
 ── Auxiliary Groups:
  - QR Registry (สารบบป้าย QR Code) ────────► 14_QR_Registry (Logical Aliased)
  - Idempotency & Mutex Leases ──────────────► 16_Idempotency_Log
  - Signatory Snapshots ─────────────────────► 07_Requisitions / 08_Requisition_Items
  - Document Templates (แบบ พ.ด. ๑-๗) ───────► Config.gs + Read.gs (Dynamic Render)
```

---

## 3. สถาปัตยกรรมบัญชีคุมพัสดุเดี่ยว (Single SSOT Stock Ledger Architecture)

### 3.1 การรวม `STOCK_LEDGER` และ `stock_transactions` เข้าด้วยกัน
เพื่อป้องกันปัญหาข้อมูลไม่ตรงกัน (Data Split) ระบบกำหนดให้ **`10_Stock_Ledger` เป็น Single Source of Truth (SSOT)** เพียงหนึ่งเดียว โดย `09_Stock_Transactions` ทำหน้าที่เป็น Log การเคลื่อนไหวของระบบภายนอกเท่านั้น:
- ยอดคงเหลือของพัสดุ ($Balance$) คำนวณจาก:
  $$\text{Current Balance} = \text{Opening Balance (FY)} + \sum \text{Qty In (FY)} - \sum \text{Qty Out (FY)}$$
- **แยก Identity ข้ามปีออกจากยอด Balance:** รหัสพัสดุ (`item_code` เช่น `OFF-001`) เป็น Entity ถาวรข้ามปี ส่วนยอดคงเหลือถูกแยกขอบเขตด้วย Composite Key:
  $$\text{Balance Key} = \text{fiscal\_year} + \text{item\_id} + \text{warehouse\_id}$$
- **ทิศทางธุรกรรมมาตรฐาน (Canonical Directions):**
  - `RECEIVE` (รับเข้าคลัง) $\rightarrow$ Qty In $> 0$
  - `ISSUE` (จ่ายพัสดุตามใบเบิก) $\rightarrow$ Qty Out $> 0$
  - `OPENING` (ยอดยกมาต้นปีงบประมาณ) $\rightarrow$ Qty In $> 0$
  - `ADJUST_PLUS` (ปรับปรุงยอดเพิ่มขึ้นจากการตรวจนับ) $\rightarrow$ Qty In $> 0$
  - `ADJUST_MINUS` (ปรับปรุงยอดลดลงจากการตรวจนับ) $\rightarrow$ Qty Out $> 0$
  - `RETURN` (ส่งคืนพัสดุเข้าคลัง) $\rightarrow$ Qty In $> 0$
  - `DISPOSAL` (ตัดจำหน่ายพัสดุชำรุด/เสื่อมสภาพ) $\rightarrow$ Qty Out $> 0$
  > **กฎเข้มงวด:** ปฏิเสธคำว่า `ADJUST` ลอยๆ โดยไม่ระบุทิศทาง หรือมี $Qty \le 0$

---

## 4. โครงสร้างข้อมูลวงจรชีวิตคำขอเบิกและการตรวจนับ (Lifecycle Models)

### 4.1 การแยกจำนวนในคำขอเบิก (Quantity Lifecycle Separation)
ในแผ่นงาน `08_Requisition_Items` แยกคอลัมน์จำนวนอย่างชัดเจน:
1. `qty_requested`: จำนวนที่ครูระบุในคำขอเบิก (กำหนดตอนส่งคำขอ ห้ามแก้ไข)
2. `qty_approved`: จำนวนที่ผู้อำนวยการอนุมัติ (เท่ากับหรือน้อยกว่าที่ขอ)
3. `qty_issued`: จำนวนที่เจ้าหน้าที่พัสดุจ่ายออกจริง (**ตัดสต็อกเฉพาะยอดนี้ ณ สถานะ ISSUED**)
4. `qty_received`: จำนวนที่ครูกดยืนยันรับของแล้ว (ไม่มีการตัดสต็อกซ้ำ)

### 4.2 ความหมายทางนิติวิทยาศาสตร์ของการตรวจนับ (Physical Count Semantics)
ในแผ่นงาน `13_Year_End_Audit_Items`:
- **`physical_count = null` (หรือเว้นว่าง):** หมายถึง **"ยังไม่ได้ทำการตรวจนับ"** (Pending Inspection) จะไม่มีการคำนวณผลต่าง
- **`physical_count = 0`:** หมายถึง **"ตรวจนับแล้ว แต่พบว่าของหมดสต็อกจริง (ตรวจพบศูนย์)"** โดยระบบจะบันทึกผลต่างขาดบัญชีเท่ากับ $-Book\_Qty$

---

## 5. การแปลงข้อกำหนด SQL สู่การบังคับใช้บน Server-Side (SQL Constraints Enforcement)

เนื่องจาก Google Sheets ไม่มีเอนจิน SQL Constraints แบบเนทีฟ ระบบจึงแปลงกฎเหล่านั้นเป็นการตรวจสอบบน Server Logic ใน [`Write.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs) และ [`Api.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Api.gs):

| ข้อกำหนด SQL (SQL Constraint) | การบังคับใช้ในระบบ HRT Apps Script Engine | พฤติกรรมเมื่อพบการละเมิด (Violation Behavior) |
| :--- | :--- | :--- |
| **PRIMARY KEY (PK)** | สร้างรหัสแบบ Deterministic Prefix + Timestamp + Hex (เช่น `REQ-2569-0001`, `LED-2569-0042`) | ปฏิเสธการสร้างแถวหากพบ ID ซ้ำ |
| **FOREIGN KEY (FK)** | ตรวจสอบความมีอยู่จริงในแผ่นงานต้นทางก่อนเขียน (เช่น ตรวจสอบ `item_code` ใน `03_Master_Items` และ `warehouse_id` ใน `05_Warehouses`) | Reject ทันทีด้วยรหัส `FK_VIOLATION` หรือ `NOT_FOUND` |
| **UNIQUE KEY (UK)** | ตรวจสอบความซ้ำซ้อนของ `email` ใน `01_Users` และ `item_code` ใน `03_Master_Items` | ปฏิเสธการบันทึกด้วย `UNIQUE_CONFLICT` |
| **CHECK ($Qty > 0$)** | ฟังก์ชัน `validateItemQuantity` ตรวจสอบ $Qty > 0$ และจำนวนเต็มสำหรับหน่วยนับเดี่ยว | ปฏิเสธคำขอด้วย `INVALID_QUANTITY` หรือ `DECIMAL_NOT_ALLOWED` |
| **CHECK ($Price \ge 0$)** | ตรวจสอบราคาต่อหน่วยและมูลค่าพัสดุต้องไม่ติดลบ | ปฏิเสธคำขอด้วย `INVALID_ARGUMENT` |
| **TIMEZONE STORAGE** | บันทึกวันเวลาตามมาตรฐาน ISO 8601 ที่ระบุ Timezone `Asia/Bangkok (+07:00)` เสมอ | ป้องกันเวลาคลาดเคลื่อนข้ามวัน |
| **FILE REFERENCES** | จัดเก็บเฉพาะ Google Drive URL หรือ File ID ในชีต ไม่ยัด Binary ลงเซลล์ | ป้องกันแผ่นงานขยายตัวจนเต็มโควตา |
