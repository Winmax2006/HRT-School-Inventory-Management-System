const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const targetJsBlock = `    window.testDatabaseConnection = async function() {
        const diag = document.getElementById('setConn_diagOutput');
        if (diag) {
            diag.innerText = 'กำลังตรวจสอบการเชื่อมต่อ Google Sheets DB และ Schema ทั้ง 16 ชีต...';
        }

        try {
            if (window.ApiService && typeof window.ApiService.call === 'function') {
                const res = await window.ApiService.call('apiCheckHealth');
                if (diag) {
                    diag.innerText = [
                        '=== HEALTH CHECK & SCHEMA DIAGNOSTIC REPORT ===',
                        \`สถานะภาพรวม: \${res.status || 'HEALTHY'}\`,
                        \`ชีตที่ตรวจสอบทั้งหมด: 16/16 ชีตสมบูรณ์ (OK)\`,
                        \`Active Fiscal Year: พ.ศ. \${res.activeFiscalYear || 2569}\`,
                        \`Database Connection: Google Apps Script Web App (Staging Local Engine)\`,
                        \`Latency: ~45ms\`,
                        \`Write Permissions: GRANTED (Admin / Officer Roles Active)\`
                    ].join('\\n');
                }
            } else {
                if (diag) {
                    diag.innerText = [
                        '=== HEALTH CHECK (LOCAL STANDALONE ENGINE) ===',
                        'Google Sheets DB: Connected (Virtual Schema Active)',
                        'All 16 Canonical Sheets: VERIFIED',
                        'Active Fiscal Year: 2569',
                        'Write Guards: FAIL-CLOSED MUTEX ACTIVE'
                    ].join('\\n');
                }
            }
            if (typeof window.showToast === 'function') window.showToast('ตรวจสอบฐานข้อมูลเรียบร้อย: ปกติทุกส่วน', 'success');
        } catch(e) {
            if (diag) diag.innerText = \`การตรวจสอบล้มเหลว: \${e.message}\`;
        }
    };

    window.triggerFullBackup = function() {
        const confirmed = confirm('ต้องการสร้างจุดสำรองข้อมูลฉุกเฉิน (Full System Backup Archive) ตอนนี้หรือไม่?');
        if (!confirmed) return;

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupId = \`BAK-HRT-\${timestamp}\`;

        alert(\`สร้างจุดสำรองข้อมูลเรียบร้อยแล้ว: \${backupId}\\nรวมชีตข้อมูล: 16 ชีต\\nบันทึกรายการ Audit Trail: สำเร็จ\`);
        if (typeof window.showToast === 'function') window.showToast(\`สร้างไฟล์สำรอง \${backupId} สำเร็จ\`, 'success');
    };`;

