# 🗄️ DATABASE SCHEMA SPECIFICATION
## ข้อกำหนดโครงสร้างฐานข้อมูลระบบบริหารคลังพัสดุสถานศึกษา
### โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)

**รหัสเอกสาร:** SIMS-DBS-2026-001  
**เวอร์ชันสคีมา:** 2.1 (Production Baseline)  
**เอนจินฐานข้อมูล:** Google Sheets Enterprise Engine  
**วันที่ประกาศใช้:** 27 กันยายน 2569  

---

## 1. แผนภาพความสัมพันธ์เชิงข้อมูล (Entity Relationship Diagram - ERD)

```mermaid
erDiagram
    MASTER_USERS ||--o{ REQUISITIONS : "creates / approves"
    MASTER_USERS ||--o{ STOCK_LEDGER : "acts as"
    MASTER_USERS ||--o{ AUDIT_LOG : "initiates action"
    MASTER_ITEMS ||--o{ STOCK_LEDGER : "tracks movement"
    REQUISITIONS ||--o{ STOCK_LEDGER : "references"

    MASTER_ITEMS {
        string Item_Code PK "รหัสพัสดุ (เช่น OFF-001)"
        string Item_Name "ชื่อพัสดุ"
        string Category "หมวดหมู่พัสดุ"
        string Unit "หน่วยนับ (รีม, กล่อง, ชิ้น)"
        number Stock_Balance "ยอดคงเหลือในคลัง (Derived/Cached)"
        number Safety_Stock "เกณฑ์สต็อกขั้นต่ำ (Min)"
        number ROP "จุดสั่งซื้อซ้ำ (Reorder Point)"
        number Unit_Cost "ราคาต่อหน่วยเฉลี่ย (บาท)"
        string Status "สถานะสต็อก (normal, low, critical)"
        string Last_Updated "วันที่ปรับปรุงล่าสุด (ISO)"
    }

    REQUISITIONS {
        string Req_ID PK "เลขที่ใบเบิก (HRT-INV-REQ-2569/xxx)"
        string Date "วันที่เบิก (DD/MM/YYYY)"
        string Teacher "ชื่อผู้ขอเบิก"
        string Department "กลุ่มสาระการเรียนรู้"
        string Purpose "วัตถุประสงค์การใช้งาน"
        string Status "สถานะ (DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, ISSUED, CANCELLED)"
        string Items_JSON "รายการพัสดุและจำนวน (JSON Array)"
        string Created_At "เวลาสร้างเอกสาร (ISO)"
    }

    STOCK_LEDGER {
        string Ledger_ID PK "รหัสรายการคลัง (LED-YYYYMMDD-xxxx)"
        string Item_ID FK "รหัสพัสดุ (อ้างอิง Master_Items.Item_Code)"
        string Transaction_ID "รหัสธุรกรรมเฉพาะ (Idempotency Key)"
        string Transaction_Type "ประเภท (OPENING, RECEIVE, ISSUE, RETURN, ADJUST_IN, ADJUST_OUT)"
        number Qty_In "จำนวนรับเข้า (>= 0)"
        number Qty_Out "จำนวนจ่ายออก (>= 0)"
        number Unit_Cost "ต้นทุนต่อหน่วย (บาท)"
        number Balance_After "ยอดคงเหลือหลังรายการ (>= 0)"
        integer Fiscal_Year "ปีงบประมาณ พ.ศ. (2569)"
        string Actor_User_ID FK "รหัสผู้ปฏิบัติงาน (อ้างอิง Master_Users.User_ID)"
        string Created_At "เวลาที่บันทึก (ISO 8601 UTC)"
        string Reference_Type "ประเภทเอกสารอ้างอิง (REQUISITION, RECEIPT, AUDIT)"
        string Reference_ID "เลขที่เอกสารอ้างอิง"
        string Note "หมายเหตุประกอบรายการ"
    }

    AUDIT_LOG {
        string Audit_ID PK "รหัสประวัติ (AUD-YYYYMMDD-xxxx)"
        string Timestamp "เวลาบันทึก (ISO 8601)"
        string User_ID FK "รหัสผู้ใช้"
        string Email "อีเมลผู้ใช้งาน"
        string Role "บทบาทสิทธิ์"
        string Action "กิจกรรม (LOGIN_ACCESS, CREATE_REQ, APPROVE, ISSUE_STOCK, ฯลฯ)"
        string Module "โมดูล (AUTH, REQUISITION, STOCK, SECURITY)"
        string Entity_Type "ประเภทข้อมูล (Requisition, Ledger, Session)"
        string Entity_ID "รหัสข้อมูลเป้าหมาย"
        string Old_Value "ข้อมูลเดิม (JSON)"
        string New_Value "ข้อมูลใหม่ (JSON)"
        string Status "ผลการทำงาน (SUCCESS, FAILED, BLOCKED)"
        string Request_ID "รหัสคำขอเชื่อมโยง (UUID)"
        string Prev_Hash "แฮชบล็อกก่อนหน้า (SHA-256)"
        string Current_Hash "แฮชบล็อกปัจจุบัน (SHA-256)"
    }

    MASTER_USERS {
        string User_ID PK "รหัสผู้ใช้ (USR-xxxx-xx)"
        string Name "ชื่อ-นามสกุล"
        string Email "อีเมล Google Workspace (@school.ac.th)"
        string Role "บทบาทหลัก (TEACHER, STAFF_SUPPLY, DIRECTOR)"
        string Role_Title "ตำแหน่งหน้าที่ราชการ"
        string Department "กลุ่มสาระ / ฝ่ายงาน"
        string Permissions "สิทธิ์อนุญาต (Comma-separated list)"
        string Status "สถานะบัญชี (ACTIVE, DISABLED)"
    }
```

