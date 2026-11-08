# ข้อกำหนดและสัญญาเกตเวย์การตั้งค่าระบบ (Settings API Contract Specification)
## HRT Inventory System — โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)
### รุ่นเป้าหมาย: v2.7.0-rc.2 | Baseline: v2.6.0

---

### 1. หลักการออกแบบสถาปัตยกรรม (Core Architectural Principles)
1. **Server-Authoritative Gateway:** การประมวลผลและการตัดสินใจด้านสิทธิ์ (Authorization) อยู่ที่เซิร์ฟเวอร์ Google Apps Script เท่านั้น ไคลเอนต์ไม่สามารถเขียนตรงลง Google Sheets ได้
2. **Fail-Closed Security:** หากไม่สามารถระบุตัวตน ตรวจสอบสิทธิ์ไม่ผ่าน หรือพารามิเตอร์ขัดแย้ง ระบบจะปฏิเสธคำขอทันที (`FORBIDDEN` / `UNAUTHORIZED`)
3. **Optimistic Concurrency Control:** การแก้ไขข้อมูลการตั้งค่าในแผ่นงาน `12_Settings` และ Master Data ต้องส่ง `expectedRevisionId` หากโทเคนไม่ตรงกับเซิร์ฟเวอร์ (มีการแก้ไขชนกัน) คำขอจะถูกปฏิเสธด้วยรหัส `CONCURRENCY_CONFLICT (HTTP 409)`
4. **Formula Injection Sanitization:** ค่าสตริงทั้งหมดที่ส่งผ่าน API จะถูกตรวจสอบ หากขึ้นต้นด้วยอักขระพิเศษ `=`, `+`, `-`, `@`, `\t`, `\r` จะถูกปฏิเสธหรือแปลงรูป (`'`) ทันทีเพื่อป้องกันการรันคำสั่งบนชีต

---

### 2. บัญชีข้อกำหนดสัญญา RPC Endpoints (API Endpoint Specifications)

#### 2.1 `settings.getSection`
- **คำอธิบาย:** เรียกอ่านข้อมูลการตั้งค่าตามหมวดหมู่ พร้อมคัดกรองข้อมูลตามสิทธิ์ของผู้เรียก
- **สิทธิ์ที่ต้องการ:**
  - `school`, `rules`, `miniui`: ทุกบทบาท (ADMIN, OFFICER, DIRECTOR, REQUESTER)
  - `fiscal`, `masterData`, `audit`: ADMIN, OFFICER, DIRECTOR
  - `users`, `connection`, `system`: ADMIN Only
- **Request Payload:**
```json
{
  "action": "settings.getSection",
  "payload": {
    "section": "school" // "school" | "users" | "fiscal" | "masterData" | "rules" | "miniui" | "connection" | "audit"
  }
}
```
- **Response Schema (200 OK):**
```json
{
  "success": true,
  "section": "school",
  "data": {
    "school_name": "โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)",
    "school_short_name": "หรเทพ",
    "school_org": "องค์การบริหารส่วนจังหวัดสระบุรี",
    "school_agency": "สำนักงานเขตพื้นที่การศึกษาสระบุรี",
    "school_address": "ต.หรเทพ อ.บ้านหมอ จ.สระบุรี 18130",
    "school_phone": "036-200-xxx",
    "school_email": "office@hrt.ac.th",
    "document_prefix": "พด.",
    "document_pattern": "{PREFIX}-{YEAR}-{SEQ:4}",
    "officer_name": "นายอนันต์ มีทรัพย์",
    "officer_pos": "เจ้าหน้าที่พัสดุ",
    "director_name": "ดร.สมศักดิ์ รุ่งเรือง",
    "director_pos": "ผู้อำนวยการโรงเรียน"
  },
  "revisionId": "REV-SETTINGS-002"
}
```
- **Error Responses:**
  - `403 FORBIDDEN`: ผู้ใช้ไม่มีสิทธิ์เข้าถึงหมวดหมู่นี้
  - `400 INVALID_ARGUMENT`: ไม่ระบุหมวดหมู่หรือไม่ตรงตามรายการที่รองรับ

---

