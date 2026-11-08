# HRT School Inventory Management System
## COMPREHENSIVE DATA DICTIONARY
**Document ID:** `DOC-DICT-2026-001`  
**Classification:** Enterprise Data Governance & Field Reference  
**Platform Target:** Google Sheets Central DB (Pilot Phase)  
**Role:** Senior Software Architect & Data Governance Lead  
**Date:** 2026-09-26  
**Status:** **APPROVED (VERSION 1.0)**  

---

## 1. Domain Overview & Regulatory Grounding

พจนานุกรมข้อมูล (Data Dictionary) ฉบับนี้ให้คำนิยามเชิงลึกของทุกฟิลด์ใน 15 ตารางฐานข้อมูลกลาง โดยอ้างอิงมาตรฐานทางราชการ:
- **ระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖๐** (หมวด ๙ การบริหารพัสดุ ข้อ ๒๐๔–๒๑๙)
- **หนังสือกระทรวงการคลัง ที่ กค ๐๔๐๖.๔/ว ๙๖** (การจำแนกประเภทรายจ่ายตามงบประมาณ หมวดค่าวัสดุ ๘ ประเภท)
- **ระบบรหัสพัสดุภาครัฐ (Federal Supply Classification - FSN)** กรมบัญชีกลาง

---

## 2. Table-by-Table Data Dictionary

---

### 2.1 Table `01_Users` (ทะเบียนผู้ใช้งาน)

| Field Name | Type | Key | Default | Allowed Values / Enum | Business Description & Validation Rules | Example |
|---|---|:---:|---|---|---|---|
| `user_id` | STRING(36) | **PK** | - | Format: `USR-[0-9]{3,}` | รหัสผู้ใช้งานคงที่ ห้ามซ้ำ ใช้เป็น Foreign Key ในทุกตาราง | `USR-001` |
| `username` | STRING(50) | UK | - | Regex: `^[a-z0-9._]{3,30}$` | ชื่อบัญชีผู้ใช้งาน ไม่เว้นวรรค ตัวพิมพ์เล็ก | `anant.m` |
| `email` | STRING(100) | UK | - | Domain: `@hrt.ac.th` | อีเมลสถาบัน ใช้ผูกกับ Google Workspace SSO | `anant.m@hrt.ac.th` |
| `full_name` | STRING(100) | - | - | ภาษาไทย พร้อมคำนำหน้า | ชื่อ-สกุลทางการ สำหรับลงนามในเอกสารราชการ พ.ด. ๑–๗ | `นายอนันต์ มั่นคง` |
| `role_id` | STRING(20) | FK | - | Ref `02_Roles` | บทบาทหน้าที่หลักในการใช้งานระบบ | `ROL_OFFICER` |
| `department` | STRING(100) | - | - | 8 กลุ่มสาระฯ / 4 ฝ่ายงาน | หน่วยงานต้นสังกัดในโรงเรียน | `กลุ่มบริหารงานงบประมาณ` |
| `position` | STRING(100) | - | - | ข้อความ | ตำแหน่งทางการตามสายงาน ก.พ. / ก.ค.ศ. | `เจ้าหน้าที่พัสดุ` |
| `is_active` | BOOLEAN | - | `TRUE` | `TRUE`, `FALSE` | สถานะการทำงาน (`FALSE` บล็อกการล็อกอินทันที) | `TRUE` |
| `created_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่บันทึกเข้าระบบ | `2026-09-26T08:00:00Z` |
| `updated_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่มีการแก้ไขข้อมูลล่าสุด | `2026-09-26T08:00:00Z` |

---

### 2.2 Table `02_Roles` (ทะเบียนบทบาทและสิทธิ์)

| Field Name | Type | Key | Default | Allowed Values / Enum | Business Description & Validation Rules | Example |
|---|---|:---:|---|---|---|---|
| `role_id` | STRING(20) | **PK** | - | `ROL_ADMIN`, `ROL_OFFICER`, `ROL_TEACHER`, `ROL_AUDITOR` | รหัสบทบาทตามหลักการ Least Privilege | `ROL_OFFICER` |
| `role_name` | STRING(50) | - | - | ข้อความภาษาไทย | ชื่อบทบาทแสดงผลในหน้าจอ UI | `หัวหน้าเจ้าหน้าที่พัสดุ` |
| `description` | STRING(255) | - | NULL | ข้อความ | คำอธิบายความรับผิดชอบและขอบเขตหน้าที่ | `บริหารจัดการคลัง อนุมัติใบเบิก และปิดบัญชีประจำปี` |
| `permissions` | TEXT | - | `[]` | JSON Array of strings | รายการสิทธิ์ เช่น `["item:*", "req:approve", "audit:close"]` | `["item:read","req:create"]` |
| `created_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่สร้างบทบาท | `2026-09-26T08:00:00Z` |
| `updated_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่แก้ไขล่าสุด | `2026-09-26T08:00:00Z` |

