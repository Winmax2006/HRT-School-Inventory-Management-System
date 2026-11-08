# HRT Inventory Management System — Prompt 14 Completion Report
**Document Version:** v1.1  
**Target Candidate Pipeline:** `v2.7.0-rc.5` (Base) $\rightarrow$ Working State for `v2.7.0-rc.6`  
**Historical Baseline:** `v2.6.0` (Last Verified Pre-Clean File Baseline)  
**Organization:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)  
**Date:** 28 ตุลาคม 2569

---

## 1. Executive Summary

Prompt 14 establishes complete contract alignment between client facades (`index.html`, `MiniUI.html`, `frontend/main/App.js`), public backend wrappers (`Code.gs`), and private domain handlers (`Read.gs`, `Write.gs`, `Audit.gs`, `Config.gs`) mediated through the secure `ApiRouter` (`Api.gs`).

Prior to Prompt 14:
- The dashboard metrics calculation contained a subtle valuation bug where `filteredValue = 0` (e.g. for an empty department filter) incorrectly fell back to `totalUniverseValue` (the whole school stock value). Furthermore, stock unit counts and SKU counts were conflated, and inventories exceeding 500 items were truncated before computing critical/low stock metrics.
- The QR code resolver failed to handle the standard `qr_data` alias, and revoked or non-existent tokens lacked distinct business error semantics.
- Requisition submission in `Code.gs` mistakenly attempted to inspect string IDs and route them to officer review (`requisitions.review`), causing requesters to receive `FORBIDDEN` or corrupting requisition states.
- Client-side transport in `ApiServiceCore` did not differentiate between business rejections (`success: false`), network disconnects, and empty datasets, resolving failed business operations as successful responses. Timeouts also risked duplicate mutation key generation.
- Settings round-trip failed to preserve boolean `false` and number `0`, converting them to empty strings or default fallbacks, and lacked optimistic concurrency checks.

All Prompt 14 objectives have been implemented, tested, and verified:
1. **Canonical Envelopes & Convenience Aliases:** Standardized response envelope with non-destructive convenience aliases (`requisitions`, `audit`, `logs`, `users`, `fsn`, `ledger`, `kpis`, `metrics`, `settings`).
2. **Accurate Dashboard KPI Metrics:** Explicit universe metrics calculation across all items regardless of pagination; fixed `filteredValue=0` fallback; separated SKU count from physical unit counts.
3. **Rigorous QR Resolution:** Supported `qr_data` alias; handled `ITEM`, `WAREHOUSE`, `TRACKING`, and `CATALOG`; strictly rejected `REVOKED` tokens with `QR_REVOKED` and non-existent tokens with `NOT_FOUND` without opening underlying resources.
4. **Decoupled Requisition Lifecycle:** Requester submission strictly creates requisitions; officer review remains an isolated workflow requiring reviewer privileges.
5. **Differentiated Client Transport:** `ApiServiceCore` intercepts `success: false` as business rejections (`err.isBusinessError = true`); handles timeouts cleanly with `clearTimeout` and `UNKNOWN_OUTCOME` to prevent premature retry key recreation.
6. **Lossless Settings Round-Trip:** Mapped frontend field aliases (`school_org` $\rightarrow$ `organization`, `officer_name` $\rightarrow$ `signatory_approver_name`, etc.); preserved boolean `false` as `'false'` and number `0` as `'0'`; enforced `expectedRevisionId` concurrency checks.
7. **Complete Deliverables Handed Over:** Generated `RPC_CONTRACT.csv`, `DTO_EXAMPLES.json`, updated `ACCEPTANCE_MATRIX.csv`, updated `PROGRESS.md`, and passed all 12 acceptance criteria in `tests/rpc_contract_test.js`.

---

## 2. Source Code Modifications & Exact Diff Summary

### 2.1 `Config.gs`
- Added sheet alias `'qr_registry': ['14_QR_Registry', 'QR_Registry', 'qr_registry']` to `CONFIG.SHEET_ALIASES` to ensure QR management can resolve the registry sheet across casing variations.

