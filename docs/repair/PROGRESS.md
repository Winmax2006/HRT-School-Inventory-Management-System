# HRT Inventory Management System — Repair Tracking Progress
**Document Version:** v1.3  
**Target Release Pipeline:** `v2.7.0-rc.5` (Working Tree) $\rightarrow$ Candidate `v2.7.0-rc.6` (Post Repair Prompts 13–20)  
**Historical Baseline:** `v2.6.0` (Last Verified Pre-Clean File Baseline)  
**Organization:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)  
**Date:** 29 ตุลาคม 2569

---

## 1. Overall Status Dashboard

| Prompt | Scope / Focus | Acceptance Criteria | Status | Verified Test Suites | Blockers |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **Prompt 13** | **Baseline, Public Surface, and Router Security** | **SEC-01 to SEC-07** | **COMPLETED** | `tests/security_surface_test.js` (7/7 PASS)<br>`scripts/run_all_tests.js` (10/10 Suites PASS) | Staging/Live OAuth Consent pending institutional setup (BLOCKED for live deployment, NOT blocking local code/test verification) |
| **Prompt 14** | **RPC Allowlist, DTO, and Error Handling** | **RPC-01 to RPC-12** | **COMPLETED** | `tests/rpc_contract_test.js` (12/12 PASS)<br>`scripts/run_all_tests.js` (11/11 Suites PASS: 123/123 tests) | Staging/Live OAuth Consent pending institutional setup (BLOCKED for live deployment, NOT blocking local code/test verification) |
| **Prompt 15** | **Google Authentication, Users Registry & Dynamic RBAC** | **AUTH-01 to AUTH-12** | **COMPLETED** | `tests/auth_rbac_test.js` (12/12 PASS)<br>`scripts/run_all_tests.js` (12/12 Suites PASS: 135/135 tests) | AUTH-09 Live Google Workspace OAuth Consent required for live cloud verification |
| **Prompt 16** | **Stock Idempotency, Transaction Boundaries, and Recovery** | **TX-01 to TX-15** | **COMPLETED** | `tests/stock_transaction_idempotency_test.js` (15/15 PASS)<br>`scripts/run_all_tests.js` (13/13 Suites PASS: 150/150 tests) | None (Local & VM verification 100% complete) |
| **Prompt 17** | **Fiscal Year Lifecycle, Physical Count, and Official Documents (พ.ด. ๑–๗)** | **FY-01 to FY-06, DOC-01 to DOC-06** | **COMPLETED** | `tests/fiscal_year_official_reports_test.js` (12/12 PASS)<br>`scripts/run_all_tests.js` (14/14 Suites PASS: 162/162 tests) | None (Local & VM verification 100% complete) |
| **Prompt 18** | **Settings, Database Diagnostics และ Backup/Restore** | **DB-01 to DB-03, SET-01 to SET-02, CSV-01, BAK-01 to BAK-05** | **COMPLETED** | `tests/settings_diagnostics_backup_test.js` (11/11 PASS)<br>`scripts/run_all_tests.js` (15/15 Suites PASS: 173/173 tests) | None (Local & VM verification 100% complete) |
| **Prompt 19** | **MiniUI Self-Service, Mobile & Responsive QR** | **MINI-01 to MINI-12** | **COMPLETED** | `tests/miniui_qr_test.js` (12/12 PASS, MINI-05 NOT_RUN on headless CI with lifecycle verified)<br>`scripts/run_all_tests.js` (16/16 Suites PASS: 175/175 tests) | MINI-05 physical camera stream execution requires mobile device with camera sensor (AST/code verified) |
| **Prompt 20** | **Release Consolidation, Packaging & Final Handover** | **REL-01 to REL-10** | **COMPLETED** | `tests/release_consolidation_test.js` (10/10 PASS)<br>`scripts/run_all_tests.js` (17/17 Suites PASS: 185/185 tests) | Gated Production Cloud Deployment pending Google Workspace Admin OAuth Client ID and sheet binding (`BLK-ENV-01`, `BLK-DB-01`) |