---

### 2.3 Table `03_Items` (ทะเบียนพัสดุหลัก)

| Field Name | Type | Key | Default | Allowed Values / Enum | Business Description & Validation Rules | Example |
|---|---|:---:|---|---|---|---|
| `item_id` | STRING(36) | **PK** | - | Format: `ITM-[A-Z]{2,4}-[0-9]{3,}` | รหัสประจำตัวเรคคอร์ดพัสดุ ห้ามเปลี่ยนแปลง | `ITM-OFF-001` |
| `item_code` | STRING(20) | UK | - | Format: `^[A-Z]{2,4}-[0-9]{3}$` | รหัสพัสดุที่ใช้เรียกขานภายในโรงเรียน (ห้ามซ้ำ) | `OFF-001` |
| `item_name` | STRING(200) | - | - | ความยาว 5–200 ตัวอักษร | ชื่อพัสดุทางการระบุยี่ห้อ ขนาด สเปก ให้ชัดเจน | `กระดาษถ่ายเอกสาร A4 70 แกรม Double A` |
| `category_id` | STRING(20) | FK | - | Ref `15_Categories` | หมวดหมู่วัสดุราชการ 8 หมวด | `CAT-OFF` |
| `location_id` | STRING(20) | FK | - | Ref `14_Locations` | จุดจัดเก็บหลักในโรงเรียน | `LOC-MAIN` |
| `fsn_code` | STRING(16) | - | NULL | Format: `\d{4}-\d{2}-\d{3}-\d{4}` | รหัสพัสดุมาตรฐานภาครัฐ 13 หลัก กรมบัญชีกลาง | `7510-00-582-4112` |
| `unit` | STRING(30) | - | - | เช่น `รีม`, `ด้าม`, `เครื่อง` | หน่วยนับมาตรฐานตามประกาศราชการ | `รีม` |
| `unit_cost` | DECIMAL(12,2)| - | `0.00` | ตัวเลข >= 0 | ราคาทุนมาตรฐานต่อหน่วย (บาท) สองตำแหน่ง | `115.00` |
| `min_stock` | INTEGER | - | `0` | จำนวนเต็ม >= 0 | เกณฑ์สต็อกขั้นต่ำ (ต่ำกว่านี้ = Critical Stock) | `20` |
| `reorder_point`| INTEGER | - | `0` | จำนวนเต็ม >= min_stock | จุดสั่งซื้อซ้ำ (ต่ำกว่านี้ = Low / ROP Warning) | `40` |
| `supplier_name`| STRING(150) | - | NULL | ข้อความ | ชื่อร้านค้าหรือคู่สัญญาที่เคยสั่งซื้อ | `บจก. ออฟฟิศเมท` |
| `spec_summary` | STRING(500) | - | NULL | ข้อความ | คุณลักษณะเฉพาะทางเทคนิค (TOR / มอก.) | `มอก. 1054-2552 ความขาวสว่าง 92%` |
| `is_active` | BOOLEAN | - | `TRUE` | `TRUE`, `FALSE` | พัสดุยังมีการใช้งานหรือไม่ (`FALSE` = ระงับการเบิก) | `TRUE` |
| `created_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่สร้างเรคคอร์ด | `2026-09-26T08:00:00Z` |
| `updated_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่แก้ไขล่าสุด | `2026-09-26T08:00:00Z` |

---

### 2.4 Table `04_Requisitions` (ส่วนหัวคำขอเบิกพัสดุ - แบบ พ.ด. ๑)

