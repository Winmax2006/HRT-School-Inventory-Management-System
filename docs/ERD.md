# HRT School Inventory Management System
## ENTITY-RELATIONSHIP DIAGRAM (ERD) & DATA FLOW ARCHITECTURE
**Document ID:** `DOC-ERD-2026-001`  
**Classification:** Database Conceptual & Logical Model  
**Platform Target:** Google Sheets Relational Schema (Pilot Phase)  
**Role:** Senior Software Architect & Database Engineer  
**Date:** 2026-09-26  
**Status:** **APPROVED (VERSION 1.0)**  

---

## 1. Complete Entity-Relationship Diagram (Mermaid)

แผนภาพความสัมพันธ์ของทั้ง 15 เอนทิตี (Entities) ในระบบฐานข้อมูลกลาง Google Sheets แสดง Primary Key (PK), Foreign Key (FK), และ Cardinality ตามมาตรฐานสากล:

```mermaid
erDiagram
    %% Core Security & RBAC
    ROLES ||--o{ USERS : "assigned_to"
    USERS ||--o{ REQUISITIONS : "requests"
    USERS ||--o{ REQUISITIONS : "approves"
    USERS ||--o{ TRANSACTIONS : "performs"
    USERS ||--o{ STOCK_LEDGER : "creates_entry"
    USERS ||--o{ AUDIT_LOG : "initiates"
    USERS ||--o{ LOCATIONS : "supervises"
    USERS ||--o{ SYSTEM_CONFIG : "configures"

    %% Catalog & Master Data
    CATEGORIES ||--o{ ITEMS : "classifies"
    LOCATIONS ||--o{ ITEMS : "default_storage"
    ITEMS ||--o{ REQUISITION_ITEMS : "requested_as"
    ITEMS ||--o{ TRANSACTION_ITEMS : "moved_as"
    ITEMS ||--o{ STOCK_LEDGER : "tracked_in"
    ITEMS ||--o{ PHYSICAL_COUNT_ITEMS : "inspected_in"

    %% Fiscal Cycles
    FISCAL_YEARS ||--o{ REQUISITIONS : "governs"
    FISCAL_YEARS ||--o{ TRANSACTIONS : "records"
    FISCAL_YEARS ||--o{ STOCK_LEDGER : "temporal_boundary"
    FISCAL_YEARS ||--o{ PHYSICAL_COUNTS : "annual_cycle"

    %% Requisition Workflow (Header & Detail)
    REQUISITIONS ||--|{ REQUISITION_ITEMS : "contains"
    REQUISITION_ITEMS |o--o{ TRANSACTION_ITEMS : "fulfilled_by"

    %% Physical Movement & Ledger (Header, Detail & Ledger)
    TRANSACTIONS ||--|{ TRANSACTION_ITEMS : "aggregates"
    LOCATIONS ||--o{ TRANSACTION_ITEMS : "source_or_dest"
    TRANSACTIONS |o--o{ STOCK_LEDGER : "posts_to"
    TRANSACTION_ITEMS |o--o{ STOCK_LEDGER : "itemizes_to"
    LOCATIONS ||--o{ STOCK_LEDGER : "inventory_at"

    %% Annual Physical Audit & Reconciliation
    PHYSICAL_COUNTS ||--|{ PHYSICAL_COUNT_ITEMS : "comprises"
    LOCATIONS ||--o{ PHYSICAL_COUNT_ITEMS : "counted_at"
    PHYSICAL_COUNTS |o--o{ TRANSACTIONS : "triggers_adjustment"

    %% Entity Details
    USERS {
        string user_id PK "รหัสผู้ใช้"
        string username UK "ชื่อล็อกอิน"
        string email UK "อีเมลองค์กร"
        string full_name "ชื่อ-นามสกุล"
        string role_id FK "รหัสบทบาท"
        string department "หน่วยงาน"
        boolean is_active "สถานะใช้งาน"
    }

    ROLES {
        string role_id PK "รหัสบทบาท"
        string role_name "ชื่อบทบาท"
        string description "คำอธิบาย"
        string permissions "สิทธิ์แบบ JSON"
    }

    CATEGORIES {
        string category_id PK "รหัสหมวด"
        string category_name UK "ชื่อ 8 หมวดราชการ"
        string fsc_group "รหัสกลุ่ม FSN 2 หลัก"
        string fsc_group_name "ชื่อกลุ่ม FSN"
    }

    LOCATIONS {
        string location_id PK "รหัสสถานที่"
        string location_name UK "ชื่อคลัง/ห้องจัดเก็บ"
        string building "อาคาร"
        string floor "ชั้น"
        string keeper_id FK "ผู้รับผิดชอบ"
    }

    ITEMS {
        string item_id PK "รหัสประจำเรคคอร์ด"
        string item_code UK "รหัสพัสดุทางการ"
        string item_name "ชื่อรายการพัสดุ"
        string category_id FK "หมวดหมู่วัสดุ"
        string location_id FK "คลังจัดเก็บหลัก"
        string fsn_code "รหัสมาตรฐาน FSN 13 หลัก"
        string unit "หน่วยนับ"
        decimal unit_cost "ราคามาตรฐานต่อหน่วย"
        int min_stock "ปริมาณสำรองขั้นต่ำ"
        int reorder_point "จุดสั่งซื้อซ้ำ ROP"
        boolean is_active "สถานะการใช้งาน"
    }

    FISCAL_YEARS {
        string fiscal_year_id PK "รหัสปีงบ"
        int year_th UK "ปี พ.ศ."
        int year_en UK "ปี ค.ศ."
        date start_date "วันเริ่มต้น 1 ต.ค."
        date end_date "วันสิ้นสุด 30 ก.ย."
        string status "สถานะรอบปีงบ"
    }

    REQUISITIONS {
        string requisition_id PK "รหัสคำขอเบิก"
        string doc_no UK "เลขที่ใบเบิก พ.ด.๑"
        string fiscal_year_id FK "ปีงบประมาณ"
        string requester_id FK "ผู้ขอเบิก"
        string department "กลุ่มสาระฯ/ฝ่าย"
        string purpose "วัตถุประสงค์"
        string status "สถานะคำขอ"
        date request_date "วันที่ขอ"
        string approved_by FK "ผู้อนุมัติ"
    }

    REQUISITION_ITEMS {
        string req_item_id PK "รหัสรายการในคำขอ"
        string requisition_id FK "เชื่อมโยงใบเบิก"
        string item_id FK "พัสดุที่ขอ"
        int requested_qty "จำนวนขอเบิก"
        int approved_qty "จำนวนอนุมัติ"
        int issued_qty "จำนวนจ่ายจริงสะสม"
        string item_status "สถานะรายการ"
    }

    TRANSACTIONS {
        string transaction_id PK "รหัสธุรกรรม"
        string doc_no UK "เลขที่เอกสารทางบัญชี"
        string fiscal_year_id FK "ปีงบประมาณ"
        string transaction_type "ชนิดธุรกรรม (ISSUE/RECEIVE/ADJUST)"
        string ref_doc_type "ประเภทเอกสารอ้างอิง"
        string ref_doc_id "รหัสเอกสารอ้างอิง"
        date transaction_date "วันที่เกิดธุรกรรม"
        string performed_by FK "เจ้าหน้าที่ผู้ทำรายการ"
        string status "สถานะ (POSTED/VOIDED)"
    }

    TRANSACTION_ITEMS {
        string txn_item_id PK "รหัสรายการในธุรกรรม"
        string transaction_id FK "เชื่อมโยงธุรกรรม"
        string item_id FK "พัสดุที่เคลื่อนไหว"
        string location_id FK "คลังจัดเก็บ"
        int quantity "จำนวนเคลื่อนไหว"
        decimal unit_cost "ราคาต่อหน่วย"
        decimal total_cost "มูลค่ารวม"
        string ref_req_item_id FK "เชื่อมโยงรายการใบเบิก"
    }

    STOCK_LEDGER {
        string ledger_id PK "รหัสบรรทัดบัญชีคุม"
        string fiscal_year_id FK "ปีงบประมาณ"
        timestamp entry_timestamp "เวลาบันทึกบัญชี"
        string item_id FK "รหัสพัสดุ"
        string location_id FK "คลังพัสดุ"
        string movement_type "ประเภท (OPENING/RECEIVE/ISSUE/ADJUST/RETURN/CANCEL)"
        string transaction_id FK "ธุรกรรมอ้างอิง"
        string txn_item_id FK "รายการย่อยอ้างอิง"
        int qty_in "รับเข้า"
        int qty_out "จ่ายออก"
        int qty_net "สุทธิ"
        decimal unit_cost "ราคาต่อหน่วย"
        decimal val_net "มูลค่าสุทธิ"
        int balance_qty "ยอดคงเหลือสะสม"
        decimal balance_val "มูลค่าคงเหลือสะสม"
        string ref_doc_no "เลขที่เอกสารอ้างอิง"
        boolean is_voided "สถานะโมฆะ"
    }

    PHYSICAL_COUNTS {
        string count_id PK "รหัสรอบตรวจนับ"
        string fiscal_year_id FK "ปีงบประมาณ"
        string count_type "ประเภทการตรวจนับ"
        date count_date "วันที่ตรวจนับ (30 ก.ย.)"
        string title "หัวข้อรายงาน"
        string status "สถานะการตรวจนับ"
        string committee_head "ประธานกรรมการ"
        string inspector_name "กรรมการผู้ตรวจ"
        string approver_name "ผู้เห็นชอบ"
    }

    PHYSICAL_COUNT_ITEMS {
        string count_item_id PK "รหัสรายการตรวจนับ"
        string count_id FK "เชื่อมโยงรอบตรวจนับ"
        string item_id FK "พัสดุที่ตรวจ"
        string location_id FK "สถานที่ตรวจ"
        int book_qty "ยอดตามบัญชี"
        int counted_qty "ยอดนับได้จริง"
        int variance_qty "ผลต่างยอด"
        decimal unit_cost "ราคาต่อหน่วย"
        decimal variance_val "มูลค่าผลต่าง"
        string condition "สภาพพัสดุ (NORMAL/REPAIRABLE/DISPOSED/LOST)"
        string action_needed "มาตรการปรับปรุง"
        boolean is_reconciled "ปรับยอดแล้วหรือไม่"
    }

    SYSTEM_CONFIG {
        string config_key PK "ชื่อตัวแปร"
        string config_value "ค่าตัวแปร"
        string value_type "ชนิดข้อมูล"
        string description "คำอธิบาย"
        boolean is_locked "ล็อกระบบ"
        string updated_by FK "ผู้แก้ไข"
    }

    AUDIT_LOG {
        string audit_id PK "รหัสประวัติ"
        timestamp timestamp "วันเวลา"
        string user_id FK "ผู้กระทำการ"
        string action "การกระทำ"
        string entity_name "ชื่อตาราง"
        string entity_id "รหัสข้อมูล"
        string old_values "Snapshot ก่อนแก้"
        string new_values "Snapshot หลังแก้"
        string status "ผลลัพธ์"
    }
```

