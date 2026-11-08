# Comprehensive Refactoring & Function Mapping Specification
## HRT School Inventory Management System (ระบบบริหารจัดการพัสดุและคลังวัสดุโรงเรียน)

> **Document Status**: Approved Refactoring Blueprint  
> **Safety Guarantee**: 0% Function Loss | 0% Logic Change | 100% Backward Compatibility  
> **Constraint**: No React rewrite. Strict preservation of Vanilla JS ES6+ / Tailwind / Chart.js.

---

## Refactoring Risk Scoring Key
- 🟢 **Low**: Pure utility function or self-contained view renderer. No side effects; easily isolated.
- 🟡 **Medium**: Component or service with UI DOM couplings or localized state. Requires careful parameter preservation.
- 🟠 **High**: Core workflow controller or stateful orchestrator (e.g. Multi-item Requisition, Filter Engine). Touches multiple stores.
- 🔴 **Critical**: Financial or inventory Double-Entry Ledger, Mutex lock, or database writing. Erroneous changes risk data corruption or stock discrepancy.

---

## 1. Entry Point

| Current File / Symbol | Current Responsibility | Target Folder | Target File | Dependencies (Inbound / Outbound / Global) | Refactor Risk | Backward Compatibility Strategy |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `index.html` (Shell lines 1–981, 983–1050) | Main HTML document shell, head metadata, CDN imports (Tailwind, Lucide, FontAwesome, Chart.js), root `#app` container. | `frontend/main/` | `index.html` | Inbound: Web browser / GAS `doGet`<br>Outbound: CSS includes, JS includes | 🟢 Low | Keep root HTML layout intact; replace embedded styles/scripts with modular `<?!= include(...) ?>` tags. |
| `index.html` (Lines 13480–13535: `document.addEventListener('DOMContentLoaded', ...)`) | Client-side bootloader: initializes icons, sets up event listeners, loads initial mock data, calls `renderKPIs()`, `renderTable()`. | `frontend/main/` | `app.js` | Inbound: Browser DOM event<br>Outbound: `AppState.init()`, `DashboardPage.init()`, `InventoryPage.init()` | 🟡 Medium | Encapsulate into `window.App.bootstrap()`; maintain automatic execution on `DOMContentLoaded`. |
| `Code.gs` (New file) | Google Apps Script standard entry point: handles HTTP GET/POST and file inclusion for templated HTML. | `/` | `Code.gs` | Inbound: Google Apps Script Web App Engine<br>Outbound: `HtmlService`, `backend/api/*` | 🟡 Medium | Expose standard `doGet(e)` and `doPost(e)` with HTML template evaluation and `include(filename)`. |
| `Config.gs` (New file) | Backend global constants: Spreadsheet IDs, Sheet Tab Names, Fiscal Year defaults, User Roles, Cache TTLs. | `/` | `Config.gs` | Inbound: All `backend/*` files<br>Outbound: PropertiesService | 🟢 Low | Declare `CONFIG` frozen object accessible across all Apps Script `.gs` files. |
| `window.*` Facade (Global namespace bindings) | Exposes all refactored modular methods on `window` to support existing inline HTML event handlers (`onclick`, `onchange`). | `frontend/main/` | `global-facade.js` | Inbound: Inline HTML attributes<br>Outbound: All `frontend/pages/*`, `frontend/components/*` | 🟠 High | Strict 1-to-1 delegation: `window.openDrawer = ItemDetailDrawer.open`, `window.switchMainView = App.switchView`, etc. |

---

## 2. Frontend Pages

| Current File / Symbol | Current Responsibility | Target Folder | Target File | Dependencies (Inbound / Outbound / Global) | Refactor Risk | Backward Compatibility Strategy |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `#viewDashboard` & `switchMainView('dashboard')` | Dashboard view: displays summary metric cards, 8-dimensional analytics filters, inventory distribution chart, stockout warnings. | `frontend/pages/` | `DashboardPage.js` | Inbound: Nav click, `global-facade.js`<br>Outbound: `DashboardService`, `InventoryCharts`, `FilterState` | 🟠 High | Export `DashboardPage.render()` and delegate `window.switchMainView` in `global-facade.js`. |
| `#viewInventory` & `switchMainView('inventory')` | Master inventory catalog page: search bar, quick category tabs, items table, batch stock actions. | `frontend/pages/` | `InventoryPage.js` | Inbound: Nav click, Drawer close<br>Outbound: `ItemService`, `DataTableComponent`, `ItemDetailDrawer` | 🟠 High | Wrap view logic in `InventoryPage.init()`; preserve all table filter callbacks. |
| `#viewRequisition` & `switchMainView('requisition')` | Requisitions dashboard: pending approvals queue, requisition tracking table, multi-item creation trigger. | `frontend/pages/` | `RequisitionPage.js` | Inbound: Nav click<br>Outbound: `RequisitionService`, `ReqDetailDrawer`, `MultiItemRequisitionModal` | 🟠 High | Bind table action buttons via delegated event handlers or global facade. |
| `#viewFSN` & `switchMainView('fsn')` | FSN classification directory: hierarchical 8-digit category explorer, asset search, add new FSN button. | `frontend/pages/` | `FsnCatalogPage.js` | Inbound: Nav click<br>Outbound: `ItemService`, `AddFsnModal`, `AppState.fsnData` | 🟡 Medium | Keep `window.renderFsnTree()` and `window.filterFsnCatalog()` available via facade. |
| `#viewDocs` & `switchMainView('docs')` | Official documents center: sub-tabs for พ.ด. ๑–๗, parameter selector (date range, department, item), printable preview frame. | `frontend/pages/` | `DocumentsPage.js` | Inbound: Nav click, Sub-tab clicks<br>Outbound: `ReportService`, `FormPd1-7 Renderers`, `PrintManager` | 🟠 High | Preserve `switchDocsSubTab(tabName)` signature and DOM IDs for print styling. |
| `#viewYearEndAudit` & `switchMainView('yearEndAudit')` | Annual inventory audit workspace: physical count discrepancy calculation, stock freeze controls, audit sign-off. | `frontend/pages/` | `YearEndAuditPage.js` | Inbound: Nav click<br>Outbound: `StockService`, `FiscalYearService`, `CloseFiscalYearModal` | 🟠 High | Maintain discrepancy calculation formulas and table row rendering. |
| `#viewSettings` & `switchMainView('settings')` | System configuration: fiscal year selector, role permission matrix, sheet sync status, mock data reset. | `frontend/pages/` | `SettingsPage.js` | Inbound: Nav click<br>Outbound: `UserService`, `AppState`, `DatabaseSetup` | 🟡 Medium | Maintain settings form submission handlers. |

