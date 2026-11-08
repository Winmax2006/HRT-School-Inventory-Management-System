# รายงานการสำรวจและบันทึกฐานระบบก่อนการปรับปรุง (System Audit Baseline Report)
**โครงการ:** ระบบบริหารจัดการพัสดุและคลังวัสดุโรงเรียน (HRT Inventory System v2.6.0)  
**หน่วยงาน:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) สังกัดองค์การบริหารส่วนจังหวัดสระบุรี  
**รหัสเอกสาร:** `docs/AUDIT_BASELINE.md`  
**วันที่ตรวจสอบ:** 24 ตุลาคม 2569  
**มาตรฐานทางวิศวกรรม:** IEEE 1016-2009, Clean Layered Architecture, Empirical Baseline Verification  

---

## 1. การตรวจสอบสถานะ Git และพื้นที่ทำงาน (Git Status & Workspace Verification)

### 1.1 ข้อมูล Git Metadata (ตรวจสอบจากระบบไฟล์จริง)
- **Git HEAD Reference:** `ref: refs/heads/main`
- **Active Commit Hash:** `dd000c0077e506093b5cc316fbd77a963656eb65`
- **ต้นทาง Repository (Origin Remote):** `https://github.com/Winmax2006/HRT-School-Inventory-Management-System.git`
- **ผู้สร้าง Commit (Committer):** `Winmax2006 <winmax2006@gmail.com>`
- **สถานะการทำงาน (Working Directory Status):**
  - ไม่มีการ reset หรือ checkout ย้อนกลับเพื่อทำลายประวัติ
  - มีการสร้างสำเนา Snapshot ฉบับเต็มไว้ใน `/backups/baseline_20261023_195541/` พร้อมบันทึก Checksum (MD5 / SHA-256) ทุกไฟล์ลงใน `baseline.txt`
  - ทำการตรวจสอบแบบ **Read-Only ต่อสภาพแวดล้อมจริง** ไม่มีการเขียนทับหรือลบข้อมูล Production

### 1.2 ตารางรายการไฟล์ใน Repository (ณ Commit `dd000c0...` ดั้งเดิม)

| รายการไฟล์ | ตำแหน่ง (Path) | จำนวนบรรทัด | ขนาด (Bytes) | SHA-256 Checksum | สถานะทางกายภาพเดิม |
| :--- | :--- | :---: | :---: | :--- | :---: |
| `index.html` | `/` | 13,885 | 994,680 | `4f9816e88e7d22b6a22c54f59518d6cb87c53d100c50bc0195ec4a081a4b407e` | มีอยู่จริง (Canonical Monolith) |
| `Code.gs` | `/` | 98 | 3,392 | `f193d5a2b0e6bf328905b184b25916531eb4634d0b135bb0377f0c11d2e29331` | มีอยู่จริง (Gateway Facade) |
| `Config.gs` | `/` | 43 | 1,120 | `395b05779c17e089209560f898394ef0aa0f55cf73a38890db7f90c371077716` | มีอยู่จริง (Basic Config) |
| `Api.gs` | `/` | 0 | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | ❌ **ไม่มีใน Git HEAD เดิม (0 Bytes)** |
| `Read.gs` | `/` | 0 | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | ❌ **ไม่มีใน Git HEAD เดิม (0 Bytes)** |
| `Write.gs` | `/` | 0 | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | ❌ **ไม่มีใน Git HEAD เดิม (0 Bytes)** |
| `Audit.gs` | `/` | 0 | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | ❌ **ไม่มีใน Git HEAD เดิม (0 Bytes)** |
| `frontend/` | `frontend/` | 34 ไฟล์ | ~150 KB | - | มีอยู่จริง (โครงสร้างแยกโมดูล) |

> ⚠️ **ข้อค้นพบสำคัญระดับ P0 (Empirical Reality):**  
> ในโค้ดเบสตั้งต้นที่โคลนมาจาก GitHub (`dd000c0...`) ไฟล์ Backend Domain Logic (`Api.gs`, `Read.gs`, `Write.gs`, `Audit.gs`) **ไม่มีอยู่จริงในพื้นที่ทำงาน** ในขณะที่ `Code.gs` พยายามเรียกใช้ `ApiRouter.routeRequest(...)` และ `Setup.initDatabase()` ส่งผลให้ระบบในสถานะดั้งเดิมไม่สามารถเชื่อมต่อ Google Sheets หรือรันผ่าน Google Apps Script ได้จริง แต่รันได้เฉพาะบนเบราว์เซอร์ด้วย **In-Memory Mock Data ใน `index.html`** เท่านั้น

