# Baseline Audit — Kosovo Banking Intelligence

**Audit date:** 2026-09-02
**Commit audited:** `5be1571` (branch `main`)
**Working branch:** `decision-intelligence-v2`
**Auditor scope:** architecture, datasets, KPI methodology, data integrity, technical quality

This document records the state of the application **before** any Phase 2+ changes.
It is the reference point for the final score in `docs/AUDIT_REPORT.md`.

---

## 1. Files and architecture

The deployed surface is 8 tracked files served by GitHub Pages from `main`
behind the custom domain in `CNAME` (`banking.fintechhumans.com`).

| File | Size | Role |
|---|---:|---|
| `app/index.html` | 153,912 B | **The entire application.** Markup, CSS and ~1,400 lines of inline JS in one file. |
| `app/_data_blob.js` | 2,283,851 B | Single global `const D = {...}` holding all 23 datasets. |
| `index.html` | 23,833 B | Marketing landing page. |
| `favicon.svg`, `robots.txt`, `CNAME`, `.nojekyll` | — | Hosting support files. |

**Architecture characteristics**

- No build step, no framework, no package manager. Chart.js 4.4.0 is loaded from
  `cdn.jsdelivr.net`; everything else is hand-written ES5.
- Rendering is a single `buildAll()` function (~1,180 lines) that recomputes every
  module on every filter change. All 15 modules are made visible, drawn, then hidden
  again so Chart.js can measure canvases.
- 75 Chart.js instances are held in a global `CHS` map and destroyed/recreated wholesale.
- The logo is an inline base64 PNG (~8 KB) in the markup.
- State lives in DOM `<select>` values read by `getFilterState()`; there is no state module.

**Architectural weaknesses**

1. **Monolith.** One file mixes data access, calculation, formatting, charting and markup.
   There is no seam at which a calculation can be unit-tested.
2. **No test surface.** No test directory, no assertions, no CI. Every formula is verified
   only by eye.
3. **Full recompute on every interaction.** `buildAll()` rebuilds all 75 charts even when a
   single filter changes.
4. **Blocking 2.2 MB data load.** The blob is a synchronous `<script>`; there is no loading
   state and no failure state if it 404s.
5. **`innerHTML` used with data-derived strings** in `addK()` and several table builders.
   Current inputs are numeric and BQK-sourced, so this is not presently exploitable, but it
   is an unsafe pattern for a data-driven surface.
6. **Single point of CDN failure.** If jsDelivr is unreachable, `Chart` is undefined and
   `buildAll()` throws on the first chart, leaving a blank page with no message.

---

## 2. Dataset inventory

All 23 datasets are **sector aggregates for the Kosovo banking system**. There is no
bank-level dimension anywhere in the application (grep for `NLB|ProCredit|Raiffeisen|TEB|
BKT|Banka Ekonomike|Ziraat` across `app/` returns zero matches).

Units are **EUR millions** for all balance/flow series, **percent** for rate series, and
**raw counts** for the payment-system datasets, unless noted.

