# สัญญาการเชื่อมต่อระบบและสารบัญ API (API Contract & Specification)
**ระบบ:** HRT School Inventory Management System v2.6.0  
**สถานศึกษา:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) สังกัดองค์การบริหารส่วนจังหวัดสระบุรี  
**สถาปัตยกรรม:** Google Sheets DB (16 Canonical Sheets) + Google Apps Script Gateway (RPC/REST) + HTML5 SPA  
**มาตรฐานความปลอดภัย:** P0 Fail-Closed Security, Persistent Idempotency, Mutex Lock & Domain Whitelist  

---

## 1. ช่องทางการเชื่อมต่อและโพรโทคอล (Transport Protocols)

ระบบรองรับ 2 ช่องทางการสื่อสารหลักโดยคงความเข้ากันได้กับโค้ดเดิม 100%:

1. **Google Apps Script Direct RPC (Client-side WebApp / google.script.run):**
   - Universal Gateway Facade: `google.script.run.apiCall(action, payload)`
   - Direct Function Facades: `google.script.run.apiGetItems(params)`, `apiCreateRequisition(payload)` ฯลฯ
2. **HTTP POST REST Gateway (External / Headless / Mobile Clients):**
   - URL: `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`
   - Method: `POST`
   - Headers: `Content-Type: application/json`
   - Optional Auth Header: `Authorization: Bearer <GOOGLE_ID_TOKEN>`

---

## 2. โครงสร้างข้อความมาตรฐาน (Standard Message Envelopes)

### 2.1 Request Envelope
```json
{
  "action": "requisitions.create",
  "payload": {
    "item_code": "OFF-001",
    "qty": 5,
    "purpose": "ใช้ในการจัดการเรียนการสอนกลุ่มสาระฯ",
    "fiscalYear": "2569"
  },
  "requestId": "REQ-1729761234000-891",
  "idempotencyKey": "IDEMP-USR01-20261024-001"
}
```

### 2.2 Success Response Envelope
```json
{
  "success": true,
  "action": "requisitions.create",
  "data": {
    "req_id": "REQ-1729761234000-412",
    "req_no": "REQ-2569/001",
    "status": "SUBMITTED",
    "itemsCount": 1
  },
  "requestId": "REQ-1729761234000-891",
  "executionMs": 138,
  "timestamp": "2026-10-24T05:30:00.000Z"
}
```

### 2.3 Error Response Envelope
```json
{
  "success": false,
  "action": "requisitions.issue",
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "INSUFFICIENT_STOCK: Item \"กระดาษ A4\" (ITM-001) has 2 in stock, but 5 requested.",
    "details": null
  },
  "code": "INSUFFICIENT_STOCK",
  "message": "INSUFFICIENT_STOCK: Item \"กระดาษ A4\" (ITM-001) has 2 in stock, but 5 requested.",
  "requestId": "REQ-1729761234000-892",
  "executionMs": 42,
  "timestamp": "2026-10-24T05:30:01.000Z"
}
```

---

## 3. รหัสข้อผิดพลาดมาตรฐาน (Standard Error Codes)