---

## 2. รายละเอียดตารางและพจนานุกรมข้อมูล (Data Dictionary)

### 2.1 ตาราง: `Master_Items` (ฐานข้อมูลพัสดุหลัก)
- **Primary Key:** `Item_Code` (ห้ามว่าง, ห้ามซ้ำ, รูปแบบ `[A-Z]{2,4}-\d{3}`)
- **กฎความถูกต้อง:**
  - `Stock_Balance` ต้องเท่ากับผลรวมคณิตศาสตร์ของ `Stock_Ledger`
  - `Safety_Stock` (Min) $\ge 0$
  - `ROP` $\ge$ `Safety_Stock`
  - `Unit_Cost` $\ge 0.00$

### 2.2 ตาราง: `Requisitions` (คำขอเบิกพัสดุ)
- **Primary Key:** `Req_ID` (รูปแบบ `HRT-INV-REQ-2569/xxx`)
- **Foreign Key:** พัสดุใน `Items_JSON` ต้องมีอยู่จริงใน `Master_Items.Item_Code`
- **State Constraint:** สถานะต้องเป็นค่าใดค่าหนึ่งใน: `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `ISSUED`, `CANCELLED`

### 2.3 ตาราง: `Stock_Ledger` (ทะเบียนคุมพัสดุ Append-Only)
- **Primary Key:** `Ledger_ID` (รูปแบบ `LED-YYYYMMDD-xxxx`)
- **Foreign Keys:**
  - `Item_ID` $\rightarrow$ `Master_Items.Item_Code`
  - `Actor_User_ID` $\rightarrow$ `Master_Users.User_ID`
- **Invariant:** $Qty\_In \ge 0$, $Qty\_Out \ge 0$, $Balance\_After \ge 0$ (ห้ามสต็อกติดลบโดยเด็ดขาด)
- **Immutability:** ห้ามแก้ไข (Update) หรือลบ (Delete) แถวข้อมูลเดิมเด็ดขาด

### 2.4 ตาราง: `Audit_Log` (บันทึกประวัติความปลอดภัยและการตรวจสอบ)
- **Primary Key:** `Audit_ID` (รูปแบบ `AUD-YYYYMMDD-xxxx`)
- **Hash Integrity:** คำนวณ SHA-256 Chain จาก $Prev\_Hash + Timestamp + Action + User\_ID + Status$

### 2.5 ตาราง: `Master_Users` (ทะเบียนผู้ใช้งานและสิทธิ์)
- **Primary Key:** `User_ID`
- **Unique Constraint:** `Email` ต้องไม่ซ้ำกัน
- **Account State:** บัญชีสถานะ `DISABLED` จะถูกตัดสิทธิ์การใช้งานทุกฟังก์ชันในระบบ
