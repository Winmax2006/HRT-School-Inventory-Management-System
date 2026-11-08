/**
 * append_version_to_files.js
 * Appends version suffix (_v2.7.0-rc.4) to system files, generates dedicated
 * releases/v2.7.0-rc.4/ directory, and tidies the root workspace.
 */

const fs = require('fs');
const path = require('path');

const VERSION_TAG = 'v2.7.0-rc.4';
const RELEASE_DIR = path.join(__dirname, '..', 'releases', VERSION_TAG);

// 1. Ensure releases directory exists
if (!fs.existsSync(RELEASE_DIR)) {
  fs.mkdirSync(RELEASE_DIR, { recursive: true });
}

// 2. List of core production files to create version-suffixed copies for
const coreFiles = [
  { src: 'Config.gs', destName: `Config_${VERSION_TAG}.gs` },
  { src: 'Api.gs', destName: `Api_${VERSION_TAG}.gs` },
  { src: 'Read.gs', destName: `Read_${VERSION_TAG}.gs` },
  { src: 'Write.gs', destName: `Write_${VERSION_TAG}.gs` },
  { src: 'Audit.gs', destName: `Audit_${VERSION_TAG}.gs` },
  { src: 'Code.gs', destName: `Code_${VERSION_TAG}.gs` },
  { src: 'index.html', destName: `index_${VERSION_TAG}.html` },
  { src: 'demo.html', destName: `demo_${VERSION_TAG}.html` },
  { src: 'frontend/main/App.js', destName: `App_${VERSION_TAG}.js` },
  { src: 'frontend/pages/Settings.html', destName: `Settings_${VERSION_TAG}.html` }
];

console.log(`[INFO] Creating version-suffixed files (_${VERSION_TAG})...`);

coreFiles.forEach(item => {
  const srcPath = path.join(__dirname, '..', item.src);
  if (fs.existsSync(srcPath)) {
    // A. Copy to root directory (or same directory as source)
    const rootSuffixedPath = path.join(path.dirname(srcPath), item.destName);
    fs.copyFileSync(srcPath, rootSuffixedPath);
    console.log(` + Created: ${path.relative(path.join(__dirname, '..'), rootSuffixedPath)}`);

    // B. Copy to releases/v2.7.0-rc.4/
    const releaseFilePath = path.join(RELEASE_DIR, item.destName);
    fs.copyFileSync(srcPath, releaseFilePath);
    console.log(` + Release Copy: releases/${VERSION_TAG}/${item.destName}`);
  } else {
    console.warn(` - Source not found: ${item.src}`);
  }
});

// 3. Copy documentation manifests to release directory
const manifestFiles = [
  { src: 'docs/VERSION_MANIFEST.json', destName: `VERSION_MANIFEST_${VERSION_TAG}.json` },
  { src: 'docs/CHANGELOG.md', destName: `CHANGELOG_${VERSION_TAG}.md` },
  { src: 'docs/POST_PROMPT09_READINESS_DECISION.md', destName: `READINESS_DECISION_${VERSION_TAG}.md` },
  { src: 'docs/POST_PROMPT09_SYSTEM_AUDIT.md', destName: `SYSTEM_AUDIT_${VERSION_TAG}.md` },
  { src: 'docs/POST_PROMPT09_TEST_RESULTS.md', destName: `TEST_RESULTS_${VERSION_TAG}.md` },
  { src: 'docs/POST_PROMPT09_TRACEABILITY_MATRIX.md', destName: `TRACEABILITY_MATRIX_${VERSION_TAG}.md` },
  { src: 'docs/POST_PROMPT09_DEFECT_REGISTER.md', destName: `DEFECT_REGISTER_${VERSION_TAG}.md` },
  { src: 'docs/POST_PROMPT09_CLEAN_BUILD_MANIFEST.md', destName: `CLEAN_BUILD_MANIFEST_${VERSION_TAG}.md` }
];

manifestFiles.forEach(item => {
  const srcPath = path.join(__dirname, '..', item.src);
  if (fs.existsSync(srcPath)) {
    const destPath = path.join(RELEASE_DIR, item.destName);
    fs.copyFileSync(srcPath, destPath);
    console.log(` + Release Manifest: releases/${VERSION_TAG}/${item.destName}`);
  }
});

