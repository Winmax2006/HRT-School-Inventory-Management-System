# HRT School Inventory Management System
## CURRENT FEATURE MATRIX & IMPLEMENTATION MATURITY
**Document ID:** `DOC-BASELINE-2026-002`  
**Classification:** Baseline Freeze for Pilot Backend Integration  
**Role:** Senior Software Architect & Configuration Manager  
**Date of Freeze:** 2026-09-26  
**Status:** **FROZEN (SYSTEM LOCKED)**  

---

## 1. Feature Classification Framework

ในการตรวจสอบระบบก่อนเข้าสู่ขั้นตอน Pilot Backend Integration ระบบจะจำแนกความพร้อมของฟีเจอร์ออกเป็น 3 ระดับ:

- 🟢 **REAL (ฟังก์ชันจริง)**: ทำงานด้วย Business Logic สมบูรณ์ คำนวณจริง กรองข้อมูลแบบเรียลไทม์ เรนเดอร์กราฟและตารางแบบพลวัต ดาวน์โหลดไฟล์ และพิมพ์เอกสารตามระเบียบพัสดุภาครัฐได้จริง (Client-Side Real Execution)
- 🟡 **MOCK (ชุดข้อมูลจำลอง)**: ฟังก์ชันการทำงานเป็น Logic จริง แต่ใช้ชุดข้อมูลตั้งต้นที่ฮาร์ดโค้ดไว้ในตัวแปร In-Memory เพื่อรอเชื่อมต่อกับฐานข้อมูลจริง (Ready for Database Hook)
- 🔵 **SIMULATION (การจำลองพฤติกรรม)**: UI โต้ตอบและแสดงขั้นตอนเสมือนจริง แต่จำลองการเรียกใช้งานบริการภายนอก เช่น Google OAuth Login, Google Drive API, การสร้างไฟล์ PDF ผ่าน Modal (Simulation via Dialog / Toast)

---

## 2. Complete Feature Matrix by Module

### โมดูล 1: ภาพรวมระบบคลังและศูนย์ควบคุม (Executive Command Center - `viewDashboard`)

| รหัสฟีเจอร์ | ชื่อฟีเจอร์ย่อย | ระดับ | Data Store / Variable | ฟังก์ชันหลักที่รับผิดชอบ | หมายเหตุและความพร้อมใน Pilot |
|---|---|---|---|---|---|
| **DASH-01** | 6 Core Executive KPI Cards (มูลค่า, SKU, ROP, วิกฤติ, Dead Stock, ยอดเบิกสะสม) | 🟢 REAL | `allData` (100 รายการ) | `renderKPIs(targetData)`, `setDomText()` | คำนวณจากยอดคงเหลือและราคาต่อหน่วยจริง ป้องกัน NaN/undefined 100% |
| **DASH-02** | 8-Dimensional Interactive Chart.js Switcher (Trend, Health, Top Moving, ABC, FSN, Aging, Value, Dept) | 🟢 REAL | `allData`, `item.history` | `renderChart(data)`, `switchChart(type)` | จัดการ Instance Lifecycle ปลอดภัย ทำลาย Instance เดิมก่อนวาดใหม่เสมอ |
| **DASH-03** | Cross-Filter Interaction (คลิกการ์ด/กราฟ/Legend เพื่อกรอง) | 🟢 REAL | Global DOM & Filter State | `setDashCrossFilterStatus()`, `setDashCrossFilterCategory()`, `setDashCrossFilterMovement()`, `setDashCrossFilterAbc()` | ซิงค์ตัวกรอง 8 มิติสองทิศทาง พร้อมปุ่มล้างตัวกรองและ Badge แจ้งเตือน |
| **DASH-04** | Transfer Filter to Inventory (โอนย้ายตัวกรองสู่คลัง) | 🟢 REAL | `filteredData`, `allData` | `viewFilteredInInventory()` | สลับมุมมองไปยัง `viewInventory` พร้อมส่งมอบเงื่อนไขตัวกรองอัตโนมัติ |
| **DASH-05** | Management Insights (What Needs Attention 4 ระดับ) | 🟢 REAL | `allData`, `_lastInsightsSignature` | `renderManagementInsights(targetData)`, `handleInsightAction(type, payload)` | จัดหมวดหมู่วิกฤติ (Critical, Warning, Info, Healthy) พร้อมระบบ Dirty-checking |
| **DASH-06** | Action Center Priority Queue & Alert Banners | 🟢 REAL | `allData` | `renderKPIs()`, `updateDashVisualIndicators()` | ตรวจสอบพัสดุวิกฤติต่ำกว่า Min Stock และ ROP เพื่อแจ้งเตือนหัวหน้าพัสดุ |
| **DASH-07** | Debounced Quick Search (ค้นหาด่วนแบบหน่วงเวลา) | 🟢 REAL | `allData`, `_cachedDashboardData` | `debouncedDashQuickSearch()`, `handleDashQuickSearch()` | หน่วงเวลา 300ms ค้นหาครอบคลุมรหัส, ชื่อ, หมวด, คลัง โดยไม่หน่วง UI |
| **DASH-08** | Refresh & Cache Revalidation with 2s Cooldown | 🟢 REAL | `_lastRefreshTime`, `_isDataLoading` | `refreshDashboardData()`, `hideDashGlobalError()` | จำกัดความถี่ 2 วินาที พร้อม Skeleton Loading ป้องกันการยิงคำขอซ้ำซ้อน |

