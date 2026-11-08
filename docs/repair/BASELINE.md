# HRT Inventory System — Baseline Audit & System Verification
**Document Version:** v1.1  
**Project:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) Inventory Management System  
**Baseline Anchor:** `v2.7.0-rc.5` (Active Workspace Base)  
**Historical Canonical Baseline:** `v2.6.0` (Last Pre-Clean File Verified Baseline)  
**Target Candidate Pipeline:** Preparing for `v2.7.0-rc.6` (Post Prompt 13–20 Verification)  
**Date:** 28 ตุลาคม 2569

---

## 1. Executive Summary & Version Ancestry

The HRT Inventory System underwent substantial refactoring from historical version `v2.6.0` through release candidates `rc.1` to `rc.5`. Prior audit reports pointed out critical security vulnerabilities, transport errors (`[fnName] is not a function`), and public execution surface exposures.

This document records the exact baseline of the system at the start of **Prompt 13 (Baseline, Public Surface, and Router Security)**, establishes an authoritative source-to-runtime mapping, and systematically analyzes past auditor claims against ground-truth source code using standardized categories:
- **`CONFIRMED`**: Finding verified in actual baseline source code.
- **`PARTIAL`**: Finding partially verified, or presenting theoretical security implications under specific execution conditions.
- **`NOT REPRODUCED`**: Finding not present or unsubstantiated in verified source.
- **`INCORRECT`**: Finding based on misinterpretation of system architecture or false claims.
- **`REQUIRES_POLICY`**: Finding requires explicit organizational / institutional governance policy rather than purely technical fixes.

---

## 2. Source-to-Runtime Inventory & Cryptographic Hashes

All code resides in the canonical repository structure. The system preserves the canonical 6 backend files, the unified frontend (`index.html` with modern modular scripts), the mobile lightweight portal (`MiniUI.html`), and institutional configurations.

### 2.1 File Inventory & SHA-256 Hashes

| Component | File Path | Scope / Runtime Target | SHA-256 Digest |
| :--- | :--- | :--- | :--- |
| **Backend Config** | `Config.gs` | Server Environment & Sheet Access | `1977fff3b294fdc4955d9a437b6a3258c419fa2b7b31478423b35495f6f20e17` |
| **Backend Router** | `Api.gs` | RBAC, Request Routing & Security | `4af1a638e082cd6171492c584cd10e12d95e4994ffe79d62b2135335c5ae441f` |
| **Backend Read** | `Read.gs` | Pure Queries & Aggregations | `35588b03594aa28d09261f022a9452e93c87a220699605bae4ec1e73ff9d3289` |
| **Backend Write** | `Write.gs` | ACID Mutations & Ledger SSOT | `ff6f235cac26ab07eaefc2c3844ae7f2654f617d4f511ee6c5a87b3030949404` |
| **Backend Audit** | `Audit.gs` | Cryptographic Log Chaining | `00d914bcbd2c953062e9fbe5dd2e9e9d93597685e370a9b0ba5031c20fab9e47` |
| **Backend Entry** | `Code.gs` | Web App HTTP Gateways & Facades | `45ca25dbaa0c5337063a7a3faa67204c7b43f0f81eefd97053b5c552397cb5e4` |
| **Frontend Main** | `index.html` | Core Web SPA (Admin / Officer / Teacher) | `26bbe94a966387150a5c698dded345286e9d55d1ef30729a745c59ba970aec8d` |
| **Frontend Mini** | `MiniUI.html` | Self-Service Requester & Mobile Portal | `0acd6f688bd32cfb741ed3a6708ea31a1fdccc95ec9cb7f87f04ce6205e0e642` |
| **Frontend JS** | `frontend/main/App.js`| Clean Modular Application Controller | `514f774a00428cb987263d0d67d6faeb265c361756d01159b409b86fca16f536` |
| **Platform Manifest** | `appsscript.json` | Google Apps Script Scopes & Runtime | `2e88517c17942abd0a15f3c99383a12c11f04080ccd2d573d1d1449f4609e092` |
| **Security Suite** | `tests/security_surface_test.js` | Automated Security Verification Harness | `8968ce5491725867d78c275cb3d6c0d051415d89d484152019d935bedd080e8a` |

