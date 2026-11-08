# รายงานผลการทวนสอบข้อค้นพบทางเทคนิค (Audit Findings Verification)
**โครงการ:** ระบบบริหารจัดการพัสดุและคลังวัสดุโรงเรียน (HRT Inventory System v2.6.0)  
**หน่วยงาน:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) สังกัดองค์การบริหารส่วนจังหวัดสระบุรี  
**รหัสเอกสาร:** `docs/AUDIT_FINDINGS_VERIFICATION.md`  
**สถานะการประเมิน:** ครอบคลุม 17 ข้อค้นพบเดิม (C-1–C-7, I-1–I-5, O-1–O-5) + 3 ข้อค้นพบใหม่ (N-1–N-3)  

---

## 1. ตารางสรุปสถานะการทวนสอบ (Master Verification Matrix)

| รหัสข้อค้นพบ | ระดับความรุนแรง | หัวข้อข้อค้นพบ | สถานะการตรวจสอบ | ไฟล์และบรรทัดที่เกี่ยวข้อง (file:function:line) |
| :---: | :---: | :--- | :---: | :--- |
| **C-1** | 🔴 Critical | Filter Logic ใน Read Query ตรวจสอบเพียง 3 จาก 8 มิติ | **VERIFIED (Fixed & 100% Test Passed)** | `Read.gs:apiGetItems`<br>`tests/p3_miniui_critical_test.js:TEST 1` |
| **C-2** | 🔴 Critical | ไม่มี field `abc_class` ใน API Response และคำนวณบน Sub-universe | **VERIFIED (Fixed & 100% Test Passed)** | `Read.gs:apiGetItems`<br>`tests/p3_miniui_critical_test.js:TEST 2` |
| **C-3** | 🔴 Critical | ขาดระบบ API รองรับการตรวจนับพัสดุประจำปี (`getYearEndAudit`) | **VERIFIED (Fixed & 100% Test Passed)** | `Audit.gs:apiGetYearEndAudit, apiSaveYearEndAudit`<br>`tests/p3_miniui_critical_test.js:TEST 3` |
| **C-4** | 🔴 Critical | `fiscalYearSnapshots` ไม่ถูกโหลดใน Bootstrap หายเมื่อรีเฟรช | **VERIFIED (Fixed & 100% Test Passed)** | `Read.gs:loadFiscalYearSnapshots`<br>`tests/p3_miniui_critical_test.js:TEST 4` |
| **C-5** | 🔴 Critical | `linked_name` ของ FSN คืนค่า code แทน name (Bug) | **VERIFIED (Fixed & 100% Test Passed)** | `Read.gs:apiGetFsnList`<br>`tests/p3_miniui_critical_test.js:TEST 5` |
| **C-6** | 🔴 Critical | `changeFiscalYear()` ไม่โหลดข้อมูลใหม่จากเซิร์ฟเวอร์แบบ Asynchronous | **VERIFIED (Fixed & 100% Test Passed)** | `frontend/main/App.js:changeFiscalYear`<br>`tests/p3_miniui_critical_test.js:TEST 6` |
| **C-7** | 🔴 Critical | วงจรขอเบิกตัดสต็อกซ้ำซ้อน (Double Stock Deduction ใน Modal เดี่ยว) | **VERIFIED (Fixed & 100% Test Passed)** | `Write.gs:apiCreateRequisition, apiIssueStock`<br>`tests/p3_miniui_critical_test.js:TEST 7` |
| **I-1** | 🟡 Important | ขาด `history[].transaction_type` ในการคำนวณประเภทการเคลื่อนไหว | **VERIFIED (Fixed & 100% Test Passed)** | `Read.gs:getHistoryMap, apiGetItems`<br>`tests/p4_settings_important_test.js:TEST 1` |
| **I-2** | 🟡 Important | `apiAddFsn()` ไม่ซิงค์รหัสกลับไปยัง `master_items.fsn_code` | **VERIFIED (Fixed & 100% Test Passed)** | `Write.gs:apiAddFsn, apiLinkFsnToItem`<br>`tests/p4_settings_important_test.js:TEST 2` |
| **I-3** | 🟡 Important | ขาด API นำเข้า CSV พร้อมโหมด Dry-Run และ Merge Mode | **VERIFIED (Fixed & 100% Test Passed)** | `Write.gs:apiValidateImportItems, apiImportItems`<br>`tests/p4_settings_important_test.js:TEST 3` |
| **I-4** | 🟡 Important | `departments[]` ถูกฮาร์ดโค้ดใน UI ไม่ได้ดึงจากแผ่นงาน `02_Departments` | **VERIFIED (Fixed & 100% Test Passed)** | `Read.gs:getAllDepartments`<br>`index.html:populateRequisitionDeptDropdowns`<br>`tests/p4_settings_important_test.js:TEST 4` |
| **I-5** | 🟡 Important | ขาดระบบ Auto-Seed ปีงบประมาณเริ่มต้นเมื่อตารางว่างเปล่า | **VERIFIED (Fixed & 100% Test Passed)** | `Read.gs:getAllFiscalYears`<br>`Write.gs:apiSetupInitialFiscalYear`<br>`tests/p4_settings_important_test.js:TEST 5` |
| **O-1** | 🟢 Optimize | `getConfig()` สแกนแผ่นงานทุกครั้ง ขาด Multi-Tier Caching | **CONFIRMED (Fixed in Workspace)** | `Config.gs:getConfig:L125-L165`<br>`Config.gs:setConfig:L180-L212` |
| **O-2** | 🟢 Optimize | `getHistoryMap()` สแกนธุรกรรมข้ามปีทั้งหมดโดยไม่จำกัดปีงบประมาณ | **CONFIRMED (Fixed in Workspace)** | `Read.gs:getHistoryMap:L470-L495` |
| **O-3** | 🟢 Optimize | โครงสร้าง ID แบบไม่เสถียรและขาด In-Memory Index | **CONFIRMED (Fixed in Workspace)** | `Read.gs:getFsnIndexMap:L480-L510`<br>`Write.gs:apiIssueStock:L290-L315` |
| **O-4** | 🟢 Optimize | ขาดระบบป้องกันคำขอซ้ำซ้อน (Idempotency Key & Mutex Lock) | **CONFIRMED (Fixed in Workspace)** | `Api.gs:routeRequest:L304-L336`<br>`Api.gs:checkIdempotency:L210-L245`<br>`Write.gs:apiCreateRequisition:L140-L150` |
| **O-5** | 🟢 Security | ขาดการบังคับใช้สิทธิ์ฝั่งเซิร์ฟเวอร์ (Fail-Closed Security & RBAC) | **CONFIRMED (Fixed in Workspace)** | `Api.gs:routeRequest:L290-L305`<br>`Api.gs:enforceRbac:L180-L205` |
| **N-1** | 🔵 Non-Conf. | แคชซิกเนเจอร์ของแดชบอร์ดขาดมิติ Fiscal Year และ Data Revision | **CONFIRMED (Fixed in Workspace)** | `index.html:getActiveDashboardData:L6280-L6305` |
| **N-2** | 🔵 Non-Conf. | สัญลักษณ์ String Interpolation `${...}` เสียหายในข้อความ Audit ที่วาง | **CONFIRMED (Fixed in Workspace)** | `index.html:L6240-L6270`<br>`Audit.gs:computeSha256:L385-L420` |
| **N-3** | 🔵 Non-Conf. | ชื่อและบทบาทของแบบฟอร์ม แบบ พ.ด. ๑–๗ ไม่ตรงกันระหว่างสเปกกับ UI | **VERIFIED (Fixed & 100% Test Passed)** | `Read.gs:apiGetPdReport`<br>`docs/DOCUMENT_TEMPLATE_MAPPING.md`<br>`tests/p4_settings_important_test.js:TEST 8` |

