# HRT Inventory System — Prompt 17 Execution & Verification Report
**Document Version:** v1.1  
**Target Release Pipeline:** `v2.7.0-rc.5` (Working Tree) $\rightarrow$ Candidate `v2.7.0-rc.6` (Post Prompts 13–20)  
**Execution Date:** 29 ตุลาคม 2569  
**Organization:** โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)  

---

## 1. Summary of Changes

In accordance with **HRT Prompt 17 (v1.1)**, the fiscal year lifecycle, physical count discrepancy handling, and official Thai government document generation (แบบ พ.ด. ๑ – ๗) have been comprehensively inspected, remediated, and verified:

1. **Temporal Boundaries & Timezone Policy (`Config.gs`):**
   - Formalized Thai Fiscal Year bounds in `Asia/Bangkok` (+07:00): starts 1 October at 00:00:00.000, ends 30 September at 23:59:59.999.
   - Enforced Gregorian/Buddhist calendar conversion ($CE = BE - 543$).
   - Prevented truthiness evaluation on timestamp 0 (`epoch zero`) in `isTimestampInFiscalYear`.

2. **Date Classification & Filtering (`Read.gs:hrtGetItems_` / FY-06):**
   - Added `parseItemTimestamp_` to categorize item dates into `VALID`, `EPOCH_ZERO`, `DATE_ONLY`, `MISSING_DATE`, and `INVALID_DATE`.
   - Added `parseBoundaryTimestamp_` to compute exact start-of-day and end-of-day bounds in Bangkok timezone.
   - Implemented `missingDatePolicy` (`INCLUDE` default, or `EXCLUDE`), ensuring items without dates are never silently dropped unless explicitly configured.

3. **Year-End Physical Count & Closure (`Write.gs:hrtCloseFiscalYear_` / FY-03, FY-04, FY-05):**
   - Enforced preconditions: only `ADMIN` or `DIRECTOR` can close; year cannot already be `CLOSED`; all requisitions for the target year must be terminal (`RECEIVED`, `CANCELLED`, `REJECTED`).
   - Physical count and variance from `13_Year_End_Audits` are strictly preserved (no auto-zeroing of variance or forcing physical count = book stock).
   - Close-year retries do not append duplicate snapshot rows or opening entries.
   - Closing book quantity of old year becomes the exact opening balance of the new year in `10_Stock_Ledger`.

4. **De-fabrication of Report Heuristics (`index.html` / DOC-01, DOC-02, DOC-03):**
   - Completely deleted artificial multiplier approximations (`closingVal * 0.15`, `closingVal * 0.08`, `actualVal * 0.45`, `actualVal * 0.49`, `closeVal * 0.45`, `closeVal * 0.49`).
   - Derived opening, incoming, outgoing, and closing valuations from actual item history / ledger movements: $\text{Opening} + \text{In} - \text{Out} = \text{Closing}$ holds identically across all categories and totals.
   - Replaced synthetic FSN generation (`(num * 17) % 899`, `7510-00-000-0000`) with authentic FSN lookup (`'-'` if unassigned).

5. **XSS Protection & Print Layouts (`index.html` / DOC-04):**
   - Added `escapeHtml()` and `escapeAttr()` context-aware encoders.
   - Applied escaping to all user-facing strings in print templates (items, categories, warehouses, personnel).

---

## 2. Acceptance Criteria Verification Matrix

| Criterion ID | Requirement | Test Command | Outcome | Evidence |
| :---: | :--- | :--- | :---: | :--- |
| **FY-01** | Boundaries 30 Sep / 1 Oct in Asia/Bangkok time, BE/CE correct | `node tests/fiscal_year_official_reports_test.js` | **PASS** | `getFiscalYearBounds` verifies 1 Oct 00:00:00 to 30 Sep 23:59:59.999 |
| **FY-02** | Closed year write denied; historical read does not mutate | `node tests/fiscal_year_official_reports_test.js` | **PASS** | Write to FY 2568 rejected with `CLOSED_FISCAL_YEAR`; active year remains 2569 |
| **FY-03** | Physical count variance preserved upon close-year | `node tests/fiscal_year_official_reports_test.js` | **PASS** | Variance -2 on OFF-001 retained in `13_Year_End_Audits`, not forced to 0 |
| **FY-04** | Close retry does not duplicate snapshots or opening entries | `node tests/fiscal_year_official_reports_test.js` | **PASS** | Second close attempt throws `INVALID_STATE`, zero duplicate rows |
| **FY-05** | Closing old year = opening new year traced in ledger | `node tests/fiscal_year_official_reports_test.js` | **PASS** | 2569 closing book stock 20 becomes 2570 `OPENING` qty 20 in `10_Stock_Ledger` |
| **FY-06** | Epoch 0, date-only, missing dates classified cleanly | `node tests/fiscal_year_official_reports_test.js` | **PASS** | `parseItemTimestamp_` returns `EPOCH_ZERO`, `MISSING_DATE`, `DATE_ONLY` |
| **DOC-01** | Opening + In - Out = Closing holds for every item and totals | `node tests/fiscal_year_official_reports_test.js` | **PASS** | Fake multipliers removed; mathematical balance holds identically |
| **DOC-02** | Report totals trace to committed history records | `node tests/fiscal_year_official_reports_test.js` | **PASS** | Item history `in`/`out` movements aggregated directly |
| **DOC-03** | Missing FSN/cost does not create fake numbers or FSNs | `node tests/fiscal_year_official_reports_test.js` | **PASS** | `getFsnCodeForItem` returns `'-'` if unassigned, no pseudo-FSC code generation |
| **DOC-04** | Print documents sanitize user text against XSS | `node tests/fiscal_year_official_reports_test.js` | **PASS** | `<script>` tags escaped to `&lt;script&gt;` via `escapeHtml()` |
| **DOC-05** | Year switch/render does not use stale/wrong-year data | `node tests/fiscal_year_official_reports_test.js` | **PASS** | Viewing year isolated in cache and request parameters |
| **DOC-06** | Report totals use full selected universe; true 0 distinguished | `node tests/fiscal_year_official_reports_test.js` | **PASS** | `totalUniverseCount` reflects full catalog, `stock: 0` distinguished from missing |

---

## 3. Regression Suite Status

- **Master Regression Runner:** `node scripts/run_all_tests.js`
- **Total Test Suites Executed:** 14 / 14 suites
- **Total Individual Tests Executed:** 162 / 162 tests
- **Pass Rate:** **100% (162 Passed, 0 Failed, 0 Skipped)**
