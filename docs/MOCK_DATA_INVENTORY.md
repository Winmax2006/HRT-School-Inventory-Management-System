# รายการและตำแหน่งข้อมูลจำลองเดิม (Mock & Synthetic Data Inventory)
## ระบบบริหารจัดการพัสดุโรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) — รุ่น v2.7.0-rc.4 (Prompt 09)

เอกสารฉบับนี้จัดทำขึ้นเพื่อบันทึกรายการตรวจสอบและสืบเสาะข้อมูลจำลอง (Mock Data), ข้อมูลสังเคราะห์ (Synthetic Fixtures), อัตลักษณ์ผู้ใช้จำลอง (Synthetic Identities) และกลไกจำลองการทำงานเงียบ (Silent Mock Fallbacks) ทั้งหมดที่เคยฝังอยู่ในซอร์สโค้ดของแอปพลิเคชันหลักก่อนการปรับปรุง Prompt 09 พร้อมระบุตำแหน่งไฟล์, บรรทัดเดิม, หมวดหมู่, ตำแหน่งจัดเก็บใหม่ และมาตรการตัดขาดในแอปพลิเคชันจริง (Live Runtime)

---

### 1. ตารางบัญชีข้อมูลจำลองเดิมและมาตรการแยกส่วน (Comprehensive Inventory Matrix)

| รหัสรายการ | ชื่อชุดข้อมูล / กลไกจำลอง | ไฟล์และตำแหน่งบรรทัดเดิม | ประเภทของข้อมูลจำลอง | ตำแหน่งจัดเก็บใหม่ (Test Fixture / Adapter) | มาตรการใน Live Runtime (index.html / App.js) |
|---|---|---|---|---|---|
| **MCK-01** | พัสดุตัวอย่าง 100 รายการ (`rawMasterItems`) | `index.html` (L.5431–5636)<br>`frontend/main/App.js` (L.16–23) | Sample Master Catalog (หมวดหมู่สำนักงาน, คอมฯ, วิทย์, กีฬา ฯลฯ) | `tests/fixtures/sample_items.json`<br>`tests/fixtures/synthetic_fixtures.js` | กำหนดเป็นอาเรย์ว่าง `const rawMasterItems = [];`<br>`window.allData = [];`<br>โหลดจาก `apiGetItems` เท่านั้น |
| **MCK-02** | ประวัติธุรกรรมตัวอย่าง 20 รายการ (`mockHistories`) | `index.html` (L.5638–5716)<br>`frontend/main/App.js` (L.17) | Sample Transaction Ledger (รับเข้า/เบิกจ่ายย้อนหลัง) | `tests/fixtures/sample_histories.json`<br>`tests/fixtures/synthetic_fixtures.js` | กำหนดเป็นอาเรย์ว่าง `const mockHistories = [];`<br>แสดงประวัติตามชีต `10_Stock_Ledger` จริง |
| **MCK-03** | รายการใบเบิกตัวอย่าง 5 ฉบับ (`mockRequisitionPresets`) | `index.html` (L.7919–7975) | Sample Requisition Orders (REQ-2567/012 ถึง 020) | `tests/fixtures/sample_requisitions.json` | กำหนดเป็นอาเรย์ว่าง `let mockRequisitionPresets = [];`<br>หากไม่มีข้อมูลจะแสดง Dropdown ว่างเปล่า |
| **MCK-04** | รหัสพัสดุมาตรฐาน FSN 7 รายการ (`fsnData`) | `index.html` (L.8683–8798)<br>`frontend/main/App.js` (L.25–138) | Standard Government Catalog e-GP (13 หลัก) | `tests/fixtures/sample_fsn.json` | กำหนดเป็นอาเรย์ว่าง `let fsnData = [];`<br>ในตารางแสดง Empty Row: `"ยังไม่มีข้อมูลรหัสพัสดุ FSN"` |
| **MCK-05** | อัตลักษณ์จำลองนายอนันต์ (`USR-ANANT-01`) ใน UserApi | `index.html` (L.5953) | Synthetic User Identity (บายพาสสิทธิ์ระบบ) | `tests/fixtures/sample_users.json` (บทบาท OFFICER) | ลบ fallback อัตลักษณ์จำลองออกเด็ดขาด; หากยังไม่ยืนยันตัวตนจะส่งคืน `null` (Fail-Closed) |
| **MCK-06** | อัตลักษณ์จำลองนายอนันต์ในบันทึก Audit Trail | `index.html` (L.5792)<br>`frontend/main/App.js` (L.232) | Synthetic Audit Actor (ปลอมชื่อผู้กระทำในล็อก) | `tests/adapters/in_memory_repository.js` | เปลี่ยนเป็น fallback กลาง: `payload.userId || currentUser?.id || 'SYSTEM_ANONYMOUS'` |
| **MCK-07** | กลไกจำลองการเรียกใช้งานเงียบ (`mockDispatcher` / `mockCall`) | `index.html` (L.5898–5925)<br>`frontend/services/ApiService.js` (L.80–140) | Silent Mock Simulation (แอบตอบสำเร็จเมื่อไร้ GAS) | `demo.html` (`window.demoMockDispatcher`) | ตัดระบบจำลองทิ้ง; หากอยู่นอก Google Apps Script จะ Reject ด้วย Error Code `BACKEND_UNAVAILABLE` |
| **MCK-08** | การสร้างข้อมูลเริ่มต้น Audit Trail (`initAuditTrailStore`) | `index.html` (L.5800–5830) | Synthetic Audit Seed Data (สร้างประวัติเท็จตอนเปิดเว็บ) | `tests/fixtures/synthetic_fixtures.js` | ลบฟังก์ชันและคำสั่งเรียกใช้งานออกจากตัวแอปจริงเด็ดขาด |
| **MCK-09** | รายการ QR Code และล็อกจำลองใน Settings State | `index.html` (L.8953–8998) | Synthetic Settings Seed (ข้อมูลตั้งค่าหลอกใน RAM) | `tests/adapters/in_memory_repository.js` | กำหนด `qrList: []` และ `audit: []` เป็นอาเรย์ว่าง; โหลดจากการตั้งค่าชีตจริง |
| **MCK-10** | ค่าเริ่มต้นในการจำลองสแกน QR (`'OFF-001'`) | `index.html` (L.8340) | Hardcoded Scan Default Value | `demo.html` | ลบค่าตั้งต้นใน `prompt()` ให้ผู้ใช้กรอกรหัสพัสดุจริงหรือเปิดกล้องสแกน |