---

### โมดูล 2: ทะเบียนคลังพัสดุคงคลัง (Inventory Catalog & Ledger - `viewInventory`)

| รหัสฟีเจอร์ | ชื่อฟีเจอร์ย่อย | ระดับ | Data Store / Variable | ฟังก์ชันหลักที่รับผิดชอบ | หมายเหตุและความพร้อมใน Pilot |
|---|---|---|---|---|---|
| **INV-01** | ตารางพัสดุหลัก 100 รายการ (Desktop & Tablet) | 🟢 REAL | `allData`, `filteredData` | `renderTable()`, `handleSort(col)` | แสดงผลรหัส, ชื่อ, สต็อก, สถานะ, ราคา, สถานที่จัดเก็บ |
| **INV-02** | Compact Card List (Mobile Responsive View < 768px) | 🟢 REAL | `filteredData` | `renderTable()` | ปรับรูปแบบเป็น Card ไร้แถบเลื่อนแนวนอน สำหรับมือถือและแท็บเล็ต |
| **INV-03** | การกรองแบบหลายมิติ (Search, Category, Warehouse, Status) | 🟢 REAL | `filteredData` | `applyFilters()`, `setQuickStatusFilter()` | กรองข้อมูลหลายเงื่อนไขพร้อมกันแบบ Reactive |
| **INV-04** | ระบบแบ่งหน้า (Pagination: 10, 20, 50, 100 รายการ) | 🟢 REAL | `currentPage`, `itemsPerPage` | `renderTable()`, `changePage(pageNum)` | ควบคุมการตัดหน้าและการคำนวณดัชนีเริ่มต้น-สิ้นสุด |
| **INV-05** | ลิ้นชักรายละเอียดพัสดุ (Item Detail Drawer) | 🟢 REAL | `selectedItem`, `allData` | `openDrawer(item)`, `closeDrawer()` | แสดงสเปก, หลอดวัดระดับสต็อก, ประวัติธุรกรรม (Stock Card) |
| **INV-06** | บันทึกรับเข้าพัสดุ / สั่งซื้อเพิ่ม (Restock Modal) | 🟢 REAL | `allData`, `item.history` | `submitRestock()`, `openAddStockModal()` | เพิ่มยอดสต็อกจริง คำนวณมูลค่าคงเหลือใหม่ และบันทึกประวัติทันที |
| **INV-07** | คำขอเบิกด่วนรายชิ้นจากตารางพัสดุ (Single Requisition) | 🟢 REAL | `selectedItem` | `openRequisitionModal(code)`, `submitRequisition()` | ตัดสต็อกจริงและสร้าง Transaction บันทึกผู้เบิกและวัตถุประสงค์ |