---

## 3. Frontend Components

### 3.1 Drawers & Slide-Over Panels

| Current File / Symbol | Current Responsibility | Target Folder | Target File | Dependencies (Inbound / Outbound / Global) | Refactor Risk | Backward Compatibility Strategy |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `openDrawer(itemId)` / `closeDrawer()` (`#itemDrawer`) | 360-degree item inspection drawer: specifications, photos, real-time stock balances, transactions history, stock card print trigger. | `frontend/components/drawers/` | `ItemDetailDrawer.js` | Inbound: Table row click (`onclick="openDrawer('...')"`), `global-facade.js`<br>Outbound: `ItemService`, `StockLedgerTable`, `Formatters` | 🟠 High | Expose `ItemDetailDrawer.open(id)` and `close()`. Bind `window.openDrawer` directly in `global-facade.js`. |
| `openReqDrawer(reqId)` / `closeReqDrawer()` (`#reqDetailDrawer`) | Requisition detail drawer: line-item inspection, approval action buttons (Approve/Reject/Issue), signature timeline. | `frontend/components/drawers/` | `ReqDetailDrawer.js` | Inbound: Requisition table click (`onclick="openReqDrawer('...')"`), `global-facade.js`<br>Outbound: `RequisitionService`, `ConfirmIssueModal` | 🟠 High | Retain `window.openReqDrawer` and `window.closeReqDrawer` via facade. |
| `switchItemDrawerTab(tabId)` | Switches active tab in Item Drawer (Overview, Stock Movements, Specifications, Usage Stats). | `frontend/components/drawers/` | `ItemDetailDrawer.js` | Inbound: Tab buttons inside drawer<br>Outbound: DOM tab toggling | 🟢 Low | Retain `window.switchItemDrawerTab` via facade. |

### 3.2 Modals & Dialogs

| Current File / Symbol | Current Responsibility | Target Folder | Target File | Dependencies (Inbound / Outbound / Global) | Refactor Risk | Backward Compatibility Strategy |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `openMultiRequisitionModal()`, `submitMultiRequisition()` (`#multiItemRequisitionModal`) | Multi-item requisition basket: dynamic item search, live stock balance check, quantity limits, department selector, multi-item checkout. | `frontend/components/modals/` | `MultiItemRequisitionModal.js` | Inbound: Header button, `global-facade.js`<br>Outbound: `RequisitionService`, `ClientLockService`, `AppState` | 🔴 Critical | Ensure basket state cannot desync with inventory stock limits. Facade retains `window.openMultiRequisitionModal`. |
| `openConfirmIssueModal(reqId)` (`#confirmIssueModal`) | Physical stock issue verification: displays approved items, requires issuer confirmation, triggers ledger deduction. | `frontend/components/modals/` | `ConfirmIssueModal.js` | Inbound: Req detail drawer action<br>Outbound: `StockService`, `ClientLockService`, `AppState` | 🔴 Critical | Preserve exact modal structure and payload format for stock issue. |
| `openAddStockModal(itemId)` (`#addStockModal`) | Stock receipt / adjustment dialog: lot number, unit price, quantity received, supplier, budget code, po reference. | `frontend/components/modals/` | `AddStockModal.js` | Inbound: Inventory page button, Item drawer<br>Outbound: `StockService`, `ClientLockService`, `Formatters` | 🔴 Critical | Facade preserves `window.openAddStockModal(itemId)`. Validates quantity > 0. |
| `openCloseFiscalYearModal()` (`#closeFiscalYearModal`) | Annual fiscal rollover dialog: confirms physical count reconciliation, creates snapshot, rolls over closing balances. | `frontend/components/modals/` | `CloseFiscalYearModal.js` | Inbound: Year-End Audit page button<br>Outbound: `FiscalYearService`, `ClientLockService` | 🔴 Critical | Require explicit user confirmation; map `window.openCloseFiscalYearModal`. |
| `openAddFsnModal()` (`#addFsnModal`) | New FSN item registration: 8-digit FSN input, description, unit of measure, minimum stock threshold. | `frontend/components/modals/` | `AddFsnModal.js` | Inbound: FSN catalog page button<br>Outbound: `ItemService`, `Validator` | 🟡 Medium | Retain `window.openAddFsnModal` via facade. |
| `openPdfViewerModal(type, id)` (`#pdfViewerModal`) | Print preview modal: renders government form in isolated container, triggers browser print with proper margins. | `frontend/components/modals/` | `PdfViewerModal.js` | Inbound: Document page print buttons<br>Outbound: `PrintManager`, `FormPd1-7 Renderers` | 🟡 Medium | Retain `window.openPdfViewerModal` via facade. |
| `#importDataModal` & `#sheetsModal` | Data import and Google Sheets synchronization status modals. | `frontend/components/modals/` | `SyncModals.js` | Inbound: Settings page buttons<br>Outbound: `ApiService`, `DatabaseSetup` | 🟡 Medium | Retain all modal toggles in facade. |

