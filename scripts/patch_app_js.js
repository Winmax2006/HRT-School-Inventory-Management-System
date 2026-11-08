const fs = require('fs');
let content = fs.readFileSync('frontend/main/App.js', 'utf8');

// Replace resolveQr block
const target1 = `        if (window.ReadApi && typeof window.ReadApi.resolveQr === 'function') {
            window.ReadApi.resolveQr({ qr_token: qrToken })
                .then(handleQrResult)
                .catch(err => window.showToast(\`ไม่สามารถประมวลผล QR Code: \${err.message}\`, 'error'));
        } else if (typeof google !== 'undefined' && google.script && google.script.run) {
            google.script.run
                .withSuccessHandler(handleQrResult)
                .withFailureHandler(err => window.showToast(\`ไม่สามารถประมวลผล QR Code: \${err.message}\`, 'error'))
                .apiResolveQr({ qr_token: qrToken });
        }`;

const repl1 = `        if (window.ApiService && typeof window.ApiService.call === 'function') {
            window.ApiService.call('apiResolveQr', { qr_token: qrToken })
                .then(handleQrResult)
                .catch(err => window.showToast(\`ไม่สามารถประมวลผล QR Code: \${err.message}\`, 'error'));
        } else if (window.ReadApi && typeof window.ReadApi.resolveQr === 'function') {
            window.ReadApi.resolveQr({ qr_token: qrToken })
                .then(handleQrResult)
                .catch(err => window.showToast(\`ไม่สามารถประมวลผล QR Code: \${err.message}\`, 'error'));
        }`;

// Replace idempotency check block
const target2 = `        if (typeof google !== 'undefined' && google.script && google.script.run) {
            google.script.run
                .withSuccessHandler(res => {
                    if (res && res.committed) {
                        window.miniCart = [];
                        window.updateMiniCartBadge();
                        window.showToast(\`คำขอเลขที่ \${res.response.req_no} ได้รับการบันทึกแล้ว (สถานะ: \${res.response.status})\`, 'success');
                        window.switchMiniTab('myRequests');
                    } else {
                        window.showToast('ไม่พบรายการคำขอเดิมในระบบ สามารถกดยืนยันส่งใหม่ได้', 'info');
                    }
                })
                .withFailureHandler(err => window.showToast(err.message, 'error'))
                .apiCheckIdempotency({ idempotency_key: idempKey });
        }`;

const repl2 = `        if (window.ApiService && typeof window.ApiService.call === 'function') {
            window.ApiService.call('apiCheckIdempotency', { idempotency_key: idempKey })
                .then(res => {
                    if (res && res.committed) {
                        window.miniCart = [];
                        window.updateMiniCartBadge();
                        window.showToast(\`คำขอเลขที่ \${res.response.req_no} ได้รับการบันทึกแล้ว (สถานะ: \${res.response.status})\`, 'success');
                        window.switchMiniTab('myRequests');
                    } else {
                        window.showToast('ไม่พบรายการคำขอเดิมในระบบ สามารถกดยืนยันส่งใหม่ได้', 'info');
                    }
                })
                .catch(err => window.showToast(err.message, 'error'));
        }`;

const normalized = content.replace(/\r\n/g, '\n');
if (normalized.includes(target1) && normalized.includes(target2)) {
  let updated = normalized.replace(target1, repl1).replace(target2, repl2);
  fs.writeFileSync('frontend/main/App.js', updated, 'utf8');
  console.log('App.js patched successfully!');
} else {
  console.log('Targets not found in App.js');
}