| รหัสข้อผิดพลาด | HTTP Equivalent | คำอธิบายและสาเหตุ |
| :--- | :---: | :--- |
| `UNAUTHORIZED` | 401 | ไม่พบบัญชีผู้ใช้ Google ที่ผ่านการยืนยัน หรือ Token หมดอายุ |
| `FORBIDDEN` | 403 | บทบาทของผู้ใช้ไม่มีสิทธิ์เข้าถึง Endpoint หรือข้ามขอบเขตความเป็นเจ้าของ (Data Ownership) |
| `FORBIDDEN_DOMAIN` | 403 | โดเมนอีเมลไม่อยู่ใน Whitelist องค์กร (`@hrt.ac.th`) |
| `USER_SUSPENDED` | 403 | บัญชีผู้ใช้ถูกระงับการใช้งานในตาราง `01_Users` |
| `UNREGISTERED_USER` | 403 | บัญชี Google ถูกต้องแต่อยู่ในสถานะรอกำหนดสิทธิ์ (Pending Approval) |
| `PARAM_CONFLICT` | 400 | ส่ง Parameter Alias ขัดแย้งกัน (เช่น `fiscalYear` $\ne$ `fiscal_year`) |
| `VALIDATION_ERROR` | 400 | ข้อมูลที่ส่งมาไม่ครบถ้วนหรือไม่ถูกต้องตาม Business Schema |
| `NOT_FOUND` | 404 | ไม่พบรายการพัสดุ, ใบเบิก, แผนก หรือคลังที่ระบุ |
| `INSUFFICIENT_STOCK` | 422 | ยอดสต็อกคงเหลือในคลังไม่เพียงพอต่อการตัดจ่าย |
| `CONCURRENCY_LOCK` | 423 | มีกระบวนการเขียนสต็อกอื่นกำลังทำงานอยู่และหมดเวลา Timeout (LockService) |
| `IDEMPOTENCY_CONFLICT` | 409 | นำ Idempotency Key เดิมมาเรียกซ้ำแต่เปลี่ยนเนื้อหา Payload |
| `CLOSED_FISCAL_YEAR` | 422 | พยายามทำธุรกรรมบันทึกข้อมูล (Write) ในปีงบประมาณที่ปิดรอบไปแล้ว |
| `INVALID_STATE_TRANSITION` | 422 | การเปลี่ยนสถานะใบเบิกไม่เป็นไปตาม State Machine ที่กำหนด |
| `FEATURE_UNSUPPORTED` | 501 | ฟีเจอร์ที่ร้องขอยังไม่เปิดให้บริการ (เช่น การจ่ายพัสดุบางส่วน) |
| `LAST_ADMIN_PROTECTION` | 422 | ป้องกันการลดสิทธิ์หรือระงับบัญชีผู้ดูแลระบบคนสุดท้าย หรือการระงับตนเอง |

---

## 4. กฎการแปลงชื่อพารามิเตอร์และการปฏิเสธข้อขัดแย้ง (Alias Compatibility Adapters)

เพื่อให้ระบบทำงานร่วมกับ Client หลากหลายเวอร์ชัน API Gateway ทำการแปลง Alias ให้อัตโนมัติ โดยมีเงื่อนไขว่า **หากส่งคู่ Alias ที่มีค่าขัดแย้งกันมาพร้อมกัน Server จะ Reject ทันทีด้วยรหัส `PARAM_CONFLICT`**:

1. **ปีงบประมาณ (Fiscal Year):**
   - Aliases: `fiscalYear`, `fiscal_year`
   - กฎ: หากระบุทั้งคู่ ค่าต้องตรงกันหลัง Trim หากขัดแย้ง Reject
   - Canonical Internal Key: `fiscalYear` และ `fiscal_year`
2. **แผนก / กลุ่มสาระการเรียนรู้ (Department):**
   - Aliases: `dept`, `department_id`, `department`
   - กฎ: หากระบุมากกว่า 1 ค่า ค่าต้องเหมือนกันทุกตัว
   - Canonical Internal Key: `dept`, `department_id`
3. **รหัสพัสดุ (Item Code):**
   - Aliases: `itemCode`, `item_code`, `code`
   - Canonical Internal Key: `itemCode`, `item_code`, `code`
4. **รหัสใบเบิก (Requisition ID / Number):**
   - Aliases: `reqNumber`, `req_number`, `reqId`, `req_id`, `requisition_id`
   - Canonical Internal Key: `reqNumber`, `req_id`, `requisition_id`

---

## 5. สารบัญการให้บริการ API (API Action Registry)

### 5.1 หมวดข้อมูลระบบและผู้ใช้ (System & Identity)

