# แผนการย้ายและทดลองนำเข้าข้อมูลแบบไม่ทำลายโครงสร้างเดิม (Backend Migration & Dry-Run Runbook)
## HRT Inventory System — โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)
### เอกสารควบคุม: SIMS-MIG-2026-008
### รุ่นเป้าหมาย: v2.7.0-rc.3 | Historical Baseline: v2.6.0 | วันที่จัดทำ: 2026-10-28

---

## 1. ยุทธศาสตร์การย้ายข้อมูลแบบเพิ่มขยาย (Additive Migration Strategy)

เพื่อรักษาประวัติและความต่อเนื่องในการดำเนินงานของโรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) ระบบกำหนดนโยบายความปลอดภัยข้อมูลระดับสูงสุด:

1. **ห้ามลบหรือเขียนทับข้อมูลประวัติศาสตร์เดิม (Never Drop or Destruct)**:
   - แผ่นงานเดิมปี 2567 ได้แก่ `Master_Items` และ `Transactions` จะได้รับการเก็บรักษาไว้เป็น Archive ดั้งเดิมโดยไม่ถูกลบหรือเปลี่ยนชื่อ
2. **การขยายโครงสร้างแบบต่อเติม (Additive-Only Schema Upgrade)**:
   - การปรับปรุงฐานข้อมูลเป็นไปตามโครงสร้าง **16 แผ่นงานมาตรฐาน (16 Canonical Sheets)**
   - หากมีการเพิ่มคอลัมน์ใหม่ จะใช้วิธีต่อท้ายคอลัมน์เดิม (Append Column) และกำหนดค่า Default เพื่อไม่ให้ส่งผลกระทบต่อสคริปต์เดิม
3. **การทดลองรันในพื้นที่จำลองก่อนเสมอ (Mandatory Sandbox Dry-Run)**:
   - ห้ามรันสคริปต์ย้ายข้อมูลบน Production Spreadsheet โดยตรง
   - ต้องทดสอบกระบวนการทั้งหมดบน Staging Sandbox Spreadsheet และตรวจสอบผลลัพธ์ 100% ก่อนเสมอ

---

## 2. แผนผังการแปลงรหัสและคีย์เชื่อมโยง (Legacy FK & Direction Mapping)

### 2.1 การแปลงรหัสพัสดุและคลัง
| ฟิลด์ในระบบเดิม (v2.6.0) | ฟิลด์ในโครงสร้างมาตรฐาน (v2.7.0) | แผ่นงานปลายทาง | หมายเหตุและกฎการแปลง |
| :--- | :--- | :--- | :--- |
| `item_code` ("OFF-001") | `item_code` ("OFF-001") | `03_Master_Items` | คงรหัสเดิม 100 รายการ |
| *(สร้างอัตโนมัติ)* | `item_id` ("ITM-001") | `03_Master_Items` | สร้างรหัสถาวรข้ามปีงบประมาณ |
| *(ไม่มีในระบบเดิม)* | `warehouse_id` ("WH-MAIN") | `05_Warehouses` | กำหนดค่าเริ่มต้นเป็นคลังหลักกลาง |
| `category` ("สำนักงาน") | `category_id` ("CAT-OFF") | `04_Categories` | แปลงชื่อหมวดเป็น Foreign Key |
| `department` | `department_id` ("D-ACAD") | `02_Departments` | แมปเข้าหา 8 ฝ่ายงาน/กลุ่มสาระฯ |

### 2.2 การแปลงทิศทางธุรกรรมสู่บัญชีคุมพัสดุ (Transaction Direction Mapping)
ในระบบเดิมมีเพียงบันทึกการเบิกจ่าย แต่ใน v2.7.0 บัญชีคุมพัสดุ (`10_Stock_Ledger`) บังคับใช้ทิศทางมาตรฐาน 7 ทิศทาง:

