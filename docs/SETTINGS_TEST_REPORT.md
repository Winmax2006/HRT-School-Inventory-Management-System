# รายงานผลการทดสอบระบบการตั้งค่าและเกณฑ์ตรวจรับ (Settings Test Report)
## HRT Inventory System — โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)
### รุ่นเป้าหมาย: v2.7.0-rc.2 | Baseline: v2.6.0 | วันที่ทดสอบ: 2026-10-28

---

### 1. สรุปผลการทดสอบภาพรวม (Executive Summary)
การทดสอบระบบในรอบ Prompt 07 ดำเนินการทดสอบครอบคลุมทั้งระบบเดิมและระบบใหม่ที่เพิ่มเข้ามาในส่วนศูนย์กลางการตั้งค่า 8 หมวดหมู่ (Settings Hub Level 3), การตรวจสอบสิทธิ์แบบละเอียด (Granular RBAC), และระบบ MiniUI / QR Code รวมทั้งสิ้น 6 ชุดทดสอบ (62 รายการทดสอบ):
- **จำนวนการทดสอบทั้งหมด (Total Tests):** 62 รายการ
- **ผ่านการทดสอบ (Passed):** 62 รายการ (100.0%)
- **ไม่ผ่านการทดสอบ (Failed):** 0 รายการ (0.0%)
- **อัตราความสำเร็จ (Pass Rate):** 100.0%

---

### 2. บันทึกผลการทดสอบเฉพาะหมวด Settings 10 สถานการณ์ (Prompt 07 Test Scenarios)

ผลการรันไฟล์ทดสอบ `tests/p7_settings_comprehensive_test.js`:

```
==================================================
RUNNING PROMPT 07 SETTINGS COMPREHENSIVE TEST SUITE
Target Canonical Scope: v2.7.0 (Settings & Candidate Verification)
==================================================

[PASS] SCENARIO 1: Requester Calling Settings RPC Directly Is Rejected (RBAC Guard)
[PASS] SCENARIO 2: Officer/Director Role Matrix Enforcement & Last-Admin Protection Verified
[PASS] SCENARIO 3: Save -> Reload Persistence, Cancel Edits & Concurrency Token Conflict Guard
[PASS] SCENARIO 4: Per-Field Validation (Negative Numbers, Formula Injection, Discrete Units)
[PASS] SCENARIO 5: Viewing Year vs Active Transaction Year Separation & Closed-Year Write Lock
[PASS] SCENARIO 6: QR Encode/Decode Matching, Revoked QR Rejection & Zero Write on Scan
[PASS] SCENARIO 7: MiniUI Self-Service Lifecycle, Decoupled Stock & Idempotent Submission Guard
[PASS] SCENARIO 8: CSV Import Validation, Dry-Run Staging & Atomic Non-Destructive Protection
[PASS] SCENARIO 9: Frozen Signatory Snapshot on Historical Documents & Sequence Lock Mutex
[PASS] SCENARIO 10: UI Responsive Contracts, ESC LIFO Modal Stack & Print Media Verification

==================================================
TOTAL TESTS: 10/10 SCENARIOS
PASSED: 10
FAILED: 0
==================================================
ALL 10 PROMPT 07 COMPREHENSIVE SETTINGS SCENARIOS PASSED 100%!
```

---

### 3. รายละเอียดการทดสอบเชิงลึกรายสถานการณ์ (Detailed Scenario Analysis)

#### สถานการณ์ที่ 1: การปฏิเสธเมื่อผู้ใช้บทบาท REQUESTER พยายามเรียกคำสั่ง Settings RPC โดยตรง
- **วัตถุประสงค์:** ตรวจสอบว่าครู/บุคลากรทั่วไปไม่สามารถแอบเรียกคำสั่งดูข้อมูลบัญชีผู้ใช้ หรือแก้ไขค่าระบบได้
- **ขั้นตอนการทดสอบ:** จำลองผู้เรียก `role: 'REQUESTER'` ยื่นคำขอไปยัง `settings.getSection('users')`, `settings.getSection('connection')`, และ `settings.updateSection`
- **ผลลัพธ์:** เซิร์ฟเวอร์ปฏิเสธด้วย `FORBIDDEN` ค่าการตั้งค่าไม่มีการเปลี่ยนแปลง (**PASS**)

