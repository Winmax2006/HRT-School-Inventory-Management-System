# ความสมบูรณ์ของข้อมูลและคู่มือการย้ายฐานข้อมูล (Data Integrity & Migration Guide)
**ระบบ:** HRT School Inventory Management System v2.6.0  
**ฐานข้อมูลหลัก:** Google Sheets (15 Canonical Tabs)  
**มาตรฐานทางวิศวกรรม:** Double-Entry Ledger Invariant, Formula Injection Sanitization, Dry-Run Verification  

---

## 1. กฎความสมบูรณ์ของข้อมูลที่ห้ามละเมิด (Data Integrity Invariants)

1. **กฎยอดคงเหลือพัสดุห้ามติดลบ (Non-Negative Stock Invariant):**
   $$\forall \text{item} \in \text{Master Items}, \quad \text{stock} \ge 0$$
   ห้ามอนุญาตให้มีการจ่ายพัสดุ (`issueStock`) หากจำนวนที่ขอเบิกมากกว่ายอดคงเหลือจริงในคลัง

2. **กฎการอนุรักษ์ยอดบัญชีแยกประเภทคู่ (Double-Entry Ledger Conservation):**
   $$\text{Current Balance} = \sum_{i=1}^{n} \text{QtyIn}_i - \sum_{j=1}^{m} \text{QtyOut}_j$$
   ยอดคงเหลือใน `03_Master_Items.stock` ต้องตรงกับยอดผลรวมสะสมใน `10_Stock_Ledger.balance` เสมอ

3. **กฎสอดคล้องของสถานะพัสดุ (Status State Consistency):**
   $$\text{Status} = \begin{cases} 
   \text{'critical'} & \text{เมื่อ } \text{stock} \le 0 \\
   \text{'low'} & \text{เมื่อ } 0 < \text{stock} \le \text{min} \\
   \text{'normal'} & \text{เมื่อ } \text{stock} > \text{min} 
   \end{cases}$$

4. **กฎการแยกขั้นตอนคำขอเบิกกับการตัดจ่ายจริง (Decoupled Requisition State Machine):**
   ```text
   [PENDING_APPROVAL] ──(approve)──► [APPROVED] ──(issue)──► [ISSUED] (ตัดสต็อกจริงที่นี่)
           │
           └──(reject)──► [REJECTED] (ไม่มีการตัดสต็อก)
   ```
   ห้ามตัดยอดพัสดุในขั้นตอน `createRequisition` หรือ `approveRequisition` โดยเด็ดขาด

5. **กฎความต่อเนื่องของสายโซ่ตรวจสอบ (Cryptographic Hash Chaining Invariant):**
   $$\text{Row}_N.\text{prev\_hash} = \text{Row}_{N-1}.\text{record\_hash}$$
   บันทึกประวัติทุกรายการใน `11_Audit_Trail` ต้องถูกเชื่อมโยงด้วย SHA-256 Digest หากมีการแก้ไขย้อนหลัง ระบบจะตรวจพบความเสียหายของสายโซ่ทันที

---

## 2. โครงสร้างฐานข้อมูลมาตรฐาน 15 แผ่นงาน (Canonical Database Schema)

| แผ่นงาน | ชื่อมาตรฐาน | รายการคอลัมน์ (Column Headers) | คีย์หลัก (PK) |
| :---: | :--- | :--- | :---: |
| 1 | `01_Users` | `user_id, username, name, email, role, department, status` | `user_id` |
| 2 | `02_Departments` | `dept_id, dept_name, faculty_head, budget_code` | `dept_id` |
| 3 | `03_Master_Items` | `code, fsn_code, name, category, unit, warehouse, unit_cost, min, rop, stock, supplier, status` | `code` |
| 4 | `04_Categories` | `category_id, category_name, code_prefix, icon` | `category_id` |
| 5 | `05_Warehouses` | `warehouse_id, warehouse_name, building, room` | `warehouse_id` |
| 6 | `06_FSN_Catalog` | `fsn_code, group_code, group_name, class_code, fsc, name, spec, linked_code` | `fsn_code` |
| 7 | `07_Requisitions` | `req_id, req_no, req_date, user_id, dept, purpose, status, approver_id, approved_at, issued_at` | `req_id` |
| 8 | `08_Requisition_Items` | `id, req_id, item_code, qty_requested, qty_approved, unit` | `id` |
| 9 | `09_Stock_Transactions`| `tx_id, date, doc_ref, type, item_code, qty, unit_cost, actor_id, note` | `tx_id` |
| 10 | `10_Stock_Ledger` | `ledger_id, item_code, tx_id, tx_type, qty_in, qty_out, balance, unit_cost, fiscal_year, created_at` | `ledger_id` |
| 11 | `11_Audit_Trail` | `audit_id, timestamp, actor_id, email, action, module, prev_hash, record_hash, details` | `audit_id` |
| 12 | `12_Fiscal_Years` | `fiscal_year, start_date, end_date, status, closed_at, closed_by` | `fiscal_year` |
| 13 | `13_Year_End_Audits` | `count_id, fiscal_year, item_code, book_qty, count_qty, variance, condition, auditors` | `count_id` |
| 14 | `14_Disposal_Records` | `disposal_id, fiscal_year, item_code, qty, method, committee, approval_date` | `disposal_id` |
| 15 | `15_Settings_Config` | `key, value, description, updated_at` | `key` |
| 16 | `16_Idempotency_Log` | `key, action, result_json, created_at` | `key` |