| Field Name | Type | Key | Default | Allowed Values / Enum | Business Description & Validation Rules | Example |
|---|---|:---:|---|---|---|---|
| `requisition_id`| STRING(36)| **PK** | - | Format: `REQ-[0-9]{4}-[0-9]{4}` | รหัสคำขอเบิกพัสดุ | `REQ-2569-0018` |
| `doc_no` | STRING(30) | UK | - | Format: `พ.ด.๑-[0-9]{4}/[0-9]{3,}`| เลขที่เอกสารทางการสำหรับพิมพ์ใบเบิก | `พ.ด.๑-2569/018` |
| `fiscal_year_id`| STRING(10)| FK | - | Ref `11_Fiscal_Years` | ปีงบประมาณที่เกิดธุรกรรม | `FY-2569` |
| `requester_id` | STRING(36) | FK | - | Ref `01_Users` | รหัสผู้ขอเบิก (ครู/บุคลากร) | `USR-004` |
| `requester_name`| STRING(100)| - | - | ข้อความ | Snapshot ชื่อผู้เบิก ณ วันที่ขอ (ป้องกันชื่อเปลี่ยนภายหลัง) | `ครูกัญญา สร้อยสว่าง` |
| `department` | STRING(100)| - | - | ข้อความ | Snapshot กลุ่มสาระฯ หรือฝ่ายงาน | `กลุ่มสาระฯ ภาษาไทย` |
| `purpose` | STRING(255)| - | - | ความยาว 5–255 ตัวอักษร | วัตถุประสงค์ในการขอเบิกใช้งาน | `ใช้จัดการเรียนการสอน ภาคเรียนที่ 1/2569` |
| `status` | ENUM | - | `DRAFT` | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `PARTIAL_ISSUED`, `COMPLETED`, `REJECTED`, `CANCELLED` | สถานะของใบเบิกตาม Workflow ทางราชการ | `PENDING_APPROVAL` |
| `request_date` | DATE | - | Today | `YYYY-MM-DD` | วันที่ทำเรื่องขอเบิก | `2026-05-15` |
| `approved_by` | STRING(36) | FK | NULL | Ref `01_Users` | ผู้มีอำนาจลงนามอนุมัติ (หัวหน้างาน/ผอ.) | `USR-002` |
| `approved_at` | TIMESTAMP | - | NULL | ISO-8601 UTC | วันเวลาที่ลงนามอนุมัติ | `2026-05-16T09:30:00Z` |
| `rejection_note`| STRING(255)| - | NULL | ข้อความ | เหตุผลกรณีไม่อนุมัติคำขอ | `งบประมาณโครงการนี้ถูกระงับชั่วคราว` |
| `created_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่สร้างคำขอ | `2026-05-15T08:15:00Z` |
| `updated_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่อัปเดตล่าสุด | `2026-05-16T09:30:00Z` |

---

### 2.5 Table `05_Requisition_Items` (รายการในคำขอเบิก)

| Field Name | Type | Key | Default | Allowed Values / Enum | Business Description & Validation Rules | Example |
|---|---|:---:|---|---|---|---|
| `req_item_id` | STRING(36) | **PK** | - | Format: `RQI-[0-9]{4}-[0-9]{4}-[0-9]{2}` | รหัสประจำรายการในคำขอเบิก | `RQI-2569-0018-01` |
| `requisition_id`| STRING(36)| FK | - | Ref `04_Requisitions` | เชื่อมโยงใบขอเบิกหลัก | `REQ-2569-0018` |
| `item_id` | STRING(36) | FK | - | Ref `03_Items` | รหัสพัสดุที่ต้องการเบิก | `ITM-OFF-001` |
| `requested_qty` | INTEGER | - | `1` | จำนวนเต็ม > 0 | ปริมาณที่ระบุขอเบิก | `5` |
| `approved_qty` | INTEGER | - | `0` | 0 <= approved <= requested | ปริมาณที่ผู้อนุมัติเห็นชอบให้เบิก | `5` |
| `issued_qty` | INTEGER | - | `0` | 0 <= issued <= approved | ปริมาณที่ตัดจ่ายให้จริงสะสม | `5` |
| `unit` | STRING(30) | - | - | ข้อความ | Snapshot หน่วยนับ | `รีม` |
| `item_status` | ENUM | - | `PENDING`| `PENDING`, `APPROVED`, `PARTIAL`, `FULFILLED`, `REJECTED` | สถานะของรายการพัสดุชิ้นนี้ | `FULFILLED` |
| `notes` | STRING(255)| - | NULL | ข้อความ | หมายเหตุรายรายการ | `ตัดจ่ายครบถ้วน` |
| `created_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่สร้าง | `2026-05-15T08:15:00Z` |
| `updated_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่อัปเดตล่าสุด | `2026-05-16T10:00:00Z` |

---

### 2.6 Table `06_Transactions` (ส่วนหัวธุรกรรมการเคลื่อนไหวพัสดุ)