---

### 2. วัตถุประสงค์และการจำแนกประเภทข้อมูล (Data Classification & Purpose)

1. **Production Runtime Code (โค้ดสำหรับสภาพแวดล้อมจริง):**
   - มีเพียงโค้ดโครงร่างการทำงาน (Application Skeleton), ส่วนติดต่อผู้ใช้ (UI Components), ตัวจัดการสถานะ (State Stores), และตัวเรียกบริการเครือข่าย (`ApiServiceCore`)
   - **ปราศจากรายการพัสดุตัวอย่างหรือผู้ใช้จำลองแม้แต่ชิ้นเดียว**
   - เมื่อเชื่อมต่อกับชีตจริงที่ว่างเปล่า จะแสดงผลหน้าจอว่างเปล่าอย่างถูกต้อง (Genuine Empty State) ผ่านองค์ประกอบ `#tableEmptyState` และข้อความ `"ไม่พบรายการพัสดุที่ตรงกับเงื่อนไขการค้นหา"`
   - เมื่อเปิดไฟล์แบบ Standalone โดยไม่มี Google Apps Script รันไทม์จะปฏิเสธการจำลองผลสำเร็จเงียบ และแจ้งเตือนข้อผิดพลาด `BACKEND_UNAVAILABLE` ทันที

2. **Synthetic Fixtures & Adapters (ชุดข้อมูลและตัวแปลงสำหรับการพัฒนาและทดสอบ):**
   - จัดเก็บเป็นอิสระในโฟลเดอร์ `tests/fixtures/` และ `tests/adapters/`
   - ข้อมูลทุกเรคอร์ดถูกออกแบบให้เป็น Deterministic และครอบคลุมเงื่อนไขขอบเขต (Boundary Cases):
     - พัสดุที่มีสต็อกปกติ, สต็อกต่ำกว่าเกณฑ์ (`low`), สต็อกวิกฤต (`critical`), และสต็อกศูนย์
     - ใบเบิกในสถานะต่างๆ (`pending_approval`, `pending_issue`, `completed`)
     - บัญชีผู้ใช้สังเคราะห์ครบ 4 บทบาทหลัก (`ADMIN`, `DIRECTOR`, `OFFICER`, `REQUESTER`)
   - ไม่มีการจัดเก็บข้อมูลความลับ รหัสผ่านจริง หรือโทเค็นโดเมนภายนอก

3. **Standalone Demo Experience (ไฟล์สาธิตการใช้งาน `demo.html`):**
   - สร้างขึ้นอัตโนมัติผ่านสคริปต์ `scripts/build_demo_html.js`
   - แยกตัวออกจาก `index.html` โดยแสดงแบนเนอร์แจ้งเตือนอย่างเด่นชัดที่ด้านบนสุด: `[DEMO & TESTING MODE] โหมดสาธิตระบบด้วยข้อมูลจำลอง`
   - ฝังตัวแปร `window.__DEMO_STORE__` สำหรับจำลองฐานข้อมูลในหน่วยความจำ (In-Memory Isolation)
   - มีปุ่มสลับบทบาทผู้ใช้ (`window.switchDemoUserPrompt()`) เพื่อให้นักพัฒนาและผู้ตรวจประเมินสามารถทดสอบสิทธิ์ RBAC ได้โดยไม่ต้องแก้ไขฐานข้อมูลจริง
