# HRT Inventory System — RPC Compatibility Matrix & Protocol Specification

**Document Version:** 1.0.0  
**Target Release:** v2.7.0-rc.5  
**Current Baseline Git Commit:** `dd000c0077e506093b5cc316fbd77a963656eb65`  
**Date:** 2026-10-28  
**Institution:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)  

---

## 1. Problem Statement & Root Cause

The frontend interface suffered from intermittent unhandled exceptions:
```
TypeError: google.script.run.withSuccessHandler(...).withFailureHandler(...)[fnName] is not a function
```

### Root Cause Analysis:
1. **Unregistered Direct GAS Functions**: `ApiServiceCore.call(fnName, ...args)` presumed every requested `fnName` corresponded 1-to-1 with a top-level function exported in `Code.gs`.
2. **Missing Exported Wrappers in `Code.gs`**:
   - `apiGetDashboardKPIs` (Code.gs had `apiGetDashboardMetrics`)
   - `apiSubmitRequisition` (Code.gs had `apiCreateRequisition` / `apiReviewRequisition`)
   - `apiGetItemLedger` (Ledger reader was missing from top-level `Code.gs`)
   - `apiReconcileBalance` (`apiReconcileStockBalances` existed in `Write.gs` but was not exposed in `Code.gs`)
   - `apiGetAuditTrail` (`apiGetAuditLogs` existed in `Audit.gs` and `Code.gs`)
   - `apiUpdateSettingsSection` (`apiUpdateSettingsSection` was in `Write.gs` and `Api.gs` but omitted from `Code.gs`)
3. **Absence of Synchronous Exception Trap**: `runner[fnName](...args)` was called without a `try/catch` block. When `runner[fnName]` evaluated to `undefined`, a synchronous runtime error halted JavaScript execution, leaving the request timeout timer running indefinitely.
4. **Direct Bridge Invocations**: Certain UI components (e.g. `changeFiscalYear` in `index.html:13134`) called `google.script.run.apiGetItems` directly, bypassing the unified transport gateway.

---

## 2. Comprehensive RPC Contract Mapping

