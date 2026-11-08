# HRT Inventory System — User Administration & Menu Permissions Specification

**Document Version:** 1.0.0  
**Target Release:** v2.7.0-rc.5  
**Baseline:** v2.6.0 | Commit `dd000c0`  
**Date:** 2026-10-28  
**Institution:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)  

---

## 1. User Administration Architecture

In compliance with administrative requirements, the HRT Inventory System manages all school personnel, teachers, officers, and administrators using their **official E-mail address as username**, while preserving an immutable `user_id` as the primary key.

### 1.1 Data Schema in `01_Users`
| Column Index | Field Name | Type | Key / Constraint | Description |
|---|---|---|---|---|
| Col 1 | `user_id` | String | Primary Key | Immutable identifier (e.g. `USR-001`, `USR-002`) |
| Col 2 | `username` | String | Unique Index | **Strictly normalized E-mail** (`email.toLowerCase().trim()`) |
| Col 3 | `name` | String | Required | Full Title, Name, and Surname in Thai |
| Col 4 | `email` | String | Unique Index | Institutional Google Workspace account (e.g. `kanya.s@hrt.ac.th`) |
| Col 5 | `role` | Enum | Validated | Standardized RBAC role code (`ADMIN`, `DIRECTOR`, `OFFICER`, `APPROVER`, `TEACHER`, `REQUESTER`) |
| Col 6 | `department` | String | Required | School department / subject learning group (กลุ่มสาระการเรียนรู้) |
| Col 7 | `status` | Enum | Active Flag | `ACTIVE` or `SUSPENDED` |

---

## 2. Server-Side Administrative Operations (`Write.gs`)

### 2.1 User Creation (`apiCreateUser`)
- **Caller Guard**: Admin role required (`caller.role === 'ADMIN'`).
- **Username Normalization**:
  ```javascript
  const email = String(payload.email || '').trim().toLowerCase();
  const username = email; // Enforces E-mail as username per institutional requirement
  ```
- **Duplicate Prevention**: Prevents registering duplicate email addresses.
- **Audit Trail**: Writes a chained HMAC-SHA256 entry to `08_Audit_Logs`.

### 2.2 User Modification & Role Elevation (`apiUpdateUser`)
- **Caller Guard**: Admin role required.
- **Self-Elevation & Last-Admin Protection**:
  1. Prevents self-demotion or self-suspension of the active administrator.
  2. Counts active administrator accounts across the sheet; strictly rejects demotion or suspension if only 1 active admin remains.

### 2.3 Account Suspension (`apiSuspendUser`)
- Soft-deactivates account by setting status to `SUSPENDED`.
- Suspended users are immediately denied access across both Central Desktop and MiniUI.

---

## 3. Server-Authoritative RBAC Matrix & Menu Visibility

The server enforces role permissions via `Config.gs:ROLE_PERMISSIONS`. The frontend evaluates the caller's server profile and dynamically hides or reveals UI routes:

| Route / Menu Element | Identifier | Minimum Role | Permitted Roles | Actions Allowed |
|---|---|---|---|---|
| **ภาพรวมระบบคลัง** | `menuItemDashboard` | `REQUESTER` | All Roles | View inventory stats, personal KPIs |
| **คลังพัสดุคงคลัง** | `menuItemInventory` | `REQUESTER` | All Roles | View item catalog, specs, remaining stock |
| **เบิก–จ่ายพัสดุ** | `menuItemRequisition` | `REQUESTER` | All Roles | Create requisitions; view own request history |
| **ต้องดำเนินการ (Min Stock)** | `menuItemActionNeeded` | `OFFICER` | `OFFICER`, `ADMIN` | Filter items below Minimum/ROP threshold |
| **ทะเบียนพัสดุ FSN** | `menuItemFsn` | `OFFICER` | `OFFICER`, `ADMIN` | View and manage e-GP 13-digit FSN registry |
| **เอกสารราชการ (พ.ด.)** | `menuItemDocs` | `APPROVER` | `OFFICER`, `APPROVER`, `DIRECTOR`, `ADMIN` | Generate and export official พ.ด.4, พ.ด.5, พ.ด.6 forms |
| **ตรวจนับพัสดุ สิ้นปีงบ** | `menuItemYearEndAudit` | `OFFICER` | `OFFICER`, `ADMIN` | Conduct physical inventory count, record variances |
| **ตั้งค่าระบบ** | `menuItemSettings` | `ADMIN` | `ADMIN` only | User management, fiscal year setup, master data |
| **รับเข้าพัสดุ (Restock)** | `btnRestockAction` | `OFFICER` | `OFFICER`, `ADMIN` | Record incoming stock deliveries into ledger |
| **จ่ายพัสดุ (Issue Stock)** | `btnIssueStock` | `OFFICER` | `OFFICER`, `ADMIN` | Deduct ledger balance and issue items |
| **อนุมัติคำขอเบิก** | `btnApproveReq` | `APPROVER` | `APPROVER`, `DIRECTOR`, `ADMIN` | Review and sign approval on requisitions |

---

## 4. Institutional Thai Role Labels (`CONFIG_ROLES_TH`)
- `ADMIN`: ผู้ดูแลระบบ (Admin)
- `OFFICER`: เจ้าหน้าที่พัสดุ
- `APPROVER`: ผู้พิจารณาอนุมัติ
- `DIRECTOR`: ผู้อำนวยการสถานศึกษา
- `TEACHER`: ครูผู้สอน / บุคลากร
- `REQUESTER`: ผู้ขอเบิกพัสดุ