#### `bootstrap`
- **สิทธิ์ขั้นต่ำ:** `REQUESTER` (Permission: `VIEW_INVENTORY`)
- **หน้าที่:** โหลด Context เริ่มต้นสำหรับ SPA โดยแยก Public Metadata ออกจาก Secrets อย่างเด็ดขาด (ไม่ส่ง Spreadsheet ID หรือรายการผู้ใช้ทั้งหมด)
- **Response Data:**
  ```json
  {
    "appName": "HRT School Inventory Management System",
    "schoolName": "โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)",
    "organization": "องค์การบริหารส่วนจังหวัดสระบุรี",
    "version": "2.6.0",
    "currentUser": {
      "id": "USR-004",
      "email": "anan.m@hrt.ac.th",
      "name": "นายอนันต์ มั่นคง",
      "role": "OFFICER",
      "department": "งานบริหารทั่วไปและพัสดุ"
    },
    "activeTransactionYear": "2569",
    "fiscalYears": [
      { "fiscal_year": "2568", "status": "CLOSED" },
      { "fiscal_year": "2569", "status": "ACTIVE" },
      { "fiscal_year": "2570", "status": "UPCOMING" }
    ],
    "departments": [...],
    "categories": [...],
    "warehouses": [...]
  }
  ```

#### `users.current`
- **สิทธิ์ขั้นต่ำ:** `REQUESTER`
- **หน้าที่:** อ่านข้อมูลโปรไฟล์ของผู้ใช้ปัจจุบันที่ผ่านการยืนยันตัวตนแล้ว

#### `users.list`
- **สิทธิ์ขั้นต่ำ:** `ADMIN` (Permission: `MANAGE_USERS`)
- **หน้าที่:** ดึงรายชื่อบุคลากรและบทบาททั้งหมดจาก `01_Users`

#### `users.create`
- **สิทธิ์ขั้นต่ำ:** `ADMIN` (Permission: `MANAGE_USERS`)
- **Payload:** `{ "email": "somchai@hrt.ac.th", "name": "นายสมชาย ใจดี", "role": "TEACHER", "department": "กลุ่มสาระฯ วิทยาศาสตร์" }`

#### `users.update`
- **สิทธิ์ขั้นต่ำ:** `ADMIN` (Permission: `MANAGE_USERS`)
- **Payload:** `{ "user_id": "USR-005", "role": "OFFICER", "status": "ACTIVE" }`
- **Guards:** บังคับใช้ `LAST_ADMIN_PROTECTION`

#### `users.suspend`
- **สิทธิ์ขั้นต่ำ:** `ADMIN` (Permission: `MANAGE_USERS`)
- **Payload:** `{ "user_id": "USR-005" }`

---

### 5.2 หมวดพัสดุและคลังสินค้า (Catalog & Inventory)

#### `items.list` (alias: `getItems`)
- **สิทธิ์ขั้นต่ำ:** `REQUESTER` (Permission: `VIEW_INVENTORY`)
- **Parameters:**
  - `fiscalYear` (optional: สำหรับ `selectedViewingYear` โดยไม่กระทบปีธุรกรรมหลัก)
  - `category`, `warehouse`, `status`, `search`, `abc`, `lowStockOnly`, `fsnOnly`, `supplier`
  - `page` (default: 1), `limit` (default: 500)
- **Response Data:** รายการพัสดุ พร้อมคลาส ABC (Pareto 70/20/10) และยอดมูลค่ารวม

#### `items.get` (alias: `getItemDetail`)
- **Parameters:** `{ "item_code": "OFF-001" }`

#### `items.create`
- **สิทธิ์ขั้นต่ำ:** `OFFICER` (Permission: `MANAGE_ITEMS`)
- **Payload:** `{ "code": "OFF-050", "name": "กระดาษโน้ต", "category": "วัสดุสำนักงาน", "unit": "เล่ม", "warehouse": "คลังกลาง", "unit_cost": 25.0, "min": 10, "stock": 50 }`
- **Concurrency Guard:** ทำงานใต้ `LockService` และบันทึกลง Ledger เริ่มต้นหากมียอดยกมา

#### `items.update`
- **สิทธิ์ขั้นต่ำ:** `OFFICER` (Permission: `MANAGE_ITEMS`)

#### `items.import` (alias: `importItems`)
- **สิทธิ์ขั้นต่ำ:** `OFFICER` (Permission: `IMPORT_ITEMS`)
- **Parameters:** `{ "items": [...], "dryRun": true|false, "mergeMode": "merge"|"overwrite" }`
- **Dry-run Feature:** หาก `dryRun: true` จะส่งรายงานตรวจสอบความถูกต้องโดยไม่แตะต้องฐานข้อมูล

