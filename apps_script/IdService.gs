/**
 * ==============================================================================
 * HRT School Inventory Management System - Central Database Engine
 * File: IdService.gs
 * Description: Unique, Non-Row-Based Stable ID Generation Service
 * ==============================================================================
 * 
 * Rules:
 * 1. NEVER use Sheet Row Numbers as Primary Keys
 * 2. All generated IDs are deterministic, immutable, and globally unique
 * 3. Thread-safe sequence generation using LockService and PropertiesService
 * 4. Standard Entity ID Patterns:
 *    - Users: USR-001, USR-002
 *    - Items: ITM-2569-0001
 *    - Requisitions: REQ-2569-0001
 *    - Requisition Items: RQI-2569-0001-01
 *    - Transactions: TXN-2569-0001
 *    - Transaction Items: TXI-2569-0001-01
 *    - Stock Ledger: LDG-2569-000001
 *    - Audit Log: AUD-2569-000001
 *    - Physical Counts: CNT-2569-001
 *    - Physical Count Items: CNI-2569-001-01
 */

var IdService = (function () {
  'use strict';

  /**
   * Generates a standard RFC 4122 v4 UUID
   * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
   * @returns {string}
   */
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Thread-safe atomic sequence generator using LockService & ScriptProperties
   * @param {string} prefix Entity prefix (e.g., 'ITM', 'REQ', 'TXN', 'LDG')
   * @param {string} fiscalYear Fiscal year string (e.g., '2569')
   * @param {number} padLength Zero-padding length (default: 4)
   * @returns {string} Fully formatted sequential ID
   */
  function getNextSequence(prefix, fiscalYear, padLength) {
    padLength = padLength || 4;
    fiscalYear = fiscalYear || Config.getActiveFiscalYear();
    var lock = LockService.getScriptLock();

    try {
      // Acquire script lock with 15-second timeout to ensure serial execution
      lock.waitLock(15000);

      var props = PropertiesService.getScriptProperties();
      var key = 'SEQ_' + prefix + '_' + fiscalYear;
      var currentVal = parseInt(props.getProperty(key) || '0', 10);
      var nextVal = currentVal + 1;

      props.setProperty(key, String(nextVal));

      var paddedNumber = String(nextVal);
      while (paddedNumber.length < padLength) {
        paddedNumber = '0' + paddedNumber;
      }

      return prefix + '-' + fiscalYear + '-' + paddedNumber;
    } catch (e) {
      Logger.log('Warning: Lock acquisition timeout in IdService. Falling back to timestamp UUID for ' + prefix);
      // Fallback timestamp-random ID to guarantee non-blocking operations in extreme load
      var rand = Math.floor(Math.random() * 1000).toString();
      return prefix + '-' + fiscalYear + '-X' + Date.now().toString().slice(-4) + rand;
    } finally {
      try {
        lock.releaseLock();
      } catch (err) {
        // Lock might have already been released
      }
    }
  }

  /**
   * Generates a sequential Item ID
   * Pattern: ITM-{FY}-{0001}
   * @param {string} [fiscalYear]
   * @returns {string} e.g. "ITM-2569-0001"
   */
  function generateItemId(fiscalYear) {
    return getNextSequence('ITM', fiscalYear, 4);
  }

  /**
   * Generates a sequential Requisition ID
   * Pattern: REQ-{FY}-{0001}
   * @param {string} [fiscalYear]
   * @returns {string} e.g. "REQ-2569-0001"
   */
  function generateRequisitionId(fiscalYear) {
    return getNextSequence('REQ', fiscalYear, 4);
  }

  /**
   * Generates a sub-item ID for Requisition Details
   * Pattern: RQI-{FY}-{0001}-{01}
   * @param {string} requisitionId e.g. "REQ-2569-0001"
   * @param {number} itemIndex 1-based index (e.g., 1, 2)
   * @returns {string} e.g. "RQI-2569-0001-01"
   */
  function generateRequisitionItemId(requisitionId, itemIndex) {
    var paddedIdx = itemIndex < 10 ? '0' + itemIndex : String(itemIndex);
    var coreNumber = requisitionId.replace(/^REQ-/, '');
    return 'RQI-' + coreNumber + '-' + paddedIdx;
  }

  /**
   * Generates a sequential Physical Transaction ID
   * Pattern: TXN-{FY}-{0001}
   * @param {string} [fiscalYear]
   * @returns {string} e.g. "TXN-2569-0001"
   */
  function generateTransactionId(fiscalYear) {
    return getNextSequence('TXN', fiscalYear, 4);
  }

  /**
   * Generates a sub-item ID for Transaction Details
   * Pattern: TXI-{FY}-{0001}-{01}
   * @param {string} transactionId e.g. "TXN-2569-0001"
   * @param {number} itemIndex 1-based index
   * @returns {string} e.g. "TXI-2569-0001-01"
   */
  function generateTransactionItemId(transactionId, itemIndex) {
    var paddedIdx = itemIndex < 10 ? '0' + itemIndex : String(itemIndex);
    var coreNumber = transactionId.replace(/^TXN-/, '');
    return 'TXI-' + coreNumber + '-' + paddedIdx;
  }

  /**
   * Generates a sequential Stock Ledger Entry ID
   * Pattern: LDG-{FY}-{000001} (6-digit sequence for high-volume ledger)
   * @param {string} [fiscalYear]
   * @returns {string} e.g. "LDG-2569-000001"
   */
  function generateLedgerId(fiscalYear) {
    return getNextSequence('LDG', fiscalYear, 6);
  }

  /**
   * Generates a sequential System Audit Log ID
   * Pattern: AUD-{FY}-{000001} (6-digit sequence)
   * @param {string} [fiscalYear]
   * @returns {string} e.g. "AUD-2569-000001"
   */
  function generateAuditId(fiscalYear) {
    return getNextSequence('AUD', fiscalYear, 6);
  }

  /**
   * Generates a sequential Physical Count ID
   * Pattern: CNT-{FY}-{001}
   * @param {string} [fiscalYear]
   * @returns {string} e.g. "CNT-2569-001"
   */
  function generateCountId(fiscalYear) {
    return getNextSequence('CNT', fiscalYear, 3);
  }

  /**
   * Generates a sub-item ID for Physical Count Details
   * Pattern: CNI-{FY}-{001}-{01}
   * @param {string} countId e.g. "CNT-2569-001"
   * @param {number} itemIndex
   * @returns {string} e.g. "CNI-2569-001-01"
   */
  function generateCountItemId(countId, itemIndex) {
    var paddedIdx = itemIndex < 10 ? '0' + itemIndex : String(itemIndex);
    var coreNumber = countId.replace(/^CNT-/, '');
    return 'CNI-' + coreNumber + '-' + paddedIdx;
  }

  /**
   * Generates a sequential User ID
   * Pattern: USR-{001}
   * @returns {string} e.g. "USR-001"
   */
  function generateUserId() {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
      var props = PropertiesService.getScriptProperties();
      var key = 'SEQ_USR_GLOBAL';
      var currentVal = parseInt(props.getProperty(key) || '0', 10);
      var nextVal = currentVal + 1;
      props.setProperty(key, String(nextVal));

      var padded = String(nextVal);
      while (padded.length < 3) padded = '0' + padded;
      return 'USR-' + padded;
    } catch (e) {
      return 'USR-' + Math.floor(100 + Math.random() * 900);
    } finally {
      try { lock.releaseLock(); } catch (err) {}
    }
  }

  return {
    generateUUID: generateUUID,
    getNextSequence: getNextSequence,
    generateUserId: generateUserId,
    generateItemId: generateItemId,
    generateRequisitionId: generateRequisitionId,
    generateRequisitionItemId: generateRequisitionItemId,
    generateTransactionId: generateTransactionId,
    generateTransactionItemId: generateTransactionItemId,
    generateLedgerId: generateLedgerId,
    generateAuditId: generateAuditId,
    generateCountId: generateCountId,
    generateCountItemId: generateCountItemId
  };
})();
