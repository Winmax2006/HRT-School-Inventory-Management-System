# HRT Inventory System — Prompt 18 Execution & Verification Report
**Document Version:** v1.1  
**Target Release Pipeline:** `v2.7.0-rc.5` (Working Tree) $\rightarrow$ Candidate `v2.7.0-rc.6` (Post Prompts 13–20)  
**Execution Date:** 29 ตุลาคม 2569  
**Organization:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)  

---

## 1. Summary of Changes

In accordance with **HRT Prompt 18 (v1.1)**, the Settings Hub, Database Diagnostics, CSV Import, and Backup/Restore systems have been comprehensively overhauled, fortified, and verified:

1. **Diagnostics De-fabrication & Live Server Probing (`Read.gs:hrtCheckHealth_` / `index.html`):**
   - Completely eliminated hardcoded diagnostics (`1BxiM...***`, `16/16 ชีตสมบูรณ์ (OK)`, `~45ms`, `Write Permissions: GRANTED`).
   - Implemented real-time latency measurement (`Date.now() - startTime`).
   - Added verified comparison between configured spreadsheet ID and actual opened spreadsheet ID (`dbMatch`).
   - Fixed caller context bug (DB-03 / Prompt 18 v1.1): verified caller identity now checks `user_id`, `id`, `userId`, `email`, `role`, and `status`. Anonymous and suspended accounts fail closed with `UNAUTHORIZED`.
   - Distinct probe labeling: read probes explicitly label write permissions as `NOT_TESTED`, strictly prohibiting read success from being claimed as write verification.
   - Masked identification: Admin sees masked ID e.g. `1Bxi...4xyz` and database name; non-admin callers receive `'PROTECTED'`.

2. **16 Canonical Physical Sheets Schema SSOT (`Config.gs` / DB-02):**
   - Reconciled physical sheets count to exactly 16 sheets in `CONFIG.SHEETS`.
   - Clarified `13_Year_End_Audit_Items` as an obsolete/redundant definition; mapped its alias to canonical `13_Year_End_Audits`.
   - Documented full physical schema in `docs/repair/DATABASE_SCHEMA_MATRIX.csv`.

3. **Settings Optimistic Concurrency & Strict Type Preservation (`Write.gs:hrtUpdateSettings_` / SET-01, SET-02):**
   - Optimistic concurrency control via `expectedRevisionId` throws `CONCURRENCY_CONFLICT` on mismatched revisions, preventing silent overwrites.
   - Preserves boolean `false` as `'false'` and number `0` as `'0'` without defaulting.
   - Non-admin callers attempting settings updates, backup, restore, or item import are strictly rejected with `FORBIDDEN`.

4. **CSV Import Protection & Non-Destructive Ingestion (`Write.gs:hrtImportItems_` / CSV-01):**
   - Batches with malformed rows or duplicate keys within the batch throw `IMPORT_VALIDATION_FAILED` before any sheet write occurs (zero partial writes).
   - Formula injection protection: formulas starting with `=`, `+`, `-`, `@`, `\t`, `\r` are safely escaped with a leading apostrophe (`'`) via `sanitizeCellValue` without executing.
   - Forbids delete-first; existing items are merged non-destructively, and inventory discrepancies are routed through auditable adjustments in `09_Stock_Transactions` and `10_Stock_Ledger`.

5. **Full System Backup & Restore Dry-Run Validator (`Write.gs` / `Read.gs` / BAK-01 to BAK-05):**
   - Full backup bundle captures actual rows and headers across all 16 canonical sheets, not just metadata.
   - Captured under `LockService.getScriptLock()` with revision consistency check (`isConsistent: true`).
   - Sensitive keys in `15_Settings_Config` (`GOOGLE_CLIENT_ID`, tokens, secrets) are redacted with `[REDACTED_SECRET]`.
   - Pre-flight dry-run validator (`hrtValidateRestore_`) verifies schema, all 16 sheets, row checksums (SHA-256), FK relationships, and audit chain with **0 database writes**.
   - Round-trip restore verified in isolated test database (`targetEnvironment: 'ISOLATED_TEST_DB'`); rejects production restore attempts (`RESTORE_FORBIDDEN`).
   - Backup failure does not update `last_backup_at` to fake success.

