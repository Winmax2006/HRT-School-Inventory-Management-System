# คู่มือการทดสอบระบบ (Automated Testing & QA Guide)
**ระบบบริหารคลังพัสดุ โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)**  
**เป้าหมายการทดสอบ:** ความสมบูรณ์ของสัญญา API, ความถูกต้องของบัญชีคุมพัสดุ, และระบบควบคุมสิทธิ์ RBAC

---

## 1. หลักการทดสอบแบบ Zero Production Write

ระบบออกแบบชุดทดสอบอัตโนมัติบน **Node.js Test Runner** โดยใช้ In-Memory Repository Adapter (`tests/adapters/in_memory_repository.js`) และ Synthetic Fixtures (`tests/fixtures/synthetic_fixtures.js`)
* **ไม่เขียนข้อมูลลง Google Sheets จริง:** ป้องกันความเสียหายต่อฐานข้อมูลการจัดซื้อจัดจ้าง
* **ไม่มีการเรียกเครือข่ายภายนอก:** รันการทดสอบได้ทันทีโดยไม่ต้องพึ่งพาอินเทอร์เน็ต

---

## 2. ชุดทดสอบหลัก 4 ชุดที่พร้อมรันจริง (Core Test Suites)

รันคำสั่งต่อไปนี้จากรากของโครงการ:

```bash
# 1. ทดสอบความสมบูรณ์ของการรวมรุ่นและ Checksum (REL-01 ถึง REL-10)
node tests/release_consolidation_test.js

# 2. ทดสอบบัญชีคุมพัสดุคู่และ Idempotency (TX-01 ถึง TX-15)
node tests/stock_transaction_idempotency_test.js

# 3. ทดสอบการยืนยันตัวตนและ Dynamic RBAC 6 ระดับ (AUTH-01 ถึง AUTH-12)
node tests/auth_rbac_test.js

# 4. ทดสอบความสอดคล้องของเส้นทาง API และ RPC Envelopes (RPC-01 ถึง RPC-12)
node tests/rpc_contract_test.js
```

หรือรันทุกชุดทดสอบพร้อมกันด้วย:
```bash
npm test
```

---

## 3. ขอบเขตและข้อจำกัดของการทดสอบ (Testing Limitations)

* **สิ่งที่ยืนยันแล้ว (VERIFIED PASS):**
  - ตรรกะการคำนวณ Double-Entry Stock Ledger
  - การป้องกัน Race Condition ภายใต้ LockService Mock
  - การปฏิเสธสิทธิ์ผู้ใช้ที่ถูกระงับ (Suspended) หรือไม่มีบทบาทในระบบ
  - ความสอดคล้องของ Checksum ของไฟล์ระบบ 9 ไฟล์หลัก
* **สิ่งที่ยังไม่ได้ทดสอบบน Live Runtime (NOT TESTED):**
  - การสแกน QR Code ด้วยกล้องอุปกรณ์จริงผ่าน WebRTC บนสมาร์ตโฟน
  - การตอบสนองของ Google Apps Script HTTP Endpoint จริงภายใต้ Load สูง
  - การเชื่อมต่อ Google Identity Services (GSI) บนโดเมนจริง
