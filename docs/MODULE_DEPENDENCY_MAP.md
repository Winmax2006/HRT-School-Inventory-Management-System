# Comprehensive Module Dependency & Call Map
## HRT School Inventory Management System (ระบบบริหารจัดการพัสดุและคลังวัสดุโรงเรียน)

> **Document Status**: Architectural Blueprint & Dependency Specification  
> **Key Objective**: Uncouple Monolithic Global State, Clarify Inbound/Outbound Call Chains, and Enforce Unidirectional Data Flow.

---

## 1. End-to-End Data Flow Architecture

The refactored system strictly follows a 6-tier unidirectional data flow pipeline. Data flows downward through requests and upward through typed responses or state projections:

```mermaid
sequenceDiagram
    autonumber
    actor User as Teacher / Officer (Browser)
    participant DOM as DOM View / Event Handlers
    participant State as Frontend AppState / FilterState
    participant FEService as Frontend Service Layer
    participant ApiClient as ApiService (Transport)
    participant GAS as Google Apps Script (Code.gs)
    participant BEApi as Backend API Gateway
    participant BEService as Business Service Layer
    participant Validation as Security & Validation
    participant Repo as Sheet & Ledger Repository
    participant DB as Google Sheets Database

    %% User Interaction Flow
    User->>DOM: Trigger Action (e.g. Request Items / Adjust Stock)
    DOM->>State: Acquire ClientLock / Read Active State
    DOM->>FEService: Dispatch Command (e.g. submitRequisition)
    FEService->>ApiClient: Format Payload & Call Endpoint
    ApiClient->>GAS: google.script.run.apiFunction(payload)
    
    %% Server-Side Processing
    GAS->>BEApi: Route to API Controller
    BEApi->>Validation: Validate Schema & AuthGuard Role
    Validation-->>BEApi: Validation OK
    BEApi->>BEService: Execute Business Logic & Concurrency Lock
    BEService->>Validation: Verify Business Rules (Stock, Budget, Negative Qty)
    BEService->>Repo: Double-Entry Ledger Posting / Batch Read-Write
    Repo->>DB: Append Rows / Update Batch in Google Sheets
    DB-->>Repo: Acknowledge Persistence
    Repo-->>BEService: Return Updated Records & Ledger Balance
    BEService-->>BEApi: Package Domain Response
    BEApi-->>GAS: Return Standardized JSON
    
    %% Client-Side State Update
    GAS-->>ApiClient: Return via Promise / Callback
    ApiClient-->>FEService: Resolve Response
    FEService->>State: Update AppState & Invalidate Local Caches
    State-->>DOM: Emit State Change Notification
    DOM->>DOM: Re-render Affected Components (Table, Drawer, KPIs)
    DOM-->>User: Visual Feedback (Toast Notification / Updated UI)
```

---

## 2. Inbound & Outbound Call Chains for Critical Workflows

### 2.1 Multi-Item Requisition Workflow (การเบิกพัสดุหลายรายการ)

```mermaid
flowchart TD
    subgraph UI_Interaction ["Step 1: UI Interaction"]
        A[User clicks 'เบิกพัสดุ' / Add Items] --> B[MultiItemRequisitionModal.open]
        B --> C[User searches catalog & adjusts quantities in basket]
        C --> D[MultiItemRequisitionModal.submit]
    end

    subgraph Client_Validation ["Step 2: Client Verification"]
        D --> E{ClientLockService.acquireLock}
        E -- Lock Failed --> E_Fail[Show 'Processing...' Alert]
        E -- Lock OK --> F[Validator: Verify Basket non-empty & Qty > 0]
        F --> G[RequisitionService.submitRequisition]
    end

    subgraph Transport_Layer ["Step 3: Network Transport"]
        G --> H[ApiService.call 'apiCreateRequisition']
        H --> I[google.script.run.apiCreateRequisition]
    end

    subgraph Backend_Processing ["Step 4: Server Processing"]
        I --> J[RequisitionApi.apiCreateRequisition]
        J --> K[LockManager.withLock 'scriptLock']
        K --> L[AuthGuard.enforceRole 'REQUESTER, OFFICER, ADMIN']
        L --> M[StockRuleValidator.checkStockAvailability]
        M --> N[RequisitionService.createRequisition]
        N --> O[LedgerService.reserveStock]
        O --> P[RequisitionRepository.saveHeaderAndItems]
        P --> Q[AuditLogger.log 'REQUISITION_CREATED']
        Q --> R[NotificationService.notifyApprovers]
    end

    subgraph UI_Update ["Step 5: Client Projection Update"]
        R --> S[Return Requisition ID & Status 'PENDING_APPROVAL']
        S --> T[AppState.prependRequisition]
        T --> U[ClientLockService.releaseLock]
        U --> V[NotificationClient.toast 'บันทึกใบเบิกสำเร็จ']
        V --> W[FormPd2Requisition.renderPreview]
    end
```

