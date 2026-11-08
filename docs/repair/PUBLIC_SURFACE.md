# HRT Inventory System — Public Surface & Execution Boundary Catalog
**Document Version:** v1.1  
**Project:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) Inventory Management System  
**Baseline Anchor:** `v2.7.0-rc.5` $\rightarrow$ `v2.7.0-rc.6` Preparation  
**Target:** Elimination of unauthenticated mutable vectors, client spoofing, and router recursion  
**Date:** 28 ตุลาคม 2569

---

## 1. Public Execution Surface Overview

In Google Apps Script, any top-level JavaScript function declared with the `function` keyword that **does NOT end with an underscore (`_`)** is automatically exposed to client-side calls via `google.script.run` and macro runners.

Prior to Prompt 13, several mutable and internal helper functions lacked trailing underscores, creating attack vectors where unauthenticated callers could bypass business logic, alter system configurations, or forge audit trail records.

Prompt 13 establishes a strict **Defense-in-Depth Boundary**:
1. All mutable operations, database writers, internal state managers, and template includers are marked with the private `_` suffix.
2. Web App entrypoints (`doGet`, `doPost`) and RPC transport gateways (`apiCall`, `HRT_rpc`, compatibility facades) strictly route through `ApiRouter.routeRequest`.
3. Client-supplied actor spoofing (`caller`, `_serverActor`, `userRole`, `callerRole`) is purged at the edge before routing.
4. Business dispatch uses an explicit compile-time allowlist registry (`resolveAllowlistedHandler`), eliminating unconstrained `globalThis` lookups.

---

## 2. Public Functions & Entrypoint Catalog

### 2.1 Web App Platform Handlers (`Code.gs`)

| Function Name | HTTP Method | Exposure | Security Boundary / Guards Applied |
| :--- | :---: | :---: | :--- |
| `doGet(e)` | `GET` | Public Web App | Routes view queries: `?view=mini` $\rightarrow$ `MiniUI.html`, default $\rightarrow$ `index.html`. Sets X-Frame-Options to `ALLOWALL` for institutional iframe embedding. Zero state mutations. |
| `doPost(e)` | `POST` | Public Web App API | **Spoof-Stripping Guard:** Actively purges `payload.caller`, `payload._serverActor`, `payload.userRole`, and `payload.callerRole`. Dispatches strictly to `ApiRouter.routeRequest(action, payload, requestId)`. |

### 2.2 Universal RPC Transport Gateways (`Code.gs`)

| Gateway Function | Target Invoker | Underlying Implementation | Guard |
| :--- | :--- | :--- | :--- |
| `apiCall(action, payload, requestId)` | `google.script.run` (Central UI / Modern Modules) | `return ApiRouter.routeRequest(action, payload, requestId);` | Enforces authentication, RBAC, idempotency, and fiscal year rules. |
| `HRT_rpc(action, payload)` | `google.script.run` (MiniUI / Compact Mobile Portal) | `return apiCall(action, payload);` | Universal fallback gateway alias sharing central routing and RBAC. |

### 2.3 Compatibility Facades (`Code.gs`)

To guarantee backwards compatibility with legacy frontend script modules without altering database schemas or breaking existing callers, `Code.gs` provides 82 compatibility facades.

**Crucial Architecture Requirement:** Every compatibility facade delegates directly to `ApiRouter.routeRequest(action, payload)` or `apiCall(action, payload)`. **Zero facades bypass the router.**

#### Sample Compatibility Facades Mapping

