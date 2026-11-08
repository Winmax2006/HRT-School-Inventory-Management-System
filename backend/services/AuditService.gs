/**
 * AuditService.gs - Immutable Cryptographically Chained Audit Trail Service
 * Layer: Domain Service Layer
 * Standard: Tamper-Evident Hash Chain & Compliance Logging
 */

const AuditService = (function() {
  function computeHash(dataString) {
    try {
      if (typeof Utilities !== 'undefined' && Utilities.computeDigest) {
        const rawDigest = Utilities.computeDigest(
          Utilities.DigestAlgorithm.SHA_256,
          dataString,
          Utilities.Charset.UTF_8
        );
        let hex = '';
        for (let i = 0; i < rawDigest.length; i++) {
          const byteVal = (rawDigest[i] < 0) ? rawDigest[i] + 256 : rawDigest[i];
          const byteHex = byteVal.toString(16);
          hex += (byteHex.length === 1) ? '0' + byteHex : byteHex;
        }
        return hex;
      }
    } catch (e) {}

    // Fallback deterministic hash algorithm for local/test execution
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `hash-${Math.abs(hash).toString(16)}-${dataString.length}`;
  }

  function getLatestAuditHash() {
    const logs = Repository.findAll(Schema.TABLES.AUDIT_TRAIL);
    if (!logs || logs.length === 0) {
      return 'GENESIS_BLOCK_00000000000000000000';
    }
    const last = logs[logs.length - 1];
    return last.integrity_hash || 'GENESIS_BLOCK_00000000000000000000';
  }

  function logAction(options) {
    let actorUserId = 'SYSTEM';
    let actorEmail = 'system@internal';

    try {
      if (typeof Auth !== 'undefined') {
        const user = Auth.getCurrentUser();
        if (user) {
          actorUserId = user.user_id || actorUserId;
          actorEmail = user.email || actorEmail;
        }
      }
    } catch (e) {}

    const timestamp = options.timestamp || new Date().toISOString();
    const action = String(options.action || 'UNKNOWN_ACTION').toUpperCase();
    const moduleName = String(options.module || 'SYSTEM').toUpperCase();
    const entityType = String(options.entityType || 'GENERAL').toUpperCase();
    const entityId = String(options.entityId || '');
    const oldValStr = options.oldValue ? JSON.stringify(options.oldValue) : '';
    const newValStr = options.newValue ? JSON.stringify(options.newValue) : '';
    const status = options.status || 'SUCCESS';
    const requestId = options.requestId || (typeof IdService !== 'undefined' ? IdService.generateRequestId() : String(Date.now()));

    const previousHash = getLatestAuditHash();
    const payloadToHash = `${previousHash}|${timestamp}|${actorEmail}|${action}|${moduleName}|${entityType}|${entityId}|${newValStr}`;
    const integrityHash = computeHash(payloadToHash);

    const auditId = IdService ? IdService.generateAuditId() : `AUD-${Date.now()}`;

    const record = {
      audit_id: auditId,
      timestamp,
      actor_user_id: actorUserId,
      actor_email: actorEmail,
      action,
      module: moduleName,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValStr,
      new_value: newValStr,
      status,
      request_id: requestId,
      integrity_hash: integrityHash
    };

    return Repository.insert(Schema.TABLES.AUDIT_TRAIL, record);
  }

  function getAuditLogs(filters = {}) {
    const logs = Repository.findAll(Schema.TABLES.AUDIT_TRAIL);

    return logs.filter(entry => {
      if (filters.module && filters.module !== 'all') {
        if (String(entry.module).toUpperCase() !== String(filters.module).toUpperCase()) return false;
      }
      if (filters.action && filters.action !== 'all') {
        if (String(entry.action).toUpperCase() !== String(filters.action).toUpperCase()) return false;
      }
      if (filters.entity_type && filters.entity_type !== 'all') {
        if (String(entry.entity_type).toUpperCase() !== String(filters.entity_type).toUpperCase()) return false;
      }
      if (filters.entity_id && entry.entity_id !== filters.entity_id) {
        return false;
      }
      if (filters.actor_email && entry.actor_email !== filters.actor_email) {
        return false;
      }
      return true;
    });
  }

  function verifyIntegrityChain() {
    const logs = Repository.findAll(Schema.TABLES.AUDIT_TRAIL);
    if (!logs || logs.length === 0) {
      return { verified: true, count: 0, message: 'Audit trail is empty.' };
    }

    let previousHash = 'GENESIS_BLOCK_00000000000000000000';

    for (let i = 0; i < logs.length; i++) {
      const entry = logs[i];
      const payloadToHash = `${previousHash}|${entry.timestamp}|${entry.actor_email}|${entry.action}|${entry.module}|${entry.entity_type}|${entry.entity_id}|${entry.new_value}`;
      const expectedHash = computeHash(payloadToHash);

      if (entry.integrity_hash !== expectedHash) {
        return {
          verified: false,
          brokenAtIndex: i,
          auditId: entry.audit_id,
          expectedHash,
          actualHash: entry.integrity_hash,
          error: `Tampering detected at audit record index ${i} (ID: ${entry.audit_id})`
        };
      }
      previousHash = entry.integrity_hash;
    }

    return {
      verified: true,
      count: logs.length,
      latestHash: previousHash
    };
  }

  return {
    computeHash,
    logAction,
    getAuditLogs,
    verifyIntegrityChain
  };
})();