---

### 5.3 หมวดรหัสพัสดุสากล FSN (Federal Stock Number)

#### `fsn.list` (alias: `getFsn`)
- **สิทธิ์ขั้นต่ำ:** `REQUESTER`
- **หน้าที่:** ดึงรายการรหัสพัสดุ FSN Catalog จาก `06_FSN_Catalog`

#### `fsn.add` (alias: `addFsn`)
- **สิทธิ์ขั้นต่ำ:** `OFFICER` (Permission: `MANAGE_FSN`)
- **Payload:** `{ "fsn_code": "7510-00-117-2101", "name": "กระดาษ A4", "linked_code": "OFF-001" }`
- **Auto-Sync:** อัปเดต `fsn_code` ย้อนกลับไปยัง `03_Master_Items` อัตโนมัติ

---

### 5.4 หมวด QR Code Resolver (Mobile / MiniUI QR Support)

#### `qr.resolve` (alias: `resolveQr`)
- **สิทธิ์ขั้นต่ำ:** `REQUESTER`
- **Invariant:** **การสแกนหรือ Resolve QR Code จะไม่มีการทำธุรกรรมตัดสต็อกหรือเปลี่ยนแปลงฐานข้อมูลใดๆ โดยเด็ดขาด (Zero Write-on-Open)**
- **Payload:** `{ "qr_token": "QR:ITEM:OFF-001" }` หรือ `{ "qr_token": "QR:TRK:REQ-2569/001" }`
- **ประเภท Resource ที่รองรับ:**
  1. `ITEM` (เช่น `QR:ITEM:OFF-001` หรือ `OFF-001`):
     - คืนข้อมูลพัสดุ, ยอดคงเหลือ, สถานะ และตัวแปร `canOrder: boolean`, `isInactive: boolean`
  2. `WAREHOUSE` (เช่น `QR:WH:WH-01`):
     - คืนข้อมูลสถานที่ตั้ง อาคาร ห้อง และรายการพัสดุที่จัดเก็บในคลังนี้
  3. `TRACKING` (เช่น `QR:TRK:REQ-2569/001`):
     - **Ownership Guard:** ตรวจสอบว่าผู้เรียกเป็นเจ้าของใบเบิก (`user_id === caller.id`) หรือเป็นเจ้าหน้าที่พัสดุ/ผู้บริหาร หากไม่ตรงจะ Reject ทันทีด้วย `FORBIDDEN`

---

### 5.5 หมวดวงจรคำขอเบิก–จ่ายพัสดุ (Requisition Lifecycle)

#### `requisitions.create` (alias: `createRequisition`)
- **สิทธิ์ขั้นต่ำ:** `REQUESTER` (Permission: `CREATE_REQUISITION`)
- **Server Authority:** Server เป็นผู้กำหนด `user_id` จากข้อมูล Caller ที่ยืนยันตัวตนแล้ว ห้ามเชื่อ `teacher`/`userId` ที่ Client ส่งมา
- **Transaction Year Authority:** บันทึกปีงบประมาณธุรกรรมตาม `activeTransactionYear` ของ Server เสมอ
- **Status:** เริ่มต้นที่ `SUBMITTED`
- **Stock Decoupling Invariant:** **ไม่มีการตัดยอดสต็อกในขั้นตอนนี้**

#### `requisitions.list` (alias: `getRequisitions`)
- **สิทธิ์ขั้นต่ำ:** `REQUESTER`
- **Data Scoping Guard:**
  - ครูผู้เบิกทั่วไป (`REQUESTER`/`TEACHER`): เห็นเฉพาะใบเบิกของตนเองเท่านั้น
  - เจ้าหน้าที่/ผู้บริหาร (`OFFICER`/`APPROVER`/`DIRECTOR`/`ADMIN`): เห็นใบเบิกทั้งหมดในสถานศึกษา

#### `requisitions.get`
- **สิทธิ์ขั้นต่ำ:** `REQUESTER`
- **Data Scoping Guard:** ผู้ใช้ทั่วไปดูได้เฉพาะใบเบิกของตนเอง

