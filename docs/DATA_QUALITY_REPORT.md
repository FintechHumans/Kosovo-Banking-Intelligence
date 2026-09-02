# Data Quality Report

**Generated:** 2026-09-02 · **Dataset:** `app/_data_blob.js` · **Latest period:** Jul 2026 (FX Aug 2026)
**Validation status:** PASSED (0 errors, 0 warnings, 2 informational)
**Method:** `app/js/core/validators.js`, executed by `app/tests/data-integrity.test.js`

Nothing in this report is silently corrected. Every finding is either fixed with a
documented reason, or surfaced in the application's Data Governance panel and left
in the data as published.

---

## 1. Defect fixed this cycle

### D1 — Deposit-maturity coverage collapse (critical, **FIXED**)

**Symptom.** At Jul 2026 only 7 of 12 `dep_maturity` series carried observations;
five non-financial corporate buckets stopped at 2026-01 or 2025-12.

**Impact.** The time-deposit stock feeding the deposit-cost calculation summed to
**1,542.7 EUR m** instead of **1,989.1 EUR m** — a **29% understatement** of the
time-deposit weight, biasing the estimated deposit cost downward and overstating
the pricing gap. The Deposits and Maturity tabs also understated their totals.
No warning was shown.

**Root cause.** Not a source problem. Automated column discovery scored these five
series against the previously published values, but the published series dated
December correctly while dating every other month a year early. A single uniform
year-offset comparison therefore mispairs December and depresses the match score
below the acceptance threshold, so the series were carried forward instead of rebuilt.

**Resolution.** Non-financial corporate time deposits are the **sum of public
(column 78) and private (column 88)** non-financial corporations in sheet `DBM1`;
households are column 99.

| Candidate mapping | Cells reproduced |
|---|---|
| Column 78 only | 0.9% |
| Column 88 only | 27.4% |
| **Columns 78 + 88** | **100.0%** (1,521 / 1,521) |
| Households, column 99 | **100.0%** (1,523 / 1,523) |

All 12 series now reach Jul 2026. A regression test asserts this
(`data-integrity.test.js` → "all 12 time-deposit series are present at the latest period").

---

## 2. Source anomalies — reported, not corrected

These are internal inconsistencies in BQK's own published history. They are left
exactly as published. Each is pinned by a test so that a **new** breach — one
introduced by a bad data build — fails the suite.

### Q1 — Income statement does not reconcile in three months

`total_income ≠ interest_income + non_interest_income + revaluation_income`

| Period | Discrepancy | Published total | Materiality |
|---|---:|---:|---|
| 2016-07 | −0.97 | 135.79 | 0.7% — immaterial |
| **2019-01** | **+9.20** | **21.13** | **43.5% — material** |
| 2019-08 | −0.90 | 177.78 | 0.5% — immaterial |

**2019-01 is material.** Any ratio computed on that month is unreliable. It is
seven years old and does not affect current reporting, but analysis spanning it
should exclude it.

### Q2 — Profit identity breaks in one month

`total_income − total_expenses ≠ net_profit` at **2018-03**, by −1.07 EUR m.
Immaterial relative to the series, but real.

### Q3 — Expense component split inconsistent before Nov 2020

`gen_admin_expense = personnel + general + other_non_interest` holds exactly from
**Nov 2020 onward** (0 breaches in 69 months) but fails in 85 earlier periods.

**Handled by design:** Cost-to-Income uses the `gen_admin_expense` parent line
directly and never the components, so the historical inconsistency cannot affect it.

### Q4 — Residual maturity buckets exceed the total in one month

At **2020-09** the five buckets sum to 3,179.8 against a reported total of 3,146.4
— a 1.06% overshoot. Every other month reconciles within 1%.

---

## 3. Structural characteristics — by design, not defects

### S1 — Discontinued series

| Series | Ends | Reason |
|---|---|---|
| `fx` · HRK | Dec 2022 | Croatia adopted the euro on 1 Jan 2023; HRK ceased to be a foreign currency. |
| `loans_customer` · Government | May 2024 | BQK reports government lending as nil in almost every month — 4 non-zero observations in 26 years. |

Both are declared in the validator so they do not raise false errors. **Anything
not on this list that stops early is treated as a genuine defect.**

### S2 — Publication lag

| Dataset | Latest | Lag behind newest |
|---|---|---|
| `fx` | Aug 2026 | — (leads) |
| most datasets | Jul 2026 | 0–1 months |
| `neer`, `remit_channel`, `remit_country` | Jun 2026 | 1–2 months |
| `payments_count` | Mar 2026 | **5 months** |
| `payments_value` | Dec 2025 | **8 months** |

Surfaced as informational findings in the Data Governance panel. The common-period
rule prevents these lags from silently contaminating combined KPIs.

### S3 — Irregular period coverage

`payments` has 27 gaps in its period sequence; `fx` has 3 and `neer` 2. Gaps are
detected and reported, never interpolated. Charts plot them as breaks.

### S4 — Mixed frequency

Pre-2010 segments of several ODC tables are quarterly or annual. `remit_country`
covers only 30 periods from 2024-01. Frequency is detected per series
(`detectFrequency`) so a "monthly change" is never computed across a quarterly
boundary without that being visible.

### S5 — Unit heterogeneity

| Dataset | Unit | Hazard |
|---|---|---|
| balance/flow series | EUR millions | — |
| `payments.count` | **thousands** of transactions | Displaying raw reads 1000× too small |
| `payments_count`, `payments_value` | raw counts / EUR | Different base from `payments` |
| `remit_country` | **percentage shares**, not EUR | Sits beside `remit_channel`, which is EUR m |

The payment-count scaling is now explicit (`scale: 1000`) and unit-tested.

### S6 — Cumulative year-to-date income statement

`odc_income` is cumulative YTD; the December row is the full year. Any ratio built
from it is a YTD ratio. Cost of Risk annualises by 12/m and does not annualise
December again.

---

## 4. Checks executed

| Check | Scope | Result |
|---|---|---|
| Composite-key uniqueness | 23 datasets | 0 duplicates |
| Period parseability | all rows | 0 unparseable |
| Latest-period completeness | all multi-series datasets | 0 unexplained lagging series |
| Component-to-total reconciliation | loan segments | within 2% |
| Income statement identities | 308 periods × 4 identities | 5 known source breaches |
| Residual bucket reconciliation | 308 periods | 1 known source breach |
| Rate plausibility (0–40%) | rate series | 0 breaches |
| Stock non-negativity | loans, deposits, deposit maturity | 0 breaches |
| Future-dated periods | all datasets | 0 |
| Outlier detection (robust MAD) | per series | reported, never removed |

---

## 5. Reconciliation against an independent source

The BQK sector aggregate was cross-checked against bank-by-bank reporting held in
the project's Supabase instance — two entirely separate data paths:

| Measure | BQK aggregate (this dataset) | Sum of 10 banks (Supabase) | Difference |
|---|---:|---:|---:|
| Gross loans, Jul 2026 | €7.22 B | €7.2247 B | < 0.1% |

---

## 6. Open items

1. **2019-01 income statement anomaly** — unresolved at source. Recommend excluding
   that month from any multi-year profitability series.
2. **`payments_value` is 8 months stale.** Either BQK has not published, or the
   parser is not reaching the newer rows. Worth re-checking at the next refresh.
3. **`remit_country` unit** is a percentage share while its sibling is EUR millions.
   The schema does not record this; it should carry an explicit unit field.
4. **No bank-level dimension** exists in this dataset. Market share, ranking and
   competitor analysis cannot be produced from it.
