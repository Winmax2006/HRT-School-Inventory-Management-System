const fs = require('fs');

let api = fs.readFileSync('Api.gs', 'utf8');

// 1. Update codeKeys to include itemId
api = api.replace(
  "const codeKeys = ['itemCode', 'item_code', 'code'];",
  "const codeKeys = ['itemCode', 'item_code', 'code', 'itemId'];"
);

// 2. Replace checkIdempotency, recordIdempotency, computePayloadHash
const oldHashStart = api.indexOf('function checkIdempotency(');
const oldHashEnd = api.indexOf('function resolveAllowlistedHandler', oldHashStart);

if (oldHashStart === -1 || oldHashEnd === -1) {
  console.error('Could not find boundaries in Api.gs: oldHashStart=' + oldHashStart + ', oldHashEnd=' + oldHashEnd);
  process.exit(1);
}

const newIdempotencyCode = `function canonicalizePayload(val) {
    if (val === null || val === undefined) return null;
    if (typeof val !== 'object') return val;

    if (Array.isArray(val)) {
      // Preserve array element order (semantic line item order)
      return val.map(item => canonicalizePayload(item));
    }

    // Excluded volatile / authentication / request-context fields
    const EXCLUDED_KEYS = new Set([
      'idempotency_key', 'idempotencyKey',
      'id_token', 'idToken', 'authToken', 'token', 'bearer',
      'requestId', 'reqId',
      'caller', '_serverActor',
      'timestamp', '_t'
    ]);

    const sortedObj = {};
    const keys = Object.keys(val).filter(k => !EXCLUDED_KEYS.has(k)).sort();
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      sortedObj[k] = canonicalizePayload(val[k]);
    }
    return sortedObj;
  }

  /**
   * Computes cryptographic SHA-256 hash of canonicalized JSON payload.
   * P0 Security: Fails closed if cryptographic hash calculation is unavailable or invalid.
   * Absolutely NO weak length-based or non-cryptographic fallbacks in live path (TX-11, TX-13).
   * @param {Object} payload 
   * @returns {string} 64-character lowercase hex digest
   */
  function computePayloadHash(payload) {
    const canonicalObj = canonicalizePayload(payload);
    const jsonStr = JSON.stringify(canonicalObj);

    let shaFn = null;
    if (typeof hrtComputeSha256_ === 'function') {
      shaFn = hrtComputeSha256_;
    } else if (typeof computeSha256 === 'function') {
      shaFn = computeSha256;
    } else if (typeof globalThis !== 'undefined' && typeof globalThis.hrtComputeSha256_ === 'function') {
      shaFn = globalThis.hrtComputeSha256_;
    } else if (typeof global !== 'undefined' && typeof global.hrtComputeSha256_ === 'function') {
      shaFn = global.hrtComputeSha256_;
    }

    if (!shaFn) {
      const err = new Error('HASH_UNAVAILABLE: Cryptographic hash function (hrtComputeSha256_) is not available. Fails closed.');
      err.code = 'HASH_UNAVAILABLE';
      throw err;
    }

    let digest = null;
    try {
      digest = shaFn(jsonStr);
    } catch (e) {
      const err = new Error('HASH_UNAVAILABLE: SHA-256 calculation threw an error: ' + (e.message || e));
      err.code = 'HASH_UNAVAILABLE';
      throw err;
    }

    if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/i.test(digest.trim())) {
      const err = new Error('HASH_INVALID: Cryptographic digest generation produced an invalid or non-SHA-256 output.');
      err.code = 'HASH_INVALID';
      throw err;
    }

    return digest.trim().toLowerCase();
  }

  /**
   * Idempotency verification and in-flight reservation
   * Atomic check -> in-flight reservation -> commit -> record
   * @param {string} key 
   * @param {string} actorId 
   * @param {string} action 
   * @param {Object} payload 
   * @returns {Object|null}
   */
  function checkIdempotency(key, actorId, action, payload) {
    if (!key) return null;

    const payloadHash = computePayloadHash(payload);
    const compositeKey = actorId + ':' + action + ':' + key;
    const nowIso = new Date().toISOString();

    // 1. Check Fast Cache
    try {
      if (typeof CacheService !== 'undefined') {
        const cache = CacheService.getScriptCache();
        const cachedStr = cache.get('idemp_' + compositeKey);
        if (cachedStr) {
          const record = JSON.parse(cachedStr);
          if (record.payloadHash !== payloadHash) {
            const err = new Error('IDEMPOTENCY_CONFLICT: Idempotency key "' + key + '" was previously used with a different payload.');
            err.code = 'IDEMPOTENCY_CONFLICT';
            throw err;
          }
          if (record.status === 'IN_FLIGHT') {
            const err = new Error('IDEMPOTENCY_IN_FLIGHT: An operation with idempotency key "' + key + '" is currently in progress. Please retry shortly.');
            err.code = 'IDEMPOTENCY_IN_FLIGHT';
            throw err;
          }
          if (record.status === 'COMMITTED') {
            return record.response;
          }
        }
      }
    } catch (e) {
      if (e.code === 'IDEMPOTENCY_CONFLICT' || e.code === 'IDEMPOTENCY_IN_FLIGHT') throw e;
    }

    // 2. Check Persistent 16_Idempotency_Log sheet
    try {
      const sheet = getSheet('idempotency_log');
      const data = sheet.getDataRange().getValues();
      for (let r = data.length - 1; r >= 1; r--) {
        const rowKey = String(data[r][0]).trim();
        const rowActor = String(data[r][1]).trim();
        const rowAction = String(data[r][2]).trim();
        const rowHash = String(data[r][3]).trim();
        const rowStatus = String(data[r][4]).trim();
        const rowResult = data[r][5];

        if (rowKey === key && rowActor === actorId && rowAction === action) {
          if (rowHash !== payloadHash) {
            const err = new Error('IDEMPOTENCY_CONFLICT: Idempotency key "' + key + '" was previously executed with a different payload.');
            err.code = 'IDEMPOTENCY_CONFLICT';
            throw err;
          }
          if (rowStatus === 'COMMITTED') {
            const parsed = typeof rowResult === 'string' ? JSON.parse(rowResult) : rowResult;
            // Repopulate fast cache
            try {
              if (typeof CacheService !== 'undefined') {
                CacheService.getScriptCache().put('idemp_' + compositeKey, JSON.stringify({
                  action: action,
                  actorId: actorId,
                  payloadHash: payloadHash,
                  status: 'COMMITTED',
                  response: parsed,
                  timestamp: nowIso
                }), 600);
              }
            } catch (ce) {}
            return parsed;
          }
          if (rowStatus === 'IN_FLIGHT') {
            const err = new Error('IDEMPOTENCY_IN_FLIGHT: An operation with idempotency key "' + key + '" is currently in progress in sheet log.');
            err.code = 'IDEMPOTENCY_IN_FLIGHT';
            throw err;
          }
        }
      }
    } catch (err) {
      if (err.code === 'IDEMPOTENCY_CONFLICT' || err.code === 'IDEMPOTENCY_IN_FLIGHT') throw err;
      Logger.log('Idempotency sheet check notice: ' + err.message);
    }

    // 3. Reserve key as IN_FLIGHT in Fast Cache to prevent concurrent race
    try {
      if (typeof CacheService !== 'undefined') {
        const cache = CacheService.getScriptCache();
        cache.put('idemp_' + compositeKey, JSON.stringify({
          action: action,
          actorId: actorId,
          payloadHash: payloadHash,
          status: 'IN_FLIGHT',
          timestamp: nowIso
        }), 120);
      }
    } catch (e) {}

    return null;
  }

  /**
   * Clears in-flight reservation if request fails before commit
   */
  function clearInFlightIdempotency(key, actorId, action) {
    if (!key) return;
    const compositeKey = actorId + ':' + action + ':' + key;
    try {
      if (typeof CacheService !== 'undefined') {
        CacheService.getScriptCache().remove('idemp_' + compositeKey);
      }
    } catch (e) {}
  }

  /**
   * Persists committed idempotent response
   * @param {string} key 
   * @param {string} actorId
   * @param {string} action 
   * @param {Object} payload
   * @param {Object} response 
   */
  function recordIdempotency(key, actorId, action, payload, response) {
    if (!key) return;

    const payloadHash = computePayloadHash(payload);
    const compositeKey = actorId + ':' + action + ':' + key;
    const nowIso = new Date().toISOString();

    // 1. Store in CacheService
    try {
      if (typeof CacheService !== 'undefined') {
        const cache = CacheService.getScriptCache();
        cache.put('idemp_' + compositeKey, JSON.stringify({
          action: action,
          actorId: actorId,
          payloadHash: payloadHash,
          status: 'COMMITTED',
          response: response,
          timestamp: nowIso
        }), 600);
      }
    } catch (e) {}

    // 2. Persist to 16_Idempotency_Log
    try {
      const sheet = getSheet('idempotency_log');
      sheet.appendRow([
        key,
        actorId,
        action,
        payloadHash,
        'COMMITTED',
        JSON.stringify(response),
        nowIso
      ]);
    } catch (e) {
      Logger.log('Warning saving to idempotency sheet: ' + e.message);
    }
  }

  `;