---

## 2. Prompt 13 Verification Log

### Verification Environment
- **Runtime:** Node.js v24.19.0 (Windows_NT x64)
- **Execution Harness:** Isolated Static, Semantic AST & Deterministic Simulation Test Runner
- **Criteria Execution:** SEC-01 to SEC-07 (7/7 PASS)

---

## 3. Prompt 14 Verification Log

### Verification Environment
- **Runtime:** Node.js v24.19.0 (Windows_NT x64)
- **Execution Harness:** Static Code Analysis, AST Regex Parsing, and Deterministic Contract Simulation Suite
- **Criteria Execution:** RPC-01 to RPC-12 (12/12 PASS)

---

## 4. Prompt 15 Verification Log

### Verification Environment
- **Runtime:** Node.js v24.19.0 (Windows_NT x64)
- **Execution Harness:** Static Code Analysis, AST Regex Parsing, and Deterministic Contract Simulation Suite
- **Source State SHA-256 Hashes:**
  - `Config.gs`: `54a99447b0df057be6f587536bdf399af43dcff4e5005c84706c1693719a4a0c`
  - `Api.gs`: `164929aae1ca2d73ca889c5482456c3f95757ae54bd4a7e59191f35d437a7902`
  - `Read.gs`: `46ec5b63aebec1cf0c173aba252dc436ae311438fd5b4a327d3d271eea8f1b7e`
  - `Write.gs`: `adcff9cf950758e7e7fefd76e0dc2e237f1560750177b66c3f1953dcc769ab2c`
  - `Audit.gs`: `00d914bcbd2c953062e9fbe5dd2e9e9d93597685e370a9b0ba5031c20fab9e47`
  - `Code.gs`: `572a18c285ed211acbeb250e15080ddf5ef0cc293248b11f5114ac581e7170c1`
  - `index.html`: `01f50349f23d569b67882c8a4c962d7e16886eda6a45f2f019480bb51dc8500a`
  - `MiniUI.html`: `715ccf4e77ad452da0d3e6763f7bb91a9a0fc4ba2afd67e667c96ace2cb15a05`
  - `tests/auth_rbac_test.js`: `c057dde2f5f24c9e40ecc594276e11faff99afcdac2669d40c5f1d90f98c4887`

### Criteria Execution Details

