# HRT Inventory System — Transaction Boundaries & Mutex Specification
**Document Version:** v1.1  
**Organization:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)  
**Standard:** Double-Entry Ledger, Script-Wide Mutex & Decoupled Stock Deduction  

---

## 1. Core Transaction Boundaries

All mutations in the HRT Inventory System execute within explicit, atomic critical sections protected by Google Apps Script `LockService.getScriptLock()`:

```
[Incoming Request]
        │
        ▼
[ApiRouter Gateway]
        │
        ├── 1. Param Normalization & Alias Validation
        ├── 2. Cryptographic Authentication & RBAC Check
        ├── 3. Server-Determined Actor & Fiscal Year Bound
        ├── 4. Idempotency Check & In-Flight Reservation
        │
        ▼
[Handler Critical Section (LockService.getScriptLock)]
        │
        ├── A. Acquire Exclusive Script Lock (timeout 30s/60s)
        ├── B. Re-Read Authoritative State from Sheets
        ├── C. Validate Preconditions & State Transitions
        ├── D. Mutate Tables (Master Items, Requisitions, Items)
        ├── E. Append Double-Entry Movements (Stock Transactions & Ledger)
        ├── F. Append Audit Trail Log with Cryptographic Hash Chain
        │
        ▼
[Release Lock (finally block)]
        │
        ▼
[Record Committed Idempotency in Cache & Sheet]
        │
        ▼
[Return Canonical API Response Envelope]
```

---

## 2. Decoupled Stock Deduction (SSOT Invariant)

1. **Requisition Creation (`hrtCreateRequisition_`):**
   - Appends header to `07_Requisitions` with status `SUBMITTED`.
   - Appends line items to `08_Requisition_Items` with requested quantities.
   - **ZERO stock deduction** occurs at submission time.

2. **Requisition Approval (`hrtApproveRequisition_`):**
   - Resolves canonical `canonicalReqId`.
   - Validates transition from `SUBMITTED` or `REVIEWED` to `APPROVED`.
   - Enforces self-approval prohibition.
   - Updates approved line quantities in `08_Requisition_Items`.
   - **ZERO stock deduction** occurs at approval time.

3. **Stock Issuance (`hrtIssueStock_`):**
   - **THIS IS THE EXCLUSIVE POINT OF PHYSICAL DEDUCTION.**
   - Re-reads stock under ScriptLock; validates stock $\ge$ approved quantity for all positive items.
   - Deducts physical stock in `03_Master_Items`.
   - Posts `ISSUE` double-entry movements to `09_Stock_Transactions` and `10_Stock_Ledger`.
   - Updates requisition status to `ISSUED`.

4. **Physical Receipt Confirmation (`hrtConfirmReceipt_`):**
   - Only authorized requester (or ADMIN) can confirm.
   - Transitions status from `ISSUED` to `RECEIVED`.
   - **ZERO stock deduction** occurs at receipt confirmation (prevents double deduction).