| Field Name | Type | Key | Default | Allowed Values / Enum | Business Description & Validation Rules | Example |
|---|---|:---:|---|---|---|---|
| `transaction_id`| STRING(36)| **PK** | - | Format: `TXN-[0-9]{4}-[0-9]{4}` | รหัสธุรกรรมการเคลื่อนย้ายพัสดุ | `TXN-2569-0042` |
| `doc_no` | STRING(30) | UK | - | ข้อความเอกสารทางการ | เลขที่เอกสารทางบัญชีพัสดุ | `TX-2569-042` |
| `fiscal_year_id`| STRING(10)| FK | - | Ref `11_Fiscal_Years` | ปีงบประมาณที่เกิดรายการ | `FY-2569` |
| `transaction_type`| ENUM | - | - | `RECEIVE`, `ISSUE`, `ADJUSTMENT`, `RETURN`, `TRANSFER` | ชนิดธุรกรรมทางกายภาพ | `ISSUE` |
| `ref_doc_type` | ENUM | - | - | `REQUISITION`, `PURCHASE_ORDER`, `PHYSICAL_COUNT`, `RETURN_SLIP`, `MANUAL` | ประเภทเอกสารอ้างอิงต้นเรื่อง | `REQUISITION` |
| `ref_doc_id` | STRING(50) | - | NULL | รหัสเอกสารต้นเรื่อง | รหัสเชื่อมโยง (เช่น `REQ-2569-0018`) | `REQ-2569-0018` |
| `transaction_date`| DATE | - | Today | `YYYY-MM-DD` | วันที่เกิดการส่งมอบ/รับพัสดุจริง | `2026-05-16` |
| `performed_by` | STRING(36) | FK | - | Ref `01_Users` | เจ้าหน้าที่ผู้ดำเนินการตัดจ่าย/ตรวจรับ | `USR-001` |
| `counterparty` | STRING(150)| - | NULL | ข้อความ | ผู้รับมอบหรือผู้ส่งมอบภายนอก | `ครูกัญญา สร้อยสว่าง` |
| `notes` | STRING(255)| - | NULL | ข้อความ | หมายเหตุการทำรายการ | `จ่ายพัสดุตามใบเบิก REQ-2569-0018` |
| `status` | ENUM | - | `POSTED` | `POSTED`, `VOIDED` | สถานะธุรกรรม (`VOIDED` หมายถึงถูกยกเลิก) | `POSTED` |
| `created_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่บันทึกข้อมูล | `2026-05-16T10:00:00Z` |
| `updated_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่อัปเดตล่าสุด | `2026-05-16T10:00:00Z` |

---

### 2.7 Table `07_Transaction_Items` (รายการพัสดุในธุรกรรม)

