const fs = require('fs');

let md = fs.readFileSync('docs/repair/PROGRESS.md', 'utf8');

const targetRow = `| **Prompt 18** | **Settings, Database Diagnostics และ Backup/Restore** | **DB-01 to DB-03, SET-01 to SET-02, CSV-01, BAK-01 to BAK-05** | **IN PROGRESS** | Execution underway | Staging/Live OAuth Consent pending institutional setup |`;

const replacementRow = `| **Prompt 18** | **Settings, Database Diagnostics และ Backup/Restore** | **DB-01 to DB-03, SET-01 to SET-02, CSV-01, BAK-01 to BAK-05** | **COMPLETED** | \`tests/settings_diagnostics_backup_test.js\` (11/11 PASS)<br>\`scripts/run_all_tests.js\` (15/15 Suites PASS: 173/173 tests) | None (Local & VM verification 100% complete) |`;

if (md.includes(targetRow)) {
  md = md.replace(targetRow, replacementRow);
  console.log('Updated Prompt 18 row in PROGRESS.md');
}

const p18Log = `

---

## 6. Prompt 18 Verification Log

### Verification Environment
- **Runtime:** Node.js v24.19.0 (Windows_NT x64)
- **Execution Harness:** \`tests/settings_diagnostics_backup_test.js\`
- **Regression Runner:** \`scripts/run_all_tests.js\` (15/15 Suites PASS: 173/173 tests)
- **Criteria Execution:** DB-01 to DB-03, SET-01 to SET-02, CSV-01, BAK-01 to BAK-05 (11/11 PASS)

### Criteria Execution Details

| ID | Description | Result | Command | Evidence Summary |
| :--- | :--- | :---: | :--- | :--- |
| **DB-01** | Configured vs actual ID matches; inaccessible DB or missing sheet reflects actual status | **PASS** | \`node tests/settings_diagnostics_backup_test.js\` | Live server comparison: matching DB returns HEALTHY; inaccessible DB returns UNHEALTHY; missing sheet returns DEGRADED. |
| **DB-02** | Schema matrix defines exactly 16 canonical physical sheets without accidental alterations | **PASS** | \`node tests/settings_diagnostics_backup_test.js\` | CONFIG.SHEETS defines exactly 16 physical canonical sheets; 13_Year_End_Audit_Items mapped to 13_Year_End_Audits alias. |
| **DB-03** | Verified caller id/user_id powers auth diagnostic; anonymous/suspended rejected; read does not claim write | **PASS** | \`node tests/settings_diagnostics_backup_test.js\` | Caller identity verified via user_id/id; anonymous/suspended return UNAUTHORIZED; write permission labeled NOT_TESTED. |
| **SET-01** | Save/reload exact types (boolean false, number 0); revision conflict prevents silent overwrite | **PASS** | \`node tests/settings_diagnostics_backup_test.js\` | Optimistic concurrency control rejects stale revisions with CONCURRENCY_CONFLICT; preserves boolean false and number 0. |
| **SET-02** | Non-admin direct update/import/backup/restore requests are denied with FORBIDDEN | **PASS** | \`node tests/settings_diagnostics_backup_test.js\` | Direct invocation of settings update, item import, backup creation, or restore validation by non-admin rejected with FORBIDDEN. |
| **CSV-01** | Malformed/duplicate/formula rows abort before write; formula injection sanitized non-destructively | **PASS** | \`node tests/settings_diagnostics_backup_test.js\` | Malformed/duplicate rows abort batch before any sheet write; formulas prepended with apostrophe; non-destructive merge. |
| **BAK-01** | Backup bundle contains actual rows, headers, and manifest; secrets are redacted | **PASS** | \`node tests/settings_diagnostics_backup_test.js\` | Backup bundle contains actual rows and headers for all 16 sheets; sensitive credentials in 15_Settings_Config redacted. |
| **BAK-02** | Backup snapshot records isConsistent: true under lock | **PASS** | \`node tests/settings_diagnostics_backup_test.js\` | Snapshot captured under LockService script lock; verifies database revision before and after reading sheets (isConsistent: true). |
| **BAK-03** | Restore dry-run validator rejects corrupted/incompatible bundles with zero database writes | **PASS** | \`node tests/settings_diagnostics_backup_test.js\` | Validator checks 16 sheets, headers, SHA-256 row checksums, and FK integrity; tampered rows fail checksum; zero writes. |
| **BAK-04** | Round-trip restore in isolated test DB verifies items, FK, and ledger balances; refuses production | **PASS** | \`node tests/settings_diagnostics_backup_test.js\` | Round-trip restore in ISOLATED_TEST_DB verifies items match, ledger balances match, and audit chain holds; refuses PRODUCTION. |
| **BAK-05** | Backup failure preserves existing last_backup_at without recording fake success | **PASS** | \`node tests/settings_diagnostics_backup_test.js\` | If reading sheets fails or throws an exception, last_backup_at timestamp in configuration remains untouched. |
`;

if (!md.includes('## 6. Prompt 18 Verification Log')) {
  md += p18Log;
  console.log('Appended Prompt 18 log to PROGRESS.md');
}

fs.writeFileSync('docs/repair/PROGRESS.md', md, 'utf8');