| Facade Identifier | Dispatched Action | Handled In | Authorization Guard |
| :--- | :--- | :--- | :--- |
| `apiBootstrap()` / `bootstrap()` | `'bootstrap'` | `Read.gs:hrtBootstrap_` | Authenticated Caller |
| `apiGetItems(p)` / `getItems(p)` | `'items.list'` | `Read.gs:hrtGetItems_` | Min Role: `REQUESTER` |
| `apiGetItemDetail(p)` / `getItemDetail(p)` | `'items.get'` | `Read.gs:hrtGetItemDetail_` | Min Role: `REQUESTER` |
| `apiCreateItem(p)` | `'items.create'` | `Write.gs:hrtCreateItem_` | Min Role: `OFFICER` |
| `apiUpdateItem(p)` | `'items.update'` | `Write.gs:hrtUpdateItem_` | Min Role: `OFFICER` |
| `apiImportItems(p)` / `importItems(p)` | `'items.import'` | `Write.gs:hrtImportItems_` | Min Role: `OFFICER` |
| `apiSubmitRequisition(p)` / `createRequisition(p)` | `'requisitions.submit'` | `Write.gs:hrtCreateRequisition_` | Min Role: `REQUESTER` (No recursion) |
| `apiReviewRequisition(p)` / `reviewRequisition(p)` | `'requisitions.review'` | `Write.gs:hrtReviewRequisition_` | Min Role: `OFFICER` |
| `apiApproveRequisition(p)` / `approveRequisition(p)` | `'requisitions.approve'` | `Write.gs:hrtApproveRequisition_` | Min Role: `APPROVER` |
| `apiIssueStock(p)` / `issueStock(p)` | `'stock.issue'` | `Write.gs:hrtIssueStock_` | Min Role: `OFFICER` |
| `apiReceiveStock(p)` / `receiveStock(p)` | `'stock.receive'` | `Write.gs:hrtReceiveStock_` | Min Role: `OFFICER` |
| `apiAdjustStock(p)` | `'stock.adjust'` | `Write.gs:hrtAdjustStock_` | Min Role: `OFFICER` |
| `apiCreateUser(p)` | `'users.create'` | `Write.gs:hrtCreateUser_` | Min Role: `ADMIN` |
| `apiUpdateUser(p)` | `'users.update'` | `Write.gs:hrtUpdateUser_` | Min Role: `ADMIN` |
| `apiSuspendUser(p)` | `'users.suspend'` | `Write.gs:hrtSuspendUser_` | Min Role: `ADMIN` |
| `apiUpdateSettings(p)` | `'settings.update'` | `Write.gs:hrtUpdateSettings_` | Min Role: `ADMIN` |
| `apiCloseFiscalYear(p)` | `'fiscalYear.close'` | `Write.gs:hrtCloseFiscalYear_` | Min Role: `ADMIN` |
| `apiVerifyAuditIntegrity()` | `'audit.verify'` | `Audit.gs:hrtVerifyAuditIntegrity_` | Min Role: `ADMIN` |

---

## 3. Remediated Private Helpers (`_` Suffix Encapsulation)

All functions that mutate state, handle server-side file inclusion, or perform database maintenance have been renamed with trailing underscores:

| Original Name | Remediated Private Symbol | Location | Reason for Encapsulation |
| :--- | :--- | :--- | :--- |
| `setConfig(key, value)` | `setConfig_(key, value)` | `Config.gs` | Prevented unauthenticated callers from writing directly to `_config` properties cache. |
| `invalidateCache(scope)` | `invalidateCache_(scope)` | `Config.gs` | Prevented unauthenticated callers from flushing server-side caches maliciously. |
| `logAudit(act, mod, det, caller)` | `logAudit_(act, mod, det, caller, isMandatory)` | `Audit.gs` | Prevented callers from injecting spoofed caller identities into the immutable SHA-256 audit chain. |
| `include(filename)` | `include_(filename)` | `Code.gs` | Enforced strict allowlist `['index.html', 'MiniUI.html']` preventing arbitrary file reads. |
| `initDatabase()` (Public Facade) | Removed (kept `initDatabase_()`) | `Code.gs` | Removed public facade callable from browser. Retained `initDatabase_()` for editor-only / ADMIN execution. |
| `_runInitDatabaseSchema()` | `_runInitDatabaseSchema_()` | `Code.gs` | Added trailing underscore to ensure Google Apps Script engine does not export to `google.script.run`. |