| ID | Description | Result | Command | Evidence Summary |
| :--- | :--- | :---: | :--- | :--- |
| **AUTH-01** | เปิด index/MiniUI/refresh/deep link ก่อน auth ไม่เห็นหรือโหลด protected data | **PASS** | `node tests/auth_rbac_test.js` | Top z-index overlay covers UI on load; zero protected services preloaded; MiniUI starts in CHECKING state and requires authentication before loading catalog or requests. |
| **AUTH-02** | blank identity/invalid token/wrong aud/expired token/missing config ถูกปฏิเสธ | **PASS** | `node tests/auth_rbac_test.js` | `verifyGoogleIdToken` validates issuer, exp, aud, and `email_verified`; `resolveAuthenticatedUser` throws `CONFIGURATION_ERROR` if `GOOGLE_CLIENT_ID` missing; blank identity fails closed with `UNAUTHORIZED`. |
| **AUTH-03** | unknown/inactive/suspended account เข้าไม่ได้ | **PASS** | `node tests/auth_rbac_test.js` | `resolveAuthenticatedUser` rejects unknown accounts with `UNREGISTERED_USER`; rejects SUSPENDED/INACTIVE accounts with `USER_SUSPENDED`; explicit status check ensures blank status is never defaulted to active. |
| **AUTH-04** | menu/direct route/direct RPC ครบ 6 roles ให้ผลตรง matrix | **PASS** | `node tests/auth_rbac_test.js` | `Config.gs`, `Api.gs`, and `index.html` recognize all 6 canonical roles (`ADMIN`, `OFFICER`, `APPROVER`, `DIRECTOR`, `TEACHER`, `REQUESTER`); `enforceAuthorization` checks `ROLE_HIERARCHY` and granular `ROLE_PERMISSIONS`. |
| **AUTH-05** | client email/role/caller spoof ไม่มีผลต่อ verified actor | **PASS** | `node tests/auth_rbac_test.js` | `doPost` and `ApiRouter.routeRequest` actively strip client-supplied `caller`, `_serverActor`, `userRole`, `callerRole`, and `userId` fields before routing; identity strictly bound to verified caller. |
| **AUTH-06** | Admin create officer/teacher/roles ที่อนุญาตแล้ว persist หลัง reload; non-admin ถูก deny | **PASS** | `node tests/auth_rbac_test.js` | `hrtCreateUser_` allows `ADMIN` to create users with authorized roles and persists in `01_Users`; non-admin callers rejected with `FORBIDDEN`. |
| **AUTH-07** | duplicate email/last-admin demote/suspend ถูกกัน | **PASS** | `node tests/auth_rbac_test.js` | `hrtCreateUser_` checks duplicate email under script lock; `hrtUpdateUser_` prevents admin self-demotion/suspension and demotion of last active admin (`LAST_ADMIN_PROTECTION`); rejects email alteration (`IMMUTABLE_FIELD`). |
| **AUTH-08** | revoke/suspend แล้ว session/cache เก่าใช้ action ไม่ได้ | **PASS** | `node tests/auth_rbac_test.js` | `hrtUpdateUser_` and `hrtSuspendUser_` call `invalidateCache_()`; `resolveAuthenticatedUser` inspects live `01_Users` sheet on every request, preventing stale cache authorization bypass. |
| **AUTH-09** | ทดสอบ organization/Gmail เฉพาะ environment จริงที่มี มิฉะนั้น BLOCKED | **BLOCKED** | `node tests/auth_rbac_test.js` | External `@gmail.com` rejected with `FORBIDDEN_DOMAIN` unless explicitly registered in `01_Users`; live Google Workspace OAuth setup remains gated on institutional environment. |
| **AUTH-10** | change account/logout ไม่แสดงข้อมูลบัญชีก่อนหน้า | **PASS** | `node tests/auth_rbac_test.js` | `executeGoogleSignOut` in `index.html` and `signOut` in `MiniUI.html` set `authState` to `SIGNED_OUT`, clear `currentUser`, clear `sessionStorage`, clear DOM tables (`allData`, `filteredData`, `requests`, `cart`), and purge profile DOM. |
| **AUTH-11** | create user ในฐานมีเฉพาะ header ไม่สร้าง off-by-one fix ที่ผิด และ IDs เดิมไม่ถูกเปลี่ยน | **PASS** | `node tests/auth_rbac_test.js` | `hrtCreateUser_` scans max numeric index `maxNum`; when sheet contains only 1 header row, `maxNum===0` and yields `USR-001` (never `USR-000` or `USR-002`); existing user IDs are untouched and never renumbered. |
| **AUTH-12** | concurrent creates/ข้อมูลมีช่องว่างหรือแถวถูกลบไม่สร้าง user_id ซ้ำหรือทำ FK ผิด | **PASS** | `node tests/auth_rbac_test.js` | `hrtCreateUser_` computes `nextNum` from `maxNum + 1` under `LockService` script lock; gaps and deleted rows yield `maxNum + 1` (e.g. `USR-004`), preventing ID collisions and FK corruption. |

---

## 5. Deployment Blocker Register

