# SPEC: Insight Data Analytics Section — HRT Inventory Dashboard

## 1. Context

ระบบ HRT Inventory เป็น Single-File Web Application (`index.html`) สำหรับบริหารพัสดุ
ของสถานศึกษาภาครัฐไทย ทำงานแบบ client-side ทั้งหมด ไม่มี backend server

**Tech Stack ปัจจุบัน (ห้ามเปลี่ยน):**
- Tailwind CSS ผ่าน CDN + custom `brand` color palette ใน `tailwind.config`
- Vanilla JavaScript (ES6+) ไม่มี framework ไม่มี build step
- ฟอนต์: Noto Sans Thai (ภาษาไทย) + Inter (ตัวเลข/อังกฤษ)
- Typography scale ใช้ `clamp()` ผ่าน CSS custom properties
- Data layer: CSV files ใน Local Workspace, sync ผ่าน Google Apps Script → Google Sheets
- Print: มี `@media print` stylesheet แยกสำหรับเอกสารราชการ พ.ด. ๑–๗

**โครงสร้าง UI:**
Sidebar (nav 3 กลุ่ม) + Topbar + Content Area
Dashboard เรียงจากบนลงล่าง: KPI Cards → Action Center → ตารางพัสดุวิกฤต → **[จุดที่จะเพิ่ม]**

**Data Sources:**
| ไฟล์ | ฟิลด์หลัก |
|---|---|
| `Master_Items.csv` | code, name, category, unit, warehouse, unit_cost, min, rop, stock, status |
| `Transactions.csv` | ธุรกรรมเบิก–รับ |
| FSN Registry | fsn_code, group, class_code, linked_code |
| Audit Data | bookStock, physicalCount, variance, condition |

---

## 2. Goal

เพิ่ม section ใหม่ชื่อ **"Insight Data Analytics"** ต่อท้าย Dashboard
ประกอบด้วยกราฟ 4 ตัว + sparkline ใน KPI cards เดิม
เพื่อให้เจ้าหน้าที่พัสดุและผู้บริหารเห็นแนวโน้มการใช้ทรัพยากร
และตัดสินใจจัดซื้อ/จัดสรรงบประมาณได้จากหน้าเดียว

---

## 3. Hard Constraints

ห้ามละเมิดข้อใดข้อหนึ่งต่อไปนี้:

1. **ต้องคงความเป็น single-file** — โค้ดทั้งหมดอยู่ใน `index.html` เท่านั้น
   ห้ามสร้างไฟล์ `.js` / `.css` แยก ห้ามเพิ่ม build tool
2. **ห้ามแก้ไข section เดิม** ที่อยู่เหนือจุดแทรก (KPI, Action Center, ตารางพัสดุวิกฤต)
   ยกเว้นการเพิ่ม sparkline ใน KPI card ตาม Task 6
3. **ห้ามแตะ `@media print` เดิม** ของเอกสาร พ.ด. ๑–๗ — ให้เพิ่ม print rule ใหม่
   แบบ scoped ด้วย `#insight-analytics` เท่านั้น
4. **สีต้องผูกกับ semantic เดิมของระบบ**
   - พร้อมใช้งาน → เขียว `#10b981`
   - ต่ำกว่าเกณฑ์ → เหลือง `#f59e0b`
   - วิกฤต → แดง `#ef4444`
   ห้ามใช้ default color palette ของ Chart.js
5. **ปีงบประมาณเริ่ม ตุลาคม** — แกนเวลาทุกกราฟต้องเรียง ต.ค. → ก.ย.
   ห้ามใช้ปีปฏิทิน
6. **ตัวเลขทุกจุดต้องผ่าน `toLocaleString('th-TH')`** รวมถึงใน tooltip
7. **ถ้าไม่มีข้อมูล ห้ามแสดง canvas ว่าง** — ต้องมี empty state พร้อมข้อความอธิบาย

---

## 4. Dependency