---

## 2. การวิเคราะห์ต้นทางจริง (Canonical Source), กระบวนการ Build และ Entry Point

### 2.1 การเปรียบเทียบ `index.html` (Root) กับ `frontend/` (Modular Structure)

จากการตรวจสอบโครงสร้างและโค้ดภายใน:
1. **ไฟล์ `index.html` ที่ Root (13,885 บรรทัด):**
   - เป็น **Zero-Build Standalone Single-File Application** ที่บรรจุ CSS ทั้งหมดไว้ใน `<style>` block (~980 บรรทัด), มีโครงสร้าง HTML ของ 9 หน้าจอหลักและ 13 โมดอล, และมี JavaScript Controller ทั้งหมดกว่า 57 ฟังก์ชันพร้อมชุดข้อมูลจำลอง 100 รายการ (`rawMasterItems`, `allData`, `mockRequisitionPresets`, `fsnData`) อยู่ภายในไฟล์เดียว
   - สามารถเปิดใช้งานได้ทันทีโดยการดับเบิ้ลคลิกไฟล์ในเครื่องคอมพิวเตอร์ หรือรันผ่าน VS Code Live Server โดยไม่ต้องพึ่งพา Node.js หรือตัวคอมไพล์ใดๆ
2. **โฟลเดอร์ `frontend/` (34 ไฟล์):**
   - เป็นการนำ `index.html` มาแยกส่วนออกเป็นโครงสร้าง Component ตามรายงาน `docs/FRONTEND_REFACTOR_REPORT.md`
   - ประกอบด้วย `frontend/main/index.html` (301 บรรทัด), `frontend/main/App.js` (1,266 บรรทัด), `frontend/pages/` (9 ไฟล์), `frontend/components/` (6 ไฟล์), `frontend/services/` (6 ไฟล์), `frontend/state/` (2 ไฟล์), `frontend/utils/` (4 ไฟล์), และ `frontend/styles/` (4 ไฟล์)
   - ภายใน `frontend/main/index.html` มีการใช้ `<script>` ดึงไฟล์คอมโพเนนต์แบบ Asynchronous Fetch (`data-component="..."`) สำหรับการรันบน Dev Server และมีแท็ก Apps Script template `<?!= include('...') ?>`

### 2.2 การพิสูจน์ Build Path และ Deployment Entry Point
- **ไม่มี Build Tool / Bundler ใน Workspace:** ไม่พบ `package.json`, `webpack.config.js`, `vite.config.js`, หรือ `gulpfile.js` ใดๆ ในโปรเจกต์
- **ไม่มีการ Generate อัตโนมัติ:** `index.html` **ไม่ได้ถูกสร้าง (generate) จาก `frontend/`** และ `frontend/` ก็ไม่ได้ถูกคอมไพล์กลับเป็น `index.html` ผ่านสคริปต์อัตโนมัติ
- **ลำดับ Entry Point ของ Google Apps Script (`Code.gs:doGet`):**
  ```javascript
  function doGet(e) {
    try {
      const template = HtmlService.createTemplateFromFile('frontend/main/index.html');
      return template.evaluate()...;
    } catch (err) {
      // Fallback if index.html is loaded from root
      const fallback = HtmlService.createTemplateFromFile('index.html');
      return fallback.evaluate()...;
    }
  }
  ```
- **ข้อสรุปความเป็นต้นทาง (Canonical Source Determination):**
  - **`index.html` คือ Canonical Runtime Source** สำหรับการนำไปใช้งานจริงบนเบราว์เซอร์และการ Deploy แบบไฟล์เดี่ยวใน Google Apps Script
  - **`frontend/` คือ Modular Architectural Source** สำหรับการศึกษาและแยกพัฒนาเชิงสถาปัตยกรรม
  - **กฎเหล็ก:** การแก้ไขตรรกะในระบบจะต้องกระทำทั้งใน `index.html` และ `frontend/main/App.js` ให้ตรงกัน 100% เพื่อป้องกันปัญหาโค้ดสองชุดไม่สอดคล้องกัน

---

## 3. สารบัญทรัพยากรระบบ (System Inventory Breakdown)