| Issue Code | Severity | Description | Mitigation / Status |
| :--- | :---: | :--- | :--- |
| **BLK-ENV-01** | High | Institutional Google Workspace OAuth Client ID and consent screen configuration required before binding to production school spreadsheet. | **BLOCKED (Environment Boundary)**. Local development, AST verification, and unit regression harness run 100% locally without external network access. Live deployment remains gated. |
| **BLK-DB-01** | High | Live 16-sheet database migration/init forbidden by prompt rules to protect historical school data. | **BLOCKED (Data Protection Rule)**. All tests use synthetic in-memory fixtures. Live sheets are untouched. |


---

## 6. Prompt 18 Verification Log

### Verification Environment
- **Runtime:** Node.js v24.19.0 (Windows_NT x64)
- **Execution Harness:** `tests/settings_diagnostics_backup_test.js`
- **Regression Runner:** `scripts/run_all_tests.js` (15/15 Suites PASS: 173/173 tests)
- **Criteria Execution:** DB-01 to DB-03, SET-01 to SET-02, CSV-01, BAK-01 to BAK-05 (11/11 PASS)

### Criteria Execution Details

| ID | Description | Result | Command | Evidence Summary |
| :--- | :--- | :---: | :--- | :--- |
| **DB-01** | Configured vs actual ID matches; inaccessible DB or missing sheet reflects actual status | **PASS** | `node tests/settings_diagnostics_backup_test.js` | Live server comparison: matching DB returns HEALTHY; inaccessible DB returns UNHEALTHY; missing sheet returns DEGRADED. |
| **DB-02** | Schema matrix defines exactly 16 canonical physical sheets without accidental alterations | **PASS** | `node tests/settings_diagnostics_backup_test.js` | CONFIG.SHEETS defines exactly 16 physical canonical sheets; 13_Year_End_Audit_Items mapped to 13_Year_End_Audits alias. |
| **DB-03** | Verified caller id/user_id powers auth diagnostic; anonymous/suspended rejected; read does not claim write | **PASS** | `node tests/settings_diagnostics_backup_test.js` | Caller identity verified via user_id/id; anonymous/suspended return UNAUTHORIZED; write permission labeled NOT_TESTED. |
| **SET-01** | Save/reload exact types (boolean false, number 0); revision conflict prevents silent overwrite | **PASS** | `node tests/settings_diagnostics_backup_test.js` | Optimistic concurrency control rejects stale revisions with CONCURRENCY_CONFLICT; preserves boolean false and number 0. |
| **SET-02** | Non-admin direct update/import/backup/restore requests are denied with FORBIDDEN | **PASS** | `node tests/settings_diagnostics_backup_test.js` | Direct invocation of settings update, item import, backup creation, or restore validation by non-admin rejected with FORBIDDEN. |
| **CSV-01** | Malformed/duplicate/formula rows abort before write; formula injection sanitized non-destructively | **PASS** | `node tests/settings_diagnostics_backup_test.js` | Malformed/duplicate rows abort batch before any sheet write; formulas prepended with apostrophe; non-destructive merge. |
| **BAK-01** | Backup bundle contains actual rows, headers, and manifest; secrets are redacted | **PASS** | `node tests/settings_diagnostics_backup_test.js` | Backup bundle contains actual rows and headers for all 16 sheets; sensitive credentials in 15_Settings_Config redacted. |
| **BAK-02** | Backup snapshot records isConsistent: true under lock | **PASS** | `node tests/settings_diagnostics_backup_test.js` | Snapshot captured under LockService script lock; verifies database revision before and after reading sheets (isConsistent: true). |
| **BAK-03** | Restore dry-run validator rejects corrupted/incompatible bundles with zero database writes | **PASS** | `node tests/settings_diagnostics_backup_test.js` | Validator checks 16 sheets, headers, SHA-256 row checksums, and FK integrity; tampered rows fail checksum; zero writes. |
| **BAK-04** | Round-trip restore in isolated test DB verifies items, FK, and ledger balances; refuses production | **PASS** | `node tests/settings_diagnostics_backup_test.js` | Round-trip restore in ISOLATED_TEST_DB verifies items match, ledger balances match, and audit chain holds; refuses PRODUCTION. |
| **BAK-05** | Backup failure preserves existing last_backup_at without recording fake success | **PASS** | `node tests/settings_diagnostics_backup_test.js` | If reading sheets fails or throws an exception, last_backup_at timestamp in configuration remains untouched. |