| Field Name | Type | Key | Default | Allowed Values / Enum | Business Description & Validation Rules | Example |
|---|---|:---:|---|---|---|---|
| `txn_item_id` | STRING(36) | **PK** | - | Format: `TXI-[0-9]{4}-[0-9]{4}-[0-9]{2}` | รหัสประจำรายการในธุรกรรม | `TXI-2569-0042-01` |
| `transaction_id`| STRING(36)| FK | - | Ref `06_Transactions` | เชื่อมโยงธุรกรรมหลัก | `TXN-2569-0042` |
| `item_id` | STRING(36) | FK | - | Ref `03_Items` | รหัสพัสดุที่เคลื่อนไหว | `ITM-OFF-001` |
| `location_id` | STRING(20) | FK | - | Ref `14_Locations` | คลังพัสดุที่รับเข้าหรือจ่ายออก | `LOC-MAIN` |
| `quantity` | INTEGER | - | `1` | จำนวนเต็ม > 0 | ปริมาณที่เคลื่อนไหวจริง | `5` |
| `unit_cost` | DECIMAL(12,2)| - | `0.00` | ตัวเลข >= 0 | ราคาทุนต่อหน่วย ณ ขณะทำรายการ | `115.00` |
| `total_cost` | DECIMAL(12,2)| - | `0.00` | `quantity * unit_cost` | มูลค่ารวมของรายการ | `575.00` |
| `ref_req_item_id`| STRING(36)| FK | NULL | Ref `05_Requisition_Items` | เชื่อมโยงรายการใบเบิก (กรณีจ่ายพัสดุ) | `RQI-2569-0018-01` |
| `notes` | STRING(255)| - | NULL | ข้อความ | หมายเหตุรายรายการ | `จ่ายครบตามคำขอ` |
| `created_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่บันทึก | `2026-05-16T10:00:00Z` |

---

### 2.8 Table `08_Stock_Ledger` (บัญชีคุมยอดพัสดุแบบ Append-Only)

> [!IMPORTANT]
> **IMMUTABLE LEDGER LAW:**  
> ตารางนี้เป็นหัวใจของระบบคลัง ห้ามแก้ไข (Update) หรือลบ (Delete) เรคคอร์ดโดยเด็ดขาด การแก้ไขข้อผิดพลาดต้องทำผ่านการบันทึกรายการประเภท `CANCEL` หรือ `ADJUST` เพื่อปรับยอดให้ถูกต้องตามมาตรฐานการบัญชีภาครัฐ

| Field Name | Type | Key | Default | Allowed Values / Enum | Business Description & Validation Rules | Example |
|---|---|:---:|---|---|---|---|
| `ledger_id` | STRING(36) | **PK** | - | Format: `LED-[0-9]{4}-[0-9]{6}` | รหัสบรรทัดบัญชีคุม (Sequential Unique) | `LED-2569-000142` |
| `fiscal_year_id`| STRING(10)| FK | - | Ref `11_Fiscal_Years` | ปีงบประมาณของรายการบัญชี | `FY-2569` |
| `entry_timestamp`| TIMESTAMP| - | Now | ISO-8601 UTC | วันเวลาที่เกิดผลทางบัญชีจริง (ใช้จัดเรียง Stock Card) | `2026-05-16T10:00:00Z` |
| `item_id` | STRING(36) | FK | - | Ref `03_Items` | พัสดุที่ลงบัญชี | `ITM-OFF-001` |
| `location_id` | STRING(20) | FK | - | Ref `14_Locations` | คลังพัสดุที่สต็อกเปลี่ยนแปลง | `LOC-MAIN` |
| `movement_type` | ENUM | - | - | **7 ค่าควบคุม:**<br>1. `OPENING` (ยอดยกมา 1 ต.ค.)<br>2. `RECEIVE` (รับเข้าจากการซื้อ/บริจาค)<br>3. `ISSUE` (จ่ายตามใบเบิก พ.ด. ๑)<br>4. `ADJUST_IN` (ปรับยอดเพิ่มจากการนับเกิน)<br>5. `ADJUST_OUT` (ปรับยอดลด ชำรุด/สูญหาย)<br>6. `RETURN` (ส่งคืนพัสดุ พ.ด. ๓)<br>7. `CANCEL` (ยกเลิกรายการเดิม) | รหัสประเภทการเคลื่อนไหวทางบัญชีตามระเบียบพัสดุ | `ISSUE` |
| `transaction_id`| STRING(36)| FK | NULL | Ref `06_Transactions` | เอกสารธุรกรรมอ้างอิง (NULL เฉพาะ OPENING) | `TXN-2569-0042` |
| `txn_item_id` | STRING(36) | FK | NULL | Ref `07_Transaction_Items`| รายการย่อยในธุรกรรม | `TXI-2569-0042-01` |
| `qty_in` | INTEGER | - | `0` | จำนวนเต็ม >= 0 | ปริมาณรับเข้าในรายการนี้ (ถ้าจ่ายออก = 0) | `0` |
| `qty_out` | INTEGER | - | `0` | จำนวนเต็ม >= 0 | ปริมาณจ่ายออกในรายการนี้ (ถ้ารับเข้า = 0) | `5` |
| `qty_net` | INTEGER | - | `0` | `qty_in - qty_out` | ผลต่างสุทธิต่อสต็อก (+ เพิ่ม, - ลด) | `-5` |
| `unit_cost` | DECIMAL(12,2)| - | `0.00` | ตัวเลข >= 0 | ราคาทุนต่อหน่วย ณ รายการนั้น | `115.00` |
| `val_in` | DECIMAL(12,2)| - | `0.00` | `qty_in * unit_cost` | มูลค่ารับเข้า (บาท) | `0.00` |
| `val_out` | DECIMAL(12,2)| - | `0.00` | `qty_out * unit_cost` | มูลค่าจ่ายออก (บาท) | `575.00` |
| `val_net` | DECIMAL(12,2)| - | `0.00` | `val_in - val_out` | มูลค่าสุทธิที่ส่งผลต่อบัญชีทรัพย์สิน | `-575.00` |
| `balance_qty` | INTEGER | - | - | จำนวนเต็ม >= 0 | **ยอดคงเหลือสะสม ณ บรรทัดนี้** (ห้ามติดลบ) | `45` |
| `balance_val` | DECIMAL(12,2)| - | - | ตัวเลข >= 0 | **มูลค่าคงเหลือสะสม ณ บรรทัดนี้** | `5175.00` |
| `ref_doc_no` | STRING(30) | - | - | ข้อความ | เลขที่เอกสารอ้างอิงแสดงใน Stock Card | `พ.ด.๑-2569/018` |
| `created_by` | STRING(36) | FK | - | Ref `01_Users` | เจ้าหน้าที่ผู้กระทำการ | `USR-001` |
| `is_voided` | BOOLEAN | - | `FALSE` | `TRUE`, `FALSE` | ติด Flag `TRUE` เมื่อมีรายการ CANCEL มาหักล้าง | `FALSE` |

---

### 2.9 Table `09_Audit_Log` (บันทึกประวัติการกระทำในระบบ)

| Field Name | Type | Key | Default | Allowed Values / Enum | Business Description & Validation Rules | Example |
|---|---|:---:|---|---|---|---|
| `audit_id` | STRING(36) | **PK** | - | Format: `AUD-[0-9]{4}-[0-9]{6}` | รหัสบันทึกประวัติระบบ | `AUD-2569-000412` |
| `timestamp` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่เกิดเหตุการณ์ | `2026-05-16T10:00:01Z` |
| `user_id` | STRING(36) | FK | NULL | Ref `01_Users` | ผู้กระทำการ (NULL หากเป็น Automatic Job) | `USR-001` |
| `action` | ENUM | - | - | `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT`, `APPROVE`, `REJECT`, `POST`, `VOID`, `AUDIT_COUNT`, `CLOSE_FY` | ประเภทการกระทำ | `POST` |
| `entity_name` | STRING(50) | - | - | เช่น `06_Transactions`, `08_Stock_Ledger` | ชื่อตารางที่เกิดการเปลี่ยนแปลง | `08_Stock_Ledger` |
| `entity_id` | STRING(50) | - | - | Primary Key ของเรคคอร์ด | รหัสคีย์ของข้อมูลที่เปลี่ยนแปลง | `LED-2569-000142` |
| `old_values` | TEXT | - | NULL | JSON String | ค่าเดิมก่อนแก้ไข (Snapshot) | `{"balance_qty": 50}` |
| `new_values` | TEXT | - | NULL | JSON String | ค่าใหม่หลังแก้ไข (Snapshot) | `{"balance_qty": 45}` |
| `ip_address` | STRING(45) | - | NULL | IPv4 / IPv6 format | ที่อยู่ IP ของเครื่องไคลเอนต์ | `192.168.1.105` |
| `user_agent` | STRING(255)| - | NULL | ข้อความ | ข้อมูลเบราว์เซอร์และระบบปฏิบัติการ | `Mozilla/5.0 Windows NT 10.0` |
| `status` | ENUM | - | `SUCCESS` | `SUCCESS`, `FAILURE` | ผลลัพธ์ของการกระทำ | `SUCCESS` |
| `details` | STRING(255)| - | NULL | ข้อความ | รายละเอียดเพิ่มเติมหรือ Error Stack | `ตัดจ่ายสำเร็จ 5 รีม` |

---

### 2.10 Table `10_System_Config` (ค่ากำหนดระบบ)

| Field Name | Type | Key | Default | Allowed Values / Enum | Business Description & Validation Rules | Example |
|---|---|:---:|---|---|---|---|
| `config_key` | STRING(50) | **PK** | - | ตัวพิมพ์ใหญ่คั่นด้วย `_` | ชื่อตัวแปรตั้งค่าระดับระบบ (ห้ามซ้ำ) | `SYS_ACTIVE_FISCAL_YEAR` |
| `config_value`| STRING(255)| - | - | ข้อความ | ค่าของการตั้งค่า | `2569` |
| `value_type` | ENUM | - | `STRING` | `STRING`, `NUMBER`, `BOOLEAN`, `JSON` | ชนิดข้อมูลของค่าตั้งค่า | `STRING` |
| `description` | STRING(255)| - | - | ข้อความภาษาไทย | คำอธิบายหน้าที่ของตัวแปร | `ปีงบประมาณหลักที่ระบบกำลังดำเนินการ` |
| `is_locked` | BOOLEAN | - | `FALSE` | `TRUE`, `FALSE` | ป้องกันการแก้ไขจากหน้า UI ทั่วไป | `TRUE` |
| `updated_by` | STRING(36) | FK | - | Ref `01_Users` | ผู้แก้ไขล่าสุด | `USR-001` |
| `updated_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่แก้ไข | `2026-09-26T08:00:00Z` |