---

## 2. Architectural Data Flows

### 2.1 The Requisition-to-Ledger Separation Flow
ความแตกต่างสำคัญระหว่างการขอเบิก (Requisition) และการเคลื่อนไหวทางบัญชี (Ledger):

```
[ผู้ขอเบิก]
    │
    ▼ (1) ยื่นคำขอ
┌────────────────────────┐
│   04_Requisitions      │ (Header: Intent)
│   05_Requisition_Items │ (Detail: Requested Items)
└────────────────────────┘
    │
    ▼ (2) ตรวจสอบ & อนุมัติ (สถานะ: APPROVED)
    │
[เจ้าหน้าที่พัสดุ]
    │
    ▼ (3) ตรวจสอบพัสดุในคลัง & ยืนยันการตัดจ่าย
┌────────────────────────┐
│   06_Transactions      │ (Header: Execution)
│   07_Transaction_Items │ (Detail: Actual Issued Items)
└────────────────────────┘
    │
    ▼ (4) บันทึกบัญชีคุมอัตโนมัติ (Atomic Append)
┌────────────────────────┐
│   08_Stock_Ledger      │ (Immutable Audit Trail)
│   - movement: ISSUE    │
│   - qty_out: X         │
│   - balance_qty: New   │
└────────────────────────┘
```

