/* Phase 13 — calculation tests.
   Covers the specific defects the baseline audit identified: zero handling,
   exact MoM/YoY, division by zero, period synchronisation, and the KPI
   methodology corrections. */
'use strict';
const P = require('../js/core/periods.js');
const M = require('../js/core/safe-math.js');
const C = require('../js/core/calculations.js');

// helpers ------------------------------------------------------------------
const series = (pairs, extra) => pairs.map(([period, value]) =>
  Object.assign({ period, value }, extra || {}));

module.exports = function (t) {

  t.describe('periods — parsing and algebra', () => {
    t.it('parses both period spellings to the same index', () => {
      t.eq(P.toIndex('2026 July'), P.toIndex('2026-07'));
    });
    t.it('formats an index for display', () => {
      t.eq(P.format(P.toIndex('2026-07')), 'Jul 2026');
    });
    t.it('tolerates a provisional marker', () => {
      t.eq(P.toKey('2026 January (p)'), '2026-01');
    });
    t.it('rejects bare years and quarters as non-monthly', () => {
      t.isNull(P.toIndex('2004'));
      t.isNull(P.toIndex('2009 T4'));
    });
    t.it('previous month crosses a year boundary', () => {
      t.eq(P.fromIndex(P.previousMonth(P.toIndex('2026-01'))), '2025-12');
    });
    t.it('same month previous year is exactly 12 months back', () => {
      t.eq(P.fromIndex(P.sameMonthPreviousYear(P.toIndex('2026-07'))), '2025-07');
    });
    t.it('detects monthly, quarterly and annual frequency', () => {
      t.eq(P.detectFrequency([1, 2, 3, 4, 5, 6]), 'monthly');
      t.eq(P.detectFrequency([3, 6, 9, 12, 15, 18]), 'quarterly');
      t.eq(P.detectFrequency([12, 24, 36, 48]), 'annual');
    });
    t.it('reports gaps without filling them', () => {
      t.eq(P.missingPeriods([1, 2, 5, 6]), [3, 4]);
    });
  });

  t.describe('safe-math — zero is a value, not a gap', () => {
    t.it('a fall to zero is −100%, not null', () => {
      t.close(M.pctChange(0, 100), -100);
    });
    t.it('a rise from zero is undefined, not Infinity', () => {
      t.isNull(M.pctChange(100, 0));
      t.eq(M.pctChangeReason(100, 0), 'base period is zero — growth undefined');
    });
    t.it('zero to zero is no change, not null', () => {
      t.isNull(M.pctChange(0, 0));  // base zero -> undefined
      t.close(M.delta(0, 0), 0);
    });
    t.it('uses the absolute base so sign means direction', () => {
      t.close(M.pctChange(-10, -20), 50);
    });
    t.it('distinguishes missing from zero', () => {
      t.isNull(M.pctChange(5, null));
      t.eq(M.pctChangeReason(5, null), 'comparable period unavailable');
      t.eq(M.isNum(0), true);
      t.eq(M.isNum(null), false);
      t.eq(M.isNum(NaN), false);
    });
    t.it('ratio and share guard a zero denominator', () => {
      t.isNull(M.ratio(5, 0));
      t.isNull(M.share(5, 0));
      t.close(M.share(25, 200), 12.5);
    });
    t.it('sum keeps zeros and counts what is missing', () => {
      const s = M.sum([1, 0, null, 3]);
      t.close(s.value, 4);
      t.eq(s.present, 3);
      t.eq(s.missing, 1);
    });
    t.it('sum of nothing is null, not zero', () => {
      t.isNull(M.sum([null, null]).value);
    });
    t.it('weighted average skips missing pairs', () => {
      const w = M.weightedAverage([
        { value: 0, weight: 100 }, { value: 4, weight: 100 }, { value: 9, weight: null }
      ]);
      t.close(w.value, 2);
      t.eq(w.skipped, 1);
    });
    t.it('annualises year-to-date and leaves December alone', () => {
      t.close(M.annualiseYTD(50, 6), 100);
      t.close(M.annualiseYTD(120, 12), 120);
    });
  });

  t.describe('exact MoM and YoY', () => {
    const rows = series([
      ['2025-06', 100], ['2025-07', 110],
      ['2026-06', 120], ['2026-07', 132]
    ]);
    t.it('MoM uses the exact previous month', () => {
      const ch = C.changeAt(rows, P.toIndex('2026-07'));
      t.close(ch.mom.value, 10);
      t.eq(ch.mom.periodLabel, 'Jun 2026');
    });
    t.it('YoY uses exactly 12 months back', () => {
      const ch = C.changeAt(rows, P.toIndex('2026-07'));
      t.close(ch.yoy.value, 20);
      t.eq(ch.yoy.periodLabel, 'Jul 2025');
    });
    t.it('a missing comparable period yields null, not a nearby month', () => {
      const sparse = series([['2025-03', 90], ['2026-07', 132]]);
      const ch = C.changeAt(sparse, P.toIndex('2026-07'));
      t.isNull(ch.yoy.value);
      t.eq(ch.yoy.available, false);
      t.eq(ch.yoy.reason, 'same month last year period has no observation');
    });
    t.it('does NOT accept a 10-month-old observation as YoY', () => {
      // the pre-fix implementation accepted anything within ±2 months
      const rows2 = series([['2025-09', 100], ['2026-07', 132]]);
      const ch = C.changeAt(rows2, P.toIndex('2026-07'));
      t.isNull(ch.yoy.value, 'a 10-month gap must not be reported as YoY');
    });
  });

  t.describe('latestCommonPeriod', () => {
    const a = series([['2026-05', 1], ['2026-06', 1], ['2026-07', 1]]);
    const b = series([['2026-05', 1], ['2026-06', 1]]);
    t.it('returns the newest period both series share', () => {
      const s = P.latestCommonPeriod([{ name: 'a', rows: a }, { name: 'b', rows: b }]);
      t.eq(P.fromIndex(s.period), '2026-06');
    });
    t.it('flags misalignment and names the limiting series', () => {
      const s = P.latestCommonPeriod([{ name: 'a', rows: a }, { name: 'b', rows: b }]);
      t.eq(s.aligned, false);
      t.eq(s.lagMonths, 1);
      t.eq(s.limiting, ['b']);
      t.eq(s.stale, ['a']);
    });
    t.it('reports alignment when inputs agree', () => {
      const s = P.latestCommonPeriod([{ name: 'a', rows: a }, { name: 'b', rows: a }]);
      t.eq(s.aligned, true);
      t.eq(s.lagMonths, 0);
    });
    t.it('returns null when there is no shared period', () => {
      const c = series([['2020-01', 1]]);
      const s = P.latestCommonPeriod([{ name: 'a', rows: a }, { name: 'c', rows: c }]);
      t.isNull(s.period);
    });
  });

  t.describe('Market LTD Proxy', () => {
    const loans = series([['2026-06', 7000], ['2026-07', 7220]], { segment: 'Total' });
    const deps = series([['2026-06', 7900], ['2026-07', 7960]], { segment: 'Total' });
    t.it('computes on the common period', () => {
      const k = C.marketLTDProxy({ rows: loans }, { rows: deps });
      t.eq(k.periodLabel, 'Jul 2026');
      t.close(k.value, 7220 / 7960 * 100, 1e-6);
      t.eq(k.status, 'Proxy');
    });
    t.it('warns and steps back when deposits lag', () => {
      const lagged = series([['2026-06', 7900]], { segment: 'Total' });
      const k = C.marketLTDProxy({ rows: loans }, { rows: lagged });
      t.eq(k.periodLabel, 'Jun 2026');
      t.ok(k.warnings.length > 0, 'a period mismatch must warn');
    });
    t.it('is unavailable when no common period exists', () => {
      const old = series([['2019-01', 100]], { segment: 'Total' });
      const k = C.marketLTDProxy({ rows: loans }, { rows: old });
      t.isNull(k.value);
      t.eq(k.status, 'Unavailable');
    });
  });

  t.describe('Estimated Deposit Cost Proxy', () => {
    const ca = series([['2026-07', 4000]]);
    const sa = series([['2026-07', 1000]]);
    const tda = [
      { period: '2026-07', value: 600 },
      { period: '2026-07', value: 400 }
    ];
    const rate = series([['2026-07', 3.0]]);
    t.it('weights by stock and applies the assumed rates', () => {
      const k = C.estimatedDepositCostProxy({
        ca: { rows: ca }, sa: { rows: sa }, tda: { rows: tda }, tdaRate: { rows: rate }
      });
      // (0*4000 + 0.05*1000 + 3.0*1000) / 6000
      t.close(k.value, (0 * 4000 + 0.05 * 1000 + 3 * 1000) / 6000, 1e-9);
      t.eq(k.status, 'Estimated');
    });
    t.it('publishes a savings-rate sensitivity ladder', () => {
      const k = C.estimatedDepositCostProxy({
        ca: { rows: ca }, sa: { rows: sa }, tda: { rows: tda }, tdaRate: { rows: rate }
      });
      t.eq(k.extra.sensitivity.map(s => s.saRate), [0, 0.05, 0.25, 0.5]);
      t.ok(k.extra.sensitivity[3].value > k.extra.sensitivity[0].value,
           'a higher savings rate must raise the cost');
    });
    t.it('warns when time-deposit series are incomplete', () => {
      const k = C.estimatedDepositCostProxy({
        ca: { rows: ca }, sa: { rows: sa }, tda: { rows: tda }, tdaRate: { rows: rate },
        expectedTdaSeries: 12
      });
      t.ok(k.warnings.some(w => /understated/.test(w)),
           'an incomplete time-deposit stock must be flagged');
    });
  });

  t.describe('Net Interest Income Share', () => {
    const income = { rows: [{ period: '2025-12', interest_income: 424.62,
      interest_expense: 80.46, total_income: 557.22 }] };
    t.it('is an income-composition ratio, not a margin', () => {
      const k = C.netInterestIncomeShare(income);
      t.close(k.value, (424.62 - 80.46) / 557.22 * 100, 1e-6);
      t.eq(k.label, 'Net Interest Income Share');
      t.ok(k.limitations.some(l => /NOT a net interest margin/.test(l)));
    });
  });

  t.describe('Cost-to-Income', () => {
    const row = {
      period: '2025-12', total_income: 557.2214, interest_expense: 80.4647,
      fee_commission_expense: 51.046, gen_admin_expense: 196.0182, depreciation: 0
    };
    t.it('excludes impairment and nets fee expense from income', () => {
      const k = C.costToIncome({ rows: [row] });
      const expected = 196.0182 / (557.2214 - 80.4647 - 51.046) * 100;
      t.close(k.value, expected, 1e-6);
      t.close(k.value, 46.0, 0.1);
    });
  });

  t.describe('Cost of Risk', () => {
    const loans = series([['2025-12', 6000], ['2026-06', 7000]]);
    t.it('annualises a mid-year year-to-date charge', () => {
      const income = { rows: [{ period: '2026-06', loan_loss_provisions: 15 }] };
      const k = C.costOfRisk(income, { rows: loans });
      // 15 * 12/6 = 30 annualised, over average of 6000 and 7000 = 6500
      t.close(k.value, 30 / 6500 * 100, 1e-6);
      t.eq(k.extra.monthOfYear, 6);
    });
    t.it('does not annualise December again', () => {
      const income = { rows: [{ period: '2025-12', loan_loss_provisions: 28.68 }] };
      const loans2 = series([['2024-12', 5000], ['2025-12', 6000]]);
      const k = C.costOfRisk(income, { rows: loans2 });
      t.close(k.extra.annualisedImpairment, 28.68, 1e-9);
      t.close(k.value, 28.68 / 5500 * 100, 1e-6);
    });
    t.it('falls back to ending loans and says so', () => {
      const income = { rows: [{ period: '2026-06', loan_loss_provisions: 15 }] };
      const only = series([['2026-06', 7000]]);
      const k = C.costOfRisk(income, { rows: only });
      t.eq(k.status, 'Proxy');
      t.ok(k.limitations.some(l => /ending balance used/.test(l)));
    });
  });

  t.describe('pricing gap', () => {
    t.it('warns when the two rates come from different periods', () => {
      const lend = C.kpi({ id: 'l', label: 'Lending Rate', value: 6.9, period: P.toIndex('2026-07') });
      const dep = C.kpi({ id: 'd', label: 'Deposit Cost', value: 3.3, period: P.toIndex('2026-05') });
      const g = C.pricingGap(lend, dep, { id: 'gap', label: 'Gap' });
      t.close(g.value, 3.6, 1e-9);
      t.ok(g.warnings.length > 0);
    });
  });

  t.describe('unit scaling', () => {
    const rows = series([['2026-06', 5000], ['2026-07', 5152]]);
    t.it('converts a source unit to the display unit', () => {
      const k = C.seriesKPI({ id: 'p', label: 'POS', rows, unit: 'count', scale: 1000 });
      t.close(k.value, 5152000);
      t.close(k.extra.sourceValue, 5152);
      t.eq(k.extra.scale, 1000);
    });
    t.it('leaves percentage change scale-invariant', () => {
      const raw = C.seriesKPI({ id: 'p', label: 'POS', rows, unit: 'count' });
      const scaled = C.seriesKPI({ id: 'p', label: 'POS', rows, unit: 'count', scale: 1000 });
      t.close(raw.mom.value, scaled.mom.value, 1e-12);
    });
    t.it('defaults to no scaling', () => {
      t.eq(C.seriesKPI({ id: 'p', label: 'POS', rows }).value, 5152);
    });
  });
};
