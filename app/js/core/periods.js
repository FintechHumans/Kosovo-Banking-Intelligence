/* =====================================================================
   KBI core — period algebra
   ---------------------------------------------------------------------
   The blob carries two period spellings ('2026 July' and '2026-07') and
   three frequencies (monthly, quarterly, annual). Every comparison in the
   application depends on turning those into one comparable integer index,
   so that logic lives here and nowhere else.

   Works in the browser (window.KBI.Periods) and in Node (require) so the
   same code is what the tests exercise.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.KBI = root.KBI || {}; root.KBI.Periods = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
  var SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var MONTH_NUM = {};
  MONTHS_EN.forEach(function (m, i) { MONTH_NUM[m] = i + 1; });
  // Albanian spellings appear in a few carried-forward series
  var SQ = { 'Janar': 1, 'Shkurt': 2, 'Mars': 3, 'Prill': 4, 'Maj': 5, 'Qershor': 6,
             'Korrik': 7, 'Gusht': 8, 'Shtator': 9, 'Tetor': 10, 'Nëntor': 11,
             'Nentor': 11, 'Dhjetor': 12 };
  Object.keys(SQ).forEach(function (k) { MONTH_NUM[k] = SQ[k]; });

  /* 'YYYY-MM' | 'YYYY Month' -> {year, month} or null.
     Provisional markers ('(p)') and stray whitespace are tolerated. Bare
     years and quarter labels ('2009 T4') are deliberately NOT monthly and
     return null so they cannot silently enter a monthly comparison. */
  function parse(period) {
    if (period == null) return null;
    var s = String(period).replace(/\(\s*p\s*\)/gi, '').replace(/\s+/g, ' ').trim();
    if (!s) return null;

    var m = /^(\d{4})-(\d{1,2})$/.exec(s);
    if (m) {
      var mo = parseInt(m[2], 10);
      if (mo < 1 || mo > 12) return null;
      return { year: parseInt(m[1], 10), month: mo };
    }

    m = /^(\d{4})\s+(.+)$/.exec(s);
    if (m && MONTH_NUM[m[2]]) return { year: parseInt(m[1], 10), month: MONTH_NUM[m[2]] };

    return null;
  }

  /* Comparable integer: year*12 + month. Null for non-monthly labels. */
  function toIndex(period) {
    var p = parse(period);
    return p ? p.year * 12 + p.month : null;
  }

  function fromIndex(idx) {
    if (idx == null) return null;
    var y = Math.floor((idx - 1) / 12);
    var m = ((idx - 1) % 12) + 1;
    return y + '-' + (m < 10 ? '0' + m : String(m));
  }

  function toKey(period) { return fromIndex(toIndex(period)); }

  /* 'Jul 2026' for display. */
  function format(period) {
    var idx = typeof period === 'number' ? period : toIndex(period);
    if (idx == null) return '—';
    var y = Math.floor((idx - 1) / 12);
    var m = ((idx - 1) % 12) + 1;
    return SHORT[m - 1] + ' ' + y;
  }

  function previousMonth(idx) { return idx == null ? null : idx - 1; }
  function sameMonthPreviousYear(idx) { return idx == null ? null : idx - 12; }
  function monthsBetween(a, b) { return (a == null || b == null) ? null : a - b; }

  /* Distinct sorted period indices present in a series. `rows` is any array
     of objects carrying a `period`; `filter` narrows to one dimension. */
  function indicesOf(rows, filter) {
    var seen = Object.create(null);
    (rows || []).forEach(function (r) {
      if (filter && !filter(r)) return;
      var i = toIndex(r.period);
      if (i != null) seen[i] = true;
    });
    return Object.keys(seen).map(Number).sort(function (a, b) { return a - b; });
  }

  function latestIndex(rows, filter) {
    var ix = indicesOf(rows, filter);
    return ix.length ? ix[ix.length - 1] : null;
  }

  /* Infer frequency from the modal gap between consecutive observations.
     Reported so a "monthly change" is never computed across a quarterly
     boundary without the caller knowing. */
  function detectFrequency(indices) {
    if (!indices || indices.length < 3) return 'unknown';
    var gaps = {};
    for (var i = 1; i < indices.length; i++) {
      var g = indices[i] - indices[i - 1];
      gaps[g] = (gaps[g] || 0) + 1;
    }
    var modal = null, best = -1, total = 0;
    Object.keys(gaps).forEach(function (g) {
      total += gaps[g];
      if (gaps[g] > best) { best = gaps[g]; modal = parseInt(g, 10); }
    });
    var dominance = best / total;
    var name = modal === 1 ? 'monthly'
             : modal === 3 ? 'quarterly'
             : modal === 12 ? 'annual'
             : 'irregular';
    return dominance < 0.8 ? 'irregular (mostly ' + name + ')' : name;
  }

  /* Gaps in an otherwise-regular sequence — surfaced, never filled. */
  function missingPeriods(indices, step) {
    if (!indices || indices.length < 2) return [];
    var s = step || 1, out = [];
    for (var i = 1; i < indices.length; i++) {
      for (var k = indices[i - 1] + s; k < indices[i]; k += s) out.push(k);
    }
    return out;
  }

  /* ---- the common-period rule -------------------------------------
     P* = max( P_A ∩ P_B ∩ ... ∩ P_n )

     Returns the latest period for which EVERY input has an observation,
     plus each input's own latest, so a caller can show the mismatch
     rather than quietly comparing different months. */
  function latestCommonPeriod(seriesList) {
    var inputs = (seriesList || []).map(function (s) {
      var ix = indicesOf(s.rows, s.filter);
      return {
        name: s.name,
        indices: ix,
        latest: ix.length ? ix[ix.length - 1] : null,
        frequency: detectFrequency(ix)
      };
    });

    if (!inputs.length) return { period: null, inputs: [], aligned: false, lagMonths: null };

    var common = null;
    inputs.forEach(function (inp) {
      var set = Object.create(null);
      inp.indices.forEach(function (i) { set[i] = true; });
      if (common === null) common = set;
      else {
        Object.keys(common).forEach(function (k) { if (!set[k]) delete common[k]; });
      }
    });

    var keys = Object.keys(common || {}).map(Number).sort(function (a, b) { return a - b; });
    var period = keys.length ? keys[keys.length - 1] : null;

    var latests = inputs.map(function (i) { return i.latest; }).filter(function (v) { return v != null; });
    var newest = latests.length ? Math.max.apply(null, latests) : null;

    return {
      period: period,
      inputs: inputs,
      newestInput: newest,
      aligned: period != null && newest != null && period === newest,
      lagMonths: (period != null && newest != null) ? newest - period : null,
      stale: inputs.filter(function (i) { return i.latest != null && period != null && i.latest > period; })
                   .map(function (i) { return i.name; }),
      limiting: inputs.filter(function (i) { return i.latest === period; })
                      .map(function (i) { return i.name; })
    };
  }

  /* Value lookup at an exact index. Returns undefined when absent so the
     caller can distinguish "missing" from a legitimate zero. */
  function valueAt(rows, index, filter, field) {
    var f = field || 'value';
    for (var i = 0; i < (rows || []).length; i++) {
      var r = rows[i];
      if (filter && !filter(r)) continue;
      if (toIndex(r.period) === index) return r[f];
    }
    return undefined;
  }

  return {
    MONTHS_EN: MONTHS_EN,
    parse: parse,
    toIndex: toIndex,
    fromIndex: fromIndex,
    toKey: toKey,
    format: format,
    previousMonth: previousMonth,
    sameMonthPreviousYear: sameMonthPreviousYear,
    monthsBetween: monthsBetween,
    indicesOf: indicesOf,
    latestIndex: latestIndex,
    detectFrequency: detectFrequency,
    missingPeriods: missingPeriods,
    latestCommonPeriod: latestCommonPeriod,
    valueAt: valueAt
  };
}));
