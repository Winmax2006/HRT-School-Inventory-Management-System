# สถาปัตยกรรมแบ็กเอนด์และโครงสร้างฐานข้อมูลชีต (Backend & Google Sheets Architecture)
## HRT Inventory System — โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)
### เอกสารควบคุมเชิงสถาปัตยกรรม: SIMS-ARCH-2026-008
### รุ่นเป้าหมาย: v2.7.0-rc.3 | Historical Baseline: v2.6.0 | วันที่จัดทำ: 2026-10-28

---

## 1. การจำแนกความจริงเชิงประจักษ์ ออกจากข้อเสนอเชิงสถาปัตยกรรม (Observed Implementation vs. Architecture Proposals)

จากการตรวจสอบคลังซอร์สโค้ดจริง (Codebase Audit) พบว่ามีการกระจายตัวของโค้ดและการเสนอโครงสร้างในอดีตหลายระนาบ ซึ่งต้องแยกแยะสถานะการทำงานจริงอย่างเด็ดขาด:

```
[Repository Topology Audit]
├── Active Canonical Backend (Root *.gs)  <-- [ความเป็นจริงที่ทำงานและรันการทดสอบ 100%]
│   ├── Config.gs       (การกำหนดค่ากลาง, 16 แผ่นงาน, สิทธิ์ RBAC 4 บทบาท)
│   ├── Api.gs          (Action Registry Dispatcher, Idempotency, Token/Session Guard)
│   ├── Read.gs         (Business Query Services, Projection, Section Caching)
│   ├── Write.gs        (ScriptLock Mutex, State Machine, Ledger SSOT, Two-Phase Writes)
│   ├── Audit.gs        (SHA-256 Hash Chaining, Tamper-Evident Ledger, Verify)
│   └── Code.gs         (doGet, doPost, HTML Service Entrypoints)
│
├── Architecture Proposals / Legacy Snapshots (Subdirectories - Inactive as Live Writer)
│   ├── backend/        (โครงสร้าง Modular เสนอในรอบก่อนหน้า: 8 Tables, Schema.gs, Repository.gs)
│   ├── apps_script/    (โครงสร้าง Modular เสนอในรอบก่อนหน้า: 15 Tables, ActionService.gs)
│   └── School_Inventory_DB_2567_AppsScript.js (Monolithic Script โบราณปี 2567: 2 Tables)
│
└── Single Page Application Frontend
    ├── index.html                  (Central Web App + Embedded MiniUI Engine)
    ├── frontend/main/App.js        (Modular Frontend Controller)
    └── frontend/pages/Settings.html (Settings Hub 8 Categories)
```