#### สถานการณ์ที่ 2: การบังคับใช้สิทธิ์เฉพาะของ OFFICER/DIRECTOR และการบล็อกบัญชีที่ถูกระงับ
- **วัตถุประสงค์:** ตรวจสอบการจำกัดสิทธิ์ตามบทบาทจริง และการทำงานของระบบป้องกัน Last-Admin
- **ผลลัพธ์:**
  - เจ้าหน้าที่พัสดุ (`OFFICER`) ไม่สามารถดูหรือแก้ไขสิทธิ์บัญชีผู้ใช้ได้
  - บัญชีที่สถานะเป็น `SUSPENDED` ถูกตัดสิทธิ์การทำรายการทันที
  - การพยายามลดสิทธิ์หรือระงับบัญชีผู้ดูแลระบบคนสุดท้าย (`Last-Admin`) ถูกปฏิเสธด้วย `LAST_ADMIN_PROTECTED` (**PASS**)

#### สถานการณ์ที่ 3: ความคงทนของการบันทึก การยกเลิกแก้ไข และการป้องกันการชนกันของ Concurrency Token
- **วัตถุประสงค์:** ทดสอบว่าการกด "ยกเลิก" จะคืนค่าข้อมูลเดิม และการบันทึกด้วย Token เก่าจะถูกปฏิเสธ
- **ผลลัพธ์:**
  - การกด Cancel คืนค่าแบบสมบูรณ์จาก `originalData`
  - การส่ง `expectedRevisionId` ที่ไม่ตรงกับเซิร์ฟเวอร์ (เช่น ส่ง `REV-OLD-999`) ส่งผลให้เกิดข้อผิดพลาด `CONCURRENCY_CONFLICT (HTTP 409)` และไม่ทับข้อมูลบนเซิร์ฟเวอร์ (**PASS**)

#### สถานการณ์ที่ 4: การตรวจสอบความถูกต้องของฟิลด์ข้อมูล (Validation Rules)
- **วัตถุประสงค์:** ตรวจสอบการปฏิเสธค่าติดลบ, การป้องกัน Formula Injection, และหน่วยนับทศนิยม
- **ผลลัพธ์:**
  - ค่าระดับสต็อกขั้นต่ำติดลบ หรือเกณฑ์พาเรโต $A \ge B$ ถูกปฏิเสธทันทีด้วย `INVALID_ARGUMENT`
  - ข้อความที่ขึ้นต้นด้วย `=`, `+`, `-`, `@` ถูกสกัดกั้นทันที
  - หน่วยนับที่เป็นจำนวนเต็ม (รีม, กล่อง) ถูกปฏิเสธเมื่อกรอกยอดเป็นทศนิยม (เช่น 2.5 รีม) ส่วนหน่วยต่อเนื่อง (กิโลกรัม) ยอมรับทศนิยมถูกต้อง (**PASS**)

#### สถานการณ์ที่ 5: การแยกปีที่กำลังดู ออกจากปีที่เปิดทำธุรกรรม และการล็อกปีที่ปิดแล้ว
- **วัตถุประสงค์:** ตรวจสอบว่าการเลือกดูข้อมูลปี 2568 ไม่ทำให้ปีปัจจุบันเปลี่ยน และห้ามเขียนในรอบปีที่ปิดแล้ว
- **ผลลัพธ์:**
  - การสลับ `viewingYear = 2568` ไม่ส่งผลต่อ `activeYear = 2569`
  - การพยายามสร้างหรืออนุมัติธุรกรรมในรอบปี 2568 ถูกปฏิเสธด้วย `FISCAL_YEAR_CLOSED` (**PASS**)

#### สถานการณ์ที่ 6: การอ่านรหัส QR Code การปฏิเสธรหัสที่ยกเลิก และการไม่เขียนสต็อกเมื่อสแกน
- **วัตถุประสงค์:** ตรวจสอบว่าการสแกน QR Code เป็นการอ่านข้อมูลเพียงอย่างเดียว (Read-Only) และรหัสที่เพิกถอนจะถูกปฏิเสธ
- **ผลลัพธ์:**
  - โทเคน `QR:ITEM:OFF-001` คืนข้อมูลพัสดุ โดยที่ยอดคงเหลือในคลังไม่ลดลง
  - โทเคนที่สถานะเป็น `REVOKED` คืนค่าข้อผิดพลาด `QR_REVOKED` (**PASS**)

#### สถานการณ์ที่ 7: วงจรชีวิตคำขอเบิกจาก MiniUI และการส่งซ้ำแบบไม่เกิดผลข้างเคียง (Idempotent Retry)
- **วัตถุประสงค์:** ตรวจสอบว่าคำขอจาก MiniUI จะไม่ตัดสต็อกทันที และการกดย้ำจะไม่ทำให้เกิดรายการซ้ำ
- **ผลลัพธ์:**
  - คำขอเบิกถูกบันทึกในสถานะ `SUBMITTED` สต็อกพัสดุในคลังยังคงเดิม (การตัดสต็อกจะเกิดขึ้นเมื่อเจ้าหน้าที่จ่ายของจริง `ISSUED`)
  - การส่งคำขอด้วย `idempotencyKey` เดิม คืนค่าผลลัพธ์เดิมจากแคชโดยไม่เพิ่มแถวใหม่ในชีต (**PASS**)

