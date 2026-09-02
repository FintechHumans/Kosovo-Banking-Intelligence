#!/usr/bin/env node
/* Minimal zero-dependency test runner.
   Usage: node app/tests/run.js [pattern] */
'use strict';
const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0, current = '';
const failures = [];

function approx(a, b, tol) {
  if (a == null || b == null) return a === b;
  return Math.abs(a - b) <= (tol == null ? 1e-9 : tol);
}

const t = {
  describe(name, fn) {
    current = name;
    console.log('\n' + name);
    fn();
  },
  it(name, fn) {
    try {
      fn();
      passed++;
      console.log('  PASS  ' + name);
    } catch (e) {
      failed++;
      failures.push({ suite: current, name, message: e.message });
      console.log('  FAIL  ' + name + '\n        ' + e.message);
    }
  },
  eq(actual, expected, msg) {
    const a = JSON.stringify(actual), b = JSON.stringify(expected);
    if (a !== b) throw new Error((msg ? msg + ': ' : '') + 'expected ' + b + ', got ' + a);
  },
  close(actual, expected, tol, msg) {
    if (!approx(actual, expected, tol)) {
      throw new Error((msg ? msg + ': ' : '') + 'expected ~' + expected + ' (±' + (tol || 1e-9) + '), got ' + actual);
    }
  },
  isNull(actual, msg) {
    if (actual !== null) throw new Error((msg ? msg + ': ' : '') + 'expected null, got ' + JSON.stringify(actual));
  },
  ok(cond, msg) {
    if (!cond) throw new Error(msg || 'expected truthy');
  },
  throws(fn, msg) {
    let threw = false;
    try { fn(); } catch (e) { threw = true; }
    if (!threw) throw new Error(msg || 'expected a throw');
  }
};

const dir = __dirname;
const pattern = process.argv[2];
const specs = fs.readdirSync(dir)
  .filter(f => f.endsWith('.test.js'))
  .filter(f => !pattern || f.includes(pattern))
  .sort();

console.log('KBI test run — ' + specs.length + ' spec file(s)');
specs.forEach(f => require(path.join(dir, f))(t));

console.log('\n' + '='.repeat(60));
console.log('PASSED: ' + passed + '   FAILED: ' + failed);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach(f => console.log('  [' + f.suite + '] ' + f.name + '\n    ' + f.message));
}
console.log('='.repeat(60));
process.exit(failed ? 1 : 0);
