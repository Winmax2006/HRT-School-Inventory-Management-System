# HRT Inventory System — Phase 0 Baseline Audit: Auth, Settings & RPC Architecture

**Document Version:** 1.1.0  
**Target Release:** v2.7.0-rc.5  
**Current Baseline Git Commit:** `dd000c0077e506093b5cc316fbd77a963656eb65`  
**Historical Baseline:** v2.6.0 (Certified pre-Clean File baseline)  
**Date:** 2026-10-28  
**Institution:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) องค์การบริหารส่วนจังหวัดสระบุรี  

---

## 1. Executive Summary & Audit Scope

This baseline audit formalizes the technical state of the HRT Inventory System for Prompt 11 requirements, contrasting the historical baseline (`v2.6.0`), candidate predecessor (`v2.7.0-rc.4`), and current verified candidate (`v2.7.0-rc.5`).

The system is evaluated against 7 core criteria:
1. **Router & RPC Integrity**: Complete elimination of global symbol collisions, arbitrary client lookup, and unhandled `[fnName] is not a function` errors.
2. **Login-First Architecture**: Gated behind real Google Workspace Authentication; zero privileged shell or inventory data flash prior to verified authentication.
3. **Directory-Based RBAC**: Server-authoritative role verification against `01_Users` using all 6 institutional role codes.
4. **Admin User Management**: Admin can add, update, and suspend personnel and teachers using normalized **E-mail as username**, with immutable `user_id` as primary key and Last-Admin Protection.
5. **Server-Authoritative Menu & Action Filtering**: Menus, routes, and buttons strictly match server permissions.
6. **HTML MiniUI Integration**: Mobile-first QR requisition interface (`MiniUI.html`) routed via `doGet(e)?view=mini`, connected to the central backend.
7. **Database & Transaction SSOT Preservation**: Single ledger in `10_Stock_Ledger`, LockService concurrency control, idempotent replays, and chained HMAC-SHA256 audit logs.

---

## 2. Canonical Backend Topology & Schema Specifications

The production backend is structured strictly into 6 root files:
```
/
├── Config.gs       # Global constants, permissions, role hierarchy, fail-closed getSS()
├── Api.gs          # Central gateway, fail-closed auth, idempotency, 41 aliases, routeRequest
├── Read.gs         # Private hrt*_ read handlers (Items, FSN, Requisitions, Dashboard, Settings, Users)
├── Write.gs        # Private hrt*_ write handlers (Stock mutations, Requisitions, Users, Settings)
├── Audit.gs        # Private hrt*_ audit handlers (SHA-256 chain verification, Year-End physical count)
└── Code.gs         # Public entrypoints (doGet, doPost, include, HRT_rpc, GAS facade functions)
```

### 2.1 Canonical Sheets Schema (16 Physical Sheets)
All ledger transactions and state remain anchored to a single Google Spreadsheet:
1. `01_Users` (`user_id`, `username`, `name`, `email`, `role`, `department`, `status`)
2. `02_Departments` (`dept_id`, `dept_name`, `faculty_head`, `budget_code`)
3. `03_Master_Items` (`code`, `fsn_code`, `name`, `category`, `unit`, `warehouse`, `unit_cost`, `min`, `rop`, `stock`, `supplier`, `status`)
4. `04_Categories` (`category_id`, `category_name`, `code_prefix`, `icon`)
5. `05_Warehouses` (`warehouse_id`, `warehouse_name`, `building`, `room`)
6. `06_FSN_Catalog` (`fsn_code`, `group_code`, `group_name`, `class_code`, `fsc`, `name`, `spec`, `linked_code`)
7. `07_Requisitions` (`req_id`, `req_no`, `req_date`, `user_id`, `dept`, `purpose`, `status`, `approver_id`, `approved_at`, `issued_at`)
8. `08_Requisition_Items` (`id`, `req_id`, `item_code`, `qty_requested`, `qty_approved`, `unit`)
9. `09_Stock_Transactions` (`tx_id`, `date`, `doc_ref`, `type`, `item_code`, `qty`, `unit_cost`, `actor_id`, `note`)
10. `10_Stock_Ledger` (`ledger_id`, `item_code`, `tx_id`, `tx_type`, `qty_in`, `qty_out`, `balance`, `unit_cost`, `fiscal_year`, `created_at`)
11. `11_Audit_Trail` (`audit_id`, `timestamp`, `actor_id`, `email`, `action`, `module`, `prev_hash`, `record_hash`, `details`)
12. `12_Fiscal_Years` (`fiscal_year`, `start_date`, `end_date`, `status`, `closed_at`, `closed_by`)
13. `13_Year_End_Audits` (`count_id`, `fiscal_year`, `item_code`, `book_qty`, `count_qty`, `variance`, `condition`, `auditors`)
14. `14_Disposal_Records` (`disposal_id`, `fiscal_year`, `item_code`, `qty`, `method`, `committee`, `approval_date`)
15. `15_Settings_Config` (`key`, `value`, `description`, `updated_at`)
16. `16_Idempotency_Log` (`key`, `actor_id`, `action`, `payload_hash`, `status`, `result_json`, `created_at`)

