# Frontend Architecture & Modular Component Specification
## HRT School Inventory Management System (โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี))

> **Refactoring Phase**: Completed  
> **Original Monolithic Source**: `index.html` (13,535 lines)  
> **Target Modular Structure**: `frontend/` (34 clean, single-responsibility files)  
> **Regression Guarantee**: 0% Breaking Change | 100% Behavioral & Visual Parity

---

## 1. Directory Tree & File Inventory

```text
frontend/
├── main/
│   ├── index.html                   # Master App Shell (CDNs, Stylesheet links, Layout containers, Script order)
│   ├── App.js                       # Central App Controller, Data Seed (100 items), Event Setup, Controller Handlers
│   └── Router.js                    # View & Navigation Router (switchMainView facade, RBAC view guard, Hash sync)
│
├── pages/
│   ├── Dashboard.html               # 8-Dimensional Executive Analytics & Priority Action Hub
│   ├── Inventory.html               # Catalog Table, 3-Tier Filter Engine & Pagination
│   ├── Requisition.html             # Requisition Action Center & Presets Hub
│   ├── Approval.html                # Dedicated 3-Stage Approval & Signature Queue
│   ├── Stock.html                   # 13-Digit FSN Master Catalog & Technical Spec Hub
│   ├── Ledger.html                  # Stock Card (แบบ พ.ด. ๔) & Double-Entry SSOT Inspector
│   ├── Audit.html                   # Fiscal Year-End Physical Inventory Count & Discrepancy Matrix
│   ├── Reports.html                 # Official Ministry of Finance Forms Hub (แบบ พ.ด. ๑ - ๗)
│   └── Settings.html                # Progressive Disclosure Level 3: Database, Google SSO & RBAC Matrix
│
├── components/
│   ├── Sidebar.html                 # Streamlined Navigation Sidebar & Mobile Drawer Backdrop
│   ├── Topbar.html                  # Minimal Topbar with Global Search, User Profile & Role Switcher
│   ├── Modal.html                   # All 13 Slide-Over Drawers, Modals & Inspection Dialogs
│   ├── Toast.html                   # Toast Notification Container & Alert Banners
│   ├── DataTable.html               # Reusable Table Skeleton & Pagination Bar
│   └── Loading.html                 # Top Progress Bar & Accessibility Skip Link
│
├── services/
│   ├── ApiService.js                # Dual-mode Client Gateway (Google Apps Script / Local Mock Simulator)
│   ├── ItemApi.js                   # Master Item Catalog CRUD & Projection Cache Updater
│   ├── RequisitionApi.js            # Requisition Workflow (Submit, Approve, Reject, Issue)
│   ├── StockApi.js                  # Immutable Stock Movements, Ledger Audit & Reconcile Engine
│   ├── UserApi.js                   # User Identity, RBAC Permissions & Google SSO Adapter
│   └── DashboardApi.js              # KPI Calculation & Aggregated Valuation Queries
│
├── state/
│   ├── AppState.js                  # Observable Event Bus, Current Role & ClientLockService Mutex
│   └── CacheStore.js                # In-Memory Projection Store (Read-Only Mirror of Master Items & Ledger)
│
├── utils/
│   ├── DateUtils.js                 # Buddhist Era Conversions & Official Thai Date Formatting
│   ├── NumberUtils.js               # Safe Number Parsing, Rounding, Clamping & Aggregation
│   ├── FormatUtils.js               # Thai Baht Currency, FSN Code Formatting, Badges & Category Meta
│   └── DomUtils.js                  # High-Frequency Debounce, Safe DOM Text Setter, Element Show/Hide
│
└── styles/
    ├── base.css                     # Typography, Root Variables & Core Utility Colors
    ├── layout.css                   # Responsive Drawer Transitions, Custom Scrollbars & Grid Shells
    ├── components.css               # WCAG AA Status Pills, Badges, Category Chips & พ.ด. Document Sheets
    └── print.css                    # Pixel-Perfect @media print Rules for Official Government Forms พ.ด. ๑–๗
```

---

## 2. Layered Architecture Contracts

### 2.1 Main Application Shell (`frontend/main/`)
- **`index.html`**:
  - Serves as the outer HTML shell.
  - Declares all required CDNs (Tailwind CSS, Phosphor Icons, Chart.js, Google Fonts).
  - Links all 4 CSS modules in `../styles/`.
  - Mounts `<main id="view...">` placeholders for each view.
  - Supports both **Google Apps Script `<?!= include(...) ?>` templating** and **Client-Side Dev Server Auto-Loading**.
  - Loads all JavaScript layers in deterministic dependency order.
- **`Router.js`**:
  - Encapsulates `window.switchMainView(viewName)` and `window.switchDocTab(tabName)`.
  - Handles active state switching on sidebar menu items and topbar titles.
  - Enforces Role-Based Access Control (RBAC): blocks access to `#viewYearEndAudit` for teacher role.
  - Destroys Chart.js instances when navigating away from `#viewDashboard` to eliminate memory leaks.