### 2.2 `Read.gs`
- **`hrtGetItems_`**:
  - Implemented full-universe metric aggregation (`filteredQuantity`, `filteredCriticalCount`, `filteredLowCount`, `filteredNormalCount`, `totalUniverseQuantity`) across the entire filtered array before applying the 500-item pagination slice.
  - Calculated Pareto ABC tiering (`countA`, `countB`, `countC`) across the full filtered universe.
- **`hrtGetDashboardMetrics_`**:
  - Replaced ambiguous truthy checks `(filteredValue || totalUniverseValue)` with explicit type verification `(typeof itemsRes.filteredValue === 'number' && !isNaN(itemsRes.filteredValue))`.
  - Preserved `filteredValue = 0` as zero without falling back to `totalUniverseValue`.
  - Added strict validation throwing `INVALID_METRIC_DATA` when metric data is missing or corrupted.
  - Explicitly populated `totalItems`, `totalSKUs`, `totalStockUnits`, `totalValue`, `filteredValue`, `totalUniverseValue`, `normalCount`, `lowCount`, `criticalCount`.
- **`hrtGetRequisitions_` & `hrtGetRequisitionDetail_`**:
  - Enriched output DTO with `source` (`CENTRAL_WEB` or `MINI_QR`), `fiscal_year`, `total_items`, `urgency`, and `required_date`.
  - Cross-referenced line items with the current master item catalog to supply `item_name`.
- **`hrtResolveQr_`**:
  - Supported `payload.qr_data` and `payload.qrData` aliases alongside `payload.qr_token`.
  - Checked `14_QR_Registry` for revoked status; throws `QR_REVOKED` without opening underlying resources.
  - Returned structured resolution for `ITEM`, `WAREHOUSE`, `TRACKING`, and `CATALOG`.

### 2.3 `Write.gs`
- **`hrtUpdateSettings_` & `hrtUpdateSettingsSection_`**:
  - Enforced optimistic concurrency: compared `payload.expectedRevisionId` with current revision ID, throwing `CONCURRENCY_CONFLICT` on mismatch.
  - Implemented field alias dictionary (`school_org` $\rightarrow$ `organization`, `officer_name` $\rightarrow$ `signatory_approver_name`, etc.) and flattened nested section objects into flat key-value pairs for `00_Settings`.
  - Strictly preserved `false` as string `'false'`, `0` as string `'0'`, and empty strings without converting to fallback defaults.

### 2.4 `Api.gs`
- **`normalizeAndValidateAliases`**:
  - Added normalization for QR requests: `payload.qr_data` / `payload.qrData` mapped to `payload.qr_token`.
- **`routeRequest`**:
  - Standardized response envelope: `{ success: true, action: action, data: result, requestId: ..., timestamp: ... }`.
  - Appended controlled convenience aliases based on action category (`requisitions`, `audit`, `logs`, `users`, `fsn`, `ledger`, `kpis`, `metrics`, `settings`) without destructive `Object.assign` overwrites.

### 2.5 `Code.gs`
- **`apiSubmitRequisition`**:
  - Decoupled from officer review; strictly routes to `requisitions.create`.
  - Added validation: throws `VALIDATION_ERROR` if called with a string ID or without line items.
- **`apiGetDashboardKPIs`**:
  - Explicitly mapped KPI metrics: `totalSKU`, `totalStockQty`, `totalAssetValue`, `lowStockCount`, `criticalStockCount`, `healthyCount`.
  - Attached both `res.kpis` and `res.metrics` to the response envelope.

### 2.6 `index.html` & `MiniUI.html`
- **`ApiServiceCore`**:
  - Intercepted responses where `res.success === false`: rejected the promise and flagged `err.isBusinessError = true` to prevent false positive toast alerts.
  - Handled timeouts: called `clearTimeout(timer)` to clean up pending event listeners, and set `err.outcome = 'UNKNOWN_OUTCOME'` for write operations to prevent duplicate retry key creation.
- **`RequisitionApi`**:
  - Added `getRequisitions(filters)` to support queue loading across interfaces.

---

