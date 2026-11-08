# ระบบจัดการการตั้งค่า (Settings Architecture & Design Specification)
## HRT Inventory System v2.6.0 (โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี))

---

### 1. ภาพรวมและหลักการออกแบบ (Overview & Principles)

ระบบจัดการการตั้งค่า (Settings Shell) ใน HRT Inventory System v2.6.0 ได้รับการออกแบบขึ้นใหม่ตามมาตรฐานความปลอดภัยและความยืดหยุ่นในการบริหารงานพัสดุโรงเรียน โดยยึดหลักการสำคัญ 5 ประการ:

1. **Role-Based Access Control (RBAC) & Least Privilege**:
   - หน้าจอการตั้งค่าแบ่งออกเป็น 8 หมวดหมู่ย่อย (Categories) แต่ละหมวดหมู่ผูกกับสิทธิ์เฉพาะ (`PERMISSIONS`) ใน [Config.gs](file:///c:/Users/Art/.gemini/antigravity/scratch/Config.gs)
   - ผู้ใช้งานจะเห็นและแก้ไขได้เฉพาะหมวดหมู่ที่ได้รับอนุญาตตามบทบาท (`ROLE_PERMISSIONS`) เท่านั้น
2. **Secret & Infrastructure Isolation**:
   - ป้องกันการรั่วไหลของข้อมูลโครงสร้างพื้นฐานและกุญแจลับ (เช่น `SPREADSHEET_ID`, Service Account keys, OAuth client secrets, internal salt) โดยไม่ส่งคืนข้อมูลเหล่านี้ผ่าน API ใดๆ ทั้งสิ้น (`apiGetSettings`, `apiBootstrap`)
3. **Unsaved Changes (Dirty Form) Guard**:
   - ระบบตรวจจับการแก้ไขฟอร์มแบบเรียลไทม์ (`isSettingsDirty`, `markSettingsDirty`)
   - ป้องกันข้อมูลสูญหายเมื่อผู้ใช้พยายามเปลี่ยนแท็บหมวดหมู่ รีโหลดหน้า หรือสลับบทบาท โดยแสดงหน้าต่างแจ้งเตือนยืนยันก่อนละทิ้งการเปลี่ยนแปลง
4. **Server-Side Validation & Last-Admin Protection**:
   - การบันทึกข้อมูลทั้งหมดผ่าน [Write.gs](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs) (`apiUpdateSettings`, `apiUpdateUser`, `apiSuspendUser`) มีการตรวจสอบความถูกต้องและมาตรการป้องกันแอดมินคนสุดท้าย (Last-Admin Protection) ไม่ให้ลดสิทธิ์หรือระงับการใช้งานบัญชีตนเองจนระบบขาดผู้ดูแล
5. **Audit Logging & Tamper Evidence**:
   - ทุกการเปลี่ยนแปลงค่าคอนฟิกจะถูกบันทึกลงในชีต `10_Audit_Log` พร้อม `actor_id`, `action`, `sha256(payload)` และการชำระข้อมูลลับ (Sanitization) อัตโนมัติ

---

### 2. โครงสร้าง 8 หมวดหมู่การตั้งค่า (The 8 Settings Categories)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SETTINGS SHELL (viewSettings)                         │
├─────────────────────────┬───────────────────────────────────────────────────┤
│  CATEGORY NAVIGATION    │  ACTIVE CATEGORY WORKSPACE                        │
│                         │                                                   │
│  [1] School Profile     │  ┌──────────────────────────────────────────────┐ │
│  [2] Fiscal Year & Roll │  │ Category Title & Description                 │ │
│  [3] User Directory     │  │ Unsaved Changes Badge [!]                    │ │
│  [4] Departments        │  ├──────────────────────────────────────────────┤ │
│  [5] Warehouses         │  │ Dynamic Form / Table Content                 │ │
│  [6] Categories & FSN   │  │                                              │ │
│  [7] System & Health    │  ├──────────────────────────────────────────────┤ │
│  [8] Audit Verifier     │  │ Action Toolbar: [Cancel] [Save Changes]      │ │
│                         │  └──────────────────────────────────────────────┘ │
└─────────────────────────┴───────────────────────────────────────────────────┘
```

#### รายละเอียดทั้ง 8 หมวดหมู่:

| หมวดหมู่ (Category Key) | ชื่อหมวดหมู่ภาษาไทย | สิทธิ์ที่ต้องใช้ (Permission) | บทบาทที่เข้าถึงได้ | หน้าที่และข้อมูลที่บริหารจัดการ |
| :--- | :--- | :--- | :--- | :--- |
| `profile` | ข้อมูลโรงเรียนและหน่วยงาน | `SETTINGS_VIEW_ALL` / `SETTINGS_EDIT` | ADMIN | ชื่อโรงเรียน, รหัสสถานศึกษา, เบอร์โทรศัพท์, ที่อยู่, ลิงก์ตราสัญลักษณ์โรงเรียน |
| `fiscalYear` | ปีงบประมาณและการตัดรอบ | `SETTINGS_VIEW_ALL` / `SETTINGS_EDIT` | ADMIN | ปีงบประมาณปัจจุบัน (`activeTransactionYear`), รายการปีที่ปิดแล้ว (`closed_years`), วันที่ตัดรอบ, การเริ่มกระบวนการ Rollover |
| `users` | ทะเบียนผู้ใช้งานและสิทธิ์ | `USER_MANAGE` | ADMIN | รายชื่อผู้ใช้, อีเมล Google Workspace, แผนก, บทบาท (`ADMIN`, `OFFICER`, `APPROVER`, `TEACHER`), สถานะ (`ACTIVE`, `SUSPENDED`) พร้อม Last-Admin Guard |
| `departments` | แผนก/กลุ่มสาระการเรียนรู้ | `SETTINGS_VIEW_ALL` / `SETTINGS_EDIT` | ADMIN | รายการกลุ่มสาระฯ/ฝ่ายงาน, หัวหน้าฝ่าย/ผู้รับผิดชอบ, สถานะการใช้งาน |
| `warehouses` | คลังพัสดุและสถานที่จัดเก็บ | `SETTINGS_VIEW_ALL` / `SETTINGS_EDIT` | ADMIN, OFFICER | รายชื่อคลัง (เช่น คลังกลาง, คลังวิทยาศาสตร์), สถานที่ตั้ง, ความจุ, ผู้ดูแลคลัง |
| `categories` | หมวดหมู่พัสดุและรหัส FSN | `SETTINGS_VIEW_ALL` / `SETTINGS_EDIT` | ADMIN, OFFICER | หมวดหมู่วัสดุสิ้นเปลือง/ครุภัณฑ์, คำนำหน้ารหัส FSN, ค่าเริ่มต้นระดับแจ้งเตือนสต็อกต่ำ (Min/Max Thresholds) |
| `system` | สภาพระบบและฐานข้อมูล | `SETTINGS_VIEW_ALL` | ADMIN | สถานะการเชื่อมต่อชีต 16 แผ่น, สถิติจำนวนแถว, เวอร์ชันสคีมา (`2.6.0`), แคช TTL, สวิตช์เปิด/ปิดฟังก์ชันฉุกเฉิน |
| `audit` | ประวัติการแก้ไขและตรวจสอบ | `AUDIT_VIEW` | ADMIN | ประวัติการเปลี่ยนแปลงระบบ (Audit Trail Viewer), การตรวจสอบความสมบูรณ์ของ Hash Chain (`Audit Verifier`), ตัวเลือกการส่งออกบันทึก |

---

### 3. การควบคุมสิทธิ์และการแยกข้อมูลลับ (RBAC & Secret Isolation)

#### 3.1 การตรวจสอบสิทธิ์ฝั่งเซิร์ฟเวอร์ (Server-Side Permission Enforcement)
ใน [Read.gs](file:///c:/Users/Art/.gemini/antigravity/scratch/Read.gs) ฟังก์ชัน `apiGetSettings(ctx)` ตรวจสอบสิทธิ์อย่างเข้มงวด:
- หากผู้ใช้ไม่มีสิทธิ์ `SETTINGS_VIEW_ALL` และไม่มี `USER_MANAGE` หรือ `AUDIT_VIEW` จะถูกปฏิเสธด้วยรหัสข้อผิดพลาด `FORBIDDEN` (HTTP 403)
- หมวดหมู่ `users` จะส่งคืนก็ต่อเมื่อผู้ใช้มีสิทธิ์ `USER_MANAGE`
- หมวดหมู่ `audit` จะส่งคืนก็ต่อเมื่อผู้ใช้มีสิทธิ์ `AUDIT_VIEW`
- หมวดหมู่อื่นๆ จะส่งคืนเฉพาะผู้ใช้ที่มีสิทธิ์ `SETTINGS_VIEW_ALL`

#### 3.2 กฎการแยกข้อมูลลับ (Secret Isolation Protocol)
โครงสร้างอ็อบเจกต์ที่ส่งกลับจาก `apiGetSettings`:
```json
{
  "profile": {
    "school_name": "โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)",
    "school_code": "HRT-1080001",
    "contact_email": "admin@horthep.ac.th",
    "phone": "036-xxx-xxx",
    "address": "ตำบลหรเทพ อำเภอบ้านหมอ จังหวัดสระบุรี",
    "logo_url": "https://..."
  },
  "fiscalYear": {
    "activeTransactionYear": 2570,
    "available_years": [2568, 2569, 2570],
    "closed_years": [2568, 2569],
    "rollover_locked": true
  },
  "departments": [ ... ],
  "warehouses": [ ... ],
  "categories": [ ... ],
  "system": {
    "version": "2.6.0",
    "status": "HEALTHY",
    "environment": "Google Apps Script / Sheets DB",
    "schema_sheets_count": 16
  }
}
```
**สิ่งที่ห้ามปรากฏในผลลัพธ์โดยเด็ดขาด**:
- `SPREADSHEET_ID` หรือ URL ตรงของ Google Spreadsheet
- Google Service Account Private Key หรือ Client Secret
- JWT Signing Secrets หรือ Session Salt
- รหัสผ่าน รหัสผ่านชั่วคราว หรือ Bearer Tokens

---

### 4. สถาปัตยกรรม UI และการป้องกันข้อมูลค้าง (Frontend Shell & Dirty Form Guard)

#### 4.1 การจัดการสถานะใน Frontend ([App.js](file:///c:/Users/Art/.gemini/antigravity/scratch/frontend/main/App.js))
ตัวแปรสถานะและการทำงาน:
- `isSettingsDirty`: ตัวแปรบลีนติดตามว่ามีการพิมพ์หรือแก้ไขค่าในฟอร์มของหมวดหมู่ปัจจุบันหรือไม่
- `currentSettingsCategory`: หมวดหมู่ที่กำลังแสดงผลอยู่ในปัจจุบัน (เริ่มต้นที่ `profile`)
- `markSettingsDirty(dirty)`: ฟังก์ชันปรับปรุงสถานะและแสดงผลแท็กแจ้งเตือน `(ยังไม่บันทึก)` บนแถบหัวข้อและปุ่มบันทึก
- `switchSettingsCategory(categoryKey)`: กลไกสลับหมวดหมู่ หาก `isSettingsDirty === true` ระบบจะแสดงกล่องข้อความยืนยัน:
  > *"มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ต้องการละทิ้งการแก้ไขและสลับหน้าต่างหรือไม่?"*
  หากผู้ใช้กด "ยกเลิก" หน้าจอจะคงอยู่ที่เดิม

#### 4.2 แถบเครื่องมือและปุ่มบันทึกข้อมูล (Action Toolbar & Live API Save)
ใน [index.html](file:///c:/Users/Art/.gemini/antigravity/scratch/index.html) หมวดหมู่ที่มีฟอร์มแก้ไขจะมาพร้อมกับ Action Toolbar ด้านล่าง:
- **ปุ่ม [ยกเลิก / คืนค่า] (`btnCancelSettings`)**: คืนค่าฟอร์มกลับไปเป็นค่าเดิมที่โหลดมาจากเซิร์ฟเวอร์ และรีเซ็ต `isSettingsDirty = false`
- **ปุ่ม [บันทึกการตั้งค่า] (`btnSaveSettings`)**: รวบรวมข้อมูลฟอร์ม ตรวจสอบความถูกต้อง และส่งคำขอไปยังเซิร์ฟเวอร์:
  ```javascript
  const payload = {
    category: currentSettingsCategory,
    data: collectedFormData
  };
  google.script.run
    .withSuccessHandler(res => {
      showToast('บันทึกการตั้งค่าเรียบร้อยแล้ว', 'success');
      markSettingsDirty(false);
      loadSettingsData();
    })
    .withFailureHandler(err => {
      showToast('เกิดข้อผิดพลาดในการบันทึก: ' + err.message, 'error');
    })
    .apiUpdateSettings(payload);
  ```

---

### 5. การจัดการผู้ใช้และการป้องกัน Last-Admin (User Management & Last-Admin Guard)

#### 5.1 การคุ้มครองบัญชีผู้ดูแลระบบคนสุดท้าย (Last-Admin Protection Invariant)
ในโรงเรียน อาจมีผู้ดูแลระบบ (`ADMIN`) เพียง 1 หรือ 2 คน เพื่อป้องกันเหตุการณ์ที่ระบบถูกล็อกถาวร (Administrative Lockout):
- เมื่อมีการเรียก `apiUpdateUser` เพื่อเปลี่ยนบทบาท (Role) ของผู้ใช้ที่เป็น `ADMIN` ให้เป็นบทบาทอื่น หรือ
- เมื่อมีการเรียก `apiSuspendUser` เพื่อระงับสถานะของผู้ใช้ที่เป็น `ADMIN`
- เซิร์ฟเวอร์ใน [Write.gs](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs) จะนับจำนวนบัญชีที่เป็น `ADMIN` ที่มีสถานะ `ACTIVE` ทั้งหมดในระบบ:
  ```javascript
  const activeAdmins = allUsers.filter(u => u.role === 'ADMIN' && u.status === 'ACTIVE');
  if (activeAdmins.length <= 1 && targetUserId === currentUserId) {
    throw new Error('LAST_ADMIN_PROTECTION: Cannot demote or suspend the last active administrator.');
  }
  ```
- หากเป็นแอดมินคนสุดท้าย ระบบจะปฏิเสธคำขอทันทีด้วยข้อผิดพลาด `LAST_ADMIN_PROTECTION`

---

### 6. การทดสอบและการตรวจรับ (Verification & Test Evidence)

การทำงานของระบบตั้งค่าและการรักษาความปลอดภัยได้รับการทดสอบและยืนยันผลผ่าน [tests/p1_p2_contract_lifecycle_test.js](file:///c:/Users/Art/.gemini/antigravity/scratch/tests/p1_p2_contract_lifecycle_test.js):
- **TEST 7 (Settings Read Permissions & Secret Isolation)**: ทดสอบการอ่านคอนฟิกของบทบาทต่างๆ และยืนยันว่าไม่มีข้อมูลลับรั่วไหล $\rightarrow$ **PASS**
- **TEST 9 (Last-Admin Protection Against Self-Demotion & Suspension)**: ทดสอบการพยายามปลดตนเองของแอดมินคนสุดท้าย และยืนยันการปฏิเสธด้วย `LAST_ADMIN_PROTECTION` $\rightarrow$ **PASS**
- **TEST 10 (Audit Trail Secret Sanitization)**: ยืนยันว่าการบันทึก Audit มีการล้างฟิลด์ความลับก่อนทำ Hash Chain $\rightarrow$ **PASS**

---
*เอกสารนี้จัดทำขึ้นสำหรับ HRT Inventory System v2.6.0 เพื่อเป็นมาตรฐานการพัฒนาและตรวจสอบสิทธิ์การตั้งค่าระบบ*
