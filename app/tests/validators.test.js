/* Phase 13 — validation and deduplication tests. */
'use strict';
const P = require('../js/core/periods.js');
const V = require('../js/core/validators.js');

module.exports = function (t) {

  t.describe('deterministic deduplication', () => {
    t.it('prefers a final observation over a provisional one', () => {
      const rows = [
        { period: '2026-01', channel: 'Total', value: 120, status: 'provisional' },
        { period: '2026-01', channel: 'Total', value: 100, status: 'final' }
      ];
      const r = V.dedupe(rows);
      t.eq(r.rows.length, 1);
      t.eq(r.rows[0].value, 100, 'the final figure must win, not the larger one');
      t.eq(r.conflicts.length, 0);
    });

    t.it('prefers the later official publication', () => {
      const rows = [
        { period: '2026-01', channel: 'Total', value: 130, publishedAt: '2026-02-01' },
        { period: '2026-01', channel: 'Total', value: 110, publishedAt: '2026-03-01' }
      ];
      t.eq(V.dedupe(rows).rows[0].value, 110);
    });

    t.it('honours declared source priority', () => {
      const rows = [
        { period: '2026-01', channel: 'Total', value: 150, source: 'mirror' },
        { period: '2026-01', channel: 'Total', value: 100, source: 'bqk' }
      ];
      const r = V.dedupe(rows, { sourcePriority: { bqk: 1, mirror: 2 } });
      t.eq(r.rows[0].value, 100);
    });

    t.it('does NOT simply keep the largest value', () => {
      // the pre-fix rule kept the maximum, biasing revised series upward
      const rows = [
        { period: '2026-01', channel: 'Total', value: 999, status: 'provisional' },
        { period: '2026-01', channel: 'Total', value: 100, status: 'final' }
      ];
      t.ok(V.dedupe(rows).rows[0].value !== 999, 'largest-wins must not survive');
    });

    t.it('collapses identical duplicates silently', () => {
      const rows = [
        { period: '2026-01', channel: 'Total', value: 100 },
        { period: '2026-01', channel: 'Total', value: 100 }
      ];
      const r = V.dedupe(rows);
      t.eq(r.rows.length, 1);
      t.eq(r.conflicts.length, 0);
    });

    t.it('reports an unresolvable conflict instead of guessing', () => {
      const rows = [
        { period: '2026-01', channel: 'Total', value: 120 },
        { period: '2026-01', channel: 'Total', value: 100 }
      ];
      const r = V.dedupe(rows);
      t.eq(r.conflicts.length, 1);
      t.eq(r.rows.length, 0, 'an unresolved conflict is excluded from calculations');
    });

    t.it('keeps distinct dimensions apart', () => {
      const rows = [
        { period: '2026-01', channel: 'Banks', value: 60 },
        { period: '2026-01', channel: 'MTOs', value: 40 }
      ];
      t.eq(V.dedupe(rows).rows.length, 2);
    });
  });

  t.describe('dataset validation', () => {
    t.it('detects duplicate composite keys', () => {
      const rows = [
        { period: '2026-01', segment: 'Total', value: 1 },
        { period: '2026-01', segment: 'Total', value: 2 }
      ];
      const out = V.validateDataset('x', rows);
      t.ok(out.some(i => i.kind === 'duplicate keys'));
    });

    t.it('flags series that stop before the dataset latest', () => {
      const rows = [
        { period: '2026-06', segment: 'A', value: 1 },
        { period: '2026-07', segment: 'A', value: 1 },
        { period: '2026-06', segment: 'B', value: 1 }
      ];
      const out = V.validateDataset('x', rows, { reportGaps: false });
      const hit = out.find(i => i.kind === 'incomplete latest period');
      t.ok(hit, 'a lagging series must be reported');
      t.ok(/understated/.test(hit.message));
    });

    t.it('reports gaps without filling them', () => {
      const rows = [
        { period: '2026-01', segment: 'A', value: 1 },
        { period: '2026-02', segment: 'A', value: 1 },
        { period: '2026-05', segment: 'A', value: 1 }
      ];
      const out = V.validateDataset('x', rows);
      t.ok(out.some(i => i.kind === 'missing periods'));
    });

    t.it('flags values outside a declared range', () => {
      const rows = [
        { period: '2026-01', segment: 'A', value: 150 },
        { period: '2026-02', segment: 'A', value: 50 }
      ];
      const out = V.validateDataset('shares', rows, { min: 0, max: 100, reportGaps: false });
      t.ok(out.some(i => i.kind === 'out of range'));
    });

    t.it('accepts a clean dataset', () => {
      const rows = [
        { period: '2026-05', segment: 'A', value: 1 },
        { period: '2026-06', segment: 'A', value: 2 },
        { period: '2026-07', segment: 'A', value: 3 }
      ];
      t.eq(V.validateDataset('clean', rows).length, 0);
    });
  });

  t.describe('component reconciliation', () => {
    t.it('passes when components sum to the total', () => {
      const rows = [
        { period: '2026-07', segment: 'Total', value: 100 },
        { period: '2026-07', segment: 'A', value: 60 },
        { period: '2026-07', segment: 'B', value: 40 }
      ];
      const out = V.reconcile('x', rows, { total: 'Total', parts: ['A', 'B'], dimension: 'segment' });
      t.eq(out.length, 0);
    });

    t.it('flags a breach beyond tolerance', () => {
      const rows = [
        { period: '2026-07', segment: 'Total', value: 100 },
        { period: '2026-07', segment: 'A', value: 60 },
        { period: '2026-07', segment: 'B', value: 20 }
      ];
      const out = V.reconcile('x', rows, { total: 'Total', parts: ['A', 'B'], dimension: 'segment' });
      t.eq(out.length, 1);
      t.ok(/differ from the published total/.test(out[0].message));
    });
  });

  t.describe('publication lag', () => {
    t.it('reports datasets three or more months behind', () => {
      const out = V.publicationLag([
        { name: 'fresh', rows: [{ period: '2026-07', value: 1 }] },
        { name: 'stale', rows: [{ period: '2025-12', value: 1 }] }
      ]);
      t.eq(out.length, 1);
      t.eq(out[0].dataset, 'stale');
    });
  });

  t.describe('summary', () => {
    t.it('fails on an error and warns on a warning', () => {
      t.eq(V.summarise([{ level: 'error' }]).status, 'FAILED');
      t.eq(V.summarise([{ level: 'warn' }]).status, 'PASSED WITH WARNINGS');
      t.eq(V.summarise([]).status, 'PASSED');
    });
  });
};
