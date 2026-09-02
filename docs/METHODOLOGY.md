# Methodology

**Methodology version:** 2026.09
**Application version:** 2.0.0-local
**Source:** Central Bank of the Republic of Kosovo (BQK) monthly time series
**Scope:** Kosovo banking sector aggregate (Other Depository Corporations). No bank-level data.

Every KPI in the Decision Centre exposes its formula, inputs, input periods,
assumptions and limitations in the "Method & sources" drawer on its own card.
This document is the authoritative version of the same information.

---

## 1. Period algebra

### Common-period rule

Any KPI combining two or more series is computed only on the latest period for
which **every** input has an observation:

```
P* = max( P_A ∩ P_B ∩ … ∩ P_n )
```

The Decision Centre shows a banner stating the period used, whether it is aligned
with the newest available input, which series is limiting it, and which series are
ahead. A KPI whose inputs share no period returns **Unavailable** with a reason,
not a number.

### Exact comparisons

```
MoM = (X_t − X_{t−1}) / |X_{t−1}|
YoY = (X_t − X_{t−12}) / |X_{t−12}|
```

`t−1` and `t−12` are exact calendar positions. If the exact comparable period has
no observation the result is **N/A** with the reason shown on hover. The previous
implementation accepted any observation 10–14 months old and labelled it "YoY";
that behaviour is removed and a regression test pins it.

Absolute values are used in the denominator so the sign of the result means
direction, not an artefact of a negative base.

### Zero handling

Zero is a value, not a gap.

| Case | Result |
|---|---|
| 100 → 0 | **−100%** |
| 0 → 100 | N/A — base period is zero, growth undefined |
| null → 100 | N/A — comparable period unavailable |
| −20 → −10 | +50% |

---

## 2. KPI definitions

### Market LTD Proxy — *Proxy*

```
LTD = Total loans (all currencies) ÷ EUR deposits × 100
```

- Computed on the latest common period only.
- **Limitation:** the numerator covers all currencies while the denominator covers
  EUR deposits only, so the ratio is overstated by the size of the non-EUR deposit base.
- **Limitation:** excludes wholesale and borrowed funding from the denominator.
- Polarity is **threshold**, not directional — a rise is neither good nor bad
  without reference to a target range, so it is coloured for attention.

### Estimated Deposit Cost Proxy — *Estimated* (formerly "WACF")

```
EDCP = (CA·r_CA + SA·r_SA + TDA·r_TDA) ÷ (CA + SA + TDA)
```

Renamed because the previous label asserted a precision the calculation does not have.

**Assumptions**
- Current accounts non-remunerated at 0.00%.
- Savings at 0.05% — **BQK does not publish a savings rate**; this is an assumption.
- The published **new-business** time-deposit rate is applied to the **outstanding**
  time-deposit stock.

**Sensitivity.** Because the savings rate is assumed, the Decision Centre publishes
the result at 0.00%, 0.05%, 0.25% and 0.50% alongside the resulting pricing gap.

**Limitations**
- Covers customer deposits only — excludes borrowings, subordinated debt, wholesale
  funding and capital. It is **not** a bank weighted average cost of funds and is not
  comparable to a bank-reported WACF.
- Applying a new-business rate to a stock overstates repricing speed when rates are
  rising and understates it when they are falling.
- Warns when fewer than 12 time-deposit series are published for the period, because
  an incomplete stock understates the time-deposit weight.

### Net Interest Income Share — *Verified* (formerly "NIM Proxy")

```
NII Share = (Interest income − Interest expense) ÷ Total income × 100
```

This is an **income-composition ratio, not a net interest margin.** A true NIM
requires average interest-earning assets:

```
NIM = Annualised net interest income ÷ Average interest-earning assets
```

BQK Table 14 does not publish earning assets, so **NIM is not offered.** The
previous "NIM Proxy" label invited direct comparison with published bank NIMs,
which differ by an order of magnitude in interpretation.

### Cost-to-Income — *Verified*

```
CTI = (General & administrative + Depreciation)
      ÷ (Total income − Interest expense − Fee & commission expense) × 100
```

- Impairment charges and tax are **excluded** from operating expenses, per standard
  cost-to-income practice.
- Fee expense is netted against income rather than counted as an operating cost.
- General & administrative already contains personnel and general costs — verified
  against the source: `gen_admin = personnel + general + other_non_interest`
  holds exactly from Nov 2020 onward. The formula uses the parent line directly,
  never the components, so the earlier inconsistent split cannot affect it.
- Both numerator and denominator are cumulative year-to-date, so this is a YTD ratio.

The previous formula used `gen_admin ÷ (income − interest expense − non-interest
expense)`, giving 49.4% at Dec 2025; the corrected formula gives **46.0%**.

### Cost of Risk (annualised) — *Verified*, or *Proxy* when averaging is impossible

