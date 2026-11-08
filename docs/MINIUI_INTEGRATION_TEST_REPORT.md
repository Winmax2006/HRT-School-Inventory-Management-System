# HRT Inventory System — MiniUI Integration & Verification Test Report

**Document Version:** 1.0.0  
**Target Release:** v2.7.0-rc.5  
**Baseline:** v2.6.0 | Commit `dd000c0`  
**Date:** 2026-10-28  
**Institution:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)  

---

## 1. Executive Summary

The mobile-first requisition interface has been integrated into the production HRT Inventory System as `MiniUI.html`. All synthetic storage keys (e.g. `hrt-miniui-demo-v1`) and mock approval engines from the desktop preview prototype (`HRT_MiniUI_Preview.html`) have been removed.

`MiniUI.html` is routed directly through Google Apps Script's `doGet(e)` entrypoint when the URL query parameter contains `?view=mini`, sharing the identical backend, permissions, and database sheets as the central web application (`index.html`).

---

## 2. Architectural Comparison: Prototype vs Production MiniUI

| Dimension | Prototype (`HRT_MiniUI_Preview.html`) | Production (`MiniUI.html`) |
|---|---|---|
| **Data Storage** | Local browser `localStorage` (`hrt-miniui-demo-v1`) | Google Sheets SSOT (`02_Master_Items`, `04_Requisitions`, `07_Stock_Ledger`) |
| **Authentication** | Mock client-side toggle | Institutional Google Authentication via `apiGetCurrentUser` |
| **Requisition Lifecycle** | In-browser simulated status advancement | Server-authoritative lifecycle (`SUBMITTED` $\rightarrow$ `REVIEWED` $\rightarrow$ `APPROVED` $\rightarrow$ `ISSUED` $\rightarrow$ `RECEIVED`) |
| **Stock Deduction** | Client-side immediate deduction in browser DB | **Decoupled**: Stock balance remains untouched at submission; mutated **only** at physical stock issuance (`apiIssueStock`) |
| **Receipt Confirmation** | Client-side status edit | Chained audit log mutation via `apiConfirmReceipt` |
| **QR Code Resolver** | Static hardcoded lookup table | Server resolver via `apiResolveQr` querying `11_QR_Registry` & `02_Master_Items` |
| **Routing** | Standalone file | Embedded in Apps Script, accessed via `?view=mini` |

---

## 3. Comprehensive Verification Test Results

### Test Suite 1: Routing & Entrypoint Verification
- **Test 1.1: Default Route (`doGet({})`)**:
  - *Expected*: Renders `index.html` (Central Desktop Web App).
  - *Result*: **PASS**.
- **Test 1.2: MiniUI Route (`doGet({ parameter: { view: 'mini' } })`)**:
  - *Expected*: Renders `MiniUI.html` (Mobile Requisition Web App) with responsive viewport meta tag.
  - *Result*: **PASS**.

### Test Suite 2: Authentication & Login-First Guard
- **Test 2.1: Initial State (`CHECKING`)**:
  - *Expected*: Displays institutional header and spinner; hides catalog.
  - *Result*: **PASS**.
- **Test 2.2: Unauthenticated State**:
  - *Expected*: Displays Google Sign-In prompt; blocks access to catalog.
  - *Result*: **PASS**.
- **Test 2.3: Authenticated Active User**:
  - *Expected*: Renders catalog and populates user info (`name`, `email`, `role`, `department`).
  - *Result*: **PASS**.
- **Test 2.4: Suspended User**:
  - *Expected*: Displays access denied alert; halts data fetching.
  - *Result*: **PASS**.

### Test Suite 3: Catalog & QR Code Resolution
- **Test 3.1: Catalog Loading**:
  - *Expected*: Fetches active items from `02_Master_Items` via `apiGetItems()`.
  - *Result*: **PASS**.
- **Test 3.2: Category & Search Filtering**:
  - *Expected*: Dynamically filters by category pills and keyword query.
  - *Result*: **PASS**.
- **Test 3.3: QR Resolution (`apiResolveQr`)**:
  - *Expected*: Resolves `ITEM:OFF-001` or scanned token into item record and opens detail modal.
  - *Result*: **PASS**.

### Test Suite 4: Cart & Requisition Submission
- **Test 4.1: Cart Quantity Management**:
  - *Expected*: Accurately tracks item counts with minimum 1 and maximum limited to available stock.
  - *Result*: **PASS**.
- **Test 4.2: Requisition Submission (`apiCreateRequisition`)**:
  - *Expected*: Creates record in `04_Requisitions` and lines in `05_Requisition_Items` with status `SUBMITTED`, `source: 'MINI_QR'`.
  - *Result*: **PASS**.
- **Test 4.3: Decoupled Stock Integrity Check**:
  - *Expected*: Stock balance in `02_Master_Items` and `07_Stock_Ledger` remains **unchanged** upon submission.
  - *Result*: **PASS**.

### Test Suite 5: Requisition Tracking & Receipt Confirmation
- **Test 5.1: Requisition History Loading**:
  - *Expected*: Queries user's requisitions via `apiGetRequisitions({ user_id: caller.id })`.
  - *Result*: **PASS**.
- **Test 5.2: Requisition Cancellation (`apiCancelRequisition`)**:
  - *Expected*: Permits cancelling requests in `SUBMITTED` or `DRAFT` status.
  - *Result*: **PASS**.
- **Test 5.3: Receipt Confirmation (`apiConfirmReceipt`)**:
  - *Expected*: Changes status from `ISSUED` to `RECEIVED` and logs audit entry.
  - *Result*: **PASS**.
