# AGENTS.md — AI Developer & Agent Guidelines

## 1. Project Context
* **System Name:** HRT School Inventory Management System
* **Target Version:** `v2.7.0-rc.6`
* **Organization:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) สังกัดองค์การบริหารส่วนจังหวัดสระบุรี
* **Standard & Regulation:** พระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖๐ และระเบียบกระทรวงการคลังฯ พ.ศ. ๒๕๖๐
* **Runtime Environment:** Google Apps Script (V8 Engine) + Google Sheets Database (16 Canonical Tables) + HTML5 SPA (Tailwind CSS CDN)

---

## 2. Immutable Architecture Constraints

### 2.1 Canonical 9 Runtime Files
The Google Apps Script runtime deployment consists strictly of **9 allowlisted files at the root directory**:
1. `appsscript.json` — Manifest and OAuth Scopes
2. `Config.gs` — System Constants, Configuration & Caching
3. `Api.gs` — Gateway, Dynamic RBAC & Request Router
4. `Read.gs` — Pure Query Services
5. `Write.gs` — ACID Mutations, Stock Ledger & Mutex Locks
6. `Audit.gs` — Immutable SHA-256 Chained Audit Trail
7. `Code.gs` — Entry Points (`doGet`, `doPost`, `apiCall`, `HRT_rpc`)
8. `index.html` — Central Management SPA
9. `MiniUI.html` — Mobile Self-Service & QR Code Web Portal

> **Rule:** Never introduce sub-bundles, webpack, vite, or external script loaders into runtime files. `index.html` and `MiniUI.html` must remain fully self-contained single-file HTML applications.

### 2.2 Security & Fail-Closed RBAC
* **Server-Authoritative Identity:** Never trust client-supplied parameters for identity (`caller`, `userId`, `userRole`, `dept`). The backend MUST resolve identity via `Session.getActiveUser().getEmail()` or verified Google ID Token (`Api.gs:resolveAuthenticatedUser`).
* **Canonical Roles (UPPERCASE ONLY):**
  * `ADMIN` (Level 60)
  * `DIRECTOR` (Level 50)
  * `APPROVER` (Level 40)
  * `OFFICER` (Level 30)
  * `TEACHER` (Level 10)
  * `REQUESTER` (Level 10)
* Any role check in frontend or backend must use canonical uppercase strings.

### 2.3 Double-Entry Stock Ledger & Lifecycle Rules
* **Stock Invariance (C-7):** Stock balance is decremented **ONLY** upon physical issuance (`hrtIssueStock_`). Creating or approving a requisition does NOT deduct stock.
* **Fiscal Year Boundaries:** Thai fiscal year runs from October 1 to September 30 (Fiscal Year 2569: 1 Oct 2568 – 30 Sep 2569). Write operations on closed fiscal years are strictly prohibited.
* **Idempotency Requirement:** Mutating API calls must supply an `idempotencyKey` to prevent double-deduction under network retry or button multi-clicks.

---

## 3. Testing & Verification Rules
* **Zero Production Write:** Automated tests must run in-memory using `tests/adapters/in_memory_repository.js` and `tests/fixtures/synthetic_fixtures.js`. Never write to production Google Sheets during test suites.
* **Clean Code Separation:** Do NOT inject mock data or test harnesses into the 9 canonical runtime files.
