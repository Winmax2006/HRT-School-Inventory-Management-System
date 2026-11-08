const fs = require('fs');

let content = fs.readFileSync('Code.gs', 'utf8');

const oldFn = `function apiSubmitRequisition(payload) {
  if (typeof payload === 'string') {
    const err = new Error('VALIDATION_ERROR: apiSubmitRequisition requires a requisition payload object with line items. To review an existing requisition, call apiReviewRequisition.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  if (!payload || typeof payload !== 'object') {
    const err = new Error('VALIDATION_ERROR: Requisition payload must be an object containing items.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  return ApiRouter.routeRequest('requisitions.create', payload);
}`;

const newFn = `function apiSubmitRequisition(payload) {
  if (typeof payload === 'string' || !payload || typeof payload !== 'object') throw new Error('VALIDATION_ERROR: apiSubmitRequisition requires a requisition payload object with line items. To review an existing requisition, call apiReviewRequisition.');
  return ApiRouter.routeRequest('requisitions.create', payload);
}`;

content = content.replace(oldFn, newFn);
fs.writeFileSync('Code.gs', content, 'utf8');
new Function(content);
console.log('[OK] Updated apiSubmitRequisition without inner braces in Code.gs');