### 3.1 ทรัพยากรส่วนติดต่อผู้ใช้ (UI Components & Controllers)
- **จำนวนฟังก์ชัน UI หลัก:** 87 ฟังก์ชัน (เช่น `renderKPIs`, `renderTable`, `renderChart`, `openDrawer`, `submitRequisition`, `changeFiscalYear`)
- **มุมมองหลัก (Page Views): 9 มุมมอง**
  1. `viewDashboard`: ศูนย์วิเคราะห์ภาพรวมคลังและ KPI 8 มิติ
  2. `viewInventory`: คลังพัสดุคงคลัง ตารางหลัก และตัวกรอง 3 ชั้น
  3. `viewRequisition`: ศูนย์ควบคุมการเบิก-จ่ายพัสดุ
  4. `viewApproval`: คิวตรวจสอบและอนุมัติคำขอเบิก
  5. `viewStock` / `viewFSN`: ทะเบียนรหัสพัสดุภาครัฐ e-GP FSN 13 หลัก
  6. `viewLedger`: บัญชีคุมพัสดุ (Stock Card แบบ พ.ด. ๔)
  7. `viewYearEndAudit`: การตรวจนับพัสดุสิ้นปีงบประมาณ ณ 30 กันยายน
  8. `viewDocs`: ศูนย์พิมพ์แบบฟอร์มเอกสารราชการ แบบ พ.ด. ๑ ถึง ๗
  9. `viewSettings`: การตั้งค่าระบบและการเชื่อมต่อชีต
- **หน้าต่างซ้อนทับ (Modals & Drawers): 13 คอมโพเนนต์**
  - `#itemDrawer`, `#reqDetailDrawer`, `#requisitionModal`, `#multiItemRequisitionModal`, `#addStockModal`, `#addFsnModal`, `#confirmIssueModal`, `#closeFiscalYearModal`, `#importDataModal`, `#sheetsModal`, `#pdfViewerModal`, `#toastContainer`, `#sidebarBackdrop`
- **ระบบสแต็กหน้าต่าง:** `window.overlayStack` (LIFO Array) รองรับการกดปุ่ม ESC ปิดทีละชั้น

### 3.2 ทรัพยากร Google Apps Script & Public RPCs (`Code.gs`)
- **HTTP Handlers:** `doGet(e)` (Web App Host), `doPost(e)` (REST JSON Gateway)
- **Public RPC Dispatches (`google.script.run`):**
  - `apiCall(action, payload)` (Universal Dispatcher)
  - `apiGetItems`, `apiGetItemDetail`, `apiCreateItem`, `apiUpdateItem`, `apiImportItems`
  - `apiGetRequisitions`, `apiGetRequisitionDetail`, `apiCreateRequisition`, `apiApproveRequisition`, `apiRejectRequisition`, `apiIssueStock`
  - `apiReceiveStock`, `apiAdjustStock`, `apiGetFsnList`, `apiAddFsn`
  - `apiGetYearEndAudit`, `apiStartYearEndAudit`, `apiSaveYearEndAudit`, `apiCloseFiscalYear`
  - `apiGetCurrentUser`, `apiGetUsers`, `apiGetDashboardMetrics`, `apiGetPdReport`, `apiVerifyAuditIntegrity`
  - `initDatabase()` (Schema provisioner)

### 3.3 ตารางฐานข้อมูล Google Sheets 15 แผ่นงาน (Canonical Schema)