## 3. Acceptance Criteria Verification Log (RPC-01 to RPC-12)

| Criteria | Expected Behavior | Actual Verified Result | Status |
| :--- | :--- | :--- | :---: |
| **RPC-01** | Every referenced RPC has target/action & real signature in deploy allowlist | All 32 frontend mapped actions across `index.html` and `MiniUI.html` exist in backend `ACTION_REGISTRY`; all 135 registered actions resolve to allowlisted private business handlers in `resolveAllowlistedHandler`. | **PASS** |
| **RPC-02** | requests/audit/users/fsn render complete synthetic datasets with standardized envelopes | Response envelopes provide standardized `success`/`action`/`data`/`requestId`/`timestamp` structure alongside named convenience aliases (`requisitions`, `audit`, `logs`, `users`, `fsn`) without unconstrained `Object.assign` property collisions. | **PASS** |
| **RPC-03** | KPI fixture with known baseline produces exact match without wrong-field fallback | `apiGetDashboardKPIs` constructs `res.kpis` and `res.metrics` explicitly mapping `totalSKU` to `totalSKUs`, `totalStockQty` to `totalStockUnits`, and `totalAssetValue` to `totalValue` without wrong-field fallback. | **PASS** |
| **RPC-04** | QR request/response properly handles valid/invalid/revoked tokens | `hrtResolveQr_` supports `qr_data` alias, correctly resolves `ITEM`, `WAREHOUSE`, `TRACKING`, and `CATALOG` targets, and strictly rejects `REVOKED` tokens with `QR_REVOKED` and missing tokens with `NOT_FOUND` without opening underlying resources. | **PASS** |
| **RPC-05** | Requester submit does not dispatch to officer review and does not create duplicate entries | `apiSubmitRequisition` strictly routes to `requisitions.create`; rejects string `reqId` arguments with `VALIDATION_ERROR` to prevent requester submission from being mistakenly processed as officer review. | **PASS** |
| **RPC-06** | `success:false`, transport failure, and empty results are distinctly differentiated | `ApiServiceCore` in `index.html` and `MiniUI.html` differentiates business `success:false` (`err.isBusinessError = true`), transport/network failures, and empty successful result arrays. | **PASS** |
| **RPC-07** | Timeout clears active timer and sets `UNKNOWN_OUTCOME` without auto-generating new retry key | `ApiServiceCore` clears pending timer on timeout with `clearTimeout(timer)` and flags `err.outcome = 'UNKNOWN_OUTCOME'` for write operations, preventing premature idempotent retry key regeneration. | **PASS** |
| **RPC-08** | Direct facades and RPC gateway return identical payload, envelope, and permission semantics | Direct facades in `Code.gs` (`apiGetDashboardKPIs`, `apiSubmitRequisition`, `HRT_rpc`, `apiCall`) route through `ApiRouter.routeRequest`, sharing identical permission enforcement and payload envelopes. | **PASS** |
| **RPC-09** | KPI `filteredValue=0` does not fall back to entire database, and missing data is rejected | `hrtGetDashboardMetrics_` strictly checks `typeof itemsRes.filteredValue === 'number'` and `!isNaN`; `filteredValue=0` does not fall back to `totalUniverseValue`; missing metric values throw `INVALID_METRIC_DATA`. | **PASS** |
| **RPC-10** | KPI counts and totals reflect the entire filtered universe when dataset > 500 items | `hrtGetItems_` calculates summary metrics (`filteredQuantity`, `countA`, `countB`, `countC`, `lowStockCount`, `criticalStockCount`, `normalCount`) across the entire filtered dataset before applying the 500-item pagination limit. | **PASS** |
| **RPC-11** | Settings load $\rightarrow$ edit $\rightarrow$ save $\rightarrow$ reload round-trip preserves boolean `false` and number `0` | `hrtUpdateSettings_` and `hrtUpdateSettingsSection_` map UI field aliases, enforce optimistic concurrency via `expectedRevisionId`, and preserve boolean `false` as `'false'` and number `0` as `'0'`. | **PASS** |
| **RPC-12** | Requisition DTO returns required user-facing fields and source lineage | `hrtGetRequisitions_` and `hrtGetRequisitionDetail_` return enriched requisition DTOs with `source` (`CENTRAL_WEB`/`MINI_QR`), `fiscal_year`, `total_items`, `urgency`, `required_date`, and resolved `item_name` from master items. | **PASS** |