const replacementJsBlock = `    window.testDatabaseConnection = async function() {
        const diag = document.getElementById('setConn_diagOutput');
        if (diag) {
            diag.classList.remove('hidden');
            diag.innerText = 'กำลังตรวจสอบการเชื่อมต่อ Google Sheets DB และ Schema ทั้ง 16 ชีตจาก Server...';
        }

        const tStart = Date.now();
        try {
            if (window.ApiService && typeof window.ApiService.call === 'function') {
                const res = await window.ApiService.call('apiCheckHealth');
                const tElapsed = Date.now() - tStart;

                const isHealthy = res.status === 'HEALTHY';
                const isDegraded = res.status === 'DEGRADED';
                const checks = res.checks || {};

                // Update UI badges with actual server state
                const elMaskedId = document.getElementById('setConn_maskedId');
                if (elMaskedId) elMaskedId.innerText = res.spreadsheetIdMasked || '-';

                const elReadDot = document.getElementById('setConn_readDot');
                const elReadText = document.getElementById('setConn_readText');
                if (elReadText && elReadDot) {
                    if (checks.read) {
                        elReadDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
                        elReadText.innerText = 'พร้อมใช้งาน (Connected)';
                        elReadText.className = 'font-bold text-emerald-600';
                    } else {
                        elReadDot.className = 'w-2 h-2 rounded-full bg-rose-500';
                        elReadText.innerText = 'ไม่สามารถอ่านได้ (Error)';
                        elReadText.className = 'font-bold text-rose-600';
                    }
                }

                const elSchema = document.getElementById('setConn_schemaStatus');
                if (elSchema) {
                    elSchema.innerText = \`\${checks.schema_count || '16/16'} ชีตสมบูรณ์\`;
                    elSchema.className = checks.schema ? 'font-bold text-emerald-600' : 'font-bold text-amber-600';
                }

                if (diag) {
                    const lines = [
                        '=== HEALTH CHECK & SCHEMA DIAGNOSTIC REPORT (LIVE SERVER) ===',
                        \`สถานะภาพรวม: \${res.status || 'UNKNOWN'}\`,
                        \`ชีตที่ตรวจสอบ: \${checks.schema_count || '16/16'} (\${checks.schema ? 'ครบถ้วนสมบูรณ์' : 'พบชีตขาดหาย: ' + (checks.missingSheets || []).join(', ')})\`,
                        \`Active Fiscal Year: พ.ศ. \${res.activeFiscalYear || 2569}\`,
                        \`Database ID: \${res.spreadsheetIdMasked || 'BOUND_ACTIVE'}\`,
                        \`Round-Trip Latency: \${tElapsed}ms (Server measured: \${res.latencyMs || tElapsed}ms)\`,
                        \`Caller Authentication: \${checks.authenticated ? 'VERIFIED (' + checks.role + ')' : 'UNAUTHENTICATED'}\`,
                        \`Write Permissions Probe: \${checks.write_permission || 'NOT_TESTED'} (สิทธิ์การเขียนพิจารณาตาม Role \${checks.role || 'ANONYMOUS'})\`
                    ];
                    diag.innerText = lines.join('\\n');
                }

                if (isHealthy) {
                    if (typeof window.showToast === 'function') window.showToast('ตรวจสอบฐานข้อมูลเรียบร้อย: ปกติทุกส่วน', 'success');
                } else if (isDegraded) {
                    if (typeof window.showToast === 'function') window.showToast('ระบบฐานข้อมูลอยู่ในสถานะ Degraded: มีบางชีตขาดหาย', 'warning');
                } else {
                    if (typeof window.showToast === 'function') window.showToast('การตรวจสอบฐานข้อมูลพบปัญหา: ' + (res.status || 'UNHEALTHY'), 'error');
                }
            } else {
                throw new Error('ApiService is unavailable');
            }
        } catch(e) {
            if (diag) {
                diag.innerText = \`การตรวจสอบล้มเหลว: \${e.message}\`;
            }
            if (typeof window.showToast === 'function') window.showToast(\`เกิดข้อผิดพลาดในการตรวจสอบ: \${e.message}\`, 'error');
        }
    };

    window.triggerFullBackup = async function() {
        const confirmed = confirm('ต้องการสร้างจุดสำรองข้อมูลฉุกเฉิน (Full System Backup Archive) ตอนนี้หรือไม่?');
        if (!confirmed) return;

        try {
            if (typeof window.showToast === 'function') window.showToast('กำลังสร้างไฟล์สำรองข้อมูล 16 ชีต...', 'info');
            const res = await window.ApiService.call('settings.backup');
            if (res && res.success && res.backupBundle) {
                const bundle = res.backupBundle;
                const manifest = bundle.manifest || {};
                const backupId = manifest.bundleId || \`BAK-\${Date.now()}\`;
                const totalRows = manifest.totalRowCount !== undefined ? manifest.totalRowCount : '-';

                alert(\`สร้างจุดสำรองข้อมูลเรียบร้อยแล้ว: \${backupId}\\nรวมชีตข้อมูล: 16 ชีต (\${totalRows} แถว)\\nสถานะ Snapshot: \${manifest.isConsistent ? 'Consistent (Lock Acquired)' : 'Standard'}\\nนโยบายความปลอดภัย: ข้อมูล Credentials และ Secret ถูกตัดออกเรียบร้อย\`);
                
                // Trigger client-side download of backup bundle JSON artifact
                try {
                    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = \`\${backupId}.json\`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                } catch(de) {}

                if (typeof window.showToast === 'function') window.showToast(\`สร้างไฟล์สำรอง \${backupId} สำเร็จ\`, 'success');
            } else {
                throw new Error(res && res.message ? res.message : 'Backup generation failed');
            }
        } catch(e) {
            alert(\`ไม่สามารถสร้างชุดข้อมูลสำรองได้: \${e.message}\`);
            if (typeof window.showToast === 'function') window.showToast(\`สร้างไฟล์สำรองล้มเหลว: \${e.message}\`, 'error');
        }
    };`;

const normTargetJs = targetJsBlock.replace(/\r\n/g, '\n');
const normHtml = html.replace(/\r\n/g, '\n');

if (normHtml.includes(normTargetJs)) {
  html = normHtml.replace(normTargetJs, replacementJsBlock.replace(/\r\n/g, '\n'));
  console.log('Replaced testDatabaseConnection & triggerFullBackup in index.html');
} else {
  console.warn('Could not find targetJsBlock in index.html');
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully written index.html');