- **Inbound Calls**:
  - `onclick="openMultiRequisitionModal()"` on `#btnOpenMultiReq`
  - `oninput="filterReqCatalogItems(this.value)"`
  - `onclick="addToBasket(itemId)"`
  - `onclick="submitMultiRequisition()"`
- **Outbound Calls**:
  - `MultiItemRequisitionModal` → `RequisitionService.submit(basketData)`
  - `RequisitionService` → `ApiService.post('apiCreateRequisition')`
  - Server: `RequisitionApi` → `LockManager` → `StockRuleValidator` → `LedgerService` → `RequisitionRepository` → `NotificationService`
  - Response Callback → `AppState.update()` → `InventoryPage.refresh()` → `FormPd2Requisition.prepare()`

---

### 2.2 Physical Stock Issuance & Ledger Posting (การจ่ายพัสดุและบันทึกบัญชีคุม)

```mermaid
flowchart TD
    subgraph UI_Drawer ["Step 1: Review & Confirmation"]
        A[Officer opens ReqDetailDrawer] --> B{Status is APPROVED?}
        B -- No --> B_Stop[Show status badge only]
        B -- Yes --> C[Click 'ยืนยันการจ่ายพัสดุ']
        C --> D[ConfirmIssueModal.open]
        D --> E[Officer verifies recipient & enters issuance notes]
        E --> F[ConfirmIssueModal.confirm]
    end

    subgraph Client_Lock ["Step 2: Client Guard"]
        F --> G[ClientLockService.acquireLock 'ISSUE_REQ']
        G --> H[StockService.issueRequisition]
        H --> I[ApiService.call 'apiIssueRequisition']
    end

    subgraph Server_Execution ["Step 3: Double-Entry Ledger Posting"]
        I --> J[StockApi.apiIssueRequisition]
        J --> K[LockManager.withLock 'LEDGER_MUTEX']
        K --> L[AuthGuard.enforceRole 'OFFICER, ADMIN']
        L --> M[LedgerService.postIssueEntries]
        M --> N[LedgerRepository.appendTransactions]
        N --> O[RequisitionRepository.updateStatus 'ISSUED']
        O --> P[AuditLogger.log 'STOCK_ISSUED']
    end

    subgraph Balance_Refresh ["Step 4: Balance & Stock Card Update"]
        P --> Q[Return Success & Updated Item Balances]
        Q --> R[AppState.updateItemBalances]
        R --> S[StockLedgerTable.refresh]
        S --> T[NotificationClient.toast 'จ่ายพัสดุและลงบัญชีคุมเรียบร้อย']
        T --> U[FormPd3StockCard.invalidateCache]
    end
```

- **Inbound Calls**:
  - `onclick="openConfirmIssueModal(reqId)"` inside `#reqDetailDrawer`
  - `onclick="processIssueConfirmation()"` inside `#confirmIssueModal`
- **Outbound Calls**:
  - `ConfirmIssueModal` → `StockService.issueRequisition(reqId, notes)`
  - `StockService` → `ApiService.call('apiIssueRequisition', ...)`
  - Server: `StockApi` → `LockManager` → `LedgerService.postIssueEntries()` → `LedgerRepository` (atomic write)
  - Callback → `AppState.recordLedgerMovement()` → `StockLedgerTable.render()` → `FormPd3StockCard.render()`

---

### 2.3 Fiscal Year-End Audit & Inventory Freeze (การตรวจสอบพัสดุประจำปีและปิดบัญชี)