---

## 4. Master Regression Suite Execution

All 11 automated test suites in the HRT Inventory repository were executed synchronously via `scripts/run_all_tests.js`:

```text
==================================================
RUNNING COMPLETE TEST SUITE REGRESSION (11 SUITES)
==================================================

>>> Running: tests/regression_test_suite.js               ... PASSED (11/11)
>>> Running: tests/p1_p2_contract_lifecycle_test.js       ... PASSED (10/10)
>>> Running: tests/p3_miniui_critical_test.js             ... PASSED (11/11)
>>> Running: tests/p4_settings_important_test.js          ... PASSED (10/10)
>>> Running: tests/p6_acceptance_suite.js                 ... PASSED (10/10)
>>> Running: tests/p7_settings_comprehensive_test.js      ... PASSED (10/10)
>>> Running: tests/p8_backend_sheets_architecture_test.js ... PASSED (10/10)
>>> Running: tests/p9_clean_separation_test.js            ... PASSED (10/10)
>>> Running: tests/p11_auth_miniui_rpc_test.js            ... PASSED (22/22)
>>> Running: tests/security_surface_test.js               ... PASSED (7/7)
>>> Running: tests/rpc_contract_test.js                   ... PASSED (12/12)

==================================================
ALL 11 TEST SUITES PASSED 100%! (123/123 TESTS PASS)
==================================================
```

---

## 5. Artifacts and Deliverables Summary

1. **`docs/repair/RPC_CONTRACT.csv`**: Contains complete specification of all 32 RPC endpoints, including consumer calling conventions, public facades, router actions, argument types, canonical payload formats, private domain handlers, return data shapes, RBAC permission codes, and transactional side effects.
2. **`docs/repair/DTO_EXAMPLES.json`**: Comprehensive JSON contract fixtures illustrating concrete request/response payloads for:
   - `dashboard_kpis_dto`
   - `requisition_list_dto`
   - `requisition_detail_dto`
   - `item_list_dto`
   - `audit_trail_dto`
   - `qr_resolve_item_dto`
   - `qr_resolve_warehouse_dto`
   - `qr_resolve_tracking_dto`
   - `qr_resolve_revoked_dto`
   - `qr_resolve_invalid_dto`
   - `settings_dto`
   - `error_envelope_dto`
3. **`tests/rpc_contract_test.js`**: 12 dedicated regression tests asserting all RPC criteria (RPC-01 through RPC-12).
4. **`docs/repair/ACCEPTANCE_MATRIX.csv`**: Updated rows RPC-01 through RPC-12 with status `PASS`, exact verification commands, test fixture paths, source SHA-256 hashes, test environment specifications, and blocker notes.
5. **`docs/repair/PROGRESS.md`**: Updated tracking progress reflecting Prompt 14 completion, 123/123 tests passing, and updated deployment blocker register.

---

## 6. Handover to Prompt 15 (Google Authentication, Users Registry & Dynamic RBAC)

Prompt 14 has solidified the RPC transport, data shapes, and error envelopes. The system is in a clean, robust, and verified state ready for **Prompt 15**:
- **Authentication**: Deep link & initial load auth guard in `index.html` and `MiniUI.html`; OAuth ID token validation; rejection of invalid, expired, or audience-mismatched tokens.
- **User Registry**: Authoritative email lookup against `01_Users`; rejection of unknown, suspended, or inactive users; enforcement of email as username.
- **Dynamic RBAC**: Enforcement of the 6 canonical roles (`ADMIN`, `DIRECTOR`, `OFFICER`, `TEACHER`, `STAFF`, `VIEWER`) across all 135 actions; rejection of client-side role escalation attempts.
- **Session & Idempotency**: Verification of server-side session lifetimes and mutation idempotency keys.