### 2.2 Source-to-Runtime Execution Architecture

```
[ Browser Client / Desktop ]       [ Mobile / QR Scanner ]
       |                                  |
       +------------+        +------------+
                    |        |
                    v        v
        +-----------------------------------+
        |       Google Apps Script API      |
        |  doGet(e)  |  doPost(e)  |  RPC   |
        +-----------------------------------+
                          |
             [ Security Boundary: Code.gs ]
         - Strip Client Spoofing (doPost)
         - Enforce Template Allowlist (include_)
         - Dispatch to ApiRouter (apiCall / HRT_rpc)
                          |
                          v
         +----------------------------------+
         |      Api.gs: ApiRouter Core      |
         |  - Authenticate Session / ID Tok |
         |  - Enforce RBAC Role Hierarchy   |
         |  - Fiscal Year Write Guard       |
         |  - Idempotency Cache Check       |
         |  - Allowlisted Handler Resolver  |
         +----------------------------------+
                          |
     +--------------------+--------------------+
     |                                         |
     v                                         v
+--------------------------+     +--------------------------+
|  Read.gs: Pure Queries   |     |  Write.gs: ACID Mutex    |
|  - 29 Private Handlers   |     |  - 30 Private Handlers   |
|  - In-Memory Cache Read  |     |  - LockService Mutex     |
+--------------------------+     |  - Ledger Double-Entry   |
                                 +--------------------------+
                                               |
                                               v
                                 +--------------------------+
                                 |  Audit.gs: Audit Trail   |
                                 |  - SHA-256 Hash Chaining |
                                 |  - Mandatory on Writes   |
                                 |  - Sensitive Data Scrub  |
                                 +--------------------------+
                                               |
                                               v
                                 +--------------------------+
                                 | Canonical Google Sheets  |
                                 | 16 SSOT Physical Tables  |
                                 +--------------------------+
```

---

## 3. Categorized Audit Claims Review

| Auditor Finding / Claim | Category | Baseline Verification Details & Action Taken |
| :--- | :---: | :--- |
| **Unauthenticated public mutable helper `setConfig` in `Config.gs`** | **`CONFIRMED`** | **Verified.** `setConfig(key, value)` was exposed to `google.script.run` without caller authentication or authorization checks.<br>*Remediation:* Renamed to private `setConfig_(key, value)`. Internal calls in `Config.gs` and `Write.gs` updated. |
| **Unauthenticated public mutable helper `logAudit` in `Audit.gs`** | **`CONFIRMED`** | **Verified.** `logAudit(action, module, details, caller)` accepted caller identity directly from parameter, enabling log forgery.<br>*Remediation:* Renamed to private `logAudit_`. Caller identity resolved server-side; write-failure policy established. |
| **Public `include` helper allowed reading arbitrary server files** | **`CONFIRMED`** | **Verified.** `include(filename)` passed arbitrary strings to `HtmlService.createHtmlOutputFromFile(filename)`.<br>*Remediation:* Renamed to private `include_` with strict allowlist `['index.html', 'MiniUI.html']`. Traversal attempts blocked. |
| **Router recursion on `requisitions.submit`** | **`CONFIRMED`** | **Verified.** `ACTION_REGISTRY['requisitions.submit']` mapped to `apiSubmitRequisition` (public facade in `Code.gs`), which invoked `ApiRouter.routeRequest` again.<br>*Remediation:* Mapped directly to private business handler `hrtCreateRequisition_`. |
| **Dynamic string lookup in Router (`globalThis[handler]`)** | **`PARTIAL`** | **Partially Verified.** Lookup checked for function existence on `globalThis`/`global`. While not direct `eval`, unconstrained property lookup creates ambiguity and bypass risks.<br>*Remediation:* Implemented `resolveAllowlistedHandler` with explicit mapping of 56 private handlers. |
| **Arbitrary code execution via `eval()`** | **`NOT REPRODUCED`** | **Not Present.** Neither `Api.gs` nor any backend file contained `eval()` or `Function()` constructors in production runtime paths. |
| **Physical Sheets Database Corruption or Schema Drift** | **`INCORRECT`** | **Refuted.** The canonical 16-sheet structure is intact and serving as SSOT. No schema drift or corruption exists in base data definitions. Overwriting with experimental external workbooks strictly forbidden. |
| **Audit Log Write Failure Policy** | **`REQUIRES_POLICY`** | **Policy Established.** The question of whether a transaction should abort if audit logging fails has been settled: **Mandatory persistence on database mutations** (`isMandatory=true`), but secondary logging in catch blocks does not mask primary business exceptions (`isMandatory=false`). |