#### สถานการณ์ที่ 8: การนำเข้า CSV แบบ Dry-Run และความคงทนของฐานข้อมูลเมื่อพบแถวผิดพลาด
- **วัตถุประสงค์:** ตรวจสอบว่าไฟล์ CSV ที่มีแถวผิดพลาดจะไม่สร้างความเสียหายหรือทิ้งข้อมูลครึ่งๆ กลางๆ ในฐานข้อมูล
- **ผลลัพธ์:** โหมด Dry-Run ตรวจพบความเสี่ยง Formula Injection และค่าใช้จ่ายติดลบ โดยไม่มีการเขียนลงในชีต `03_Master_Items` แม้แต่รายการเดียว (**PASS**)

#### สถานการณ์ที่ 9: การคงสภาพผู้ลงนามในเอกสารอดีต (Signatory Snapshot) และการป้องกันเลขเอกสารชนกัน
- **วัตถุประสงค์:** ตรวจสอบว่าเอกสารที่ออกในอดีตยังคงแสดงชื่อผู้ลงนามเดิม ณ วันที่ออก แม้ผู้บริหารจะเปลี่ยนไปแล้ว
- **ผลลัพธ์:**
  - เอกสารปีก่อนหน้ายังคงแสดงชื่อ `นายสมบัติ พัสถาน` และ `นายอดุลย์ ประชาบาล` ตาม `signatories_snapshot`
  - การสร้างเลขที่เอกสารแบบต่อเนื่องทำงานผ่าน Sequence Mutex Lock ป้องกันการได้เลขซ้ำ (**PASS**)

#### สถานการณ์ที่ 10: ความเข้ากันได้ของหน้าจอ Responsive, ระบบ Modal ESC Stack และโหมดพิมพ์
- **วัตถุประสงค์:** ตรวจสอบ Breakpoints (375px, 768px, 1024px, 1440px), การกด ESC ปิดตามลำดับ LIFO, และ CSS โหมดพิมพ์
- **ผลลัพธ์:**
  - ระบบหน้าจอรอบรับหน้าจอมือถือ (มีปุ่มขนาดสัมผัสไม่ต่ำกว่า 44px และ Mobile Category Select)
  - กลไก `pushOverlay` และ `popOverlay` ปิด Modal บนสุดเมื่อกด ESC โดยไม่ปิดหน้าจอหลัก
  - CSS `@media print` ซ่อนแถบเมนูข้าง ปุ่ม และส่วนควบคุมทั้งหมดขณะสั่งพิมพ์ป้าย QR (**PASS**)

---

### 4. สรุปผลการรันชุดทดสอบทั้งหมดในคลังโค้ด (Master Test Summary)

| ลำดับชุดทดสอบ | ชื่อไฟล์ชุดทดสอบ | ขอบเขตการทดสอบ | จำนวนข้อ | ผลการทดสอบ |
| :---: | :--- | :--- | :---: | :---: |
| 1 | `tests/regression_test_suite.js` | ชุดทดสอบ Regression 11 หมวดหลัก (RBAC, Filter, ABC, Mutex, Hash Chain) | 11 | **PASS (11/11)** |
| 2 | `tests/p1_p2_contract_lifecycle_test.js` | ชุดทดสอบสัญญาและวงจรชีวิตข้อมูล (Fiscal Bounds, Alias Adapter, State Machine) | 10 | **PASS (10/10)** |
| 3 | `tests/p3_miniui_critical_test.js` | ชุดทดสอบฟังก์ชันวิกฤตและ MiniUI (8-Dim Filter, FSN FK, QR Resolution) | 11 | **PASS (11/11)** |
| 4 | `tests/p4_settings_important_test.js` | ชุดทดสอบการตั้งค่าและข้อบกพร่องสำคัญ (Movement Velocity, CSV Dry-Run, Forms) | 10 | **PASS (10/10)** |
| 5 | `tests/p6_acceptance_suite.js` | ชุดทดสอบรับรองระบบ 10 หมวดหมู่หลัก (A.1 – A.10) | 10 | **PASS (10/10)** |
| 6 | `tests/p7_settings_comprehensive_test.js` | ชุดทดสอบการตั้งค่า 8 หมวดหมู่และการควบคุมสิทธิ์ RBAC รายฟิลด์ | 10 | **PASS (10/10)** |
| **รวม** | **6 ชุดทดสอบสมบูรณ์** | **ครอบคลุมทุกโมดูลในระบบ HRT Inventory System** | **62** | **PASS (62/62 - 100%)** |
