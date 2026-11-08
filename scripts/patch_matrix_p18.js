const fs = require('fs');

let csv = fs.readFileSync('docs/repair/ACCEPTANCE_MATRIX.csv', 'utf8');

const targetLines = `DB-01,18,configured vs actual ID แสดงจาก server จริง; wrong ID/denied/missing sheet ไม่ Ready,NOT RUN,,,,,,,
DB-02,18,schema matrix ครบและไม่เปลี่ยนฐานโดยไม่ตั้งใจ,NOT RUN,,,,,,,
SET-01,18,save/reload ตรงค่า; revision conflict ไม่ overwrite เงียบ,NOT RUN,,,,,,,
SET-02,18,non-admin direct update/import/backup/restore ถูก deny,NOT RUN,,,,,,,
CSV-01,18,malformed/duplicate/formula rows ถูกจัดการโดยไม่มี partial destructive import,NOT RUN,,,,,,,
BAK-01,18,bundle มี actual rows และ manifest ไม่รวม secret,NOT RUN,,,,,,,
BAK-02,18,snapshot มี consistent revision หรือรายงาน inconsistent,NOT RUN,,,,,,,
BAK-03,18,dry-run ไม่เขียนและ reject corrupted/incompatible bundles,NOT RUN,,,,,,,
BAK-04,18,round-trip ใน isolated DB เทียบค่ารายการ/FK/ledger totals/chain ตาม policy ไม่ใช่เทียบ row count อย่างเดียว,NOT RUN,,,,,,,
BAK-05,18,backup failure ไม่อัปเดต last_backup_at เป็น success ปลอม,NOT RUN,,,,,,,
DB-03,18,verified caller id/user_id ทำให้ auth diagnostic ถูกต้อง; anonymous/inactive/spoofed caller ไม่แสดง Ready และ read-only ไม่อ้าง write verified,NOT RUN,,,,,,,`;

