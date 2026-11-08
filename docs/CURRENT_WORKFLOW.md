# HRT School Inventory Management System
## CURRENT SYSTEM WORKFLOW & BUSINESS RULES SPECIFICATION
**Document ID:** `DOC-BASELINE-2026-003`  
**Classification:** Baseline Freeze for Pilot Backend Integration  
**Role:** Senior Software Architect & Configuration Manager  
**Date of Freeze:** 2026-09-26  
**Status:** **FROZEN (SYSTEM LOCKED)**  

---

## 1. Overview & Operational Principles

เอกสารฉบับนี้บันทึกกระบวนการทำงานจริง (Actual Workflows) และกฎทางธุรกิจ (Business Rules) ที่สกัดออกมาจากโค้ดของระบบ `index.html` เพื่อใช้เป็นพิมพ์เขียวสำหรับทีมพัฒนา Backend ในการออกแบบ API Endpoints, Database Constraints, และ Background Jobs

---

## 2. End-to-End Operational Workflows

### 2.1 Workflow 1: การขอเบิกและตัดจ่ายพัสดุสถานศึกษา (แบบ พ.ด. ๑)

กระบวนการขอเบิกพัสดุหลายรายการ การตรวจสอบสต็อก และการตัดจ่ายจริงตามระเบียบพัสดุภาครัฐ:

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as ครู / ผู้ขอเบิก
    participant Cart as Multi-Item Cart UI
    participant Validator as Stock Impact Validator
    participant Store as In-Memory Store (allData)
    actor Officer as หัวหน้างาน / ผู้บริหาร
    actor Keeper as เจ้าหน้าที่พัสดุ (ผู้จ่าย)

    Teacher->>Cart: เปิดหน้าต่าง "+ ทำเรื่องขอเบิก" (openMultiItemRequisitionModal)
    Teacher->>Cart: ระบุชื่อ, ฝ่าย/กลุ่มสาระฯ, วัตถุประสงค์
    Teacher->>Cart: เลือกพัสดุ และระบุจำนวนขอเบิก (reqQty)
    Cart->>Validator: ส่ง multiReqRows ตรวจสอบผลกระทบสต็อก
    Validator->>Store: ตรวจสอบ stock เทียบกับ reqQty
    alt จำนวนขอเบิก > สต็อกคงเหลือ
        Validator-->>Cart: แจ้งเตือนสีแดง "สต็อกไม่พอ" + บล็อกปุ่มยืนยัน (Disabled)
    else สต็อกหลังหัก <= Min Stock หรือ ROP
        Validator-->>Cart: แจ้งเตือนสีส้ม "ใกล้ถึงจุด ROP" + อนุญาตให้ทำรายการต่อ
    else สต็อกเพียงพอปกติ
        Validator-->>Cart: แจ้งเตือนสีเขียว "สต็อกพร้อมจ่าย" + เปิดปุ่มยืนยัน
    end
    Teacher->>Cart: กด "ยืนยันสร้างคำขอเบิก" (submitMultiItemRequisition)
    Cart->>Store: สร้างเอกสาร REQ-2567/xxx สถานะ "pending_approval"
    Store-->>Teacher: แสดง Toast สำเร็จ + สลับแท็บไปที่ "รออนุมัติ"
    Officer->>Store: ตรวจสอบคำขอ และกดอนุมัติ (status -> "pending_issue")
    Keeper->>Cart: เปิดหน้าต่างยืนยันตัดจ่าย (openConfirmIssueModal)
    Keeper->>Cart: ระบุจำนวนจ่ายจริง (Actual Qty) และหมายเหตุ
    Keeper->>Store: กด "ยืนยันตัดจ่ายพัสดุ" (executeIssueConfirmation)
    Store->>Store: ตัดลด stock ใน allData, คำนวณ total_val ใหม่
    Store->>Store: บันทึก Transaction ลงใน item.history
    Store->>Store: ปรับสถานะเป็น "completed" หรือ "partial"
    Store-->>Keeper: แสดง Toast สำเร็จ + อัปเดต KPI จ่ายวันนี้
