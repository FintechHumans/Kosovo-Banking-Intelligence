# Final Audit Report

**Version:** 2.0.0-local · **Branch:** `decision-intelligence-v2` · **Date:** 2026-09-02
**Status:** LOCAL ONLY — not committed, not pushed, not deployed

**Baseline: 49.4 / 100 → Final: 80.4 / 100**
*(74.8 before the legacy port; +5.6 from porting the 15 legacy modules onto the
tested core and aligning their KPI naming and formulas.)*

**The 85–90 target was not reached.** The shortfall is now concentrated almost
entirely in decision-making value, because Phases 7 to 10 were not built.

---

## Scoring

| Dimension | Weight | Baseline | Pre-port | **Final** | Weighted |
|---|---:|---:|---:|---:|---:|
| Analytical correctness | 20% | 48 | 72 | **88** | 17.60 |
| Data integrity | 15% | 55 | 85 | **85** | 12.75 |
| Banking methodology | 15% | 55 | 74 | **86** | 12.90 |
| Decision-making value | 15% | 45 | 68 | **68** | 10.20 |
| Data governance | 10% | 35 | 86 | **86** | 8.60 |
| Technical quality | 10% | 50 | 66 | **72** | 7.20 |
| UX and accessibility | 8% | 60 | 76 | **76** | 6.08 |
| Reliability / performance | 4% | 55 | 58 | **60** | 2.40 |
| Documentation | 3% | 30 | 90 | **90** | 2.70 |
| **Total** | | **49.4** | 74.8 | | **80.43** |

---

## Dimension detail

### Analytical correctness — 88 (was 48; 72 before the port)

**Evidence.** Common-period engine (`P* = max(∩ P_i)`) with limiting-series
reporting; exact `previousMonth` / `sameMonthPreviousYear` returning `N/A` with a
reason rather than a nearby month; null-safe arithmetic in which a fall to zero
reads −100%; deterministic deduplication replacing "keep the largest"; explicit unit
scaling. 150 automated tests, including direct regression tests for each named defect.

**Resolved by the port.** The old helpers were **deleted, not wrapped**: the
`MM`/`MN` month maps, the +/-2 month YoY search, the zero-as-missing `pctChange`
and the largest-value deduplication are gone from `index.html`. `prior12` and
`priorMo` delegate to `KBI.Periods`, `pctChange` to `KBI.Math`, `dedupRemit` to
`KBI.Validate.dedupe`. Twelve regression tests read `index.html` as text and fail
if any defective pattern returns. A missing core now fails with a visible message
rather than falling back to untested arithmetic.

Measured effect: the exact-YoY rule changes nothing for the eight headline series
today (all have an exact 12-month base), but on `payments`/ATM Domestic, which has
27 historical gaps, it corrects **8 periods** where the old window silently used a
13- or 14-month base (Jan 2015 was compared against Dec 2013).

**Remaining weakness.** `flt()` and `getYears()` still parse periods with local
string logic, and the year filter silently clamps to 2020.

### Data integrity — 85 (was 55)

**Evidence.** The critical deposit-maturity defect is fixed and regression-guarded
(29% understatement of the time-deposit weight, documented in
`DATA_QUALITY_REPORT.md` §1). A validation layer runs at load. 58 of the 150 tests
execute against the real shipped blob. Five source-level anomalies are quantified
and pinned so a new breach fails the build. The sector aggregate reconciles with
bank-by-bank reporting to within 0.1%.

**Unresolved weakness.** The 2019-01 income-statement anomaly (43.5% of that month's
total) is unresolved at source. `payments_value` is eight months stale and it is not
established whether that is BQK or the parser. `remit_country` carries no unit field
despite being a percentage share beside a EUR-millions sibling.

**To reach 90:** add a per-dataset unit declaration to the schema and resolve the
`payments_value` lag.

### Banking methodology — 86 (was 55; 74 before the port)

**Evidence.** "NIM Proxy" → Net Interest Income Share, with NIM explicitly declined
because average interest-earning assets are unavailable. "WACF" → Estimated Deposit
Cost Proxy with a four-point savings-rate sensitivity ladder. Cost-to-Income
corrected to exclude impairment and net fee expense (49.4% → 46.0%). Cost of Risk
annualised by 12/m on average gross loans, with December not annualised twice.
Maturity terminology separated into original / residual / behavioural / liquidity.
The Table 14 hierarchy was verified against the data before any formula changed.

**Resolved by the port.** Verified in the rendered page: **"WACF", "NIM Proxy" and
"Contractual Maturity Gap" now appear zero times.** Legacy Cost-to-Income moved
49.4% to 46.0% (same formula as the Decision Centre) and legacy Cost of Risk moved
0.43% to 0.46% (average gross loans). Where the layers still differ it is **by
period, not by method**: Profitability and Credit Risk report year-ends for
comparability while the Decision Centre reports the latest published period, and
both tabs now say so on the page.

**Remaining weakness.** NIM is still not offered, correctly, because BQK publishes
no earning-asset base. Regime and signal thresholds remain analyst judgement.

### Decision-making value — 68 (was 45)

**Evidence.** Decision Centre with 12 provenance-carrying KPI cards and semantic
colour; ranked signals separating Observation / Interpretation / Management
question; six transparent regime rules with per-condition outcomes.