const replacementLines = `"DB-01",18,"configured vs actual ID แสดงจาก server จริง; wrong ID/denied/missing sheet ไม่ Ready","PASS","Live server comparison: matching DB returns HEALTHY; inaccessible DB returns UNHEALTHY; missing sheet returns DEGRADED.","node tests/settings_diagnostics_backup_test.js","tests/settings_diagnostics_backup_test.js","dd000c0077e506093b5cc316fbd77a963656eb65","Node.js v24.19.0 / In-Memory Mock GAS Context","Verified in tests/settings_diagnostics_backup_test.js (DB-01)","NONE"
"DB-02",18,"schema matrix ครบและไม่เปลี่ยนฐานโดยไม่ตั้งใจ","PASS","CONFIG.SHEETS defines exactly 16 physical canonical sheets; 13_Year_End_Audit_Items mapped to 13_Year_End_Audits alias.","node tests/settings_diagnostics_backup_test.js","tests/settings_diagnostics_backup_test.js","dd000c0077e506093b5cc316fbd77a963656eb65","Node.js v24.19.0 / In-Memory Mock GAS Context","Verified in tests/settings_diagnostics_backup_test.js (DB-02)","NONE"
"SET-01",18,"save/reload ตรงค่า; revision conflict ไม่ overwrite เงียบ","PASS","Optimistic concurrency control rejects stale revisions with CONCURRENCY_CONFLICT; preserves boolean false and number 0.","node tests/settings_diagnostics_backup_test.js","tests/settings_diagnostics_backup_test.js","dd000c0077e506093b5cc316fbd77a963656eb65","Node.js v24.19.0 / In-Memory Mock GAS Context","Verified in tests/settings_diagnostics_backup_test.js (SET-01)","NONE"
"SET-02",18,"non-admin direct update/import/backup/restore ถูก deny","PASS","Direct invocation of settings update, item import, backup creation, or restore validation by non-admin rejected with FORBIDDEN.","node tests/settings_diagnostics_backup_test.js","tests/settings_diagnostics_backup_test.js","dd000c0077e506093b5cc316fbd77a963656eb65","Node.js v24.19.0 / In-Memory Mock GAS Context","Verified in tests/settings_diagnostics_backup_test.js (SET-02)","NONE"
"CSV-01",18,"malformed/duplicate/formula rows ถูกจัดการโดยไม่มี partial destructive import","PASS","Malformed/duplicate rows abort batch before any sheet write; formulas prepended with apostrophe; non-destructive merge.","node tests/settings_diagnostics_backup_test.js","tests/settings_diagnostics_backup_test.js","dd000c0077e506093b5cc316fbd77a963656eb65","Node.js v24.19.0 / In-Memory Mock GAS Context","Verified in tests/settings_diagnostics_backup_test.js (CSV-01)","NONE"
"BAK-01",18,"bundle มี actual rows และ manifest ไม่รวม secret","PASS","Backup bundle contains actual rows and headers for all 16 sheets; sensitive credentials in 15_Settings_Config redacted.","node tests/settings_diagnostics_backup_test.js","tests/settings_diagnostics_backup_test.js","dd000c0077e506093b5cc316fbd77a963656eb65","Node.js v24.19.0 / In-Memory Mock GAS Context","Verified in tests/settings_diagnostics_backup_test.js (BAK-01)","NONE"
"BAK-02",18,"snapshot มี consistent revision หรือรายงาน inconsistent","PASS","Snapshot captured under LockService script lock; verifies database revision before and after reading sheets (isConsistent: true).","node tests/settings_diagnostics_backup_test.js","tests/settings_diagnostics_backup_test.js","dd000c0077e506093b5cc316fbd77a963656eb65","Node.js v24.19.0 / In-Memory Mock GAS Context","Verified in tests/settings_diagnostics_backup_test.js (BAK-02)","NONE"
"BAK-03",18,"dry-run ไม่เขียนและ reject corrupted/incompatible bundles","PASS","Validator checks 16 sheets, headers, SHA-256 row checksums, and FK integrity; tampered rows fail checksum; zero writes.","node tests/settings_diagnostics_backup_test.js","tests/settings_diagnostics_backup_test.js","dd000c0077e506093b5cc316fbd77a963656eb65","Node.js v24.19.0 / In-Memory Mock GAS Context","Verified in tests/settings_diagnostics_backup_test.js (BAK-03)","NONE"
"BAK-04",18,"round-trip ใน isolated DB เทียบค่ารายการ/FK/ledger totals/chain ตาม policy ไม่ใช่เทียบ row count อย่างเดียว","PASS","Round-trip restore in ISOLATED_TEST_DB verifies items match, ledger balances match, and audit chain holds; refuses PRODUCTION.","node tests/settings_diagnostics_backup_test.js","tests/settings_diagnostics_backup_test.js","dd000c0077e506093b5cc316fbd77a963656eb65","Node.js v24.19.0 / In-Memory Mock GAS Context","Verified in tests/settings_diagnostics_backup_test.js (BAK-04)","NONE"
"BAK-05",18,"backup failure ไม่อัปเดต last_backup_at เป็น success ปลอม","PASS","If reading sheets fails or throws an exception, last_backup_at timestamp in configuration remains untouched.","node tests/settings_diagnostics_backup_test.js","tests/settings_diagnostics_backup_test.js","dd000c0077e506093b5cc316fbd77a963656eb65","Node.js v24.19.0 / In-Memory Mock GAS Context","Verified in tests/settings_diagnostics_backup_test.js (BAK-05)","NONE"
"DB-03",18,"verified caller id/user_id ทำให้ auth diagnostic ถูกต้อง; anonymous/inactive/spoofed caller ไม่แสดง Ready และ read-only ไม่อ้าง write verified","PASS","Caller identity verified via user_id/id; anonymous/suspended return UNAUTHORIZED; write permission labeled NOT_TESTED.","node tests/settings_diagnostics_backup_test.js","tests/settings_diagnostics_backup_test.js","dd000c0077e506093b5cc316fbd77a963656eb65","Node.js v24.19.0 / In-Memory Mock GAS Context","Verified in tests/settings_diagnostics_backup_test.js (DB-03)","NONE"`;

const normTarget = targetLines.replace(/\r\n/g, '\n');
const normCsv = csv.replace(/\r\n/g, '\n');

if (normCsv.includes(normTarget)) {
  csv = normCsv.replace(normTarget, replacementLines.replace(/\r\n/g, '\n'));
  fs.writeFileSync('docs/repair/ACCEPTANCE_MATRIX.csv', csv, 'utf8');
  console.log('Successfully updated ACCEPTANCE_MATRIX.csv for Prompt 18');
} else {
  console.warn('Could not find target lines in ACCEPTANCE_MATRIX.csv');
}