```

---

### 2.2 Workflow 2: การรับเข้าพัสดุและการสั่งซื้อเพิ่ม (แบบ พ.ด. ๒)

กระบวนการนำเข้าพัสดุจากการจัดซื้อหรือรับบริจาคเข้าสู่คลัง:

```mermaid
flowchart TD
    Start(["พัสดุจัดส่งถึงโรงเรียน"]) --> CheckOrder["คณะกรรมการตรวจรับพัสดุตามสัญญา/ใบสั่งซื้อ"]
    CheckOrder --> OpenModal["เจ้าหน้าที่เปิดหน้าต่าง 'รับเข้าพัสดุ' (openAddStockModal)"]
    OpenModal --> SelectItem["เลือกรหัสพัสดุจาก Dropdown"]
    SelectItem --> InputQty["ระบุจำนวนที่รับเข้า (restockQty) และชื่อผู้ตรวจรับ"]
    InputQty --> Submit["กด 'บันทึกรับเข้าคลัง' (submitRestock)"]
    Submit --> UpdateStock["คำนวณ: item.stock = item.stock + restockQty"]
    UpdateStock --> UpdateVal["คำนวณ: item.total_val = item.stock * item.unit_cost"]
    UpdateVal --> RecomputeStatus["ประเมินสถานะสต็อกใหม่: critical / low / normal"]
    RecomputeStatus --> LogHistory["บันทึกประวัติธุรกรรม type: 'in' ใน item.history"]
    LogHistory --> UpdateKPI["รีเฟรช KPI Cards และกราฟ Dashboard"]
    UpdateKPI --> Finish(["เสร็จสิ้นการรับเข้าพัสดุ"])
```

---

### 2.3 Workflow 3: การตรวจนับพัสดุสิ้นปีงบประมาณและการปิดบัญชีประจำปี (แบบ พ.ด. ๕, ๖, ๗)

กระบวนการตรวจสอบพัสดุประจำปีตามระเบียบกระทรวงการคลัง พ.ศ. ๒๕๖๐ ข้อ ๒๑๓:

```mermaid
sequenceDiagram
    autonumber
    actor Committee as คณะกรรมการตรวจนับพัสดุ
    participant AuditUI as ระบบตรวจนับสิ้นปี (viewYearEndAudit)
    participant Store as State Store (auditItemsData)
    participant CloseModal as Modal ปิดบัญชีประจำปี
    participant Snapshots as fiscalYearSnapshots

    Committee->>AuditUI: เข้าสู่หน้าตรวจนับสิ้นปีงบประมาณ (30 กันยายน)
    AuditUI->>Store: ดึงยอดในบัญชี (Book Stock) ทั้ง 100 รายการ
    loop ตรวจนับจริงรายรายการ (1 ถึง 100)
        Committee->>AuditUI: ระบุยอดนับจริง (physicalCount)
        AuditUI->>Store: updatePhysicalCount(code, val)
        Store->>Store: คำนวณ Variance = physicalCount - bookStock
        Committee->>AuditUI: เลือกสภาพพัสดุ (ปกติ / ชำรุดซ่อมได้ / รอจำหน่าย)
        AuditUI->>Store: updateItemCondition(code, cond)
    end
    Committee->>AuditUI: กด "บันทึกผลการตรวจนับ" (saveAuditProgress)
    Committee->>AuditUI: พิมพ์เอกสาร แบบ พ.ด. ๕, พ.ด. ๖, พ.ด. ๗ ให้กรรมการ 3 ฝ่ายลงนาม
    Committee->>AuditUI: กด "ปิดบัญชีพัสดุประจำปีงบ" (openCloseFiscalYearModal)
    AuditUI->>CloseModal: แสดงสรุปยอดคงเหลือยกไป 30 ก.ย. และปีถัดไปที่จะเปิด
    Committee->>CloseModal: กดยืนยันปิดบัญชี (confirmCloseFiscalYear)
    CloseModal->>Snapshots: บันทึก Snapshot ถาวร ณ วันที่ 30 ก.ย.
    CloseModal->>Store: นำยอด physicalCount ไปตั้งเป็น "ยอดยกมาเริ่มต้น" (1 ต.ค.) ของปีถัดไป
    CloseModal->>AuditUI: สลับปีงบประมาณไปยังปีถัดไปอัตโนมัติ (เช่น 2569 -> 2570)