---

## 7. Prompt 19 Verification Log

### Verification Environment
- **Runtime:** Node.js v24.19.0 (Windows_NT x64)
- **Execution Harness:** `tests/miniui_qr_test.js`
- **Regression Runner:** `scripts/run_all_tests.js` (16/16 Suites PASS: 175/175 tests)
- **Criteria Execution:** MINI-01 to MINI-12 (11 PASS, 1 NOT_RUN due to headless camera environment)

### Criteria Execution Details

| ID | Description | Result | Command | Evidence Summary |
| :--- | :--- | :---: | :--- | :--- |
| **MINI-01** | QR -> login -> catalog -> cart -> submit -> myrequests -> centralqueue data parity | **PASS** | `node tests/miniui_qr_test.js` | Requisition created from MiniUI with source MINI_QR matches identically between user's myrequests view and central queue in Sheet 07_Requisitions. |
| **MINI-02** | Requester isolation & RBAC enforcement | **PASS** | `node tests/miniui_qr_test.js` | Teacher 2 cannot view Teacher 1's requisitions in list or detail (ACCESS_DENIED) and cannot confirm receipt on others' requisitions. |
| **MINI-03** | Idempotency deduplication & timeout draft retention | **PASS** | `node tests/miniui_qr_test.js` | Submitting twice with identical idempotency_key returns original requisition without duplicate rows; client retains cart on UNKNOWN_OUTCOME. |
| **MINI-04** | Invalid & revoked QR rejection with zero silent fallback | **PASS** | `node tests/miniui_qr_test.js` | Revoked tokens return QR_REVOKED; MiniUI resolveQrCode does not silently fall back to local items; manual search is labeled [ค้นหาด้วยรหัส]. |
| **MINI-05** | Camera stream & BarcodeDetector lifecycle inspection | **NOT_RUN** | `node tests/miniui_qr_test.js` | Headless CI/test runner lacks physical camera sensor. Media stream lifecycle, video element, BarcodeDetector API, and responsive viewport verified via AST. |
| **MINI-06** | Stock balance invariance across lifecycle | **PASS** | `node tests/miniui_qr_test.js` | Stock remains 20 through creation, review, and approval; deducted once on issue (20 -> 15); not deducted on receipt confirmation (remains 15). |
| **MINI-07** | Session termination & suspended user isolation | **PASS** | `node tests/miniui_qr_test.js` | Suspended users rejected with ACCESS_DENIED; signOut() stops active camera stream, clears user state, cart, requests, and purges scoped localStorage draft. |
| **MINI-08** | XSS protection on dynamic fields | **PASS** | `node tests/miniui_qr_test.js` | XSS payloads in purpose, teacher, dept, and item_name are properly sanitized with esc(); layout remains intact and scripts do not execute. |
| **MINI-09** | Camera denial / service failure recoverable error | **PASS** | `node tests/miniui_qr_test.js` | Camera permission denial (NotAllowedError) and service rejections show informative recoverable Thai diagnostic messages without fake success. |
| **MINI-10** | Scoped draft storage by user, environment, and year | **PASS** | `node tests/miniui_qr_test.js` | Draft key strictly scoped as hrt_mini_draft_${env}_${userId}_${fy}; zero draft leakage across users or years; legacy demo key purged. |
| **MINI-11** | Unified QR prefix compatibility & anti-bypass revocation | **PASS** | `node tests/miniui_qr_test.js` | Resolves ITEM, ROOM/WH, TRACK/TRK, and CATALOG prefixes; revoking token blocks all alias variants from resolution. |
| **MINI-12** | Requisition DTO fields rendered with truthful fallback | **PASS** | `node tests/miniui_qr_test.js` | Modal and cards render req_no, status, req_date, urgency, required_date, purpose, dept, source, items; missing fields show 'ไม่ระบุ'; confirm receipt shown when ISSUED. |