#### 2.2 `settings.updateSection`
- **คำอธิบาย:** บันทึกการเปลี่ยนแปลงข้อมูลการตั้งค่าในหมวดหมู่ที่ระบุ โดยใช้ Concurrency Token
- **สิทธิ์ที่ต้องการ:** ADMIN Only
- **Request Payload:**
```json
{
  "action": "settings.updateSection",
  "payload": {
    "section": "rules",
    "expectedRevisionId": "REV-SETTINGS-002",
    "data": {
      "abc_threshold_a": 80,
      "abc_threshold_b": 95,
      "low_stock_threshold": 5,
      "rop_factor": 1.25,
      "allow_over_quota": false,
      "workflow_mode": "TWO_STEP"
    }
  }
}
```
- **Response Schema (200 OK):**
```json
{
  "success": true,
  "message": "Settings section rules updated successfully",
  "section": "rules",
  "revisionId": "REV-SETTINGS-003",
  "updatedAt": "2026-10-28T07:35:00.000Z"
}
```
- **Error Responses:**
  - `409 CONCURRENCY_CONFLICT`: `expectedRevisionId` ไม่ตรงกับเวอร์ชันปัจจุบันบนเซิร์ฟเวอร์
  - `400 INVALID_ARGUMENT`: ค่าตัวเลขติดลบ, เกณฑ์พาเรโตผิดตรรกะ ($A \ge B$), หรือขึ้นต้นด้วยอักขระอันตราย

---

#### 2.3 `users.updateAccess` & `users.deactivate`
- **คำอธิบาย:** เพิ่ม แก้ไขสิทธิ์ หรือระงับบัญชีผู้ใช้งาน พร้อมระบบป้องกัน Last-Admin Protection
- **สิทธิ์ที่ต้องการ:** ADMIN Only
- **Request Payload (`users.updateAccess`):**
```json
{
  "action": "users.updateAccess",
  "payload": {
    "email": "teacher.somchai@hrt.ac.th",
    "name": "นายสมชาย สายใจ",
    "role": "REQUESTER",
    "department": "กลุ่มสาระฯ วิทยาศาสตร์และเทคโนโลยี",
    "status": "ACTIVE"
  }
}
```
- **Request Payload (`users.deactivate`):**
```json
{
  "action": "users.deactivate",
  "payload": {
    "email": "anant.m@hrt.ac.th"
  }
}
```
- **Error Response (Last-Admin Guard):**
```json
{
  "success": false,
  "error": "LAST_ADMIN_PROTECTED",
  "message": "Cannot demote or suspend the last active administrator in the system",
  "code": 403
}
```

---

#### 2.4 `masterData.upsert` & `masterData.deactivate`
- **คำอธิบาย:** จัดการข้อมูลโครงสร้างพื้นฐาน (ฝ่ายงาน, คลัง, หมวดหมู่, หน่วยนับ)
- **สิทธิ์ที่ต้องการ:** ADMIN Only
- **Request Payload (`masterData.upsert`):**
```json
{
  "action": "masterData.upsert",
  "payload": {
    "type": "warehouses", // "departments" | "warehouses" | "categories" | "units"
    "data": {
      "code": "WH-SCI",
      "name": "ห้องปฏิบัติการวิทยาศาสตร์",
      "desc": "คลังสารเคมีและอุปกรณ์แล็บ อาคาร 2",
      "status": "ACTIVE"
    }
  }
}
```
- **Request Payload (`masterData.deactivate` - Soft-delete):**
```json
{
  "action": "masterData.deactivate",
  "payload": {
    "type": "categories",
    "id": "CAT-OFFICE"
  }
}
```
- **Response Schema:**
```json
{
  "success": true,
  "message": "Master data updated to INACTIVE (Soft-deleted due to existing item references)",
  "refCount": 25
}
```

---

#### 2.5 `qr.create` & `qr.preview`
- **คำอธิบาย:** สร้างโทเคนและตัวอย่าง SVG สำหรับป้าย QR Code พัสดุและสถานที่
- **สิทธิ์ที่ต้องการ:** ADMIN, OFFICER
- **Request Payload (`qr.create`):**
```json
{
  "action": "qr.create",
  "payload": {
    "type": "ITEM", // "ITEM" | "ROOM" | "TRACK" | "GENERAL"
    "target": "OFF-001",
    "label": "กระดาษถ่ายเอกสาร A4 70 แกรม Double A"
  }
}
```
- **Response Schema (200 OK):**
```json
{
  "success": true,
  "token": "QR:ITEM:OFF-001",
  "svg": "<svg viewBox=\"0 0 100 100\">...</svg>",
  "target": "OFF-001",
  "label": "กระดาษถ่ายเอกสาร A4 70 แกรม Double A",
  "status": "ACTIVE",
  "createdAt": "2026-10-28"
}
```