### 3.3 Tables & Data Grids

| Current File / Symbol | Current Responsibility | Target Folder | Target File | Dependencies (Inbound / Outbound / Global) | Refactor Risk | Backward Compatibility Strategy |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `renderTable(data, page)` | Primary inventory table engine: renders rows, badges, stock health indicators, action buttons, pagination controls. | `frontend/components/tables/` | `DataTableComponent.js` | Inbound: `InventoryPage`, `FilterState`<br>Outbound: `Formatters`, `ItemDetailDrawer`, DOM | 🟠 High | Preserve exact HTML markup generation for row items and badges; keep `window.renderTable`. |
| `renderPagination(totalItems, currentPage)` | Pagination component: calculates page numbers, previous/next triggers, items-per-page selector. | `frontend/components/tables/` | `DataTableComponent.js` | Inbound: `renderTable()`<br>Outbound: `window.changePage()` | 🟢 Low | Keep `window.changePage` on facade. |
| `renderLedgerTable(historyData)` | Historical transactions timeline table inside Item Detail Drawer. | `frontend/components/tables/` | `StockLedgerTable.js` | Inbound: `ItemDetailDrawer.open()`<br>Outbound: `Formatters`, DOM | 🟡 Medium | Keep `window.renderLedgerTable` on facade. |

### 3.4 Charts

| Current File / Symbol | Current Responsibility | Target Folder | Target File | Dependencies (Inbound / Outbound / Global) | Refactor Risk | Backward Compatibility Strategy |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `renderChart(data)` | Chart.js doughnut & bar charts: renders inventory category valuation, fast/slow moving items, stockout risks. | `frontend/components/charts/` | `InventoryCharts.js` | Inbound: `DashboardPage`, `applyDashFilters()`<br>Outbound: `Chart.js` global instance | 🟡 Medium | Encapsulate Chart instance lifecycle (destroy before re-create); bind `window.renderChart`. |

### 3.5 Official Ministry Forms (พ.ด. ๑–๗)

| Current File / Symbol | Current Responsibility | Target Folder | Target File | Dependencies (Inbound / Outbound / Global) | Refactor Risk | Backward Compatibility Strategy |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `renderDailyReport()` | พ.ด. ๑: ใบเบิกพัสดุประจำวัน (Daily Requisition Report) HTML template & data binding. | `frontend/components/forms/` | `FormPd1DailyReport.js` | Inbound: `DocumentsPage`, `PdfViewerModal`<br>Outbound: `ReportService`, `Formatters` | 🟡 Medium | Export pure render function; bind `window.renderDailyReport` in facade. |
| `renderRequisitionForm(reqId)` | พ.ด. ๒: ใบเบิกพัสดุและอนุมัติจ่าย (Official Requisition & Issuance Form) with committee signature boxes. | `frontend/components/forms/` | `FormPd2Requisition.js` | Inbound: `RequisitionPage`, `ReqDetailDrawer`<br>Outbound: `RequisitionService`, `Formatters` | 🟡 Medium | Export pure render function; bind `window.renderRequisitionForm` in facade. |
| `renderStockCardReport(itemId)` | พ.ด. ๓: บัตรบัญชีคุมพัสดุ (Stock Card) with running balance, lot numbers, and receiving/issuing history. | `frontend/components/forms/` | `FormPd3StockCard.js` | Inbound: `ItemDetailDrawer`, `DocumentsPage`<br>Outbound: `StockService`, `Formatters` | 🟠 High | Ensure exact running balance calculation matches ledger; bind `window.renderStockCardReport`. |
| `renderMonthlyReport(month, year)` | พ.ด. ๔: รายงานการรับจ่ายพัสดุประจำเดือน (Monthly In/Out Material Summary). | `frontend/components/forms/` | `FormPd4Monthly.js` | Inbound: `DocumentsPage`<br>Outbound: `ReportService`, `Formatters` | 🟡 Medium | Export pure render function; bind `window.renderMonthlyReport` in facade. |
| `renderYearEndSummaryReport()` | พ.ด. ๕: รายงานผลการตรวจสอบพัสดุประจำปี (Annual Physical Inventory Summary). | `frontend/components/forms/` | `FormPd5AuditSummary.js` | Inbound: `YearEndAuditPage`, `DocumentsPage`<br>Outbound: `FiscalYearService`, `Formatters` | 🟡 Medium | Export pure render function; bind `window.renderYearEndSummaryReport` in facade. |
| `renderYearEndCategoryReport()` | พ.ด. ๖: รายงานการตรวจสอบพัสดุจำแนกตามประเภท (Inventory Audit by Category). | `frontend/components/forms/` | `FormPd6AuditCategory.js` | Inbound: `YearEndAuditPage`, `DocumentsPage`<br>Outbound: `FiscalYearService`, `Formatters` | 🟡 Medium | Export pure render function; bind `window.renderYearEndCategoryReport` in facade. |
| `renderYearEndAllItemsReport()` | พ.ด. ๗: บัญชีรายละเอียดการตรวจสอบพัสดุสิ้นปี (Exhaustive Year-End Inventory Count Schedule). | `frontend/components/forms/` | `FormPd7AuditAllItems.js` | Inbound: `YearEndAuditPage`, `DocumentsPage`<br>Outbound: `FiscalYearService`, `Formatters` | 🟡 Medium | Export pure render function; bind `window.renderYearEndAllItemsReport` in facade. |