เพิ่ม Chart.js v4 ผ่าน CDN ใน `<head>` — ห้ามใช้ไลบรารีกราฟตัวอื่น:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js" defer></script>
```

---

## 5. Tasks

### Task 1 — Data Layer: Schema Migration

แก้ `Transactions.csv` schema ให้เป็น:

```
txn_id, txn_date, txn_type, item_code, qty, unit_cost_at_time,
department, requester, doc_ref, fiscal_year, fiscal_month
```

**Requirements:**
- เขียน `migrateTransactionSchema(rows)` เติมฟิลด์ที่ขาดให้ record เก่า
- record เก่าที่ไม่มี `department` → เติมค่า `"ไม่ระบุหน่วยงาน"`
- คำนวณ `fiscal_year` / `fiscal_month` จาก `txn_date` ด้วย helper:
  ```js
  // ต.ค.=1, พ.ย.=2, ... ก.ย.=12
  function toFiscalPeriod(dateStr) { /* return { fy, fm } */ }
  ```
- `txn_type` ต้อง normalize เป็น `'IN'` หรือ `'OUT'` เท่านั้น
- อัปเดต Google Apps Script sync ให้รองรับคอลัมน์ใหม่ แบบ backward-compatible

### Task 2 — Aggregate Cache Layer

สร้าง `buildInsightCache(transactions, masterItems)` คืนค่า:

```js
{
  byMonth: { '2569-01': { in: 120, out: 95 }, ... },
  byItem:  { 'A001': 420, ... },
  byDept:  { 'วิทยาศาสตร์': { 'วัสดุสำนักงาน': 88, ... }, ... },
  byCategory: { 'วัสดุสำนักงาน': 185000, ... },  // stock × unit_cost
  builtAt: 1757030400000
}
```

**Requirements:**
- คำนวณครั้งเดียวตอนโหลด แล้ว cache ไว้ใน memory
- invalidate cache เมื่อมีธุรกรรมใหม่ (เบิก/รับ/ปิดบัญชี)
- ต้องรับมือกับ qty ที่เป็น string, null, หรือ NaN ได้โดยไม่ crash

### Task 3 — Chart Theme Tokens

สร้าง object `CHART_THEME` และตั้งค่า `Chart.defaults` ให้ทุกกราฟใช้ร่วมกัน:

```js
const CHART_THEME = {
  colors: {
    brand: '#2563eb', accent: '#f59e0b',
    ok: '#10b981', warn: '#f59e0b', danger: '#ef4444',
    muted: '#94a3b8', grid: 'rgba(148,163,184,.18)'
  },
  font: { family: "'Noto Sans Thai','Inter',sans-serif", size: 12 }
};
```

ตั้ง `Chart.defaults.font`, `Chart.defaults.color`,
`legend.labels.usePointStyle = true`, `boxWidth = 8`

### Task 4 — HTML Structure

แทรก `<section id="insight-analytics">` ต่อจากตารางพัสดุวิกฤต

**Layout:** grid 12 คอลัมน์ (`lg:grid-cols-12`), มือถือ 1 คอลัมน์, gap 4

| ID | Chart | Grid | ความสูง |
|---|---|---|---|
| `chartMovement` | Combo: bar รับ/เบิก + line คงเหลือ | `lg:col-span-8` | `h-72` |
| `chartCategory` | Doughnut มูลค่ารายหมวด | `lg:col-span-4` | `h-56` |
| `chartTopItems` | Horizontal bar Top 10 | `lg:col-span-6` | `h-80` |
| `chartByDept` | Stacked bar รายกลุ่มสาระฯ | `lg:col-span-6` | `h-80` |

**Card style (ใช้เหมือนกันทุกใบ):**
`rounded-xl border border-slate-200 bg-white p-5 shadow-sm`

**Section header:** ชื่อ section + คำอธิบาย (ซ้าย) / dropdown เลือกปีงบประมาณ + ปุ่มส่งออก PNG (ขวา)

**ทุก card ต้องมี:** `<h3>` ชื่อกราฟ + `<p>` คำอธิบายสั้น + wrapper `relative` ครอบ canvas

### Task 5 — Chart Implementations

**① `chartMovement` — Combo Chart**
- Bar `รับเข้า` สี brand + bar `เบิกออก` สี accent, `borderRadius: 6`, `maxBarThickness: 22`
- Line `คงเหลือสะสม` แกน Y ขวา (`yAxisID: 'y1'`), เส้นประ `borderDash: [5,4]`, `tension: .35`, `pointRadius: 0`
- `interaction: { mode: 'index', intersect: false }`
- Tooltip: พื้นหลัง `#0f172a`, `cornerRadius: 8`, format `"{label}: {n} รายการ"`
- แกน X ไม่แสดง grid line

**② `chartCategory` — Doughnut**
- `cutout: '68%'`, `borderWidth: 3`, `borderColor: '#fff'`, `hoverOffset: 8`
- เขียน custom plugin `centerText` วาดมูลค่ารวมตรงกลาง (บรรทัดบน = จำนวนเงิน bold 20px, บรรทัดล่าง = "มูลค่ารวม" 12px สีเทา)
- ปิด legend ของ Chart.js แล้วสร้าง legend เป็น HTML list ด้านล่าง แสดงชื่อหมวด + % + จำนวนเงิน
- Tooltip format เป็นสกุลเงินบาท

**③ `chartTopItems` — Horizontal Bar**
- `indexAxis: 'y'` (จำเป็น เพราะชื่อพัสดุภาษาไทยยาว)
- สีแต่ละแถบมาจาก `status` ของพัสดุนั้น (ok/warn/danger)
- `ticks: { font: { size: 11 }, crossAlign: 'far' }`
- ชื่อยาวเกิน 28 ตัวอักษรให้ตัดด้วย `…` แต่ tooltip แสดงชื่อเต็ม
- ปิด legend