```

---

### 2.4 Workflow 4: การขึ้นทะเบียนและจับคู่รหัสพัสดุมาตรฐานภาครัฐ (FSN Standard)

1. **การตรวจสอบรหัส 13 หลัก**:
   - ระบบจัดกลุ่มตาม Federal Supply Classification: `[Group 2 หลัก][Class 2 หลัก]-[Country 2 หลัก]-[NIIN 7 หลัก]`
   - รหัสประเทศไทยใช้รหัสประเทศ `00`
2. **การจับคู่กับพัสดุภายใน (Catalog Mapping)**:
   - ผู้ใช้เปิดหน้าต่าง `openAddFsnModal()`
   - เลือกรหัสกลุ่ม (Group เช่น `75 - เครื่องเขียนและอุปกรณ์สำนักงาน`)
   - เลือกรหัสชั้น (Class เช่น `10 - กระดาษพิมพ์และเขียน`)
   - ระบบระบุรหัส FSC 4 หลักอัตโนมัติ (`7510`)
   - ทำการจับคู่กับรหัสพัสดุภายในโรงเรียน (`linked_code` เช่น `OFF-002`)
   - บันทึกเข้าสู่ `fsnData` และเปิดให้ดาวน์โหลดสเปก TOR (Simulation)

---

### 2.5 Workflow 5: การออกเอกสารและสั่งพิมพ์แบบฟอร์มราชการ (แบบ พ.ด. ๑–๗)

1. ผู้ใช้สลับไปยังหน้าจอเอกสาร `switchMainView('docs')` และเลือกแท็บเอกสาร
2. ระบบทำการ Hydrate ข้อมูลจาก In-Memory Store ลงใน DOM ของแบบฟอร์ม:
   - **พ.ด. ๑**: ดึงข้อมูลใบเบิกจาก `mockRequisitionPresets` พร้อมชื่อผู้เบิก วันที่ และรายการ
   - **พ.ด. ๔**: ดึงข้อมูล Stock Card ของพัสดุที่เลือก พร้อมธุรกรรมยกมา รับ จ่าย คงเหลือ
   - **พ.ด. ๕**: ดึงยอดรวมแยกตาม 8 หมวดหมู่วัสดุราชการ ยอดเปิด ยอดรับ ยอดจ่าย ยอดยกไป
   - **พ.ด. ๗**: ดึงรายการตรวจนับทั้ง 100 รายการ แบ่งเป็น 4 หน้า หน้าละ 25 รายการ พร้อม Running Header, Running Footer, และบล็อก 3 ลายเซ็น
3. เมื่อคลิกปุ่มพิมพ์ ระบบเรียก `window.print()` โดยมี CSS `@media print` ควบคุมขนาดกระดาษ A4 ตัดส่วนเมนู แถบข้าง และปุ่มออกทั้งหมด

---

### 2.6 Workflow 6: การสำรองข้อมูลและการนำเข้า (Data Backup & CSV Migration)

1. **การส่งออก (Export CSV)**:
   - ฟังก์ชัน `exportToCSV()` ดึงข้อมูลจาก `allData` 100 รายการ
   - เข้ารหัสด้วย `\uFEFF` (UTF-8 with BOM) ป้องกันภาษาไทยเพี้ยนใน MS Excel
   - ดาวน์โหลดไฟล์ชื่อ `Master_Items_HRT_YYYY-MM-DD.csv`
2. **การนำเข้า (Import CSV)**:
   - ผู้ใช้เปิด Modal `openImportModal()` และวางไฟล์ CSV
   - ฟังก์ชัน `parseCsvLine(line)` แยกคอลัมน์โดยรองรับ Comma ภายในเครื่องหมายคำพูด (Escaped Quotes)
   - แสดงตารางตัวอย่าง 5 แถวแรกเพื่อตรวจสอบความถูกต้อง
   - ผู้ใช้เลือกรูปแบบการนำเข้า:
     - **Overwrite (แทนที่ทั้งหมด)**: ล้าง `allData` เดิมแล้วใส่ชุดข้อมูลใหม่
     - **Merge (อัปเดตและเพิ่ม)**: ค้นหาตาม `item_code` หากซ้ำให้อัปเดตข้อมูล หากไม่ซ้ำให้เพิ่มรายการใหม่
   - กดปุ่ม "ยืนยันนำเข้าข้อมูลสู่ระบบ" -> คำนวณสถานะและรีเฟรชหน้าจอทั้งหมด

---

## 3. Business Rules Extracted from Source Code

| รหัสกฎ | ชื่อกฎธุรกิจ | นิยามและเงื่อนไขตาม Source Code | ผลลัพธ์ในระบบ |
|---|---|---|---|
| **BR-01** | **Stock Health Status Thresholds** | - `stock === 0` -> `out_of_stock`<br>- `stock <= min` -> `critical`<br>- `stock > min && stock <= rop` -> `low`<br>- `stock > rop` -> `normal` | แสดงป้ายกำกับ WCAG AA สีเขียว/เหลือง/แดง และจัดคิว Action Center |
| **BR-02** | **Total Valuation Formula** | `total_val = stock * unit_cost` (ตรวจสอบ `!isNaN` และ `isFinite`) | ป้องกันข้อผิดพลาด `NaN` ใน KPI Cards และรายงานทางบัญชี |
| **BR-03** | **ABC Pareto Classification** | เรียงลำดับพัสดุตาม `total_val` จากมากไปน้อย:<br>- สัดส่วนมูลค่าสะสมถึง 70% -> **กลุ่ม A** (ตรวจนับทุกเดือน)<br>- สัดส่วนมูลค่าสะสม 71%–90% -> **กลุ่ม B** (ตรวจนับทุกไตรมาส)<br>- สัดส่วนมูลค่าสะสม 91%–100% -> **กลุ่ม C** (ตรวจนับประจำปี) | ใช้ในกราฟโดนัท Selective Inventory Control และการวางแผนจัดซื้อ |
| **BR-04** | **FSN Turnover Velocity** | คำนวณจากประวัติการเบิกจ่าย (`type !== 'in'`):<br>- ยอดเบิกสะสม >= 10 หรือจำนวนครั้ง >= 2 -> **Fast-Moving**<br>- ยอดเบิกสะสม > 0 แต่น้อยกว่า 10 -> **Slow-Moving**<br>- ไม่มียอดเบิกเลย -> **Non-Moving (Dead Stock)** | ใช้จัดผังคลังพัสดุ (ของหมุนเร็ววางใกล้ประตู) และระงับสั่งซื้อของค้าง |
| **BR-05** | **Fiscal Year Definition** | ปีงบประมาณราชการไทยเริ่มต้น **1 ตุลาคม** และสิ้นสุด **30 กันยายน** ของปีถัดไป (ปัจจุบันตั้งต้นที่ พ.ศ. 2569: 1 ต.ค. 2568 – 30 ก.ย. 2569) | แกนเวลากราฟและรายงาน พ.ด. ๑–๗ ยึดรอบ 1 ต.ค. – 30 ก.ย. เสมอ |
| **BR-06** | **Role-Based Access Control (RBAC)** | - `officer`: เข้าถึงได้ทุกฟังก์ชัน รวมถึงการปิดบัญชีสิ้นปี, ตรวจรับ, และอนุมัติใบเบิก<br>- `teacher`: ดูแคตตาล็อกพัสดุ, ทำเรื่องขอเบิก, ดูประวัติส่วนตัว (ซ่อนเมนูตรวจนับสิ้นปี) | ซ่อน/แสดงเมนูและปุ่มคำสั่งตามสิทธิ์ผู้ใช้งาน |
| **BR-07** | **Physical Audit Variance Calculation** | `variance = physicalCount - bookStock`<br>- `variance === 0`: ยอดตรงตามบัญชี<br>- `variance < 0`: พัสดุขาดจากบัญชี (Loss)<br>- `variance > 0`: พัสดุเกินจากบัญชี (Surplus) | แสดงในรายงาน พ.ด. ๗ เพื่อให้คณะกรรมการชี้แจงเหตุผล |
| **BR-08** | **Requisition Safety Ceiling** | `reqQty <= stock` (จำนวนขอเบิกต้องไม่เกินยอดคงเหลือในคลังขณะทำรายการ) | ป้องกันปัญหาสต็อกติดลบ และบล็อกปุ่มส่งคำขอทันที |
| **BR-09** | **Official Document 3-Party Signatures** | เอกสารราชการ (พ.ด. ๑, ๕, ๖, ๗) ต้องมีบล็อกลายเซ็น 3 ฝ่าย:<br>1. ผู้ขอเบิก / ผู้ตรวจนับ<br>2. หัวหน้าเจ้าหน้าที่พัสดุ<br>3. หัวหน้ากลุ่มบริหารงานงบประมาณ / ผู้อำนวยการสถานศึกษา | เรนเดอร์ลงในเอกสารสำหรับพิมพ์เพื่อความสมบูรณ์ตามกฎหมาย |

---

**ลงนามรับรองความถูกต้องของ Workflow และ Business Rules:**  
*Senior Software Architect & Configuration Management Team*  
*วันที่ 26 กันยายน 2569*
