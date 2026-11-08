# HRT Inventory Management System — Prompt 13 Completion Report
**Document Version:** v1.1  
**Target Candidate Pipeline:** `v2.7.0-rc.5` (Base) $\rightarrow$ Working State for `v2.7.0-rc.6`  
**Historical Baseline:** `v2.6.0` (Last Verified Pre-Clean File Baseline)  
**Organization:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)  
**Date:** 28 ตุลาคม 2569

---

## 1. Executive Summary

Prompt 13 resolves fundamental security vulnerabilities in the public execution surface, request routing, and platform boundaries of the HRT Inventory System. Prior to this patch, public mutable helpers (`setConfig`, `logAudit`, `include`) could be invoked unauthenticated via `google.script.run`, `doPost` did not sanitize client-supplied caller identities, and the universal router relied on unconstrained dynamic string property lookups (`globalThis[...]`) while recursing on `requisitions.submit`.

All objectives of Prompt 13 have been fulfilled and verified:
1. **Public Surface Hardened:** All mutable, internal, and inclusion helpers encapsulated with the private `_` suffix.
2. **Client Spoofing Eliminated:** `doPost` actively purges `caller`, `_serverActor`, `userRole`, and `callerRole` before routing.
3. **Explicit Allowlist Registry:** Dynamic `globalThis` lookup replaced with `resolveAllowlistedHandler` covering 56 concrete business handlers.
4. **Router Recursion Eliminated:** `requisitions.submit` rewired directly to `hrtCreateRequisition_`.
5. **Template Inclusion Protected:** `include_` strictly allowlists `['index.html', 'MiniUI.html']` and blocks directory traversal.
6. **Audit Trail Hardened:** Mandatory audit persistence on database mutations with dual-mode error handling, accompanied by comprehensive token and private key sanitization.
7. **Acceptance Criteria Verified:** 100% of criteria **SEC-01 through SEC-07** passed in automated testing.
8. **Master Regression Verified:** All 10 project test suites passed with 0 failures.

---

## 2. Source Code Modifications & Exact Diff Summary

### 2.1 `Config.gs`
- Renamed `setConfig(key, value)` $\rightarrow$ `setConfig_(key, value)`.
- Renamed `invalidateCache(scope)` $\rightarrow$ `invalidateCache_(scope)`.
- Updated internal call within `setConfig_` to invoke `invalidateCache_`.
- Ensured all remaining public functions in `Config.gs` are strictly read-only getters (`getSS`, `getSheet`, `getConfig`, etc.).

### 2.2 `Audit.gs`
- Renamed `logAudit(action, module, details, caller)` $\rightarrow$ `logAudit_(action, module, details, caller, isMandatory)`.
- Implemented **Write-Failure Policy**:
  - When `isMandatory === true` (mutations), append failure throws `AUDIT_PERSISTENCE_FAILED`.
  - When `isMandatory === false` (secondary error logging), append failure logs a warning without masking the underlying business exception.
- Enhanced `hrtSanitizeAuditDetails_` regex suite to mask:
  - `Bearer [MASKED_TOKEN]`
  - `Basic [MASKED_CREDENTIALS]`
  - `ya29.[0-9A-Za-z-_]+` $\rightarrow$ `[MASKED_OAUTH_TOKEN]`
  - `AIza[0-9A-Za-z-_]{30,40}` $\rightarrow$ `[MASKED_API_KEY]`
  - `ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}` $\rightarrow$ `[MASKED_JWT]`
  - `-----BEGIN [A-Z ]+ PRIVATE KEY-----...` $\rightarrow$ `[MASKED_PRIVATE_KEY]`
  - Query parameters: `password=`, `token=`, `secret=`, `client_secret=` $\rightarrow$ `[MASKED]`
- All 8 functions in `Audit.gs` now end with `_` (zero public functions).

### 2.3 `Write.gs`
- Updated 7 calls from `setConfig(...)` to `setConfig_(...)`.
- Updated 10 calls from `invalidateCache(...)` to `invalidateCache_(...)`.
- Updated all 52 calls from `logAudit(...)` to `logAudit_(..., true)` enforcing mandatory audit trail persistence on all mutations.
- All 30 functions in `Write.gs` end with `_` (zero public functions).

### 2.4 `Api.gs`
- Replaced dynamic string resolution in `routeRequest` with `resolveAllowlistedHandler(route.handler)`.
- Declared explicit compile-time registry `ALLOWLISTED_HANDLERS` mapping all 56 unique private business handlers.
- Fixed `ACTION_REGISTRY['requisitions.submit']` handler: mapped directly to `'hrtCreateRequisition_'` instead of `'apiSubmitRequisition'` (eliminating router recursion).
- Updated error logging in `ApiRouter` catch block to call `logAudit_('API_REJECTED', ..., false)` (non-mandatory secondary logging).

### 2.5 `Code.gs`
- Renamed `include(filename)` $\rightarrow$ `include_(filename)` with strict allowlist `['index.html', 'MiniUI.html']`. Unauthorized files or path traversals return a security warning without reading disk.
- Hardened `doPost(e)`: actively deletes `payload.caller`, `payload._serverActor`, `payload.userRole`, and `payload.callerRole` before routing.
- Removed public `initDatabase` facade from client reach. Retained `initDatabase_()` requiring server-verified `caller.role === 'ADMIN'`.
- Renamed `_runInitDatabaseSchema()` $\rightarrow$ `_runInitDatabaseSchema_()` with trailing underscore to prevent Apps Script engine export.

