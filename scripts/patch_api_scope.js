const fs = require('fs');

let api = fs.readFileSync('Api.gs', 'utf8');

// Declare caller, idempotencyKey, idempotencyReserved at routeRequest root scope
const oldRouteHeader = `function routeRequest(action, rawPayload, requestId) {
    const reqId = requestId || \`REQ-\${Date.now().toString(36)}-\${Math.random().toString(36).substring(2, 6).toUpperCase()}\`;
    const startTime = Date.now();

    try {`;

const newRouteHeader = `function routeRequest(action, rawPayload, requestId) {
    const reqId = requestId || \`REQ-\${Date.now().toString(36)}-\${Math.random().toString(36).substring(2, 6).toUpperCase()}\`;
    const startTime = Date.now();
    let caller = null;
    let idempotencyKey = null;
    let idempotencyReserved = false;

    try {`;

if (api.includes(oldRouteHeader)) {
  api = api.replace(oldRouteHeader, newRouteHeader);
}

// In step 2: assign to outer caller
api = api.replace(
  'const caller = resolveAuthenticatedUser(route.isWrite, rawPayload);',
  'caller = resolveAuthenticatedUser(route.isWrite, rawPayload);'
);

// In step 4: assign to outer idempotencyKey
api = api.replace(
  'const idempotencyKey = payload.idempotency_key || payload.idempotencyKey;',
  'idempotencyKey = payload.idempotency_key || payload.idempotencyKey;'
);

fs.writeFileSync('Api.gs', api, 'utf8');
console.log('Api.gs updated with outer routeRequest variables. Testing syntax...');
new Function(api);
console.log('Api.gs syntax check PASSED!');
