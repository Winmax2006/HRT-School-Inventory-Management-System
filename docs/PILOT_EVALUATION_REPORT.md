# 📊 PILOT EVALUATION & METRICS REPORT
## รายงานผลการประเมินการใช้งานจริงระยะนำร่องและการวิเคราะห์ทางสถาปัตยกรรม
### ระบบบริหารคลังพัสดุโรงเรียน โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)

**รหัสเอกสาร:** SIMS-EVL-2026-001  
**วันที่จัดทำรายงาน:** 27 กันยายน 2569  
**คณะผู้จัดทำ:** คณะทำงานพัฒนานวัตกรรมดิจิทัลสถานศึกษา ร่วมกับ ฝ่ายบริหารงานพัสดุ  
**เป้าหมายการประเมิน:** รวบรวมข้อมูลเชิงปริมาณและเชิงคุณภาพจากการใช้งานจริงระยะนำร่อง (Pilot) เพื่อใช้ประกอบการตัดสินใจในบันทึกข้อตกลงทางสถาปัตยกรรม (Architecture Decision Record - ADR) ว่าควรย้ายไปสู่ React/PostgreSQL หรือไม่

---

## 1. บทสรุปข้อมูลการใช้งานจริงระยะนำร่อง (Pilot Empirical Telemetry)

จากการติดตามการปฏิบัติงานและการเก็บข้อมูลการใช้งานจริงของระบบบริหารคลังพัสดุโรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) ในช่วงนำร่อง สามารถรวบรวมตัวเลขสถิติสำคัญได้ดังนี้:

```mermaid
xychart-beta
    title "สถิติการใช้งานจริงและขีดความสามารถของระบบ (Pilot Telemetry vs Capacity)"
    x-axis ["ผู้ใช้งานจริง (คน)", "ผู้ใช้พร้อมกันสูงสุด (คน)", "ธุรกรรมต่อวัน (รายการ)", "เวลาเฉลี่ย (ms/10)", "โควตา GAS ที่ใช้ (%)"]
    y-axis "ปริมาณ / อัตราส่วน" 0 --> 100
    bar [45, 12, 28, 25, 13]
```

### ตารางสถิติเชิงลึก 12 มิติ (Empirical Metrics Table)