| Dataset | Rows | Periods | First | Last | Gaps | Dimensions | Unit | Stock / Flow |
|---|---:|---:|---|---|---:|---|---|---|
| `loans_customer` | 1,320 | 308 | 2000-12 | 2026-07 | 0 | segment | EUR m | **Stock** |
| `loans_maturity` | 2,533 | 308 | 2000-12 | 2026-07 | 0 | segment+maturity | EUR m | **Stock** (original maturity) |
| `loans_sector` | 3,475 | 308 | 2000-12 | 2026-07 | 0 | sector | EUR m | **Stock** (corporate only) |
| `new_loans` | 2,656 | 266 | 2004-06 | 2026-07 | 0 | type | EUR m | **Flow** — except `Overdrafts & Credit Cards`, which is a **stock** |
| `dep_segments` | 1,815 | 308 | 2000-12 | 2026-07 | 0 | segment | EUR m | **Stock** (EUR deposits only) |
| `new_deposits` | 1,791 | 199 | 2010-01 | 2026-07 | 0 | type | EUR m | **Mixed** — Transferable/Savings are stock, Time Deposits are flow |
| `payments` | 1,517 | 167 | 2007-03 | 2026-07 | **27** | indicator | count + EUR | Flow |
| `fx` | 2,164 | 276 | 2002-03 | 2026-08 | 3 | currency | rate | Rate |
| `neer` | 932 | 233 | 2006-12 | 2026-06 | 2 | index | index | Index |
| `remit_channel` | 554 | 139 | 2014-12 | 2026-06 | 0 | channel | EUR m | Flow |
| `remit_country` | 510 | 30 | 2024-01 | 2026-06 | 0 | country | **% share** | Share |
| `int_rates_loans` | 1,324 | 266 | 2004-06 | 2026-07 | 0 | type | % | Rate (new business) |
| `int_rates_deposits` | 597 | 199 | 2010-01 | 2026-07 | 0 | type | % | Rate (new business) |
| `dep_maturity` | 3,097 | 302 | 2001-06 | 2026-07 | 0 | segment+maturity | EUR m | **Stock** (time deposits, original maturity) |
| `accounts` | 19 | 19 | 2025-01 | 2026-07 | 0 | wide (18) | count | Stock |
| `cards` | 19 | 19 | 2025-01 | 2026-07 | 0 | wide (13) | count | Stock |
| `terminals` | 19 | 19 | 2025-01 | 2026-07 | 0 | wide (15) | count | Stock |
| `terminal_tx` | 19 | 19 | 2025-01 | 2026-07 | 0 | wide (16) | count + EUR | Flow |
| `payments_count` | 15 | 15 | 2025-01 | 2026-03 | 0 | wide (16) | count | Flow |
| `payments_value` | 12 | 12 | 2025-01 | 2025-12 | 0 | wide (16) | EUR | Flow |
| `odc_income` | 308 | 308 | 2000-12 | 2026-07 | 0 | wide (26) | EUR m | **Flow, cumulative YTD** |
| `dc_survey` | 308 | 308 | 2000-12 | 2026-07 | 0 | wide (17) | EUR m | **Stock** |
| `loan_maturity_residual` | 308 | 308 | 2000-12 | 2026-07 | 0 | wide (16) | EUR m | **Stock** (residual maturity) |

**Frequency.** All series are monthly except `remit_country` (quarterly source,
re-expressed monthly) and the pre-2010 portions of several ODC tables, which are
quarterly or annual. The application does not model frequency explicitly.

**Critical unit hazard.** `odc_income` is **cumulative year-to-date**, not monthly.
Its December row is the full-year figure. Any ratio built from it is a YTD ratio and is
not comparable across months without annualisation. The application uses December rows
only, which sidesteps but does not solve this.

---

## 3. KPI inventory

96 KPI cards across 15 modules. Definitions as currently implemented:

| KPI | Current formula | Module | Assessment |
|---|---|---|---|
| Total Outstanding Loans | `loans_customer[Total]` latest | Overview | Direct |
| Total EUR Deposits | `dep_segments[Total]` latest | Overview | Direct, EUR-only scope |
| LTD Ratio (Market Proxy) | `loans / EUR deposits × 100` | Overview | **Period desync risk** |
| Lending / Deposit Rate | `int_rates_*` latest | Overview, Rates | Direct (new business) |
| WACF | `(0%·CA + 0.05%·SA + r_TDA·TDA) / (CA+SA+TDA)` | Rates | **Misnamed + broken input** |
| Narrow Gap | `lending rate − TDA rate` | Rates | Proxy, disclosed |
| WACF Gap | `lending rate − WACF` | Rates | Inherits WACF defects |
| NIM Proxy | `(interest income − interest expense) / total income` | Profitability | **Misnamed — not a NIM** |
| Cost-to-Income | `gen_admin_expense / operating income` | Profitability | **Incomplete numerator** |
| Fee Dependency | `fee income / total income` | Profitability | Direct |
| Net Profit Margin | `net profit / total income` | Profitability | Direct |
| Cost of Risk | `Dec cumulative provisions / Dec loans` | Credit Risk | **Not annualised, ending loans** |
| Provisioning Intensity | `provisions / NII` | Credit Risk | Proxy |
| Loan-to-Asset Ratio | `loans / total assets` | Assets | Direct |
| Contractual Maturity Gap | `loans by bucket − TDA by bucket` | Maturity | **Mislabelled as liquidity** |
| Avg Maturity Proxy | `Σ(bucket × midpoint) / total`, midpoints 0.5/1.5/3.5/7.5/15 | Residual Mat. | Proxy, disclosed |
| Payment/card/terminal shares | component ÷ total | Payments, Cards, Acceptance | Direct |

---

## 4. Methodological weaknesses

Ordered by materiality.