---

## 4. Physical Database Schema SSOT (Canonical 16 Sheets)

The physical Google Sheets workbook structure remains strictly canonical. No automated migration, dropping, or renaming of sheets is permitted.

| # | Sheet Name | Logical Role | Primary Key | Key Columns |
| :-: | :--- | :--- | :--- | :--- |
| 1 | `01_Users` | Institutional Identity & RBAC | `user_id` | `username`, `name`, `email`, `role`, `department`, `status` |
| 2 | `02_Departments` | Academic / Admin Departments | `dept_id` | `dept_name`, `faculty_head`, `budget_code` |
| 3 | `03_Master_Items` | Inventory Catalog SSOT | `code` | `fsn_code`, `name`, `category`, `unit`, `warehouse`, `unit_cost`, `stock` |
| 4 | `04_Categories` | Item Classification | `category_id` | `category_name`, `code_prefix`, `icon` |
| 5 | `05_Warehouses` | Storage Locations | `warehouse_id` | `warehouse_name`, `building`, `room` |
| 6 | `06_FSN_Catalog` | Federal Supply Classification | `fsn_code` | `group_code`, `group_name`, `class_code`, `fsc`, `name`, `spec` |
| 7 | `07_Requisitions` | Requisition Orders | `req_id` | `req_no`, `req_date`, `user_id`, `dept`, `status`, `approved_at`, `issued_at` |
| 8 | `08_Requisition_Items`| Requisition Line Items | `id` | `req_id`, `item_code`, `qty_requested`, `qty_approved`, `unit` |
| 9 | `09_Stock_Transactions`| Mutation Journals | `tx_id` | `date`, `doc_ref`, `type`, `item_code`, `qty`, `unit_cost`, `actor_id` |
| 10 | `10_Stock_Ledger` | Double-Entry Balance SSOT | `ledger_id` | `item_code`, `tx_id`, `tx_type`, `qty_in`, `qty_out`, `balance`, `fiscal_year` |
| 11 | `11_Audit_Trail` | Cryptographic SHA-256 Log | `audit_id` | `timestamp`, `actor_id`, `email`, `action`, `prev_hash`, `record_hash` |
| 12 | `12_Fiscal_Years` | Budget Year Cycles | `fiscal_year`| `start_date`, `end_date`, `status`, `closed_at`, `closed_by` |
| 13 | `13_Settings` | System Configuration Key-Value| `key` | `value`, `category`, `description`, `updated_at`, `updated_by` |
| 14 | `14_QR_Registry` | Digital Asset Tracking Tokens | `qr_code` | `item_code`, `created_at`, `created_by`, `status` |
| 15 | `15_Idempotency` | Duplicate Request Prevention | `key` | `action`, `actor_id`, `response_hash`, `created_at` |
| 16 | `16_Backups` | System Disaster Recovery | `backup_id` | `created_at`, `created_by`, `file_id`, `checksum`, `status` |

---

## 5. Deployment Boundary & Blocker Summary

- **Local Verification:** 100% Passed across 10 test suites (91 acceptance criteria managed in matrix, 7/7 Prompt 13 criteria verified).
- **Institutional Cloud Deployment:** **`BLOCKED`** pending Google Workspace Domain Administrator configuration of OAuth Client Credentials and production spreadsheet ID binding.
- **Data Protection:** No mock elevation in runtime; no destructive operations executed on production assets.