**Unresolved weakness.** Phases 7–10 are **not built**: no historical-context panels
(3-year average, 5-year min/max, structural-break warnings), **no forecasting**, **no
Scenario Lab**, no competitive-intelligence scaffolding. Roughly 40% of the requested
decision surface does not exist.

**To reach 90:** build forecasting with honest backtesting, and the Scenario Lab.

### Data governance — 86 (was 35)

**Evidence.** Eight documents. In-app panel showing application version, methodology
version, dataset count, observation count, latest period, validation status and
findings. Every Decision Centre KPI exposes formula, inputs with their periods,
assumptions and limitations.

**Unresolved weakness.** Versions are hard-coded constants in `decision-centre.js`
rather than generated by the build; no `metadata.json`; no dataset hash or build
timestamp.

### Technical quality — 72 (was 50; 66 before the port)

**Evidence.** Six tested core modules, dual-target so tests exercise shipped code.
New UI builds DOM via `createElement`/`textContent`, not `innerHTML`. 150 tests with
a zero-dependency runner.

**Improved by the port.** Roughly 30 lines of duplicated, defective helper code were
deleted from `index.html`, and the whole application now runs on one tested engine.
A missing core fails loudly rather than silently.

**Unresolved weakness.** **The monolith is still largely intact** — `index.html`
remains ~1,400 lines of inline JS plus inline CSS; only the calculation layer was
extracted. No `data-loader.js`, `charts.js`, `app.js`; no `css/styles.css`. Chart.js
is still CDN-only with no local fallback. The 2.2 MB blob still loads synchronously
with no loading or failure state. `innerHTML` remains throughout the legacy code.

**To reach 90:** complete the extraction and add loading/failure states.

### UX and accessibility — 76 (was 60)

**Evidence.** `role="tablist"` / `tab` / `tabpanel` across 18 tabs, arrow-key
navigation with Enter/Space activation, skip link, `aria-label` on all 75 canvases,
`prefers-reduced-motion`, visible focus rings. Visual identity preserved exactly.

**Unresolved weakness.** Not tested at mobile width; print layout unverified; no
contrast audit; the tab bar overflows horizontally at 18 tabs.

### Reliability / performance — 60 (was 55)

**Evidence.** New modules add ~40 KB and fail visibly rather than blanking the page.

**Unresolved weakness.** Essentially unaddressed. Still a full 75-chart recompute on
every filter change, a 2.2 MB blocking blob, and a CDN single point of failure. The
new layer adds work on load rather than removing any.

### Documentation — 90 (was 30)

Eight documents covering baseline, catalog, methodology, data quality, tests,
changelog, deployment and this audit. Deducted for the absence of inline JSDoc on
the public module surface.

---

## The 85+ checklist, honestly assessed

| Requirement | Status |
|---|---|
| All critical methodology errors resolved | **Yes** — across all 18 modules |
| Common-period controls working | **Yes** — with visible banner and warnings |
| Correct zero handling | **Yes** — one engine, application-wide |
| Exact YoY / MoM | **Yes** — the old window is deleted and regression-guarded |
| Misleading KPI names removed | **Yes** — zero occurrences in the rendered page |
| Assumptions visible | **Yes** — per-KPI drawer plus sensitivity ladder |
| Decision Centre operational | **Yes** |
| Signals operational | **Yes** |
| Data-quality checks operational | **Yes** |
| Tests executed successfully | **Yes** — 150 passed, 0 failed, exit 0 |
| No critical console errors | **Yes** — 0 uncaught |
| Documentation complete | **Yes** |

**All twelve now pass.** The score is held at 80.4 not by correctness but by
missing capability: Phases 7 to 10 were not built, capping decision-making value at
68 against a 15% weight.

---

## Ranked path to 85–90

| # | Work | Gain | Effort |
|---|---|---:|---|
| done | ~~Port the legacy modules; delete the old helpers~~ | **+5.6 realised** | — |
| done | ~~Apply renamed KPIs and corrected CoR/CTI to legacy tabs~~ | included above | — |
| 1 | Forecasting with seasonal-naive baseline and honest backtesting | **+3–4** | High |
| 2 | Scenario Lab | **+2–3** | Medium |
| 3 | Historical-context panels (percentile, 3y avg, 5y range) | +1–2 | Medium |
| 4 | Complete the file extraction; loading/failure states | +1–2 | Medium |
| 5 | Mobile and print verification | +1 | Low |

Items 1 and 2 are the priority: they remove the two-calculation-layer inconsistency,
which is currently the application's most serious remaining flaw.

---

## Risks in the current local build

1. **Cost-to-Income moved 49.4% to 46.0%** and Cost of Risk 0.43% to 0.46% across
   the whole application. Anyone holding a previously circulated figure will see a
   change; the old figures used a non-standard basis, the new ones do not.
2. **The whole application now depends on `app/js/core/`.** If those six files fail
   to deploy the page shows a failure message instead of figures. That is deliberate
   — the alternative was an untested fallback — but it makes verifying that
   `js/core/*.js` returns 200 a hard deployment requirement.
3. **Signal thresholds are analyst judgement**, not statistically estimated.
4. **Regime thresholds** (8% credit growth, 85% LTD) are conventions, not calibrated
   to Kosovo, and should be reviewed against BQK financial-stability commentary.
5. **Four `.xlsm` series are pinned as literals** in `build_blob.py` because BQK now
   returns 403 for that extension. They will go stale unless refreshed each cycle.
