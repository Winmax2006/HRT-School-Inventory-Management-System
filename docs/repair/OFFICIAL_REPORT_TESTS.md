# HRT Inventory System — Official Report Tests & Document Verification Specification
**Document Version:** v1.1  
**Scope:** Forms แบบ พ.ด. ๑ through พ.ด. ๗ Verification  
**Standard:** Thai Government Standard Inventory Reporting & A4 Print Layouts  

---

## 1. Official Thai Government Form Overview (แบบ พ.ด. ๑ – ๗)

| Form Code | Official Document Title | Layout | Page Budget | Lineage Source | Status |
| :---: | :--- | :---: | :---: | :--- | :---: |
| **แบบ พ.ด. ๑** | ใบเบิกพัสดุสถานศึกษา | A4 Portrait | Single Page | `07_Requisitions` + `08_Requisition_Items` | **OFFICIAL_VERIFIED** |
| **แบบ พ.ด. ๒** | รายงานการรับจ่ายพัสดุประจำวัน | A4 Landscape | Dynamic | `09_Stock_Transactions` | **OFFICIAL_VERIFIED** |
| **แบบ พ.ด. ๓** | รายงานการรับจ่ายและคงเหลือพัสดุประจำเดือน | A4 Landscape | Single Page | `10_Stock_Ledger` / `04_Categories` | **OFFICIAL_VERIFIED** |
| **แบบ พ.ด. ๔** | ทะเบียนคุมพัสดุ (Stock Card) | A4 Landscape | Dynamic | `03_Master_Items` + `10_Stock_Ledger` | **OFFICIAL_VERIFIED** |
| **แบบ พ.ด. ๕** | รายงานผลการตรวจสอบพัสดุประจำปี (สรุปภาพรวม) | A4 Landscape | Exact 1 Page Fit | `13_Year_End_Audits` (ณ ๓๐ ก.ย.) | **OFFICIAL_VERIFIED** |
| **แบบ พ.ด. ๖** | รายงานผลการตรวจสอบพัสดุประจำปี (แยก ๘ หมวด) | A4 Landscape | Single Page | `13_Year_End_Audits` / `04_Categories` | **OFFICIAL_VERIFIED** |
| **แบบ พ.ด. ๗** | บัญชีตรวจนับพัสดุคงเหลือทุกรายการ ณ วันสิ้นปีงบประมาณ | A4 Portrait / Landscape | Exact 5/6 Pages | `13_Year_End_Audits` + `03_Master_Items` | **OFFICIAL_VERIFIED** |

---

## 2. Test Cases & Verification Scenarios

### 2.1 DOC-01: Mathematical Balance Continuity (Opening + In - Out = Closing)
- **Assertion:** For any report aggregate (monthly, category, year-end), the formula:
  $$\text{Opening Valuation} + \text{Incoming Valuation} - \text{Outgoing Valuation} = \text{Closing Valuation}$$
  must hold identically.
- **Defect Remediation:** Completely removed artificial multipliers (`closingVal * 0.15`, `closingVal * 0.08`, `actualVal * 0.45`, `actualVal * 0.49`, etc.) from `index.html`.
- **Evidence:** Verified by `tests/fiscal_year_official_reports_test.js` (DOC-01 PASS).

### 2.2 DOC-02: Report Lineage & Transaction Traceability
- **Assertion:** Inbound and outbound totals must trace back to recorded transaction logs (`type === 'in'` or `RECEIVE`, and `type === 'out'` or `ISSUE`).
- **Evidence:** Verified by `tests/fiscal_year_official_reports_test.js` (DOC-02 PASS).

### 2.3 DOC-03: FSN & Cost Authenticity (No Fabrication)
- **Assertion:** Items without a designated FSN code display `'-'` or empty, and NEVER synthesize random digits or pseudo-hash sequences (e.g. `(num * 17) % 899` or default `7510-00-000-0000`).
- **Evidence:** Verified by `tests/fiscal_year_official_reports_test.js` (DOC-03 PASS).

### 2.4 DOC-04: XSS & Print Injection Prevention
- **Assertion:** All printable item names, categories, warehouses, and user identities are sanitized via `escapeHtml()` or `textContent` before rendering into printable preview sheets. Malicious strings like `<script>alert("XSS")</script>` are rendered strictly as text and cannot execute.
- **Evidence:** Verified by `tests/fiscal_year_official_reports_test.js` (DOC-04 PASS).

### 2.5 DOC-05: Viewing Year Isolation
- **Assertion:** Switching between fiscal years updates document headers, date intervals, and serial numbers to match the viewed year without corrupting other fiscal periods.
- **Evidence:** Verified by `tests/fiscal_year_official_reports_test.js` (DOC-05 PASS).

### 2.6 DOC-06: Universe Completeness & Zero Distinction
- **Assertion:** Official report totals reflect the entire filtered inventory universe rather than the current UI pagination slice (e.g. 10 or 25 items per page). True zero stock (`0`) is distinctly distinguished from missing or uninspected data.
- **Evidence:** Verified by `tests/fiscal_year_official_reports_test.js` (DOC-06 PASS).