api = api.substring(0, oldHashStart) + newIdempotencyCode + api.substring(oldHashEnd);

// 3. Update routeRequest to track in-flight idempotency reservation & clear on error
const oldRouteIdemp = `// 4. Idempotency Check for Write Actions
      const idempotencyKey = payload.idempotency_key || payload.idempotencyKey;
      if (route.isWrite && idempotencyKey) {
        const cachedRes = checkIdempotency(idempotencyKey, caller.id, action, payload);
        if (cachedRes) {
          cachedRes.isIdempotentReplay = true;
          return cachedRes;
        }
      }`;

const newRouteIdemp = `// 4. Idempotency Check for Write Actions
      const idempotencyKey = payload.idempotency_key || payload.idempotencyKey;
      let idempotencyReserved = false;
      if (route.isWrite && idempotencyKey) {
        const cachedRes = checkIdempotency(idempotencyKey, caller.id, action, payload);
        if (cachedRes) {
          cachedRes.isIdempotentReplay = true;
          return cachedRes;
        }
        idempotencyReserved = true;
      }`;

if (api.includes(oldRouteIdemp)) {
  api = api.replace(oldRouteIdemp, newRouteIdemp);
} else {
  console.warn('oldRouteIdemp not matched directly, checking variations...');
}

const oldCatch = `    } catch (error) {
      const code = error.code || error.name || 'API_ERROR';`;