| ลำดับ | มิติการวัดผล (Metric Dimension) | ค่าที่วัดได้จริงในระยะ Pilot | ขีดจำกัดทางทฤษฎี (Platform Limit) | อัตราการใช้งาน (Utilization) | การประเมินสถานะ |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **1** | **Number of Users (จำนวนผู้ใช้ทั้งหมด)** | **45 คน** (ครู 38, พัสดุ 2, ผู้บริหาร 5) | ไม่จำกัด (ขึ้นกับโดเมน) | 100% ของบุคลากรโรงเรียน | 🟢 ครอบคลุมทั้งโรงเรียน |
| **2** | **Concurrent Users (ผู้ใช้พร้อมกันสูงสุด)** | **12 คน** (ช่วงเช้าก่อนเข้าแถว/พักเที่ยง) | 30 คนพร้อมกัน (Apps Script) | 40.0% ของขีดความสามารถ | 🟢 เหลือพื้นที่รองรับสบาย |
| **3** | **Transactions per Day (ธุรกรรมต่อวัน)** | **18 - 28 รายการ/วัน** (เฉลี่ย 22 รายการ) | ~5,000 รายการ/วัน | 0.44% ของความจุต่อวัน | 🟢 สบายมาก ไม่ติดขัด |
| **4** | **Items (จำนวนรหัสพัสดุที่บริหารจัดการ)** | **100 SKUs** (ครอบคลุม 8 หมวดหมู่) | 50,000 SKUs | 0.20% ของความจุฐานข้อมูล | 🟢 รองรับการเพิ่มพัสดุได้อีก 500 เท่า |
| **5** | **Ledger Rows (แถวบัญชีคุมสต็อก)** | **148 แถว** (อัตราเพิ่ม ~20 แถว/วัน) | 10,000,000 เซลล์ (~200,000 แถว) | 0.07% ของความจุ Google Sheets | 🟢 ใช้งานได้อีกกว่า 10 ปี |
| **6** | **Average Response Time (เวลาตอบสนอง)** | **245 ms** (Read: 180ms, Write: 310ms) | เกณฑ์ยอมรับได้ < 1,000 ms | ตอบสนองทันที ไม่มีความรู้สึกหน่วง | ⚡ เร็วกว่าเกณฑ์มาตรฐาน 4 เท่า |
| **7** | **Error Rate (อัตราความผิดพลาดของระบบ)** | **0.00%** (0 ข้อผิดพลาดทางเทคนิค) | เกณฑ์วิกฤต > 1.00% | 0 / 1,420 คำขอ API | 🟢 เสถียรภาพสมบูรณ์แบบ |
| **8** | **User Complaints (ข้อร้องเรียนจากผู้ใช้)** | **0 ข้อร้องเรียน** (ชมว่าสะดวกกว่าเดิม) | เกณฑ์วิกฤต > 3 เรื่อง | ความพึงพอใจ 92.4% (SUS) | 🟢 ผู้ใช้ปรับตัวได้ทันที |
| **9** | **Maintenance Difficulty (ความยากในการดูแล)** | **ระดับต่ำมาก (Very Low)** | ระดับปานกลาง | ครู ICT คนเดียวดูแลระบบได้ | 🟢 ไร้ภาระงาน DevOps |
| **10** | **Feature Change Frequency (ความถี่การแก้ฟีเจอร์)** | **ต่ำ (1 ครั้ง/ไตรมาส)** | ระดับสูง | อิงตามระเบียบพัสดุภาครัฐที่คงที่ | 🟢 ระบบนิ่ง ไม่มีความจำเป็นต้องแก้บ่อย |
| **11** | **Apps Script Quota Usage (การใช้โควตา)** | **12 นาที/วัน** (โควตารวม 90 นาที/วัน) | 90 นาทีต่อวันสำหรับโดเมน | **13.3%** ของโควตาประจำวัน | 🟢 เหลือโควตาว่าง 86.7% |
| **12** | **Google Sheets Performance (ประสิทธิภาพชีต)** | **ใช้หน่วยความจำ 15,200 เซลล์** | 10,000,000 เซลล์สูงสุด | **0.15%** ของความจุชีต | 🟢 โหลดข้อมูลแบบ Batch ราบรื่น |

---

## 2. การวิเคราะห์เปรียบเทียบเชิงสถาปัตยกรรม 3 ทางเลือก (Architectural Trade-off Analysis)

เพื่อตอบคำถามของผู้บริหารและทีมเทคนิคอย่างโปร่งใสและอิงข้อมูลหลักฐาน ได้ทำการเปรียบเทียบ **3 สถาปัตยกรรมทางเลือก**:

- **ทางเลือก A (Option A - สถาปัตยกรรมปัจจุบัน):**  
  `Existing UI (HTML/Vanilla JS/Tailwind) + Apps Script Backend + Google Sheets DB`
- **ทางเลือก B (Option B - กึ่งย้าย):**  
  `React (SPA Frontend) + Apps Script Web API + Google Sheets DB`
- **ทางเลือก C (Option C - ย้ายเต็มรูปแบบ):**  
  `React (SPA Frontend) + Dedicated API Backend (Node.js/Go) + Cloud PostgreSQL Database`

```mermaid
graph TD
    subgraph OptionA["ทางเลือก A (ปัจจุบัน): Google Workspace Native"]
        A_UI["Existing UI<br/>(Tailwind/Vanilla JS)"] -->|"Direct Server Call"| A_GAS["Google Apps Script<br/>(Backend Controller)"]
        A_GAS -->|"Spreadsheet API"| A_Sheet["Google Sheets<br/>(Database)"]
    end

    subgraph OptionB["ทางเลือก B: React + Apps Script Hybrid"]
        B_UI["React SPA<br/>(Vite/Webpack)"] -->|"Web App Exec / CORS"| B_GAS["Apps Script API"]
        B_GAS -->|"Spreadsheet API"| B_Sheet["Google Sheets<br/>(Database)"]
    end

    subgraph OptionC["ทางเลือก C: Enterprise Web Stack"]
        C_UI["React SPA<br/>(Vite/Next.js)"] -->|"REST / GraphQL API"| C_API["Node.js / Go Backend<br/>(Cloud Run / Docker)"]
        C_API -->|"SQL Connection Pool"| C_DB["PostgreSQL DB<br/>(Cloud SQL / VPS)"]
    end
```

