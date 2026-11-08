# การออกแบบกลไกการกู้คืนธุรกรรมและ Commit Markers (Transaction Recovery Design)
## HRT Inventory System — โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)
### เอกสารควบคุม: SIMS-TXN-2026-008
### รุ่นเป้าหมาย: v2.7.0-rc.3 | Historical Baseline: v2.6.0 | วันที่จัดทำ: 2026-10-28

---

## 1. บริบทและความท้าทายเชิงสถาปัตยกรรม (Architectural Problem Statement)

Google Sheets เป็นฐานข้อมูลแบบตารางคำนวณ (Spreadsheet Storage) ซึ่งมีข้อจำกัดเชิงระบบสำคัญเมื่อเทียบกับ Traditional RDBMS:
1. **ไม่มีคำสั่ง `BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK` ในระดับเอนจิน**: ไม่สามารถสั่ง Rollback ข้ามหลายแผ่นงานได้ในคำสั่งเดียว
2. **ขีดจำกัดของ `SpreadsheetApp.flush()`**: การส่งข้อมูลลงชีตเกิดขึ้นเมื่อสคริปต์จบหรือเมื่อเรียก `flush()` หากสคริปต์ขัดข้องระหว่างทาง (Time-out, Quota Limit หรือ Uncaught Exception) อาจเกิดภาวะ **ข้อมูลไม่สอดคล้องบางส่วน (Partial Inconsistency)** เช่น บันทึกคำขอเบิกแล้วแต่ยังไม่ได้ตัดยอดสต็อก หรือตัดยอดสต็อกแล้วแต่บันทึกลงบัญชีคุมพัสดุ (Ledger) ไม่สำเร็จ
3. **การทำงานพร้อมกัน (Concurrency)**: การเรียก Web App พร้อมกันจากผู้ใช้หลายคนอาจทำให้เกิด Race Condition อ่านยอดสต็อกเก่าก่อนที่อีกคนจะบันทึกเสร็จ

---

## 2. เสาหลักการป้องกันธุรกรรม 3 ระดับ (Three-Pillar Transaction Isolation)

เพื่อแก้ปัญหาดังกล่าว ระบบ HRT Inventory v2.7.0 ได้วางสถาปัตยกรรมการจัดการธุรกรรม 3 ชั้น:

```
                      +─────────────────────────────────────────────+
                      |         Incoming RPC / Web App Request      |
                      +─────────────────────────────────────────────+
                                             │
                                             ▼
       [Pillar 1]     +─────────────────────────────────────────────+
       ScriptLock     | LockService.getScriptLock().waitLock(60000) |
       Isolation      +─────────────────────────────────────────────+
                                             │ (Lock Acquired)
                                             ▼
       [Pillar 2]     +─────────────────────────────────────────────+
       Commit Marker  | Check Idempotency / Write Marker [PENDING]  |
       & Lease        +─────────────────────────────────────────────+
                                             │
                                             ▼
       [Pillar 3]     +─────────────────────────────────────────────+
       Two-Phase      | Execute Multi-Sheet Mutations (SSOT Ledger) |
       Execution      +─────────────────────────────────────────────+
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
               (All Steps OK)                                (Any Error/Timeout)
                      │                                             │
       +─────────────────────────────+               +─────────────────────────────+
       | Update Marker [COMMITTED]   |               | Rollback Tentative Mutations|
       | Flush & Release ScriptLock  |               | Update Marker [FAILED]      |
       +─────────────────────────────+               | Release ScriptLock & Throw  |
                      │                               +─────────────────────────────+
                      ▼                                             │
           Return Success Response                                  ▼
                                                        Return Fail-Closed Error
```

### 2.1 Pillar 1: การตัดตอนความขัดแย้งด้วย ScriptLock (Application Mutex)
- รหัสใน [`Write.gs`](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs) บังคับใช้ `LockService.getScriptLock()` ด้วยเวลา Timeout สูงสุด **60,000 มิลลิวินาที (60 วินาที)** ในทุกการดำเนินการที่กระทบสต็อก
- **Re-reading Pattern**: เมื่อได้ Lock แล้ว ระบบจะ**อ่านยอดสต็อกและสถานะจริงจากแผ่นงานซ้ำอีกครั้ง (Re-read from Sheets)** เสมอ เพื่อขจัดข้อมูลเก่าที่ค้างอยู่ในหน่วยความจำ (Stale Memory)

### 2.2 Pillar 2: บันทึกตัวกำกับธุรกรรมและหมดอายุสัญญา (Commit Markers & Lease Expiration)
- ก่อนเริ่มเขียนข้อมูลจริง ระบบจะบันทึกสถานะธุรกรรมลงใน `16_Idempotency_Log` หรือ Commit Marker Journal ด้วยสถานะ `PENDING` พร้อมแนบเวลาหมดอายุ (`leaseExpiresAt = now + 30000`)
- หากธุรกรรมใช้เวลาเกิน 30 วินาที ระบบจะถือว่า Lease หมดอายุและยินยอมให้เกิดการตรวจสอบหรือกู้คืนได้

### 2.3 Pillar 3: การประมวลผลสองเฟสและการบันทึกลงบัญชี SSOT
- **ลำดับการเขียนข้อมูล (Write Sequence)**:
  1. เขียนแถวใหม่ลงใน `10_Stock_Ledger` (SSOT เป็นลำดับแรก เพื่อให้มีหลักฐาน Audit Trail ที่ไม่ถูกลบ)
  2. ปรับปรุงยอดคงเหลือใน `03_Master_Items`
  3. ปรับปรุงสถานะใน `07_Requisitions` และ `08_Requisition_Items`
  4. บันทึกประวัติใน `11_Audit_Trail`