---

## 4. Frontend Services

| Current File / Symbol | Current Responsibility | Target Folder | Target File | Dependencies (Inbound / Outbound / Global) | Refactor Risk | Backward Compatibility Strategy |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `ApiServiceCore` / `js/services/ApiService.js` | Transport layer: abstracts `google.script.run` vs local browser mock mode, error handling, timeout recovery. | `frontend/services/` | `ApiService.js` | Inbound: All `frontend/services/*`<br>Outbound: `google.script.run` or mock store | 🟠 High | Retain `window.ApiServiceCore` and `window.ApiService` on facade. |
| `window.ItemApi` / `js/services/ItemApi.js` | Client item data operations: search, fetch items, get item by ID, create/update item records. | `frontend/services/` | `ItemService.js` | Inbound: `InventoryPage`, `ItemDetailDrawer`<br>Outbound: `ApiService`, `AppState` | 🟡 Medium | Export `ItemService`; alias to `window.ItemApi` for full backward compatibility. |
| `window.RequisitionApi` / `js/services/RequisitionApi.js` | Client requisition workflows: submit requisition, approve, issue, reject, fetch requisitions queue. | `frontend/services/` | `RequisitionService.js` | Inbound: `RequisitionPage`, `MultiItemModal`<br>Outbound: `ApiService`, `AppState`, `ClientLockService` | 🟠 High | Export `RequisitionService`; alias to `window.RequisitionApi` on facade. |
| `window.StockApi` / `js/services/StockApi.js` | Client stock operations: post adjustment, receive stock, fetch stock ledger transactions. | `frontend/services/` | `StockService.js` | Inbound: `AddStockModal`, `ConfirmIssueModal`<br>Outbound: `ApiService`, `AppState` | 🟠 High | Export `StockService`; alias to `window.StockApi` on facade. |
| `window.DashboardApi` / `js/services/DashboardApi.js` | Client metrics query: KPI metrics, 8D filtered stats, category valuation breakdown. | `frontend/services/` | `DashboardService.js` | Inbound: `DashboardPage`<br>Outbound: `ApiService`, `FilterState` | 🟡 Medium | Export `DashboardService`; alias to `window.DashboardApi` on facade. |
| `window.UserApi` / `js/services/UserApi.js` | Client user and authorization operations: get current user, check permissions, list departmental users. | `frontend/services/` | `UserService.js` | Inbound: `App.init()`, `UserSessionState`<br>Outbound: `ApiService` | 🟢 Low | Export `UserService`; alias to `window.UserApi` on facade. |
| `showToast()`, `showAlert()` (UI Toast & Alert functions) | Displays floating toast notifications (Success, Error, Warning, Info) and accessible banner alerts. | `frontend/services/` | `NotificationClient.js` | Inbound: All components & pages<br>Outbound: DOM toast container | 🟢 Low | Export `NotificationClient.toast(...)`; bind `window.showToast` on facade. |
| Report Data Assembler | Assembles data structures required by พ.ด. ๑–๗ from ledger and master items before printing. | `frontend/services/` | `ReportService.js` | Inbound: `DocumentsPage`, `FormPd1-7`<br>Outbound: `ItemService`, `StockService` | 🟡 Medium | Centralizes report preparation logic previously scattered across inline renderers. |

---

## 5. Frontend State