---

### โมดูล 3: ศูนย์ควบคุมการขอเบิก–จ่ายพัสดุ (Requisition & Issue Center - `viewRequisition`)

| รหัสฟีเจอร์ | ชื่อฟีเจอร์ย่อย | ระดับ | Data Store / Variable | ฟังก์ชันหลักที่รับผิดชอบ | หมายเหตุและความพร้อมใน Pilot |
|---|---|---|---|---|---|
| **REQ-01** | 4 Requisition KPI Summary Cards | 🟢 REAL | `mockRequisitionPresets` | `renderRequisitionSummary()` | นับคำขอทั้งหมด, รออนุมัติ, รอจ่าย, จ่ายแล้วเสร็จในวันนี้ |
| **REQ-02** | แถบสถานะ 5 แท็บ (ภาพรวม, คำขอ, รออนุมัติ, รอจ่าย, ประวัติ) | 🟢 REAL | `mockRequisitionPresets` | `switchRequisitionTab(tab)` | แยกตารางแสดงผลตามขั้นตอน Workflow ทางราชการ |
| **REQ-03** | ตะกร้าขอเบิกพัสดุแบบหลายรายการ (Multi-Item Cart Modal) | 🟢 REAL | `multiReqRows`, `allData` | `openMultiItemRequisitionModal()`, `addMultiReqRow()`, `renderMultiReqRows()` | เพิ่ม/ลบรายการคำขอได้ไม่จำกัดจำนวน พร้อมตรวจสอบสต็อก |
| **REQ-04** | แจ้งเตือนผลกระทบต่อสต็อก (Stock Impact & Warning) | 🟢 REAL | `multiReqRows`, `allData` | `updateMultiReqImpact()` | คำนวณยอดคงเหลือหลังจ่ายแบบเรียลไทม์ บล็อกปุ่มหากระบุเกินสต็อก |
| **REQ-05** | การยืนยันตัดจ่ายพัสดุจริง (Confirm Issue Modal) | 🟢 REAL | `mockRequisitionPresets`, `allData` | `openConfirmIssueModal()`, `executeIssueConfirmation()` | ปรับยอดจ่ายจริง (Actual Quantity), รองรับการจ่ายบางส่วน (Partial) |
| **REQ-06** | การคัดลอกคำขอเดิมเพื่อขอเบิกซ้ำ (Duplicate Requisition) | 🟢 REAL | `mockRequisitionPresets` | `duplicateRequisition(reqId)` | คัดลอกรายการเดิมเพื่อความสะดวกรวดเร็วในการทำงานประจำวัน |
| **REQ-07** | ส่งออกทะเบียนคำขอเบิกเป็น CSV (Export CSV) | 🟢 REAL | `mockRequisitionPresets` | `exportRequisitionLedgerCSV()` | เข้ารหัส UTF-8 with BOM รองรับเปิดบน Microsoft Excel ภาษาไทย |
| **REQ-08** | ชุดข้อมูลใบเบิกตั้งต้น (Preset Requisition Slips) | 🟡 MOCK | `mockRequisitionPresets` (5 รายการ) | `initRequisitionModule()` | มีข้อมูลตัวอย่าง 5 ใบเบิก พร้อมรอรับการ Sync จาก Google Sheets |

---

### โมดูล 4: ทะเบียนรหัสพัสดุมาตรฐานภาครัฐ (FSN Standard Management - `viewFSN`)

