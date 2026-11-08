# HRT Inventory System — Staging Restore & Dry-Run Protocol Report
**Document Version:** v1.1  
**Target Release Pipeline:** `v2.7.0-rc.5` $\rightarrow$ Candidate `v2.7.0-rc.6`  
**Execution Context:** `Read.gs:hrtValidateRestore_` / `Write.gs:hrtRestoreFromBundle_`  
**Organization:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)  

---

## 1. Safety Gates & Environment Isolation Policy

To prevent irreversible data loss or disruption to live school inventory operations:
1. **Production Restoration Forbidden:** Restore operations directly targeting production environments are blocked at the router and handler level (`RESTORE_FORBIDDEN`).
2. **Staging / Disposable Test DB Only:** Full database restore is only executable in an explicitly designated, disposable staging database (`targetEnvironment: 'ISOLATED_TEST_DB'`).
3. **Mandatory Pre-Flight Dry-Run:** Every restore must first pass automated dry-run validation (`hrtValidateRestore_`) with **0 database writes**. If any schema check, foreign key check, or checksum verification fails, the restore is blocked.

---

## 2. Dry-Run Verification Checklist (BAK-03)

| Check Category | Validation Rule | Pass Criteria | Failure Outcome |
| :--- | :--- | :--- | :--- |
| **Authentication & Role** | Caller must possess active `ADMIN` role | `caller.role === 'ADMIN'` | Throws `FORBIDDEN` |
| **Bundle Structure** | Top-level object contains `manifest` and `sheets` | Object structure valid | Throws `VALIDATION_ERROR` |
| **16 Canonical Sheets** | All 16 physical sheet names must exist in bundle | `missingSheets.length === 0` | Reports `MISSING_CANONICAL_SHEET`, `isCompatible: false` |
| **Header Schema Match** | Column headers match canonical schema in `Code.gs` | Exact column name match | Reports `SCHEMA_HEADER_MISMATCH` |
| **Cryptographic Checksums** | SHA-256 of sheet rows matches manifest checksum | Recomputed hash matches | Reports `CHECKSUM_MISMATCH` |
| **Row Count Consistency** | Number of rows matches `rowCount` in manifest | `sheet.rows.length === rowCount` | Reports `ROW_COUNT_MISMATCH` |
| **FK: Requisition Items $\rightarrow$ Items** | `08_Requisition_Items.item_code` exists in `03_Master_Items` | All item codes exist | Reports FK violation, `fkIntegrity.valid = false` |
| **FK: Requisition Items $\rightarrow$ Headers** | `08_Requisition_Items.req_id` exists in `07_Requisitions` | All req IDs exist | Reports FK violation |
| **FK: Requisitions $\rightarrow$ Users** | `07_Requisitions.user_id` exists in `01_Users` | All user IDs exist | Reports FK violation |
| **FK: Stock Ledger $\rightarrow$ Items** | `10_Stock_Ledger.item_code` exists in `03_Master_Items` | All ledger item codes exist | Reports FK violation |
| **Secrets Exclusion** | `15_Settings_Config` sensitive keys redacted | Sensitive values = `[REDACTED_SECRET]` | Reports `UNREDACTED_SECRET_IN_BUNDLE` |
| **Write Containment** | Zero sheet rows modified during validation | Exact 0 cell writes | `dryRun: true` strictly enforced |

---

## 3. Isolated DB Round-Trip Verification (BAK-04)

In an isolated test harness (`tests/settings_diagnostics_backup_test.js`):
1. A valid 16-sheet backup bundle was captured from a live test database.
2. The target isolated database was populated with divergent temporary records.
3. `hrtRestoreFromBundle_` was executed with `targetEnvironment: 'ISOLATED_TEST_DB'`.
4. Post-restore verification proved:
   - **Row Counts:** All 16 sheets restored with exact row counts.
   - **Primary & Foreign Keys:** Master item codes, requisition references, and user references reconciled 100%.
   - **Stock Ledger Balance:** Stock ledger chronological entries (`LDG-001`) and item stock balances (`OFF-001`: 20) matched original state exactly.
   - **Audit Trail:** Tamper-evident hash chain preserved without corruption.