- **`App.js`**:
  - Instantiates the 100-item standard school inventory master seed data (`rawMasterItems`).
  - Sets up the in-memory double-entry Stock Ledger data store (`window.stockLedgerEntries`).
  - Implements the `ClientLockService` mutex for concurrency control.
  - Exposes all UI controller functions (`renderTable`, `renderKPIs`, `renderChart`, `openDrawer`, `submitRequisition`, etc.) to `window.*` for 100% backward compatibility with inline HTML handlers.

---

### 2.2 Presentation Layer: Pages (`frontend/pages/`)
Each file contains the semantic markup for an isolated application view:
1. **`Dashboard.html`** (`#viewDashboard`): Executive command center featuring 8-dimensional analytics, Pareto ABC classification, movement velocity, and aging dead-stock indicators.
2. **`Inventory.html`** (`#viewInventory`): Main stock catalog with multi-column filtering, quick status toggles, and dual responsive view (table on desktop, cards on mobile).
3. **`Requisition.html`** (`#viewRequisition`): Multi-tab requisition tracking (Overview, All, Pending Approval, Pending Issue, Completed).
4. **`Approval.html`** (`#viewApproval`): Dedicated approval workflow workspace with electronic signature pads and review drawers.
5. **`Stock.html`** (`#viewStock` / `#viewFSN`): Catalog of 13-digit Federal Supply Numbers (FSN) according to the Comptroller General's Department e-GP standards.
6. **`Ledger.html`** (`#viewLedger`): Single Source of Truth Stock Card (แบบ พ.ด. ๔) showing historical movements, batch numbers, and running balance.
7. **`Audit.html`** (`#viewAudit` / `#viewYearEndAudit`): Annual physical count reconciliation tool with variance calculations and fiscal year carryover.
8. **`Reports.html`** (`#viewReports` / `#viewDocs`): Official government document generation suite supporting forms แบบ พ.ด. ๑ through พ.ด. ๗.
9. **`Settings.html`** (`#viewSettings`): Progressive disclosure level 3 settings: local workspace storage, Google Sheets 1-Click setup, CSV backup/import, and RBAC matrix.

---

### 2.3 Presentation Layer: Components (`frontend/components/`)
Reusable HTML snippets extracted from the monolithic layout:
- **`Sidebar.html`**: Responsive sidebar navigation supporting desktop expanded (256px), tablet icon rail (64px), and mobile off-canvas drawer.
- **`Topbar.html`**: Top header bar with live global search (`Ctrl+K` shortcut), requisition trigger button, and user role switcher.
- **`Modal.html`**: Complete collection of 13 slide-over inspection drawers and dialogs (Item Detail Drawer, Requisition Modal, Multi-Item Basket, Add Stock Modal, Add FSN Modal, PDF Viewer, Fiscal Year Rollover Modal, etc.).
- **`Toast.html`**: Floating status toast notification container with auto-dismiss timers.
- **`DataTable.html`**: Standard table skeleton and pagination controls.
- **`Loading.html`**: Top slim progress bar and accessibility skip link.

---

### 2.4 Service Layer (`frontend/services/`)
- **`ApiService.js`**: Dual-transport gateway connecting either to `google.script.run` in GAS or to the local mock simulator with simulated latency.
- **`ItemApi.js`**: Methods `getItems()`, `getItemByCode()`, `createItem()`, `updateItem()`, and projection cache synchronizer.
- **`RequisitionApi.js`**: Methods `createRequisition()`, `submitRequisition()`, `approveRequisition()`, `rejectRequisition()`, and `getRequisitions()`.
- **`StockApi.js`**: Methods `issueStock()`, `receiveStock()`, `getItemLedger()`, `reconcileBalance()`, and `verifyAuditIntegrity()`.
- **`UserApi.js`**: Current user profile, role switching, and RBAC permission evaluations.
- **`DashboardApi.js`**: Aggregated valuation, KPI summaries, and category distribution queries.

---

### 2.5 State & Utilities (`frontend/state/` & `frontend/utils/`)
- **`AppState.js`**: Reactive event bus (`on`, `emit`), active role state, and `ClientLockService` mutex.
- **`CacheStore.js`**: In-memory read-only projection cache keeping master items synchronized with ledger movements.
- **`DateUtils.js`**: Thai calendar utilities (CE to BE conversion, month names, official date formatting).
- **`NumberUtils.js`**: Safe numeric formatting, decimal rounding, and array aggregations.
- **`FormatUtils.js`**: Currency formatting (`฿`), FSN 13-digit mask, WCAG AA status badges, and category metadata.
- **`DomUtils.js`**: Debounce function, layout-reflow prevention (`setDomText`), element toggling (`show`/`hide`), and selector aliases.

---

### 2.6 Stylesheets (`frontend/styles/`)
- **`base.css`**: CSS variables, root theme colors, typography definitions, and reset rules.
- **`layout.css`**: Grid shells, drawer slide transitions, responsive media queries, and sleek custom scrollbars.
- **`components.css`**: Category pill colors, status dot animations, and official government form sheet geometry.
- **`print.css`**: `@media print` rules enforcing page breaks, portrait/landscape dimensions, signature preservation, and UI element suppression.