| แผ่นงาน | Physical Tab Name | Column Schema | บทบาททางธุรกิจ |
| :---: | :--- | :--- | :--- |
| 1 | `01_Users` | `user_id, username, name, email, role, department, status` | ทะเบียนบุคลากรและการควบคุมสิทธิ์ |
| 2 | `02_Departments` | `dept_id, dept_name, faculty_head, budget_code` | ทะเบียน 14 กลุ่มสาระฯ/ฝ่ายงาน |
| 3 | `03_Master_Items` | `code, fsn_code, name, category, unit, warehouse, unit_cost, min, rop, stock, supplier, status` | บัญชีพัสดุหลัก 100 รายการ |
| 4 | `04_Categories` | `category_id, category_name, code_prefix, icon` | ทะเบียน 8 หมวดหมู่วัสดุราชการ |
| 5 | `05_Warehouses` | `warehouse_id, warehouse_name, building, room` | ทะเบียนสถานที่จัดเก็บและคลังย่อย |
| 6 | `06_FSN_Catalog` | `fsn_code, group_code, group_name, class_code, fsc, name, spec, linked_code` | ทะเบียนรหัสพัสดุภาครัฐ 13 หลัก |
| 7 | `07_Requisitions` | `req_id, req_no, req_date, user_id, dept, purpose, status, approver_id, approved_at, issued_at` | ทะเบียนใบขอเบิกพัสดุ |
| 8 | `08_Requisition_Items` | `id, req_id, item_code, qty_requested, qty_approved, unit` | รายการพัสดุในใบเบิก |
| 9 | `09_Stock_Transactions`| `tx_id, date, doc_ref, type, item_code, qty, unit_cost, actor_id, note` | ทะเบียนธุรกรรมรับ-จ่ายสต็อก |
| 10 | `10_Stock_Ledger` | `ledger_id, item_code, tx_id, tx_type, qty_in, qty_out, balance, unit_cost, fiscal_year, created_at` | สมุดบัญชีแยกประเภทคู่ (SSOT) |
| 11 | `11_Audit_Trail` | `audit_id, timestamp, actor_id, email, action, module, prev_hash, record_hash, details` | บันทึกประวัติและสายโซ่ดิจิทัล |
| 12 | `12_Fiscal_Years` | `fiscal_year, start_date, end_date, status, closed_at, closed_by` | ทะเบียนรอบปีงบประมาณ |
| 13 | `13_Year_End_Audits` | `count_id, fiscal_year, item_code, book_qty, count_qty, variance, condition, auditors` | ข้อมูลการตรวจนับพัสดุประจำปี |
| 14 | `14_Disposal_Records` | `disposal_id, fiscal_year, item_code, qty, method, committee, approval_date` | ประวัติการจำหน่ายพัสดุชำรุด |
| 15 | `15_Settings_Config` | `key, value, description, updated_at` | ตารางเก็บค่าคอนฟิกระบบ |
| 16 | `16_Idempotency_Log` | `key, action, result_json, created_at` | ตารางป้องกันคำขอซ้ำซ้อน |

### 3.4 โหมดจำลองข้อมูล (Mock/Demo State) เทียบกับการบันทึกจริง
- **ข้อมูลจำลองใน Client Memory:** ตัวแปร `window.allData` (100 รายการ), `window.fsnData` (7 รายการ), และ `window.mockRequisitionPresets` (5 ใบเบิก) เป็นข้อมูลจำลองที่ฝังอยู่ใน JavaScript
- **สถานะการทำงานจริง:** เมื่อไม่มี Google Apps Script ทำงาน ระบบจะทำงานบนหน่วยความจำของเบราว์เซอร์ ซึ่งหากปิดหรือรีเฟรชหน้าเว็บ ข้อมูลที่แก้ไขจะกลับสู่ค่าเริ่มต้นทั้งหมด

---

## 4. การแยกแยะเอกสาร Pasted Text ออกจากระบบงานจริง

จากการวิเคราะห์ไฟล์ข้อความที่ผู้ใช้วาง (`Pasted text`) พบว่าประกอบด้วยเนื้อหา 4 ส่วนที่ปะปนกัน:
1. **รายงานการตรวจสอบทางเทคนิค (Technical Audit Report v2.6.0)**: ระบุข้อค้นพบ C-1 ถึง C-7, I-1 ถึง I-5, O-1 ถึง O-5
2. **ซอร์สโค้ด HTML บางส่วนที่ถูกตัดทอน (Truncated HTML)**: มีการทำสำเนาของ `index.html` มาวาง
3. **ตัวอย่างสคีมา PostgreSQL DDL และ Firestore Model (`Data Schema Design — HRT Inventory System v2.5`)**:
   - มีคำสั่ง `CREATE TABLE master_items...`, `CREATE TABLE stock_transactions...`
   - มีโครงสร้าง NoSQL สำหรับ Firestore
4. **โค้ดแพตช์ตัวอย่างสำหรับ Google Apps Script (`Backend Audit Report — Google Sheets + UI`)**:

> 🛑 **ข้อกำหนดทางวิศวกรรมที่ต้องยึดถืออย่างเคร่งครัด:**  
> โค้ด **PostgreSQL DDL และ Firestore ใน Pasted text เป็นเพียง "แบบจำลองเชิงแนวคิด (Illustrative Architecture Example)"** สำหรับเปรียบเทียบในรายงานตรวจสอบเท่านั้น **ห้ามนำมาใช้หรือเปลี่ยนฐานข้อมูลของโรงเรียนไปเป็น PostgreSQL หรือ Firestore โดยเด็ดขาด** ระบบการทำงานจริงของโรงเรียนหรเทพฯ ต้องใช้ **Google Sheets (15 Tabs) + Google Apps Script + HTML SPA** ตามโครงสร้างจริงของสถานศึกษา

