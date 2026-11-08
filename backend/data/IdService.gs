/**
 * IdService.gs - Deterministic and Unique Identifier Generator
 * Layer: Data Layer
 * Standard: Thai Buddhist Fiscal Year compliant IDs & UUIDs
 */

const IdService = (function() {
  function getBuddhistYear(date) {
    const d = date || new Date();
    return d.getFullYear() + 543;
  }

  function padZero(num, size) {
    let s = String(num);
    while (s.length < (size || 4)) s = '0' + s;
    return s;
  }

  function generateRandomHex(length) {
    const chars = '0123456789abcdef';
    let res = '';
    for (let i = 0; i < (length || 8); i++) {
      res += chars[Math.floor(Math.random() * chars.length)];
    }
    return res;
  }

  function generateUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function generateRequestId() {
    return `REQ-${Date.now()}-${generateRandomHex(6)}`;
  }

  function generateRequisitionId(seq, year) {
    const y = year || getBuddhistYear();
    return `REQ-${y}-${padZero(seq, 4)}`;
  }

  function generateTransactionId(seq, year) {
    const y = year || getBuddhistYear();
    return `TX-${y}-${padZero(seq, 4)}`;
  }

  function generateLedgerId(seq, year) {
    const y = year || getBuddhistYear();
    return `LED-${y}-${padZero(seq, 5)}`;
  }

  function generateAuditId() {
    return `AUD-${Date.now()}-${generateRandomHex(4)}`;
  }

  function generateUserId(seq) {
    return `USR-${padZero(seq, 4)}`;
  }

  function generateItemCode(categoryPrefix, seq) {
    const prefix = categoryPrefix ? String(categoryPrefix).toUpperCase().trim() : 'GEN';
    return `${prefix}-${padZero(seq, 3)}`;
  }

  return {
    getBuddhistYear,
    padZero,
    generateUuid,
    generateRequestId,
    generateRequisitionId,
    generateTransactionId,
    generateLedgerId,
    generateAuditId,
    generateUserId,
    generateItemCode
  };
})();
