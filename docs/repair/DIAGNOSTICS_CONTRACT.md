# HRT Inventory System — Database Diagnostics & Health Check Specification
**Document Version:** v1.1  
**Target Release Pipeline:** `v2.7.0-rc.5` $\rightarrow$ Candidate `v2.7.0-rc.6`  
**Execution Context:** `Read.gs:hrtCheckHealth_` / `Api.gs` / `index.html`  
**Organization:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)  

---

## 1. Overview & Objectives

In accordance with **Prompt 18 (v1.1)**, the Database Diagnostics and System Health Probe provides real-time verification of backend connectivity, 16-sheet physical schema completeness, active fiscal year context, and caller authorization without performing synthetic or destructive writes.

Key security and architectural guarantees:
1. **Zero Fake Success / De-fabrication:** Completely eliminated hardcoded values (`1BxiM...***`, `16/16 ชีตสมบูรณ์ (OK)`, `~45ms`, `Write Permissions: GRANTED`). All status, latency, and sheet counts are measured live from the connected Google Spreadsheet.
2. **Read-Only Probe Boundary:** The diagnostic check never performs write operations to test write permissions. The probe explicitly outputs `write_permission: 'NOT_TESTED'`. Write permissions are evaluated solely based on verified RBAC roles (`ADMIN`, `OFFICER`).
3. **Database Identity Masking:** Admin callers receive real database name and masked ID (e.g. `1Bxi...4xyz`). Non-admin callers receive `'PROTECTED'` to prevent reconnaissance leaks.
4. **Fail-Closed on Unhealthy / Degraded States:** When sheets are missing, the status is strictly `'DEGRADED'`. When the configured spreadsheet is inaccessible, the status is `'UNHEALTHY'`. No success toasts or fake `HEALTHY` fallbacks are permitted.
5. **Caller Context Verification (DB-03):** Diagnostics authenticate callers via verified identity (`user_id`, `id`, `userId`, `email`, `role`, `status`). Anonymous or suspended accounts fail closed with `status: 'UNAUTHORIZED'`.

---

## 2. API Contract Specification

### Route Endpoints
- `settings.healthCheck`
- `checkHealth`
- `system.healthCheck`
- `apiCheckHealth`

### Minimum Role Requirement
- `OFFICER` (or `ADMIN`, `DIRECTOR`, `APPROVER`)
- Anonymous callers: rejected with `UNAUTHORIZED`

### Response Payload Structure

```json
{
  "success": true,
  "status": "HEALTHY",
  "checks": {
    "authenticated": true,
    "authorized": true,
    "role": "ADMIN",
    "caller_id": "USR-001",
    "read": true,
    "schema": true,
    "schema_count": "16/16",
    "missingSheets": [],
    "missing_sheets": [],
    "database_match": true,
    "configured_db": "SS-HRT-2567-***",
    "actual_db": "SS-HRT-2567-***",
    "write_permission": "NOT_TESTED"
  },
  "databaseName": "HRT_Inventory_DB_2567_School",
  "spreadsheetIdMasked": "1Bxi...4xyz",
  "activeFiscalYear": "2569",
  "latencyMs": 42,
  "checkedAt": "2026-10-29T19:30:00.000Z",
  "environment": "GOOGLE_APPS_SCRIPT"
}
```

---

## 3. Status Decision Matrix

| Status | Conditions | UI Badge | Toast Notification |
| :--- | :--- | :--- | :--- |
| `HEALTHY` | `read: true`, `schema: true` (all 16 sheets exist), `database_match: true`, caller authenticated and authorized | Green (`พร้อมใช้งาน`) | `success`: ตรวจสอบฐานข้อมูลเรียบร้อย: ปกติทุกส่วน |
| `DEGRADED` | `read: true`, but 1 or more canonical sheets are missing (`missing_sheets.length > 0`) OR `database_match: false` | Amber (`สมบูรณ์บางส่วน`) | `warning`: ระบบฐานข้อมูลอยู่ในสถานะ Degraded: มีบางชีตขาดหาย |
| `UNHEALTHY` | `read: false` (cannot open spreadsheet, permission denied, or invalid ID) | Red (`ไม่สามารถอ่านได้`) | `error`: การตรวจสอบฐานข้อมูลพบปัญหา: UNHEALTHY |
| `UNAUTHORIZED` | Caller identity missing, invalid, suspended (`status: 'SUSPENDED'`), or lacking diagnostic permission | Red (`ไม่มีสิทธิ์`) | `error`: ปฏิเสธการเข้าถึง: ต้องการการยืนยันตัวตน |

---

## 4. Frontend Integration

In `index.html`:
- On initial load: `setConn_maskedId` displays `-`, `setConn_readText` displays `ยังไม่ได้ตรวจสอบ`, `setConn_schemaStatus` displays `ยังไม่ได้ตรวจสอบ`.
- When user clicks **"ทดสอบการเชื่อมต่อ (Read-Only)"**:
  - Asynchronously invokes `ApiService.call('apiCheckHealth')`.
  - Measures total round-trip time (`tElapsed = Date.now() - tStart`).
  - Populates diagnostic console with live verified facts.
  - Write permission is explicitly shown as `NOT_TESTED (Read-Only Diagnostics Probe) — Role: <ROLE>`.
