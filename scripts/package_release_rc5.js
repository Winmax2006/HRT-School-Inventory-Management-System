const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function getSha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

const rcDir = path.join(__dirname, '../releases/v2.7.0-rc.5');
if (!fs.existsSync(rcDir)) {
  fs.mkdirSync(rcDir, { recursive: true });
}

const fileMap = [
  { src: 'Code.gs', dst: 'Code_v2.7.0-rc.5.gs', rootDst: 'Code_v2.7.0-rc.5.gs' },
  { src: 'Api.gs', dst: 'Api_v2.7.0-rc.5.gs', rootDst: 'Api_v2.7.0-rc.5.gs' },
  { src: 'Read.gs', dst: 'Read_v2.7.0-rc.5.gs', rootDst: 'Read_v2.7.0-rc.5.gs' },
  { src: 'Write.gs', dst: 'Write_v2.7.0-rc.5.gs', rootDst: 'Write_v2.7.0-rc.5.gs' },
  { src: 'Audit.gs', dst: 'Audit_v2.7.0-rc.5.gs', rootDst: 'Audit_v2.7.0-rc.5.gs' },
  { src: 'Config.gs', dst: 'Config_v2.7.0-rc.5.gs', rootDst: 'Config_v2.7.0-rc.5.gs' },
  { src: 'index.html', dst: 'index_v2.7.0-rc.5.html', rootDst: 'index_v2.7.0-rc.5.html' },
  { src: 'MiniUI.html', dst: 'MiniUI_v2.7.0-rc.5.html', rootDst: 'MiniUI_v2.7.0-rc.5.html' },
  { src: 'frontend/main/App.js', dst: 'App_v2.7.0-rc.5.js', rootDst: null }
];

const manifestFiles = [];

fileMap.forEach(item => {
  const content = fs.readFileSync(item.src);
  const hash = getSha256(content);
  const size = content.length;

  // Copy to releases/v2.7.0-rc.5/
  fs.writeFileSync(path.join(rcDir, item.dst), content);

  // Copy to root versioned file if specified
  if (item.rootDst) {
    fs.writeFileSync(path.join(__dirname, '..', item.rootDst), content);
  }

  manifestFiles.push({
    file: item.dst,
    source: item.src,
    bytes: size,
    sha256: hash
  });

  console.log(`[PACKAGED] ${item.src} -> ${item.dst} (${size} bytes, sha256: ${hash.substring(0, 12)}...)`);
});

const manifest = {
  version: 'v2.7.0-rc.5',
  releaseDate: new Date().toISOString(),
  baseline: 'v2.6.0',
  predecessor: 'v2.7.0-rc.4',
  scope: 'HRT Inventory System - Auth, User Admin, MiniUI Integration, Zero Collision RPC & Fail-Closed Guards',
  files: manifestFiles
};

fs.writeFileSync(
  path.join(rcDir, 'VERSION_MANIFEST_v2.7.0-rc.5.json'),
  JSON.stringify(manifest, null, 2),
  'utf8'
);

console.log('[OK] releases/v2.7.0-rc.5/VERSION_MANIFEST_v2.7.0-rc.5.json updated');
