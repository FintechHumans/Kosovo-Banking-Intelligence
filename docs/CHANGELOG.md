# Changelog

## [2.0.0-local] — 2026-09-02 — NOT PUBLISHED

Branch `decision-intelligence-v2`. Local only: not pushed, not deployed, not merged.

### Fixed — analytical correctness

- **Period desynchronisation.** LTD, pricing gaps and card-utilisation ratios read
  each input's own latest period independently, with no assertion that they matched
  and no warning if they did not. A common-period engine now computes
  `P* = max(P_A ∩ P_B ∩ … ∩ P_n)`, names the limiting series, and shows the lag.
- **"YoY" was not year-over-year.** `prior12()` accepted any observation within
  **±2 months** of 12 months back. A 10-month or 14-month interval could be labelled
  YoY, injecting up to ~1.3pp of spurious change into a headline. Comparisons are now
  exact, returning `N/A` with a reason when the comparable period is genuinely absent.
- **Zero treated as missing.** `pctChange` began `if (!b || !a …) return null`, so a
  genuine fall to zero returned `null` instead of −100%. Chart series used
  `pm[p] || null`, rendering a legitimate zero as a gap. Arithmetic is now null-safe
  and zero-preserving throughout.
- **Deduplication kept the largest value.** `dedupRemit` resolved duplicates with
  `r.value > map[key].value`, systematically biasing revised series upward. Replaced
  with a deterministic priority: final over provisional → later publication → declared
  source priority → later row. Unresolvable conflicts are kept in the raw layer,
  excluded from calculations, and reported.
- **Payment counts displayed 1000× too small.** BQK publishes them in thousands;
  5,152 was rendered as "5.2K" rather than 5.15 million. Unit scaling is now explicit
  and unit-tested.

### Fixed — data integrity

- **Deposit-maturity coverage collapse (critical).** Only 7 of 12 series reached
  Jul 2026; five non-financial corporate buckets stopped at 2026-01/2025-12. The
  time-deposit stock summed to 1,542.7 EUR m instead of 1,989.1 EUR m — a **29%
  understatement** that biased the deposit-cost proxy downward and overstated the
  pricing gap, with no warning. Corporate time deposits are the sum of public
  (col 78) and private (col 88) non-financial corporations; the mapping reproduces
  1,521/1,521 published cells. A regression test guards it.
- `build_blob.py` validators now score both period alignments and take the better,
  so they no longer fail when the reference baseline is already corrected.
- Fixed a latent `NameError` in `rebuild_wide` (`min_ratio` was referenced but not
  a parameter).

### Changed — banking methodology

| Was | Now | Why |
|---|---|---|
| "NIM Proxy" | **Net Interest Income Share** | NII ÷ total income is an income-composition ratio, not a margin. A true NIM needs average interest-earning assets, which BQK does not publish, so NIM is not offered. |
| "WACF" | **Estimated Deposit Cost Proxy** | Covers customer deposits only and applies a new-business rate to an outstanding stock. The old name asserted precision the calculation lacks. |
| "Contractual Maturity Gap" | **Structural Original-Maturity Comparison** | Excludes transferable and savings deposits, securities, wholesale funding, off-balance-sheet commitments and amortisation — it is not a liquidity gap. |
| CTI = `gen_admin ÷ (income − int exp − non-int exp)` | `(gen_admin + depreciation) ÷ (income − int exp − fee exp)` | Excludes impairment and tax per standard practice; nets fee expense against income. 49.4% → **46.0%** at Dec 2025. |
| CoR = Dec provisions ÷ Dec loans | Annualised impairment ÷ **average** gross loans, `× 12/m` | The old form understated CoR by 12/m in any non-December month and used ending rather than average loans. |

- Savings-rate **sensitivity ladder** added (0.00 / 0.05 / 0.25 / 0.50%) because the
  savings rate is assumed, not published.

### Added — decision support

- **Decision Centre** — new default landing module. 12 KPI cards, each showing value,
  direction, reference period, comparable period, calculation status
  (Direct / Verified / Proxy / Estimated / Unavailable), confidence, and a
  "Method & sources" drawer with formula, inputs, assumptions and limitations.
- **Semantic colour** — direction is not the same as good. Rising cost of risk,
  cost-to-income and funding cost read negative; LTD is a threshold metric.
- **Signals Requiring Attention** — ranked by
  `materiality × persistence × confidence`, each separating Observation,
  Interpretation and Management question. Causes are never asserted as fact.
- **Market Regime** — six transparent rule-based regimes plus a neutral fallback.
  Every condition is displayed with its outcome; an untestable condition blocks
  activation and lowers stated confidence rather than counting as false.
- **Data Governance panel** — application/methodology version, dataset count,
  observation count, latest period, validation status and findings.

### Added — engineering

- Modular core under `app/js/core/`: `periods`, `safe-math`, `calculations`,
  `validators`, `signals`, `regimes`. Each is dual-target (browser global + Node
  `require`) so the tests exercise exactly the shipped code.
- **138 automated tests** across 4 spec files, including 58 that run against the real
  shipped `_data_blob.js`.
- Accessibility layer: `role="tablist"`/`tab`/`tabpanel`, keyboard arrow navigation,
  Enter/Space activation, skip link, `aria-label` on all 75 canvases,
  `prefers-reduced-motion` support, visible focus rings.
- New UI code builds DOM nodes via `createElement`/`textContent` rather than
  `innerHTML`.

### Unchanged

The 15 existing modules, their charts and the Fintech Humans visual identity are
untouched. `app/index.html` gains only CSS, three module containers, three nav
entries and script tags.

### Not implemented

Forecasting (Phase 8), Scenario Lab (Phase 9), competitive-intelligence scaffolding
(Phase 10), historical-context panels (Phase 7) and the full monolith refactor
(Phase 12) are **not** built. See `docs/AUDIT_REPORT.md` for the honest position.