const newCatch = `    } catch (error) {
      if (typeof idempotencyReserved !== 'undefined' && idempotencyReserved && idempotencyKey && caller) {
        clearInFlightIdempotency(idempotencyKey, caller.id, action);
      }
      const code = error.code || error.name || 'API_ERROR';`;

if (api.includes(oldCatch)) {
  api = api.replace(oldCatch, newCatch);
} else {
  console.warn('oldCatch not matched directly, checking variations...');
}

// 4. Export computePayloadHash, canonicalizePayload, clearInFlightIdempotency in ApiRouter
const oldExports = `checkIdempotency: checkIdempotency,
    recordIdempotency: recordIdempotency
  };`;

const newExports = `checkIdempotency: checkIdempotency,
    recordIdempotency: recordIdempotency,
    clearInFlightIdempotency: clearInFlightIdempotency,
    computePayloadHash: computePayloadHash,
    canonicalizePayload: canonicalizePayload
  };`;

if (api.includes(oldExports)) {
  api = api.replace(oldExports, newExports);
} else {
  console.warn('oldExports not matched directly, checking variations...');
}

fs.writeFileSync('Api.gs', api, 'utf8');
console.log('Api.gs written. Testing syntax...');
new Function(api);
console.log('Api.gs syntax check PASSED!');