---

## 4. Router Allowlist Registry (`resolveAllowlistedHandler`)

In `Api.gs`, request dispatch no longer evaluates unconstrained properties on `globalThis` or `global`. Instead, `resolveAllowlistedHandler` explicitly matches the 56 canonical business handlers:

```javascript
function resolveAllowlistedHandler(handlerName) {
  if (typeof handlerName === 'function') return handlerName;
  if (typeof handlerName !== 'string') return null;

  const ALLOWLISTED_HANDLERS = {
    // 56 Explicitly Declared Business Handlers (Read.gs, Write.gs, Audit.gs)
    'hrtBootstrap_': typeof hrtBootstrap_ === 'function' ? hrtBootstrap_ : ...,
    'hrtGetItems_': typeof hrtGetItems_ === 'function' ? hrtGetItems_ : ...,
    'hrtCreateItem_': typeof hrtCreateItem_ === 'function' ? hrtCreateItem_ : ...,
    'hrtCreateRequisition_': typeof hrtCreateRequisition_ === 'function' ? hrtCreateRequisition_ : ...,
    'hrtIssueStock_': typeof hrtIssueStock_ === 'function' ? hrtIssueStock_ : ...,
    ...
  };

  if (Object.prototype.hasOwnProperty.call(ALLOWLISTED_HANDLERS, handlerName)) {
    const fn = ALLOWLISTED_HANDLERS[handlerName];
    if (typeof fn === 'function') return fn;
    if (typeof global !== 'undefined' && typeof global[handlerName] === 'function') return global[handlerName];
    if (typeof globalThis !== 'undefined' && typeof globalThis[handlerName] === 'function') return globalThis[handlerName];
  }
  return null;
}
```

### Safety Properties:
1. **Zero Recursion:** `'requisitions.submit'` resolves directly to `hrtCreateRequisition_`, terminating recursion.
2. **Prototype Injection Immunity:** Uses `Object.prototype.hasOwnProperty.call` to prevent prototype pollution attacks (`constructor`, `__proto__`, `valueOf`).
3. **Fail-Closed:** Any unregistered handler throws `INTERNAL_ERROR: Business handler function "${handler}" is not defined or permitted in allowlist.`

---

## 5. Audit Write-Failure Policy & Data Sanitization

### 5.1 Write-Failure Policy
The audit trail logging system (`logAudit_`) implements a dual-mode persistence policy:
- **State Mutations (`isMandatory = true`):** Invoked during all 30 write handlers in `Write.gs`. If `logAudit_` encounters an error appending to the `11_Audit_Trail` sheet, it throws `AUDIT_PERSISTENCE_FAILED`, ensuring un-audited state mutations are never certified as successful.
- **Secondary / Informational Logs (`isMandatory = false`):** Invoked during API error handling or read auditing. Failure to log does NOT mask primary business errors or abort read requests.

### 5.2 Log Sanitization
All logged payloads and error details pass through `hrtSanitizeAuditDetails_`, which strips and masks:
- `Bearer [MASKED_TOKEN]`
- `Basic [MASKED_CREDENTIALS]`
- `ya29.[0-9A-Za-z-_]+` $\rightarrow$ `[MASKED_OAUTH_TOKEN]`
- `AIza[0-9A-Za-z-_]{30,40}` $\rightarrow$ `[MASKED_API_KEY]`
- `ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}` $\rightarrow$ `[MASKED_JWT]`
- `-----BEGIN [A-Z ]+ PRIVATE KEY-----...-----END [A-Z ]+ PRIVATE KEY-----` $\rightarrow$ `[MASKED_PRIVATE_KEY]`
- Credentials query params: `password=`, `token=`, `secret=`, `client_secret=` $\rightarrow$ `[MASKED]`
