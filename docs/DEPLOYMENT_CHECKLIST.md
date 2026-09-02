# Deployment Checklist

> **This version is NOT published.** Nothing below has been executed. These are the
> steps that *would* be required, recorded for review. Do not run them without an
> explicit instruction to publish.

## Current state

| Item | Value |
|---|---|
| Branch | `decision-intelligence-v2` (local only, never pushed) |
| Base | `main` @ `5be1571` |
| Commits made | **none** — working tree changes only |
| Remote touched | **no** |
| Deployed | **no** |
| Live site | still serving `main` @ `5be1571` |

## Pre-publication gates

- [ ] `node app/tests/run.js` → 138 passed, 0 failed, exit 0 ✅ *(passing locally)*
- [ ] Browser check: 0 uncaught console errors ✅ *(verified locally)*
- [ ] All 18 modules render; 75 charts draw ✅ *(verified locally)*
- [ ] Decision Centre shows the synchronisation banner ✅
- [ ] Governance panel reports PASSED ✅
- [ ] Keyboard navigation works across the tab bar ✅
- [ ] Review `docs/AUDIT_REPORT.md` score and open risks
- [ ] Confirm the renamed KPIs are acceptable to stakeholders — **"NIM Proxy" and
      "WACF" disappear from the interface**, and Cost-to-Income moves 49.4% → 46.0%.
      Anyone comparing against a previously circulated figure will see a difference.
- [ ] Decide whether the Decision Centre should be the landing tab (it currently is,
      displacing Overview)
- [ ] Cross-browser spot check (only Chromium was tested)
- [ ] Mobile width check (CSS breakpoints exist but are untested)

## Cache busting — required

GitHub Pages serves the previous asset until the query string changes. Any change to
these files needs its `?v=` bumped in `app/index.html`:

| Asset | Current |
|---|---|
| `_data_blob.js` | `?v=202607b` |
| `js/core/*.js` | `?v=2` |
| `js/decision-centre.js` | `?v=2` |
| `js/a11y.js` | `?v=1` |

Omitting this was already observed to serve stale content during development.

## Publication steps (NOT executed)

```bash
# 1. review everything that would ship
git status
git diff main --stat

# 2. stage — app and docs only; never the downloads_202607/ workbooks
git add app/index.html app/_data_blob.js app/js app/tests docs

# 3. commit on the working branch
git commit -m "Decision Intelligence v2: correctness fixes, Decision Centre, tests"

# 4. merge to main (GitHub Pages deploys from main)
git checkout main
git merge --no-ff decision-intelligence-v2

# 5. publish
git push origin main
```

## Post-publication verification

```bash
curl -sk https://banking.fintechhumans.com/app/index.html | grep -o '_data_blob.js?v=[0-9a-z]*'
curl -skI https://banking.fintechhumans.com/app/js/core/periods.js
```

- [ ] Page references the expected `?v=`
- [ ] `js/core/*.js` return 200 (a 404 here silently disables the Decision Centre —
      it degrades to a visible message rather than a blank panel, but the feature is gone)
- [ ] Decision Centre renders on the live domain
- [ ] Spot-check one KPI against the local build

## Rollback

```bash
git revert <merge-commit>
git push origin main
```

The previous blob and `index.html` are both in git history at `5be1571`.

## Do not deploy

- `downloads_202607/` — source workbooks, ~8 MB, not needed at runtime
- `*.py` build scripts — already excluded by `.gitignore`
- `.mcp.json` — local tooling configuration