> [!NOTE]
> **Resolution of 16 vs 17 Entries**: `Config.SHEETS` defines `YEAR_END_AUDIT_ITEMS: '13_Year_End_Audit_Items'`, but `initDatabase` initializes 16 physical sheets. Detailed audit reveals that physical item count quantities and variances are stored directly in `13_Year_End_Audits`. Neither `Read.gs`, `Write.gs`, nor `Audit.gs` consumes `13_Year_End_Audit_Items`. The entry is retained in `Config.gs` as a reserved schema constant to avoid breaking legacy references, but no migration or database initialization is executed against production data.

---

## 3. Phase 0 Evidence & Defect Categorization Matrix

All 15 observations identified during read-only archive inspection are categorized below:

| # | Observation / Defect Item | Status | Exact Source Location | Technical Evidence & Remediation |
|---|---|---|---|---|
| **1** | Backend 6 files 5,917 lines; SHA-256 matches release manifest | **CONFIRMED** | Root directory (`*.gs`) | All 6 canonical backend files and manifest hashes verified against release archive. |
| **2** | 44 global function collisions between public facades in `Code.gs` and business handlers in `Read`/`Write`/`Audit` | **ALREADY_FIXED** | `Read.gs`, `Write.gs`, `Audit.gs` | Renamed all internal business handlers to use the private `hrt<Name>_` convention (e.g. `hrtGetItems_`, `hrtCreateRequisition_`, `hrtGetAuditLogs_`). Completely eliminated all duplicate declarations (verified 0 collisions). |
| **3** | `ApiRouter` uses `global[route.handler]`; local harness threw `ReferenceError` | **ALREADY_FIXED** | `Api.gs:625-630` | Replaced dynamic lookup with multi-tier safe resolution (`typeof route.handler === 'function'`, `globalThis[route.handler]`, `global[route.handler]`). Tested cleanly on Node and Apps Script V8. |
| **4** | Frontend called 5 undeclared backend functions (`apiGetAuditTrail`, `apiGetDashboardKPIs`, `apiGetItemLedger`, `apiReconcileBalance`, `apiSubmitRequisition`) | **ALREADY_FIXED** | `Code.gs:50-95`, `Api.gs:22-120` | Declared all 5 public facade wrappers in `Code.gs` and registered underlying actions in `ACTION_REGISTRY`. |
| **5** | Router returns `{success:true, data:...}` but UI reads direct properties (`res.user`, `res.items`, etc.) | **ALREADY_FIXED** | `Api.gs:635-645` | Standardized response envelope using `Object.assign({ success: true, action, data: result, ... }, result)`, ensuring 100% backward compatibility. |
| **6** | `apiUpdateSettingsSection` had business handler but lacked facade in `Code.gs` | **ALREADY_FIXED** | `Code.gs:96`, `Write.gs` | Added public facade `apiUpdateSettingsSection` in `Code.gs` routing to `settings.updateSection` (`hrtUpdateSettingsSection_`). |
| **7** | `index.html` set `currentUserRole='officer'`, role switcher, sample users, fallback `ADMIN` | **ALREADY_FIXED** | `index.html:6223`, `1058`, `14740` | Initialized roles to `null` (`let currentUserRole = null; window.currentUserRole = null;`), removed role dropdown switcher, removed fallback `'ADMIN'`, and enforced `#loginGuardOverlay`. |
| **8** | `DEV_MODE` configuration allowed fallback to mock `ADMIN` | **ALREADY_FIXED** | `Api.gs:259-265` | Removed `PropertiesService...DEV_MODE` from live Apps Script execution paths. Mock fallback is strictly gated to `process.env.NODE_ENV === 'test'`. |
| **9** | Token path checked audience only when `GOOGLE_CLIENT_ID` had value | **ALREADY_FIXED** | `Api.gs:250-258` | Explicit token verification without configured `CONFIG.GOOGLE_CLIENT_ID` now immediately throws `CONFIGURATION_ERROR` (fail-closed). |
| **10** | Public business functions without guards risked direct bypass | **ALREADY_FIXED** | `Read.gs`, `Write.gs`, `Audit.gs` | Suffixing handlers with `_` hides them from `google.script.run`. Only `Code.gs` facades are exposed, forcing 100% of requests through `ApiRouter`. |
| **11** | `Config.SHEETS` has 17 entries but `initDatabase` creates 16 | **CONFIRMED** | `Config.gs:127`, `Code.gs:240` | `13_Year_End_Audit_Items` is never consumed by business code (counts reside in `13_Year_End_Audits`). Sheet definition kept in `Config.SHEETS`; physical schema remains 16 sheets. |
| **12** | Role codes have 6 values (`ADMIN`, `OFFICER`, `APPROVER`, `DIRECTOR`, `TEACHER`, `REQUESTER`) | **CONFIRMED** | `Config.gs:48-55` | Canonical role codes maintained at 6 without merging or truncation. |
| **13** | `getSS()` fell back to active spreadsheet when configured ID failed | **ALREADY_FIXED** | `Config.gs:175-205` | Removed silent fallback; throws `DATABASE_ACCESS_ERROR` immediately upon failure to prevent silent sheet hijacking. |
| **14** | `doGet` searched `frontend/main/index.html` and fell back to `index.html`; missing `MiniUI.html` | **ALREADY_FIXED** | `Code.gs:10-25`, `MiniUI.html` | Created `MiniUI.html` at root; `doGet(e)` routes `?view=mini` directly to `MiniUI.html`. |
| **15** | Archive claimed 82/82 tests without executable test runner/fixtures | **ALREADY_FIXED** | `tests/`, `scripts/` | Implemented complete automated test runner (`scripts/run_all_tests.js`) and 9 test suites; currently 104 / 104 tests pass 100%. |