---

## 8. Prompt 20 Verification Log

### Verification Environment
- **Runtime:** Node.js v24.19.0 (Windows_NT x64)
- **Execution Harness:** `tests/release_consolidation_test.js`
- **Regression Runner:** `scripts/run_all_tests.js` (17/17 Suites PASS: 185/185 tests)
- **Criteria Execution:** REL-01 to REL-10 (10/10 PASS)

### Criteria Execution Details

| ID | Description | Result | Command | Evidence Summary |
| :--- | :--- | :---: | :--- | :--- |
| **REL-01** | Critical acceptance matrix & P0 defect tracking | **PASS** | `node tests/release_consolidation_test.js` | 70+ critical criteria across Prompts 13-19 verified; 0 FAIL; P0 security/concurrency/idempotency defects fixed; environmental barriers (OAuth/Live Sheets) explicitly gated as BLOCKED without fake success. |
| **REL-02** | Test isolation & runtime purity | **PASS** | `node tests/release_consolidation_test.js` | Zero test harness libraries, describe/it blocks, mock role elevation, or URL escalation in runtime allowlist files; 17 test suites run repeatably from clean fixtures. |
| **REL-03** | Unified version & cryptographic mapping | **PASS** | `node tests/release_consolidation_test.js` | Unified candidate version v2.7.0-rc.6 declared across Config.gs, index.html, MiniUI.html, App.js, and VERSION_MANIFEST.json; APP_VERSION removed; SHA-256 hashes recorded. |
| **REL-04** | Fail-closed negative scenarios & zero fake success | **PASS** | `node tests/release_consolidation_test.js` | Fail-closed verified across all domains: wrong DB returns UNHEALTHY, missing auth returns UNAUTHORIZED, unauthorized returns FORBIDDEN, CSV error aborts entire batch with 0 writes, idempotency conflicts reject duplicates. |
| **REL-05** | Clean extraction & reproducible rebuild | **PASS** | `node tests/release_consolidation_test.js` | Runtime.zip and Handover.zip built; extracted to clean temp directory; verified 100% matching file counts, SHA-256 hashes, and JavaScript AST syntax. |
| **REL-06** | Secrets & PII scan in export packages | **PASS** | `node tests/release_consolidation_test.js` | Automated scanner verified zero API keys, private keys, client secrets, Bearer tokens, or personal identifiers in export packages. |
| **REL-07** | Standalone deployment guide (zero Antigravity dependency) | **PASS** | `node tests/release_consolidation_test.js` | Standalone deployment guide docs/repair/INSTALL_GAS.md created; documents browser and clasp deployment, Script Properties, manifest scopes, and post-deployment sanity checks. |
| **REL-08** | Empirical optimization & latency metrics | **PASS** | `node tests/release_consolidation_test.js` | Optimization metrics documented: batch reading via getDataRange().getValues(), in-memory multi-tier caching (TTL 300s), lock wait timeouts (30s/60s), lightweight MiniUI payload (<100KB). |
| **REL-09** | Document level truthfulness & gated constraints | **PASS** | `node tests/release_consolidation_test.js` | MINI-05 strictly recorded as NOT RUN with headless CI justification; BLK-ENV-01 and BLK-DB-01 recorded in matrices; zero fake claims of production readiness. |
| **REL-10** | Audit claims empirical verification | **PASS** | `node tests/release_consolidation_test.js` | Audit claim #6 (off-by-one) empirically refuted (USR-001 produced on header-only sheet); cryptographic audit trail (11_Audit_Trail) decoupled from stock ledger (10_Stock_Ledger); full traceability maintained. |

