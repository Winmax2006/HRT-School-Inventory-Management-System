# HRT Inventory System — Prompt 11 Execution Report & System Delivery

**Document Version:** 1.2.0  
**Target Release:** v2.7.0-rc.5  
**Baseline:** v2.6.0 | Pre-Prompt 11 Commit: `dd000c0`  
**Date:** 2026-10-28  
**Institution:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) องค์การบริหารส่วนจังหวัดสระบุรี  

---

## 1. Executive Summary & Defect Remediation Mapping

In accordance with instructions, the HRT Inventory System has been remediated, hardened, and verified while strictly preserving the canonical 6-file backend topology, 16-sheet database schema, and business state machines.

| Defect / Requirement | Pre-Prompt 11 State | Fix Applied in v2.7.0-rc.5 | Verification Result |
|---|---|---|---|
| **P0: 44+ Global Symbol Collisions** | Ambiguous overwrites between `Code.gs` and `Read/Write/Audit.gs` | Renamed all internal handlers to private `hrt<Name>_` convention; `Code.gs` serves as sole public facade entry point. | **0 Collisions** (PASS, `P11-TC-17`) |
| **P0: `global[route.handler]` Dispatch** | `ReferenceError: global is not defined` in GAS V8 | Implemented multi-tier safe resolver (`typeof route.handler === 'function'`, `globalThis`, `global`). | **PASS** (`P11-TC-03`, `P11-TC-18`) |
| **P0: Missing RPC Wrappers** | Frontend threw `[fnName] is not a function` for 5 calls | Exported compatibility facades in `Code.gs` and registered 41 direct `api*` aliases in `Api.gs`. | **PASS** (`P11-TC-02`, `P11-TC-03`) |
| **P0: Dual Response Envelopes** | Router returned `{data:...}` while UI read direct properties | Standardized response envelope via `Object.assign({ success: true, data: result, ... }, result)`. | **PASS** (100% Backward Compat) |
| **P0: Fail-Closed `getSS()`** | Silent fallback to `getActiveSpreadsheet()` on bad ID | Throws `DATABASE_ACCESS_ERROR` immediately; eliminates silent hijacking to unintended spreadsheets. | **PASS** (`P11-TC-19`) |
| **P0: Auth Elevation via `DEV_MODE`** | `PropertiesService...DEV_MODE` allowed mock ADMIN in live runtime | Removed `DEV_MODE` from live auth path; gated mock identity strictly to `process.env.NODE_ENV === 'test'`. | **PASS** (`P11-TC-20`) |
| **P0: Unprotected Token Path** | Audience verification skipped if `GOOGLE_CLIENT_ID` missing | Enforced `CONFIGURATION_ERROR` if token authentication attempted without configured client ID. | **PASS** (`P11-TC-20`) |
| **P1: Login-First UI Architecture** | Dashboard and items flashed before authentication | Full-screen `#loginGuardOverlay` covers UI; blocks data fetching until Google auth succeeds. | **PASS** (`P11-TC-06`, `P11-TC-07`) |
| **P1: Admin User Management** | Username used prefix `email.split('@')[0]` | Enforced full normalized E-mail as `username` in `01_Users`; Last-Admin Protection on update/suspend. | **PASS** (`P11-TC-09`, `P11-TC-10`) |
| **P1: Server-Authoritative RBAC** | UI had client role switcher and fallback `'ADMIN'` | Removed role switcher, removed fallback `'ADMIN'`, wired dynamic DOM visibility to server permissions. | **PASS** (`P11-TC-12`, `P11-TC-13`) |
| **P1: MiniUI Integration** | Standalone mock prototype with `hrt-miniui-demo-v1` | Added `MiniUI.html` routed via `doGet(e)?view=mini` connected to central backend via `ApiServiceCore`. | **PASS** (`P11-TC-14`, `P11-TC-15`) |
| **P1: Decoupled Stock Deduction** | Requisition submission must not deduct inventory balance | Stock deduction occurs strictly at `hrtIssueStock_`; `hrtCreateRequisition_` never touches ledger. | **PASS** (`P11-TC-16`) |

---

## 2. Before / After Topology & Schema Comparison

