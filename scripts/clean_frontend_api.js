const fs = require('fs');

let content = fs.readFileSync('frontend/services/ApiService.js', 'utf8');
const p1 = content.indexOf('// Local Browser Simulation Mode');
const p2 = content.indexOf('const apiInstance = new ApiServiceCore();');
if (p1 !== -1 && p2 !== -1) {
  const replacement = `// Live Clean Mode: NO silent mock fallback!
                    const err = new Error('BACKEND_UNAVAILABLE: Google Apps Script bridge is not detected. Please open via authorized Web App URL or use demo.html for standalone preview.');
                    err.code = 'BACKEND_UNAVAILABLE';
                    reject(err);
                }
            });
        }
    }

    `;
  content = content.slice(0, p1) + replacement + content.slice(p2);
  fs.writeFileSync('frontend/services/ApiService.js', content, 'utf8');
  console.log('Successfully updated frontend/services/ApiService.js');
}
