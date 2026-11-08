# การกำหนดค่าระบบ (System Configuration Guide)
**ระบบบริหารคลังพัสดุ โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)**  
**อ้างอิงโค้ดจริง:** `Config.gs` (Version `v2.7.0-rc.6`)

---

## 1. การกำหนดค่าผ่าน Script Properties (Environment Variables)

เพื่อความมั่นคงปลอดภัย ห้ามฮาร์ดโค้ด Credentials ลงใน Source Code ให้กำหนดค่าตัวแปรผ่าน Google Apps Script PropertiesService:

| คีย์ตัวแปร | ค่าเริ่มต้นในโค้ด | คำอธิบาย |
|---|---|---|
| `SPREADSHEET_ID` | `''` (ว่าง) | ID ของ Google Sheets ที่ใช้เป็นฐานข้อมูลหลัก 16 ชีต |
| `GOOGLE_CLIENT_ID` | `''` (ว่าง) | OAuth 2.0 Web Client ID จาก Google Cloud Console สำหรับระบบยืนยันตัวตน |
| `ALLOWED_DOMAINS` | `horathep.ac.th, hrt.ac.th, school.internal` | โดเมนอีเมลที่ได้รับอนุญาตเข้าใช้งานระบบ |
| `APP_ENV` | `production` | สภาพแวดล้อมระบบ (`production` หรือ `staging`) |

---

## 2. ค่าคงที่ระบบหลัก (CONFIG Core Constants)

ค่าคงที่ทั้งหมดถูกกำหนดไว้ใน `CONFIG = Object.freeze({...})` ในไฟล์ `Config.gs`:

* `APP_NAME`: `'HRT School Inventory Management System'`
* `SCHOOL_NAME`: `'โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)'`
* `ORGANIZATION`: `'องค์การบริหารส่วนจังหวัดสระบุรี'`
* `VERSION`: `'2.7.0-rc.6'`
* `DEFAULT_FISCAL_YEAR`: `'2569'`
* `TIMEZONE`: `'Asia/Bangkok'`
* `TIMEZONE_OFFSET_HOURS`: `7`
* `LOCK_TIMEOUT_MS`: `30000` (30 วินาที สำหรับ Read/Session Locks)
* `WRITE_LOCK_TIMEOUT_MS`: `60000` (60 วินาที สำหรับ Mutation/Ledger Writes)
* `CACHE_TTL_SECONDS`: `300` (5 นาที)

---

## 3. ตารางบทบาทและสิทธิ์การใช้งาน (RBAC Matrix)

บทบาทมาตรฐานในระบบมี 6 ระดับ (Canonical Uppercase):
1. **ADMIN** (ระดับ 60): ดูแลระบบทั้งหมด จัดการผู้ใช้ ตั้งค่าระบบ ปิดรอบปีงบประมาณ กระทบยอดคลัง
2. **DIRECTOR** (ระดับ 50): ผู้อำนวยการสถานศึกษา พิจารณาอนุมัติคำขอเบิก ตรวจสอบรายงาน พ.ด. ๑–๗
3. **APPROVER** (ระดับ 40): ผู้มีอำนาจอนุมัติคำขอเบิกพัสดุ
4. **OFFICER** (ระดับ 30): เจ้าหน้าที่พัสดุ ตรวจสอบคำขอเบิก ตัดจ่ายพัสดุ รับพัสดุเข้าคลัง ปรับปรุงยอด จัดการ FSN และ QR Code
5. **TEACHER** (ระดับ 10): ครูผู้สอน สร้างคำขอเบิก ตรวจรับพัสดุ ติดตามสถานะคำขอตนเอง
6. **REQUESTER** (ระดับ 10): ผู้ขอเบิกทั่วไป (เทียบเท่า TEACHER)