#### `requisitions.cancel` (alias: `cancelRequisition`)
- **สิทธิ์ขั้นต่ำ:** `REQUESTER` (Permission: `CANCEL_OWN_REQUISITION`)
- **State Machine Guard:** เปลี่ยนสถานะจาก `SUBMITTED` $\rightarrow$ `CANCELLED`
- **Ownership Guard:** ผู้ขอยกเลิกต้องเป็นเจ้าของใบเบิก (หรือ Admin)

#### `requisitions.review` (alias: `reviewRequisition`)
- **สิทธิ์ขั้นต่ำ:** `OFFICER` (Permission: `REVIEW_REQUISITION`)
- **State Machine Guard:** เปลี่ยนสถานะจาก `SUBMITTED` $\rightarrow$ `REVIEWED`

#### `requisitions.approve` (alias: `approveRequisition`)
- **สิทธิ์ขั้นต่ำ:** `APPROVER` (Permission: `APPROVE_REQUISITION`)
- **State Machine Guard:** เปลี่ยนสถานะจาก `SUBMITTED` หรือ `REVIEWED` $\rightarrow$ `APPROVED`
- **Stock Decoupling Invariant:** **ไม่มีการตัดยอดสต็อกในขั้นตอนนี้**

#### `requisitions.reject` (alias: `rejectRequisition`)
- **สิทธิ์ขั้นต่ำ:** `APPROVER` (Permission: `REJECT_REQUISITION`)
- **State Machine Guard:** เปลี่ยนสถานะเป็น `REJECTED` พร้อมบันทึกเหตุผล

#### `requisitions.issue` (alias: `stock.issue`, `issueStock`, `issueRequisition`)
- **สิทธิ์ขั้นต่ำ:** `OFFICER` (Permission: `ISSUE_STOCK`)
- **State Machine Guard:** เปลี่ยนสถานะจาก `APPROVED`, `READY_TO_ISSUE` หรือ `PARTIAL_ISSUED` $\rightarrow$ `ISSUED` หรือ `PARTIAL_ISSUED`
- **⚠️ จุดตัดยอดสต็อกจริงจุดเดียวของระบบ (Atomic Physical Deduction):**
  - ทำงานภายใต้ `LockService` แบบเบ็ดเสร็จ
  - ตรวจสอบยอดคงเหลือก่อนตัดใน `03_Master_Items` ทุกรายการก่อนเริ่มบันทึก
  - รองรับการจ่ายเต็มจำนวนและการจ่ายบางส่วน (Partial Issue) โดยคำนวณยอดค้างจ่าย (`qty_approved - previously_issued`) และบันทึกยอดจ่ายสะสมใน `08_Requisition_Items` คอลัมน์ 7
  - หากจ่ายครบตามยอดอนุมัติทุกรายการ ปรับสถานะใบเบิกเป็น `ISSUED` หากยังค้างจ่ายบางรายการ ปรับเป็น `PARTIAL_ISSUED`
  - บันทึกการตัดยอดสต็อกใน `03_Master_Items`, ลงบันทึก `09_Stock_Transactions` และลงบัญชีคุม `10_Stock_Ledger`
  - มีระบบคืนค่าชดเชย (Compensatory Rollback) หากเกิดข้อผิดพลาดระหว่างเขียนหลายแผ่นงาน
  - รองรับ End-to-End Idempotency ผ่านคีย์ `idempotencyKey` ป้องกันการจ่ายซ้ำและการกดเบิ้ล

#### `requisitions.receive` (alias: `confirmReceipt`)
- **สิทธิ์ขั้นต่ำ:** `REQUESTER` (Permission: `CREATE_REQUISITION`)
- **State Machine Guard:** เปลี่ยนสถานะจาก `ISSUED` $\rightarrow$ `RECEIVED`
- **Ownership Guard:** ครูผู้เบิกเป็นผู้กดยืนยันตรวจรับพัสดุจริง

---

### 5.6 หมวดการรับเข้าและการปรับปรุงสต็อก (Stock Intake & Adjustment)