### การประเมินไฟล์ข้อเสนอพิเศษ (Snippet Files Evaluation)
- **`CleanFilde.html` และ `CleanFilde(1).html`**: จากการตรวจสอบในเอกสารอ้างอิงและประวัติบริบท พบว่าเป็นเพียง HTML Snippet ความยาว 11 บรรทัด ซึ่ง**ไม่สามารถใช้เป็นหลักฐานยืนยันการเชื่อมต่อ Backend จริงได้**
- **MiniUI Preview**: การทำงานในอดีตเป็นเพียง Client-side In-memory Simulation จึงจำเป็นต้องเปลี่ยน Data Adapter ใน [`index.html`](file:///c:/Users/Art/.gemini/antigravity/scratch/index.html) ให้เรียกผ่าน `ApiServiceCore` ไปยัง RPC Actions จริงบนเซิร์ฟเวอร์เท่านั้น

---

## 2. แผนที่ความขัดแย้งและความเสี่ยงจากหลาย Writer Projects (Conflict & Risk Map)

เนื่องจากในคลังโค้ดมีโค้ดแบ็กเอนด์ถึง 3 ชุด (`Root *.gs`, `backend/`, `apps_script/`) จึงต้องทำ Conflict & Risk Analysis ตามข้อกำหนด A.4:

| ประเด็นความขัดแย้ง (Conflict Area) | Root Canonical Project (`*.gs`) | ข้อเสนอใน `backend/` | ข้อเสนอใน `apps_script/` | การประเมินความเสี่ยง (Risk Assessment) | ข้อยุติเชิงนโยบาย (Architectural Decision) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **จำนวนชีตในฐานข้อมูล** | **16 ชีตมาตรฐาน** (มี IDEMPOTENCY_LOG) | 8 ชีต (รวม Transaction ในตารางเดียว) | 15 ชีต (แยก Physical_Counts) | **วิกฤต (Critical):** หากรัน Setup สลับกัน ชีตจะถูกสร้างซ้ำซ้อนหรือโครงสร้างคอลัมน์ไม่ตรงกัน | **ยึด Root `Config.gs` (16 ชีต) เป็น Canonical SSOT** ห้ามรัน Setup จากโฟลเดอร์อื่น |
| **การระบุตัวตน (Identity)** | Server-Authoritative Session / Google SSO | In-Memory `UserApi.getCurrentUser` | `Session.getActiveUser()` ตรงๆ | **สูง (High):** เสี่ยงต่อการสวมรอยตัวตน หรือระบบไม่ทำงานเมื่อ Deploy แบบ Owner-mode | **ใช้ Root `Api.gs`:** ตรวจสอบอีเมลในโดเมน `@hrt.ac.th` และห้ามเชื่อถือ client-supplied user |
| **การล็อกธุรกรรม (Locking)** | `LockService.getScriptLock()` (60s) | In-Memory Mutex | `LockService.getScriptLock()` (30s) | **วิกฤต (Critical):** In-memory mutex ไม่สามารถกัน Concurrent Execution ข้าม Web App instances ได้ | **บังคับใช้ ScriptLock ใน Root `Write.gs`** ในทุกธุรกรรมที่ตัดสต็อกหรือเปลี่ยนสถานะ |
| **วงจรชีวิตคำขอเบิก** | 9 สถานะ (มี DRAFT, SUBMITTED, APPROVED, ISSUED) | 6 สถานะ (ไม่มี DRAFT, ไม่แยก REVIEWED) | 7 สถานะ (ไม่มี READY_TO_ISSUE) | **สูง (High):** State Machine แตกต่างกันทำให้สถานะค้างกลางคัน (Deadlock) | **ยึด State Machine ใน Root `Config.gs`** |

> **ข้อห้ามเด็ดขาด (Strict Constraint):** ห้ามรวมโค้ดหรือย้าย Production Topology โดยอัตโนมัติ ให้ระงับการทำงานของ `backend/` และ `apps_script/` ไว้เป็นเพียง Archive / Reference เท่านั้น และให้ระบบจริงทำงานผ่าน Root `*.gs` เพียงชุดเดียว

---

## 3. สภาพแวดล้อมฐานข้อมูลและการแยกส่วน (Spreadsheet Environment Separation)

ระบบแบ่งสภาพแวดล้อมออกเป็น 3 ระดับอย่างเด็ดขาด โดยอ้างอิงผ่าน `PropertiesService`:

```
+-----------------------------------------------------------------------------------+
|                         Google Apps Script Single Project                         |
|                                    (Root *.gs)                                    |
+-----------------------------------------------------------------------------------+
       │                                   │                                  │
       ▼ (SPREADSHEET_ID_DEV)              ▼ (SPREADSHEET_ID_STAGING)         ▼ (SPREADSHEET_ID_PROD)
+──────────────────────────+       +──────────────────────────+       +──────────────────────────+
|  Spreadsheet: HRT_DEV    |       | Spreadsheet: HRT_STAGING |       |  Spreadsheet: HRT_PROD   |
|  - Mock Data 100 รายการ  |       | - Sandbox สำหรับทดสอบ UAT |       | - ฐานข้อมูลจริงสถานศึกษา  |
|  - รันการทดสอบอัตโนมัติ  |       | - จำลอง Full Restore     |       | - **LOCKED (รอบนี้ไม่แตะ)**|
+──────────────────────────+       +──────────────────────────+       +──────────────────────────+
```

- **ห้ามใช้ LocalStorage เป็นฐานข้อมูลจริง:** LocalStorage อนุญาตให้ใช้สำหรับ UI Cache และ Draft ชั่วคราวเท่านั้น ข้อมูลสต็อก คำขอเบิก และบัญชีคุม ต้องอ่าน/เขียนผ่าน Google Sheets โดยตรง
- **Dynamic Resolution:** ฟังก์ชัน `getSheet(name)` ใน `Read.gs` / `Write.gs` จะดึง `SPREADSHEET_ID` จาก Script Properties ของ Apps Script เสมอ ไคลเอนต์ไม่มีสิทธิ์ส่ง Spreadsheet ID เข้ามาเอง

---

## 4. โหมดการติดตั้งระบบและการตรวจสอบตัวตน (Identity & Execution Mode Analysis)

จากการวิเคราะห์ไฟล์ [`appsscript.json`](file:///c:/Users/Art/.gemini/antigravity/scratch/appsscript.json):
```json
{
  "timeZone": "Asia/Bangkok",
  "dependencies": {},
  "exceptionLogging": "CLOUD",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "DOMAIN"
  }
}
```

### การเปรียบเทียบเชิงลึก: `USER_DEPLOYING` vs `USER_ACCESSING`
1. **`executeAs: "USER_DEPLOYING"` (Owner-Mode) — *เลือกใช้ในระบบนี้*:**
   * **ข้อดีด้านความปลอดภัย:** บัญชี Google Sheets หลัก (`HRT_DB`) ถูกแชร์เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น ครูและบุคลากรทั่วไป (Requesters) ไม่จำเป็นต้องได้รับสิทธิ์ "Editor" ใน Google Drive
   * **ความท้าทายและการแก้ไข:** `Session.getActiveUser().getEmail()` จะคืนค่าว่างหากผู้ใช้ไม่ได้ล็อกอินในโดเมนเดียวกัน ระบบจึงแก้ไขโดยกำหนด `access: "DOMAIN"` และติดตั้งตัวตรวจรับรอง Token/Session ใน [`Api.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Api.gs) ตรวจเทียบกับแผ่นงาน `01_Users`
   * **การป้องกัน:** ไม่อนุญาตให้ใช้ Effective Owner Identity มาแทนที่ตัวตนผู้ขอเบิก โดย `_serverActor` จะถูกดึงจากเซสชันของผู้ใช้ที่ผ่านการยืนยันแล้วเท่านั้น
2. **`executeAs: "USER_ACCESSING"` (Accessing-User Mode) — *ปฏิเสธการใช้*:**
   * **ช่องโหว่ร้ายแรง:** บังคับให้ผู้ใช้งานทุกคน (ครู, เจ้าหน้าที่, นักเรียน) ต้องได้รับสิทธิ์ "Editor" หรือ "Viewer" บนไฟล์ Google Sheets โดยตรง ซึ่งทำให้ครูสามารถเปิด Google Sheets แล้วพิมพ์แก้สต็อกหรือลบประวัติในเซลล์ได้โดยข้าม Business Logic ทั้งหมด

---

## 5. ช่องทางการสื่อสารระหว่างไคลเอนต์และเซิร์ฟเวอร์ (Communication Architecture)

- **ทำไมไม่ใช้ REST / Relative URL (`/api/v1/...`):** บน Google Apps Script Web App เมื่อฝังใน iframe หรือเปิดผ่าน URL ระบบจะทำงานบนโดเมน `script.google.com/macros/s/.../exec` ซึ่งไม่รองรับ Custom HTTP Routing ภายในเหมือน Node.js/Express
- **ช่องทางมาตรฐาน:** ใช้ **HTML Service + `google.script.run`** เป็นสะพานเชื่อมหลัก (RPC Bridge)
  ```javascript
  // ฝั่ง Frontend (ApiServiceCore)
  google.script.run
      .withSuccessHandler(res => resolve(res))
      .withFailureHandler(err => reject(err))
      .apiDispatch(JSON.stringify({
          action: 'requisitions.issue',
          payload: { requisition_id: 'REQ-2569-001' }
      }));
  ```
- **Public RPC Allowlist (`ACTION_REGISTRY`):**
  ทุก Action ที่เรียกเข้ามาต้องผ่านการตรวจสอบใน `ACTION_REGISTRY` ใน [`Api.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Api.gs):
  1. Action ต้องมีชื่ออยู่ใน Allowlist
  2. มีการตรวจสอบ Minimum Role และ Granular Permission
  3. ตรวจสอบ Idempotency Key และคำนวณ SHA-256 Payload Hash
  4. กำหนดปีงบประมาณจากเซิร์ฟเวอร์ (`activeTransactionYear`) ป้องกันไคลเอนต์ส่งปีงบประมาณที่ปิดแล้วเข้ามาเขียน

---

## 6. โครงสร้างคอมโพเนนต์และเลเยอร์ทางสถาปัตยกรรม (Architectural Layering)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER (HTML5 / Tailwind UI)             │
│  Central Dashboard  │  Requisition  │  MiniUI (QR Flow) │ Settings Hub │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ google.script.run.apiDispatch()
┌────────────────────────────────────▼───────────────────────────────────┐
│                    API GATEWAY LAYER (Api.gs)                          │
│  - Dispatcher Allowlist (ACTION_REGISTRY)                              │
│  - Identity & Role-Based Access Control (RBAC Guard)                   │
│  - Parameter Alias Adapter & Validation                                │
│  - Persistent Idempotency Engine & Hash Chaining                       │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │ Read Actions                   │ Write Actions
┌───────────────────▼──────────────┐ ┌───────────────▼───────────────────┐
│     READ SERVICES (Read.gs)      │ │     WRITE SERVICES (Write.gs)     │
│ - Query Projections              │ │ - ScriptLock Mutex Isolation      │
│ - 8-Dimension Filter Engine      │ │ - State Machine Transitions       │
│ - ABC Pareto Classification      │ │ - Two-Phase Writes & Rollback     │
│ - In-Memory Signature Caching    │ │ - Single SSOT Stock Deduction     │
│ - Year-End Audit Summaries       │ │ - Commit Markers & Lease Recovery │
└───────────────────┬──────────────┘ └───────────────┬───────────────────┘
                    │                                │
┌───────────────────▼────────────────────────────────▼───────────────────┐
│                     DATA & LEDGER LAYER (Google Sheets)                │
│  16 Canonical Sheets  │  SSOT Stock Ledger  │  Append-Only Audit Trail │
└────────────────────────────────────────────────────────────────────────┘
```