| # | Frontend Call (`fnName`) | Backend Action / GAS Function | Payload Contract | Response Shape | Underlying Sheet(s) | Min Role Guard | Resolution Strategy |
|---|---|---|---|---|---|---|---|
| 1 | `apiGetCurrentUser` | `users.current` / `apiGetCurrentUser` | `none` | `{ success: true, user: UserProfile }` | `01_Users` | `REQUESTER` | Supported directly in `Code.gs` and `Api.gs`. |
| 2 | `apiGetUsers` | `users.list` / `apiGetUsers` | `none` | `{ success: true, users: UserProfile[] }` | `01_Users` | `ADMIN` | Supported directly. |
| 3 | `apiCreateUser` | `users.create` / `apiCreateUser` | `{ email, name, role, department }` | `{ success: true, user_id, email, role }` | `01_Users`, `08_Audit_Logs` | `ADMIN` | Updated to enforce email as username. |
| 4 | `apiUpdateUser` | `users.update` / `apiUpdateUser` | `{ user_id, role, department, status }` | `{ success: true, user_id, status }` | `01_Users`, `08_Audit_Logs` | `ADMIN` | Enforces Last-Admin Protection. |
| 5 | `apiSuspendUser` | `users.suspend` / `apiSuspendUser` | `{ user_id }` | `{ success: true, user_id, status: 'SUSPENDED' }` | `01_Users`, `08_Audit_Logs` | `ADMIN` | Enforces Last-Admin Protection. |
| 6 | `apiGetItems` | `items.list` / `apiGetItems` | `{ category, query, fiscal_year }` | `{ success: true, items: Item[] }` | `02_Master_Items` | `REQUESTER` | Supported directly. |
| 7 | `apiGetItemDetail` | `items.get` / `apiGetItemDetail` | `{ item_code }` or string | `{ success: true, item: ItemDetail }` | `02_Master_Items`, `03_FSN_Catalog` | `REQUESTER` | Supported directly. |
| 8 | `apiCreateItem` | `items.create` / `apiCreateItem` | Item payload | `{ success: true, item_code }` | `02_Master_Items`, `08_Audit_Logs` | `OFFICER` | Supported directly. |
| 9 | `apiUpdateItem` | `items.update` / `apiUpdateItem` | Item update payload | `{ success: true, item_code }` | `02_Master_Items`, `08_Audit_Logs` | `OFFICER` | Supported directly. |
| 10 | `apiGetDashboardKPIs` | `dashboard.metrics` / `apiGetDashboardMetrics` | `filters` | `{ success: true, kpis: KPIs, metrics: Metrics }` | `02_Master_Items`, `04_Requisitions` | `REQUESTER` | **NEW WRAPPER**: Defined in `Code.gs` and mapped in `Api.gs`. |
| 11 | `apiGetDashboardMetrics` | `dashboard.metrics` / `apiGetDashboardMetrics` | `filters` | `{ success: true, metrics: Metrics }` | `02_Master_Items`, `04_Requisitions` | `OFFICER` | Supported directly. |
| 12 | `apiCreateRequisition` | `requisitions.create` / `apiCreateRequisition` | `{ items, purpose, urgency, dept }` | `{ success: true, req_id, req_no }` | `04_Requisitions`, `05_Requisition_Items` | `REQUESTER` | Supported directly. |
| 13 | `apiSubmitRequisition` | `requisitions.submit` / `apiSubmitRequisition` | `{ requisition_id }` or items | `{ success: true, req_id }` | `04_Requisitions`, `05_Requisition_Items` | `REQUESTER` | **NEW WRAPPER**: Normalizes reqId and invokes `apiReviewRequisition` or `apiCreateRequisition`. |
| 14 | `apiGetRequisitions` | `requisitions.list` / `apiGetRequisitions` | `{ user_id, status, fiscal_year }` | `{ success: true, requisitions: Req[] }` | `04_Requisitions`, `05_Requisition_Items` | `REQUESTER` | Supported directly. |
| 15 | `apiReviewRequisition` | `requisitions.review` / `apiReviewRequisition` | `{ requisition_id, note }` | `{ success: true, req_id, status: 'REVIEWED' }` | `04_Requisitions`, `08_Audit_Logs` | `OFFICER` | Supported directly. |
| 16 | `apiApproveRequisition` | `requisitions.approve` / `apiApproveRequisition` | `{ requisition_id, note }` | `{ success: true, req_id, status: 'APPROVED' }` | `04_Requisitions`, `08_Audit_Logs` | `APPROVER` | Supported directly. |
| 17 | `apiRejectRequisition` | `requisitions.reject` / `apiRejectRequisition` | `{ requisition_id, reason }` | `{ success: true, req_id, status: 'REJECTED' }` | `04_Requisitions`, `08_Audit_Logs` | `APPROVER` | Supported directly. |
| 18 | `apiIssueStock` | `requisitions.issue` / `apiIssueStock` | `{ requisition_id, items }` | `{ success: true, req_id, status: 'ISSUED' }` | `04_Requisitions`, `07_Stock_Ledger`, `02_Master_Items` | `OFFICER` | Supported directly. Mutates ledger. |
| 19 | `apiConfirmReceipt` | `requisitions.receive` / `apiConfirmReceipt` | `{ requisition_id }` | `{ success: true, req_id, status: 'RECEIVED' }` | `04_Requisitions`, `08_Audit_Logs` | `REQUESTER` | Supported directly. |
| 20 | `apiReceiveStock` | `stock.receive` / `apiReceiveStock` | `{ item_code, qty, unit_cost }` | `{ success: true, tx_id, balanceAfter }` | `07_Stock_Ledger`, `02_Master_Items` | `OFFICER` | Supported directly. |
| 21 | `apiAdjustStock` | `stock.adjust` / `apiAdjustStock` | `{ item_code, new_qty, reason }` | `{ success: true, tx_id, balanceAfter }` | `07_Stock_Ledger`, `02_Master_Items`, `10_Stock_Adjustments` | `OFFICER` | Supported directly. |
| 22 | `apiGetItemLedger` | `stock.ledger` / `apiGetItemLedger` | `{ item_code }` or string | `{ success: true, ledger: LedgerEntry[] }` | `07_Stock_Ledger` | `OFFICER` | **NEW EXPORT**: Reads item's transactions from `07_Stock_Ledger`. |
| 23 | `apiReconcileBalance` | `stock.reconcile` / `apiReconcileBalance` | `{ item_code }` or string | `{ success: true, reconcile: Result }` | `02_Master_Items`, `07_Stock_Ledger` | `ADMIN` | **NEW EXPORT**: Exposes `apiReconcileStockBalances` in `Code.gs`. |
| 24 | `apiGetAuditTrail` | `audit.list` / `apiGetAuditLogs` | `filters` | `{ success: true, audit: Logs[], logs: Logs[] }` | `08_Audit_Logs` | `OFFICER` | **NEW WRAPPER**: Maps to `apiGetAuditLogs` returning both `audit` and `logs`. |
| 25 | `apiVerifyAuditIntegrity` | `audit.verify` / `apiVerifyAuditIntegrity` | `none` | `{ success: true, integrity: Result, verified: bool }` | `08_Audit_Logs` | `ADMIN` | Supported directly in `Audit.gs`. |
| 26 | `apiGetSettings` | `settings.get` / `apiGetSettings` | `{ section }` | `{ success: true, settings: Settings }` | `00_Config`, `09_Fiscal_Years` | `OFFICER` | Supported directly. |
| 27 | `apiUpdateSettings` | `settings.update` / `apiUpdateSettings` | Settings delta | `{ success: true, updated: bool }` | `00_Config`, `08_Audit_Logs` | `ADMIN` | Supported directly. |
| 28 | `apiUpdateSettingsSection` | `settings.updateSection` / `apiUpdateSettingsSection` | `{ section, data }` | `{ success: true, updated: bool }` | `00_Config`, `08_Audit_Logs` | `ADMIN` | **NEW EXPORT**: Exposes section update in `Code.gs`. |
| 29 | `apiResolveQr` | `qr.resolve` / `apiResolveQr` | `{ qr_data }` or string | `{ success: true, item: Item }` | `11_QR_Registry`, `02_Master_Items` | `REQUESTER` | Supported directly. Used by MiniUI scanner. |
| 30 | `HRT_rpc` | `ApiRouter.routeRequest` | `(action, payload)` | Standard Envelope | All Sheets | Per Action | **NEW ALIAS**: Universal RPC gateway dispatching by action string. |

