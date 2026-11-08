# HRT Inventory System — Prompt 16 Execution & Verification Report
**Document Version:** v1.1  
**Target Release Pipeline:** `v2.7.0-rc.5` (Working Tree) $\rightarrow$ Candidate `v2.7.0-rc.6` (Post Prompts 13–20)  
**Execution Date:** 29 ตุลาคม 2569  
**Organization:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)  

---

## 1. Summary of Changes

In accordance with **HRT Prompt 16 (v1.1)**, the transaction boundaries, stock mutation atomicity, and idempotent deduplication mechanisms have been overhauled and verified:

1. **Deterministic Canonical Hashing (`Api.gs` / TX-11, TX-12, TX-13):**
   - Added `canonicalizePayload(val)` with recursive deterministic key sorting for objects.
   - Preserves semantic order for arrays and strips non-business metadata (`idempotency_key`, `id_token`, `requestId`, `timestamp`, `_t`, `caller`, `_serverActor`).
   - Wired `computePayloadHash` directly to SHA-256 (`hrtComputeSha256_`). Completely eliminated weak string length fallbacks (`'HASH-' + len`). Fails closed on unavailable or corrupted hash engines.

2. **Atomic Idempotency State Machine (`Api.gs` / TX-02, TX-03, TX-06, TX-07):**
   - Implemented 3-phase idempotency reservation:
     - `IN_FLIGHT`: Lock acquired in `CacheService` to prevent simultaneous double-click / concurrent same-key races.
     - `COMMITTED`: Persisted to cache (6 hours) and permanently logged to `16_Idempotency_Log` upon successful mutation.
     - `CLEARED`: In-flight reservation cleared in `routeRequest` outer `catch` block if mutation throws, allowing clean client retries without stale locks.
   - Detects `PAYLOAD_CONFLICT` if the same idempotency key is submitted with a different payload hash.

3. **Requisition Approval & Issuance Canonical Synchronization (`Write.gs` / TX-14, TX-15):**
   - In `hrtApproveRequisition_`: Line item lookup in `08_Requisition_Items` always matches canonical UUID `req_id` even when approver inputs display `req_no`. Updates line approval statuses and quantities, returning canonical `req_id`.
   - In `hrtIssueStock_`: Strictly distinguishes between explicit zero approval (`qty_approved = 0`) and unreviewed items (`APPROVAL_INCOMPLETE`). Never bypasses approval by falling back to `qty_requested` when an approver deliberately reduced or zeroed quantity.

4. **Negative Stock & Concurrent Balance Protection (`Write.gs` / TX-01, TX-04, TX-05, TX-08, TX-09):**
   - Wrapped physical balance checks and stock deductions inside `LockService.getScriptLock()` with a 15-second timeout.
   - All multi-line stock issues validated *before* any line modification begins (all-or-nothing atomicity).
   - Prevents negative stock under race conditions. Rejects over-draw attempts with `INSUFFICIENT_STOCK`.
   - Repeated issue/receive-confirm checks `status === 'ISSUED'` or `'RECEIVED'` to prevent duplicate ledger records.

5. **Client-Side Atomic Submission (`index.html`):**
   - `submitRestock`: Form generation binds a stable idempotency key (`RESTOCK-<timestamp>-<random>`).
   - Disables modal buttons and awaits server commit before updating DOM or closing dialogs.
   - Retains form inputs and reports error clearly on failure.

---

## 2. Acceptance Criteria Verification Matrix

| Criterion ID | Requirement | Test Command | Outcome | Evidence |
| :---: | :--- | :--- | :---: | :--- |
| **TX-01** | Receive 10 / Issue 3 / Receive-confirm: remaining stock = 7, no double deduct | `node tests/stock_transaction_idempotency_test.js` | **PASS** | Initial 0 $\rightarrow$ Receive 10 $\rightarrow$ Issue 3 $\rightarrow$ Confirm: stock = 7; duplicate confirm yields 7 |
| **TX-02** | Same key retry / double click creates single effect | `node tests/stock_transaction_idempotency_test.js` | **PASS** | Second request with same key returns cached commit result; stock unchanged |
| **TX-03** | Same key with different payload rejected before mutation | `node tests/stock_transaction_idempotency_test.js` | **PASS** | Throws `IDEMPOTENCY_CONFLICT` / `PAYLOAD_CONFLICT`; zero writes performed |
| **TX-04** | Concurrent overdraw does not produce negative stock | `node tests/stock_transaction_idempotency_test.js` | **PASS** | First user draws 8/10; second user drawing 8/2 fails with `INSUFFICIENT_STOCK`; stock = 2 |
| **TX-05** | Multi-line failure before commit writes zero lines | `node tests/stock_transaction_idempotency_test.js` | **PASS** | 2 valid lines + 1 overdrawing line $\rightarrow$ entire transaction rejected; zero lines written |
| **TX-06** | Fault injection after each write step has documented recovery | `node tests/stock_transaction_idempotency_test.js` | **PASS** | Verified via `FAILURE_RECOVERY_TABLE.csv` and atomic lock recovery |
| **TX-07** | Timeout after commit detects committed transaction | `node tests/stock_transaction_idempotency_test.js` | **PASS** | Retrying same key fetches committed state from `16_Idempotency_Log` / Cache |
| **TX-08** | Invalid quantity/status/year/actor has zero writes | `node tests/stock_transaction_idempotency_test.js` | **PASS** | Negative qty, invalid status, closed FY rejected before any sheet write |
| **TX-09** | Duplicate issue/receive-confirm generates no extra ledger rows | `node tests/stock_transaction_idempotency_test.js` | **PASS** | Re-confirming an already received requisition throws `INVALID_STATE`, zero ledger rows added |
| **TX-10** | Concurrent audit verification produces no chain corruption | `node tests/stock_transaction_idempotency_test.js` | **PASS** | `hrtVerifyAuditIntegrity_` is strictly read-only; multiple reads yield identical valid hash chain |
| **TX-11** | Same-length different payloads yield different hashes | `node tests/stock_transaction_idempotency_test.js` | **PASS** | `qty: 5` and `qty: 6` produce distinct SHA-256 hashes; key collision rejected |
| **TX-12** | Key order variation yields identical canonical hash | `node tests/stock_transaction_idempotency_test.js` | **PASS** | `{a:1, b:2}` and `{b:2, a:1}` produce identical hash; token change ignored |
| **TX-13** | Missing/throwing hash function aborts mutation without fallback | `node tests/stock_transaction_idempotency_test.js` | **PASS** | Missing SHA-256 fails closed with `HASH_UNAVAILABLE`; zero writes occur |
| **TX-14** | Approve with `req_id` or `req_no` updates canonical lines | `node tests/stock_transaction_idempotency_test.js` | **PASS** | Approval via `req_no` resolves canonical UUID; updates line status and returns real UUID |
| **TX-15** | Approved qty 0 / reduced qty never issues requested qty | `node tests/stock_transaction_idempotency_test.js` | **PASS** | Line approved for 0 issues 0; missing approval throws `APPROVAL_INCOMPLETE` |

---

## 3. Regression Suite Status

- **Test Suite:** `tests/stock_transaction_idempotency_test.js`
- **Total Tests Executed:** 15 / 15
- **Pass Rate:** **100% (15 Passed, 0 Failed, 0 Skipped)**
- **Master Regression Runner:** `node scripts/run_all_tests.js` (14/14 suites PASS, 162/162 tests PASS)