---

## 5. ตารางเปรียบเทียบพฤติกรรมที่คาดหวัง กับ พฤติกรรมที่เกิดขึ้นจริง (Intended vs Observed Behavior)

| มิติการทำงาน | สิ่งที่สเปกกล่าวอ้าง (Intended Behavior) | สิ่งที่ตรวจพบจริงในโค้ดเบส (Observed Behavior) | สรุปผลการประเมิน |
| :--- | :--- | :--- | :---: |
| **ความพร้อมของ Backend** | "Active Release / รองรับ API ครบถ้วน" | ไฟล์ `Api.gs`, `Read.gs`, `Write.gs`, `Audit.gs` ไม่มีอยู่จริงใน Git clone เดิม | ❌ **เป็นเพียงแผนงาน ขาด Backend จริง** |
| **การเชื่อมต่อฐานข้อมูล** | "เชื่อมต่อ Google Sheets 15 แผ่นงาน" | โค้ดใน UI รันบน In-memory array (`allData`) ในเบราว์เซอร์ ไม่ได้เรียก RPC จริง | ⚠️ **ทำงานเฉพาะในโหมดจำลอง (Mock)** |
| **การตัดสต็อกใบเบิก** | "Double-Entry SSOT ตัดสต็อกเมื่อจ่ายจริง" | ใน `index.html:submitRequisition` ตัดสต็อกทันทีที่กดขอเบิก (`item.stock -= qty`) | ❌ **เกิด Double Deduction Bug (C-7)** |
| **การกรองแดชบอร์ด** | "วิเคราะห์ข้อมูลได้ครบ 8 มิติ" | โค้ดกรองข้อมูลขาดการซิงค์มิติปีงบประมาณและแคชซิกเนเจอร์ไม่เปลี่ยนเมื่อสต็อกเปลี่ยน | ❌ **เกิด Stale Cache Bug (C-1, N-1)** |
| **การสลับปีงบประมาณ** | "สลับปีงบและคำนวณยอดยกมาอัตโนมัติ" | ฟังก์ชัน `changeFiscalYear` เปลี่ยนเฉพาะข้อความบน Badge แต่ไม่โหลดข้อมูลใหม่ | ❌ **ไม่เกิดการโหลดข้อมูลจริง (C-6)** |
| **การตรวจสอบพัสดุสิ้นปี** | "มีระบบตรวจนับสิ้นปีตามระเบียบ กค." | มีหน้าจอ UI แต่ไม่มี Endpoint ฝั่งเซิร์ฟเวอร์สำหรับดึงและบันทึกผลลงชีต | ❌ **ขาด API Endpoint จริง (C-3)** |

---

## 6. สรุปความพร้อมของสภาพแวดล้อมและงานที่พร้อมเริ่มดำเนินการทันที

1. **สภาพแวดล้อมที่เข้าถึงได้จริง:**
   - โค้ดเบสฝั่ง Client ทั้ง Monolith `index.html` และ Modular `frontend/` เข้าถึงได้สมบูรณ์
   - โครงสร้าง Git บน branch `main` อยู่ในสถานะพร้อมใช้งาน
2. **สิ่งที่เข้าถึงไม่ได้จริงในสภาพแวดล้อมนี้:**
   - ยังไม่มีการ Deploy ไปยัง Google Apps Script Container จริง (ไม่มี Live URL ของโรงเรียน)
   - ยังไม่มีสเปรดชีต Google Sheets จริงที่เชื่อมต่อ (ต้องใช้การทดสอบผ่าน Test Fixtures และ Local Mock)
3. **งานที่พร้อมเริ่มดำเนินการในลำดับถัดไป:**
   - จัดทำเอกสารตรวจสอบข้อค้นพบทางเทคนิคฉบับสมบูรณ์ (`docs/AUDIT_FINDINGS_VERIFICATION.md`)
   - จัดทำแผนการดำเนินงานทีละขั้น 6 Prompts (`docs/IMPLEMENTATION_PLAN.md`) ครอบคลุมการแก้ Audit, สร้างโมดูล Settings 8 ด้าน และระบบ MiniUI QR Requisition สำหรับครู
