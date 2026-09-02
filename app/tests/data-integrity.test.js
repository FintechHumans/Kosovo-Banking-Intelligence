/* Phase 13 — integrity tests against the real shipped dataset.
   These assert properties of app/_data_blob.js itself, so a bad data build
   fails the suite rather than reaching the browser. */
'use strict';
const fs = require('fs');
const path = require('path');
const P = require('../js/core/periods.js');
const M = require('../js/core/safe-math.js');
const V = require('../js/core/validators.js');

const blobPath = path.join(__dirname, '..', '_data_blob.js');
const D = eval(fs.readFileSync(blobPath, 'utf8') + '; D');

module.exports = function (t) {

  t.describe('shipped dataset — structure', () => {
    t.it('exposes all 23 datasets', () => {
      t.eq(Object.keys(D).length, 23);
    });
    t.it('every dataset is a non-empty array of period-bearing rows', () => {
      Object.keys(D).forEach(k => {
        t.ok(Array.isArray(D[k]) && D[k].length > 0, k + ' must be a non-empty array');
        t.ok(D[k][0].period != null, k + ' rows must carry a period');
      });
    });
    t.it('every period parses to a month index', () => {
      const bad = [];
      Object.keys(D).forEach(k => {
        D[k].forEach(r => { if (P.toIndex(r.period) == null) bad.push(k + ':' + r.period); });
      });
      t.eq(bad.slice(0, 5), [], 'unparseable periods found');
    });
  });

  t.describe('shipped dataset — no duplicate composite keys', () => {
    Object.keys(D).forEach(name => {
      t.it(name, () => {
        const dims = V.dimensionsOf(D[name]);
        const seen = Object.create(null);
        let dupes = 0;
        D[name].forEach(r => {
          const k = V.keyOf(r, dims);
          if (seen[k]) dupes++; else seen[k] = true;
        });
        t.eq(dupes, 0, name + ' has duplicate keys');
      });
    });
  });

  t.describe('shipped dataset — latest period completeness', () => {
    // Every series inside a dataset should reach the dataset's latest period.
    // A lagging series silently understates any total built from it — this is
    // the defect that corrupted the deposit-cost weight.
    const skip = { payments: 'BQK publishes indicators with different lags' };
    // Series that legitimately stop, with the reason. Anything NOT listed here
    // that lags is a defect.
    const discontinued = {
      'fx|HRK': 'Croatia adopted the euro on 1 Jan 2023; HRK ceased to be a foreign currency.',
      'loans_customer|Government': 'BQK reports government lending as nil in almost every month (4 non-zero observations in 26 years).'
    };
    Object.keys(D).forEach(name => {
      if (skip[name]) return;
      t.it(name, () => {
        const dims = V.dimensionsOf(D[name]);
        if (!dims.length) return;                       // wide datasets: one row per period
        const bySeries = {};
        D[name].forEach(r => {
          const k = dims.map(d => r[d]).join(' | ');
          const i = P.toIndex(r.period);
          if (i != null) bySeries[k] = Math.max(bySeries[k] || 0, i);
        });
        const latest = Math.max(...Object.values(bySeries));
        const lagging = Object.keys(bySeries)
          .filter(k => bySeries[k] < latest)
          .filter(k => !discontinued[name + '|' + k]);
        t.eq(lagging, [], name + ' series stop before ' + P.format(latest));
      });
    });
  });

  t.describe('shipped dataset — deposit maturity feeds the cost proxy', () => {
    t.it('all 12 time-deposit series are present at the latest period', () => {
      const latest = P.latestIndex(D.dep_maturity);
      const at = D.dep_maturity.filter(r => P.toIndex(r.period) === latest);
      t.eq(at.length, 12, 'an incomplete month understates the time-deposit weight');
    });
    t.it('the time-deposit stock is a positive finite number', () => {
      const latest = P.latestIndex(D.dep_maturity);
      const s = M.sum(D.dep_maturity.filter(r => P.toIndex(r.period) === latest).map(r => r.value));
      t.ok(s.value > 0 && isFinite(s.value), 'time-deposit stock must be positive');
      t.eq(s.missing, 0);
    });
  });

  t.describe('shipped dataset — reconciliation', () => {
    t.it('loan segments reconcile to the published total', () => {
      const out = V.reconcile('loans_customer', D.loans_customer, {
        total: 'Total',
        parts: ['Government', 'Financial Corporations', 'Non-Financial Corporations',
                'Households', 'Non-Residents'],
        dimension: 'segment',
        tolerance: 0.02
      });
      t.eq(out.length, 0, out.length ? out[0].message : '');
    });

    // BQK's published history carries a small number of internal
    // inconsistencies. They are documented in docs/DATA_QUALITY_REPORT.md and
    // are NOT corrected here. These assertions pin the known count so that a
    // NEW breach — introduced by a bad data build — fails the suite.
    t.it('income − expenses = net profit (1 known source breach: 2018-03)', () => {
      const bad = D.odc_income.filter(r => {
        if (!M.isNum(r.total_income) || !M.isNum(r.total_expenses)) return false;
        return Math.abs((r.total_income - r.total_expenses) - r.net_profit) > 0.05;
      });
      t.eq(bad.map(r => r.period), ['2018-03']);
    });

    t.it('total income = interest + non-interest + revaluation (3 known source breaches)', () => {
      const bad = D.odc_income.filter(r =>
        Math.abs(r.total_income - (r.interest_income + r.non_interest_income + r.revaluation_income)) > 0.05);
      t.eq(bad.map(r => r.period), ['2016-07', '2019-01', '2019-08']);
    });

    t.it('general & admin = personnel + general + other from Nov 2020 onward', () => {
      // The component split is only reported consistently in recent years;
      // Cost-to-Income therefore uses gen_admin directly, never the parts.
      const modern = D.odc_income.filter(r => P.toIndex(r.period) >= P.toIndex('2020-11'));
      const bad = modern.filter(r =>
        Math.abs(r.gen_admin_expense - (r.personnel_expense + r.general_expense + r.other_non_int_expense)) > 0.05);
      t.eq(bad.length, 0, bad.length ? 'first breach ' + bad[0].period : '');
      t.ok(modern.length > 60, 'the modern window must be substantial');
    });

    t.it('residual maturity buckets sum to the total (1 known source breach: 2020-09)', () => {
      const bad = D.loan_maturity_residual.filter(r => {
        const s = r.up_to_1y + r.y1_2 + r.y2_5 + r.y5_10 + r.over_10y;
        if (!r.total) return false;
        return Math.abs(s - r.total) / r.total > 0.01;
      });
      t.eq(bad.map(r => r.period), ['2020-09']);
    });
  });

  t.describe('shipped dataset — chronology and sanity', () => {
    t.it('no period lies in the future beyond the reporting month', () => {
      // data is published in arrears; nothing should exceed the current month
      const now = new Date();
      const ceiling = (now.getFullYear()) * 12 + (now.getMonth() + 1);
      const future = [];
      Object.keys(D).forEach(k => {
        D[k].forEach(r => { if (P.toIndex(r.period) > ceiling) future.push(k + ':' + r.period); });
      });
      t.eq(future.slice(0, 5), []);
    });

    t.it('rate series sit within a plausible band', () => {
      ['int_rates_loans', 'int_rates_deposits'].forEach(k => {
        const bad = D[k].filter(r => M.isNum(r.value) && (r.value < 0 || r.value > 40));
        t.eq(bad.length, 0, k + ' has an implausible rate');
      });
    });

    t.it('stock series are non-negative', () => {
      ['loans_customer', 'dep_segments', 'dep_maturity'].forEach(k => {
        const bad = D[k].filter(r => M.isNum(r.value) && r.value < 0);
        t.eq(bad.length, 0, k + ' has a negative stock');
      });
    });
  });
};