```mermaid
flowchart TD
    subgraph Audit_Entry ["Step 1: Physical Count Data Entry"]
        A[Audit Committee inspects physical storage] --> B[YearEndAuditPage.enterPhysicalCount]
        B --> C[Discrepancy Engine: Physical Count - Ledger Balance]
        C --> D[Render Discrepancy Highlight: Shortage / Overage / Matched]
    end

    subgraph Audit_Lock ["Step 2: Annual Closing Sign-off"]
        D --> E[Click 'ดำเนินการปิดรอบบัญชีและส่งรายงาน']
        E --> F[CloseFiscalYearModal.open]
        F --> G[Committee signs off & enters official audit memo]
        G --> H[FiscalYearService.closeFiscalYear]
    end

    subgraph Server_Freeze ["Step 3: Server Ledger Snapshot & Rollover"]
        H --> I[ApiService.call 'apiCloseFiscalYear']
        I --> J[FiscalYearApi.apiCloseFiscalYear]
        J --> K[LockManager.withLock 'YEAR_END_LOCK']
        K --> L[FiscalYearService.createYearEndSnapshot]
        L --> M[FiscalYearService.carryOverOpeningBalances]
        M --> N[SheetRepository.archiveYearSheet]
        N --> O[AuditLogger.log 'FISCAL_YEAR_CLOSED']
    end

    subgraph Report_Generation ["Step 4: Government Form Generation"]
        O --> P[Return Snapshot ID]
        P --> Q[ReportService.compilePdReports]
        Q --> R[FormPd5AuditSummary.render]
        Q --> S[FormPd6AuditCategory.render]
        Q --> T[FormPd7AuditAllItems.render]
        R & S & T --> U[PrintManager.prepareA4Print]
    end
```

- **Inbound Calls**:
  - `onchange="updatePhysicalCount(itemId, this.value)"` in `#viewYearEndAudit`
  - `onclick="openCloseFiscalYearModal()"`
  - `onclick="processFiscalYearClose()"`
- **Outbound Calls**:
  - `YearEndAuditPage` → `FiscalYearService.calculateDiscrepancy()`
  - `CloseFiscalYearModal` → `FiscalYearService.closeYear(summaryData)`
  - Server: `FiscalYearApi` → `FiscalYearService` → `LedgerRepository` → `SheetRepository`
  - Callback → Trigger generation of official forms **พ.ด. ๕, พ.ด. ๖, and พ.ด. ๗**.

---

### 2.4 8-Dimensional Analytics & Dashboard Metric Engine

```mermaid
flowchart TD
    subgraph Filter_Input ["8-Dimensional Filter Inputs"]
        D1[Dimension 1: ปีงบประมาณ Fiscal Year]
        D2[Dimension 2: หมวดหมู่พัสดุ Category]
        D3[Dimension 3: ประเภทเงินงบประมาณ Budget Type]
        D4[Dimension 4: กลุ่มสาระ / หน่วยงาน Department]
        D5[Dimension 5: สถานะพัสดุ Stock Status]
        D6[Dimension 6: ความเร่งด่วน Urgency]
        D7[Dimension 7: ช่วงเวลา Date Range]
        D8[Dimension 8: ผู้ครอบครอง / รับผิดชอบ Custodian]
    end

    D1 & D2 & D3 & D4 & D5 & D6 & D7 & D8 -->|onchange| FE[FilterState.setDimension]
    FE -->|State Event 'FILTER_CHANGED'| Engine[DashboardService.computeMetrics]

    subgraph Projections ["Multi-Projection Consumers"]
        Engine --> P1[DashboardPage.renderKPIs: Total Value, Low Stock Count, Active Reqs]
        Engine --> P2[InventoryCharts.renderDistributionChart: Value by Category]
        Engine --> P3[InventoryCharts.renderVelocityChart: Fast / Slow Moving]
        Engine --> P4[DataTableComponent.applyFilter: Filtered Inventory Grid]
    end
```

- **Inbound Calls**:
  - `onchange="applyDashFilters()"` on filter dropdowns (`#dashFilterYear`, `#dashFilterCategory`, etc.)
- **Outbound Calls**:
  - `applyDashFilters()` → `FilterState.updateFromDOM()`
  - `FilterState` → `DashboardService.aggregate(AppState.getItems(), FilterState.get())`
  - `DashboardService` → `renderKPIs()`, `InventoryCharts.update()`, `DataTableComponent.filter()`

---

## 3. Global Variables Inventory & Decoupling Strategy

