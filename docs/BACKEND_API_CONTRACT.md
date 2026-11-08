# สัญญาการเชื่อมต่อระบบแบ็กเอนด์และสารบัญ API (Backend API Contract & RPC Registry)
## HRT Inventory System — โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)
### เอกสารควบคุม: SIMS-CTR-2026-008
### รุ่นเป้าหมาย: v2.7.0-rc.3 | Historical Baseline: v2.6.0 | วันที่จัดทำ: 2026-10-28

---

## 1. ข้อกำหนดช่องทางการเชื่อมต่อและโพรโทคอล (Transport Protocol & RPC Bridge)

### 1.1 ความจริงเชิงสถาปัตยกรรม (Architecture Reality)
บนสภาพแวดล้อม **Google Apps Script HTML Service**:
- **ไม่มี HTTP REST Server แบบดั้งเดิมภายในหน้าเว็บ**: การอ้างอิง URL สัมพัทธ์ เช่น `fetch('/api/v1/...')` **ไม่สามารถทำงานได้จริง** เนื่องจาก Web App ของ Google Apps Script ทำงานภายใต้ iframe แซนด์บ็อกซ์บนโดเมน `*.googleusercontent.com`
- **ช่องทางหลัก (SSOT Bridge)**: สื่อสารผ่าน **`google.script.run`** โดยใช้ Universal Action Dispatcher:
  ```javascript
  google.script.run
    .withSuccessHandler(response => handleSuccess(response))
    .withFailureHandler(error => handleError(error))
    .apiDispatch({
      action: "requisitions.create",
      payload: { ... },
      idempotencyKey: "IDEMP-..."
    });
  ```
- **ช่องทางสำรอง (Headless / External Automation)**: เข้าถึงผ่าน `doPost(e)` ทาง Web App URL โดยส่ง Payload เป็น JSON Envelope ไปยัง Universal Dispatcher ชุดเดียวกัน

---

## 2. ซองข้อความมาตรฐาน (Standard Message Envelopes)

### 2.1 โครงสร้างคำขอ (Request Envelope)
```json
{
  "action": "requisitions.create",
  "payload": {
    "fiscal_year": "2569",
    "warehouse_id": "WH-MAIN",
    "purpose": "ใช้ในการจัดการเรียนการสอนกลุ่มสาระวิทยาศาสตร์",
    "items": [
      {
        "item_code": "OFF-001",
        "qty_requested": 5
      }
    ]
  },
  "requestId": "REQ-1729761234000-891",
  "idempotencyKey": "IDEMP-USR01-20261028-001",
  "clientTimestamp": "2026-10-28T09:00:00.000Z"
}
```

### 2.2 โครงสร้างผลลัพธ์สำเร็จ (Success Response Envelope)
```json
{
  "success": true,
  "action": "requisitions.create",
  "data": {
    "requisition_id": "REQ-2569-001",
    "requisition_no": "REQ-2569/001",
    "status": "SUBMITTED",
    "items_count": 1,
    "fiscal_year": "2569",
    "warehouse_id": "WH-MAIN"
  },
  "isReplay": false,
  "requestId": "REQ-1729761234000-891",
  "executionMs": 142,
  "timestamp": "2026-10-28T09:00:00.142Z"
}
```

### 2.3 โครงสร้างผลลัพธ์ข้อผิดพลาด (Error Response Envelope)
```json
{
  "success": false,
  "error": "INSUFFICIENT_STOCK: Item OFF-001 requested 50, but available balance is 25",
  "code": "INSUFFICIENT_STOCK",
  "action": "requisitions.create",
  "requestId": "REQ-1729761234000-891",
  "executionMs": 45,
  "timestamp": "2026-10-28T09:00:00.045Z"
}
```

---

## 3. กฎการแปลงและตรวจสอบชื่อพารามิเตอร์เสมือน (Parameter Alias Normalization)

