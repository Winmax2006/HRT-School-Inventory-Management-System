const fs = require('fs');
const crypto = require('crypto');

// 1. Copy Api_v2.7.0-rc.5.gs as base
let apiContent = fs.readFileSync('Api_v2.7.0-rc.5.gs', 'utf8');

// 2. Prompt 13 patches for Api.gs
// resolveAllowlistedHandler & requisitions.submit rewired to hrtCreateRequisition_
apiContent = apiContent.replace(
  "'requisitions.submit': { handler: 'apiSubmitRequisition'",
  "'requisitions.submit': { handler: 'hrtCreateRequisition_'"
);

// 3. Prompt 14 patches for Api.gs
// QR alias normalization
apiContent = apiContent.replace(
  "if (payload.qr_token || payload.qrCode || payload.token) {\n      payload.qr_token = String(payload.qr_token || payload.qrCode || payload.token).trim();\n    }",
  "if (payload.qr_token || payload.qrCode || payload.token || payload.qr_data || payload.qrData) {\n      payload.qr_token = String(payload.qr_token || payload.qrCode || payload.token || payload.qr_data || payload.qrData).trim();\n    }"
);

// Convenience aliases attachment
const oldAliasesBlock = `      if (Array.isArray(result)) {
        if (action.startsWith('requisitions')) {
          response.requisitions = result;
        } else if (action.startsWith('audit')) {
          response.audit = result;
          response.logs = result;
        } else if (action.startsWith('users')) {
          response.users = result;
        } else if (action.startsWith('fsn')) {
          response.fsn = result;
        }
      }`;

const newAliasesBlock = `      if (Array.isArray(result)) {
        if (action.startsWith('requisitions')) {
          response.requisitions = result;
        } else if (action.startsWith('audit')) {
          response.audit = result;
          response.logs = result;
        } else if (action.startsWith('users')) {
          response.users = result;
        } else if (action.startsWith('fsn')) {
          response.fsn = result;
        } else if (action === 'stock.ledger') {
          response.ledger = result;
        }
      } else if (result && typeof result === 'object') {
        if (action.startsWith('dashboard')) {
          response.metrics = result;
          response.kpis = {
            totalSKU: (typeof result.totalSKUs === 'number') ? result.totalSKUs : (result.totalItems || 0),
            totalStockQty: (typeof result.totalStockUnits === 'number') ? result.totalStockUnits : 0,
            totalAssetValue: (typeof result.totalValue === 'number') ? result.totalValue : (typeof result.filteredValue === 'number' ? result.filteredValue : 0),
            lowStockCount: (typeof result.lowCount === 'number') ? result.lowCount : (result.lowStockCount || 0),
            criticalStockCount: (typeof result.criticalCount === 'number') ? result.criticalCount : (result.criticalStockCount || 0),
            healthyCount: (typeof result.normalCount === 'number') ? result.normalCount : 0
          };
        } else if (action === 'stock.reconcile') {
          response.reconcile = result;
        } else if (action === 'audit.verify') {
          response.integrity = result;
        } else if (action.startsWith('settings')) {
          response.settings = result;
        }
      }`;

apiContent = apiContent.replace(oldAliasesBlock, newAliasesBlock);

fs.writeFileSync('Api.gs', apiContent, 'utf8');

const hash = crypto.createHash('sha256').update(fs.readFileSync('Api.gs')).digest('hex');
console.log('Restored Api.gs to Prompt 14 state. Hash:', hash);
console.log('Expected Prompt 14 hash: eb714e66a11337594611eebe9641a47b0234d735d1f67dedea0ae169ce04166d');