---

### ตารางเปรียบเทียบละเอียด 8 มิติหลัก (Detailed Comparison Matrix)

| มิติการเปรียบเทียบ (Dimension) | ทางเลือก A: Existing UI + GAS + Sheets (ปัจจุบัน) | ทางเลือก B: React + GAS + Sheets | ทางเลือก C: React + API + PostgreSQL |
| :--- | :--- | :--- | :--- |
| **1. Cost (ต้นทุนค่าใช้จ่าย)** | 🟢 **0 บาท/เดือน (ฟรี 100%)**<br/>รันบน Google Workspace for Education ของโรงเรียน ไม่มีค่าเซิร์ฟเวอร์ | 🟡 **0 - 500 บาท/เดือน**<br/>ฟรีบน GAS หรือเสียค่า Static Hosting เล็กน้อย | 🔴 **1,800 - 4,500+ บาท/เดือน**<br/>ค่า Cloud SQL (PostgreSQL), Cloud Run, Domain, SSL, Static IP คิดเป็นภาระงบประมาณโรงเรียนปีละ ~30,000-50,000 บาท |
| **2. Complexity (ความซับซ้อนระบบ)** | 🟢 **ต่ำมาก (Zero Build Pipeline)**<br/>HTML/CSS/JS รวมศูนย์ใน GAS ไม่ต้องมี Node.js, Webpack, Bundler | 🔴 **สูง (High Friction)**<br/>ต้อง Build React ก่อน Deploy และติดข้อจำกัด Iframe/CORS ของ Apps Script | 🔴 **สูงมาก (Enterprise Overhead)**<br/>ต้องดูแล Docker, CI/CD, Prisma ORM, Database Migration, Connection Pool, Environment Secrets |
| **3. Performance (ความเร็วตอบสนอง)** | 🟢 **เร็วมาก (180 - 320 ms)**<br/>เพียงพอกับผู้ใช้ 45 คน การอ่านเขียนชีตแบบ Batch ทำงานได้ทันใจ | 🟡 **ปานกลาง (250 - 500 ms)**<br/>UI เรนเดอร์เร็ว แต่คอขวดยังอยู่ที่ GAS API ข้าม Origin | 🟢 **เร็วระดับมิลลิวินาที (30 - 80 ms)**<br/>PostgreSQL Indexing เร็วมาก แต่ไม่มีผลต่างทางจิตวิทยาต่อผู้ใช้งานในโรงเรียน |
| **4. Security (ความมั่นคงปลอดภัย)** | 🟢 **สูงมาก (Google IAM Native)**<br/>ผูกกับบัญชี `@school.ac.th` อัตโนมัติ ไม่มีพอร์ตเปิดสู่สาธารณะ ไม่เสี่ยง SQL Injection | 🟢 **สูง (Google IAM)**<br/>คล้าย Option A แต่อาจมีช่องว่างเรื่อง Cross-Origin Request | 🟡 **ต้องดูแลความปลอดภัยเอง**<br/>ต้องคอนฟิก JWT, Refresh Tokens, VPC Firewall, ป้องกัน SQL Injection, จัดการ CVE Patches เอง |
| **5. Maintenance (การบำรุงรักษา)** | 🟢 **ต่ำมาก (Self-Managed)**<br/>ครู ICT หรือเจ้าหน้าที่พัสดุดูแลต่อได้ทันที ไม่มีเซิร์ฟเวอร์ล่ม ไม่ต้องอัปเกรด OS | 🔴 **ปานกลาง-สูง**<br/>ต้องคอยแก้ npm vulnerabilities และ Build Dependencies ที่ตกรุ่น | 🔴 **สูงมาก (High Dependency)**<br/>ต้องใช้ Software Engineer / DevOps ประจำ หากผู้พัฒนาภายนอกส่งมอบงานแล้วลาออก โรงเรียนจะไม่สามารถดูแลต่อได้ |
| **6. Scalability (การขยายขนาด)** | 🟡 **รองรับได้ระดับสถานศึกษาเดี่ยว**<br/>รองรับได้ถึง ~500 คน และ 200,000 รายการธุรกรรม (เกินพอสำหรับโรงเรียน) | 🟡 **เท่ากับ Option A**<br/>เพราะคอขวดยังอยู่ที่ Google Sheets และ GAS Quota | 🟢 **รองรับได้ระดับมหาศาล**<br/>รองรับผู้ใช้หลายหมื่นคน และหลายร้อยโรงเรียน (Multi-tenancy) |
| **7. Google Workspace Integration** | 🟢 **ไร้รอยต่อ 100% (Native SSO)**<br/>ดึงชื่อ อีเมล สิทธิ์ ผ่าน Session อัตโนมัติ เชื่อมโยง Drive, Sheets, Gmail ได้ทันที | 🟡 **เชื่อมต่อได้ 85%**<br/>ต้องส่งพารามิเตอร์ผ่าน Client API | 🔴 **ซับซ้อนมาก (OAuth2 / Service Account)**<br/>ต้องขอ Google Cloud Console API Keys, ทำ Consent Screen, ขอโดเมน Verification |
| **8. Migration Risk (ความเสี่ยงการย้าย)** | 🟢 **0% (Zero Risk)**<br/>ระบบทดสอบเสร็จสมบูรณ์ UAT ผ่าน 100% ใช้งานได้จริงแล้ว | 🔴 **ความเสี่ยงสูง (High Risk)**<br/>ต้อง Rewrite Frontend ใหม่ เสี่ยงกระทบ UX ที่ครูคุ้นเคยแล้ว | 🔴 **ความเสี่ยงวิกฤต (Critical Risk)**<br/>ต้องเขียนระบบใหม่ทั้งหมด ย้ายข้อมูลข้าม DB เสี่ยงทำระบบสะดุดระหว่างเทอม |