---

### 2.11 Table `11_Fiscal_Years` (รอบปีงบประมาณ)

| Field Name | Type | Key | Default | Allowed Values / Enum | Business Description & Validation Rules | Example |
|---|---|:---:|---|---|---|---|
| `fiscal_year_id`| STRING(10)| **PK** | - | Format: `FY-[0-9]{4}` | รหัสรอบปีงบประมาณ | `FY-2569` |
| `year_th` | INTEGER | UK | - | เช่น 2568, 2569, 2570 | ปี พ.ศ. ของรอบปีงบประมาณ | `2569` |
| `year_en` | INTEGER | UK | - | `year_th - 543` | ปี ค.ศ. เทียบเท่า | `2026` |
| `start_date` | DATE | - | - | `YYYY-10-01` | วันเริ่มต้นรอบปีงบ (1 ตุลาคม) | `2025-10-01` |
| `end_date` | DATE | - | - | `YYYY-09-30` | วันสิ้นสุดรอบปีงบ (30 กันยายน) | `2026-09-30` |
| `status` | ENUM | - | `PLANNED` | `PLANNED`, `ACTIVE`, `CLOSING_IN_PROGRESS`, `CLOSED`, `ARCHIVED` | สถานะรอบบัญชีปีงบประมาณ | `ACTIVE` |
| `closed_at` | TIMESTAMP | - | NULL | ISO-8601 UTC | วันเวลาที่ปิดบัญชีเสร็จสิ้น | `2026-09-30T23:59:59Z` |
| `closed_by` | STRING(36) | FK | NULL | Ref `01_Users` | ผู้อนุมัติปิดบัญชี | `USR-002` |
| `notes` | STRING(255)| - | NULL | ข้อความ | หมายเหตุการดำเนินงาน | `รอบปกติ สังกัด อบจ.สระบุรี` |
| `created_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่สร้างเรคคอร์ด | `2025-09-01T00:00:00Z` |
| `updated_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่แก้ไขล่าสุด | `2026-09-26T08:00:00Z` |

---

### 2.12 Table `12_Physical_Counts` (ส่วนหัวการตรวจนับพัสดุสิ้นปี - แบบ พ.ด. ๕-๖)