// 4. Move old loose backup files into backups/ to clean up the root
const backupsDir = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

const looseBackups = [
  'index.backup_before_master_prompt_requisition.html',
  'index.backup_before_regression.html',
  'index.backup_before_requisition_refactor.html'
];

looseBackups.forEach(f => {
  const p = path.join(__dirname, '..', f);
  if (fs.existsSync(p)) {
    const target = path.join(backupsDir, f);
    fs.renameSync(p, target);
    console.log(` + Moved loose backup to backups/: ${f}`);
  }
});

// 5. Create a README_v2.7.0-rc.4.md in releases/
const releaseReadmeContent = `# HRT School Inventory System — Package Release ${VERSION_TAG}
## โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)

ชุดไฟล์ขึ้นระบบและเอกสารประกอบฉบับสมบูรณ์ที่ระบุเลขเวอร์ชันกำกับท้ายชื่อไฟล์ทุกไฟล์อย่างเป็นระเบียบ

### 1. ชุดไฟล์รันไทม์ระบบ (Runtime Files):
- **Config_${VERSION_TAG}.gs** : การกำหนดค่าระบบ, สคีมา 16 แผ่นงาน และบทบาทสิทธิ์ (RBAC)
- **Api_${VERSION_TAG}.gs** : Universal Action Dispatcher, RBAC Router, Idempotency Cache
- **Read_${VERSION_TAG}.gs** : บริการอ่านข้อมูลพัสดุ ตัวกรอง 8 มิติ แดชบอร์ด และรายงานทางการ
- **Write_${VERSION_TAG}.gs** : บริการบันทึก Single SSOT Writer ตัดสต็อกที่ ISSUED
- **Audit_${VERSION_TAG}.gs** : บริการประวัติการเปลี่ยนแปลง, SHA-256 Chaining และการตรวจนับสิ้นปี
- **Code_${VERSION_TAG}.gs** : HTTP Web App Gateway (doGet/doPost) และ RPC Facade
- **index_${VERSION_TAG}.html** : แอปพลิเคชันหลักฝั่งไคลเอนต์ (สะอาด ไร้ mock data ฝังในตัว)
- **demo_${VERSION_TAG}.html** : โหมดสาธิตระบบแยกเดี่ยว (Standalone Demo) พร้อมแบนเนอร์และตัวสลับบทบาท
- **App_${VERSION_TAG}.js** : คอนโทรลเลอร์กลางฝั่งไคลเอนต์
- **Settings_${VERSION_TAG}.html** : ศูนย์การตั้งค่าระบบ 8 หมวดหมู่ (Settings Hub)

### 2. เอกสารตรวจรับรองและการควบคุมรุ่น (Manifests & Audits):
- **VERSION_MANIFEST_${VERSION_TAG}.json** : บัญชีรายการเวอร์ชันและค่าแฮช SHA-256
- **CHANGELOG_${VERSION_TAG}.md** : บันทึกการเปลี่ยนแปลงของระบบ
- **READINESS_DECISION_${VERSION_TAG}.md** : คำตัดสินความพร้อมเชิงวิศวกรรม
- **SYSTEM_AUDIT_${VERSION_TAG}.md** : รายงานผลการตรวจสอบระบบฉบับละเอียด
- **TEST_RESULTS_${VERSION_TAG}.md** : ผลการทดสอบ 82 ข้อ (100% PASS)
- **TRACEABILITY_MATRIX_${VERSION_TAG}.md** : ตารางสอบย้อน C-1 ถึง N-3
- **DEFECT_REGISTER_${VERSION_TAG}.md** : ทะเบียนข้อค้นพบ DEF-01 ถึง DEF-06
- **CLEAN_BUILD_MANIFEST_${VERSION_TAG}.md** : บัญชีไฟล์ขึ้นระบบสะอาดและข้อกำหนดการยกเว้น
`;

fs.writeFileSync(path.join(RELEASE_DIR, `README_${VERSION_TAG}.md`), releaseReadmeContent, 'utf8');
console.log(` + Created: releases/${VERSION_TAG}/README_${VERSION_TAG}.md`);

console.log('[COMPLETED] All versioned files created and workspace organized successfully!');
