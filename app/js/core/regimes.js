/* =====================================================================
   KBI core — market regime detection
   ---------------------------------------------------------------------
   Transparent, rule-based, and auditable. Every regime declares the exact
   conditions it tests, the indicators and periods it used, and how many of
   its conditions were met. No opaque classification, no model weights.

   A regime is ACTIVE when every required condition holds. Conditions that
   cannot be evaluated (missing input) are reported as such and prevent
   activation rather than being treated as false.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./periods.js'), require('./safe-math.js'));
  } else {
    root.KBI = root.KBI || {};
    root.KBI.Regimes = factory(root.KBI.Periods, root.KBI.Math);
  }
}(typeof self !== 'undefined' ? self : this, function (P, M) {
  'use strict';

  /* A metric bundle handed to the rules:
     { value, mom, yoy, run, percentile, period, available } */
  function metric(points, opts) {
    opts = opts || {};
    if (!points || !points.length) return { available: false };
    var last = points[points.length - 1];
    var prev = points.length > 1 ? points[points.length - 2] : null;
    var yoy = null;
    for (var i = points.length - 1; i >= 0; i--) {
      if (points[i].index === last.index - 12) { yoy = points[i]; break; }
    }
    return {
      available: true,
      value: last.value,
      period: last.index,
      mom: prev && last.index - prev.index === 1 ? M.pctChange(last.value, prev.value) : null,
      momAbs: prev && last.index - prev.index === 1 ? last.value - prev.value : null,
      yoy: yoy ? M.pctChange(last.value, yoy.value) : null,
      yoyAbs: yoy ? last.value - yoy.value : null,
      percentile: M.percentileRank(last.value, points.map(function (p) { return p.value; })),
      label: opts.label || null
    };
  }

  function cond(description, fn) {
    return { description: description, test: fn };
  }

  /* The rule book. Each condition is a plain sentence a reviewer can check. */
  var DEFINITIONS = [
    {
      id: 'credit_expansion',
      name: 'Credit Expansion',
      rationale: 'Lending is growing faster than its own recent norm and faster than deposits.',
      conditions: [
        cond('Total loans YoY growth above 8%', function (m) {
          return m.loans.available && m.loans.yoy != null ? m.loans.yoy > 8 : null;
        }),
        cond('Loan growth exceeds deposit growth (YoY)', function (m) {
          return (m.loans.yoy != null && m.deposits.yoy != null) ? m.loans.yoy > m.deposits.yoy : null;
        })
      ]
    },
    {
      id: 'deposit_competition',
      name: 'Deposit Competition',
      rationale: 'The price of deposits is rising while the deposit base grows slowly — a sign banks are paying up for funding.',
      conditions: [
        cond('Time deposit rate up at least 0.10pp year over year', function (m) {
          return m.depositRate.available && m.depositRate.yoyAbs != null ? m.depositRate.yoyAbs >= 0.10 : null;
        }),
        cond('Deposit growth below loan growth (YoY)', function (m) {
          return (m.loans.yoy != null && m.deposits.yoy != null) ? m.deposits.yoy < m.loans.yoy : null;
        })
      ]
    },
    {
      id: 'margin_compression',
      name: 'Margin Compression',
      rationale: 'The spread between new lending and deposit pricing is narrowing.',
      conditions: [
        cond('Lending-minus-deposit spread narrower than a year ago', function (m) {
          return m.spread.available && m.spread.yoyAbs != null ? m.spread.yoyAbs < 0 : null;
        }),
        cond('Spread in the bottom third of its own history', function (m) {
          return m.spread.percentile != null ? m.spread.percentile < 33 : null;
        })
      ]
    },
    {
      id: 'liquidity_tightening',
      name: 'Liquidity Tightening',
      rationale: 'Loans are consuming a rising share of the deposit base.',
      conditions: [
        cond('Loan-to-deposit ratio above 85%', function (m) {
          return m.ltd.available ? m.ltd.value > 85 : null;
        }),
        cond('Loan-to-deposit ratio higher than a year ago', function (m) {
          return m.ltd.yoyAbs != null ? m.ltd.yoyAbs > 0 : null;
        })
      ]
    },
    {
      id: 'risk_deterioration',
      name: 'Risk Deterioration',
      rationale: 'Impairment charges are rising relative to the loan book.',
      conditions: [
        cond('Cost of risk higher than a year ago', function (m) {
          return m.cor.available && m.cor.yoyAbs != null ? m.cor.yoyAbs > 0 : null;
        }),
        cond('Cost of risk in the top third of its own history', function (m) {
          return m.cor.percentile != null ? m.cor.percentile > 67 : null;
        })
      ]
    },
    {
      id: 'digital_acceleration',
      name: 'Digital Acceleration',
      rationale: 'Card and electronic payment volumes are growing well ahead of the cash channel.',
      conditions: [
        cond('Card payment count up more than 10% year over year', function (m) {
          return m.cardPayments.available && m.cardPayments.yoy != null ? m.cardPayments.yoy > 10 : null;
        }),
        cond('Card payments growing faster than ATM withdrawals', function (m) {
          return (m.cardPayments.yoy != null && m.atmWithdrawals.yoy != null)
            ? m.cardPayments.yoy > m.atmWithdrawals.yoy : null;
        })
      ]
    }
  ];

  /* Evaluate every regime against a metric bundle. */
  function detect(metrics) {
    var results = DEFINITIONS.map(function (def) {
      var evaluated = def.conditions.map(function (c) {
        var r;
        try { r = c.test(metrics); } catch (e) { r = null; }
        return { description: c.description, result: r };
      });
      var met = evaluated.filter(function (e) { return e.result === true; }).length;
      var failed = evaluated.filter(function (e) { return e.result === false; }).length;
      var unknown = evaluated.filter(function (e) { return e.result == null; }).length;
      var active = unknown === 0 && met === evaluated.length;

      return {
        id: def.id,
        name: def.name,
        rationale: def.rationale,
        conditions: evaluated,
        met: met,
        failed: failed,
        unknown: unknown,
        total: evaluated.length,
        active: active,
        // confidence reflects how much of the rule could actually be tested
        confidence: evaluated.length ? (evaluated.length - unknown) / evaluated.length : 0,
        evaluable: unknown === 0
      };
    });

    var active = results.filter(function (r) { return r.active; });
    if (!active.length) {
      results.push({
        id: 'stable_neutral',
        name: 'Stable / Neutral',
        rationale: 'No regime rule is fully satisfied on the latest common period.',
        conditions: [],
        met: 0, failed: 0, unknown: 0, total: 0,
        active: true, confidence: 1, evaluable: true
      });
    }
    return results;
  }

  return { DEFINITIONS: DEFINITIONS, metric: metric, detect: detect, cond: cond };
}));