| Field Name | Type | Key | Default | Allowed Values / Enum | Business Description & Validation Rules | Example |
|---|---|:---:|---|---|---|---|
| `count_id` | STRING(36) | **PK** | - | Format: `PC-[0-9]{4}-[A-Z0-9]+` | รหัสรอบการตรวจนับพัสดุ | `PC-2569-ANNUAL` |
| `fiscal_year_id`| STRING(10)| FK | - | Ref `11_Fiscal_Years` | ปีงบประมาณที่ทำการตรวจนับ | `FY-2569` |
| `count_type` | ENUM | - | `ANNUAL_CLOSING`| `ANNUAL_CLOSING`, `MID_YEAR`, `CYCLE_COUNT`, `SPOT_CHECK` | วัตถุประสงค์การตรวจนับ | `ANNUAL_CLOSING` |
| `count_date` | DATE | - | - | `YYYY-09-30` | วันที่ทำรายงานตรวจนับ (30 กันยายน) | `2026-09-30` |
| `title` | STRING(200)| - | - | ข้อความ | หัวข้อรายงานการตรวจสอบพัสดุ | `รายงานการตรวจนับพัสดุประจำปีงบประมาณ พ.ศ. 2569` |
| `status` | ENUM | - | `DRAFT` | `DRAFT`, `IN_PROGRESS`, `RECONCILED`, `APPROVED`, `POSTED_TO_LEDGER` | สถานะการดำเนินงานของคณะกรรมการ | `APPROVED` |
| `committee_head`| STRING(100)| - | - | ข้อความ | ประธานกรรมการตรวจนับ (ลายเซ็นที่ 1) | `นายอนันต์ มั่นคง` |
| `inspector_name`| STRING(100)| - | - | ข้อความ | หัวหน้าเจ้าหน้าที่พัสดุผู้ตรวจ (ลายเซ็นที่ 2) | `นายวิชัย สุวรรณโชติ` |
| `approver_name` | STRING(100)| - | - | ข้อความ | หัวหน้ากลุ่มงบประมาณ/ผอ. (ลายเซ็นที่ 3) | `นางกัลยาณี เกษมสุข` |
| `total_items` | INTEGER | - | `100` | จำนวนเต็ม >= 0 | จำนวนชนิดพัสดุที่ตรวจนับทั้งหมด | `100` |
| `variance_items`| INTEGER | - | `0` | จำนวนเต็ม >= 0 | จำนวนรายการที่ยอดไม่ตรงบัญชี | `3` |
| `created_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่สร้างการตรวจนับ | `2026-09-25T08:00:00Z` |
| `updated_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่แก้ไขล่าสุด | `2026-09-30T17:00:00Z` |

---

### 2.13 Table `13_Physical_Count_Items` (รายการตรวจนับเทียบยอดบัญชี - แบบ พ.ด. ๗)

| Field Name | Type | Key | Default | Allowed Values / Enum | Business Description & Validation Rules | Example |
|---|---|:---:|---|---|---|---|
| `count_item_id` | STRING(36) | **PK** | - | Format: `PCI-[0-9]{4}-[0-9]{3}-[0-9]{3}` | รหัสประจำบรรทัดการตรวจนับ | `PCI-2569-001-001` |
| `count_id` | STRING(36) | FK | - | Ref `12_Physical_Counts` | เชื่อมโยงรอบการตรวจนับหลัก | `PC-2569-ANNUAL` |
| `item_id` | STRING(36) | FK | - | Ref `03_Items` | รหัสพัสดุที่ถูกตรวจนับ | `ITM-OFF-001` |
| `location_id` | STRING(20) | FK | - | Ref `14_Locations` | จุดจัดเก็บที่เข้าไปตรวจนับ | `LOC-MAIN` |
| `book_qty` | INTEGER | - | `0` | จำนวนเต็ม >= 0 | ยอดคงเหลือตามบัญชี ณ 30 ก.ย. | `45` |
| `counted_qty` | INTEGER | - | `0` | จำนวนเต็ม >= 0 | ยอดที่นับได้จริงทางกายภาพ | `43` |
| `variance_qty` | INTEGER | - | `0` | `counted_qty - book_qty` | ผลต่างยอดพัสดุ (+ เกิน, - ขาด) | `-2` |
| `unit_cost` | DECIMAL(12,2)| - | `0.00` | ตัวเลข >= 0 | ราคาทุนต่อหน่วย | `115.00` |
| `variance_val` | DECIMAL(12,2)| - | `0.00` | `variance_qty * unit_cost` | มูลค่าผลต่าง (บาท) | `-230.00` |
| `condition` | ENUM | - | `NORMAL` | `NORMAL` (ปกติพร้อมใช้), `REPAIRABLE` (ชำรุดซ่อมได้), `DISPOSED` (เสื่อมสภาพ/รอจำหน่าย), `LOST` (สูญไป) | การประเมินสภาพพัสดุทางกายภาพตามระเบียบ ข้อ ๒๑๕ | `REPAIRABLE` |
| `action_needed` | ENUM | - | `NONE` | `NONE`, `ADJUST_IN`, `ADJUST_OUT`, `REPAIR_ORDER`, `WRITE_OFF` | มาตรการที่คณะกรรมการเสนอแนะ | `ADJUST_OUT` |
| `is_reconciled` | BOOLEAN | - | `FALSE` | `TRUE`, `FALSE` | ปรับปรุงยอดเข้าบัญชีคุมเรียบร้อยแล้วหรือไม่ | `FALSE` |
| `notes` | STRING(255)| - | NULL | ข้อความ | ชี้แจงเหตุผลความคลาดเคลื่อน | `พบชำรุด 2 รีมเนื่องจากน้ำรั่ว` |
| `created_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่บันทึก | `2026-09-30T10:00:00Z` |
| `updated_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่แก้ไขล่าสุด | `2026-09-30T16:00:00Z` |

