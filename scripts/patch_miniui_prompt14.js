const fs = require('fs');

let content = fs.readFileSync('MiniUI.html', 'utf8');

const oldTimeout = `                const timer = setTimeout(() => {
                    if (!isCompleted) {
                        isCompleted = true;
                        reject(new Error(\`Timeout: Backend function [\${fnName}] timed out after \${this.timeoutMs}ms (\${reqId})\`));
                    }
                }, this.timeoutMs);

                const onSuccess = (response) => {
                    if (!isCompleted) {
                        isCompleted = true;
                        clearTimeout(timer);
                        resolve(response);
                    }
                };`;

const newTimeout = `                const timer = setTimeout(() => {
                    if (!isCompleted) {
                        isCompleted = true;
                        clearTimeout(timer);
                        const err = new Error(\`Timeout: Backend function [\${fnName}] timed out after \${this.timeoutMs}ms (\${reqId})\`);
                        err.code = 'TIMEOUT';
                        err.isTimeout = true;
                        err.outcome = 'UNKNOWN_OUTCOME';
                        reject(err);
                    }
                }, this.timeoutMs);

                const onSuccess = (response) => {
                    if (!isCompleted) {
                        isCompleted = true;
                        clearTimeout(timer);
                        if (response && response.success === false) {
                            const err = new Error(response.message || response.error || \`Action [\${fnName}] rejected by server.\`);
                            err.code = response.code || 'API_REJECTED';
                            err.response = response;
                            err.requestId = response.requestId || reqId;
                            err.isBusinessError = true;
                            reject(err);
                        } else {
                            resolve(response);
                        }
                    }
                };`;

if (content.includes(oldTimeout)) {
  content = content.replace(oldTimeout, newTimeout);
  fs.writeFileSync('MiniUI.html', content, 'utf8');
  console.log('[OK] MiniUI.html ApiServiceCore updated with business error rejection and UNKNOWN_OUTCOME timeout');
} else {
  console.warn('[WARN] Old timeout block not found in MiniUI.html');
}
