/* Phase 13 — signal scoring and regime detection tests. */
'use strict';
const P = require('../js/core/periods.js');
const S = require('../js/core/signals.js');
const R = require('../js/core/regimes.js');

// build a monthly point series ending at 2026-07
function pts(values) {
  const end = P.toIndex('2026-07');
  return values.map((v, i) => ({ index: end - (values.length - 1 - i), value: v }));
}

module.exports = function (t) {

  t.describe('run length', () => {
    t.it('counts consecutive rises', () => {
      t.eq(S.runLength(pts([1, 2, 3, 4, 5])), 4);
    });
    t.it('counts consecutive falls', () => {
      t.eq(S.runLength(pts([5, 4, 3, 2])), 3);
    });
    t.it('resets when direction turns', () => {
      t.eq(S.runLength(pts([1, 2, 3, 2])), 1);
    });
    t.it('returns zero on a flat tail', () => {
      t.eq(S.runLength(pts([1, 2, 3, 3])), 0);
    });
  });

  t.describe('score components', () => {
    t.it('persistence rises with the run and saturates', () => {
      t.eq(S.persistence(1), 0);
      t.close(S.persistence(2), 1 / 3, 1e-9);
      t.eq(S.persistence(4), 1);
      t.eq(S.persistence(9), 1);
    });
    t.it('confidence follows KPI status', () => {
      t.close(S.confidenceOf('Direct'), 1.0);
      t.close(S.confidenceOf('Estimated'), 0.4);
      t.close(S.confidenceOf('Proxy', 0.5), 0.3);
      t.close(S.confidenceOf('Unavailable'), 0);
    });
    t.it('priority bands follow the score', () => {
      t.eq(S.priorityOf(0.7), 'High');
      t.eq(S.priorityOf(0.4), 'Medium');
      t.eq(S.priorityOf(0.1), 'Low');
    });
  });

  t.describe('evaluate', () => {
    const stable = [];
    for (let i = 0; i < 30; i++) stable.push(100 + (i % 2 ? 0.4 : -0.4));

    t.it('a quiet series scores low', () => {
      const sig = S.evaluate({ id: 'q', label: 'Quiet', points: pts(stable), status: 'Direct' });
      t.ok(sig.score < 0.3, 'noise must not raise a signal, got ' + sig.score);
    });

    t.it('a sustained break scores higher than noise', () => {
      const broken = stable.slice(0, 24).concat([104, 108, 112, 117, 122, 128]);
      const quiet = S.evaluate({ id: 'q', label: 'Quiet', points: pts(stable), status: 'Direct' });
      const sig = S.evaluate({ id: 'b', label: 'Break', points: pts(broken), status: 'Direct' });
      t.ok(sig.score > quiet.score, 'a sustained break must outrank noise');
      t.eq(sig.direction, 'up');
      t.ok(sig.runLength >= 4);
    });

    t.it('an estimated metric is discounted against an identical direct one', () => {
      const rising = stable.slice(0, 24).concat([104, 108, 112, 117, 122, 128]);
      const direct = S.evaluate({ id: 'd', label: 'D', points: pts(rising), status: 'Direct' });
      const est = S.evaluate({ id: 'e', label: 'E', points: pts(rising), status: 'Estimated' });
      t.ok(est.score < direct.score, 'lower-confidence inputs must rank lower');
    });

    t.it('carries the authored narrative, not a generated cause', () => {
      const sig = S.evaluate({
        id: 'n', label: 'N', points: pts(stable), status: 'Direct',
        observation: (c) => 'Value ' + c.value.toFixed(1) + ' at ' + c.period,
        interpretation: 'May reflect X or Y.',
        managementQuestion: 'Is it concentrated anywhere?'
      });
      t.ok(/Value/.test(sig.observation));
      t.eq(sig.interpretation, 'May reflect X or Y.');
      t.eq(sig.managementQuestion, 'Is it concentrated anywhere?');
    });

    t.it('returns null when there is nothing to compare', () => {
      t.eq(S.evaluate({ id: 'x', label: 'X', points: pts([1]) }), null);
    });
  });

  t.describe('assessment — direction is not the same as good', () => {
    const up = { direction: 'up' }, down = { direction: 'down' };
    t.it('rising cost of risk is negative', () => {
      t.eq(S.assessment(Object.assign({ polarity: 'good-down' }, up)), 'negative');
    });
    t.it('falling cost of risk is positive', () => {
      t.eq(S.assessment(Object.assign({ polarity: 'good-down' }, down)), 'positive');
    });
    t.it('rising digital adoption is positive', () => {
      t.eq(S.assessment(Object.assign({ polarity: 'good-up' }, up)), 'positive');
    });
    t.it('LTD is judged against a threshold, not a direction', () => {
      t.eq(S.assessment(Object.assign({ polarity: 'threshold' }, up)), 'attention');
    });
  });

  t.describe('ranking', () => {
    t.it('orders by score descending and drops nulls', () => {
      const r = S.rank([{ score: 0.2 }, null, { score: 0.8 }, { score: 0.5 }]);
      t.eq(r.map(x => x.score), [0.8, 0.5, 0.2]);
    });
  });

  t.describe('regimes — transparent rules', () => {
    function bundle(over) {
      const base = {
        loans: { available: true, yoy: 5, value: 7000 },
        deposits: { available: true, yoy: 6, value: 7900 },
        depositRate: { available: true, yoyAbs: 0.0, value: 3.3 },
        spread: { available: true, yoyAbs: 0.2, percentile: 50, value: 3.6 },
        ltd: { available: true, value: 80, yoyAbs: -1 },
        cor: { available: true, yoyAbs: -0.1, percentile: 20, value: 0.5 },
        cardPayments: { available: true, yoy: 5 },
        atmWithdrawals: { available: true, yoy: 4 }
      };
      return Object.assign({}, base, over || {});
    }

    t.it('falls back to Stable / Neutral when no rule fires', () => {
      const out = R.detect(bundle());
      const active = out.filter(r => r.active);
      t.eq(active.length, 1);
      t.eq(active[0].id, 'stable_neutral');
    });

    t.it('activates Credit Expansion when both conditions hold', () => {
      const out = R.detect(bundle({
        loans: { available: true, yoy: 12 }, deposits: { available: true, yoy: 4 }
      }));
      const ce = out.find(r => r.id === 'credit_expansion');
      t.eq(ce.active, true);
      t.eq(ce.met, 2);
    });

    t.it('does not activate on a partial match', () => {
      const out = R.detect(bundle({
        loans: { available: true, yoy: 12 }, deposits: { available: true, yoy: 20 }
      }));
      const ce = out.find(r => r.id === 'credit_expansion');
      t.eq(ce.active, false);
      t.eq(ce.met, 1);
    });

    t.it('an untestable condition blocks activation and lowers confidence', () => {
      const out = R.detect(bundle({
        loans: { available: true, yoy: 12 }, deposits: { available: false }
      }));
      const ce = out.find(r => r.id === 'credit_expansion');
      t.eq(ce.active, false);
      t.eq(ce.unknown, 1);
      t.close(ce.confidence, 0.5);
    });

    t.it('exposes every condition as readable text', () => {
      const out = R.detect(bundle());
      out.filter(r => r.conditions.length).forEach(r => {
        r.conditions.forEach(c => t.ok(typeof c.description === 'string' && c.description.length > 10));
      });
    });

    t.it('detects liquidity tightening on a high and rising LTD', () => {
      const out = R.detect(bundle({ ltd: { available: true, value: 91, yoyAbs: 3 } }));
      t.eq(out.find(r => r.id === 'liquidity_tightening').active, true);
    });
  });
};
