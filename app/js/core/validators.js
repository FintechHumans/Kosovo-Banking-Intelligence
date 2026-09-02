/* =====================================================================
   KBI core — data validation and deterministic deduplication
   ---------------------------------------------------------------------
   Reports; never repairs. Anything questionable is surfaced to the user
   rather than silently smoothed, and nothing is dropped from the raw layer.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./periods.js'), require('./safe-math.js'));
  } else {
    root.KBI = root.KBI || {};
    root.KBI.Validate = factory(root.KBI.Periods, root.KBI.Math);
  }
}(typeof self !== 'undefined' ? self : this, function (P, M) {
  'use strict';

  var SEVERITY = { ERROR: 'error', WARN: 'warn', INFO: 'info' };

  function issue(level, kind, dataset, message, detail) {
    return { level: level, kind: kind, dataset: dataset, message: message, detail: detail || null };
  }

  /* Composite key for a row: period plus every string dimension. */
  function keyOf(row, dims) {
    return [P.toKey(row.period) || String(row.period)]
      .concat((dims || []).map(function (d) { return String(row[d]); }))
      .join('|');
  }

  /* Provenance fields describe an observation; they do not identify it, so
     they must never become part of the composite key — otherwise a
     provisional and a final reading of the same month look like two
     different series and never collide. */
  var META_FIELDS = ['status', 'source', 'publishedAt', 'loadedAt', 'notes', 'revision', 'unit'];

  function dimensionsOf(rows) {
    if (!rows || !rows.length) return [];
    return Object.keys(rows[0]).filter(function (k) {
      return k !== 'period' && typeof rows[0][k] === 'string' && META_FIELDS.indexOf(k) < 0;
    });
  }

  /* ---- deterministic deduplication (Phase 2.4) --------------------------
     Replaces "keep the largest value", which had no methodological basis
     and biased revised series upward.

     Priority:
       1. explicitly final over provisional
       2. later official publication (publishedAt / loadedAt)
       3. declared source priority
       4. later position in the source file (revisions are appended)
     A duplicate that none of these can separate is kept in the raw layer,
     excluded from calculations, and reported. */
  function dedupe(rows, opts) {
    opts = opts || {};
    var dims = opts.dimensions || dimensionsOf(rows);
    var priority = opts.sourcePriority || {};
    var groups = Object.create(null);

    (rows || []).forEach(function (r, i) {
      var k = keyOf(r, dims);
      (groups[k] = groups[k] || []).push({ row: r, order: i });
    });

    var kept = [], conflicts = [], resolved = 0;

    Object.keys(groups).forEach(function (k) {
      var g = groups[k];
      if (g.length === 1) { kept.push(g[0].row); return; }

      var identical = g.every(function (e) {
        return e.row.value === g[0].row.value;
      });
      if (identical) { kept.push(g[0].row); resolved++; return; }

      var ranked = g.slice().sort(function (a, b) {
        var ap = a.row, bp = b.row;
        // 1. final beats provisional
        var af = isProvisional(ap) ? 1 : 0, bf = isProvisional(bp) ? 1 : 0;
        if (af !== bf) return af - bf;
        // 2. later official publication
        var at = Date.parse(ap.publishedAt || ap.loadedAt || '') || 0;
        var bt = Date.parse(bp.publishedAt || bp.loadedAt || '') || 0;
        if (at !== bt) return bt - at;
        // 3. declared source priority (lower number wins)
        var as = priority[ap.source] == null ? 99 : priority[ap.source];
        var bs = priority[bp.source] == null ? 99 : priority[bp.source];
        if (as !== bs) return as - bs;
        // 4. later row in the file
        return b.order - a.order;
      });

      var winner = ranked[0], runnerUp = ranked[1];
      var separable = isProvisional(winner.row) !== isProvisional(runnerUp.row) ||
        (Date.parse(winner.row.publishedAt || winner.row.loadedAt || '') || 0) !==
        (Date.parse(runnerUp.row.publishedAt || runnerUp.row.loadedAt || '') || 0) ||
        (priority[winner.row.source] == null ? 99 : priority[winner.row.source]) !==
        (priority[runnerUp.row.source] == null ? 99 : priority[runnerUp.row.source]);

      if (separable) {
        kept.push(winner.row);
        resolved++;
      } else {
        conflicts.push({
          key: k,
          values: g.map(function (e) { return e.row.value; }),
          reason: 'no final/publication/source signal distinguishes these observations'
        });
      }
    });

    return { rows: kept, conflicts: conflicts, resolved: resolved, duplicateGroups: resolved + conflicts.length };
  }

  function isProvisional(row) {
    if (row.status) return /prov|prelim/i.test(row.status);
    return /\(\s*p\s*\)/i.test(String(row.period || ''));
  }

  /* ---- dataset-level checks -------------------------------------------- */
  function validateDataset(name, rows, spec) {
    spec = spec || {};
    var out = [];
    if (!rows || !rows.length) {
      out.push(issue(SEVERITY.ERROR, 'empty', name, 'Dataset is empty.'));
      return out;
    }

    var dims = spec.dimensions || dimensionsOf(rows);
    var field = spec.field || 'value';

    // composite-key uniqueness
    var seen = Object.create(null), dupes = 0;
    rows.forEach(function (r) {
      var k = keyOf(r, dims);
      if (seen[k]) dupes++; else seen[k] = true;
    });
    if (dupes) {
      out.push(issue(SEVERITY.ERROR, 'duplicate keys', name,
        dupes + ' duplicate (period + dimension) key(s). Excluded from calculations until resolved.'));
    }

    // unparseable periods
    var badPeriods = rows.filter(function (r) { return P.toIndex(r.period) == null; });
    if (badPeriods.length) {
      out.push(issue(SEVERITY.WARN, 'non-monthly period', name,
        badPeriods.length + ' row(s) carry a period that is not a month (annual or quarterly labels).',
        badPeriods.slice(0, 5).map(function (r) { return String(r.period); })));
    }

    // per-series continuity and range
    var bySeries = Object.create(null);
    rows.forEach(function (r) {
      var k = dims.map(function (d) { return r[d]; }).join(' | ') || '(single)';
      (bySeries[k] = bySeries[k] || []).push(r);
    });

    var latestBySeries = [];
    Object.keys(bySeries).forEach(function (k) {
      var ix = P.indicesOf(bySeries[k]);
      if (!ix.length) return;
      latestBySeries.push({ series: k, latest: ix[ix.length - 1] });

      var freq = P.detectFrequency(ix);
      var step = freq.indexOf('quarterly') === 0 ? 3 : freq.indexOf('annual') === 0 ? 12 : 1;
      var gaps = P.missingPeriods(ix, step);
      if (gaps.length && spec.reportGaps !== false) {
        out.push(issue(SEVERITY.WARN, 'missing periods', name,
          k + ': ' + gaps.length + ' missing ' + (step === 1 ? 'month' : 'period') + '(s).',
          gaps.slice(0, 6).map(P.format)));
      }

      if (spec.min != null || spec.max != null) {
        bySeries[k].forEach(function (r) {
          var v = M.num(r[field]);
          if (v == null) return;
          if ((spec.min != null && v < spec.min) || (spec.max != null && v > spec.max)) {
            out.push(issue(SEVERITY.ERROR, 'out of range', name,
              k + ' at ' + P.format(P.toIndex(r.period)) + ': ' + v + ' is outside the expected range.'));
          }
        });
      }

      // robust outlier detection — reported, never removed
      if (spec.outliers !== false) {
        var vals = bySeries[k].map(function (r) { return M.num(r[field]); });
        var last = vals[vals.length - 1];
        var z = M.madOutlierScore(last, vals);
        if (z != null && Math.abs(z) > 6) {
          out.push(issue(SEVERITY.WARN, 'outlier', name,
            k + ': latest observation is ' + z.toFixed(1) + ' robust deviations from the median. Not removed — verify before use.'));
        }
      }
    });

    // series that stop early relative to the dataset
    if (latestBySeries.length > 1) {
      var newest = Math.max.apply(null, latestBySeries.map(function (s) { return s.latest; }));
      var discontinued = spec.discontinued || {};
      var lagging = latestBySeries.filter(function (s) {
        return s.latest < newest && !discontinued[s.series];
      });
      if (lagging.length) {
        out.push(issue(SEVERITY.ERROR, 'incomplete latest period', name,
          lagging.length + ' of ' + latestBySeries.length + ' series stop before ' + P.format(newest) +
          '. Totals at the latest period are understated.',
          lagging.slice(0, 8).map(function (s) { return s.series + ' → ' + P.format(s.latest); })));
      }
    }

    return out;
  }

  /* Components must reconcile to the published total. */
  function reconcile(name, rows, opts) {
    var out = [];
    var totalKey = opts.total, parts = opts.parts, dim = opts.dimension;
    var tol = opts.tolerance == null ? 0.005 : opts.tolerance;

    var byPeriod = Object.create(null);
    rows.forEach(function (r) {
      var i = P.toIndex(r.period);
      if (i == null) return;
      (byPeriod[i] = byPeriod[i] || []).push(r);
    });

    var breaches = [];
    Object.keys(byPeriod).forEach(function (i) {
      var g = byPeriod[i];
      var total = null, sum = 0, found = 0;
      g.forEach(function (r) {
        if (r[dim] === totalKey) total = M.num(r.value);
        else if (parts.indexOf(r[dim]) >= 0) {
          var v = M.num(r.value);
          if (v != null) { sum += v; found++; }
        }
      });
      if (total == null || !found) return;
      var diff = Math.abs(sum - total) / Math.max(Math.abs(total), 1e-9);
      if (diff > tol) breaches.push({ period: Number(i), total: total, sum: sum, diff: diff * 100 });
    });

    if (breaches.length) {
      breaches.sort(function (a, b) { return b.diff - a.diff; });
      out.push(issue(SEVERITY.WARN, 'reconciliation', name,
        breaches.length + ' period(s) where ' + parts.length + ' components differ from the published total by more than ' +
        (tol * 100).toFixed(1) + '%. Worst: ' + P.format(breaches[0].period) + ' at ' + breaches[0].diff.toFixed(2) + '%.',
        breaches.slice(0, 5).map(function (b) {
          return P.format(b.period) + ': total ' + b.total.toFixed(1) + ' vs components ' + b.sum.toFixed(1);
        })));
    }
    return out;
  }

  /* Cross-dataset publication lag. */
  function publicationLag(datasets) {
    var out = [];
    var latest = datasets.map(function (d) {
      return { name: d.name, latest: P.latestIndex(d.rows) };
    }).filter(function (d) { return d.latest != null; });
    if (latest.length < 2) return out;

    var newest = Math.max.apply(null, latest.map(function (d) { return d.latest; }));
    latest.forEach(function (d) {
      var lag = newest - d.latest;
      if (lag >= 3) {
        out.push(issue(SEVERITY.INFO, 'publication lag', d.name,
          d.name + ' is ' + lag + ' month(s) behind the newest dataset (ends ' + P.format(d.latest) + ').'));
      }
    });
    return out;
  }

  function summarise(issues) {
    return {
      issues: issues,
      errors: issues.filter(function (i) { return i.level === SEVERITY.ERROR; }).length,
      warnings: issues.filter(function (i) { return i.level === SEVERITY.WARN; }).length,
      info: issues.filter(function (i) { return i.level === SEVERITY.INFO; }).length,
      status: issues.some(function (i) { return i.level === SEVERITY.ERROR; }) ? 'FAILED'
            : issues.some(function (i) { return i.level === SEVERITY.WARN; }) ? 'PASSED WITH WARNINGS'
            : 'PASSED'
    };
  }

  return {
    SEVERITY: SEVERITY,
    keyOf: keyOf,
    dimensionsOf: dimensionsOf,
    META_FIELDS: META_FIELDS,
    dedupe: dedupe,
    isProvisional: isProvisional,
    validateDataset: validateDataset,
    reconcile: reconcile,
    publicationLag: publicationLag,
    summarise: summarise
  };
}));
