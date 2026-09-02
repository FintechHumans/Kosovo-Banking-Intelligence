/* Phase 12 — guards for the legacy-helper port.

   The 15 original modules used to carry their own period and arithmetic
   helpers inside index.html. Those are deleted and the modules now call the
   tested core. These tests read index.html as text and fail if any of the
   defective implementations reappears — a rebuild or a merge that
   reintroduces one will not pass silently. */
'use strict';
const fs = require('fs');
const path = require('path');
const P = require('../js/core/periods.js');
const M = require('../js/core/safe-math.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

module.exports = function (t) {

  t.describe('legacy port — defective implementations are gone', () => {
    t.it('the +/-2 month "year over year" window is deleted', () => {
      t.ok(html.indexOf('bd<=2') < 0, 'prior12 tolerance window found in index.html');
      t.ok(!/Math\.abs\(\(y\*12\+m\)-\(ry\*12\+rm\)-12\)/.test(html),
        'the nearest-observation YoY search is still present');
    });

    t.it('zero-as-missing percentage change is deleted', () => {
      t.ok(html.indexOf('if(!b||!a||b===0)') < 0, 'the old pctChange guard is still present');
    });

    t.it('largest-value deduplication is deleted', () => {
      t.ok(html.indexOf('r.value>map[key].value') < 0, 'dedupRemit still keeps the maximum');
    });

    t.it('the duplicated month maps are deleted', () => {
      t.ok(html.indexOf('const MM=') < 0, 'MM month map still declared inline');
      t.ok(html.indexOf('const MN=') < 0, 'MN month map still declared inline');
    });
  });

  t.describe('legacy port — the core is bound and required', () => {
    t.it('index.html binds the core modules', () => {
      ['window.KBI && window.KBI.Periods',
       'window.KBI && window.KBI.Math',
       'window.KBI && window.KBI.Validate'].forEach(s => {
        t.ok(html.indexOf(s) >= 0, 'missing binding: ' + s);
      });
    });

    t.it('a missing core fails visibly instead of falling back silently', () => {
      t.ok(/throw new Error\('KBI core modules unavailable'\)/.test(html),
        'no hard failure when the core is absent');
      t.ok(html.indexOf('Calculation modules failed to load') >= 0,
        'no user-visible message when the core is absent');
    });

    t.it('every core module is loaded before the inline application script', () => {
      const modules = ['periods.js', 'safe-math.js', 'calculations.js',
                       'validators.js', 'signals.js', 'regimes.js'];
      const inlineStart = html.indexOf('// ---- KBI CORE BINDING');
      t.ok(inlineStart > 0, 'core binding block not found');
      modules.forEach(m => {
        const tag = html.indexOf('js/core/' + m);
        t.ok(tag > 0, m + ' is not loaded');
        t.ok(tag < inlineStart, m + ' loads after the code that uses it');
      });
    });

    t.it('the ported helpers delegate rather than reimplement', () => {
      t.ok(/function pctChange\(a,b\)\{var v=_M\.pctChange\(a,b\)/.test(html));
      t.ok(/function prior12\(arr,latP,fn\)\{return _at\(arr,_P\.sameMonthPreviousYear/.test(html));
      t.ok(/function priorMo\(arr,latP,fn\)\{return _at\(arr,_P\.previousMonth/.test(html));
      t.ok(/function isMonthlyPeriod\(p\)\{return _P\.toIndex\(p\)!=null\}/.test(html));
    });
  });

  t.describe('legacy port — behaviour the modules now inherit', () => {
    // These assert the semantics the ported wrappers expose to the 15 modules.
    t.it('a fall to zero reports -100.0, not a blank', () => {
      const v = M.pctChange(0, 100);
      t.close(v, -100);
      t.eq(v.toFixed(1), '-100.0');
    });

    t.it('an exact 12-month base is required for YoY', () => {
      const rows = [{ period: '2013-12', value: 1 }, { period: '2015-01', value: 2 }];
      const target = P.sameMonthPreviousYear(P.toIndex('2015-01'));
      t.eq(P.fromIndex(target), '2014-01');
      t.eq(rows.filter(r => P.toIndex(r.period) === target).length, 0,
        'Dec 2013 must not satisfy a Jan 2015 YoY');
    });

    t.it('quarter and bare-year labels are not monthly', () => {
      t.isNull(P.toIndex('2009 T4'));
      t.isNull(P.toIndex('2004'));
    });

    t.it('a provisional marker still resolves', () => {
      t.eq(P.toKey('2026 January (p)'), '2026-01');
    });
  });
};