---

## 2. Acceptance Criteria Verification Matrix

| Criterion ID | Requirement | Test Command | Outcome | Evidence |
| :---: | :--- | :--- | :---: | :--- |
| **DB-01** | Configured vs actual ID matches; wrong ID / denied / missing sheet reflects actual status | `node tests/settings_diagnostics_backup_test.js` | **PASS** | Wrong ID $\rightarrow$ `UNHEALTHY`; missing sheet $\rightarrow$ `DEGRADED`; matching DB $\rightarrow$ `HEALTHY` |
| **DB-02** | Schema matrix defines exactly 16 canonical physical sheets without accidental alterations | `node tests/settings_diagnostics_backup_test.js` | **PASS** | `CONFIG.SHEETS` has 16 sheets; `13_Year_End_Audit_Items` mapped to `13_Year_End_Audits` alias |
| **DB-03** | Verified caller id/user_id powers auth diagnostic; anonymous/suspended rejected; read does not claim write | `node tests/settings_diagnostics_backup_test.js` | **PASS** | Anonymous $\rightarrow$ `UNAUTHORIZED`; suspended $\rightarrow$ `UNAUTHORIZED`; write labeled `NOT_TESTED` |
| **SET-01** | Save/reload exact types (boolean false, number 0); revision conflict prevents silent overwrite | `node tests/settings_diagnostics_backup_test.js` | **PASS** | `allow_over_quota: false` and `low_stock_threshold: 0` preserved; stale revision throws `CONCURRENCY_CONFLICT` |
| **SET-02** | Non-admin direct update/import/backup/restore requests are denied with FORBIDDEN | `node tests/settings_diagnostics_backup_test.js` | **PASS** | Direct mutations from `TEACHER` and `OFFICER` rejected with `FORBIDDEN` |
| **CSV-01** | Malformed/duplicate rows abort before write; formula injection sanitized non-destructively | `node tests/settings_diagnostics_backup_test.js` | **PASS** | Invalid row aborts entire batch with 0 writes; formula prepended with apostrophe |
| **BAK-01** | Backup bundle contains actual rows, headers, and manifest; secrets are redacted | `node tests/settings_diagnostics_backup_test.js` | **PASS** | Bundle contains actual rows for 16 sheets; `GOOGLE_CLIENT_ID` redacted to `[REDACTED_SECRET]` |
| **BAK-02** | Backup snapshot records isConsistent: true under lock | `node tests/settings_diagnostics_backup_test.js` | **PASS** | `manifest.isConsistent === true` verified under `LockService` script lock |
| **BAK-03** | Restore dry-run validator rejects corrupted/incompatible bundles with zero database writes | `node tests/settings_diagnostics_backup_test.js` | **PASS** | Rejects missing sheets (`isCompatible: false`), tampered rows (`CHECKSUM_MISMATCH`), broken FKs |
| **BAK-04** | Round-trip restore in isolated test DB verifies items, FK, and ledger balances; refuses production | `node tests/settings_diagnostics_backup_test.js` | **PASS** | Refuses `PRODUCTION` (`RESTORE_FORBIDDEN`); restores to `ISOLATED_TEST_DB` with matching totals |
| **BAK-05** | Backup failure preserves existing last_backup_at without recording fake success | `node tests/settings_diagnostics_backup_test.js` | **PASS** | Missing sheet throws error; `last_backup_at` timestamp in config remains untouched |

---

## 3. Regression Suite Status

- **Test Suite:** `tests/settings_diagnostics_backup_test.js`
- **Total Tests Executed:** 11 / 11
- **Pass Rate:** **100% (11 Passed, 0 Failed, 0 Skipped)**
- **Master Regression Runner:** `node scripts/run_all_tests.js`
- **Total Regression Test Suites:** **15 / 15 suites PASS**
- **Total Individual Tests Passed:** **173 / 173 tests PASS (100%)**
