# HRT Inventory System — System Backup Archive Specification
**Document Version:** v1.1  
**Target Release Pipeline:** `v2.7.0-rc.5` $\rightarrow$ Candidate `v2.7.0-rc.6`  
**Execution Context:** `Write.gs:hrtBackupFull_` / `Read.gs:hrtValidateRestore_`  
**Organization:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)  

---

## 1. Overview & Security Policy

The Full System Backup mechanism creates a complete, point-in-time snapshot of the HRT Inventory System database.

### Core Safeguards:
1. **Actual Data Capture (BAK-01):** The archive contains both table headers and all actual physical rows across all 16 canonical sheets, not just row count metadata.
2. **Snapshot Consistency under ScriptLock (BAK-02):** The entire snapshot is acquired under `LockService.getScriptLock(CONFIG.WRITE_LOCK_TIMEOUT_MS)`. The database revision (`settings_revision_id`) is verified before and after reading all sheets to ensure zero concurrent mutations occurred during the capture.
3. **Sensitive Secret & Credential Redaction (BAK-01):**
   - In `15_Settings_Config`: sensitive configuration keys (including `GOOGLE_CLIENT_ID`, client secrets, private keys, API tokens, and passwords) are scrubbed and replaced with `'[REDACTED_SECRET]'`.
   - In `01_Users`: access-controlled personnel records are preserved for restore integrity, but auth tokens and password hashes are excluded.
4. **No Fake Success Updates (BAK-05):** If an error occurs or reading any sheet fails, the backup aborts immediately. `setConfig_('last_backup_at', ...)` is updated **only** upon 100% complete and verified bundle creation.
5. **Staging Restore Policy:** All backup artifacts carry `policy: 'STAGING_RESTORE_ONLY'` to strictly prohibit accidental restoration over production school databases.

---

## 2. Backup Bundle JSON Schema

```json
{
  "manifest": {
    "bundleId": "BAK-1730200000000-1234",
    "bundleVersion": "2.7.0-rc.5",
    "schemaVersion": "1.0",
    "createdAt": "2026-10-29T19:45:00.000Z",
    "fiscalYear": "2569",
    "schoolName": "โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)",
    "organization": "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาสระบุรี เขต 1",
    "databaseId": "1Bxi...4xyz",
    "databaseRevision": "rev_1730198000000",
    "isConsistent": true,
    "sheetCount": 16,
    "totalRowCount": 1542,
    "secretsExcluded": true,
    "policy": "STAGING_RESTORE_ONLY"
  },
  "sheets": {
    "01_Users": {
      "rowCount": 24,
      "columnCount": 7,
      "headers": ["user_id", "username", "name", "email", "role", "department", "status"],
      "rows": [
        ["USR-001", "admin@hrt.ac.th", "นายสมศักดิ์ รุ่งเรือง", "admin@hrt.ac.th", "ADMIN", "กลุ่มบริหารงานงบประมาณ", "ACTIVE"]
      ],
      "checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    },
    "02_Departments": { ... },
    "03_Master_Items": {
      "rowCount": 450,
      "columnCount": 12,
      "headers": ["code", "fsn_code", "name", "category", "unit", "warehouse", "unit_cost", "min", "rop", "stock", "supplier", "status"],
      "rows": [ ... ],
      "checksum": "a1b2c3d4..."
    },
    "04_Categories": { ... },
    "05_Warehouses": { ... },
    "06_FSN_Catalog": { ... },
    "07_Requisitions": { ... },
    "08_Requisition_Items": { ... },
    "09_Stock_Transactions": { ... },
    "10_Stock_Ledger": { ... },
    "11_Audit_Trail": { ... },
    "12_Fiscal_Years": { ... },
    "13_Year_End_Audits": { ... },
    "14_Disposal_Records": { ... },
    "15_Settings_Config": {
      "rowCount": 18,
      "columnCount": 4,
      "headers": ["key", "value", "description", "updated_at"],
      "rows": [
        ["school_name", "โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)", "School Name", "2026-10-01T00:00:00Z"],
        ["GOOGLE_CLIENT_ID", "[REDACTED_SECRET]", "Sensitive OAuth Client ID", "2026-10-01T00:00:00Z"]
      ],
      "checksum": "f5e4d3..."
    },
    "16_Idempotency_Log": { ... }
  }
}
```

---

## 3. Cryptographic Checksums & Integrity Verification

Each sheet entry in `sheets` computes an independent SHA-256 digest:
$$\text{checksum} = \text{SHA-256}(\text{JSON.stringify}(\text{rows}))$$
During dry-run restore validation (`hrtValidateRestore_`), the server recomputes the SHA-256 digest over the rows. Any tampering or corrupted transmission triggers `CHECKSUM_MISMATCH` and causes validation to fail immediately.