| Current File / Symbol | Current Responsibility | Target Folder | Target File | Dependencies (Inbound / Outbound / Global) | Refactor Risk | Backward Compatibility Strategy |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `window.allData`, `window.filteredData`, `currentPage` | Master in-memory catalog cache and filtered pagination state. | `frontend/state/` | `AppState.js` | Inbound: Pages, Tables, Drawers<br>Outbound: Event listeners | 🟠 High | Encapsulate in `AppState` store with reactive subscribers; keep `window.allData` as getter/setter proxy. |
| `window.stockLedgerEntries`, `window.auditTrailEntries` | In-memory append-only double-entry stock ledger and audit records. | `frontend/state/` | `AppState.js` | Inbound: `StockService`, `ItemDetailDrawer`<br>Outbound: Ledger balance calculators | 🔴 Critical | Enforce immutable append in `AppState`; provide backward-compatible proxy on `window.stockLedgerEntries`. |
| `window.dashFilters` | 8-dimensional dashboard filter state (Fiscal Year, Category, Budget Type, Department, Status, Urgency, etc.). | `frontend/state/` | `FilterState.js` | Inbound: `DashboardPage`, `applyDashFilters()`<br>Outbound: `DashboardService`, `renderKPIs` | 🟠 High | Provide `FilterState.get()`, `FilterState.set()`; preserve `window.dashFilters` proxy. |
| `ClientLockService` (Lines ~4820–4860) | Client-side Mutex lock: prevents double-click submissions on requisitions and stock adjustments. | `frontend/state/` | `ClientLockService.js` | Inbound: All modal submit handlers<br>Outbound: NotificationClient | 🟠 High | Maintain `acquireLock(action, timeout)` and `releaseLock(action)`. Bind to `window.ClientLockService`. |
| `window.currentUser` | Authenticated user session, assigned role (Admin/Officer/Approver/Requester), department context. | `frontend/state/` | `UserSessionState.js` | Inbound: Navigation, Permission gates<br>Outbound: DOM visibility toggles | 🟡 Medium | Keep `window.currentUser` as active proxy. |

---

## 6. Utilities

| Current File / Symbol | Current Responsibility | Target Folder | Target File | Dependencies (Inbound / Outbound / Global) | Refactor Risk | Backward Compatibility Strategy |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `formatCurrency(amount)` | Formats numbers as Thai Baht currency (`฿#,##0.00`). | `frontend/utils/` | `Formatters.js` | Inbound: All tables, cards, forms<br>Outbound: None (Pure) | 🟢 Low | Keep `window.formatCurrency` bound on facade. |
| `formatThaiDate(dateStr)`, `toBuddhistYear(year)` | Converts ISO dates to Thai Buddhist Calendar format (`วว ดดด ปปปป`). | `frontend/utils/` | `Formatters.js` | Inbound: All date displays, forms<br>Outbound: None (Pure) | 🟢 Low | Keep `window.formatThaiDate` bound on facade. |
| `formatNumber(num)` | Formats integers with comma separators. | `frontend/utils/` | `Formatters.js` | Inbound: Tables, charts<br>Outbound: None (Pure) | 🟢 Low | Keep `window.formatNumber` bound on facade. |
| `formatFsnCode(code)` | Formats raw digits into standardized FSN pattern (`XXXX-XX-XXXX`). | `frontend/utils/` | `Formatters.js` | Inbound: FSN catalog, forms<br>Outbound: None (Pure) | 🟢 Low | Keep `window.formatFsnCode` bound on facade. |
| DOM Selection & Class Utilities | Safe querying, class toggling (`showElement`, `hideElement`, `setLoadingState`). | `frontend/utils/` | `DomHelpers.js` | Inbound: Pages, Modals, Drawers<br>Outbound: DOM APIs | 🟢 Low | Provide helper methods; no breaking changes. |
| Print Execution Utilities | Manages `@media print` layout adjustments, header/footer suppression, and A4 page breaks. | `frontend/utils/` | `PrintManager.js` | Inbound: `PdfViewerModal`, Forms<br>Outbound: `window.print()` | 🟢 Low | Keep print trigger methods bound on facade. |
| Client Input Validation Utilities | Validates form fields (non-empty strings, positive decimals, email formats). | `frontend/utils/` | `Validator.js` | Inbound: Modals<br>Outbound: None (Pure) | 🟢 Low | Export reusable validators; attach to window. |
| `exportToCsv(data, filename)` | Exports table arrays to UTF-8 CSV with BOM for Thai Excel compatibility. | `frontend/utils/` | `ExportUtils.js` | Inbound: Table export buttons<br>Outbound: Browser Blob / Download | 🟢 Low | Keep `window.exportToCsv` bound on facade. |

---

## 7. Backend API