---

## 3. Universal Two-Way Compatibility Architecture

To ensure 100% reliability regardless of calling convention, the RPC layer implements two complimentary safeguards:

### Layer A: Backend Exposure in `Code.gs`
Expose top-level wrapper functions for all legacy/shorthand names:
```javascript
function HRT_rpc(action, payload) {
  return ApiRouter.routeRequest(action, payload);
}

function apiGetDashboardKPIs(filters) {
  const res = ApiRouter.routeRequest('dashboard.metrics', filters);
  if (res && res.metrics) {
    res.kpis = {
      totalSKU: res.metrics.totalSKUs || 0,
      totalStockQty: res.metrics.totalStockUnits || 0,
      totalAssetValue: res.metrics.totalValue || 0,
      lowStockCount: res.metrics.lowStockCount || 0,
      criticalStockCount: res.metrics.outOfStockCount || 0,
      healthyCount: (res.metrics.totalSKUs || 0) - ((res.metrics.lowStockCount || 0) + (res.metrics.outOfStockCount || 0))
    };
  }
  return res;
}

function apiSubmitRequisition(payload) {
  if (typeof payload === 'string') {
    return ApiRouter.routeRequest('requisitions.review', { requisition_id: payload });
  }
  return ApiRouter.routeRequest('requisitions.create', payload);
}

function apiGetItemLedger(payload) {
  return ApiRouter.routeRequest('stock.ledger', payload);
}

function apiReconcileBalance(payload) {
  return ApiRouter.routeRequest('stock.reconcile', payload);
}

function apiGetAuditTrail(filters) {
  const res = ApiRouter.routeRequest('audit.list', filters);
  if (res && res.logs) {
    res.audit = res.logs;
  }
  return res;
}

function apiUpdateSettingsSection(payload) {
  return ApiRouter.routeRequest('settings.updateSection', payload);
}
```