---

### 2.14 Table `14_Locations` (สถานที่จัดเก็บและคลังพัสดุ)

| Field Name | Type | Key | Default | Allowed Values / Enum | Business Description & Validation Rules | Example |
|---|---|:---:|---|---|---|---|
| `location_id` | STRING(20) | **PK** | - | Format: `LOC-[A-Z0-9]+` | รหัสสถานที่จัดเก็บคงที่ (ห้ามซ้ำ) | `LOC-MAIN` |
| `location_name` | STRING(100)| UK | - | ข้อความภาษาไทย | ชื่อสถานที่จัดเก็บอย่างเป็นทางการ | `ห้องเก็บพัสดุกลาง ชั้น 1` |
| `building` | STRING(50) | - | - | ข้อความ | ชื่ออาคารที่ตั้ง | `อาคาร 1 (อาคารอำนวยการ)` |
| `floor` | STRING(20) | - | - | เช่น `ชั้น 1`, `ชั้น 2` | ชั้นที่ตั้งของคลัง | `ชั้น 1` |
| `keeper_id` | STRING(36) | FK | NULL | Ref `01_Users` | รหัสผู้รับผิดชอบดูแลสถานที่ | `USR-001` |
| `is_active` | BOOLEAN | - | `TRUE` | `TRUE`, `FALSE` | สถานะคลังพัสดุ | `TRUE` |
| `created_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่สร้างเรคคอร์ด | `2026-09-26T08:00:00Z` |
| `updated_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่แก้ไขล่าสุด | `2026-09-26T08:00:00Z` |

---

### 2.15 Table `15_Categories` (หมวดหมู่วัสดุราชการ 8 ประเภท)

| Field Name | Type | Key | Default | Allowed Values / Enum | Business Description & Validation Rules | Example |
|---|---|:---:|---|---|---|---|
| `category_id` | STRING(20) | **PK** | - | Format: `CAT-[A-Z]{2,4}` | รหัสหมวดหมู่วัสดุ (ห้ามซ้ำ) | `CAT-OFF` |
| `category_name` | STRING(100)| UK | - | **8 หมวดตาม ว ๙๖:**<br>1. วัสดุสำนักงาน<br>2. วัสดุการศึกษา<br>3. วัสดุคอมพิวเตอร์<br>4. วัสดุกีฬา<br>5. วัสดุงานบ้านงานครัว<br>6. วัสดุวิทยาศาสตร์หรือการแพทย์<br>7. วัสดุไฟฟ้าและวิทยุ<br>8. วัสดุก่อสร้าง | ชื่อหมวดหมู่วัสดุราชการทางการ | `วัสดุสำนักงาน` |
| `fsc_group` | STRING(2) | - | - | `75`, `70`, `78`, `79`, `65`, `62`, `53` | รหัสกลุ่ม 2 หลักตามมาตรฐาน FSN | `75` |
| `fsc_group_name`| STRING(100)| - | - | ข้อความ | ชื่อกลุ่มทางการของรหัส FSN | `75 - เครื่องเขียนและอุปกรณ์สำนักงาน` |
| `description` | STRING(255)| - | NULL | ข้อความ | คำอธิบายขอบเขตของพัสดุในหมวด | `กระดาษ แฟ้ม ปากกา และเครื่องใช้สำนักงานทั่วไป` |
| `is_active` | BOOLEAN | - | `TRUE` | `TRUE`, `FALSE` | สถานะการใช้งานหมวดหมู่นี้ | `TRUE` |
| `created_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่สร้างข้อมูล | `2026-09-26T08:00:00Z` |
| `updated_at` | TIMESTAMP | - | Now | ISO-8601 UTC | วันเวลาที่แก้ไขล่าสุด | `2026-09-26T08:00:00Z` |

---

**ลงนามรับรองความถูกต้องของ Data Dictionary:**  
*Senior Software Architect & Data Governance Team*  
*วันที่ 26 กันยายน 2569*
