/* =====================================================================
   KBI — Decision Centre, Signals and Market Regime
   ---------------------------------------------------------------------
   Presentation only. Every number comes from KBI.Calc / KBI.Signals /
   KBI.Regimes; nothing is computed here beyond formatting.

   Reads the global `D` published by _data_blob.js. Degrades to a visible
   message rather than a blank panel if a dataset is missing.
   ===================================================================== */
(function () {
  'use strict';

  var P = window.KBI && window.KBI.Periods;
  var M = window.KBI && window.KBI.Math;
  var C = window.KBI && window.KBI.Calc;
  var S = window.KBI && window.KBI.Signals;
  var R = window.KBI && window.KBI.Regimes;
  var V = window.KBI && window.KBI.Validate;

  var APP_VERSION = '2.0.0-local';
  var METHODOLOGY_VERSION = '2026.09';

  /* _data_blob.js declares `const D`, which is a script-scoped lexical
     binding rather than a property of window. Resolve the global identifier
     directly, falling back to window for other loaders. */
  function DATA() {
    if (typeof D !== 'undefined' && D) return D;
    return window.D || null;
  }

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }

  /* Build an element with text — avoids innerHTML for data-derived strings. */
  function h(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
  }

  function fmtVal(v, unit) {
    if (v == null || !isFinite(v)) return 'N/A';
    if (unit === '%') return v.toFixed(2) + '%';
    if (unit === 'pp') return (v >= 0 ? '+' : '') + v.toFixed(2) + ' pp';
    if (unit === 'EURm') return window.fmtMoney ? window.fmtMoney(v) : v.toFixed(1);
    if (unit === 'count') return window.fmtCount ? window.fmtCount(v) : String(Math.round(v));
    return v.toFixed(2);
  }

  function fmtChange(ch, unit) {
    if (!ch) return { text: 'N/A', cls: 'flat', title: 'not computed' };
    if (!ch.available || ch.value == null) {
      return { text: 'N/A', cls: 'flat',
               title: ch.reason || 'exact comparable period unavailable' };
    }
    var v = ch.value;
    return {
      text: (v >= 0 ? '▲ +' : '▼ ') + v.toFixed(2) + '%',
      cls: v > 0 ? 'up' : v < 0 ? 'dn' : 'flat',
      title: 'vs ' + ch.periodLabel
    };
  }

  /* Colour by meaning, not by sign. */
  function semanticClass(kpiObj, changeValue) {
    if (changeValue == null) return 'sem-neutral';
    switch (kpiObj.polarity) {
      case 'good-up':   return changeValue > 0 ? 'sem-good' : changeValue < 0 ? 'sem-bad' : 'sem-neutral';
      case 'good-down': return changeValue > 0 ? 'sem-bad' : changeValue < 0 ? 'sem-good' : 'sem-neutral';
      case 'threshold': return 'sem-attention';
      default:          return 'sem-neutral';
    }
  }

  /* ---------------------------------------------------------------- card */
  function renderCard(container, k) {
    var card = h('div', 'dc-card');
    card.setAttribute('role', 'group');
    card.setAttribute('aria-label', k.label);

    var head = h('div', 'dc-head');
    head.appendChild(h('span', 'dc-label', k.label));
    var badge = h('span', 'dc-status st-' + k.status.toLowerCase().replace(/\s/g, '-'), k.status);
    badge.title = 'Calculation status: ' + k.status + ' · confidence ' + k.confidence;
    head.appendChild(badge);
    card.appendChild(head);

    var mom = fmtChange(k.mom, k.unit);
    var val = h('div', 'dc-value ' + semanticClass(k, k.mom && k.mom.value));
    val.textContent = k.value == null ? 'N/A' : fmtVal(k.value, k.unit);
    card.appendChild(val);

    if (k.value == null && k.reason) {
      card.appendChild(h('div', 'dc-reason', k.reason));
    }

    var row = h('div', 'dc-changes');
    var momEl = h('span', 'dc-chg ' + mom.cls, 'MoM ' + mom.text);
    momEl.title = mom.title;
    row.appendChild(momEl);
    var yoy = fmtChange(k.yoy, k.unit);
    var yoyEl = h('span', 'dc-chg ' + yoy.cls, 'YoY ' + yoy.text);
    yoyEl.title = yoy.title;
    row.appendChild(yoyEl);
    card.appendChild(row);

    var meta = h('div', 'dc-meta');
    meta.appendChild(h('span', null, 'Period ' + k.periodLabel));
    if (k.mom && k.mom.periodLabel) meta.appendChild(h('span', null, 'vs ' + k.mom.periodLabel));
    card.appendChild(meta);

    if (k.warnings && k.warnings.length) {
      var w = h('div', 'dc-warn', '⚠ ' + k.warnings[0]);
      w.title = k.warnings.join('\n');
      card.appendChild(w);
    }

    // provenance drawer — formula, inputs, assumptions, limitations
    var det = document.createElement('details');
    det.className = 'dc-details';
    var sum = document.createElement('summary');
    sum.textContent = 'Method & sources';
    det.appendChild(sum);
    var body = h('div', 'dc-details-body');
    if (k.formula) {
      body.appendChild(h('div', 'dc-formula', k.formula));
    }
    if (k.inputs && k.inputs.length) {
      var ul = document.createElement('ul');
      k.inputs.forEach(function (i) {
        ul.appendChild(h('li', null, i.name + ' — ' + P.format(i.period) +
          (i.value == null ? ' (unavailable)' : ': ' + Number(i.value).toLocaleString('en', { maximumFractionDigits: 2 }))));
      });
      body.appendChild(h('div', 'dc-sub', 'Inputs'));
      body.appendChild(ul);
    }
    [['Assumptions', k.assumptions], ['Limitations', k.limitations]].forEach(function (pair) {
      if (!pair[1] || !pair[1].length) return;
      body.appendChild(h('div', 'dc-sub', pair[0]));
      var l = document.createElement('ul');
      pair[1].forEach(function (x) { l.appendChild(h('li', null, x)); });
      body.appendChild(l);
    });
    det.appendChild(body);
    card.appendChild(det);

    container.appendChild(card);
  }

  /* ------------------------------------------------------------- helpers */
  function seriesOf(name, filter) {
    var rows = (DATA() && DATA()[name]) || [];
    return { rows: rows, filter: filter };
  }
  function pointsOf(name, filter, field) {
    return S.toPoints((DATA() && DATA()[name]) || [], filter, field);
  }
  var isTotal = function (r) { return r.segment === 'Total'; };

  /* ------------------------------------------------------------ assemble */
  function buildKPIs() {
    var loans = seriesOf('loans_customer', isTotal);
    var deps = seriesOf('dep_segments', isTotal);
    var lendRate = seriesOf('int_rates_loans', function (r) { return r.type === 'All Loans Rate'; });
    var depRate = seriesOf('int_rates_deposits', function (r) { return r.type === 'Time Deposit Rate'; });

    var out = {};

    out.loans = C.seriesKPI({
      id: 'loans', label: 'Total Loans', rows: loans.rows, filter: loans.filter,
      unit: 'EURm', polarity: 'good-up', source: 'BQK ODC loans by maturity (Table 10)'
    });
    out.deposits = C.seriesKPI({
      id: 'deposits', label: 'Total EUR Deposits', rows: deps.rows, filter: deps.filter,
      unit: 'EURm', polarity: 'good-up', source: 'BQK deposits at ODC in euro (Table 08)',
      limitations: ['EUR deposits only; excludes non-euro deposits.']
    });
    out.ltd = C.marketLTDProxy(loans, deps);

    out.lendingRate = C.seriesKPI({
      id: 'lend', label: 'Lending Rate (new business)', rows: lendRate.rows, filter: lendRate.filter,
      unit: '%', polarity: 'good-up', source: 'BQK effective interest rates on loans (Table 13)'
    });
    out.depositRate = C.seriesKPI({
      id: 'deprate', label: 'Time Deposit Rate (new business)', rows: depRate.rows, filter: depRate.filter,
      unit: '%', polarity: 'good-down', source: 'BQK effective interest rates on deposits (Table 13a)'
    });

    out.edcp = C.estimatedDepositCostProxy({
      ca: seriesOf('new_deposits', function (r) { return r.type === 'Total Transferable'; }),
      sa: seriesOf('new_deposits', function (r) { return r.type === 'Total Savings'; }),
      tda: seriesOf('dep_maturity', null),
      tdaRate: depRate,
      expectedTdaSeries: 12
    });

    out.gap = C.pricingGap(out.lendingRate, out.edcp,
      { id: 'gap', label: 'Pricing Gap (lending − estimated deposit cost)' });

    var income = seriesOf('odc_income', null);
    var latestIncome = C.incomeRowAt(income, null);
    var incomeIdx = latestIncome ? P.toIndex(latestIncome.period) : null;

    out.niiShare = C.netInterestIncomeShare(income, incomeIdx);
    out.cti = C.costToIncome(income, incomeIdx);
    out.cor = C.costOfRisk(income, loans, incomeIdx);

    // digital momentum and card-to-cash substitution
    out.cardPayments = C.seriesKPI({
      id: 'cardpay', label: 'POS Card Payments', unit: 'count', polarity: 'good-up',
      rows: (DATA().payments || []), filter: function (r) { return r.indicator === 'POS Domestic'; },
      field: 'count', scale: 1000, source: 'BQK payment system (Table 15)',
      limitations: ['BQK publishes this count in thousands; shown here as transactions.']
    });
    out.atmCash = C.seriesKPI({
      id: 'atmcash', label: 'ATM Withdrawals', unit: 'count', polarity: 'neutral',
      rows: (DATA().payments || []), filter: function (r) { return r.indicator === 'ATM Domestic'; },
      field: 'count', scale: 1000, source: 'BQK payment system (Table 15)',
      limitations: ['BQK publishes this count in thousands; shown here as transactions.']
    });

    // card-to-cash ratio on a synchronised period
    var sync = P.latestCommonPeriod([
      { name: 'POS Domestic', rows: DATA().payments || [], filter: function (r) { return r.indicator === 'POS Domestic'; } },
      { name: 'ATM Domestic', rows: DATA().payments || [], filter: function (r) { return r.indicator === 'ATM Domestic'; } }
    ]);
    if (sync.period != null) {
      var pos = P.valueAt(DATA().payments, sync.period, function (r) { return r.indicator === 'POS Domestic'; }, 'count');
      var atm = P.valueAt(DATA().payments, sync.period, function (r) { return r.indicator === 'ATM Domestic'; }, 'count');
      out.cardToCash = C.kpi({
        id: 'c2c', label: 'Card-to-Cash Substitution', value: M.ratio(pos, atm),
        unit: null, period: sync.period, status: C.STATUS.VERIFIED, confidence: 'High',
        polarity: 'good-up',
        formula: 'POS card payments ÷ ATM withdrawals (transaction counts)',
        inputs: [{ name: 'POS Domestic', period: sync.period, value: pos },
                 { name: 'ATM Domestic', period: sync.period, value: atm }],
        limitations: ['Counts only; does not reflect transaction value.']
      });
    }

    return out;
  }

  /* --------------------------------------------------------- signal set */
  function buildSignals(k) {
    var defs = [
      {
        id: 'loan_growth', label: 'Total loans', category: 'Credit', unit: 'EURm',
        points: pointsOf('loans_customer', isTotal), status: 'Direct', polarity: 'good-up',
        observation: function (c) {
          return 'Total loans stand at ' + fmtVal(c.value, 'EURm') + ' in ' + c.period +
            (c.mom == null ? '' : ', ' + (c.mom >= 0 ? 'up' : 'down') + ' ' + Math.abs(c.mom).toFixed(2) + '% on the month') +
            (c.run > 1 ? ', a ' + c.run + '-month run in the same direction' : '') + '.';
        },
        interpretation: 'Sustained movement may reflect changing credit demand, competitive supply, or a shift in risk appetite. The aggregate cannot separate these.',
        managementQuestion: 'Is the movement concentrated in particular segments, ticket sizes or maturities?',
        limitation: 'Sector aggregate — no bank-level or industry detail is available in this dataset.'
      },
      {
        id: 'deposit_growth', label: 'EUR deposits', category: 'Funding', unit: 'EURm',
        points: pointsOf('dep_segments', isTotal), status: 'Direct', polarity: 'good-up',
        observation: function (c) {
          return 'EUR deposits stand at ' + fmtVal(c.value, 'EURm') + ' in ' + c.period +
            (c.mom == null ? '' : ', ' + (c.mom >= 0 ? 'up' : 'down') + ' ' + Math.abs(c.mom).toFixed(2) + '% on the month') + '.';
        },
        interpretation: 'Deposit growth below loan growth tightens the funding position over time.',
        managementQuestion: 'Which depositor segment is driving the change, and at what price?',
        limitation: 'EUR deposits only.'
      },
      {
        id: 'deposit_rate', label: 'Time deposit rate', category: 'Pricing', unit: '%',
        points: pointsOf('int_rates_deposits', function (r) { return r.type === 'Time Deposit Rate'; }),
        status: 'Direct', polarity: 'good-down',
        observation: function (c) {
          return 'The new-business time deposit rate is ' + c.value.toFixed(2) + '% in ' + c.period +
            (c.percentile == null ? '' : ', at the ' + c.percentile.toFixed(0) + 'th percentile of its own history') + '.';
        },
        interpretation: 'A rising deposit rate usually indicates competition for funding, but this is a new-business rate and does not reprice the existing book immediately.',
        managementQuestion: 'How much of the maturing time-deposit book reprices in the next two quarters, and at what rate?',
        limitation: 'New-business rate; not the average cost of the outstanding book.'
      },
      {
        id: 'lending_rate', label: 'Lending rate', category: 'Pricing', unit: '%',
        points: pointsOf('int_rates_loans', function (r) { return r.type === 'All Loans Rate'; }),
        status: 'Direct', polarity: 'good-up',
        observation: function (c) {
          return 'The effective rate on new loans is ' + c.value.toFixed(2) + '% in ' + c.period + '.';
        },
        interpretation: 'Movement in new-business lending rates leads the yield on the book by several quarters.',
        managementQuestion: 'Is the change a mix effect across products, or genuine repricing within them?',
        limitation: 'Weighted across products; product mix shifts move this without any repricing.'
      },
      {
        id: 'card_payments', label: 'POS card payments', category: 'Payments', unit: 'count',
        points: pointsOf('payments', function (r) { return r.indicator === 'POS Domestic'; }, 'count'),
        status: 'Direct', polarity: 'good-up',
        observation: function (c) {
          return 'Domestic POS payments reached ' + fmtVal(c.value, 'count') + ' transactions in ' + c.period +
            (c.yoy == null ? '' : ', ' + (c.yoy >= 0 ? 'up' : 'down') + ' ' + Math.abs(c.yoy).toFixed(1) + '% year over year') + '.';
        },
        interpretation: 'Growth ahead of ATM withdrawals is consistent with cash displacement, though it may also reflect terminal roll-out.',
        managementQuestion: 'Is growth coming from more cards, more active cards, or higher usage per card?',
        limitation: 'Transaction counts only; average ticket size is not controlled for.'
      }
    ];

    return S.rank(defs.map(function (d) { return S.evaluate(d); }));
  }

  /* ---------------------------------------------------------- regime set */
  function buildRegimes(k) {
    function met(points) { return R.metric(points); }
    var spreadPoints = (function () {
      var lend = pointsOf('int_rates_loans', function (r) { return r.type === 'All Loans Rate'; });
      var dep = pointsOf('int_rates_deposits', function (r) { return r.type === 'Time Deposit Rate'; });
      var byIdx = {};
      dep.forEach(function (p) { byIdx[p.index] = p.value; });
      return lend.filter(function (p) { return byIdx[p.index] != null; })
                 .map(function (p) { return { index: p.index, value: p.value - byIdx[p.index] }; });
    })();

    var ltdPoints = (function () {
      var L = pointsOf('loans_customer', isTotal), Dp = pointsOf('dep_segments', isTotal);
      var byIdx = {};
      Dp.forEach(function (p) { byIdx[p.index] = p.value; });
      return L.filter(function (p) { return byIdx[p.index]; })
              .map(function (p) { return { index: p.index, value: p.value / byIdx[p.index] * 100 }; });
    })();

    var corPoints = (function () {
      var rows = (DATA().odc_income || []).filter(function (r) { return /-12$/.test(r.period); });
      var loans = DATA().loans_customer || [];
      return rows.map(function (r) {
        var i = P.toIndex(r.period);
        var l = P.valueAt(loans, i, isTotal);
        return (l && r.loan_loss_provisions != null)
          ? { index: i, value: r.loan_loss_provisions / l * 100 } : null;
      }).filter(Boolean);
    })();

    return R.detect({
      loans: met(pointsOf('loans_customer', isTotal)),
      deposits: met(pointsOf('dep_segments', isTotal)),
      depositRate: met(pointsOf('int_rates_deposits', function (r) { return r.type === 'Time Deposit Rate'; })),
      spread: met(spreadPoints),
      ltd: met(ltdPoints),
      cor: met(corPoints),
      cardPayments: met(pointsOf('payments', function (r) { return r.indicator === 'POS Domestic'; }, 'count')),
      atmWithdrawals: met(pointsOf('payments', function (r) { return r.indicator === 'ATM Domestic'; }, 'count'))
    });
  }

  /* ------------------------------------------------------------- render */
  function renderDecisionCentre() {
    var host = el('dc-kpis');
    if (!host) return;
    clear(host);

    var k;
    try { k = buildKPIs(); }
    catch (e) {
      host.appendChild(h('div', 'dc-error', 'Decision Centre could not be built: ' + e.message));
      return;
    }

    var order = ['loans', 'deposits', 'ltd', 'lendingRate', 'depositRate', 'edcp',
                 'gap', 'niiShare', 'cti', 'cor', 'cardPayments', 'cardToCash'];
    order.forEach(function (id) { if (k[id]) renderCard(host, k[id]); });

    // synchronisation banner
    var banner = el('dc-sync');
    if (banner) {
      clear(banner);
      var sync = k.ltd.extra && k.ltd.extra.sync;
      if (sync) {
        var aligned = sync.aligned;
        banner.className = 'dc-banner ' + (aligned ? 'ok' : 'warn');
        banner.appendChild(h('strong', null, aligned
          ? 'Inputs aligned at ' + P.format(sync.period)
          : 'Combined KPIs computed at ' + P.format(sync.period)));
        banner.appendChild(h('span', null, aligned
          ? ' — every combined KPI uses the same reporting period.'
          : ' — ' + sync.lagMonths + ' month(s) behind the newest input. Limited by: ' +
            sync.limiting.join(', ') + '. Ahead: ' + sync.stale.join(', ') + '.'));
      }
    }

    // deposit-cost sensitivity
    var sens = el('dc-sensitivity');
    if (sens && k.edcp && k.edcp.extra && k.edcp.extra.sensitivity) {
      clear(sens);
      sens.appendChild(h('div', 'dc-sub', 'Savings-rate sensitivity — the savings rate is assumed, not published'));
      var tbl = document.createElement('table');
      var thead = document.createElement('thead');
      var hr = document.createElement('tr');
      ['Assumed savings rate', 'Estimated deposit cost', 'Pricing gap'].forEach(function (t) {
        hr.appendChild(h('th', null, t));
      });
      thead.appendChild(hr); tbl.appendChild(thead);
      var tb = document.createElement('tbody');
      k.edcp.extra.sensitivity.forEach(function (s) {
        var tr = document.createElement('tr');
        if (Math.abs(s.saRate - 0.05) < 1e-9) tr.className = 'dc-row-active';
        tr.appendChild(h('td', null, s.saRate.toFixed(2) + '%'));
        tr.appendChild(h('td', 'num', s.value == null ? 'N/A' : s.value.toFixed(3) + '%'));
        var gap = (k.lendingRate.value != null && s.value != null)
          ? (k.lendingRate.value - s.value) : null;
        tr.appendChild(h('td', 'num', gap == null ? 'N/A' : gap.toFixed(3) + ' pp'));
        tb.appendChild(tr);
      });
      tbl.appendChild(tb);
      sens.appendChild(tbl);
    }

    return k;
  }

  function renderSignals(k) {
    var host = el('sig-body');
    if (!host) return;
    clear(host);
    var signals;
    try { signals = buildSignals(k); }
    catch (e) {
      host.appendChild(h('div', 'dc-error', 'Signals could not be built: ' + e.message));
      return;
    }
    if (!signals.length) {
      host.appendChild(h('div', 'dc-empty', 'No signals could be evaluated on the current data.'));
      return;
    }

    signals.forEach(function (s) {
      var card = h('div', 'sig-card pri-' + s.priority.toLowerCase());
      var head = h('div', 'sig-head');
      head.appendChild(h('span', 'sig-pri', s.priority));
      head.appendChild(h('span', 'sig-metric', s.metric));
      head.appendChild(h('span', 'sig-score', 'score ' + s.score.toFixed(2)));
      card.appendChild(head);

      var stats = h('div', 'sig-stats');
      [['Latest', fmtVal(s.value, s.unit)],
       ['MoM', s.mom == null ? 'N/A' : s.mom.toFixed(2) + '%'],
       ['YoY', s.yoy == null ? 'N/A' : s.yoy.toFixed(2) + '%'],
       ['Percentile', s.percentile == null ? 'N/A' : s.percentile.toFixed(0) + 'th'],
       ['Run', s.runLength + ' mo'],
       ['Confidence', (s.confidence * 100).toFixed(0) + '%']
      ].forEach(function (p) {
        var b = h('span', 'sig-stat');
        b.appendChild(h('em', null, p[0]));
        b.appendChild(h('b', null, p[1]));
        stats.appendChild(b);
      });
      card.appendChild(stats);

      [['Observation', s.observation], ['Interpretation', s.interpretation],
       ['Management question', s.managementQuestion], ['Limitation', s.limitation]
      ].forEach(function (p) {
        if (!p[1]) return;
        var blk = h('div', 'sig-block');
        blk.appendChild(h('div', 'sig-block-label', p[0]));
        blk.appendChild(h('div', 'sig-block-text', p[1]));
        card.appendChild(blk);
      });

      host.appendChild(card);
    });
  }

  function renderRegimes() {
    var host = el('reg-body');
    if (!host) return;
    clear(host);
    var regimes;
    try { regimes = buildRegimes(); }
    catch (e) {
      host.appendChild(h('div', 'dc-error', 'Regime detection failed: ' + e.message));
      return;
    }

    regimes.forEach(function (r) {
      var card = h('div', 'reg-card ' + (r.active ? 'active' : 'inactive'));
      var head = h('div', 'reg-head');
      head.appendChild(h('span', 'reg-name', r.name));
      head.appendChild(h('span', 'reg-state', r.active ? 'ACTIVE' : 'inactive'));
      card.appendChild(head);
      card.appendChild(h('div', 'reg-rationale', r.rationale));

      if (r.conditions.length) {
        var ul = document.createElement('ul');
        ul.className = 'reg-conds';
        r.conditions.forEach(function (c) {
          var li = h('li', 'cond-' + (c.result === true ? 'met' : c.result === false ? 'unmet' : 'unknown'));
          li.appendChild(h('span', 'cond-mark',
            c.result === true ? '✓' : c.result === false ? '✕' : '?'));
          li.appendChild(h('span', null, c.description));
          ul.appendChild(li);
        });
        card.appendChild(ul);
        card.appendChild(h('div', 'reg-meta',
          r.met + ' of ' + r.total + ' conditions met · confidence ' +
          (r.confidence * 100).toFixed(0) + '%' +
          (r.unknown ? ' · ' + r.unknown + ' condition(s) could not be evaluated' : '')));
      }
      host.appendChild(card);
    });
  }

  function renderGovernance(k) {
    var host = el('dc-governance');
    if (!host) return;
    clear(host);

    var datasets = Object.keys(DATA() || {});
    var observations = datasets.reduce(function (a, key) { return a + DATA()[key].length; }, 0);
    var latest = null;
    datasets.forEach(function (key) {
      var i = P.latestIndex(DATA()[key]);
      if (i != null && (latest == null || i > latest)) latest = i;
    });

    var issues = [];
    try {
      /* Series that legitimately end, with the reason. Everything not listed
         here that stops early is treated as a genuine data defect. */
      var DISCONTINUED = {
        fx: { 'HRK': 'Croatia adopted the euro on 1 Jan 2023.' },
        loans_customer: { 'Government': 'BQK reports government lending as nil in almost every month.' }
      };
      datasets.forEach(function (name) {
        issues = issues.concat(V.validateDataset(name, DATA()[name], {
          reportGaps: false, outliers: false, discontinued: DISCONTINUED[name] || {}
        }));
      });
      issues = issues.concat(V.publicationLag(datasets.map(function (n) {
        return { name: n, rows: DATA()[n] };
      })));
    } catch (e) { /* governance panel must never break the page */ }
    var summary = V.summarise(issues);

    var rows = [
      ['Application version', APP_VERSION],
      ['Methodology version', METHODOLOGY_VERSION],
      ['Datasets loaded', String(datasets.length)],
      ['Observations', observations.toLocaleString('en')],
      ['Latest reporting period', latest == null ? 'N/A' : P.format(latest)],
      ['Validation status', summary.status],
      ['Known issues', summary.errors + ' error(s), ' + summary.warnings + ' warning(s)']
    ];
    var dl = h('div', 'gov-grid');
    rows.forEach(function (r) {
      dl.appendChild(h('div', 'gov-k', r[0]));
      dl.appendChild(h('div', 'gov-v', r[1]));
    });
    host.appendChild(dl);

    if (issues.length) {
      var det = document.createElement('details');
      det.className = 'dc-details';
      var sum = document.createElement('summary');
      sum.textContent = 'Data quality findings (' + issues.length + ')';
      det.appendChild(sum);
      var ul = document.createElement('ul');
      ul.className = 'gov-issues';
      issues.slice(0, 40).forEach(function (i) {
        ul.appendChild(h('li', 'lvl-' + i.level, '[' + i.level + '] ' + i.dataset + ' — ' + i.message));
      });
      det.appendChild(ul);
      host.appendChild(det);
    }
  }

  function init() {
    if (!DATA() || !P || !C || !S || !R || !V) {
      var host = el('dc-kpis');
      if (host) host.appendChild(h('div', 'dc-error',
        'Decision Centre unavailable: data or core modules failed to load.'));
      return;
    }
    var k = renderDecisionCentre();
    renderSignals(k);
    renderRegimes();
    renderGovernance(k);
  }

  window.KBI = window.KBI || {};
  window.KBI.DecisionCentre = { init: init, buildKPIs: buildKPIs };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
