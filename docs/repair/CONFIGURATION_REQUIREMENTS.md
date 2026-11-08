# HRT Inventory Management System — Configuration Requirements Specification
**Document Version:** v1.1  
**Target Release Pipeline:** `v2.7.0-rc.5` (Working Tree) $\rightarrow$ Candidate `v2.7.0-rc.6` (Post Repair Prompts 13–20)  
**Historical Baseline:** `v2.6.0` (Last Verified Pre-Clean File Baseline)  
**Organization:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)  
**Date:** 28 ตุลาคม 2569

---

## 1. Overview & Policy Guardrails

This document specifies the exact administrative configurations, Script Properties, Google Cloud Console parameters, and environment prerequisites required to deploy and operate the HRT Inventory System securely.

> [!IMPORTANT]
> **Strict Non-Destructive Guardrail:** In accordance with the prompt rules, local repair execution and test suites **MUST NOT** mutate live production credentials, Script Properties, or Google Workspace configurations. Live deployment remains strictly gated (**BLOCKED**) on institutional administrator authorization.

---

## 2. Google Cloud Platform (GCP) & OAuth 2.0 Setup

When deploying with explicit Google ID token verification (GIS flow), the following GCP project configuration is required:

### 2.1 OAuth 2.0 Client ID Configuration
- **Application Type:** Web Application
- **Client Name:** `HRT Inventory System Web Client`
- **Authorized JavaScript Origins:**
  - `https://script.google.com`
  - `https://script.googleusercontent.com`
  - `https://n-*.script.googleusercontent.com` (Apps Script user content sandbox)
- **Authorized Redirect URIs:**
  - `https://script.google.com/macros/d/{SCRIPT_ID}/usercallback`
  - `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`

### 2.2 OAuth Consent Screen
- **User Type:** `Internal` (Recommended for โรงเรียนหรเทพฯ to restrict access to Google Workspace accounts).
- **Application Name:** `HRT Inventory Management System`
- **Support Email:** Institutional Administrator email (`admin@hrt.ac.th` or IT department).
- **Authorized Domains:** `hrt.ac.th`
- **Required OAuth Scopes:**
  1. `https://www.googleapis.com/auth/spreadsheets` (Read/write access to institutional inventory spreadsheet)
  2. `https://www.googleapis.com/auth/userinfo.email` (Authoritative verification of active caller email)
  3. `https://www.googleapis.com/auth/script.external_request` (Outbound verification calls to `oauth2.googleapis.com/tokeninfo`)

---

## 3. Google Apps Script Properties Configuration

The system reads environment settings from Apps Script `PropertiesService.getScriptProperties()`. All properties must be configured in the Apps Script Project Settings:

| Property Key | Type | Default Fallback | Mandatory / Optional | Purpose & Security Constraint |
| :--- | :---: | :---: | :---: | :--- |
| `SPREADSHEET_ID` | String | Hardcoded in `Config.gs` | **Mandatory** | The Google Sheet ID of the 16-sheet master database. Must never be exposed to requester clients. |
| `GOOGLE_CLIENT_ID` | String | `""` | **Mandatory for Token Flow** | The OAuth 2.0 Web Client ID. Required for verifying token audience (`aud`). If missing and token flow is used, fails closed with `CONFIGURATION_ERROR`. |
| `ALLOWED_DOMAINS` | String | `hrt.ac.th,school.internal` | **Mandatory** | Comma-delimited list of permitted organizational domains. External domains (e.g. `gmail.com`) require explicit registration in `01_Users`. |
| `LOCK_TIMEOUT_MS` | Number | `30000` | Optional | Concurrency read lock timeout (milliseconds). |
| `WRITE_LOCK_TIMEOUT_MS` | Number | `60000` | Optional | Transactional mutation lock timeout (milliseconds) for stock issuance, user creation, and audit logging. |
| `CACHE_TTL_SECONDS` | Number | `300` | Optional | Cache lifetime in `CacheService` (seconds). |

---

## 4. Apps Script Web App Deployment Settings

When creating a new Versioned Deployment in the Apps Script Editor (`Deploy` > `New deployment` > `Web app`):

### 4.1 Recommended Institutional Mode (Topology A)
- **Description:** `HRT Inventory System v2.7.0 Production`
- **Execute as:** `User accessing the web app`
  - *Effect:* The script executes under the Google authority of the teacher or officer browsing the app. `Session.getActiveUser().getEmail()` automatically returns their verified school email address.
- **Who has access:** `Anyone within hortherp.ac.th`
  - *Effect:* Completely restricts network access to authenticated school Google Workspace accounts. External anonymous requests cannot reach the web app.

### 4.2 Alternative Service Account Mode (Topology B)
- **Execute as:** `Me (System Service Account)`
- **Who has access:** `Anyone` (or `Anyone with Google Account`)
- *Requirement:* Must configure `GOOGLE_CLIENT_ID` and integrate Google Identity Services (GIS). The client frontend acquires an OIDC token and passes `id_token` in API calls. The backend verifies signature and claims against `oauth2.googleapis.com/tokeninfo`.

---

## 5. Master Spreadsheet Seed Prerequisites (`01_Users`)

Prior to opening the system for general use, the administrator must ensure `01_Users` has the following minimum structure:

### 5.1 Required Header Columns (Row 1):
`user_id`, `username`, `name`, `email`, `role`, `department`, `status`

### 5.2 Initial Seed Administrator Record (Row 2):
- `user_id`: `USR-001`
- `username`: `admin.somchai@hrt.ac.th` (Full normalized email)
- `name`: `นายสมศักดิ์ รักเรียน (ผู้ดูแลระบบกลาง)`
- `email`: `admin.somchai@hrt.ac.th`
- `role`: `ADMIN`
- `department`: `บริหารงานทั่วไป`
- `status`: `ACTIVE`

> [!CAUTION]
> **Zero Production Mutation Rule:** The development and repair process does not execute any live database seeding, migration, or writes against production personnel sheets.