---

### 2.2 Physical Count Reconciliation Flow
ขั้นตอนเมื่อการตรวจนับสิ้นปีพบผลต่าง (Variance Reconciliation):

```
┌───────────────────────────────┐
│ 12_Physical_Counts (30 ก.ย.)  │
│ 13_Physical_Count_Items       │
└───────────────────────────────┘
                │
                ├─────────────────────────────────────┐
                ▼ (กรณี: Variance > 0 พบพัสดุเกิน)      ▼ (กรณี: Variance < 0 พัสดุขาด/ชำรุด)
       ┌──────────────────┐                  ┌──────────────────┐
       │ 06_Transactions  │                  │ 06_Transactions  │
       │ type: ADJUSTMENT │                  │ type: ADJUSTMENT │
       │ action: ADJUST_IN│                  │ action:ADJUST_OUT│
       └──────────────────┘                  └──────────────────┘
                │                                     │
                ▼                                     ▼
       ┌──────────────────┐                  ┌──────────────────┐
       │ 08_Stock_Ledger  │                  │ 08_Stock_Ledger  │
       │ movement:ADJUST_IN│                 │movement:ADJUST_OUT│
       │ qty_in: +Delta   │                  │ qty_out: -Delta  │
       └──────────────────┘                  └──────────────────┘
```