| Target Function Symbol | Responsibility | Target Folder | Target File | Dependencies (Inbound / Outbound / Global) | Refactor Risk | Backward Compatibility Strategy |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `apiGetItems(filterQuery)` | API controller: validates query, queries `ItemRepository`, applies search filters, returns JSON items list. | `backend/api/` | `ItemApi.gs` | Inbound: `google.script.run.apiGetItems`<br>Outbound: `ItemService`, `AuthGuard` | 🟡 Medium | Provide standardized response contract `{ success: true, data: [...] }`. |
| `apiGetItemDetail(itemId)` | API controller: fetches item metadata, running balance, and ledger history. | `backend/api/` | `ItemApi.gs` | Inbound: `google.script.run`<br>Outbound: `ItemService`, `LedgerService` | 🟡 Medium | Standardized response contract. |
| `apiCreateItem(itemPayload)` | API controller: validates FSN schema, checks duplicates, inserts master item row. | `backend/api/` | `ItemApi.gs` | Inbound: `google.script.run`<br>Outbound: `SchemaValidator`, `ItemService`, `AuditLogger` | 🟠 High | Strict server-side permission check (Admin/Officer only). |
| `apiCreateRequisition(payload)` | API controller: verifies stock availability, acquires lock, reserves items, generates REQ ID. | `backend/api/` | `RequisitionApi.gs` | Inbound: `google.script.run`<br>Outbound: `RequisitionService`, `LockManager`, `AuditLogger` | 🔴 Critical | Atomic execution protected by `LockManager`. |
| `apiApproveRequisition(reqId)` | API controller: checks approver role, updates requisition state to APPROVED. | `backend/api/` | `RequisitionApi.gs` | Inbound: `google.script.run`<br>Outbound: `RequisitionService`, `AuthGuard` | 🟠 High | Role validation (Approver/Admin only). |
| `apiIssueRequisition(reqId)` | API controller: executes physical issuance, appends to immutable stock ledger, releases reservation. | `backend/api/` | `RequisitionApi.gs` | Inbound: `google.script.run`<br>Outbound: `LedgerService`, `StockService`, `LockManager` | 🔴 Critical | Atomic stock reduction via double-entry ledger. |
| `apiPostStockAdjustment(payload)` | API controller: records receiving / count adjustment into stock ledger. | `backend/api/` | `StockApi.gs` | Inbound: `google.script.run`<br>Outbound: `StockService`, `LedgerService`, `LockManager` | 🔴 Critical | Prevents negative balance; verifies authorization. |
| `apiGetDashboardMetrics(filters)` | API controller: computes KPIs, stock health counts, and financial valuation. | `backend/api/` | `DashboardApi.gs` | Inbound: `google.script.run`<br>Outbound: `DashboardService`, `CacheService` | 🟡 Medium | Cached results for high performance. |
| `apiGetCurrentUser()` | API controller: resolves active Google user email, queries User sheet, returns role and profile. | `backend/api/` | `UserApi.gs` | Inbound: `google.script.run`<br>Outbound: `UserRepository`, `Session` | 🟢 Low | Fallback to default requester if unrecognized. |
| `apiGeneratePdReport(type, params)` | API controller: compiles government form data structure for server-side generation. | `backend/api/` | `ReportApi.gs` | Inbound: `google.script.run`<br>Outbound: `ReportGeneratorService` | 🟡 Medium | Return structured JSON ready for printing. |

---

## 8. Backend Business Services

| Target Service / Method | Business Logic Responsibility | Target Folder | Target File | Dependencies (Inbound / Outbound / Global) | Refactor Risk | Backward Compatibility Strategy |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `LedgerService.postEntry()` | Immutable double-entry posting: appends entry with timestamp, user, reference, debit/credit qty, calculates new balance. | `backend/services/` | `LedgerService.gs` | Inbound: `StockService`, `RequisitionService`<br>Outbound: `LedgerRepository`, `Validation` | 🔴 Critical | Never update or delete existing ledger rows; append only. |
| `LedgerService.getBalance(itemId)` | Calculates current available, reserved, and physical balance from ledger timeline. | `backend/services/` | `LedgerService.gs` | Inbound: `ItemService`, `RequisitionService`<br>Outbound: `LedgerRepository` | 🔴 Critical | Source of Truth for all inventory quantities. |
| `RequisitionService.processWorkflow()` | Manages state machine: DRAFT → SUBMITTED → APPROVED → ISSUED (or REJECTED). Handles stock reservation. | `backend/services/` | `RequisitionService.gs` | Inbound: `RequisitionApi`<br>Outbound: `LedgerService`, `NotificationService` | 🔴 Critical | Enforce valid state transitions; prevent double issuance. |
| `StockService.checkSafetyStock()` | Scans active inventory for items at or below reorder threshold; triggers alert notifications. | `backend/services/` | `StockService.gs` | Inbound: `LedgerService.postEntry()`, Cron trigger<br>Outbound: `NotificationService` | 🟡 Medium | Automated threshold alerts. |
| `FiscalYearService.closeYear()` | Closes fiscal year: reconciles physical counts, generates closing snapshot, rolls opening balance to new year. | `backend/services/` | `FiscalYearService.gs` | Inbound: `YearEndAuditPage`<br>Outbound: `LedgerRepository`, `SheetRepository` | 🔴 Critical | Create permanent immutable archive before rollover. |
| `FsnClassificationService.getHierarchy()` | Resolves 8-digit FSN tree: Category (2 digits) → Class (2 digits) → Type (4 digits). Computes category valuations. | `backend/services/` | `FsnClassificationService.gs` | Inbound: `FsnCatalogPage`, `Dashboard`<br>Outbound: `ItemRepository` | 🟡 Medium | Pure business domain mapping. |
| `ReportGeneratorService.compilePdData()` | Compiles data payloads formatted strictly per Comptroller General's Department specifications for พ.ด. ๑–๗. | `backend/services/` | `ReportGeneratorService.gs` | Inbound: `ReportApi`<br>Outbound: `LedgerService`, `ItemRepository` | 🟠 High | Strict adherence to Thai government column definitions. |
| `NotificationService.sendAlert()` | Sends notifications via Google Chat webhook, Line Notify, or Gmail when urgent stock events occur. | `backend/services/` | `NotificationService.gs` | Inbound: `RequisitionService`, `StockService`<br>Outbound: `UrlFetchApp`, `MailApp` | 🟢 Low | Non-blocking alert delivery. |