#### `stock.receive` (alias: `receiveStock`, `restock`)
- **สิทธิ์ขั้นต่ำ:** `OFFICER` (Permission: `RECEIVE_STOCK`)
- **Payload:** `{ "item_code": "OFF-001", "qty": 20, "unit_cost": 115.0, "doc_ref": "RCV-2569/012", "note": "รับพัสดุตามใบส่งของ" }`
- **Transaction:** เพิ่มสต็อกใน `03_Master_Items`, ลงรายการใน `09_Stock_Transactions`, บันทึก Double-Entry Ledger ใน `10_Stock_Ledger`

#### `stock.adjust`
- **สิทธิ์ขั้นต่ำ:** `OFFICER` (Permission: `ADJUST_STOCK`)
- **Payload:** `{ "item_code": "OFF-001", "adjusted_stock": 42, "reason": "ปรับยอดหลังการตรวจนับกายภาพพบชำรุด" }`

---

### 5.7 หมวดการปิดรอบปีงบประมาณและตรวจนับ (Year-End Close & Audit)

#### `startYearEndAudit`
- **สิทธิ์ขั้นต่ำ:** `OFFICER` (Permission: `YEAR_END_AUDIT`)
- **หน้าที่:** โคลนยอดคงเหลือทางบัญชีของพัสดุทุกรายการเข้าสู่ `13_Year_End_Audits` เพื่อเริ่มการตรวจนับ

#### `saveYearEndAudit`
- **สิทธิ์ขั้นต่ำ:** `OFFICER` (Permission: `YEAR_END_AUDIT`)
- **Payload:** `{ "fiscalYear": "2569", "committee": "คณะกรรมการตรวจนับ", "items": [{ "code": "OFF-001", "count_qty": 45, "condition": "ปกติ" }] }`

#### `fiscalYear.close` (alias: `closeFiscalYear`)
- **สิทธิ์ขั้นต่ำ:** `ADMIN` (Permission: `CLOSE_FISCAL_YEAR`)
- **กระบวนการ:**
  1. Freeze ยอดยกไปของปีปัจจุบันลง `13_Year_End_Audits`
  2. เปลี่ยนสถานะปีปัจจุบันใน `12_Fiscal_Years` เป็น `CLOSED`
  3. เปิดปีงบประมาณถัดไปเป็น `ACTIVE`
  4. อัปเดตการตั้งค่าส่วนกลาง `active_fiscal_year` ใน `15_Settings_Config`
  5. ล้าง Cache ข้อมูลทั่วทั้งระบบ (`invalidateCache`)

---

### 5.8 หมวดตรวจสอบความปลอดภัยและบันทึกหลักฐาน (Audit Trail)

#### `audit.list`
- **สิทธิ์ขั้นต่ำ:** `OFFICER` (Permission: `VIEW_AUDIT_LOG`)
- **หน้าที่:** ดึงรายการบันทึก Audit Log ย้อนหลัง โดยข้อมูลที่ส่งออกมาจะถูก Sanitize ปิดบัง Token/Secret ทั้งหมด

#### `audit.verify`
- **สิทธิ์ขั้นต่ำ:** `ADMIN` (Permission: `VERIFY_AUDIT_LOG`)
- **หน้าที่:** ตรวจสอบความถูกต้องของสายโซ่การเข้ารหัส SHA-256 Cryptographic Hash Chain ตั้งแต่แถวแรกจนถึงแถวล่าสุด หากมีการลบ แก้ไข หรือแทรกแถว ระบบจะตรวจจับและชี้ตำแหน่งแถวที่ถูกดัดแปลงทันที

---

### 5.9 หมวดการตั้งค่าระบบ (Settings Shell & Configuration)

#### `settings.get`
- **สิทธิ์ขั้นต่ำ:** `REQUESTER` (คืนเฉพาะ Public Info สำหรับผู้ใช้ทั่วไป, คืนครบ 8 หมวดสำหรับ `ADMIN`)

#### `settings.update`
- **สิทธิ์ขั้นต่ำ:** `ADMIN` (Permission: `MANAGE_SETTINGS`)
- **Payload:** `{ "section": "school", "settings": { "school_name": "...", "low_stock_threshold": 15 } }`
- **Guard:** อนุญาตเฉพาะ Whitelist Keys และบันทึก Audit Trail