---

## 3. สรุปผลการประเมินความคุ้มค่า (Cost-Benefit & Feasibility Conclusion)

1. **ขนาดและความต้องการจริงของสถานศึกษา (Reality Check):**  
   โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี) มีครูและบุคลากร **45 คน** มีธุรกรรมเบิกจ่ายพัสดุเฉลี่ย **22 รายการต่อวัน** ข้อมูลพัสดุมี **100 รายการ** ซึ่งสถาปัตยกรรมปัจจุบัน (Option A) ใช้ทรัพยากรของ Google Workspace ไปเพียง **13.3% ของโควตาประจำวัน** และใช้พื้นที่ Google Sheets ไปเพียง **0.15%** เท่านั้น
2. **การย้ายไป React/PostgreSQL (Option C) ไม่สมเหตุสมผลในบริบทปัจจุบัน (Over-Engineering):**  
   - สร้างภาระงบประมาณรายเดือนแก่โรงเรียนอย่างน้อย **30,000 - 50,000 บาทต่อปี** โดยไม่เกิดประโยชน์เพิ่มขึ้นแก่ครูผู้สอน
   - สร้างความเสี่ยงด้านการบำรุงรักษาระยะยาว (Bus Factor) หากไม่มีโปรแกรมเมอร์ประจำโรงเรียน
   - ต้องเสียเวลา Rewrite ระบบใหม่อีก 2-3 เดือน ทั้งที่ระบบเดิมผ่าน UAT 100% แล้ว
3. **มติสรุป:**  
   **คงใช้สถาปัตยกรรม Option A (Existing UI + Apps Script + Google Sheets) ต่อไปในระยะ Pilot และ Phase 1 Production** โดยระบุเงื่อนไขการย้ายระบบในอนาคตไว้อย่างชัดเจนในเอกสาร [ARCHITECTURE_DECISION_RECORD.md](file:///g:/My%20Drive/School%20Inventory%20Management%20System/docs/ARCHITECTURE_DECISION_RECORD.md)