| ประเภทธุรกรรมเดิม | ทิศทางมาตรฐานใน Ledger | ค่า `qty_in` | ค่า `qty_out` | ผลกระทบต่อยอดสต็อก |
| :--- | :--- | :---: | :---: | :--- |
| `OPENING` / ยกยอด | `OPENING` | $> 0$ | $0$ | กำหนดยอดเริ่มต้นปีงบประมาณ |
| `RECEIVE` / รับพัสดุ | `RECEIVE` | $> 0$ | $0$ | เพิ่มยอดคงเหลือในคลัง |
| `ISSUE` / เบิกจ่าย | `ISSUE` | $0$ | $> 0$ | ตัดยอดสต็อกเมื่อส่งมอบพัสดุ |
| `ADJUST` (เพิ่ม) | `ADJUST_PLUS` | $> 0$ | $0$ | ปรับเพิ่มจากผลการตรวจนับ |
| `ADJUST` (ลด) | `ADJUST_MINUS` | $0$ | $> 0$ | ปรับลดจากผลการตรวจนับ |
| `RETURN` / คืนพัสดุ | `RETURN` | $> 0$ | $0$ | คืนพัสดุที่เบิกเกินเข้าคลัง |
| `DISPOSAL` / จำหน่าย | `DISPOSAL` | $0$ | $> 0$ | ตัดจำหน่ายพัสดุชำรุด/เสื่อมสภาพ |

> **กฎเหล็กการตรวจสอบ (Strict Rule):** หากพบธุรกรรม `ADJUST` ที่ไม่ระบุทิศทางบวกหรือลบ ระบบจะปฏิเสธคำขอทันทีด้วยข้อผิดพลาด `AMBIGUOUS_ADJUST: ADJUST must specify ADJUST_PLUS or ADJUST_MINUS`

---

## 3. กลไกการตรวจสอบไฟล์นำเข้า CSV แบบ Dry-Run และความปลอดภัย