### 2.1 Backend Architecture Comparison
```
BEFORE (Prompt 10 / rc.4 Baseline):
Code.gs (Public facades) <--- COLLISION ---> Read.gs, Write.gs, Audit.gs (Public functions, duplicate names)
ApiRouter dispatch: global[route.handler] (ReferenceError on V8 without polyfill)
getSS(): Silently falls back to SpreadsheetApp.getActiveSpreadsheet()
Auth: Checks PropertiesService DEV_MODE, allowing anonymous elevation to ADMIN

AFTER (Prompt 11 / rc.5 Candidate):
Client (index.html / MiniUI.html)
   │
   ▼
Code.gs (Clean Public Facades & HRT_rpc Gateway)
   │
   ▼
ApiRouter.routeRequest (Api.gs)
   ├── Fail-Closed Auth & Google Token Verification (Requires GOOGLE_CLIENT_ID)
   ├── Server RBAC Guard (Config.ROLE_PERMISSIONS, 6 Roles)
   ├── Fiscal Year & Active Transaction Check
   ├── Persistent Idempotency Check (16_Idempotency_Log)
   │
   ▼
Safe Handler Resolution (globalThis / direct function reference)
   │
   ├── Read.gs   ---> hrtGetItems_, hrtGetItemDetail_, hrtGetRequisitions_, etc. (Private)
   ├── Write.gs  ---> hrtCreateItem_, hrtCreateRequisition_, hrtIssueStock_, etc. (Private)
   └── Audit.gs  ---> hrtGetAuditLogs_, hrtVerifyAuditIntegrity_, hrtSaveYearEndAudit_ (Private)
```

### 2.2 Canonical Physical Schema (16 Sheets Intact)
No sheets, columns, or keys were altered or dropped:
`01_Users`, `02_Departments`, `03_Master_Items`, `04_Categories`, `05_Warehouses`, `06_FSN_Catalog`, `07_Requisitions`, `08_Requisition_Items`, `09_Stock_Transactions`, `10_Stock_Ledger`, `11_Audit_Trail`, `12_Fiscal_Years`, `13_Year_End_Audits`, `14_Disposal_Records`, `15_Settings_Config`, `16_Idempotency_Log`.

---

## 3. Staging Deployment Checklist (Item 8)

| Check Item | Requirement | Staging Configuration |
|---|---|---|
| **1. Logical Filename Mapping** | Canonical `.gs` files mapped to Apps Script editor | `Code.gs` $\rightarrow$ `Code.gs`<br>`Api.gs` $\rightarrow$ `Api.gs`<br>`Read.gs` $\rightarrow$ `Read.gs`<br>`Write.gs` $\rightarrow$ `Write.gs`<br>`Audit.gs` $\rightarrow$ `Audit.gs`<br>`Config.gs` $\rightarrow$ `Config.gs` |
| **2. HTML Resource Names** | HTML template files served by `HtmlService` | `index.html` (Central Desktop Web App)<br>`MiniUI.html` (Mobile Requisition Web App via `?view=mini`) |
| **3. Manifest & OAuth Scopes** | Explicit declaration in `appsscript.json` | `https://www.googleapis.com/auth/spreadsheets`<br>`https://www.googleapis.com/auth/userinfo.email`<br>`https://www.googleapis.com/auth/script.external_request` |
| **4. Script Properties** | Required environment keys (names only, no secrets) | `SPREADSHEET_ID`: Target Google Sheets file ID<br>`GOOGLE_CLIENT_ID`: Google Cloud OAuth Web Client ID<br>`ALLOWED_DOMAINS`: Allowlisted domain list (`hrt.ac.th,school.internal`) |
| **5. Web App Execute-As Mode** | Identity under which server scripts run | `USER_DEPLOYING` (Developer/Service account with edit rights to sheets) |
| **6. Web App Access Mode** | Network access policy | `DOMAIN` (Restricted to school Google Workspace domain) or `ANYONE` if external OAuth token verification is used |
| **7. Deployment Versioning** | Deployment creation policy | Create a **New Version** in Google Apps Script Deploy dialog (e.g. `v2.7.0-rc.5`); do not overwrite active production deployment directly without testing |

---

## 4. Build / Deploy Allowlist & Final Byte Manifest (Item 9)