- หากขั้นตอนใดล้มเหลว จะเข้าสู่ขั้นตอน Exception Catching และ Rollback อัตโนมัติ

---

## 3. หลักฐานการทดสอบการฉีดความล้มเหลว (Failure-Injection Verification Evidence)

ในชุดการทดสอบ [`tests/p8_backend_sheets_architecture_test.js`](file:///c:/Users/Art/.gemini/antigravity/scratch/tests/p8_backend_sheets_architecture_test.js) (Scenario 3) ได้มีการจำลองสถานการณ์ความล้มเหลวจริง (Failure Injection Simulation) ดังนี้:

### 3.1 สถานการณ์จำลองความล้มเหลว (Failure Injection Setup)
- **ธุรกรรมทดสอบ**: `OP-FAIL-01` เบิกพัสดุ `OFF-001` จำนวน 5 หน่วย
- **ยอดเริ่มต้น**: 25 หน่วย
- **การฉีดข้อผิดพลาด**: จำลองสัญญาณขาดหายหรือ Timeout หลังบันทึก Marker ขั้นที่ 1 (`SIMULATED_RPC_TIMEOUT_AFTER_MARKER`) ก่อนที่การตัดสต็อกจะเสร็จสมบูรณ์

### 3.2 ผลการตรวจสอบเชิงประจักษ์ (Empirical Test Results)
```
[TEST LOG] Executing Scenario 3: Transaction Recovery & Commit Markers under Injected Failure...
[PHASE 1] Commit Marker Written: { operationId: 'OP-FAIL-01', state: 'PENDING', leaseExpiresAt: 1729761264000 }
[PHASE 2] INJECTED FAILURE TRIGGERED: SIMULATED_RPC_TIMEOUT_AFTER_MARKER
[ROLLBACK] Reverting tentative mutations...
[MARKER] Updated operationId 'OP-FAIL-01' state -> 'FAILED'
[ASSERTION 1] Checking stock balance integrity:
              - Expected stock balance: 25
              - Actual stock balance:   25
              - Result: MATCH (Stock remains 100% uncorrupted)
[RECOVERY] Deterministic Replay & Recovery Execution with 'OP-SUCCESS-01':
              - Phase 1: Marker Written
              - Phase 2: Ledger Appended & Stock Deducted
              - Phase 3: Marker Updated -> 'COMMITTED'
              - Result: SUCCESS (Balance after: 20)
[PASS] SCENARIO 3: Transaction Recovery & Commit Markers under Injected Failure Verified
```

---

## 4. แผนภูมิสถานะของตัวกำกับธุรกรรม (Commit Marker State Machine)

```
       [ Client Request ]
               │
               ▼
       ┌───────────────┐
       │    PENDING    │ ◄─── บันทึกก่อนเริ่มเขียนชีต (พร้อม Lease 30s)
       └───────┬───────┘
               │
       ┌───────┴───────┐
       ▼               ▼
 (Commit OK)     (Error / Timeout)
       │               │
       ▼               ▼
┌─────────────┐ ┌─────────────┐
│  COMMITTED  │ │   FAILED    │ ◄─── มาร์กเมื่อ Rollback สำเร็จ (ไม่ตัดสต็อก)
└─────────────┘ └──────┬──────┘
                       │
                       ▼
               ┌─────────────┐
               │ ROLLED_BACK │ ◄─── ปล่อยสถานะให้ส่งคำขอซ้ำได้อย่างปลอดภัย
               └─────────────┘
```

---

## 5. คู่มือการกู้คืนระบบกรณีฉุกเฉิน (Operational Recovery Runbook)

หากเกิดเหตุการณ์ระบบขัดข้องหรือไฟดับระหว่างวันทำงาน ผู้ดูแลระบบสามารถตรวจสอบและฟื้นฟูระบบได้ตามขั้นตอนดังนี้:

1. **ตรวจสอบบันทึกตัวกำกับธุรกรรมตกค้าง (Stale Pending Markers)**:
   - เปิดแผ่นงาน `16_Idempotency_Log`
   - ค้นหารายการที่มี `status = 'PENDING'` และเวลาเกินกว่า 5 นาที
2. **เทียบยอดระหว่างชีต (Cross-Sheet Reconciliation)**:
   - ตรวจสอบ `10_Stock_Ledger` ว่ามีแถวของ `reference_id` ดังกล่าวหรือไม่
   - หากมีแถวใน Ledger แต่ใน `03_Master_Items` ยอดยังไม่ลด ให้รันฟังก์ชัน `recalculateStockFromLedger(fiscalYear)` เพื่อปรับยอด Master Items ให้ตรงกับประวัติจริงใน Ledger
   - หากไม่มีแถวใน Ledger แสดงว่าธุรกรรมยังไม่ตัดสต็อก ให้เปลี่ยนสถานะ Marker เป็น `FAILED` เพื่อให้ผู้ใช้สามารถกดส่งคำขอใหม่ได้
3. **การทดสอบความสมบูรณ์อัตโนมัติ (Health Check Diagnostics)**:
   - เรียก Action `system.healthCheck` จาก Settings Hub เพื่อยืนยันว่าชีตทั้ง 16 แผ่นงานมี Headers ครบถ้วนและสามารถเข้าถึงได้ตามปกติ