ระบบได้ติดตั้งเอนจินตรวจสอบไฟล์ CSV นำเข้าใน [`Write.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs) ผ่าน Action `items.validateImport`:

### 3.1 การตรวจสอบความถูกต้องก่อนเขียนชีต (Validation Checklist)
1. **Header Verification**: ตรวจสอบว่าคอลัมน์จำเป็นครบถ้วน (`item_code`, `item_name`, `category`, `unit`, `unit_cost`, `opening_balance`)
2. **Data Type & Range Checks**:
   - `unit_cost` ต้องเป็นตัวเลข $\ge 0$
   - `opening_balance` ห้ามเป็นค่าติดลบ
   - ตรวจสอบหน่วยนับ: หากหน่วยนับเป็นชนิดไม่ต่อเนื่อง (รีม, เล่ม, ชิ้น) จำนวนยกยอดต้องเป็นจำนวนเต็มเท่านั้น
3. **Formula Injection Sanitization**:
   - ฟังก์ชัน `sanitizeCellValue` สแกนทุกช่องข้อมูล หากขึ้นต้นด้วยอักขระสั่งคำนวณ (`=`, `+`, `-`, `@`) ระบบจะเติมอักขระ Single Quote (`'`) นำหน้าทันที เพื่อป้องกันการรันโค้ดอันตรายใน Spreadsheet

### 3.2 ตัวอย่างผลลัพธ์การรัน Dry-Run (Dry-Run Response Sample)
```json
{
  "success": true,
  "action": "items.validateImport",
  "data": {
    "dryRun": true,
    "totalRows": 100,
    "validRows": 98,
    "invalidRows": 2,
    "errors": [
      {
        "row": 15,
        "item_code": "OFF-015",
        "error": "UNIT_FRACTION_INVALID: Item unit 'กล่อง' does not support fractional quantity '2.5'"
      },
      {
        "row": 42,
        "item_code": "SCI-008",
        "error": "NEGATIVE_VALUE: Opening balance cannot be negative '-10'"
      }
    ],
    "sanitizedCount": 3,
    "canCommit": false
  }
}
```

---

## 4. คู่มือขั้นตอนการย้ายข้อมูลทีละขั้น (Step-by-Step Migration Runbook)

```
 [Step 1: Backup] ──► [Step 2: Staging Prep] ──► [Step 3: Dry-Run] ──► [Step 4: Commit] ──► [Step 5: Verify]
```

### ขั้นตอนที่ 1: การสำรองข้อมูลเต็มรูปแบบ (Pre-Migration Full Backup)
1. ผู้ดูแลระบบเข้าสู่หน้า Settings Hub $\rightarrow$ หมวดที่ 7 (การเชื่อมต่อและสำรองข้อมูล)
2. กดปุ่ม **"สร้าง Snapshot สำรองข้อมูลฉุกเฉิน"**
3. ระบบจะคัดลอกข้อมูลทั้ง 16 แผ่นงาน พร้อมคำนวณ SHA-256 Hash และจัดเก็บลงใน Drive Archive Folder

### ขั้นตอนที่ 2: การเตรียมสภาพแวดล้อมจำลอง (Staging Environment Setup)
1. คัดลอก Spreadsheet Production ไปยัง Staging Sandbox
2. เปิดไฟล์ `appsscript.json` บน Staging และระบุ Spreadsheet ID ใหม่
3. ดำเนินการทดสอบสิทธิ์ของ Service Account หรือผู้ Deploy

### ขั้นตอนที่ 3: การรันตรวจสอบแบบ Dry-Run (Execute Dry-Run)
1. รันฟังก์ชัน `apiValidateImportItems` หรือรันสคริปต์ Migration ในโหมดทดลอง:
   ```javascript
   const migrationResult = runMigrationDryRun({
     sourceSpreadsheetId: "LEGACY_SHEET_ID",
     targetSpreadsheetId: "STAGING_SHEET_ID",
     fiscalYear: 2569
   });
   console.log(JSON.stringify(migrationResult));
   ```
2. ตรวจสอบว่า `migrationResult.errors.length === 0`

### ขั้นตอนที่ 4: การยืนยันเขียนข้อมูลจริง (Atomic Commit)
1. สั่งรัน Migration ในโหมด `COMMIT`:
   - ระบบจะเปิด ScriptLock กันผู้ใช้อื่นเข้าถึง
   - สร้าง Opening Balance ใน `10_Stock_Ledger`
   - คำนวณยอดยกมาลง `03_Master_Items`
   - ปล่อย ScriptLock เมื่อเสร็จสิ้น

### ขั้นตอนที่ 5: การกระทบยอดความถูกต้อง (Reconciliation & Audit Check)
1. ตรวจสอบว่า $\sum \text{Ledger Balance} = \sum \text{Master Current Stock}$
2. รันชุดทดสอบความสมบูรณ์ `tests/p8_backend_sheets_architecture_test.js`
3. บันทึกผลการย้ายข้อมูลลงใน `11_Audit_Trail`

---

## 5. แผนการกู้คืนย้อนกลับกรณีฉุกเฉิน (Emergency Rollback Plan)

หากพบข้อผิดพลาดร้ายแรงระหว่างหรือหลังการย้ายข้อมูล ให้ปฏิบัติตามเกณฑ์ถอยกลับทันที:

1. **เกณฑ์การสั่งถอยกลับ (Rollback Triggers)**:
   - ยอดสต็อกรวมใน `03_Master_Items` ไม่ตรงกับผลรวมสุทธิใน `10_Stock_Ledger`
   - พบแถวข้อมูลสูญหาย หรือคีย์พัสดุ (FSN / Item Code) ถูกตัดขาด
   - สคริปต์เกิด Timeout ค้างคาเกินกว่า 60 วินาทีในระหว่างการเขียนชีต
2. **ขั้นตอนการกู้คืนทันที (Immediate Rollback Procedure)**:
   - นำไฟล์ Snapshot Backup จากขั้นตอนที่ 1 มากู้คืนทับ Staging Spreadsheet
   - เคลียร์ Cache และรีเซ็ต `16_Idempotency_Log`
   - ออกประกาศแจ้งเจ้าหน้าที่และตรวจสอบสาเหตุจาก `11_Audit_Trail`
