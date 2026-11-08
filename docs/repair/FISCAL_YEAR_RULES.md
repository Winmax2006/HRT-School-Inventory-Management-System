# HRT Inventory System — Fiscal Year Rules & Lifecycle Specification
**Document Version:** v1.1  
**Organization:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)  
**Timezone:** `Asia/Bangkok` (UTC+07:00)  
**Standard:** Thai Government Fiscal Year Lifecycle & Official Valuation  

---

## 1. Temporal Definition & Boundaries

### 1.1 Thai Fiscal Year Structure
Under Thai Government and Ministry of Education accounting standards, the fiscal year spans from **October 1** of the preceding calendar year to **September 30** of the nominal fiscal year.

$$\text{Fiscal Year (พ.ศ.) } Y = \text{Calendar Year (ค.ศ.) } (Y - 543)$$
$$\text{Start Boundary (Inclusive): } 1 \text{ October } (Y - 544) \text{ at } 00:00:00.000\text{ (+07:00)}$$
$$\text{End Boundary (Inclusive): } 30 \text{ September } (Y - 543) \text{ at } 23:59:59.999\text{ (+07:00)}$$
$$\text{End Boundary (Exclusive): } 1 \text{ October } (Y - 543) \text{ at } 00:00:00.000\text{ (+07:00)}$$

### 1.2 Boundary Mapping Table
| Fiscal Year (พ.ศ.) | Christian Year (CE) | Start Instant (Bangkok UTC+7) | End Instant (Inclusive UTC+7) | Epoch Start (ms) | Epoch End (ms) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **2567** | 2024 | `2023-10-01T00:00:00.000+07:00` | `2024-09-30T23:59:59.999+07:00` | 1696093200000 | 1727715599999 |
| **2568** | 2025 | `2024-10-01T00:00:00.000+07:00` | `2025-09-30T23:59:59.999+07:00` | 1727715600000 | 1759247999999 |
| **2569** | 2026 | `2025-10-01T00:00:00.000+07:00` | `2026-09-30T23:59:59.999+07:00` | 1759248000000 | 1790780399999 |
| **2570** | 2027 | `2026-10-01T00:00:00.000+07:00` | `2027-09-30T23:59:59.999+07:00` | 1790780400000 | 1822312799999 |

---

## 2. Active Transaction Year vs. Viewing Year Policy

1. **Server-Authoritative Active Year:**
   - The active transaction year is stored in `01_Settings` / `12_Fiscal_Years` and managed exclusively on the server (`getActiveTransactionYear()`).
   - All mutation operations (`isWrite: true`: receive, issue, approve, create requisition, adjust) MUST target the server's active transaction year.
   - Any client payload attempting to specify a closed or non-active fiscal year for write operations is rejected with `CLOSED_FISCAL_YEAR`.

2. **Isolated Historical Viewing Year:**
   - Read operations (`isWrite: false`: `items.list`, `requisitions.list`, `reports.get`, `audit.get`) allow specifying a historical viewing year (`payload.fiscalYear`).
   - Viewing an old or closed fiscal year NEVER mutates server state or switches the active transaction year.
   - Cache keys incorporate the viewing year (e.g. `items_<FY>_<User>`) to prevent cache leakage across fiscal boundaries.

---

## 3. Physical Count & Year-End Verification Policy

1. **Real Verified Physical Count:**
   - Physical count values in `13_Year_End_Audits` MUST originate from physical inspection submitted by appointed inventory auditors (`กรรมการตรวจสอบพัสดุประจำปี`).
   - The system NEVER automatically forces `count_qty = book_stock` or zeroes out `variance = 0`.

2. **Persistence of Variance:**
   - If physical count differs from book stock ($\text{variance} = \text{count\_qty} - \text{book\_stock} \ne 0$), the variance is preserved in official audit records.
   - Discrepancies are NOT erased upon fiscal year closure.
   - Physical stock corrections must proceed through authorized adjustment transactions (`ADJUST`) referencing the official inspection report, creating an immutable audit trail.

---

## 4. Preconditions for Fiscal Year Closure (`hrtCloseFiscalYear_`)

A fiscal year cannot be closed unless all of the following preconditions pass under exclusive `LockService.getScriptLock()`:
1. **Authorized Role:** Caller must have `ADMIN` or `DIRECTOR` role.
2. **Current State:** The target year must currently be in `ACTIVE` status in `12_Fiscal_Years`. Closing an already `CLOSED` year is rejected (`INVALID_STATE`).
3. **No Unresolved Requisitions:** All requisitions for the target year in `07_Requisitions` must be in a terminal state (`RECEIVED`, `CANCELLED`, or `REJECTED`). Any requisition in `SUBMITTED`, `PENDING_APPROVAL`, `REVIEWED`, or `APPROVED` blocks closure (`UNRESOLVED_REQUISITIONS`).
4. **Physical Count Completeness:** Verified physical count records must be registered in `13_Year_End_Audits`.

---

## 5. Year-End Rollover & Opening Balance Continuity

1. **Snapshot Invariant:**
   - Snapshots in `13_Year_End_Audits` capture frozen book quantity, physical count, variance, condition, and auditor names at the cut-off point (30 September).
   - Close-year retries do NOT append duplicate snapshot rows (idempotent snapshot).

2. **Mathematical Balance Continuity (SSOT):**
   - The closing book quantity ($\text{BookStock}_{Y}$) of the closed year $Y$ becomes the exact opening balance ($\text{OpeningQty}_{Y+1}$) of the new year $Y+1$.
   - A single `OPENING` transaction is posted to `10_Stock_Ledger` for year $Y+1$ with $\text{qtyIn} = \text{BookStock}_{Y}$ and $\text{docRef} = \text{ROLLOVER-}Y\rightarrow(Y+1)$.
   - Duplicate opening movements are prevented on retry via ledger index checks.
