/* =====================================================================
   KBI core — signal detection and ranking
   ---------------------------------------------------------------------
       SignalScore = Materiality × Persistence × Confidence

   Each factor is bounded 0–1 so the score is bounded 0–1 and comparable
   across metrics of different units.

   A signal states an OBSERVATION (what the data shows), an
   INTERPRETATION (what it might mean, hedged) and a MANAGEMENT QUESTION
   (what to go and find out). Inferred causes are never presented as fact.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./periods.js'), require('./safe-math.js'));
  } else {
    root.KBI = root.KBI || {};
    root.KBI.Signals = factory(root.KBI.Periods, root.KBI.Math);
  }
}(typeof self !== 'undefined' ? self : this, function (P, M) {
  'use strict';

  var CONFIDENCE_BY_STATUS = {
    'Direct': 1.00,
    'Verified': 0.90,
    'Proxy': 0.60,
    'Estimated': 0.40,
    'Unavailable': 0.00
  };

  /* Sorted [{index, value}] for a series. */
  function toPoints(rows, filter, field) {
    var f = field || 'value';
    var pts = [];
    (rows || []).forEach(function (r) {
      if (filter && !filter(r)) return;
      var i = P.toIndex(r.period);
      var v = M.num(r[f]);
      if (i != null && v != null) pts.push({ index: i, value: v });
    });
    pts.sort(function (a, b) { return a.index - b.index; });
    return pts;
  }

  /* How many consecutive months the month-over-month change kept its sign. */
  function runLength(points) {
    if (!points || points.length < 3) return 0;
    var deltas = [];
    for (var i = 1; i < points.length; i++) {
      if (points[i].index - points[i - 1].index !== 1) { deltas = []; continue; }
      deltas.push(points[i].value - points[i - 1].value);
    }
    if (!deltas.length) return 0;
    var last = deltas[deltas.length - 1];
    if (last === 0) return 0;
    var sign = last > 0 ? 1 : -1, run = 0;
    for (var j = deltas.length - 1; j >= 0; j--) {
      if ((deltas[j] > 0 ? 1 : deltas[j] < 0 ? -1 : 0) !== sign) break;
      run++;
    }
    return run;
  }

  /* Materiality has two independent sources, and the stronger wins:

       shock     the latest month-over-month move is unusual against the
                 distribution of past monthly moves (robust z-score)
       extremity the current LEVEL sits far from the middle of its own
                 history (percentile distance from the median)

     Shock alone misses a metric that has drifted to a multi-year extreme
     without any single dramatic month, which is exactly the kind of slow
     move a management team needs flagged. */
  function materiality(points) {
    if (!points || points.length < 14) return { value: 0, z: null, reason: 'insufficient history' };

    var values = points.map(function (p) { return p.value; });
    var pct = M.percentileRank(points[points.length - 1].value, values);
    var extremity = pct == null ? 0 : M.clamp(Math.abs(pct - 50) / 50, 0, 1);

    var deltas = [];
    for (var i = 1; i < points.length; i++) {
      if (points[i].index - points[i - 1].index !== 1) continue;
      deltas.push(M.pctChange(points[i].value, points[i - 1].value));
    }
    deltas = deltas.filter(function (d) { return d != null; });

    var shock = 0, z = null;
    if (deltas.length >= 12) {
      var last = deltas[deltas.length - 1];
      z = M.madOutlierScore(last, deltas);
      if (z != null) shock = M.clamp(Math.abs(z) / 4, 0, 1);
    }

    return { value: Math.max(shock, extremity), z: z, shock: shock, extremity: extremity };
  }

  function persistence(run) {
    // 1 month carries little information; 4+ consecutive months is a trend
    return M.clamp((run - 1) / 3, 0, 1);
  }

  function confidenceOf(status, completeness) {
    var base = CONFIDENCE_BY_STATUS[status] == null ? 0.5 : CONFIDENCE_BY_STATUS[status];
    return M.clamp(base * (completeness == null ? 1 : completeness), 0, 1);
  }

  function priorityOf(score) {
    return score >= 0.60 ? 'High' : score >= 0.30 ? 'Medium' : 'Low';
  }

  /* Build one signal from a series plus narrative supplied by the caller.
     The narrative is authored per metric — it is not generated from the
     number, so it cannot overstate what the data supports. */
  function evaluate(spec) {
    var pts = spec.points || toPoints(spec.rows, spec.filter, spec.field);
    if (pts.length < 2) return null;

    var latest = pts[pts.length - 1];
    var prev = pts[pts.length - 2];
    var momValue = (latest.index - prev.index === 1)
      ? M.pctChange(latest.value, prev.value) : null;

    var yoyPoint = null;
    for (var i = pts.length - 1; i >= 0; i--) {
      if (pts[i].index === latest.index - 12) { yoyPoint = pts[i]; break; }
    }
    var yoyValue = yoyPoint ? M.pctChange(latest.value, yoyPoint.value) : null;

    var values = pts.map(function (p) { return p.value; });
    var pct = M.percentileRank(latest.value, values);
    var run = runLength(pts);
    var mat = materiality(pts);
    var per = persistence(run);
    var conf = confidenceOf(spec.status, spec.completeness);
    var score = mat.value * per * conf;

    // A large single move still deserves attention even without a run.
    if (per === 0 && mat.value > 0.75) score = mat.value * 0.34 * conf;

    return {
      id: spec.id,
      metric: spec.label,
      category: spec.category || 'General',
      period: latest.index,
      periodLabel: P.format(latest.index),
      value: latest.value,
      unit: spec.unit || null,
      mom: momValue,
      yoy: yoyValue,
      percentile: pct,
      runLength: run,
      direction: momValue == null ? 'flat' : momValue > 0 ? 'up' : momValue < 0 ? 'down' : 'flat',
      materiality: mat.value,
      robustZ: mat.z,
      persistence: per,
      confidence: conf,
      score: score,
      priority: priorityOf(score),
      polarity: spec.polarity || 'neutral',
      observation: spec.observation ? spec.observation({
        value: latest.value, mom: momValue, yoy: yoyValue, run: run,
        percentile: pct, period: P.format(latest.index)
      }) : null,
      interpretation: spec.interpretation || null,
      managementQuestion: spec.managementQuestion || null,
      limitation: spec.limitation || null,
      status: spec.status || 'Direct'
    };
  }

  /* Whether a move is favourable, given what the metric measures. Used for
     colour: not every increase is good. */
  function assessment(signal) {
    if (!signal || signal.direction === 'flat') return 'neutral';
    var up = signal.direction === 'up';
    switch (signal.polarity) {
      case 'good-up':   return up ? 'positive' : 'negative';
      case 'good-down': return up ? 'negative' : 'positive';
      case 'threshold': return 'attention';
      default:          return 'neutral';
    }
  }

  function rank(signals) {
    return (signals || [])
      .filter(Boolean)
      .sort(function (a, b) { return b.score - a.score; });
  }

  return {
    toPoints: toPoints,
    runLength: runLength,
    materiality: materiality,
    persistence: persistence,
    confidenceOf: confidenceOf,
    priorityOf: priorityOf,
    evaluate: evaluate,
    assessment: assessment,
    rank: rank,
    CONFIDENCE_BY_STATUS: CONFIDENCE_BY_STATUS
  };
}));