Currently, the monolithic application stores critical state directly on the global `window` object. Below is the decoupling blueprint mapping every global variable into its encapsulated, reactive state store:

| Current Global Variable | Current Type & Usage | Associated Issues / Risks | Modern Encapsulated Location | Access & Decoupling Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| `window.allData` | `Array<Item>`: Primary inventory item catalog cache. | Mutated directly across multiple functions without event dispatching; prone to out-of-sync bugs. | `frontend/state/AppState.js` (`AppState.items`) | Replaced by `AppState.getItems()` and `AppState.setItems()`. A proxy getter/setter is maintained on `window.allData` for backwards compatibility. |
| `window.filteredData` | `Array<Item>`: Transient table filter results. | Global state pollution; conflicts if multiple views filter items simultaneously. | `frontend/state/AppState.js` (`AppState.filteredItems`) | Managed internally by `InventoryPage` and `DataTableComponent`. |
| `window.stockLedgerEntries` | `Array<LedgerRow>`: In-memory double-entry stock transactions. | Directly mutated in client memory without server synchronization verification. | `frontend/state/AppState.js` (`AppState.ledgerEntries`) | Read via `AppState.getLedger(itemId)`. Immutable append via `AppState.appendLedgerEntry()`. |
| `window.auditTrailEntries` | `Array<AuditRow>`: Log of user actions and state changes. | Directly pushed to from various UI click handlers. | `frontend/state/AppState.js` (`AppState.auditLogs`) | Appended through `AppState.logAudit(action, details)`. |
| `window.fsnData` | `Array<FsnGroup>`: FSN 8-digit catalog tree. | Static global array; cannot easily refresh when new FSNs are registered. | `frontend/state/AppState.js` (`AppState.fsnTree`) | Managed by `ItemService.getFsnCatalog()`. |
| `window.dashFilters` | `Object`: Holds 8-dimensional filter selections. | Read directly by charting and KPI functions; no change-event subscription. | `frontend/state/FilterState.js` (`FilterState.store`) | Accessible via `FilterState.get()` and `FilterState.set()`. Emits `filter:change` event. |
| `window.currentUser` | `Object`: Current user profile, email, and role. | Mutable; could be spoofed in client console to reveal UI elements. | `frontend/state/UserSessionState.js` | Enclosed with private scope; verified on every sensitive backend call via `AuthGuard.gs`. |
| `window.rawMasterItems` | `Array<Item>`: Static seed data constant. | Clutters memory after initial data load. | `backend/setup/DataSeeder.gs` / Mock store | Removed from runtime client memory; loaded on demand only. |

---

## 4. Backward Compatibility Layer (`global-facade.js`)

To guarantee **zero regression and prevent breakage of existing inline HTML attributes** (such as `onclick="..."`, `onchange="..."`, and `onsubmit="..."`), a dedicated compatibility facade is established. This facade guarantees that legacy function names continue resolving to their new modular implementations:

