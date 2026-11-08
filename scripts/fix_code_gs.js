const fs = require('fs');

let content = fs.readFileSync('Code.gs', 'utf8');

const badBlock = `function apiSubmitRequisition(payload) {
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
}
  if (payload && (payload.requisition_id || payload.req_id || payload.id)) {
    return ApiRouter.routeRequest('requisitions.review', { requisition_id: payload.requisition_id || payload.req_id || payload.id });
  }
  return ApiRouter.routeRequest('requisitions.create', payload);
}`;

const goodBlock = `function apiSubmitRequisition(payload) {
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

content = content.replace(badBlock, goodBlock);
fs.writeFileSync('Code.gs', content, 'utf8');
new Function(content);
console.log('[OK] Code.gs syntax fixed and valid!');