| รหัสฟีเจอร์ | ชื่อฟีเจอร์ย่อย | ระดับ | Data Store / Variable | ฟังก์ชันหลักที่รับผิดชอบ | หมายเหตุและความพร้อมใน Pilot |
|---|---|---|---|---|---|
| **FSN-01** | ทะเบียนรหัสพัสดุ 13 หลักตามมาตรฐาน e-GP กรมบัญชีกลาง | 🟢 REAL | `fsnData`, `allData` | `renderFsnTable()`, `getFsnCodeForItem()` | จัดโครงสร้าง `[Group 2][Class 2]-[Country 2]-[NIIN 7]` ถูกต้อง |
| **FSN-02** | ตารางจับคู่พัสดุภายในกับรหัส FSN (Catalog Mapping) | 🟢 REAL | `fsnData`, `allData` | `renderFsnTable()` | แสดงสถานะการจับคู่ และตรวจหาพัสดุที่ยังไม่มีรหัส FSN |
| **FSN-03** | เพิ่มและขึ้นทะเบียนรหัส FSN ใหม่ (Add FSN Modal) | 🟢 REAL | `fsnData` | `openAddFsnModal()`, `saveNewFsnItem()` | เลือกรหัสกลุ่ม (Group) 2 หลัก และชั้น (Class) 2 หลัก พร้อมตรวจสอบความซ้ำซ้อน |
| **FSN-04** | ดูเอกสารคุณลักษณะเฉพาะและ TOR (PDF Preview Modal) | 🔵 SIMULATION | `selectedPdfFile` | `viewPdfModal(pdfFile, fsnCode)`, `downloadSimulatedPdf()` | แสดง Mockup เอกสาร PDF คุณลักษณะเฉพาะ พร้อมปุ่มจำลองการพิมพ์/ดาวน์โหลด |

---

### โมดูล 5: การตรวจนับพัสดุสิ้นปีงบประมาณ (Fiscal Year-End Audit - `viewYearEndAudit`)

| รหัสฟีเจอร์ | ชื่อฟีเจอร์ย่อย | ระดับ | Data Store / Variable | ฟังก์ชันหลักที่รับผิดชอบ | หมายเหตุและความพร้อมใน Pilot |
|---|---|---|---|---|---|
| **AUDIT-01** | 4 Audit KPI Cards (ทั้งหมด, นับแล้ว, ผลต่าง, มูลค่าจริง) | 🟢 REAL | `auditItemsData` | `renderYearEndAudit()` | สรุปผลการตรวจนับ ณ วันที่ 30 กันยายน แบบเรียลไทม์ |
| **AUDIT-02** | ตารางตรวจนับยอดในบัญชีเทียบยอดนับจริง (Count vs Book) | 🟢 REAL | `auditItemsData` | `updatePhysicalCount(code, val)` | คำนวณ Variance (`counted - book`) และแสดงผลต่างกำไร/ขาดพัสดุ |
| **AUDIT-03** | การจำแนกสภาพพัสดุ (ปกติ, ชำรุดซ่อมได้, รอจำหน่าย) | 🟢 REAL | `auditItemsData` | `updateItemCondition(code, cond)` | ประเมินสถานะทางกายภาพของทรัพย์สินเพื่อใช้ในรายงาน พ.ด. ๖ |
| **AUDIT-04** | บันทึกความคืบหน้าการตรวจนับลงหน่วยความจำ | 🟢 REAL | `auditItemsData` | `saveAuditProgress()` | บันทึกข้อมูลชั่วคราวและแจ้งเตือนผ่าน Toast Notification |
| **AUDIT-05** | ปิดบัญชีพัสดุประจำปีและยกยอดอัตโนมัติ (Year-End Closing) | 🟢 REAL | `fiscalYearSnapshots`, `allData` | `openCloseFiscalYearModal()`, `confirmCloseFiscalYear()` | บันทึก Snapshot ณ 30 ก.ย. และโอนยอดยกไปเป็นยอดยกมา 1 ต.ค. ปีถัดไป |
| **AUDIT-06** | บันทึกประวัติ Snapshot ย้อนหลัง | 🟢 REAL | `fiscalYearSnapshots` | `confirmCloseFiscalYear()` | เก็บประวัติผลการปิดบัญชีรายปีเพื่อตรวจสอบย้อนหลัง |