---

## 3. Structural Integrity & Referential Constraints

1. **Foreign Key Integrity**:
   - `03_Items.category_id` $\rightarrow$ `15_Categories.category_id` (RESTRICT DELETE: ห้ามลบหมวดหมู่ที่มีพัสดุอ้างอิงอยู่)
   - `03_Items.location_id` $\rightarrow$ `14_Locations.location_id` (RESTRICT DELETE: ห้ามลบคลังที่มีพัสดุเก็บอยู่)
   - `05_Requisition_Items.requisition_id` $\rightarrow$ `04_Requisitions.requisition_id` (CASCADE DELETE: ลบใบเบิกต้องลบรายการย่อยด้วย)
   - `07_Transaction_Items.transaction_id` $\rightarrow$ `06_Transactions.transaction_id` (CASCADE DELETE)
   - `08_Stock_Ledger.item_id` $\rightarrow$ `03_Items.item_id` (RESTRICT DELETE: พัสดุที่เคยมีการเคลื่อนไหวห้ามลบเด็ดขาด ให้ใช้ `is_active = FALSE` แทน)
2. **Cardinality Verification**:
   - `04_Requisitions` $\rightarrow$ `05_Requisition_Items`: 1 to Many (1..*)
   - `06_Transactions` $\rightarrow$ `07_Transaction_Items`: 1 to Many (1..*)
   - `12_Physical_Counts` $\rightarrow$ `13_Physical_Count_Items`: 1 to Many (1..100)
   - `03_Items` $\rightarrow$ `08_Stock_Ledger`: 1 to Many (1..*)

---

**ลงนามรับรองแผนผัง ERD และโฟลว์สถาปัตยกรรมข้อมูล:**  
*Senior Software Architect & Database Engineering Team*  
*วันที่ 26 กันยายน 2569*