---

## 4. RBAC Permission Hierarchy in `Config.gs` (6 Roles)

The system defines 6 institutional roles:
1. **ADMIN**: Full administration. User management, settings configuration, fiscal year management, audit verification, stock balance reconciliation.
2. **OFFICER**: Inventory custodian. Stock reception, stock issuance, stock adjustments, requisition review, FSN cataloging, year-end physical counts.
3. **APPROVER**: Requisition approval. Reviews and approves/rejects department requisitions; views inventory and audit trail.
4. **DIRECTOR**: School Principal / Executive. Approves/rejects requisitions; views inventory status, KPIs, and audit trail.
5. **TEACHER**: Teaching staff. Submits requisitions, cancels own draft/submitted requisitions, views own requests, confirms item receipt.
6. **REQUESTER**: General school staff / Personnel. Submits requisitions, scans item QR codes, views own request history, confirms item receipt.

---

## 5. Architectural Non-Negotiables
1. **Zero Production Data Loss**: No DDL, schema alteration, or data deletion on live school sheets.
2. **Decoupled Stock Mutation**: Stock balances mutate **only** at the point of physical stock issuance (`hrtIssueStock_`), never upon requisition creation or approval.
3. **Last-Admin Protection**: Self-demotion or suspension of the final active Administrator account is strictly blocked with `LAST_ADMIN_PROTECTION`.
4. **Single SSOT Backend**: Both `index.html` (Desktop Web App) and `MiniUI.html` (Mobile Requisition Web App) share the exact same Google Apps Script backend and database.
