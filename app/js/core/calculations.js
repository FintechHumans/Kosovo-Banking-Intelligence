/* =====================================================================
   KBI core — banking KPI methodology
   ---------------------------------------------------------------------
   Every function returns a KPI object carrying not just a number but the
   period it was computed on, the periods of its inputs, its status, its
   assumptions and its limitations. A KPI that cannot be computed honestly
   returns status 'Unavailable' with a reason rather than a plausible number.

   BQK Table 14 (ODC income statement) hierarchy, verified against the data
   over five year-ends (exact to 2 dp):
     total_income    = interest_income + non_interest_income + revaluation_income
     non_interest_income = fee_commission_income + other_operating_income
     gen_admin_expense   = personnel_expense + general_expense + other_non_int_expense
     total_expenses  = interest_expense + fee_commission_expense
                     + loan_loss_provisions + depreciation + gen_admin_expense
                     + tax_provision
     net_profit      = total_income - total_expenses
   Table 14 is CUMULATIVE YEAR-TO-DATE: the December row is the full year.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./periods.js'), require('./safe-math.js'));
  } else {
    root.KBI = root.KBI || {};
    root.KBI.Calc = factory(root.KBI.Periods, root.KBI.Math);
  }
}(typeof self !== 'undefined' ? self : this, function (P, M) {
  'use strict';

  var STATUS = {
    DIRECT: 'Direct',        // published figure, used as-is
    VERIFIED: 'Verified',    // derived and reconciled against the source
    PROXY: 'Proxy',          // stands in for a metric the data cannot produce
    ESTIMATED: 'Estimated',  // depends on an assumed input
    UNAVAILABLE: 'Unavailable'
  };

  function kpi(o) {
    return {
      id: o.id,
      label: o.label,
      value: o.value == null ? null : o.value,
      unit: o.unit || null,
      period: o.period == null ? null : o.period,
      periodLabel: o.period == null ? '—' : P.format(o.period),
      status: o.status || STATUS.DIRECT,
      confidence: o.confidence || 'High',
      polarity: o.polarity || 'neutral',
      formula: o.formula || null,
      inputs: o.inputs || [],
      assumptions: o.assumptions || [],
      limitations: o.limitations || [],
      warnings: o.warnings || [],
      mom: o.mom || null,
      yoy: o.yoy || null,
      reason: o.reason || null,
      extra: o.extra || null
    };
  }

  /* ---- exact period-over-period change ---------------------------------
     Uses the exact previous month and the exact same month one year
     earlier. When that period has no observation the result is null with a
     reason — never the nearest available month dressed up as a comparison. */
  function changeAt(rows, index, filter, field) {
    var f = field || 'value';
    var cur = P.valueAt(rows, index, filter, f);
    var prevIdx = P.previousMonth(index);
    var yoyIdx = P.sameMonthPreviousYear(index);
    var prev = P.valueAt(rows, prevIdx, filter, f);
    var yoy = P.valueAt(rows, yoyIdx, filter, f);

    function pack(base, baseIdx, label) {
      if (base === undefined) {
        return { value: null, period: baseIdx, periodLabel: P.format(baseIdx),
                 reason: label + ' period has no observation', available: false };
      }
      return {
        value: M.pctChange(cur, base),
        absolute: M.delta(cur, base),
        period: baseIdx,
        periodLabel: P.format(baseIdx),
        reason: M.pctChangeReason(cur, base),
        available: true
      };
    }

    return {
      current: cur === undefined ? null : cur,
      mom: pack(prev, prevIdx, 'previous month'),
      yoy: pack(yoy, yoyIdx, 'same month last year')
    };
  }

  /* Headline level + exact MoM/YoY for one series.

     `scale` converts the source unit to the display unit (BQK publishes
     payment transaction counts in thousands, so a raw 5,152 is 5.15 million
     transactions). Percentage changes are scale-invariant and unaffected. */
  function seriesKPI(opts) {
    var rows = opts.rows, filter = opts.filter;
    var scale = opts.scale == null ? 1 : opts.scale;
    var idx = opts.period != null ? opts.period : P.latestIndex(rows, filter);
    if (idx == null) {
      return kpi({ id: opts.id, label: opts.label, value: null,
                   status: STATUS.UNAVAILABLE, reason: 'no observations' });
    }
    var ch = changeAt(rows, idx, filter, opts.field);
    var scaled = ch.current == null ? null : ch.current * scale;
    return kpi({
      id: opts.id, label: opts.label, value: scaled, unit: opts.unit,
      period: idx, status: opts.status || STATUS.DIRECT,
      confidence: opts.confidence || 'High',
      polarity: opts.polarity || 'neutral',
      formula: opts.formula || 'Published level',
      inputs: [{ name: opts.source || opts.id, period: idx, value: ch.current }],
      extra: { sourceValue: ch.current, scale: scale },
      mom: ch.mom, yoy: ch.yoy,
      limitations: opts.limitations || [],
      assumptions: opts.assumptions || []
    });
  }

  /* ---- Market LTD Proxy -------------------------------------------------
     Computed only on a period where BOTH inputs exist. Loans cover all
     currencies; the deposit series covers EUR deposits only, so the ratio
     is a proxy and is labelled as one. */
  function marketLTDProxy(loans, deposits) {
    var sync = P.latestCommonPeriod([
      { name: 'Loans (total, all currencies)', rows: loans.rows, filter: loans.filter },
      { name: 'Deposits (EUR only)', rows: deposits.rows, filter: deposits.filter }
    ]);

    if (sync.period == null) {
      return kpi({ id: 'ltd', label: 'Market LTD Proxy', value: null,
                   status: STATUS.UNAVAILABLE,
                   reason: 'no period where both loans and deposits are published' });
    }

    var L = P.valueAt(loans.rows, sync.period, loans.filter);
    var Dp = P.valueAt(deposits.rows, sync.period, deposits.filter);
    var value = M.share(L, Dp);

    function at(idx) {
      var l = P.valueAt(loans.rows, idx, loans.filter);
      var d = P.valueAt(deposits.rows, idx, deposits.filter);
      return (l === undefined || d === undefined) ? undefined : M.share(l, d);
    }
    var prevIdx = P.previousMonth(sync.period), yoyIdx = P.sameMonthPreviousYear(sync.period);
    var prev = at(prevIdx), yoy = at(yoyIdx);

    var warnings = [];
    if (!sync.aligned) {
      warnings.push('Computed on ' + P.format(sync.period) + ', ' + sync.lagMonths +
        ' month(s) behind the newest input (' + sync.stale.join(', ') +
        '). Limited by: ' + sync.limiting.join(', ') + '.');
    }

    return kpi({
      id: 'ltd', label: 'Market LTD Proxy', value: value, unit: '%',
      period: sync.period, status: STATUS.PROXY, confidence: 'Medium',
      polarity: 'threshold',
      formula: 'Total loans (all currencies) ÷ EUR deposits × 100',
      inputs: [
        { name: 'Total loans', period: sync.period, value: L },
        { name: 'EUR deposits', period: sync.period, value: Dp }
      ],
      assumptions: ['Both inputs read at the latest common period.'],
      limitations: [
        'Numerator includes all currencies; the denominator is EUR deposits only, so the ratio is overstated by the non-EUR deposit base.',
        'Excludes wholesale and borrowed funding from the denominator.'
      ],
      warnings: warnings,
      mom: { value: prev === undefined ? null : M.pctChange(value, prev),
             absolute: prev === undefined ? null : M.delta(value, prev),
             period: prevIdx, periodLabel: P.format(prevIdx),
             available: prev !== undefined,
             reason: prev === undefined ? 'previous month unavailable for both inputs' : null },
      yoy: { value: yoy === undefined ? null : M.pctChange(value, yoy),
             absolute: yoy === undefined ? null : M.delta(value, yoy),
             period: yoyIdx, periodLabel: P.format(yoyIdx),
             available: yoy !== undefined,
             reason: yoy === undefined ? 'same month last year unavailable for both inputs' : null },
      extra: { sync: sync }
    });
  }

  /* ---- Estimated Deposit Cost Proxy (was "WACF") -------------------------
       EDCP = (CA·r_CA + SA·r_SA + TDA·r_TDA) / (CA + SA + TDA)

     Deliberately NOT called a weighted average cost of funds: it covers
     customer deposits only and applies a new-business time-deposit rate to
     an outstanding stock. */
  var SA_SCENARIOS = [0.00, 0.05, 0.25, 0.50];

  function estimatedDepositCostProxy(opts) {
    var caS = opts.ca, saS = opts.sa, tdaS = opts.tda, rateS = opts.tdaRate;
    var caRate = opts.caRate == null ? 0.00 : opts.caRate;
    var saRate = opts.saRate == null ? 0.05 : opts.saRate;

    var sync = P.latestCommonPeriod([
      { name: 'Transferable deposits (CA)', rows: caS.rows, filter: caS.filter },
      { name: 'Savings deposits (SA)', rows: saS.rows, filter: saS.filter },
      { name: 'Time deposit stock (TDA)', rows: tdaS.rows, filter: tdaS.filter },
      { name: 'Time deposit rate', rows: rateS.rows, filter: rateS.filter }
    ]);

    if (sync.period == null) {
      return kpi({ id: 'edcp', label: 'Estimated Deposit Cost Proxy', value: null,
                   status: STATUS.UNAVAILABLE, reason: 'inputs share no common period' });
    }

    var idx = sync.period;
    var ca = P.valueAt(caS.rows, idx, caS.filter);
    var sa = P.valueAt(saS.rows, idx, saS.filter);
    var rate = P.valueAt(rateS.rows, idx, rateS.filter);

    // TDA is a bucketed stock: sum every bucket at the period, and record
    // how many series were present so an incomplete month is visible.
    var buckets = (tdaS.rows || []).filter(function (r) {
      return P.toIndex(r.period) === idx && (!tdaS.filter || tdaS.filter(r));
    });
    var tdaSum = M.sum(buckets.map(function (r) { return r.value; }));
    var tda = tdaSum.value;

    var expectedSeries = opts.expectedTdaSeries || null;
    var warnings = [];
    if (expectedSeries && buckets.length < expectedSeries) {
      warnings.push('Only ' + buckets.length + ' of ' + expectedSeries +
        ' time-deposit series are published for ' + P.format(idx) +
        '; the time-deposit weight is understated.');
    }
    if (!sync.aligned) {
      warnings.push('Computed on ' + P.format(idx) + ', ' + sync.lagMonths +
        ' month(s) behind the newest input. Limited by: ' + sync.limiting.join(', ') + '.');
    }

    function compute(rSa) {
      var w = M.weightedAverage([
        { value: caRate, weight: ca },
        { value: rSa, weight: sa },
        { value: rate, weight: tda }
      ]);
      return w.value;
    }

    var value = compute(saRate);
    var sensitivity = SA_SCENARIOS.map(function (r) {
      return { saRate: r, value: compute(r) };
    });

    return kpi({
      id: 'edcp', label: 'Estimated Deposit Cost Proxy', value: value, unit: '%',
      period: idx, status: STATUS.ESTIMATED, confidence: 'Low',
      polarity: 'good-down',
      formula: 'EDCP = (CA·r_CA + SA·r_SA + TDA·r_TDA) ÷ (CA + SA + TDA)',
      inputs: [
        { name: 'Transferable (CA) stock', period: idx, value: ca },
        { name: 'Savings (SA) stock', period: idx, value: sa },
        { name: 'Time deposit (TDA) stock', period: idx, value: tda },
        { name: 'Time deposit rate (new business)', period: idx, value: rate }
      ],
      assumptions: [
        'Current accounts assumed non-remunerated at ' + caRate.toFixed(2) + '%.',
        'Savings assumed at ' + saRate.toFixed(2) + '% — BQK does not publish a savings rate.',
        'The published new-business time-deposit rate is applied to the outstanding time-deposit stock.'
      ],
      limitations: [
        'Covers customer deposits only. Excludes borrowings, subordinated debt, wholesale funding and capital.',
        'Not a bank weighted average cost of funds and not comparable to a bank-reported WACF.',
        'Applying a new-business rate to a stock balance overstates repricing speed in a rising-rate period and understates it in a falling one.'
      ],
      warnings: warnings,
      extra: {
        sensitivity: sensitivity,
        weights: { ca: ca, sa: sa, tda: tda, total: (ca || 0) + (sa || 0) + (tda || 0) },
        tdaSeriesPresent: buckets.length,
        sync: sync
      }
    });
  }

  /* ---- Net Interest Income Share (was mislabelled "NIM Proxy") ----------
     An income-composition ratio. A true NIM needs average interest-earning
     assets, which this dataset does not carry, so NIM is not offered. */
  function netInterestIncomeShare(income, index) {
    var row = incomeRowAt(income, index);
    if (!row) {
      return kpi({ id: 'nii_share', label: 'Net Interest Income Share', value: null,
                   status: STATUS.UNAVAILABLE, reason: 'no income statement for this period' });
    }
    var nii = M.delta(row.interest_income, row.interest_expense);
    var value = M.share(nii, row.total_income);
    return kpi({
      id: 'nii_share', label: 'Net Interest Income Share', value: value, unit: '%',
      period: P.toIndex(row.period), status: STATUS.VERIFIED, confidence: 'High',
      polarity: 'neutral',
      formula: '(Interest income − Interest expense) ÷ Total income × 100',
      inputs: [
        { name: 'Interest income (YTD)', period: P.toIndex(row.period), value: row.interest_income },
        { name: 'Interest expense (YTD)', period: P.toIndex(row.period), value: row.interest_expense },
        { name: 'Total income (YTD)', period: P.toIndex(row.period), value: row.total_income }
      ],
      limitations: [
        'This is an income-composition ratio, NOT a net interest margin.',
        'A net interest margin requires average interest-earning assets, which BQK Table 14 does not provide.'
      ],
      extra: { netInterestIncome: nii }
    });
  }

  /* ---- Cost-to-Income ---------------------------------------------------
     Operating expenses exclude impairment and tax; operating income is net
     of interest and fee expense. Component hierarchy verified against the
     source (see module header). */
  function costToIncome(income, index) {
    var row = incomeRowAt(income, index);
    if (!row) {
      return kpi({ id: 'cti', label: 'Cost-to-Income', value: null,
                   status: STATUS.UNAVAILABLE, reason: 'no income statement for this period' });
    }
    var opex = (row.gen_admin_expense || 0) + (row.depreciation || 0);
    var opinc = row.total_income - row.interest_expense - row.fee_commission_expense;
    var value = M.share(opex, opinc);

    return kpi({
      id: 'cti', label: 'Cost-to-Income', value: value, unit: '%',
      period: P.toIndex(row.period), status: STATUS.VERIFIED, confidence: 'Medium',
      polarity: 'good-down',
      formula: '(General & administrative + Depreciation) ÷ (Total income − Interest expense − Fee expense) × 100',
      inputs: [
        { name: 'General & administrative (incl. personnel)', period: P.toIndex(row.period), value: row.gen_admin_expense },
        { name: 'Depreciation', period: P.toIndex(row.period), value: row.depreciation },
        { name: 'Total income', period: P.toIndex(row.period), value: row.total_income },
        { name: 'Interest expense', period: P.toIndex(row.period), value: row.interest_expense },
        { name: 'Fee & commission expense', period: P.toIndex(row.period), value: row.fee_commission_expense }
      ],
      assumptions: [
        'General & administrative already contains personnel and general costs (verified: gen_admin = personnel + general + other).',
        'Fee expense is netted against income rather than counted as an operating cost.'
      ],
      limitations: [
        'Impairment charges and tax are excluded from operating expenses, per standard cost-to-income practice.',
        'Both numerator and denominator are cumulative year-to-date, so the ratio is a YTD ratio.'
      ],
      extra: { operatingExpenses: opex, operatingIncome: opinc }
    });
  }

  /* ---- Cost of Risk -----------------------------------------------------
       Annualised CoR = (YTD impairment ÷ average gross loans) × 12/m
     December is already a full year and is not annualised again. */
  function costOfRisk(income, loans, index) {
    var row = incomeRowAt(income, index);
    if (!row) {
      return kpi({ id: 'cor', label: 'Cost of Risk', value: null,
                   status: STATUS.UNAVAILABLE, reason: 'no income statement for this period' });
    }
    var idx = P.toIndex(row.period);
    var month = ((idx - 1) % 12) + 1;

    var endLoans = P.valueAt(loans.rows, idx, loans.filter);
    var startIdx = idx - month;                       // prior year-end
    var startLoans = P.valueAt(loans.rows, startIdx, loans.filter);

    var avgLoans, basis, status, limitations = [];
    if (endLoans !== undefined && startLoans !== undefined) {
      avgLoans = (endLoans + startLoans) / 2;
      basis = 'Average of opening and closing gross loans';
      status = STATUS.VERIFIED;
    } else if (endLoans !== undefined) {
      avgLoans = endLoans;
      basis = 'Ending gross loans (opening balance unavailable)';
      status = STATUS.PROXY;
      limitations.push('Average gross loans unavailable; ending balance used, which understates CoR in a growing book.');
    } else {
      return kpi({ id: 'cor', label: 'Cost of Risk', value: null,
                   status: STATUS.UNAVAILABLE, reason: 'gross loans unavailable for this period' });
    }

    var annualised = M.annualiseYTD(row.loan_loss_provisions, month);
    var value = M.share(annualised, avgLoans);

    limitations.push('BQK Table 14 reports a single impairment line; provision balance, write-offs and recoveries are not separable.');

    return kpi({
      id: 'cor', label: 'Cost of Risk (annualised)', value: value, unit: '%',
      period: idx, status: status, confidence: 'Medium', polarity: 'good-down',
      formula: month === 12
        ? 'Full-year impairment ÷ average gross loans × 100'
        : 'YTD impairment × (12 ÷ ' + month + ') ÷ average gross loans × 100',
      inputs: [
        { name: 'Impairment charges (YTD)', period: idx, value: row.loan_loss_provisions },
        { name: 'Gross loans (closing)', period: idx, value: endLoans },
        { name: 'Gross loans (opening)', period: startIdx, value: startLoans }
      ],
      assumptions: [
        basis + '.',
        month === 12 ? 'December is a full year and is not annualised again.'
                     : 'Year-to-date impairment annualised by 12/' + month + '.'
      ],
      limitations: limitations,
      extra: { annualisedImpairment: annualised, averageLoans: avgLoans, monthOfYear: month }
    });
  }

  /* Pricing gap between new lending and a deposit cost measure. */
  function pricingGap(lendingRate, depositCost, opts) {
    opts = opts || {};
    if (lendingRate.value == null || depositCost.value == null) {
      return kpi({ id: opts.id || 'gap', label: opts.label || 'Pricing Gap', value: null,
                   status: STATUS.UNAVAILABLE, reason: 'one or both rate inputs unavailable' });
    }
    var warnings = [];
    if (lendingRate.period !== depositCost.period) {
      warnings.push('Rate inputs are from different periods (' +
        P.format(lendingRate.period) + ' vs ' + P.format(depositCost.period) + ').');
    }
    return kpi({
      id: opts.id || 'gap', label: opts.label || 'Pricing Gap',
      value: lendingRate.value - depositCost.value, unit: 'pp',
      period: Math.min(lendingRate.period, depositCost.period),
      status: STATUS.PROXY, confidence: depositCost.confidence || 'Low',
      polarity: 'good-up',
      formula: (opts.label || 'Gap') + ' = ' + lendingRate.label + ' − ' + depositCost.label,
      inputs: [
        { name: lendingRate.label, period: lendingRate.period, value: lendingRate.value },
        { name: depositCost.label, period: depositCost.period, value: depositCost.value }
      ],
      limitations: ['Not a net interest margin: excludes non-interest income, impairment and the legacy book.']
        .concat(depositCost.limitations || []),
      warnings: warnings
    });
  }

  /* Latest income-statement row at or before `index` (cumulative YTD). */
  function incomeRowAt(income, index) {
    var rows = (income.rows || []).slice().sort(function (a, b) {
      return P.toIndex(a.period) - P.toIndex(b.period);
    });
    if (index == null) return rows.length ? rows[rows.length - 1] : null;
    for (var i = rows.length - 1; i >= 0; i--) {
      if (P.toIndex(rows[i].period) === index) return rows[i];
    }
    return null;
  }

  return {
    STATUS: STATUS,
    kpi: kpi,
    changeAt: changeAt,
    seriesKPI: seriesKPI,
    marketLTDProxy: marketLTDProxy,
    estimatedDepositCostProxy: estimatedDepositCostProxy,
    netInterestIncomeShare: netInterestIncomeShare,
    costToIncome: costToIncome,
    costOfRisk: costOfRisk,
    pricingGap: pricingGap,
    incomeRowAt: incomeRowAt,
    SA_SCENARIOS: SA_SCENARIOS
  };
}));
