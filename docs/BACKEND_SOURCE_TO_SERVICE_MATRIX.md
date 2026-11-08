# ตารางเชื่อมโยงไฟล์ซอร์สโค้ดสู่บริการแบ็กเอนด์ (Backend Source-to-Service Matrix)
## HRT Inventory System — โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)
### เอกสารควบคุม: SIMS-MTX-2026-008 | รุ่นเป้าหมาย: v2.7.0-rc.3

---

### ตารางเมทริกซ์ซอร์สโค้ดและขอบเขตบริการ (Complete Source-to-Service Mapping)

| ไฟล์ต้นทาง (Source File) | เลเยอร์ทางสถาปัตยกรรม (Logical Layer) | โดเมนเซอร์วิสที่รับผิดชอบ (Domain Services) | รายการ RPC Actions / ฟังก์ชัน | แผ่นงานที่เข้าถึง (Target Sheets) | สิทธิ์ที่ต้องการ (Required Permissions) | ชุดทดสอบที่ครอบคลุม (Covered Tests) | สถานะทางวิศวกรรม (Status) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **`Config.gs`** | Configuration & Constants | Global Configuration, Schema Definition, Role/Permissions Map | `CONFIG`, `getCacheScopePrefix`, `getActiveTransactionYear` | All 16 Sheets (Definitions only) | System-level | `regression_test`, `p1_p2`, `p3`, `p4`, `p6`, `p7`, `p8` | **ACTIVE (SSOT)** |
| **`Api.gs`** | API Gateway & Security | Action Dispatcher, RBAC Guard, Idempotency Cache, Param Validator | `apiDispatch`, `routeRequest`, `resolveAuthenticatedUser`, `checkIdempotency` | `01_Users`, `16_Idempotency_Log` | Any Domain User (Validates per Action) | `p1_p2 (Test 2, 7, 8)`, `p7 (Scenario 1, 2)`, `p8 (Scenario 2, 10)` | **ACTIVE (SSOT)** |
| **`Read.gs`** | Read Services & Query Engine | Item Catalog, 8-Dim Filtering, Dashboard Metrics, QR Resolve, Audits | `apiGetItems`, `apiGetDashboardMetrics`, `apiResolveQr`, `apiGetYearEndAudit`, `apiGetSettingsSection` | `03_Master_Items`, `06_FSN_Catalog`, `07_Requisitions`, `12_Fiscal_Years`, `15_Settings_Config` | `VIEW_INVENTORY`, `VIEW_OWN_REQUISITIONS`, `YEAR_END_AUDIT` | `regression_test (TC-02, TC-03)`, `p3 (C-1, C-2, C-5)`, `p7 (Scenario 6)` | **ACTIVE (SSOT)** |
| **`Write.gs`** | Write Services & Mutation Engine | Requisition Workflow, Stock Issuance, SSOT Ledger, CSV Import, Settings Update | `apiCreateRequisition`, `apiApproveRequisition`, `apiIssueStock`, `apiConfirmReceipt`, `apiUpdateSettingsSection` | `03_Master_Items`, `07_Requisitions`, `08_Requisition_Items`, `09_Stock_Transactions`, `10_Stock_Ledger` | `CREATE_REQUISITION`, `APPROVE_REQUISITION`, `ISSUE_STOCK`, `MANAGE_SETTINGS` | `regression_test (TC-04, 05, 06, 07)`, `p1_p2 (Test 4, 5)`, `p6 (A.4, A.5)`, `p8 (Scenario 1, 3, 4, 6)` | **ACTIVE (SSOT)** |
| **`Audit.gs`** | Audit & Cryptography | SHA-256 Hash Chaining, Tamper-evident Logging, Integrity Verification | `logAudit`, `verifyHashChain`, `computeAuditHash` | `11_Audit_Trail` | `VIEW_AUDIT_LOG`, `VERIFY_AUDIT_LOG` | `regression_test (TC-09)`, `p1_p2 (Test 10)`, `p6 (A.6)`, `p7 (Scenario 10)` | **ACTIVE (SSOT)** |
| **`Code.gs`** | Entrypoint & Web App Routing | HTTP Handlers, HTML Template Evaluator | `doGet`, `doPost`, `include` | Presentation Router | Public (HTML), Domain (POST) | `p6 (A.8)`, `p7 (Scenario 10)` | **ACTIVE (SSOT)** |
| **`index.html`** | Presentation & SPA Controller | Central UI, MiniUI Mobile Drawer, Settings Hub, ESC LIFO Overlay Stack | `switchMainView`, `initSettingsModule`, `saveCurrentSectionChanges`, `pushOverlay`, `popOverlay` | DOM & In-Memory Client Cache | Role-based UI Gating | `p6 (A.8)`, `p7 (Scenario 10)`, `p8 (Scenario 5)` | **ACTIVE (SSOT)** |
| **`js/services/ApiService.js`** | Frontend Gateway Adapter | RPC Bridge, Timeout Protection, Staging Mock Fallback | `ApiService.call`, `fetchWithTimeout` | Client Memory / Backend RPC | Client Session | `regression_test`, `p3`, `p7` | **ACTIVE (Adapter)** |
| **`frontend/main/App.js`** | Frontend Modular Controller | Settings State Manager, MiniUI Cart Controller | `window.settingsState`, `switchSettingsCategory`, `addMiniCartItem` | DOM | Role-based UI Gating | `p7 (Scenario 1-10)` | **ACTIVE (Modular)** |
| **`backend/api/ApiRouter.gs`** | Legacy Modular Backend | Proposal Action Router | `ApiRouter.dispatch` | Legacy 8 Tables | System | `tests/backend/*` (Archived) | **INACTIVE (Archive)** |
| **`backend/services/StockService.gs`**| Legacy Stock Engine | Proposal Stock Movement | `StockService.issue` | `Stock_Ledger`, `Master_Items` | `ISSUE_STOCK` | `tests/backend/Module8_StockTest` | **INACTIVE (Archive)** |
| **`apps_script/ActionService.gs`**| Legacy Modular Backend | Proposal Action Service | `ActionService.execute` | Legacy 15 Tables | System | `apps_script/TestRBAC.gs` | **INACTIVE (Archive)** |
| **`School_Inventory_DB_2567_AppsScript.js`** | Monolithic Baseline v2.6.0 | Legacy Initial Script (Year 2567) | `createInventorySheets` | `Master_Items`, `Transactions` (2 Sheets) | Owner Only | Baseline Inspection | **INACTIVE (Historical)** |

---

### ข้อสรุปความชัดเจนของสถาปัตยกรรม (Architecture Rationalization)
1. **SSOT Writer Project:** ระบบใช้ไฟล์ `.gs` ในไดเรกทอรีหลัก (`Root *.gs`) เป็น Single Source of Truth เพียงหนึ่งเดียวในการประมวลผลคำขอและรันชุดทดสอบ
2. **การกักกันรหัสเดิม (Code Quarantine):** โฟลเดอร์ `backend/` และ `apps_script/` เป็นเพียงโครงร่างข้อเสนอในอดีต (Proposals) ไม่มีการเรียกใช้งานใน Production Runtime ปัจจุบัน จึงไม่มีความเสี่ยงเรื่อง Split-Brain Writer