---

### โมดูล 6: ระบบเอกสารราชการคลังพัสดุ แบบ พ.ด. ๑–๗ (Official Forms Engine - `viewDocs`)

| รหัสฟีเจอร์ | ชื่อฟีเจอร์ย่อย | ระดับ | Data Store / Variable | ฟังก์ชันหลักที่รับผิดชอบ | หมายเหตุและความพร้อมใน Pilot |
|---|---|---|---|---|---|
| **DOC-01** | แบบ พ.ด. ๑: ใบเบิกพัสดุ (Requisition Slip) | 🟢 REAL | `mockRequisitionPresets` | `loadRequisitionDocPreset()` | เลือกใบเบิกจาก Dropdown เรนเดอร์ชื่อผู้เบิก, รายการ, และบล็อก 3 ลายเซ็น |
| **DOC-02** | แบบ พ.ด. ๒: ใบตรวจรับพัสดุ (Inspection & Receipt) | 🟢 REAL | `allData` | `renderDocsModule()` | ออกเอกสารตรวจรับการจัดซื้อตามระเบียบกระทรวงการคลัง |
| **DOC-03** | แบบ พ.ด. ๓: ใบส่งคืนพัสดุ (Material Return Slip) | 🟢 REAL | `allData` | `renderDocsModule()` | ออกเอกสารส่งคืนพัสดุเหลือใช้หรือชำรุดเข้าคลังกลาง |
| **DOC-04** | แบบ พ.ด. ๔: บัญชีคุมพัสดุ / Stock Card (Item Ledger) | 🟢 REAL | `allData`, `item.history` | `loadStockCardForItem(code)` | แสดงยอดยกมา รับ จ่าย คงเหลือ พร้อมคำนวณมูลค่ารายบรรทัด |
| **DOC-05** | แบบ พ.ด. ๕: ทะเบียนครุภัณฑ์และพัสดุคงเหลือ | 🟢 REAL | `auditItemsData` | `renderYearEndCategoryReport()` | สรุปมูลค่าแยก 8 หมวดหมู่วัสดุราชการ ยอดเปิด ยอดรับ ยอดจ่าย ยอดยกไป |
| **DOC-06** | แบบ พ.ด. ๖: รายงานการตรวจสอบพัสดุประจำปี | 🟢 REAL | `auditItemsData` | `renderDocsModule()` | รายงานผลการตรวจสอบของคณะกรรมการตรวจนับ ณ 30 กันยายน |
| **DOC-07** | แบบ พ.ด. ๗: บัญชีตรวจนับพัสดุคงเหลือ 100 รายการ | 🟢 REAL | `auditItemsData` (100 รายการ) | `renderYearEndAllItemsReport()` | แบ่งหน้าเอกสารละ 25 รายการ รวม 4 หน้า พร้อม Header/Footer/ลายเซ็นมาตรฐาน |
| **DOC-08** | Print Preview & A4 Print Engine | 🟢 REAL | CSS `@media print` | `printOfficialDocument()` | สั่งพิมพ์จริงลงกระดาษ A4 แนวตั้ง/แนวนอน ซ่อนเมนูและแถบข้างอัตโนมัติ |

---

### โมดูล 7: ระบบตั้งค่าและการเชื่อมต่อฐานข้อมูล (Settings & Data Sync - `viewSettings`)

