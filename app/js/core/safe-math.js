/* =====================================================================
   KBI core — null-safe arithmetic
   ---------------------------------------------------------------------
   The rule this module exists to enforce: **zero is a value, not a gap.**

   The previous implementation used `if (!x)` and `a || null`, which treats
   a legitimate zero observation as missing. A fall from a positive value to
   zero must read −100%, and a zero balance must plot as zero rather than
   breaking the line.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.KBI = root.KBI || {}; root.KBI.Math = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** A finite number — zero included, NaN and null excluded. */
  function isNum(v) {
    return typeof v === 'number' && isFinite(v);
  }

  /** Coerce to number|null without swallowing zero. */
  function num(v) {
    if (v == null) return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (typeof v === 'string') {
      var s = v.trim().replace(/,/g, '');
      if (s === '') return null;
      var n = Number(s);
      return isFinite(n) ? n : null;
    }
    return null;
  }

  /* Percentage change.

     pctChange(0, 100)   -> -100      a real collapse, not a gap
     pctChange(100, 0)   -> null      undefined: no base to grow from
     pctChange(50, -20)  -> uses |base| so the sign means direction, not
                            an artefact of a negative denominator
     pctChange(x, null)  -> null      genuinely unknown */
  function pctChange(current, previous) {
    var c = num(current), p = num(previous);
    if (c == null || p == null) return null;
    if (p === 0) return null;                 // division by zero is undefined
    return ((c - p) / Math.abs(p)) * 100;
  }

  /** Why a pctChange came back null — for honest UI messaging. */
  function pctChangeReason(current, previous) {
    var c = num(current), p = num(previous);
    if (p == null) return 'comparable period unavailable';
    if (c == null) return 'current period unavailable';
    if (p === 0) return 'base period is zero — growth undefined';
    return null;
  }

  /** Absolute difference; null only when an input is genuinely absent. */
  function delta(current, previous) {
    var c = num(current), p = num(previous);
    return (c == null || p == null) ? null : c - p;
  }

  /** a / b guarded against a zero or missing denominator. */
  function ratio(a, b) {
    var x = num(a), y = num(b);
    if (x == null || y == null || y === 0) return null;
    return x / y;
  }

  /** part / total as a percentage. */
  function share(part, total) {
    var r = ratio(part, total);
    return r == null ? null : r * 100;
  }

  /** Sum that ignores missing entries but keeps zeros, and reports coverage. */
  function sum(values) {
    var total = 0, present = 0, missing = 0;
    (values || []).forEach(function (v) {
      var n = num(v);
      if (n == null) { missing++; return; }
      total += n; present++;
    });
    return { value: present ? total : null, present: present, missing: missing };
  }

  /** Weighted average; weights and values must align. */
  function weightedAverage(pairs) {
    var wsum = 0, acc = 0, used = 0, skipped = 0;
    (pairs || []).forEach(function (p) {
      var v = num(p.value), w = num(p.weight);
      if (v == null || w == null) { skipped++; return; }
      acc += v * w; wsum += w; used++;
    });
    if (!used || wsum === 0) return { value: null, used: used, skipped: skipped };
    return { value: acc / wsum, used: used, skipped: skipped, weightTotal: wsum };
  }

  /** Annualise a year-to-date flow observed at month m (1–12). */
  function annualiseYTD(ytdValue, month) {
    var v = num(ytdValue), m = num(month);
    if (v == null || m == null || m < 1 || m > 12) return null;
    if (m === 12) return v;                   // already a full year
    return v * (12 / m);
  }

  /** Mean of the numeric entries; null if none. */
  function mean(values) {
    var s = sum(values);
    return s.value == null ? null : s.value / s.present;
  }

  /** Percentile rank of `value` within `values` (0–100). */
  function percentileRank(value, values) {
    var v = num(value);
    if (v == null) return null;
    var arr = (values || []).map(num).filter(function (x) { return x != null; });
    if (arr.length < 2) return null;
    var below = arr.filter(function (x) { return x < v; }).length;
    var equal = arr.filter(function (x) { return x === v; }).length;
    return ((below + 0.5 * equal) / arr.length) * 100;
  }

  /** Median absolute deviation — outlier detection that survives outliers. */
  function madOutlierScore(value, values) {
    var v = num(value);
    var arr = (values || []).map(num).filter(function (x) { return x != null; }).sort(function (a, b) { return a - b; });
    if (v == null || arr.length < 8) return null;
    var mid = function (a) {
      var n = a.length;
      return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
    };
    var med = mid(arr);
    var devs = arr.map(function (x) { return Math.abs(x - med); }).sort(function (a, b) { return a - b; });
    var mad = mid(devs);
    if (mad === 0) return null;
    return (v - med) / (1.4826 * mad);        // robust z-score
  }

  function round(v, dp) {
    var n = num(v);
    if (n == null) return null;
    var f = Math.pow(10, dp == null ? 4 : dp);
    return Math.round(n * f) / f;
  }

  function clamp(v, lo, hi) {
    var n = num(v);
    return n == null ? null : Math.min(hi, Math.max(lo, n));
  }

  return {
    isNum: isNum,
    num: num,
    pctChange: pctChange,
    pctChangeReason: pctChangeReason,
    delta: delta,
    ratio: ratio,
    share: share,
    sum: sum,
    weightedAverage: weightedAverage,
    annualiseYTD: annualiseYTD,
    mean: mean,
    percentileRank: percentileRank,
    madOutlierScore: madOutlierScore,
    round: round,
    clamp: clamp
  };
}));