### M1 — Period desynchronisation (critical)
`LTD` divides `latest(loans_customer)` by `latest(dep_segments)`. Each `latest()` call is
independent; nothing asserts the two resolve to the same period, and no warning is shown
if they differ. The same pattern governs the pricing gaps (lending rate vs deposit rate),
the maturity gap (loans vs deposits), and card-utilisation ratios (`cards` vs `terminal_tx`).
Today the inputs happen to align at 2026-07; that is luck, not control. When BQK publishes
one table before another — which happens routinely — the ratio silently mixes periods.

### M2 — "YoY" is not year-over-year (critical)
`prior12()` searches for the observation closest to 12 months back and accepts anything
within **±2 months** (`bd <= 2`). A change labelled "YoY" on a KPI card may compare a
10-month or 14-month interval. For a series growing ~8% a year this injects up to ~1.3pp
of spurious change into a headline number.

### M3 — Zero is treated as missing (critical)
`pctChange(a, b)` begins `if (!b || !a || b === 0) return null`. Because `!a` is true when
`a === 0`, **a genuine fall to zero returns `null` instead of −100%**. The same `||`-based
fallback appears throughout chart series construction (`pm[p] || null`), where a legitimate
zero observation is rendered as a gap in the line rather than a zero.

### M4 — "NIM Proxy" is not a margin
`NII / total income` is an **income-composition ratio**, not a net interest margin. A true
NIM requires average interest-earning assets in the denominator. The current label invites
direct comparison with published bank NIMs, which would be wrong by an order of magnitude
in interpretation.

### M5 — WACF is neither weighted-average nor cost-of-funds
Three defects: (a) it covers only customer deposits, excluding borrowings, subordinated debt
and capital; (b) it applies a **new-business** TDA rate to an **outstanding stock** balance;
(c) the savings rate is a hard-coded 0.05% with no sensitivity analysis. The name asserts a
precision the calculation does not have.

### M6 — Cost-to-Income numerator is incomplete
Uses `gen_admin_expense` alone. BQK Table 14 also reports `depreciation` (col 21) and
`fee_commission_expense` (col 19) as operating costs. Whether `gen_admin_expense` already
subsumes `personnel_expense` (col 23) and `general_expense` (col 24) as sub-items is not
documented in the application and must be verified before changing the formula.

### M7 — Cost of Risk is not annualised
Computed as December cumulative provisions ÷ December loans. For any non-December month
this understates CoR by a factor of `12/m`. It also uses **ending** rather than **average**
gross loans, and does not distinguish impairment charge from provision balance, write-offs
or recoveries.

### M8 — "Contractual Maturity Gap" implies liquidity risk
Compares loan original-maturity buckets against time-deposit original-maturity buckets.
It excludes transferable and savings deposits (the largest, stickiest funding block),
securities, wholesale funding, off-balance-sheet commitments and loan amortisation. It is a
structural comparison of two original-maturity ladders, not a liquidity gap.

### M9 — Deduplication keeps the largest value
`dedupRemit()` resolves duplicate `(period, channel)` keys with
`if (!map[key] || r.value > map[key].value)` — it keeps the **maximum**. This has no
methodological basis and systematically biases remittances upward whenever a provisional and
a revised figure coexist.

---

## 5. Data-quality findings

### D1 — Deposit-maturity coverage collapses at the latest period (critical)
At 2026-07 only **7 of 12** `dep_maturity` series carry observations. Five non-financial
corporate buckets stop at 2026-01 or 2025-12:

| Series | Last period |
|---|---|
| Non-Financial Corporations · Up to 1 month | 2025-12 |
| Non-Financial Corporations · 1-3 months | 2026-01 |
| Non-Financial Corporations · 6-12 months | 2026-01 |
| Non-Financial Corporations · 1-2 years | 2026-01 |
| Non-Financial Corporations · Over 2 years | 2026-01 |

**Consequence:** the WACF time-deposit weight sums to 1,542.7 EUR m at 2026-07 when the
true HH+NFC time-deposit stock is materially larger. This **understates the TDA weight and
therefore biases WACF downward**, and it understates the "Term Deposits (Maturity)" total on
the Deposits and Maturity tabs. The application shows no warning.

**Root cause identified during this audit.** These five series were carried forward from the
previous dataset because automated column discovery failed to match them. The failure was in
the matching, not the source: the published series labelled December rows correctly while
dating every other month a year early, so a uniform year-offset comparison mispairs December
and depresses the match score. Re-testing with period-aware pairing resolves the mapping
exactly — non-financial corporate deposit maturity is **the sum of public (col 78) and
private (col 88) non-financial corporations** in sheet `DBM1`:

| Candidate | Match |
|---|---|
| col 78 only | 0.9% |
| col 88 only | 27.4% |
| **cols 78 + 88** | **100.0%** (1521/1521) |
| Households col 99 | **100.0%** (1523/1523) |

This is fixed in Phase 2.

### D2 — Irregular period coverage
`payments` has **27 gaps** in its period sequence; `fx` has 3 and `neer` 2. The application
plots these as continuous lines without indicating discontinuity.

### D3 — Mixed frequency treated as monthly
`remit_country` covers only 30 periods from 2024-01 and is quarterly at source. Pre-2010
segments of several ODC tables are quarterly or annual. Nothing in the code distinguishes
frequency, so a "monthly" change computed across a quarterly boundary is a quarterly change.

### D4 — `remit_country` unit differs from its siblings
Values are **percentage shares**, not EUR. It sits alongside `remit_channel`, which is EUR
millions. Nothing in the schema records this.

### D5 — Publication lag not surfaced
`payments_value` ends 2025-12 and `payments_count` 2026-03, while most series reach 2026-07.
The Payments module presents these together without stating that the value series is seven
months behind the count series.

### D6 — No integrity checks at load
There is no validation of composite-key uniqueness, no range checks, no component-vs-total
reconciliation, and no chronological consistency check. Bad data would render silently.

---

## 6. Technical findings

| ID | Finding | Severity |
|---|---|---|
| T1 | No automated tests of any kind | High |
| T2 | 2.2 MB blocking data load, no loading or failure state | High |
| T3 | `innerHTML` with data-derived strings in `addK()` and table builders | Medium |
| T4 | Chart.js from CDN — single point of failure, no local fallback | Medium |
| T5 | Full recompute of 75 charts on every filter change | Medium |
| T6 | No ARIA labels; nav is `<div>`-based and not keyboard-reachable | Medium |
| T7 | No `prefers-reduced-motion` handling | Low |
| T8 | Inline base64 logo inflates the HTML payload | Low |
| T9 | No application/methodology/dataset version displayed anywhere | Medium |
| T10 | Filter defaults (`getFilterState`) silently clamp to 2020 with no indication | Low |

**Console errors at baseline:** none. The application loads cleanly with 75 charts and
23 datasets. Verified 2026-09-02 via the local preview server.

---

## 7. Baseline score

Scored against the Phase 14 rubric.

| Dimension | Weight | Score | Weighted | Rationale |
|---|---:|---:|---:|---|
| Analytical correctness | 20% | 48 | 9.6 | M1, M2, M3 are all live defects in headline KPIs |
| Data integrity | 15% | 55 | 8.3 | D1 silently corrupts WACF; no validation layer |
| Banking methodology | 15% | 55 | 8.3 | M4–M8: misnamed NIM/WACF, un-annualised CoR |
| Decision-making value | 15% | 45 | 6.8 | Descriptive only; no signals, regimes or ranking |
| Data governance | 10% | 35 | 3.5 | No docs, no versioning, no lineage surfaced |
| Technical quality | 10% | 50 | 5.0 | Monolith, no tests, no failure states |
| UX and accessibility | 8% | 60 | 4.8 | Clean visual identity; weak keyboard/ARIA support |
| Reliability / performance | 4% | 55 | 2.2 | Full recompute; CDN dependency; large blob |
| Documentation | 3% | 30 | 0.9 | In-app methodology tab only; no repo docs |

**Baseline total: 49.4 / 100**

The visual identity and breadth of coverage are genuine strengths — the deficit is
concentrated in analytical correctness, methodology naming and the absence of any
verification layer.

---

## 8. What must change to reach 85+

1. A common-period engine that refuses to combine series across different periods without
   an explicit, visible warning. *(M1)*
2. Exact `previousMonth()` / `sameMonthPreviousYear()` with `N/A` when the comparable period
   is genuinely absent. *(M2)*
3. Null-safe arithmetic in which zero is a value, not a gap. *(M3)*
4. Honest KPI names: Net Interest Income Share, Estimated Deposit Cost Proxy, Structural
   Original-Maturity Comparison. *(M4, M5, M8)*
5. Annualised Cost of Risk on average gross loans. *(M7)*
6. Repaired `dep_maturity` NFC mapping. *(D1)*
7. Deterministic, documented deduplication. *(M9)*
8. A validation layer that runs at load and surfaces what it finds.
9. A Decision Centre and ranked signal layer that turn description into decisions.
10. Executed tests with recorded output.