**④ `chartByDept` — Stacked Bar**
- `x.stacked = true`, `y.stacked = true`
- แกน X = กลุ่มสาระฯ, stack = หมวดพัสดุ
- ใช้ชุดสีเดียวกับกราฟ ② เพื่อให้ตีความข้ามกราฟได้
- ถ้ามีข้อมูล `"ไม่ระบุหน่วยงาน"` ให้แสดงเป็นสีเทา `muted` และเรียงไว้ท้ายสุด
- แสดง note ใต้กราฟ: *"ข้อมูลหน่วยงานเริ่มบันทึกตั้งแต่ ต.ค. 2569"*

### Task 6 — KPI Sparklines

เพิ่มกราฟเส้นจิ๋วใต้ตัวเลขใน KPI card เดิมทั้ง 3 ใบ:
- สูง 32px, `pointRadius: 0`, ไม่มีแกน ไม่มี grid ไม่มี legend ไม่มี tooltip
- เพิ่ม badge เปอร์เซ็นต์เปลี่ยนแปลง `▲ 12%` (เขียว) / `▼ 5%` (แดง) ข้างตัวเลข
- **ห้ามเปลี่ยนความสูงเดิมของ card** — ใช้พื้นที่ว่างด้านล่างเท่านั้น

### Task 7 — Performance: Lazy Render

- ใช้ `IntersectionObserver` (`rootMargin: '120px'`) เรนเดอร์กราฟเมื่อเลื่อนถึงเท่านั้น
- `obs.disconnect()` หลังเรนเดอร์ครั้งแรก
- เก็บ instance ไว้ใน registry แล้ว `.destroy()` ก่อนสร้างใหม่ ทุกครั้งที่เปลี่ยน filter
  (ป้องกัน memory leak)

### Task 8 — Print Support

```js
window.addEventListener('beforeprint', () => {
  chartRegistry.forEach(c => { c.resize(); c.render(); });
});
```

```css
@media print {
  #insight-analytics { break-inside: avoid; }
  #insight-analytics canvas { max-width: 100% !important; height: auto !important; }
  #insight-analytics .grid { grid-template-columns: repeat(2, 1fr) !important; }
  #insight-analytics button, #insight-analytics select { display: none !important; }
}
```

### Task 9 — Accessibility

- ทุก `<canvas>` มี `role="img"` + `aria-label` สรุปเนื้อหากราฟเป็นข้อความไทย
- ทุก card มีปุ่ม **"ดูเป็นตาราง"** สลับ canvas ↔ `<table>` ที่มี `<caption>` และ `<th scope>`
  (จำเป็นสำหรับหน่วยงานราชการที่ต้องผ่าน WCAG 2.1 AA)
- สถานะวิกฤตต้องมีไอคอน/ข้อความกำกับ ไม่สื่อด้วยสีอย่างเดียว
- Contrast ratio ของข้อความบนกราฟ ≥ 4.5:1

---

## 6. Acceptance Criteria

- [ ] เปิด `index.html` แบบ double-click ได้เลย ไม่ต้อง build ไม่ต้อง local server
- [ ] กราฟทั้ง 4 แสดงผลถูกต้องบน Chrome, Edge, Firefox
- [ ] Responsive: มือถือ (375px) เรียง 1 คอลัมน์ / แท็บเล็ต (768px) 2 คอลัมน์ / เดสก์ท็อป (1280px) ตาม grid ที่กำหนด
- [ ] ตัวเลขทุกจุดเป็นรูปแบบไทย มี comma คั่นหลักพัน
- [ ] แกนเวลาเรียง ต.ค. → ก.ย. ทุกกราฟ
- [ ] ไม่มี error / warning ใน console
- [ ] เปลี่ยน filter ปีงบประมาณแล้วกราฟอัปเดตทุกตัว ไม่มี memory leak
- [ ] Ctrl+P แล้วกราฟพิมพ์ออกครบ ไม่ถูกตัดกลางหน้า
- [ ] เอกสาร พ.ด. ๑–๗ พิมพ์ออกมาเหมือนเดิมทุกประการ
- [ ] ปุ่ม "ดูเป็นตาราง" ทำงานครบทุกกราฟ
- [ ] ทดสอบด้วยข้อมูลว่าง → แสดง empty state ไม่ crash

---

## 7. Out of Scope

ห้าม agent ทำสิ่งเหล่านี้โดยไม่ถามก่อน:
- เปลี่ยน CSS framework หรือเพิ่ม dependency อื่นนอกจาก Chart.js
- Refactor โค้ดส่วนที่ไม่เกี่ยวกับ Insight section
- เปลี่ยนโครงสร้าง navigation หรือ layout หลัก
- แก้ template เอกสาร พ.ด. ๑–๗
- เพิ่ม backend, database server, หรือ authentication

---

## 8. Execution Order

ทำทีละ Task ตามลำดับ และ**หยุดให้ตรวจสอบหลังจบแต่ละ Phase**:

**Phase 1 (ทำได้ทันทีด้วยข้อมูลเดิม):** Task 3 → 4 → กราฟ ② และ ③
**Phase 2 (ต้อง migrate ข้อมูลก่อน):** Task 1 → 2 → กราฟ ① และ ④
**Phase 3 (ขัดเกลา):** Task 6 → 7 → 8 → 9