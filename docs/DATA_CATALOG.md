# Data Catalog

**Dataset:** `app/_data_blob.js` — 23 datasets, 25,911 observations
**Source:** BQK monthly time series (`bqk-kos.org/repository/docs/time_series/`)
**Built by:** `build_blob.py` from workbooks in `downloads_202607/`
**Latest period:** Jul 2026 (FX leads at Aug 2026)

Units are **EUR millions** for balance and flow series, **percent** for rates, and
**counts** for payment-system series, except where the Unit column says otherwise.

| Dataset | Rows | Periods | Coverage | Dims | Unit | Stock/Flow | Source table |
|---|---:|---:|---|---|---|---|---|
| `loans_customer` | 1,320 | 308 | 2000-12 → 2026-07 | segment | EUR m | Stock | T10 ODC loans by maturity |
| `loans_maturity` | 2,533 | 308 | 2000-12 → 2026-07 | segment, maturity | EUR m | Stock (original maturity) | T10 |
| `loans_sector` | 3,475 | 308 | 2000-12 → 2026-07 | sector | EUR m | Stock (corporate only) | T12 economic sectors |
| `new_loans` | 2,656 | 266 | 2004-06 → 2026-07 | type | EUR m | **Flow** — except `Overdrafts & Credit Cards`, a **stock** | T11 new loans |
| `dep_segments` | 1,815 | 308 | 2000-12 → 2026-07 | segment | EUR m | Stock (**EUR only**) | T08 deposits in euro |
| `new_deposits` | 1,791 | 199 | 2010-01 → 2026-07 | type | EUR m | **Mixed** — Transferable/Savings stock, Time Deposits flow | T11a new deposits |
| `dep_maturity` | 3,696 | 302 | 2001-06 → 2026-07 | segment, maturity | EUR m | Stock (time deposits) | T08 `DBM1` |
| `payments` | 1,517 | 167 | 2007-03 → 2026-07 | indicator | **count in thousands** + EUR m | Flow | T15 payment system |
| `fx` | 2,164 | 276 | 2002-03 → **2026-08** | currency | rate | Rate | T41 exchange rates |
| `neer` | 932 | 233 | 2006-12 → 2026-06 | index | index | Index | T42 NEER/REER |
| `remit_channel` | 554 | 139 | 2014-12 → 2026-06 | channel | EUR m | Flow | T31 remittances by channel |
| `remit_country` | 510 | 30 | 2024-01 → 2026-06 | country | **% share** | Share | T32 remittances by country |
| `int_rates_loans` | 1,324 | 266 | 2004-06 → 2026-07 | type | % | Rate (new business) | T13 |
| `int_rates_deposits` | 597 | 199 | 2010-01 → 2026-07 | type | % | Rate (new business) | T13a |
| `accounts` | 19 | 19 | 2025-01 → 2026-07 | wide (18) | count | Stock | Raport Mujor |
| `cards` | 19 | 19 | 2025-01 → 2026-07 | wide (13) | count | Stock | Raport Mujor |
| `terminals` | 19 | 19 | 2025-01 → 2026-07 | wide (15) | count | Stock | Raport Mujor |
| `terminal_tx` | 19 | 19 | 2025-01 → 2026-07 | wide (16) | count + EUR | Flow | Raport Mujor |
| `payments_count` | 15 | 15 | 2025-01 → **2026-03** | wide (16) | count | Flow | Raport Mujor |
| `payments_value` | 12 | 12 | 2025-01 → **2025-12** | wide (16) | EUR | Flow | Raport Mujor |
| `odc_income` | 308 | 308 | 2000-12 → 2026-07 | wide (26) | EUR m | **Flow, cumulative YTD** | T14 income statement |
| `dc_survey` | 308 | 308 | 2000-12 → 2026-07 | wide (17) | EUR m | Stock | T02 DC survey |
| `loan_maturity_residual` | 308 | 308 | 2000-12 → 2026-07 | wide (16) | EUR m | Stock (residual maturity) | Derived from T10 |

## Dimension vocabularies

**`loans_customer.segment`** — Total, Government, Financial Corporations,
Non-Financial Corporations, Households, Non-Residents

**`dep_segments.segment`** — Total, Government, Financial Corporations,
Non-Financial Corporations, Households & NPISH, Non-Residents

**`loans_maturity.maturity` / `loan_maturity_residual` buckets** — Up to 1 year,
1–2 years, 2–5 years, 5–10 years, Over 10 years

**`dep_maturity.maturity`** — Up to 1 month, 1–3 months, 3–6 months, 6–12 months,
1–2 years, Over 2 years · **segments** — Households, Non-Financial Corporations

**`payments.indicator`** — Interbank, ATM Domestic, ATM Abroad Total, POS Domestic,
POS Abroad Total, E-Banking, ATM Foreign Cards in Kosovo, ATM Resident Cards Abroad,
POS Foreign Cards in Kosovo, POS Resident Cards Abroad, ATM Deposits

**`int_rates_loans.type`** — All Loans Rate, Consumer Loan Rate, Mortgage Rate,
HH Consumer Rate, HH Mortgage Rate, Corp Loan Rate

**`int_rates_deposits.type`** — Time Deposit Rate, HH Time Deposit Rate,
Corp Time Deposit Rate

## Period representation

Two spellings coexist: `'2026 July'` (English month) and `'2026-07'`. Both parse to
the same integer index via `KBI.Periods.toIndex`. Bare years (`'2004'`) and quarter
labels (`'2009 T4'`) deliberately do **not** parse as months, so they cannot enter a
monthly comparison.

## Derived series

`loan_maturity_residual` is not a published sheet. It is aggregated from Table 10
by summing all thirteen sector heads' five maturity buckets; corporate is public
**plus** private non-financial corporations. The construction reproduces
4,928 / 4,928 previously published cells.

## Known hazards

1. `odc_income` is **cumulative YTD** — December is the full year.
2. `payments.count` is **in thousands**.
3. `remit_country` is a **percentage share**, unlike `remit_channel` (EUR m).
4. `new_loans` and `new_deposits` **mix stock and flow** within one dataset.
5. `dep_segments` is **EUR deposits only** — the LTD numerator covers all currencies.
6. Discontinued series: `fx`·HRK (euro adoption), `loans_customer`·Government (nil).

## Refresh

```bash
python fetch_bqk_202607.py     # download workbooks from BQK
# convert .xls -> .xlsx via Excel COM (xlrd cannot read these BIFF files)
python build_blob.py           # rebuild with self-validating column discovery
node app/tests/run.js          # must pass before the blob ships
```

BQK now returns **403 for `.xlsm`**, so new loans, new deposits and both
interest-rate tables come from the copies already ingested into Supabase; their
values are pinned as literals in `build_blob.py` and need refreshing each cycle.