### 4.1 Production Include Allowlist
Only the following 9 canonical files constitute the production deployment:
```
INCLUDED (Production Bundle):
├── Code.gs
├── Api.gs
├── Read.gs
├── Write.gs
├── Audit.gs
├── Config.gs
├── index.html
├── MiniUI.html
└── appsscript.json
```

### 4.2 Strict Exclusion List
The following files and directories are strictly excluded from the production deployment bundle:
- `demo.html`, `demo_v2.7.0-rc.4.html` (Isolated demo simulator)
- `tests/*` (All test suites and harnesses)
- `scripts/*` (Automation and packaging scripts)
- `scratch/*`, `backups/*`, `backend/`, `apps_script/` (Legacy and temporary directories)
- `*.csv`, `*.rar`, `*.py` (Seeding scripts and raw transaction data)

### 4.3 Final Byte SHA-256 Manifest (v2.7.0-rc.5)

| Canonical Source | Release File | Size (Bytes) | SHA-256 Checksum |
|---|---|---|---|
| `Code.gs` | `Code_v2.7.0-rc.5.gs` | 15,261 | `cc5ac5e9d8d7e72c6621cb6580f3440d812ea4be9322b4fb5ec879f3eedcaa11` |
| `Api.gs` | `Api_v2.7.0-rc.5.gs` | 38,763 | `0eedc734fbc116b5d934eafd1f75016b2f207ab6d1213dcdbe51c0bbc7877d20` |
| `Read.gs` | `Read_v2.7.0-rc.5.gs` | 66,760 | `35588b03594aa28d09261f022a9452e93c87a220699605bae4ec1e73ff9d3289` |
| `Write.gs` | `Write_v2.7.0-rc.5.gs` | 84,406 | `8effd42809ba8d189421abc3da7f2dfd84ab44ee28f2a5cc2289c9e57100b9ed` |
| `Audit.gs` | `Audit_v2.7.0-rc.5.gs` | 16,016 | `43b1d6c8c45256d8eb0fa164860134061128262567141b953c295e418e4258f8` |
| `Config.gs` | `Config_v2.7.0-rc.5.gs` | 18,829 | `d51be46c308611d9a1259758efab12ec86fabfd9c0b67d4131a5fcd1ccee357b` |
| `index.html` | `index_v2.7.0-rc.5.html` | 1,109,517 | `26bbe94a966387150a5c698dded345286e9d55d1ef30729a745c59ba970aec8d` |
| `MiniUI.html` | `MiniUI_v2.7.0-rc.5.html` | 66,284 | `0acd6f688bd32cfb741ed3a6708ea31a1fdccc95ec9cb7f87f04ce6205e0e642` |
| `frontend/main/App.js` | `App_v2.7.0-rc.5.js` | 148,994 | `514f774a00428cb987263d0d67d6faeb265c361756d01159b409b86fca16f536` |

---

## 5. Verification Results Summary (104 / 104 Passed)

- **Prompt 11 Suite (`tests/p11_auth_miniui_rpc_test.js`)**: 22 / 22 Passed (100%)
- **Complete Regression (`scripts/run_all_tests.js`)**: 9 / 9 Suites Passed (104 / 104 Tests, 100%)
- Full test details, fixtures, commands, and expected vs actual records are cataloged in [`docs/PROMPT_11_TEST_REPORT.md`](file:///c:/Users/Art/.gemini/antigravity/scratch/docs/PROMPT_11_TEST_REPORT.md).

---

## 6. Production Deployment Gate Status & Next Actions

- **Staging Code Base**: **READY** (100% verified against unit, integration, and security tests).
- **Production Deployment Status**: **`BLOCKED`**.
  - **Reason**: Live Google Workspace authentication requires institutional OAuth client credentials (`GOOGLE_CLIENT_ID`) configured in Google Cloud Console under the school domain.
  - **Action Required by System Owner**: Follow the setup checklist in [`docs/GOOGLE_AUTH_DEPLOYMENT_CHECK.md`](file:///c:/Users/Art/.gemini/antigravity/scratch/docs/GOOGLE_AUTH_DEPLOYMENT_CHECK.md) to register the OAuth Client ID and add it to Script Properties.
