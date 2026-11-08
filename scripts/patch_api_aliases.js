const fs = require('fs');

let content = fs.readFileSync('Api.gs', 'utf8');

const marker = '    const normalized = Object.assign({}, payload || {});';
const qrAliases = `    const normalized = Object.assign({}, payload || {});

    // QR Token Aliases
    if (normalized.hasOwnProperty('qr_data') && !normalized.hasOwnProperty('qr_token')) {
      normalized.qr_token = normalized.qr_data;
    }
    if (normalized.hasOwnProperty('qrData') && !normalized.hasOwnProperty('qr_token')) {
      normalized.qr_token = normalized.qrData;
    }`;

if (content.includes(marker)) {
  content = content.replace(marker, qrAliases);
  fs.writeFileSync('Api.gs', content, 'utf8');
  new Function(content);
  console.log('[OK] Added QR alias normalization in Api.gs');
} else {
  console.warn('[WARN] Marker not found in Api.gs');
}