---

## 9. Data Access

| Target Repository / Method | Data Persistence Responsibility | Target Folder | Target File | Dependencies (Inbound / Outbound / Global) | Refactor Risk | Backward Compatibility Strategy |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `SheetRepository` | Low-level spreadsheet wrapper: `getRange`, `setValues`, batch row appends, tab verification, formula column protection. | `backend/data/` | `SheetRepository.gs` | Inbound: All domain repositories<br>Outbound: `SpreadsheetApp` | 🔴 Critical | Uses batch read/write (`getValues()` / `setValues()`) to prevent Apps Script 6-minute execution timeout. |
| `ItemRepository` | `Master_Items` sheet CRUD: maps rows to typed JavaScript Item entities; handles FSN lookups. | `backend/data/` | `ItemRepository.gs` | Inbound: `ItemService`, `ReportService`<br>Outbound: `SheetRepository` | 🟠 High | Maps column headers dynamically to avoid breakage if columns move. |
| `LedgerRepository` | `Transactions` and `Stock_Ledger` append-only operations: reads historical rows, appends validated ledger transactions. | `backend/data/` | `LedgerRepository.gs` | Inbound: `LedgerService`<br>Outbound: `SheetRepository` | 🔴 Critical | Row insertion only; disables sheet row deletion. |
| `RequisitionRepository` | `Requisitions` and `Requisition_Items` persistence: saves header and line items, queries requisition status. | `backend/data/` | `RequisitionRepository.gs` | Inbound: `RequisitionService`<br>Outbound: `SheetRepository` | 🟠 High | Relational mapping between Header and Items rows. |
| `UserRepository` | `Users` sheet query: reads authorized emails, departments, assigned roles, and digital signature status. | `backend/data/` | `UserRepository.gs` | Inbound: `AuthGuard`, `UserService`<br>Outbound: `SheetRepository` | 🟡 Medium | Cached for fast lookup. |
| `AuditTrailRepository` | `Audit_Trail` sheet logging: writes immutable timestamp, user, action, target entity, before/after diff. | `backend/data/` | `AuditTrailRepository.gs` | Inbound: `AuditLogger`<br>Outbound: `SheetRepository` | 🟡 Medium | Asynchronous or deferred append. |
| `CacheManager` | Wrapper around Apps Script `CacheService.getScriptCache()`: caches item lists, FSN trees, and dashboard metrics (TTL 300s). | `backend/data/` | `CacheService.gs` | Inbound: Repositories & APIs<br>Outbound: `CacheService` | 🟢 Low | Automatic cache invalidation on ledger write. |

---

## 10. Security

| Target Security Module | Security Responsibility | Target Folder | Target File | Dependencies (Inbound / Outbound / Global) | Refactor Risk | Backward Compatibility Strategy |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `AuthGuard.enforceRole()` | Role-Based Access Control: validates user role against allowed roles (`ADMIN`, `OFFICER`, `APPROVER`, `REQUESTER`). | `backend/security/` | `AuthGuard.gs` | Inbound: All `backend/api/*`<br>Outbound: `UserRepository` | 🟠 High | Throws typed `UnauthorizedError` if role insufficient. |
| `AuditLogger.log()` | Centralized audit logging: captures action name, user email, client IP, before/after snapshots. | `backend/security/` | `AuditLogger.gs` | Inbound: Services & APIs<br>Outbound: `AuditTrailRepository` | 🟡 Medium | Non-blocking execution; failure does not abort main transaction. |
| `InputSanitizer.sanitize()` | Input sanitization: strips script tags, escapes HTML entities, prevents Google Sheets formula injection (`=`, `+`, `-`, `@`). | `backend/security/` | `InputSanitizer.gs` | Inbound: API request handlers<br>Outbound: None (Pure) | 🟡 Medium | Prepends quote `'` to strings starting with formula operators. |
| `LockManager.withLock()` | Distributed lock manager: acquires `LockService.getScriptLock()` with 10s timeout to prevent race conditions. | `backend/security/` | `LockManager.gs` | Inbound: `StockService`, `RequisitionService`<br>Outbound: `LockService` | 🔴 Critical | Mandatory wrapper around all ledger and stock writing operations. |

---

## 11. Validation

| Target Validation Module | Validation Responsibility | Target Folder | Target File | Dependencies (Inbound / Outbound / Global) | Refactor Risk | Backward Compatibility Strategy |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `SchemaValidator.validate()` | Validates incoming JSON structure, required fields, and primitive types. | `backend/validation/` | `SchemaValidator.gs` | Inbound: API controllers<br>Outbound: None (Pure) | 🟢 Low | Returns `{ valid: boolean, errors: [] }`. |
| `StockRuleValidator.check()` | Enforces inventory business rules: requested qty > 0, available balance >= requested qty, budget limits. | `backend/validation/` | `StockRuleValidator.gs` | Inbound: `StockService`, `RequisitionService`<br>Outbound: `LedgerService` | 🔴 Critical | Prevents negative stock balance and over-allocation. |
| `FsnValidator.validateFsn()` | Validates Federal Stock Number format: regex matching `^\d{4}-\d{2}-\d{4}$`, checks valid category range (01–99). | `backend/validation/` | `FsnValidator.gs` | Inbound: `ItemApi`, `AddFsnModal`<br>Outbound: None (Pure) | 🟢 Low | Reusable on both frontend and backend. |

