/**
 * scripts/build_release_packages.js
 * Builds Candidate Release Packages (v2.7.0-rc.6)
 * Generates FILE_DISPOSITION.csv, VERSION_MANIFEST.json, FILES.sha256,
 * and creates Runtime.zip and Handover.zip with external verification.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const VERSION = 'v2.7.0-rc.6';
const RUNTIME_ZIP = `HRT_Inventory_${VERSION}_Runtime.zip`;
const HANDOVER_ZIP = `HRT_Inventory_${VERSION}_Handover.zip`;

console.log(`[BUILD] Starting Release Packaging for ${VERSION}...`);

function getSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// 1. Define Runtime Allowlist
const RUNTIME_ALLOWLIST = [
  'Config.gs',
  'Api.gs',
  'Read.gs',
  'Write.gs',
  'Audit.gs',
  'Code.gs',
  'index.html',
  'MiniUI.html',
  'appsscript.json'
];

// 2. Discover all project files
function walkDir(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');

    // Skip git, node_modules, temp verify dirs, and generated zip files
    if (relPath.startsWith('.git') || relPath.startsWith('.gemini') || 
        relPath.startsWith('tmp_verify_release') || 
        relPath.endsWith('.zip')) {
      continue;
    }

    if (entry.isDirectory()) {
      walkDir(fullPath, fileList);
    } else {
      fileList.push(relPath);
    }
  }
  return fileList;
}

const allFiles = walkDir(ROOT_DIR);
console.log(`[SCAN] Discovered ${allFiles.length} files in workspace.`);

// 3. Classify Files for FILE_DISPOSITION.csv
const dispositionRows = [
  ['file_path', 'disposition', 'target_bundle', 'category', 'sha256', 'justification']
];

const handoverFiles = [];

allFiles.forEach(relPath => {
  let disposition = 'exclude';
  let targetBundle = 'none';
  let category = 'other';
  let justification = '';

  const isRuntime = RUNTIME_ALLOWLIST.includes(relPath);

  if (isRuntime) {
    disposition = 'keep';
    targetBundle = 'runtime+handover';
    category = 'runtime_core';
    justification = 'Canonical production runtime asset in allowlist';
  } else if (relPath.startsWith('tests/')) {
    disposition = 'test';
    targetBundle = 'handover';
    category = 'automated_tests';
    justification = 'Automated verification test suite and test fixtures';
  } else if (relPath.startsWith('scripts/')) {
    disposition = 'keep';
    targetBundle = 'handover';
    category = 'build_tooling';
    justification = 'Build, audit, and release automation scripts';
  } else if (relPath.startsWith('docs/')) {
    disposition = 'keep';
    targetBundle = 'handover';
    category = 'documentation';
    justification = 'Architecture documentation, specifications, and repair reports';
  } else if (relPath.startsWith('frontend/')) {
    disposition = 'keep';
    targetBundle = 'handover';
    category = 'frontend_source';
    justification = 'Clean modular frontend source code and component modules';
  } else if (relPath.startsWith('backend/')) {
    disposition = 'keep';
    targetBundle = 'handover';
    category = 'backend_source';
    justification = 'Clean modular backend source code and services';
  } else if (relPath === 'README.md' || relPath === 'Implementation_Brief_Google_Antigravity.md' || 
             relPath === 'baseline_report.md' || relPath === 'Master_Items.csv' || 
             relPath === 'Transactions.csv' || relPath === 'generate_inventory.py' || relPath === '.gitignore') {
    disposition = 'keep';
    targetBundle = 'handover';
    category = 'handover_root';
    justification = 'Project documentation, initial seed data, and configuration';
  } else if (relPath.startsWith('releases/') || relPath.includes('_rc.') || relPath.includes('_v2.7.0') || 
             relPath.includes('School_Inventory_DB_2567_AppsScript.js')) {
    disposition = 'legacy';
    targetBundle = 'none';
    category = 'historical_archive';
    justification = 'Legacy version checkpoints preserved for historical audit';
  } else if (relPath.endsWith('.rar') || relPath.startsWith('scratch/') || relPath.startsWith('backups/') || 
             relPath.startsWith('student_care_system/') || relPath === 'test.txt' || relPath === 'baseline.txt') {
    disposition = 'exclude';
    targetBundle = 'none';
    category = 'scratch_or_backup';
    justification = 'Temporary scratch files, external rar archives, or local backups';
  } else {
    disposition = 'exclude';
    targetBundle = 'none';
    category = 'untracked_or_auxiliary';
    justification = 'Auxiliary file excluded from canonical release';
  }

  let hash = '';
  try {
    hash = getSha256(path.join(ROOT_DIR, relPath));
  } catch (e) {
    hash = 'ERROR_HASHING';
  }

  dispositionRows.push([
    relPath,
    disposition,
    targetBundle,
    category,
    hash,
    justification
  ]);

  if (targetBundle.includes('handover') || targetBundle.includes('runtime')) {
    handoverFiles.push(relPath);
  }
});

// Write docs/repair/FILE_DISPOSITION.csv
const csvContent = dispositionRows.map(row => 
  row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
).join('\n');

const dispCsvPath = path.join(ROOT_DIR, 'docs', 'repair', 'FILE_DISPOSITION.csv');
fs.writeFileSync(dispCsvPath, csvContent, 'utf8');
console.log(`[DISPOSITION] Generated ${dispCsvPath} (${dispositionRows.length - 1} entries).`);

// 4. Generate VERSION_MANIFEST.json
const runtimeManifestFiles = RUNTIME_ALLOWLIST.map(file => {
  const fullPath = path.join(ROOT_DIR, file);
  const stat = fs.statSync(fullPath);
  return {
    file: file,
    bytes: stat.size,
    sha256: getSha256(fullPath),
    target: 'runtime_allowlist'
  };
});

const versionManifest = {
  version: VERSION,
  releaseDate: new Date().toISOString(),
  baseline: 'v2.7.0-rc.5',
  targetCandidate: VERSION,
  status: 'CANDIDATE_RELEASE_CONSOLIDATED',
  scope: 'HRT Inventory System - Prompts 13-20 Release Consolidation, MiniUI Responsive QR, ACID Ledger & Audit Verification',
  runtimeAllowlistCount: RUNTIME_ALLOWLIST.length,
  runtimeFiles: runtimeManifestFiles
};

const manifestPath = path.join(ROOT_DIR, 'VERSION_MANIFEST.json');
fs.writeFileSync(manifestPath, JSON.stringify(versionManifest, null, 2), 'utf8');
console.log(`[MANIFEST] Generated ${manifestPath}`);

// 5. Generate FILES.sha256 (Excludes FILES.sha256 itself to prevent self-reference)
const sha256Lines = [];
handoverFiles.forEach(file => {
  if (file === 'FILES.sha256') return;
  const fullPath = path.join(ROOT_DIR, file);
  if (fs.existsSync(fullPath)) {
    const hash = getSha256(fullPath);
    sha256Lines.push(`${hash}  ${file}`);
  }
});
// Add VERSION_MANIFEST.json explicitly
sha256Lines.push(`${getSha256(manifestPath)}  VERSION_MANIFEST.json`);

const filesSha256Path = path.join(ROOT_DIR, 'FILES.sha256');
fs.writeFileSync(filesSha256Path, sha256Lines.sort().join('\n') + '\n', 'utf8');
console.log(`[CHECKSUM] Generated ${filesSha256Path} (${sha256Lines.length} files).`);

function createZip(zipName, fileArgs) {
  try {
    execSync(`tar -acf "${zipName}" ${fileArgs}`, { cwd: ROOT_DIR });
  } catch (e1) {
    try {
      execSync(`zip -r -q "${zipName}" ${fileArgs}`, { cwd: ROOT_DIR });
    } catch (e2) {
      throw new Error(`Failed to create ${zipName}: ${e1.message} / ${e2.message}`);
    }
  }
}

function extractZip(zipPath, destDir) {
  try {
    execSync(`tar -xf "${zipPath}" -C "${destDir}"`);
  } catch (e1) {
    try {
      execSync(`unzip -q -o "${zipPath}" -d "${destDir}"`);
    } catch (e2) {
      throw new Error(`Failed to extract ${zipPath}: ${e1.message} / ${e2.message}`);
    }
  }
}

// 6. Build HRT_Inventory_v2.7.0-rc.6_Runtime.zip
console.log(`[ZIP] Packaging ${RUNTIME_ZIP}...`);
const runtimeZipPath = path.join(ROOT_DIR, RUNTIME_ZIP);
if (fs.existsSync(runtimeZipPath)) fs.unlinkSync(runtimeZipPath);

const runtimeArgs = RUNTIME_ALLOWLIST.map(f => `"${f}"`).join(' ');
createZip(RUNTIME_ZIP, runtimeArgs);
console.log(`[ZIP] Created ${RUNTIME_ZIP} (${fs.statSync(runtimeZipPath).size} bytes).`);

// 7. Build HRT_Inventory_v2.7.0-rc.6_Handover.zip
console.log(`[ZIP] Packaging ${HANDOVER_ZIP}...`);
const handoverZipPath = path.join(ROOT_DIR, HANDOVER_ZIP);
if (fs.existsSync(handoverZipPath)) fs.unlinkSync(handoverZipPath);

// Handover bundle folders and key root files
const handoverEntries = [
  ...RUNTIME_ALLOWLIST,
  'VERSION_MANIFEST.json',
  'FILES.sha256',
  'README.md',
  'Implementation_Brief_Google_Antigravity.md',
  'Master_Items.csv',
  'Transactions.csv',
  'generate_inventory.py',
  'frontend',
  'backend',
  'docs',
  'scripts',
  'tests'
];

const handoverArgs = handoverEntries
  .filter(e => fs.existsSync(path.join(ROOT_DIR, e)))
  .map(e => `"${e}"`)
  .join(' ');
createZip(HANDOVER_ZIP, handoverArgs);
console.log(`[ZIP] Created ${HANDOVER_ZIP} (${fs.statSync(handoverZipPath).size} bytes).`);

// 8. Compute External Checksums for Archives
const runtimeZipHash = getSha256(runtimeZipPath);
const handoverZipHash = getSha256(handoverZipPath);

const archiveChecksumReport = `HRT Inventory Release Packages Checksums (${VERSION})
Created: ${new Date().toISOString()}

${runtimeZipHash}  ${RUNTIME_ZIP} (${fs.statSync(runtimeZipPath).size} bytes)
${handoverZipHash}  ${HANDOVER_ZIP} (${fs.statSync(handoverZipPath).size} bytes)
`;

const checksumFilePath = path.join(ROOT_DIR, 'ARCHIVE_CHECKSUMS.txt');
fs.writeFileSync(checksumFilePath, archiveChecksumReport, 'utf8');
console.log(`[CHECKSUM] Generated ${checksumFilePath}:\n${archiveChecksumReport}`);

// 9. Automated Clean Extraction & Integrity Verification
console.log(`[VERIFY] Verifying extraction of ${RUNTIME_ZIP}...`);
const tempVerifyDir = path.join(ROOT_DIR, 'tmp_verify_release');
if (fs.existsSync(tempVerifyDir)) fs.rmSync(tempVerifyDir, { recursive: true, force: true });
fs.mkdirSync(tempVerifyDir, { recursive: true });

extractZip(runtimeZipPath, tempVerifyDir);

RUNTIME_ALLOWLIST.forEach(file => {
  const extractedPath = path.join(tempVerifyDir, file);
  if (!fs.existsSync(extractedPath)) {
    throw new Error(`Verification failed: ${file} not found in extracted runtime zip`);
  }
  const extractedHash = getSha256(extractedPath);
  const originalHash = getSha256(path.join(ROOT_DIR, file));
  if (extractedHash !== originalHash) {
    throw new Error(`Hash mismatch for ${file} in extracted runtime zip!`);
  }
});

console.log(`[VERIFY] Runtime extraction verified 100% (All ${RUNTIME_ALLOWLIST.length} files match exact hashes)!`);
fs.rmSync(tempVerifyDir, { recursive: true, force: true });
console.log(`[BUILD] Release build completed successfully.`);