```javascript
/**
 * frontend/main/global-facade.js
 * Backward Compatibility Layer - Bridges Legacy Global Invocations to Modular Services
 */
(function(window) {
  'use strict';

  // 1. Navigation & Views
  window.switchMainView = (viewName) => window.App.switchView(viewName);
  window.switchDocsSubTab = (tabName) => window.DocumentsPage.switchSubTab(tabName);

  // 2. Drawers
  window.openDrawer = (itemId) => window.ItemDetailDrawer.open(itemId);
  window.closeDrawer = () => window.ItemDetailDrawer.close();
  window.switchItemDrawerTab = (tabId) => window.ItemDetailDrawer.switchTab(tabId);
  window.openReqDrawer = (reqId) => window.ReqDetailDrawer.open(reqId);
  window.closeReqDrawer = () => window.ReqDetailDrawer.close();

  // 3. Modals
  window.openMultiRequisitionModal = () => window.MultiItemRequisitionModal.open();
  window.closeMultiRequisitionModal = () => window.MultiItemRequisitionModal.close();
  window.submitMultiRequisition = () => window.MultiItemRequisitionModal.submit();
  window.openConfirmIssueModal = (reqId) => window.ConfirmIssueModal.open(reqId);
  window.closeConfirmIssueModal = () => window.ConfirmIssueModal.close();
  window.processIssueConfirmation = () => window.ConfirmIssueModal.process();
  window.openAddStockModal = (itemId) => window.AddStockModal.open(itemId);
  window.closeAddStockModal = () => window.AddStockModal.close();
  window.submitAddStock = () => window.AddStockModal.submit();
  window.openCloseFiscalYearModal = () => window.CloseFiscalYearModal.open();
  window.closeCloseFiscalYearModal = () => window.CloseFiscalYearModal.close();
  window.processFiscalYearClose = () => window.CloseFiscalYearModal.process();
  window.openAddFsnModal = () => window.AddFsnModal.open();
  window.closeAddFsnModal = () => window.AddFsnModal.close();
  window.submitNewFsn = () => window.AddFsnModal.submit();
  window.openPdfViewerModal = (type, id) => window.PdfViewerModal.open(type, id);
  window.closePdfModal = () => window.PdfViewerModal.close();

  // 4. Tables, Search & Pagination
  window.renderTable = (data, page) => window.DataTableComponent.render(data, page);
  window.changePage = (newPage) => window.DataTableComponent.changePage(newPage);
  window.filterInventory = (query) => window.InventoryPage.handleSearch(query);

  // 5. Dashboard & Analytics
  window.applyDashFilters = () => window.DashboardPage.applyFilters();
  window.resetDashFilters = () => window.DashboardPage.resetFilters();
  window.renderKPIs = (data) => window.DashboardPage.renderKPIs(data);
  window.renderChart = (data) => window.InventoryCharts.render(data);

  // 6. Official Forms (พ.ด. ๑ - ๗)
  window.renderDailyReport = (date) => window.FormPd1DailyReport.render(date);
  window.renderRequisitionForm = (id) => window.FormPd2Requisition.render(id);
  window.renderStockCardReport = (id) => window.FormPd3StockCard.render(id);
  window.renderMonthlyReport = (m, y) => window.FormPd4Monthly.render(m, y);
  window.renderYearEndSummaryReport = () => window.FormPd5AuditSummary.render();
  window.renderYearEndCategoryReport = () => window.FormPd6AuditCategory.render();
  window.renderYearEndAllItemsReport = () => window.FormPd7AuditAllItems.render();

  // 7. Formatters & Utilities
  window.formatCurrency = (amt) => window.Formatters.formatCurrency(amt);
  window.formatThaiDate = (dt) => window.Formatters.formatThaiDate(dt);
  window.formatNumber = (n) => window.Formatters.formatNumber(n);
  window.formatFsnCode = (c) => window.Formatters.formatFsnCode(c);
  window.showToast = (msg, type) => window.NotificationClient.toast(msg, type);

  // 8. Global State Proxies (Backward Compatibility)
  Object.defineProperty(window, 'allData', {
    get: () => window.AppState.getItems(),
    set: (val) => window.AppState.setItems(val)
  });
  Object.defineProperty(window, 'stockLedgerEntries', {
    get: () => window.AppState.getLedgerEntries(),
    set: (val) => window.AppState.setLedgerEntries(val)
  });
  Object.defineProperty(window, 'dashFilters', {
    get: () => window.FilterState.get(),
    set: (val) => window.FilterState.set(val)
  });

  console.log('[HRT Compatibility Facade] 100% legacy window bindings successfully initialized.');
})(window);
```

---

## 5. Architectural Invariant Checks & Verification Criteria

To ensure that future refactoring phases never introduce regressions, each module boundary must pass the following invariant assertions:

1. **Unidirectional Invocation**: A lower layer (e.g. `SheetRepository`) must **NEVER** call an upper layer (e.g. `RequisitionApi` or `DashboardPage`).
2. **Double-Entry Invariant**: Every stock subtraction (issue) must have a corresponding requisition or write-off reference, and must be strictly appended to the ledger.
3. **No Direct DOM Manipulation in Services**: Services (`ItemService`, `StockService`, `LedgerService`) must return pure data structures or Promises, and must never contain `document.getElementById` or `innerHTML`.
4. **Idempotent UI Locks**: All form submissions must acquire a token via `ClientLockService` before invocation and release it in a `finally` block to eliminate race conditions and double-submits.
5. **Print Isolation**: Government forms (พ.ด. ๑–๗) must render into dedicated print containers with `@media print` CSS rules, ensuring clean A4 output without navigation headers or buttons.