---

## 12. Setup / Migration

| Current File / Symbol | Current Responsibility | Target Folder | Target File | Dependencies (Inbound / Outbound / Global) | Refactor Risk | Backward Compatibility Strategy |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `createSchoolInventoryDatabase()` in `School_Inventory_DB_2567_AppsScript.js` | Spreadsheet setup: creates tabs (`Master_Items`, `Transactions`, `Stock_Ledger`, `Users`, `Settings`), sets frozen rows, formats headers. | `backend/setup/` | `DatabaseSetup.gs` | Inbound: Setup trigger<br>Outbound: `SpreadsheetApp` | 🟡 Medium | Keep function callable directly from Apps Script Editor. |
| `setupMasterItems()`, `setupTransactions()` in `School_Inventory_DB_2567_AppsScript.js` | Seeding script: populates 100 sample items, 20 sample transactions, formulas, and category dropdowns. | `backend/setup/` | `DataSeeder.gs` | Inbound: Database setup<br>Outbound: `SheetRepository` | 🟢 Low | Callable standalone for demo/test environments. |
| `protectFormulaColumns()` in `School_Inventory_DB_2567_AppsScript.js` | Spreadsheet security: sets sheet protection on formula columns to prevent accidental overwrite by human editors. | `backend/setup/` | `DatabaseSetup.gs` | Inbound: Database setup<br>Outbound: `SpreadsheetApp` | 🟢 Low | Maintain exact protection ranges. |
| Migration Verification Scripts | Test script verifying that no functions or event bindings were broken during refactoring. | `migration/` | `PhaseValidator.js` | Inbound: CI / Developer check<br>Outbound: `window` inspection | 🟢 Low | Inspects `window` object to verify 100% facade coverage. |
| `CompatibilityTest.html` | Browser test suite: tests all `window.*` API calls and mocks to verify zero regression. | `migration/` | `CompatibilityTest.html` | Inbound: Developer browser<br>Outbound: `global-facade.js` | 🟢 Low | Runs in local browser without Apps Script deployment. |

---

## 13. Tests

| Test Suite File | Test Scope & Responsibility | Target Folder | Target File | Dependencies (Inbound / Outbound / Global) | Refactor Risk | Backward Compatibility Strategy |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `LedgerServiceTest.gs` | Backend unit test: verifies double-entry balance computation, debit/credit integrity, running balance precision. | `tests/backend/` | `LedgerServiceTest.gs` | Inbound: GAS Test Runner<br>Outbound: `LedgerService`, Mock Data | 🟢 Low | Standalone test suite; does not touch production sheets. |
| `RequisitionServiceTest.gs` | Backend unit test: verifies state machine transitions (Submit → Approve → Issue) and stock reservation logic. | `tests/backend/` | `RequisitionServiceTest.gs` | Inbound: GAS Test Runner<br>Outbound: `RequisitionService` | 🟢 Low | Mock repository assertions. |
| `FsnValidatorTest.gs` | Backend unit test: tests valid/invalid FSN formats, edge cases, category boundaries. | `tests/backend/` | `FsnValidatorTest.gs` | Inbound: GAS Test Runner<br>Outbound: `FsnValidator` | 🟢 Low | Pure function unit tests. |
| `FormattersTest.js` | Frontend unit test: tests Thai currency (`฿`), Buddhist year conversion, number commas, date strings. | `tests/frontend/` | `FormattersTest.js` | Inbound: Test runner / browser<br>Outbound: `Formatters.js` | 🟢 Low | Pure function unit tests. |
| `AppStateTest.js` | Frontend unit test: tests state changes, event bus notifications, immutable state updates. | `tests/frontend/` | `AppStateTest.js` | Inbound: Test runner / browser<br>Outbound: `AppState.js` | 🟢 Low | In-memory store tests. |
| `FilterEngineTest.js` | Frontend unit test: tests 8-dimensional filter combinations on inventory and dashboard projections. | `tests/frontend/` | `FilterEngineTest.js` | Inbound: Test runner / browser<br>Outbound: `FilterState.js` | 🟢 Low | Data projection tests. |

---

## 14. Documentation

| Documentation File | Target Folder | Content & Architectural Role | Status |
| :--- | :--- | :--- | :--- |
| `FOLDER_STRUCTURE.md` | `docs/` | Comprehensive directory structure, layer boundaries, and Apps Script inclusion mechanism. | ✅ Created |
| `REFACTOR_MAPPING.md` | `docs/` | This exhaustive 14-group function-by-function refactoring and risk mapping specification. | ✅ Created |
| `MODULE_DEPENDENCY_MAP.md` | `docs/` | Complete inbound/outbound call chains, state couplings, and data flow architecture. | ⏳ Next Deliverable |
| `README.md` | Root `/` | Updated project overview, setup instructions, and deployment guide. | Preserved |
| `Implementation_Brief_Google_Antigravity.md` | Root `/` | Government compliance requirements, 8D filter specifications, and form rules. | Preserved |