```
CoR = Annualised impairment ÷ Average gross loans × 100

for month m:  Annualised impairment = YTD impairment × 12/m
December:     already a full year — not annualised again
```

- Average gross loans = mean of the prior year-end and the current closing balance.
- If the opening balance is unavailable the ending balance is used, the status drops
  to **Proxy**, and the card states that this understates CoR in a growing book.
- **Limitation:** BQK reports a single impairment line. Impairment charge, provision
  balance, write-offs and recoveries cannot be separated from this source.

### Pricing Gap — *Proxy*

```
Gap = Lending rate (new business) − Estimated Deposit Cost Proxy
```

Warns if the two rate inputs resolve to different periods. **Not a net interest
margin:** excludes non-interest income, impairment and the legacy book.

### Card-to-Cash Substitution — *Verified*

```
Ratio = POS card payments ÷ ATM withdrawals   (transaction counts)
```

Computed on the latest common period. Counts only — does not reflect ticket size.

### Unit handling

BQK publishes payment-system transaction counts **in thousands**. The Decision
Centre scales these to actual transactions and records both the source value and
the scale factor. Percentage changes are scale-invariant and unaffected.

---

## 3. Maturity terminology

The previous "Contractual Maturity Gap" label implied liquidity risk. The correct
description of what the data supports is a **Structural Original-Maturity
Comparison**, and the four concepts must not be conflated:

| Concept | What it means | Available here |
|---|---|---|
| Original maturity | Term at origination | Yes (Tables 08, 10) |
| Residual maturity | Term remaining today | Yes (derived from Table 10) |
| Behavioural maturity | Expected life after modelled customer behaviour | **No** |
| Liquidity cash-flow gap | Contractual and behavioural cash flows by bucket | **No** |

A comparison of loan and time-deposit original-maturity ladders **excludes**
transferable deposits, savings deposits, behavioural assumptions, securities,
wholesale funding, off-balance-sheet commitments and loan amortisation cash flows.
It is therefore a structural comparison, not a liquidity gap.

---

## 4. Signal scoring

```
SignalScore = Materiality × Persistence × Confidence     (each bounded 0–1)
```

- **Materiality** takes the stronger of two independent sources: a *shock* (robust
  z-score of the latest monthly change against the distribution of past monthly
  changes) and *extremity* (how far the current level sits from the median of its own
  history). Shock alone misses a metric that has drifted to a multi-year extreme
  without any dramatic single month.
- **Persistence** rises with the number of consecutive months moving in the same
  direction, saturating at four.
- **Confidence** follows calculation status: Direct 1.00, Verified 0.90, Proxy 0.60,
  Estimated 0.40, Unavailable 0.00.

Priority bands: High ≥ 0.60, Medium ≥ 0.30, otherwise Low.

Every signal separates **Observation** (what the data shows), **Interpretation**
(what it might mean, hedged) and **Management question** (what to go and establish).
Narrative text is authored per metric, not generated from the number, so it cannot
overstate what the data supports. Inferred causes are never presented as fact.

---

## 5. Market regimes

Rule-based and transparent. Each regime lists its conditions, and each condition is
displayed with its outcome (met / not met / could not be evaluated). A regime is
**active only when every condition is both met and testable**; a condition that
cannot be evaluated blocks activation and lowers the stated confidence rather than
being silently treated as false. When no rule fires, the state is Stable / Neutral.

| Regime | Conditions |
|---|---|
| Credit Expansion | Loans YoY > 8% **and** loan growth > deposit growth |
| Deposit Competition | Time-deposit rate up ≥ 0.10pp YoY **and** deposit growth < loan growth |
| Margin Compression | Spread narrower than a year ago **and** spread in bottom third of history |
| Liquidity Tightening | LTD > 85% **and** LTD higher than a year ago |
| Risk Deterioration | CoR higher than a year ago **and** CoR in top third of history |
| Digital Acceleration | Card payments YoY > 10% **and** growing faster than ATM withdrawals |

Thresholds are deliberately visible and adjustable in `app/js/core/regimes.js`.
They are analyst judgement, not statistical estimates, and should be reviewed against
BQK financial-stability commentary.

---

## 6. Semantic colour

Direction is not the same as good. Colour is assigned by what a metric measures:

| Polarity | Rising | Applies to |
|---|---|---|
| `good-up` | positive | Loans, deposits, lending rate, card payments |
| `good-down` | negative | Cost of risk, cost-to-income, deposit cost |
| `threshold` | attention | LTD — requires interpretation against a target range |
| `neutral` | neutral | Composition ratios |

---

## 7. Status vocabulary

| Status | Meaning |
|---|---|
| **Direct** | Published figure used as-is |
| **Verified** | Derived and reconciled against the source |
| **Proxy** | Stands in for a metric the data cannot produce |
| **Estimated** | Depends on an assumed input |
| **Unavailable** | Cannot be computed honestly; a reason is shown instead of a number |
