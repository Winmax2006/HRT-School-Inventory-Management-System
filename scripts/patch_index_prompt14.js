const fs = require('fs');

let indexContent = fs.readFileSync('index.html', 'utf8');

// 1. ApiServiceCore: catch success: false, timeout outcome: UNKNOWN_OUTCOME, clear timer
const oldOnSuccess = `                        const onSuccess = (res) => {
                            if (!done) {
                                done = true;
                                clearTimeout(timer);
                                resolve(res);
                            }
                        };`;

const newOnSuccess = `                        const onSuccess = (res) => {
                            if (!done) {
                                done = true;
                                clearTimeout(timer);
                                if (res && res.success === false) {
                                    const err = new Error(res.message || res.error || \`Action "\${fnName}" rejected by server.\`);
                                    err.code = res.code || 'API_REJECTED';
                                    err.response = res;
                                    err.requestId = res.requestId || reqId;
                                    err.isBusinessError = true;
                                    reject(err);
                                } else {
                                    resolve(res);
                                }
                            }
                        };`;

if (indexContent.includes(oldOnSuccess)) {
  indexContent = indexContent.replace(oldOnSuccess, newOnSuccess);
  console.log('[OK] Updated onSuccess in ApiServiceCore in index.html');
} else {
  console.warn('[WARN] Could not find oldOnSuccess in index.html');
}

// 2. ApiServiceCore timeout handler
const oldTimeoutMarker = `if (!done) { done = true; reject(new Error(\`Timeout: \${fnName} (\${reqId})\`)); }`;
const newTimeoutMarker = `if (!done) {
                            done = true;
                            clearTimeout(timer);
                            const err = new Error(\`Timeout: \${fnName} (\${reqId})\`);
                            err.code = 'TIMEOUT';
                            err.isTimeout = true;
                            err.outcome = 'UNKNOWN_OUTCOME';
                            reject(err);
                        }`;

if (indexContent.includes(oldTimeoutMarker)) {
  indexContent = indexContent.replace(oldTimeoutMarker, newTimeoutMarker);
  console.log('[OK] Updated timeout handler in ApiServiceCore in index.html');
} else {
  console.warn('[WARN] Could not find oldTimeoutMarker in index.html');
}

// 3. Add getRequisitions to window.RequisitionApi in index.html
const oldReqApi = `        window.RequisitionApi = {
            async createRequisition(payload) {
                return await window.ApiService.call('apiCreateRequisition', payload);
            },`;

const newReqApi = `        window.RequisitionApi = {
            async getRequisitions(filters = {}) {
                const res = await window.ApiService.call('apiGetRequisitions', filters);
                if (!res) return [];
                if (Array.isArray(res)) return res;
                if (res.data && Array.isArray(res.data)) return res.data;
                if (res.requisitions && Array.isArray(res.requisitions)) return res.requisitions;
                return [];
            },
            async createRequisition(payload) {
                return await window.ApiService.call('apiCreateRequisition', payload);
            },`;

if (indexContent.includes(oldReqApi)) {
  indexContent = indexContent.replace(oldReqApi, newReqApi);
  console.log('[OK] Added getRequisitions to window.RequisitionApi in index.html');
} else {
  console.warn('[WARN] Could not find oldReqApi in index.html');
}

fs.writeFileSync('index.html', indexContent, 'utf8');
console.log('[OK] index.html updated successfully!');