### 2.6 `appsscript.json`
- Explicitly declared required OAuth scopes:
  - `https://www.googleapis.com/auth/spreadsheets`
  - `https://www.googleapis.com/auth/userinfo.email`
  - `https://www.googleapis.com/auth/script.external_request`

---

## 3. Test Verification & Evidence

### 3.1 Security Suite (`tests/security_surface_test.js`)

Command executed:
```bash
node tests/security_surface_test.js
```

Output:
```
=============================================================
RUNNING PROMPT 13: BASELINE, PUBLIC SURFACE & ROUTER SECURITY
Target Baseline: v2.7.0-rc.5 -> Working State for rc.6
=============================================================

[PASS] [SEC-01] Private suffix (_) encapsulation for mutable helpers (setConfig_, logAudit_, invalidateCache_, include_, initDatabase_)
[PASS] [SEC-02] doPost strips client-supplied identity spoofing and resolver binds to authoritative Session/Token
[PASS] [SEC-03] Server-side RBAC denies non-admin callers attempting admin actions (FORBIDDEN)
[PASS] [SEC-04] Zero recursion, zero dynamic string lookup, and all 135 actions resolve to allowlisted handlers
[PASS] [SEC-05] include_ allowlist enforces template containment and all internal references are valid
[PASS] [SEC-06] Log sanitizer redacts secrets/tokens and unknown actions return clean error envelope
[PASS] [SEC-07] Handler definition is decoupled from runtime authorization and fiscal year boundary constraints

=============================================================
TOTAL SECURITY TESTS: 7
PASSED: 7
FAILED: 0
ALL PROMPT 13 SECURITY CRITERIA (SEC-01 - SEC-07) PASSED 100%!
=============================================================
```

### 3.2 Master Regression Suite (`scripts/run_all_tests.js`)

Command executed:
```bash
node scripts/run_all_tests.js
```

Output summary:
```
==================================================
RUNNING COMPLETE TEST SUITE REGRESSION (10 SUITES)
==================================================

>>> Running: tests/regression_test_suite.js
TOTAL TESTS: 11 | PASSED: 11 | FAILED: 0
---
>>> Running: tests/p1_p2_contract_lifecycle_test.js
TOTAL TESTS: 10 | PASSED: 10 | FAILED: 0
---
>>> Running: tests/p3_miniui_critical_test.js
TOTAL TESTS: 11 | PASSED: 11 | FAILED: 0
---
>>> Running: tests/p4_settings_important_test.js
TOTAL TESTS: 10 | PASSED: 10 | FAILED: 0
---
>>> Running: tests/p6_acceptance_suite.js
TOTAL ACCEPTANCE TESTS: 10 | PASSED: 10 | FAILED: 0
---
>>> Running: tests/p7_settings_comprehensive_test.js
TOTAL TESTS: 10/10 SCENARIOS | PASSED: 10 | FAILED: 0
---
>>> Running: tests/p8_backend_sheets_architecture_test.js
TOTAL TESTS: 10/10 SCENARIOS | PASSED: 10 | FAILED: 0
---
>>> Running: tests/p9_clean_separation_test.js
TOTAL SCENARIOS: 10 | PASSED: 10 | FAILED: 0
---
>>> Running: tests/p11_auth_miniui_rpc_test.js
TOTAL SCENARIOS: 22 | PASSED: 22 | FAILED: 0
---
>>> Running: tests/security_surface_test.js
TOTAL SECURITY TESTS: 7 | PASSED: 7 | FAILED: 0
---

==================================================
ALL 10 TEST SUITES PASSED 100%!
==================================================
```

---

## 4. Deliverables Catalog

| File Path | Description | Status |
| :--- | :--- | :---: |
| `docs/repair/BASELINE.md` | Authoritative source-to-runtime mapping, cryptographic digests, categorized audit review | Complete |
| `docs/repair/PUBLIC_SURFACE.md` | Catalog of public platform endpoints, compatibility facades, and boundary guards | Complete |
| `docs/repair/ROUTER_MATRIX.csv` | Full table of 135 actions, handlers, roles, permissions, and transport modes | Complete |
| `docs/repair/PROGRESS.md` | Prompt tracking log starting from Prompt 13 with verified criteria | Complete |
| `docs/repair/ACCEPTANCE_MATRIX.csv` | Populated acceptance matrix (91 cases preserved, SEC-01 to SEC-07 completed) | Complete |
| `docs/repair/P13_RESULT.md` | Comprehensive completion report for Prompt 13 | Complete |
| `tests/security_surface_test.js` | Automated test suite validating SEC-01 through SEC-07 | Complete |

---

## 5. Next Steps for Prompt 14

With the public surface secured and router recursion eliminated, the codebase is prepared for **Prompt 14 (RPC Allowlist & Compatibility Transport)**:
- Verify and test all 135 referenced RPC operations across `index.html` and `MiniUI.html`.
- Confirm synthetic dataset rendering for requests, audit, users, and FSN across browser sessions.
- Maintain strict compatibility facades without breaking legacy transport contracts.