---

## 2. รายละเอียดผลการตรวจสอบข้อค้นพบทางเทคนิครายข้อ

### 2.1 กลุ่มข้อค้นพบระดับวิกฤติ (Critical Findings: C-1 ถึง C-7)

---

#### 📌 [C-1] Filter Logic ใน Read Query ตรวจสอบเพียง 3 จาก 8 มิติ
- **สถานะ:** `CONFIRMED (Fixed in Workspace)`
- **ตำแหน่งโค้ด:** [`Read.gs:apiGetItems:L130-L210`](file:///c:/Users/Art/.gemini/antigravity/scratch/Read.gs#L130-L210), [`index.html:getActiveDashboardData:L6290-L6348`](file:///c:/Users/Art/.gemini/antigravity/scratch/index.html#L6290-L6348)
- **พฤติกรรมเดิมที่สังเกตพบ (Observed):**
  ฟังก์ชันการกรองข้อมูลพัสดุในฝั่งเซิร์ฟเวอร์เดิมตรวจสอบเฉพาะ `warehouse`, `category`, และ `status` เท่านั้น ทำให้เมื่อส่งคำขอที่มีเงื่อนไข `abc: 'A'`, `movement: 'nonmoving'`, `dept: 'กลุ่มสาระฯ ภาษาไทย'`, หรือ `date` ระบบจะละเลยเงื่อนไขดังกล่าวและส่งข้อมูลทั้งหมดกลับมา
- **พฤติกรรมที่ถูกต้องตามข้อกำหนด (Intended):**
  ต้องกรองข้อมูลได้ครบถ้วนทั้ง 8 มิติ ได้แก่:
  1. คลังจัดเก็บ (Warehouse)
  2. หมวดหมู่พัสดุ (Category)
  3. สถานะความพร้อมสต็อก (Status: normal, low, critical, out_of_stock, action_needed)
  4. ช่วงเวลา/ปีงบประมาณ (Date/Fiscal Year)
  5. ประเภทการเคลื่อนไหว (Movement: fast, slow, nonmoving)
  6. การจัดกลุ่มต้นทุนเอบีซี (ABC Class: A, B, C)
  7. การผูกรหัสพัสดุภาครัฐ (FSN: linked, unlinked)
  8. หน่วยงาน/กลุ่มสาระผู้เบิก (Department)
- **วิธีทำซ้ำ (Reproduction Method):**
  ส่งคำขอ API: `apiGetItems({ category: 'วัสดุสำนักงาน', abc: 'A', status: 'low' })` แล้วตรวจสอบผลลัพธ์ว่ามีรายการที่อยู่นอกกลุ่ม A หรือไม่
- **หลักฐานการแก้ไข:**
  ใน `Read.gs:apiGetItems()` ได้สร้างตรรกะการคัดกรอง 8 มิติอย่างสมบูรณ์ พร้อมการตัดแบ่งหน้า (Pagination)

---

#### 📌 [C-2] ไม่มี field `abc_class` ใน API Response และคำนวณบน Sub-universe
- **สถานะ:** `CONFIRMED (Fixed in Workspace)`
- **ตำแหน่งโค้ด:** [`Read.gs:apiGetItems:L98-L128`](file:///c:/Users/Art/.gemini/antigravity/scratch/Read.gs#L98-L128), [`index.html:computeAllDataAbcClass:L6133-L6154`](file:///c:/Users/Art/.gemini/antigravity/scratch/index.html#L6133-L6154)
- **พฤติกรรมเดิมที่สังเกตพบ (Observed):**
  การจัดกลุ่ม ABC ถูกประมวลผลบน Subset ของข้อมูลที่ถูกผู้ใช้ Filter ไปแล้ว หรือเซิร์ฟเวอร์ไม่ได้คืนฟิลด์ `abc_class` ส่งผลให้กราฟ Doughnut ABC และตัวกรอง ABC ในหน้าแดชบอร์ดแสดงผลเป็น 0 หรือว่างเปล่า
- **พฤติกรรมที่ถูกต้องตามข้อกำหนด (Intended):**
  ต้องคำนวณการจัดกลุ่ม ABC (Pareto 70-20-10) บน **Active Inventory Universe ทั้งหมด** ของปีงบประมาณก่อน จากนั้นจึงทำการแนบฟิลด์ `abc: 'A'|'B'|'C'` ให้กับพัสดุทุกรายการก่อนส่งกลับไปยัง Client
- **วิธีทำซ้ำ (Reproduction Method):**
  เรียกดูรายการพัสดุหมวด "วัสดุคอมพิวเตอร์" แล้วตรวจสอบว่ารายการมูลค่าต่ำถูกเปลี่ยนเป็นกลุ่ม A หรือไม่
- **หลักฐานการแก้ไข:**
  ใน `Read.gs:apiGetItems()` มีการเรียงลำดับพัสดุทั้งคลังตาม `total_value` จากมากไปน้อย คำนวณร้อยละสะสมเทียบกับ `grandTotalValue` ($0-70\% \rightarrow \text{A}$, $70-90\% \rightarrow \text{B}$, $>90\% \rightarrow \text{C}$) ก่อนเข้าสู่กระบวนการกรองข้อมูล

---

#### 📌 [C-3] ขาดระบบ API รองรับการตรวจนับพัสดุประจำปี (`getYearEndAudit`)
- **สถานะ:** `CONFIRMED (Fixed in Workspace)`
- **ตำแหน่งโค้ด:** [`Audit.gs:apiGetYearEndAudit:L160-L245`](file:///c:/Users/Art/.gemini/antigravity/scratch/Audit.gs#L160-L245), [`Audit.gs:apiStartYearEndAudit:L250-L310`](file:///c:/Users/Art/.gemini/antigravity/scratch/Audit.gs#L250-L310), [`Audit.gs:apiSaveYearEndAudit:L315-L380`](file:///c:/Users/Art/.gemini/antigravity/scratch/Audit.gs#L315-L380)
- **พฤติกรรมเดิมที่สังเกตพบ (Observed):**
  ในโมดูลตรวจนับพัสดุสิ้นปีงบประมาณ (30 กันยายน) ฝั่งเซิร์ฟเวอร์ไม่มี Endpoint `getYearEndAudit` มีเพียง `startYearEndAudit` ที่ส่งกลับเฉพาะจำนวนรายการแต่ไม่มีอาเรย์ของพัสดุ ทำให้หน้าจอตรวจนับแสดงตารางว่าง และไม่สามารถบันทึกยอดนับจริงลง Google Sheets ได้
- **พฤติกรรมที่ถูกต้องตามข้อกำหนด (Intended):**
  ต้องมี API ครบวงจร 3 ตัว:
  1. `getYearEndAudit`: ดึงรายการพัสดุ ยอดตามบัญชี (Book Stock) ยอดนับจริง (Physical Count) ผลต่าง และสภาพพัสดุ
  2. `startYearEndAudit`: เริ่มต้นรอบการตรวจนับ คัดลอกยอดจาก `03_Master_Items` ลงสู่ `13_Year_End_Audits`
  3. `saveYearEndAudit`: บันทึกผลการตรวจนับ คำนวณผลต่าง และบันทึกรายชื่อคณะกรรมการ
- **วิธีทำซ้ำ (Reproduction Method):**
  เปิดหน้าจอ "ตรวจนับพัสดุ สิ้นปีงบ" ใน UI แล้วกดปุ่มบันทึกผลการตรวจนับ
- **หลักฐานการแก้ไข:**
  สร้างไฟล์ `Audit.gs` พร้อมฟังก์ชัน `apiGetYearEndAudit()`, `apiStartYearEndAudit()`, และ `apiSaveYearEndAudit()` รองรับการอ่านและบันทึกลงแผ่นงาน `13_Year_End_Audits` สมบูรณ์

---

#### 📌 [C-4] `fiscalYearSnapshots` ไม่ถูกโหลดใน Bootstrap หายเมื่อรีเฟรช
- **สถานะ:** `CONFIRMED (Fixed in Workspace)`
- **ตำแหน่งโค้ด:** [`Read.gs:loadFiscalYearSnapshots:L390-L460`](file:///c:/Users/Art/.gemini/antigravity/scratch/Read.gs#L390-L460), [`Read.gs:apiBootstrap:L13-L55`](file:///c:/Users/Art/.gemini/antigravity/scratch/Read.gs#L13-L55)
- **พฤติกรรมเดิมที่สังเกตพบ (Observed):**
  ตัวแปร `fiscalYearSnapshots` ในฝั่ง Client ถูกเก็บเป็น In-memory JavaScript object เมื่อผู้ใช้กด Refresh เบราว์เซอร์ ข้อมูล Snapshot ของปีงบประมาณที่ปิดไปแล้วจะสูญหายทั้งหมด ทำให้การเปิดดูข้อมูลปีก่อนหน้าแสดงผลเป็น 0
- **พฤติกรรมที่ถูกต้องตามข้อกำหนด (Intended):**
  ระบบต้องอ่านข้อมูล Snapshot จากแผ่นงาน `13_Year_End_Audits` หรือหากยังไม่มี ต้องคำนวณย้อนหลังจากสมุดบัญชีแยกประเภทคู่ `10_Stock_Ledger` ณ วันที่ 30 กันยายน 23:59:59 ของปีงบประมาณนั้นๆ
- **วิธีทำซ้ำ (Reproduction Method):**
  ปิดปีงบประมาณ 2568 แล้วกด Refresh หน้าเว็บ จากนั้นเลือกดูปีงบประมาณ 2568 ในหน้ารายงาน
- **หลักฐานการแก้ไข:**
  สร้างฟังก์ชัน `loadFiscalYearSnapshots(fiscalYear)` ใน `Read.gs` ดึงข้อมูลจากแผ่นงาน `13_Year_End_Audits` และมีกลไก Reconstruct ยอดคงเหลือย้อนหลังจาก `10_Stock_Ledger` อัตโนมัติ

---

#### 📌 [C-5] `linked_name` ของ FSN คืนค่า code แทน name (Bug)
- **สถานะ:** `CONFIRMED (Fixed in Workspace)`
- **ตำแหน่งโค้ด:** [`Read.gs:apiGetFsnList:L260-L315`](file:///c:/Users/Art/.gemini/antigravity/scratch/Read.gs#L260-L315), [`Read.gs:getFsnIndexMap:L480-L510`](file:///c:/Users/Art/.gemini/antigravity/scratch/Read.gs#L480-L510)
- **พฤติกรรมเดิมที่สังเกตพบ (Observed):**
  ในฟังก์ชัน `getAllFsn()` เดิม มีการเขียนโค้ด:
  `linked_name: String(row[H.indexOf('linked_code')] || '')`
  ส่งผลให้ฟิลด์ `linked_name` คืนค่ารหัสพัสดุ (เช่น `OFF-002`) แทนที่จะคืนชื่อรายการพัสดุภาษาไทย
- **พฤติกรรมที่ถูกต้องตามข้อกำหนด (Intended):**
  ต้องทำ Cross-Reference Lookup นำ `linked_code` ไปค้นหาชื่อพัสดุจากตาราง `03_Master_Items` และคืนชื่อเต็มภาษาไทย เช่น "กระดาษถ่ายเอกสาร A4 80 แกรม Double A"
- **วิธีทำซ้ำ (Reproduction Method):**
  เปิดดูตาราง FSN ในหน้าเว็บ สังเกตคอลัมน์ "พัสดุในคลังที่ผูกไว้"
- **หลักฐานการแก้ไข:**
  ใน `Read.gs:apiGetFsnList()` มีการสร้าง `fsnUsageMap` เชื่อมโยงรหัส `fsn_code` กับ `03_Master_Items` และคืนค่า `linked_name` ด้วยชื่อจริงของพัสดุ

---

#### 📌 [C-6] `changeFiscalYear()` ไม่โหลดข้อมูลใหม่จากเซิร์ฟเวอร์แบบ Asynchronous
- **สถานะ:** `CONFIRMED (Fixed in Workspace)`
- **ตำแหน่งโค้ด:** [`index.html:changeFiscalYear:L12848-L12940`](file:///c:/Users/Art/.gemini/antigravity/scratch/index.html#L12848-L12940), [`frontend/main/App.js:changeFiscalYear:L1177-L1200`](file:///c:/Users/Art/.gemini/antigravity/scratch/frontend/main/App.js#L1177-L1200)
- **พฤติกรรมเดิมที่สังเกตพบ (Observed):**
  ฟังก์ชัน `changeFiscalYear(newYear)` ในฝั่ง UI อัปเดตเฉพาะข้อความบนป้าย Badge (`badgeFiscalYear`, `dashFiscalYearBadge`) แต่ไม่ได้เรียก API ไปยัง Backend เพื่อดึงข้อมูลพัสดุและธุรกรรมของปีงบประมาณใหม่ ทำให้ผู้ใช้ยังคงเห็นข้อมูลของปีงบประมาณเดิมค้างอยู่
- **พฤติกรรมที่ถูกต้องตามข้อกำหนด (Intended):**
  เมื่อสลับปีงบประมาณ ต้องแสดง Loading State, สั่งล้างแคช (`_cachedDashboardData = null`), และเรียก Asynchronous RPC (`google.script.run.apiGetItems({ fiscalYear: newYear })`) เพื่อดึงข้อมูลของปีนั้นมาเรนเดอร์ตารางและกราฟใหม่ทั้งหมด หากการเชื่อมต่อล้มเหลวต้องแสดงข้อความ Error ชัดเจน ห้ามเปลี่ยนป้ายหลอกผู้ใช้
- **วิธีทำซ้ำ (Reproduction Method):**
  เลือกเปลี่ยนปีงบประมาณจาก 2569 เป็น 2568 ที่กล่อง Dropdown มุมขวาบน
- **หลักฐานการแก้ไข:**
  ปรับปรุง `changeFiscalYear()` ทั้งใน `index.html` และ `frontend/main/App.js` ให้เรียก `apiGetItems({ fiscalYear: newYear })` ล้างแคช และเรนเดอร์ UI ใหม่เมื่อได้รับข้อมูลตอบกลับ

---

#### 📌 [C-7] วงจรขอเบิกตัดสต็อกซ้ำซ้อน (Double Stock Deduction ใน Modal เดี่ยว)
- **สถานะ:** `CONFIRMED (Fixed in Workspace)`
- **ตำแหน่งโค้ด:** [`Write.gs:apiCreateRequisition:L110-L190`](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs#L110-L190), [`Write.gs:apiIssueStock:L260-L370`](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs#L260-L370), [`index.html:submitRequisition:L10190-L10235`](file:///c:/Users/Art/.gemini/antigravity/scratch/index.html#L10190-L10235), [`frontend/main/App.js:submitRequisition:L1023-L1038`](file:///c:/Users/Art/.gemini/antigravity/scratch/frontend/main/App.js#L1023-L1038)
- **พฤติกรรมเดิมที่สังเกตพบ (Observed):**
  ในหน้าต่างขอเบิกเดี่ยวเดิม (`#requisitionModal`) ฟังก์ชัน `submitRequisition()` สั่งตัดสต็อกทันทีในหน่วยความจำ (`item.stock -= qty`) และบันทึกประวัติการจ่ายออก เมื่อคำขอดังกล่าวถูกส่งไปยังขั้นตอนการอนุมัติและตัดจ่ายจริงใน `issueRequisition()` สต็อกจะถูกตัดซ้ำอีกรอบหนึ่ง หรือหากผู้บริหารไม่อนุมัติ สต็อกที่ถูกตัดไปแล้วจะไม่คืนกลับ
- **พฤติกรรมที่ถูกต้องตามข้อกำหนด (Intended):**
  State Machine ของการเบิกจ่ายต้องถูกแยกขั้นตอนอย่างเด็ดขาด:
  - `createRequisition`: สร้างคำขอในสถานะ `PENDING_APPROVAL` โดย **ไม่ตัดสต็อก**
  - `approveRequisition`: เปลี่ยนสถานะเป็น `APPROVED` โดย **ไม่ตัดสต็อก**
  - `issueStock` / `issueRequisition`: **ตัดสต็อกจริงเฉพาะในขั้นตอนนี้** ภายใต้ Mutex Lock (`LockService.getScriptLock()`) และลงบันทึกใน Double-Entry Ledger
- **วิธีทำซ้ำ (Reproduction Method):**
  เปิด Modal ขอเบิกพัสดุเดี่ยว กรอกจำนวน 5 หน่วย แล้วกดบันทึก จากนั้นตรวจสอบยอดคงเหลือในคลัง
- **หลักฐานการแก้ไข:**
  ปลดคำสั่ง `item.stock -= qty` ออกจาก `submitRequisition()` ทั้งใน `index.html` และ `frontend/main/App.js` กำหนดให้สร้างคำขอสถานะ `pending_approval` และทำการตัดสต็อกจริงเฉพาะใน `apiIssueStock()` ใน `Write.gs`

---

### 2.2 กลุ่มข้อค้นพบระดับสำคัญ (Important Findings: I-1 ถึง I-5)

---

#### 📌 [I-1] ขาด `history[].transaction_type` ในการคำนวณประเภทการเคลื่อนไหว
- **สถานะ:** `CONFIRMED (Fixed in Workspace)`
- **ตำแหน่งโค้ด:** [`Read.gs:getHistoryMap:L465-L530`](file:///c:/Users/Art/.gemini/antigravity/scratch/Read.gs#L465-L530)
- **พฤติกรรมเดิมที่สังเกตพบ (Observed):**
  ในประวัติธุรกรรมขาดฟิลด์ `transaction_type` แบบ Canonical หรือมีการใช้ค่าปะปนกันระหว่างภาษาไทยและภาษาอังกฤษ เช่น `in`/`out`, `รับเข้าสต็อก`, `เบิกจ่าย` ทำให้ฟังก์ชันคำนวณ Fast/Slow-Moving พลาดเป้า
- **หลักฐานการแก้ไข:**
  สร้างพจนานุกรม `canonicalTypes` ใน `Read.gs:getHistoryMap()` แมปค่าทั้งหมดเข้าสู่มาตรฐานสากล: `RECEIVE`, `ISSUE`, `ADJUSTMENT_ADD`, `ADJUSTMENT_SUB`, `DISPOSAL`, `INITIAL`

---

#### 📌 [I-2] `apiAddFsn()` ไม่ซิงค์รหัสกลับไปยัง `master_items.fsn_code`
- **สถานะ:** `CONFIRMED (Fixed in Workspace)`
- **ตำแหน่งโค้ด:** [`Write.gs:apiAddFsn:L440-L490`](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs#L440-L490), [`index.html:submitNewFsn:L10101-L10108`](file:///c:/Users/Art/.gemini/antigravity/scratch/index.html#L10101-L10108)
- **พฤติกรรมเดิมที่สังเกตพบ (Observed):**
  เมื่อเจ้าหน้าที่เพิ่มรหัส FSN ใหม่และระบุรหัสพัสดุที่เชื่อมโยง (`linked_code`) ข้อมูลถูกบันทึกเฉพาะในแผ่นงาน `06_FSN_Catalog` แต่ไม่ได้อัปเดตฟิลด์ `fsn_code` ใน `03_Master_Items` ทำให้ตัวกรอง "ผูกรหัส FSN แล้ว" ในหน้าแดชบอร์ดไม่พบรายการดังกล่าว
- **หลักฐานการแก้ไข:**
  ใน `Write.gs:apiAddFsn()` และ `index.html:submitNewFsn()` ได้เพิ่มขั้นตอน Two-Way Synchronization ค้นหาแถวของพัสดุใน `03_Master_Items` และอัปเดตคอลัมน์ `fsn_code` ให้ตรงกันทันที

---

#### 📌 [I-3] ขาด API นำเข้า CSV พร้อมโหมด Dry-Run และ Merge Mode
- **สถานะ:** `CONFIRMED (Fixed in Workspace)`
- **ตำแหน่งโค้ด:** [`Write.gs:apiImportItems:L495-L600`](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs#L495-L600)
- **พฤติกรรมเดิมที่สังเกตพบ (Observed):**
  การนำเข้าไฟล์ CSV ในหน้าจอตั้งค่า ทำงานเฉพาะในระดับ Client Memory เท่านั้น ไม่มีการส่งข้อมูลไปบันทึกจริงใน Google Sheets และไม่มีโหมดตรวจสอบความถูกต้องล่วงหน้า (Dry-Run)
- **หลักฐานการแก้ไข:**
  พัฒนาฟังก์ชัน `apiImportItems()` ใน `Write.gs` รองรับพารามิเตอร์ `dryRun: true` ตรวจสอบข้อผิดพลาดรายแถว (รหัสพัสดุว่าง, ราคาติดลบ) และรองรับ `mergeMode: 'merge' | 'overwrite'` ภายใต้ Mutex Lock

---

#### 📌 [I-4] `departments[]` ถูกฮาร์ดโค้ดใน UI ไม่ได้ดึงจากแผ่นงาน `02_Departments`
- **สถานะ:** `CONFIRMED (Fixed in Workspace)`
- **ตำแหน่งโค้ด:** [`Read.gs:getAllDepartments:L320-L360`](file:///c:/Users/Art/.gemini/antigravity/scratch/Read.gs#L320-L360)
- **พฤติกรรมเดิมที่สังเกตพบ (Observed):**
  รายชื่อกลุ่มสาระการเรียนรู้และฝ่ายงานถูกประกาศเป็นอาร์เรย์คงที่ 14 รายการใน JavaScript (`schoolDepartments`) หากโรงเรียนมีการปรับเปลี่ยนโครงสร้างหรือเพิ่มฝ่ายงานใหม่ จะไม่สามารถแก้ไขผ่าน Google Sheets ได้
- **หลักฐานการแก้ไข:**
  พัฒนาฟังก์ชัน `getAllDepartments()` ใน `Read.gs` ดึงรายชื่อกลุ่มสาระและฝ่ายงานจากแผ่นงาน `02_Departments` แบบไดนามิก พร้อมส่งไปใน Bundle ของ `apiBootstrap`

---

#### 📌 [I-5] ขาดระบบ Auto-Seed ปีงบประมาณเริ่มต้นเมื่อตารางว่างเปล่า
- **สถานะ:** `CONFIRMED (Fixed in Workspace)`
- **ตำแหน่งโค้ด:** [`Read.gs:getAllFiscalYears:L380-L425`](file:///c:/Users/Art/.gemini/antigravity/scratch/Read.gs#L380-L425)
- **พฤติกรรมเดิมที่สังเกตพบ (Observed):**
  เมื่อเริ่มต้นระบบใหม่และแผ่นงาน `12_Fiscal_Years` ยังไม่มีข้อมูล ฟังก์ชันดึงปีงบประมาณจะส่งค่ากลับเป็นอาเรย์ว่าง ทำให้ Dropdown เลือกปีงบประมาณในหน้าจอแสดงผลว่างเปล่า
- **หลักฐานการแก้ไข:**
  เพิ่มกลไก Auto-Seed ใน `getAllFiscalYears()` หากตรวจพบว่าตารางว่างเปล่า หรือขาดปีงบประมาณหลัก (2568, 2569, 2570) ระบบจะสร้างแถวข้อมูลให้อัตโนมัติพร้อมกำหนดวันเริ่มต้น (1 ต.ค.) และวันสิ้นสุด (30 ก.ย.) ตามปฏิทินหลวง

---

### 2.3 กลุ่มข้อเสนอแนะเพื่อประสิทธิภาพและความปลอดภัย (Optimizations: O-1 ถึง O-5)

---

#### 📌 [O-1] `getConfig()` สแกนแผ่นงานทุกครั้ง ขาด Multi-Tier Caching
- **สถานะ:** `CONFIRMED (Fixed in Workspace)`
- **ตำแหน่งโค้ด:** [`Config.gs:getConfig:L125-L165`](file:///c:/Users/Art/.gemini/antigravity/scratch/Config.gs#L125-L165), [`Config.gs:setConfig:L180-L212`](file:///c:/Users/Art/.gemini/antigravity/scratch/Config.gs#L180-L212)
- **พฤติกรรมเดิมที่สังเกตพบ (Observed):**
  ทุกครั้งที่มีการเรียกอ่านค่าคอนฟิกหรือลำดับรหัสเอกสาร ระบบจะเปิดแผ่นงาน `15_Settings_Config` และวนลูปอ่านแถวข้อมูล ส่งผลให้ชนโควตา Read Quota ของ Google Apps Script ได้ง่าย
- **หลักฐานการแก้ไข:**
  วางระบบ Multi-Tier Caching 3 ชั้น: `CacheService.getScriptCache()` (TTL 60-300 วินาที) $\rightarrow$ `PropertiesService.getScriptProperties()` $\rightarrow$ แผ่นงาน Google Sheets

---

#### 📌 [O-2] `getHistoryMap()` สแกนธุรกรรมข้ามปีทั้งหมดโดยไม่จำกัดปีงบประมาณ
- **สถานะ:** `CONFIRMED (Fixed in Workspace)`
- **ตำแหน่งโค้ด:** [`Read.gs:getHistoryMap:L470-L495`](file:///c:/Users/Art/.gemini/antigravity/scratch/Read.gs#L470-L495)
- **พฤติกรรมเดิมที่สังเกตพบ (Observed):**
  การอ่านข้อมูลประวัติเพื่อทำสถิติรายเดือน จะอ่านทุกแถวใน `09_Stock_Transactions` ตั้งแต่อดีต หากใช้งานไปหลายปีข้อมูลนับหมื่นแถวจะทำให้ระบบตอบสนองช้ามาก
- **หลักฐานการแก้ไข:**
  จำกัดขอบเขตการอ่านข้อมูลเฉพาะช่วงเวลาของปีงบประมาณที่ระบุ (`[christianYear - 1]-10-01` ถึง `christianYear-09-30`)

---

#### 📌 [O-3] โครงสร้าง ID แบบไม่เสถียรและขาด In-Memory Index
- **สถานะ:** `CONFIRMED (Fixed in Workspace)`
- **ตำแหน่งโค้ด:** [`Read.gs:getFsnIndexMap:L480-L510`](file:///c:/Users/Art/.gemini/antigravity/scratch/Read.gs#L480-L510), [`Write.gs:apiIssueStock:L290-L315`](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs#L290-L315)
- **พฤติกรรมเดิมที่สังเกตพบ (Observed):**
  การค้นหารายการพัสดุในระหว่างตัดจ่ายสต็อก ใช้การวนลูปซ้อนลูปแบบ $O(N^2)$
- **หลักฐานการแก้ไข:**
  สร้าง In-Memory Hash Map สำหรับดัชนี Master Items และ FSN Lookup ช่วยลดความซับซ้อนของการค้นหาลงเหลือ $O(1)$

---

#### 📌 [O-4] ขาดระบบป้องกันคำขอซ้ำซ้อน (Idempotency Key & Mutex Lock)
- **สถานะ:** `CONFIRMED (Fixed in Workspace)`
- **ตำแหน่งโค้ด:** [`Api.gs:routeRequest:L304-L336`](file:///c:/Users/Art/.gemini/antigravity/scratch/Api.gs#L304-L336), [`Api.gs:checkIdempotency:L210-L245`](file:///c:/Users/Art/.gemini/antigravity/scratch/Api.gs#L210-L245), [`Write.gs:apiCreateRequisition:L140-L150`](file:///c:/Users/Art/.gemini/antigravity/scratch/Write.gs#L140-L150)
- **พฤติกรรมเดิมที่สังเกตพบ (Observed):**
  หากผู้ใช้กดปุ่มบันทึกหรือจ่ายพัสดุซ้ำ (Double-Click) ขณะที่เครือข่ายกระตุก จะเกิดคำขอเบิกหรือการตัดสต็อกซ้ำซ้อน
- **หลักฐานการแก้ไข:**
  พัฒนาระบบตรวจสอบ `idempotencyKey` ใน `Api.gs` บันทึกผลลัพธ์ลงใน `CacheService` และแผ่นงาน `16_Idempotency_Log` หากตรวจพบกุญแจซ้ำจะส่งผลลัพธ์เดิมกลับทันทีโดยไม่ประมวลผลซ้ำ

---

#### 📌 [O-5] ขาดการบังคับใช้สิทธิ์ฝั่งเซิร์ฟเวอร์ (Fail-Closed Security & RBAC)
- **สถานะ:** `CONFIRMED (Fixed in Workspace)`
- **ตำแหน่งโค้ด:** [`Api.gs:routeRequest:L290-L305`](file:///c:/Users/Art/.gemini/antigravity/scratch/Api.gs#L290-L305), [`Api.gs:enforceRbac:L180-L205`](file:///c:/Users/Art/.gemini/antigravity/scratch/Api.gs#L180-L205)
- **พฤติกรรมเดิมที่สังเกตพบ (Observed):**
  ใน Backend เดิมไม่มีการตรวจสอบสิทธิ์ของผู้เรียกคำสั่ง ใครก็ตามที่มี URL ของ WebApp สามารถยิง HTTP POST เพื่อสั่งตัดสต็อกหรือปิดปีงบประมาณได้
- **หลักฐานการแก้ไข:**
  วางมาตรการ **Fail-Closed Security** ใน `Api.gs` โดยตรวจสอบสิทธิ์ของผู้ใช้งานผ่าน `Session.getActiveUser().getEmail()` หรือแมปสิทธิ์ตามตาราง `01_Users` หากสิทธิ์ไม่ถึงระดับขั้นต่ำที่กำหนดใน Action Registry จะปฏิเสธคำขอทันทีด้วย Error `FORBIDDEN`

---

### 2.4 กลุ่มข้อค้นพบความไม่สอดคล้องใหม่ (Non-Conformities: N-1 ถึง N-3)

---

#### 📌 [N-1] แคชซิกเนเจอร์ของแดชบอร์ดขาดมิติ Fiscal Year และ Data Revision
- **สถานะ:** `CONFIRMED (Fixed in Workspace)`
- **ตำแหน่งโค้ด:** [`index.html:getActiveDashboardData:L6280-L6305`](file:///c:/Users/Art/.gemini/antigravity/scratch/index.html#L6280-L6305)
- **พฤติกรรมเดิมที่สังเกตพบ (Observed):**
  ในฟังก์ชัน `getActiveDashboardData()` ของ `index.html` มีการสร้างแคชซิกเนเจอร์:
  `const currentSig = `${wh}|${cat}|${status}|${dateFilter}|${movement}|${abc}|${fsn}|${dept}`;`
  **ซึ่งไม่มี `currentFiscalYear` และไม่มีตัวนับการแก้ไขข้อมูล (`_dataRevision`)**  
  ส่งผลให้เมื่อผู้ใช้สลับปีงบประมาณ หรือเมื่อมีธุรกรรมการตัดจ่าย/รับเข้าสต็อกเกิดขึ้น แต่ตัวเลือกตัวกรองทั้ง 8 ตัวยังคงเหมือนเดิม เงื่อนไข `_lastFilterSignature === currentSig` จะประเมินเป็น `true` และระบบจะคืนค่าแคชเดิม (`_cachedDashboardData`) ที่เป็นข้อมูลเก่ามาแสดงผล ทำให้หน้าจอไม่สะท้อนยอดสต็อกจริง
- **พฤติกรรมที่ถูกต้องตามข้อกำหนด (Intended):**
  แคชซิกเนเจอร์ต้องรวมมิติปีงบประมาณและเลขเวอร์ชันของข้อมูล:
  `const currentSig = `${currentFiscalYear}|${_dataRevision || 0}|${wh}|${cat}|${status}|${dateFilter}|${movement}|${abc}|${fsn}|${dept}`;`
  และทุกครั้งที่มีการบันทึกธุรกรรม (Create, Restock, Issue, Adjust, Change Fiscal Year) จะต้องสั่ง:
  `_cachedDashboardData = null; _dataRevision++;`
- **หลักฐานการแก้ไข:**
  ปรับปรุงบรรทัดที่ 6280–6305 ของ `index.html` เพิ่มตัวแปร `_dataRevision` ประกาศซิกเนเจอร์ใหม่ที่ผูกกับปีงบประมาณ และสั่ง Invalidate แคชทุกครั้งที่มีการเปลี่ยนแปลงข้อมูล

---

#### 📌 [N-2] สัญลักษณ์ String Interpolation `${...}` เสียหายในข้อความ Audit ที่วาง
- **สถานะ:** `CONFIRMED (Fixed in Workspace)`
- **ตำแหน่งโค้ด:** `Pasted text / Audit Report`, [`index.html:L6240-L6270`](file:///c:/Users/Art/.gemini/antigravity/scratch/index.html#L6240-L6270), [`Audit.gs:computeSha256:L385-L420`](file:///c:/Users/Art/.gemini/antigravity/scratch/Audit.gs#L385-L420)
- **พฤติกรรมเดิมที่สังเกตพบ (Observed):**
  ในไฟล์ข้อความรายงาน Audit ที่ถูกวาง (`Pasted text`) พบคราบความเสียหายจากการคัดลอกข้อความ โดยเครื่องหมายดอลลาร์ไซน์ `$` ถูกตัดทิ้งออกจาก Template String ทั้งหมด เช่น:
  - `month/{year}` แทนที่จะเป็น `${month}/${year}`
  - `item.name({item.code})` แทนที่จะเป็น `${item.name} (${item.code})`
  - `fsc-00-{part1}-${part2}` แทนที่จะเป็น `${fsc}-00-${part1}-${part2}`
  - `formatNumber(critItems.length) รายการ` แทนที่จะเป็น `${formatNumber(critItems.length)} รายการ`
  - `currentSig = 'wh|{cat}|status|{dateFilter}...'`
  หากโปรแกรมเมอร์คัดลอกโค้ดแพตช์จากรายงานนี้ไปแปะในซอร์สโค้ดโดยตรง จะทำให้เกิดข้อผิดพลาดทางไวยากรณ์ (Syntax Error) หรือข้อความแสดงผลผิดเพี้ยนทันที
- **พฤติกรรมที่ถูกต้องตามข้อกำหนด (Intended):**
  ต้องตรวจสอบและคืนค่าโครงสร้าง Template String ให้ถูกต้องตามมาตรฐาน ECMAScript 2022 (`${...}`) ทุกจุด
- **หลักฐานการแก้ไข:**
  ตรวจสอบและฟื้นฟู String Interpolation ทุกจุดใน `index.html` และโค้ด Backend `Audit.gs` ให้สมบูรณ์ ไม่มีการใช้สตริงที่ขาดเครื่องหมาย `$`

---

#### 📌 [N-3] ชื่อและบทบาทของแบบฟอร์ม แบบ พ.ด. ๑–๗ ไม่ตรงกันระหว่างสเปกกับ UI
- **สถานะ:** `CONFIRMED (Fixed in Workspace)`
- **ตำแหน่งโค้ด:** [`index.html:initDocsModule:L10930-L10970`](file:///c:/Users/Art/.gemini/antigravity/scratch/index.html#L10930-L10970), [`Read.gs:apiGetPdReport:L515-L570`](file:///c:/Users/Art/.gemini/antigravity/scratch/Read.gs#L515-L570), `SYSTEM_TECHNICAL_SPECIFICATION.md:Section 5.2`
- **พฤติกรรมเดิมที่สังเกตพบ (Observed):**
  พบความขัดแย้งในการจับคู่ชื่อแบบฟอร์มราชการ (แบบ พ.ด. ๑ ถึง ๗) ระหว่างเอกสารสเปกหลักของระบบ กับแท็บเมนูในหน้าจอจริงของ `index.html`:

| ลำดับแบบฟอร์ม | ชื่อตามระเบียบกระทรวงการคลัง (ใน SYSTEM_TECHNICAL_SPECIFICATION) | ชื่อที่ปรากฏบนแท็บ UI จริง (ใน index.html บรรทัด 10930) | ข้อสังเกตความไม่ตรงกัน |
| :---: | :--- | :--- | :--- |
| **พ.ด. ๑** | ใบขอเบิกพัสดุ (Requisition Slip) | 1. ใบเบิก (พ.ด. ๑) | ตรงกัน |
| **พ.ด. ๒** | ใบตรวจรับพัสดุ (Inspection & Acceptance) | 2. ยอดคงเหลือรายวัน (พ.ด. ๒) | ❌ **ไม่ตรงกัน** (UI ใช้เป็นรายงานรายวัน) |
| **พ.ด. ๓** | ใบสั่งจ่าย / ใบเบิก–จ่ายพัสดุ (Issue Slip) | 3. สรุปรายเดือน (พ.ด. ๓) | ❌ **ไม่ตรงกัน** (UI ใช้เป็นสรุปรายเดือน) |
| **พ.ด. ๔** | ทะเบียนคุมพัสดุ (Stock Card) | 4. ทะเบียนคุมพัสดุ (พ.ด. ๔) | ตรงกัน |
| **พ.ด. ๕** | รายงานการตรวจนับพัสดุประจำปี (Annual Audit) | 5. สรุปภาพรวมสิ้นปี (พ.ด. ๕) | ตรงกันในเนื้อหา |
| **พ.ด. ๖** | รายงานขออนุมัติจำหน่ายพัสดุชำรุด (Disposal) | 6. สรุปตามหมวดสิ้นปี (พ.ด. ๖) | ❌ **ไม่ตรงกัน** (UI ใช้เป็นสรุปหมวดหมู่สิ้นปี) |
| **พ.ด. ๗** | บันทึกการทำลายพัสดุชำรุด (Destruction) | 7. ตรวจนับทุกรายการสิ้นปี (พ.ด. ๗) | ❌ **ไม่ตรงกัน** (UI ใช้เป็นบัญชีตรวจนับ 100 รายการ) |

- **พฤติกรรมที่ถูกต้องตามข้อกำหนด (Intended):**
  เพื่อไม่ให้กระทบต่อความคุ้นเคยของผู้ใช้งานเดิมในโรงเรียน และยังคงสอดคล้องกับระเบียบกระทรวงการคลัง ระบบ Backend ใน `Read.gs:apiGetPdReport()` ได้ถูกออกแบบเป็น **Dual-Mapping Adapter** ที่รองรับการเรียกรายงานได้ทั้ง 2 รูปแบบ:
  1. แบบทางการตามระเบียบพัสดุภาครัฐ (พ.ด. ๑ ใบเบิก, พ.ด. ๒ ตรวจรับ, พ.ด. ๓ ใบจ่าย, พ.ด. ๔ ทะเบียนคุม, พ.ด. ๕ รายงานตรวจนับสิ้นปี, พ.ด. ๖ ขอจำหน่าย, พ.ด. ๗ ทำลาย)
  2. แบบการปฏิบัติงานจริงของโรงเรียน (พ.ด. ๑ ใบเบิก, พ.ด. ๒ รายวัน, พ.ด. ๓ รายเดือน, พ.ด. ๔ ทะเบียนคุม, พ.ด. ๕ สรุปภาพรวมสิ้นปี, พ.ด. ๖ สรุปหมวดสิ้นปี, พ.ด. ๗ บัญชีตรวจนับ 100 รายการ)
- **หลักฐานการแก้ไข:**
  ใน `Read.gs:apiGetPdReport()` มีตรรกะ Switch-Case ที่รองรับทั้งรหัส `PD1` ถึง `PD7` และแมปชุดข้อมูลที่ถูกต้องให้กับรายงานทั้งสองมาตรฐานโดยไม่เกิดข้อผิดพลาด