| รหัสฟีเจอร์ | ชื่อฟีเจอร์ย่อย | ระดับ | Data Store / Variable | ฟังก์ชันหลักที่รับผิดชอบ | หมายเหตุและความพร้อมใน Pilot |
|---|---|---|---|---|---|
| **SET-01** | Technical System Diagnostics & Server Status | 🟢 REAL | Client Environment | `renderSettingsModule()` | แสดงขนาดไฟล์, จำนวนบรรทัด, เวอร์ชัน, และสถานะหน่วยความจำ |
| **SET-02** | ตัวสลับปีงบประมาณ (Fiscal Year Selector) | 🟢 REAL | `currentFiscalYear` | `onFiscalYearChange(year)` | สลับปี 2569–2573 พร้อมอัปเดต Badge และข้อมูลตรวจนับทั้งระบบ |
| **SET-03** | สลับบทบาทผู้ใช้งาน RBAC (Officer / Teacher) | 🟢 REAL | `currentUserRole` | `switchUserRole(role)` | ปรับสิทธิ์การเห็นเมนูตรวจนับสิ้นปี และการอนุมัติใบเบิกตามระดับผู้ใช้ |
| **SET-04** | ส่งออกข้อมูลคลังหลักเป็น CSV (Export Master CSV) | 🟢 REAL | `allData` | `exportToCSV()` | ดาวน์โหลด `Master_Items_HRT_YYYY-MM-DD.csv` มี BOM ครบถ้วน |
| **SET-05** | ดาวน์โหลดเทมเพลตต้นแบบ (Download Template CSV) | 🟢 REAL | Template Structure | `exportDatabaseTemplate()` | สร้างไฟล์ `Master_Items_Template.csv` พร้อมข้อมูลตัวอย่าง 5 หมวด |
| **SET-06** | นำเข้าข้อมูลพัสดุจาก CSV (Import CSV Modal) | 🟢 REAL | `allData`, `parsedImportRows` | `openImportModal()`, `processCsvFile()`, `confirmImportData()` | Drag & Drop ไฟล์ CSV, เลือก Overwrite / Merge, แสดง Preview 5 แถวแรก |
| **SET-07** | Google Sheets Integration Guide & Apps Script Modal | 🔵 SIMULATION | Modal View | `openSheetsModal()`, `closeSheetsModal()` | แสดงคำแนะนำการติดตั้ง Apps Script และลิงก์ไปยัง `https://script.new` |
| **SET-08** | Google Workspace SSO Login Simulation | 🔵 SIMULATION | `currentUserRole` | `simulateGoogleLogin()` | จำลองการเข้าสู่ระบบผ่าน Google Workspace สถานศึกษา |

---

## 3. Pilot Backend Integration Readiness Assessment

| โมดูล | สถานะการเตรียมพร้อม | แหล่งข้อมูลเดิม | เป้าหมายการเชื่อมต่อใน Pilot Backend | ข้อควรระวังในการเชื่อมต่อ |
|---|---|---|---|---|
| **1. Dashboard** | 100% พร้อม | `allData` (In-Memory) | Read-only API Endpoint ดึงสถานะสรุป | ห้ามเปลี่ยนสูตรคำนวณและเกณฑ์ ROP/Min |
| **2. Inventory** | 100% พร้อม | `allData` (In-Memory) | CRUD API (GET items, POST restock) | ต้องรักษาโครงสร้าง 100 รายการและ 8 หมวดหมู่ |
| **3. Requisition** | 100% พร้อม | `mockRequisitionPresets` | Requisition Workflow API (POST req, PUT issue) | ต้องตรวจสอบ Stock Lock ขณะตัดจ่าย |
| **4. FSN Management** | 95% พร้อม | `fsnData` (In-Memory) | FSN Registry Table / Specs Drive Folder | โครงสร้าง 13 หลักต้องตรงตาม e-GP |
| **5. Year-End Audit** | 100% พร้อม | `auditItemsData` | Snapshot Table / Annual Closing API | ต้องบันทึกประวัติถาวรไม่ให้ถูกเขียนทับ |
| **6. Forms Engine** | 100% พร้อม | In-Memory Rendering | Print Template Data Hydration | ต้องไม่กระทบ `@media print` เดิม |
| **7. Settings & Sync** | 90% พร้อม | Client State & CSV | Google Sheets Live Sync / User Directory API | ปรับปรุงจาก Simulation สู่ Live Connection |

---

**ลงนามรับรองความถูกต้องของ Feature Matrix:**  
*Senior Software Architect & Configuration Management Team*  
*วันที่ 26 กันยายน 2569*