### Layer B: Resilient Client Transport in `ApiServiceCore`
```javascript
call(fnName, ...args) {
    const reqId = this.generateRequestId();
    return new Promise((resolve, reject) => {
        if (!this.isGas) {
            const err = new Error('BACKEND_UNAVAILABLE: Google Apps Script bridge is not detected.');
            err.code = 'BACKEND_UNAVAILABLE';
            return reject(err);
        }

        let isCompleted = false;
        const timer = setTimeout(() => {
            if (!isCompleted) {
                isCompleted = true;
                reject(new Error(`Timeout: Backend function [${fnName}] timed out after ${this.timeoutMs}ms (${reqId})`));
            }
        }, this.timeoutMs);

        const onSuccess = (response) => {
            if (!isCompleted) {
                isCompleted = true;
                clearTimeout(timer);
                resolve(response);
            }
        };

        const onFailure = (error) => {
            if (!isCompleted) {
                isCompleted = true;
                clearTimeout(timer);
                reject(error);
            }
        };

        try {
            const runner = google.script.run
                .withSuccessHandler(onSuccess)
                .withFailureHandler(onFailure);

            if (typeof runner[fnName] === 'function') {
                runner[fnName](...args);
            } else if (typeof runner.HRT_rpc === 'function') {
                const action = ACTION_MAP[fnName] || fnName;
                runner.HRT_rpc(action, args[0]);
            } else if (typeof runner.apiCall === 'function') {
                const action = ACTION_MAP[fnName] || fnName;
                runner.apiCall(action, args[0]);
            } else {
                throw new Error(`RPC_CONTRACT_MISMATCH: Function "${fnName}" is not exported on backend bridge.`);
            }
        } catch (transportErr) {
            if (!isCompleted) {
                isCompleted = true;
                clearTimeout(timer);
                reject(transportErr);
            }
        }
    });
}
```
This architecture completely eliminates `[fnName] is not a function` at every layer.

---

## 4. Symbol Collision Elimination & Private Handler Encapsulation (P0 Remediation)

To prevent ambiguous global runtime overwrites and unauthorized client bypasses in Google Apps Script's shared execution context:
1. **Private Handler Suffix (`_`)**: All internal business handlers in `Read.gs`, `Write.gs`, and `Audit.gs` were renamed to use the `hrt<Name>_` convention (e.g. `hrtGetItems_`, `hrtCreateRequisition_`, `hrtGetAuditLogs_`). This hides them natively from `google.script.run`.
2. **Unified Facade Entry Point (`Code.gs`)**: `Code.gs` alone exposes top-level callable facades, ensuring 100% of incoming client calls traverse `ApiRouter.routeRequest` for authentication, permission verification, and idempotency checks.
3. **Safe Multi-Tier Dispatch**: Eliminated `global[route.handler]` lookup; replaced with multi-tier resolution (`typeof route.handler === 'function'`, `globalThis[route.handler]`, and `global[route.handler]`), avoiding `ReferenceError: global is not defined` in Apps Script V8.
4. **Direct `api*` Alias Registration**: Registered 41 `api*` aliases in `ACTION_REGISTRY` so requests calling `apiGetItems`, `apiCreateRequisition`, etc., route directly and cleanly without translation failure.