---

## 3. ขั้นตอนการตั้งต้นฐานข้อมูลและการย้ายข้อมูล (Migration Runbook)

### ขั้นที่ 0: การสำรองข้อมูลล่วงหน้า (Pre-Flight Backup)
1. ทำสำเนาของ Google Sheets ฉบับปัจจุบัน และตั้งชื่อตามรูปแบบ:  
   `Backup_HRT_Inventory_YYYYMMDD_HHmmss`
2. ตรวจสอบเนื้อหาและ SHA-256 Hash ของไฟล์ต้นฉบับใน `/backups/baseline_20261023_195541/`

### ขั้นที่ 1: การทดสอบเสมือนจริง (Dry-Run Verification)
1. ก่อนทำการบันทึกข้อมูลพัสดุจำนวนมาก ให้เรียกใช้ `apiImportItems({ items: [...], dryRun: true })`
2. ระบบจะทำการตรวจสอบ:
   - รายการรหัสพัสดุที่ซ้ำซ้อน
   - ค่าราคาต่อหน่วยหรือจำนวนที่ติดลบ
   - ชื่อพัสดุและหมวดหมู่ที่ขาดหาย
3. หากมีข้อผิดพลาด ระบบจะส่งรายการ Error รายบรรทัดกลับมาโดยไม่แตะต้องฐานข้อมูลจริง

### ขั้นที่ 2: การจัดเตรียมโครงสร้างตารางอัตโนมัติ (Automated Schema Provisioning)
1. ในหน้าต่าง Apps Script เรียกใช้ฟังก์ชัน `initDatabase()`
2. ระบบจะสร้างแผ่นงานที่ยังขาดอยู่ให้ครบทั้ง 15 แผ่นงาน พร้อมกำหนดแถวหัวตารางและตรึงแถวแรก (Frozen Rows = 1) อัตโนมัติ

### ขั้นที่ 3: การกระทบยอดบัญชีแยกประเภท (Reconciliation)
1. ตรวจสอบยอดคงเหลือของพัสดุใน `03_Master_Items` เทียบกับผลรวม `10_Stock_Ledger`
2. หากพบผลต่าง ให้บันทึกธุรกรรมปรับปรุงยอด `ADJUSTMENT_ADD` หรือ `ADJUSTMENT_SUB` พร้อมระบุเหตุผลในช่อง `note`

---

## 4. แผนการย้อนกลับเมื่อเกิดเหตุฉุกเฉิน (Rollback & Disaster Recovery)

หากพบความผิดปกติระหว่างการทำงานในสภาพแวดล้อมจริง:

1. **ระงับการทำงานชั่วคราว:**
   - ปิดสิทธิ์การเข้าถึง WebApp ชั่วคราว หรือตั้งค่าคอนฟิก `maintenance_mode = true` ใน `15_Settings_Config`
2. **กู้คืนฐานข้อมูล Google Sheets:**
   - ใช้ฟังก์ชัน **Version History** ของ Google Sheets กู้คืนไปยังจุดเวลาก่อนการปรับปรุง
3. **กู้คืนซอร์สโค้ด Apps Script:**
   - กู้คืนไฟล์ `Code.gs`, `Api.gs`, `Read.gs`, `Write.gs`, `Audit.gs`, `Config.gs` จากสำเนาใน `/backups/baseline_20261023_195541/`
4. **ล้างหน่วยความจำแคช:**
   - เรียกใช้ `invalidateCache()` เพื่อล้างข้อมูลที่ค้างอยู่ใน `CacheService`
