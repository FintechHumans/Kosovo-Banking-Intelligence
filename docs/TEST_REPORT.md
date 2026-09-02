# Test Report

**Executed:** 2026-09-02 · **Runner:** `app/tests/run.js` (zero dependency, Node)
**Result: 138 passed, 0 failed. Process exit code 0.**

## Command

```bash
node app/tests/run.js
```

Filter to one spec file:

```bash
node app/tests/run.js calculations
```

## Result

```
KBI test run — 4 spec file(s)
...
============================================================
PASSED: 138   FAILED: 0
============================================================
EXIT=0
```

## Coverage by suite

| Suite | Tests | What it protects |
|---|---:|---|
| periods — parsing and algebra | 8 | Both period spellings, provisional markers, year-boundary arithmetic, frequency detection |
| safe-math — zero is a value, not a gap | 10 | The zero-handling defect: fall-to-zero, divide-by-zero, missing vs zero |
| exact MoM and YoY | 4 | The ±2-month "YoY" defect — includes an explicit regression test |
| latestCommonPeriod | 4 | Period synchronisation, misalignment reporting, limiting-series naming |
| Market LTD Proxy | 3 | Common-period computation, lag warning, unavailability |
| Estimated Deposit Cost Proxy | 3 | Stock weighting, savings-rate sensitivity ladder, incomplete-input warning |
| Net Interest Income Share | 1 | That it is labelled a composition ratio, not a margin |
| Cost-to-Income | 1 | Corrected formula reproduces 46.0% at Dec 2025 |
| Cost of Risk | 3 | Mid-year annualisation, December not annualised twice, ending-loans fallback |
| pricing gap | 1 | Cross-period warning |
| unit scaling | 3 | Thousands→transactions conversion; percentage changes scale-invariant |
| deterministic deduplication | 7 | Replaces "keep the largest"; final beats provisional; unresolvable conflicts excluded |
| dataset validation | 5 | Duplicate keys, lagging series, gaps, range breaches |
| component reconciliation | 2 | Components vs published total |
| publication lag | 1 | Datasets ≥3 months behind |
| summary | 1 | Status aggregation |
| run length | 4 | Consecutive-direction counting |
| score components | 3 | Persistence curve, confidence by status, priority bands |
| evaluate | 5 | Noise scores low; sustained break outranks noise; estimated inputs discounted |
| assessment — direction is not the same as good | 4 | Semantic polarity: rising CoR is negative, rising adoption positive |
| ranking | 1 | Descending order, nulls dropped |
| regimes — transparent rules | 6 | Activation only on full match; untestable condition blocks activation |
| **shipped dataset — structure** | 3 | 23 datasets present, all periods parseable |
| **shipped dataset — no duplicate composite keys** | 23 | One test per dataset |
| **shipped dataset — latest period completeness** | 22 | Every series reaches the dataset latest, or is a declared discontinuation |
| **shipped dataset — deposit maturity feeds the cost proxy** | 2 | All 12 series present — the D1 regression guard |
| **shipped dataset — reconciliation** | 5 | Loan segments, income identities, residual buckets |
| **shipped dataset — chronology and sanity** | 3 | No future periods, plausible rates, non-negative stocks |

The final six suites run against the **real shipped `_data_blob.js`**, so a bad
data build fails the suite before it can reach the browser.

## Defects found and fixed by these tests

1. **Deduplication never collided** — `dimensionsOf` treated `status` and `source`
   as identifying dimensions, so a provisional and a final reading of the same month
   were different keys. Provenance fields are now excluded from the composite key.
2. **Deposit-maturity coverage collapse** — see `DATA_QUALITY_REPORT.md` §1.
3. **Payment counts displayed 1000× too small** — BQK publishes them in thousands.
4. **Five source-level reconciliation anomalies** in BQK's published history, now
   pinned so a new breach fails the build.

## Browser verification (manual, recorded)

Executed against `http://localhost:8766/app/index.html`, Chromium in the Browser pane.

| Check | Result |
|---|---|
| Uncaught console errors | **0** |
| Chart.js instances rendered | 75 |
| Datasets loaded | 23 (25,911 observations) |
| Modules mounted | 18 (15 existing + 3 new) |
| Decision Centre cards | 12, all with status badge and provenance drawer |
| Synchronisation banner | "Inputs aligned at Jul 2026" |
| Signals ranked | 5 (2 High, 1 Medium, 2 Low) |
| Regimes evaluated | 6 + neutral fallback; 1 active (Digital Acceleration) |
| Governance panel | PASSED, 0 errors, 2 informational |
| `role="tablist"` / `role="tab"` | 1 / 18 |
| `role="tabpanel"` | 18 |
| Keyboard: ArrowRight moves and activates | Decision Centre → Signals |
| Skip link present | yes |
| Canvases with `aria-label` | 75 |
| Legacy modules after change | unchanged, still rendering |

## Not covered by automated tests

- **Visual regression** — no screenshot diffing. Layout changes are verified by eye.
- **Cross-browser** — verified in Chromium only.
- **Print stylesheet** — not asserted.
- **Mobile layout** — CSS breakpoints exist but are not tested at width.
- **Forecast and scenario modules** — not built (see `AUDIT_REPORT.md`).