ระบบมีฟังก์ชัน `normalizeAndValidateAliases` บน [`Api.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Api.gs) เพื่อรองรับความเข้ากันได้ย้อนหลัง (Backward Compatibility) โดยมีกฎเหล็ก: **หากส่งชื่อพารามิเตอร์เสมือนมาพร้อมกันแต่ค่าขัดแย้งกัน ระบบจะปฏิเสธคำขอทันทีด้วยรหัส `PARAM_CONFLICT`**

| พารามิเตอร์หลัก (Canonical) | พารามิเตอร์เสมือน (Legacy Aliases) | การตรวจสอบความถูกต้อง (Validation Rule) |
| :--- | :--- | :--- |
| `fiscal_year` | `fiscalYear`, `fy` | หากส่งทั้งคู่ ต้องมีค่าตรงกัน มิฉะนั้นปฏิเสธ `PARAM_CONFLICT` |
| `item_code` | `item_id`, `itemId`, `code` | แมปเข้าหา `item_code` และตรวจสอบว่าตรงกับฐานข้อมูล |
| `warehouse_id` | `warehouse`, `wh_id` | หากไม่ระบุ ให้ใช้ Default Warehouse (`WH-MAIN`) |
| `department_id` | `department`, `dept_id` | แมปเข้าหาฝ่ายงานที่ถูกต้องใน `02_Departments` |
| `qty_requested` | `qty`, `quantity`, `amount` | ต้องเป็นตัวเลขบวก $> 0$ สอดคล้องกับหน่วยนับ |

---

## 4. สารบัญการดำเนินการบริการระบบแบ็กเอนด์ (RPC Action Registry)

### 4.1 บริการพิสูจน์ตัวตนและระบบพื้นฐาน (System & Identity Services)
| Action Name | Handler | Min Role | สิทธิ์ที่ต้องมี | รายละเอียดการทำงาน |
| :--- | :--- | :--- | :--- | :--- |
| `bootstrap` | `apiBootstrap` | `REQUESTER` | `VIEW_INVENTORY` | คืนค่าข้อมูลเริ่มต้นสำหรับการเปิดหน้าจอ (User Profile, Active FY, Base Lookups) |
| `users.current` | `apiGetCurrentUser` | `REQUESTER` | `VIEW_INVENTORY` | ดึงข้อมูลผู้ใช้งานปัจจุบันที่ Server ตรวจสอบตัวตนผ่าน Session แล้ว |
| `users.list` | `apiGetUsers` | `ADMIN` | `MANAGE_USERS` | ดึงรายชื่อผู้ใช้ทั้งหมดในระบบพร้อมบทบาทและสถานะ |
| `users.create` | `apiCreateUser` | `ADMIN` | `MANAGE_USERS` | สร้างบัญชีผู้ใช้งานใหม่ในโดเมน `@hrt.ac.th` |
| `users.update` | `apiUpdateUser` | `ADMIN` | `MANAGE_USERS` | แก้ไขข้อมูลหรือบทบาทผู้ใช้ (คุ้มครอง Last-Admin) |
| `users.suspend` | `apiSuspendUser` | `ADMIN` | `MANAGE_USERS` | ระงับการใช้งานบัญชี (ห้ามระงับ Admin คนสุดท้าย) |
| `system.healthCheck` | `apiCheckHealth` | `OFFICER` | `VIEW_AUDIT_LOG` | ตรวจสอบความสมบูรณ์ของชีตทั้ง 16 แผ่นงาน |

### 4.2 บริการพัสดุและสารบบพัสดุ (Catalog & Inventory Items)
| Action Name | Handler | Min Role | สิทธิ์ที่ต้องมี | รายละเอียดการทำงาน |
| :--- | :--- | :--- | :--- | :--- |
| `items.list` | `apiGetItems` | `REQUESTER` | `VIEW_INVENTORY` | ดึงรายการพัสดุ กรอง 8 มิติ พร้อมผลการจำแนก ABC Pareto |
| `items.get` | `apiGetItemDetail` | `REQUESTER` | `VIEW_INVENTORY` | ดึงรายละเอียดพัสดุ ประวัติการเบิก และยอดคงเหลือรายคลัง |
| `items.create` | `apiCreateItem` | `OFFICER` | `MANAGE_ITEMS` | เพิ่มพัสดุใหม่ใน `03_Master_Items` และสร้าง Opening Balance |
| `items.update` | `apiUpdateItem` | `OFFICER` | `MANAGE_ITEMS` | ปรับปรุงข้อมูลพัสดุ เกณฑ์สต็อกขั้นต่ำ และจุดสั่งซื้อซ้ำ |
| `items.validateImport`| `apiValidateImportItems`| `OFFICER`| `IMPORT_ITEMS` | ตรวจสอบไฟล์ CSV นำเข้าแบบ Dry-Run ป้องกัน Formula Injection |
| `items.import` | `apiImportItems` | `OFFICER` | `IMPORT_ITEMS` | ยืนยันการนำเข้าข้อมูลพัสดุจากไฟล์ CSV ลงสู่ชีตจริง |
| `fsn.list` | `apiGetFsnList` | `REQUESTER` | `VIEW_INVENTORY` | ค้นหารหัสพัสดุภาครัฐ (FSN) จาก `06_FSN_Catalog` |
| `fsn.link` | `apiLinkFsnToItem` | `OFFICER` | `MANAGE_FSN` | ผูกรหัส FSN เข้ากับ Master Item อย่างถาวร |

### 4.3 บริการวงจรชีวิตคำขอเบิกพัสดุ (Requisition Lifecycle Services)
| Action Name | Handler | Min Role | สิทธิ์ที่ต้องมี | Stock Effect |
| :--- | :--- | :--- | :--- | :---: |
| `requisitions.create` | `apiCreateRequisition` | `REQUESTER` | `CREATE_REQUISITION` | **ไม่มี (None)** |
| `requisitions.list` | `apiGetRequisitions` | `REQUESTER` | `VIEW_OWN_REQUISITIONS` | ไม่มี |
| `requisitions.get` | `apiGetRequisitionDetail` | `REQUESTER` | `VIEW_OWN_REQUISITIONS` | ไม่มี |
| `requisitions.cancel` | `apiCancelRequisition` | `REQUESTER` | `CANCEL_OWN_REQUISITION`| ไม่มี |
| `requisitions.review` | `apiReviewRequisition` | `OFFICER` | `REVIEW_REQUISITION` | ไม่มี |
| `requisitions.approve` | `apiApproveRequisition` | `APPROVER` | `APPROVE_REQUISITION` | ไม่มี |
| `requisitions.reject` | `apiRejectRequisition` | `APPROVER` | `REJECT_REQUISITION` | ไม่มี |
| `requisitions.issue` | `apiIssueStock` | `OFFICER` | `ISSUE_STOCK` | **ตัดสต็อกจริง (DEDUCT)** |
| `requisitions.receive` | `apiConfirmReceipt` | `REQUESTER` | `CREATE_REQUISITION` | **ไม่มี (ไม่ตัดซ้ำ)** |

### 4.4 บริการบัญชีคุมพัสดุและคลังสินค้า (Stock Ledger & Warehouses)
| Action Name | Handler | Min Role | สิทธิ์ที่ต้องมี | ทิศทางธุรกรรม (Direction) |
| :--- | :--- | :--- | :--- | :--- |
| `stock.receive` | `apiReceiveStock` | `OFFICER` | `RECEIVE_STOCK` | `RECEIVE` (เพิ่มสต็อก) |
| `stock.adjust` | `apiAdjustStock` | `OFFICER` | `ADJUST_STOCK` | `ADJUST_PLUS` หรือ `ADJUST_MINUS` |
| `fiscalYear.setupInitial`| `apiSetupInitialFiscalYear`| `ADMIN`| `MANAGE_SETTINGS`| `OPENING` (ยกยอดต้นปี) |
| `fiscalYear.close` | `apiCloseFiscalYear` | `ADMIN` | `CLOSE_FISCAL_YEAR`| ล็อกปีบัญชีและคำนวณยอดยกไป |

### 4.5 บริการ QR Code และ MiniUI
| Action Name | Handler | Min Role | สิทธิ์ที่ต้องมี | รายละเอียดการทำงาน |
| :--- | :--- | :--- | :--- | :--- |
| `qr.resolve` | `apiResolveQr` | `REQUESTER` | `VIEW_INVENTORY` | ถอดรหัสโทเค็น QR ตรวจสอบความถูกต้องและดึงข้อมูลพัสดุ (Zero Write) |
| `qr.list` | `apiListQrCodes` | `OFFICER` | `MANAGE_QR` | ดึงสารสนเทศรหัส QR ทั้งหมดที่เปิดใช้งาน |
| `qr.create` | `apiCreateQrCode` | `OFFICER` | `MANAGE_QR` | สร้าง QR Code ใหม่ (ITEM, ROOM, TRACK, GENERAL) |
| `qr.revoke` | `apiRevokeQrCode` | `OFFICER` | `MANAGE_QR` | ยกเลิกสิทธิ์การใช้งานของ QR Code ทันที |

### 4.6 บริการตรวจสอบและตรวจนับสิ้นปี (Audit & Year-End Services)
| Action Name | Handler | Min Role | สิทธิ์ที่ต้องมี | รายละเอียดการทำงาน |
| :--- | :--- | :--- | :--- | :--- |
| `audit.list` | `apiGetAuditLogs` | `OFFICER` | `VIEW_AUDIT_LOG` | ดึงประวัติธุรกรรมและ Audit Trail รายละเอียดสูง |
| `audit.verify` | `apiVerifyAuditIntegrity`| `ADMIN` | `VERIFY_AUDIT_LOG` | ตรวจสอบความสมบูรณ์ของสายโซ่รหัส SHA-256 Hash Chaining |
| `audit.getYearEnd` | `apiGetYearEndAudit` | `OFFICER` | `YEAR_END_AUDIT` | ดึงแผ่นงานตรวจนับพัสดุสิ้นปีพร้อมสถานะผลต่าง |
| `audit.saveYearEnd` | `apiSaveYearEndAudit` | `OFFICER` | `YEAR_END_AUDIT` | บันทึกผลการตรวจนับพัสดุจริง (แยก `null` uninspected และ `0` inspected) |
| `reports.generate` | `apiGetPdReport` | `OFFICER` | `VIEW_AUDIT_LOG` | จัดทำชุดรายงานราชการ พ.ด. ๑ ถึง พ.ด. ๗ ตามสเปกทางการ |

### 4.7 บริการศูนย์ตั้งค่าระบบ (Settings Hub 8 Categories)
| Action Name | Handler | Min Role | สิทธิ์ที่ต้องมี | รายละเอียดการทำงาน |
| :--- | :--- | :--- | :--- | :--- |
| `settings.get` | `apiGetSettings` | `REQUESTER` | `VIEW_INVENTORY` | ดึงข้อมูลการตั้งค่าสาธารณะของสถานศึกษา |
| `settings.getSection` | `apiGetSettingsSection` | `REQUESTER` | กรองตามบทบาท | ดึงข้อมูลการตั้งค่าเฉพาะหมวดหมู่ (1-8) |
| `settings.update` | `apiUpdateSettings` | `ADMIN` | `MANAGE_SETTINGS` | บันทึกการตั้งค่ารวมของระบบ (คุ้มครอง Concurrency Token) |
| `settings.updateSection`| `apiUpdateSettingsSection`| `ADMIN`| `MANAGE_SETTINGS`| บันทึกการตั้งค่าเฉพาะเซกชันพร้อมการตรวจสอบ Type/Range |
| `settings.backup` | `apiBackupFull` | `ADMIN` | `MANAGE_SETTINGS` | สร้าง Snapshot ฐานข้อมูลฉุกเฉิน |

---

## 5. การจำแนกรหัสข้อผิดพลาดของระบบ (Error Taxonomy & Recovery Guide)

| Error Code | HTTP Equivalent | คำอธิบายสาเหตุ (Root Cause) | แนวทางแก้ไขสำหรับผู้ใช้/ไคลเอนต์ (Recovery Action) |
| :--- | :---: | :--- | :--- |
| `AUTH_REQUIRED` | 401 | ไม่พบ Session หรือโทเค็นหมดอายุ | นำทางผู้ใช้ไปยังหน้าเข้าสู่ระบบ (Google SSO) |
| `ACCESS_DENIED` | 403 | บทบาทของผู้ใช้ไม่มีสิทธิ์ใน Action นี้ | แสดงข้อความแจ้งเตือนสิทธิ์ และซ่อนปุ่มการกระทำ |
| `IDEMPOTENCY_CONFLICT` | 409 | ส่ง `idempotencyKey` เดิม แต่แก้ Payload | สร้าง Idempotency Key ใหม่ หรือกดยกเลิกคำขอเดิม |
| `CONCURRENCY_LOCKED` | 423 | มีธุรกรรมอื่นกำลังเขียนชีตเดียวกันอยู่ | หน่วงเวลาแบบ Exponential Backoff แล้วลองใหม่ |
| `INSUFFICIENT_STOCK` | 422 | ยอดคงเหลือในคลังที่ระบุไม่เพียงพอต่อการจ่าย | ลดจำนวนที่เบิก หรือขอโอนย้ายพัสดุระหว่างคลัง |
| `CLOSED_FISCAL_YEAR` | 422 | พยายามเขียนหรือตัดสต็อกในปีที่ปิดบัญชีแล้ว | สลับไปยังปีงบประมาณที่เปิดใช้งานปัจจุบัน (`activeYear`) |
| `INVALID_DIRECTION` | 400 | ระบุประเภทธุรกรรมไม่อยู่ใน 7 ทิศทางทางการ | แก้ไขเป็น `RECEIVE`, `ISSUE`, `ADJUST_PLUS` ฯลฯ |
| `AMBIGUOUS_ADJUST` | 400 | ระบุ `ADJUST` โดยไม่เจาะจง PLUS/MINUS | เลือกว่าเป็นการปรับยอดเพิ่ม (`PLUS`) หรือลด (`MINUS`) |
| `PARAM_CONFLICT` | 400 | ส่งพารามิเตอร์เสมือนที่มีค่าขัดแย้งกัน | ส่งพารามิเตอร์เพียงค่าเดียวตามมาตรฐาน Canonical |
| `UNIT_FRACTION_INVALID`| 422 | ใส่ทศนิยมในหน่วยนับที่เป็นจำนวนเต็ม (ชิ้น/อัน) | ระบุจำนวนเต็มเท่านั้นสำหรับหน่วยนับชนิดไม่ต่อเนื่อง |
| `REVOKED_QR` | 404 | รหัส QR ถูกสั่งยกเลิกการใช้งานแล้ว | แจ้งเจ้าหน้าที่พัสดุเพื่อขอพิมพ์ป้าย QR Code ใหม่ |
| `LAST_ADMIN_PROTECT` | 403 | พยายามลดสิทธิ์หรือระงับ Admin คนสุดท้าย | ระบบไม่อนุญาต ต้องตั้ง Admin คนใหม่ก่อนดำเนินการ |