---

#### 2.6 `system.healthCheck`
- **คำอธิบาย:** ตรวจสอบความสมบูรณ์เชิงโครงสร้างและความพร้อมของแผ่นงานทั้ง 16 แผ่น
- **สิทธิ์ที่ต้องการ:** ADMIN Only
- **Response Schema (200 OK):**
```json
{
  "success": true,
  "status": "HEALTHY",
  "activeFiscalYear": 2569,
  "sheetValidation": {
    "totalSheets": 16,
    "validSheets": 16,
    "missingSheets": [],
    "schemaErrors": []
  },
  "writeGuards": {
    "concurrencyMutex": "ACTIVE",
    "formulaInjectionFilter": "ACTIVE",
    "closedYearLock": "ACTIVE"
  },
  "timestamp": "2026-10-28T07:35:10.000Z"
}
```

---

#### 2.7 `imports.validate` & `imports.commit`
- **คำอธิบาย:** กระบวนการตรวจสอบและนำเข้าข้อมูลพัสดุจากไฟล์ CSV โดยไม่ทำลายข้อมูลเดิม
- **สิทธิ์ที่ต้องการ:** `imports.validate`: ADMIN, OFFICER | `imports.commit`: ADMIN Only
- **Request Payload (`imports.validate`):**
```json
{
  "action": "imports.validate",
  "payload": {
    "csvData": "code,name,category,unit,unit_cost\nOFF-020,ดินสอดำ,วัสดุสำนักงาน,กล่อง,45.00"
  }
}
```
- **Response Schema (Validation Dry-Run):**
```json
{
  "success": true,
  "dryRun": true,
  "totalRows": 1,
  "validRows": 1,
  "errorRows": 0,
  "errors": [],
  "readyToCommit": true
}
```

---

### 3. ตารางรหัสข้อผิดพลาดมาตรฐาน (Standard Error Codes)

| Error Code | HTTP Status | คำอธิบายความหมาย | การปฏิบัติของฝั่งผู้ใช้ / ไคลเอนต์ |
| :--- | :---: | :--- | :--- |
| `UNAUTHORIZED` | 401 | ไม่พบข้อมูลประจำตัว หรือเซสชันหมดอายุ | นำทางไปยังหน้าจอ Login |
| `ACCOUNT_SUSPENDED` | 403 | บัญชีผู้ใช้ถูกระงับการใช้งานในแผ่นงาน `01_Users` | แจ้งเตือนผู้ใช้และตัดการทำงาน |
| `FORBIDDEN` | 403 | บทบาทของผู้ใช้ไม่มีสิทธิ์เข้าถึงฟังก์ชันนี้ | ซ่อนปุ่มหรือแจ้งเตือนสิทธิ์ไม่เพียงพอ |
| `CONCURRENCY_CONFLICT` | 409 | `expectedRevisionId` ไม่ตรงกับข้อมูลล่าสุด | แสดงกล่องข้อความขัดแย้งและให้กดรีโหลด |
| `LAST_ADMIN_PROTECTED` | 403 | ความพยายามลดสิทธิ์หรือระงับแอดมินคนสุดท้าย | ปฏิเสธการบันทึกและแสดงคำชี้แจง |
| `FISCAL_YEAR_CLOSED` | 400 | พยายามสร้างธุรกรรมเขียนในรอบปีที่ปิดบัญชีแล้ว | ป้องกันการกดบันทึกธุรกรรม |
| `INVALID_ARGUMENT` | 400 | พารามิเตอร์ไม่ครบถ้วน หรือมีค่าติดลบ | แสดงข้อความแจ้งเตือนช่องที่ผิดพลาด |
| `FORMULA_INJECTION_REJECTED` | 400 | ข้อความขึ้นต้นด้วย `=`, `+`, `-`, `@` | แจ้งเตือนผู้ใช้ให้ลบอักขระอันตราย |
| `DECIMAL_NOT_ALLOWED` | 400 | ระบุจำนวนทศนิยมในหน่วยนับที่เป็นจำนวนเต็ม | ปรับยอดเป็นจำนวนเต็ม |
| `QR_REVOKED` | 400 | โทเคน QR Code ถูกเพิกถอนสถานะการใช้งาน | แจ้งผู้ใช้ว่าป้าย QR นี้ถูกยกเลิกแล้ว |
