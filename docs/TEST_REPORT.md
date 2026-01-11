# Test Report — detpack-lab (Detection Pack Lab)

**Repo:** `detection-pack-lab`  
**Commit tested:** `bb5a075b87afffe7ec90c0cf3f8003bea1811a1e`  
**Commit time:** `2026-01-10 19:39:42 -0700`  
**Report generated:** `2026-01-11`  

This report validates the repo end-to-end: harness tests, artifact generation + contract checks, static Next.js build/export, Docker “one command” run, and GitHub Pages basePath compatibility. All checks were executed locally and are deterministic/offline at runtime (no external APIs required by the site).

---

## 1) Environment + Inventory

### High-level repo inventory

Root (key files/dirs):
- `docker-compose.yml`
- `rules/` (Sigma + Elastic)
- `tests/` (per-rule datasets + expected)
- `harness/` (Python replay + artifacts)
- `site/` (Next.js static evidence site)
- `.github/workflows/` (CI + Pages)
- `docs/`

### Tool versions

Commands:
- `python3 --version`
- `node --version`
- `npm --version`
- `docker --version`

Observed:
- Python `3.14.0`
- Node `v25.2.1`
- npm `11.6.2`
- Docker `29.1.3`

### Required files present

Verified existence:
- `docker-compose.yml`
- `harness/run.py`
- `site/package.json`
- `.github/workflows/ci.yml`
- `.github/workflows/pages.yml`

---

## 2) Phase 1 — Harness Tests (PASS)

### A) Local harness tests (all rules)

Commands:
```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r harness/requirements.txt
python harness/run.py test
```

Result:
- PASS (exit 0)
- Summary observed: `pass_rate=100.0% events_total=100 alerts_expected=28 alerts_actual=28`

### B) Targeted rule tests

Commands:
```bash
python harness/run.py test --rule RULE-001
python harness/run.py test --rule RULE-010
python harness/run.py test --rule RULE-020
```

Result:
- PASS (all exit 0)

### C) Pytest suite

Command:
```bash
pytest -q
```

Result:
- PASS (`3 passed`)

---

## 3) Phase 2 — Artifacts + JSON Contract Validation (PASS)

### A) Generate artifacts

Command:
```bash
python harness/run.py artifacts
```

Result:
- PASS (writes into `site/public/data/`)

### B) Existence checks (required outputs)

Verified present:
- `site/public/data/meta.json`
- `site/public/data/results.json`
- `site/public/data/coverage.json`
- `site/public/data/rules_index.json`
- `site/public/data/rules/RULE-XXX.json` for every rule in index (20/20)
- `site/public/data/events/RULE-XXX_{benign,malicious}.jsonl` for every rule (40 files)
- `site/public/data/history/*` snapshot present and populated

### C) Schema + sanity checks (scripted)

Command:
```bash
python harness/validate_artifacts.py
```

Result:
- PASS: `OK artifacts: rules=20 pass_rate=100.0`

Validated:
- All 4 contract JSON files validate against the harness JSON Schemas.
- `rules_index.rules` contains `>= 20` rules.
- `meta.rules_total == len(rules_index.rules)`.
- `results.summary.pass_rate` is consistent and in `0..100`.
- `results.summary.events_total == sum(test.events for all tests)` (current harness behavior).
- Every test case includes a `why` object with correct types.
- Each per-rule detail artifact contains:
  - `sigma_text`, `elastic_text`
  - `tuning_knobs`, `false_positive_notes`
  - `score_breakdown`
  - `compiled` (client-side matcher input)

---

## 4) Phase 3 — Site Build/Export (Static) (PASS)

Commands:
```bash
cd site
npm ci
npm run build
npm run export
```

Output verification:
- `site/out/` exists
- `site/out/index.html` exists
- `site/out/` contains static routes: `rules/`, `coverage/`, `noise/`, `stories/`, `diff/`, `schema/`
- `site/out/data/*` contains artifacts (copied via committed `site/public/data/*`)

BasePath safety scan:
- No hard-coded `fetch('/data/...')` paths were found.
- Fetches use `process.env.NEXT_PUBLIC_BASE_PATH` prefixing.

---

## 5) Phase 4 — Docker “Run in 60 Seconds” (PASS)

Commands executed:
```bash
docker compose down -v
docker compose up --build -d
python3 scripts/http_sanity.py
docker compose down -v
```

HTTP sanity checks performed (`scripts/http_sanity.py`):
- `GET http://localhost:3000/` → 200
- `GET http://localhost:3000/rules/` → 200
- `GET http://localhost:3000/coverage/` → 200
- `GET http://localhost:3000/noise/` → 200
- `GET http://localhost:3000/stories/` → 200
- `GET http://localhost:3000/diff/` → 200
- `GET http://localhost:3000/data/meta.json` → 200 + JSON parse + required keys

---

## 6) Phase 5 — Interactive Feature Validation (PASS)

Scripted feature assertions (artifact-backed):

Command:
```bash
python3 scripts/feature_sanity.py
```

Result:
- PASS: `OK feature sanity: profile delta RULE-002 baseline=1 after_profile=0 diffs=2`

What it validates (offline, from artifacts):
- Replay Player data exists (events exported) and profile suppression changes alert counts.
- Noise Lab math sanity: `suppressed <= baseline` for all rules on benign streams.
- Story Mode references real rule IDs and exported event streams exist.
- Diff/history snapshot exists and produces meaningful differences.
- Score ranges remain within `0..100`.
- Coverage only references existing rule IDs.
- Copy-as required fields exist on per-rule artifacts.
- Schema analyzer fields (`fields_used`) exist and are non-empty.

---

## 7) Phase 6 — GitHub Pages basePath Compatibility (PASS)

Target Pages URL shape:
- `https://<username>.github.io/detpack-lab/` → basePath `/detpack-lab`

### A) Build with basePath

The basePath is injected at build time via `NEXT_PUBLIC_BASE_PATH=/detpack-lab`.

Command (Dockerized build for determinism):
```bash
docker run --rm -v "$PWD/site:/site" -w /site -e NEXT_PUBLIC_BASE_PATH=/detpack-lab node:20-alpine \
  sh -lc "rm -rf .next && npm ci && npm run build && npm run export"
```

### B) Serve under subpath and validate routes + artifact fetches

Command (nginx with rewrite-based subpath config):
```bash
CID=$(docker run -d -p 3999:80 \
  -v "$PWD/site/out:/usr/share/nginx/html:ro" \
  -v "$PWD/scripts/nginx_pages_subpath.conf:/etc/nginx/conf.d/default.conf:ro" \
  nginx:alpine)

python3 scripts/http_sanity.py --base http://localhost:3999 --prefix /detpack-lab
docker rm -f "$CID"
```

Result:
- PASS (all routes return 200 under `/detpack-lab/*`, and `/detpack-lab/data/meta.json` parses)

---

## 8) Results Summary (PASS)

- Harness tests: PASS
- Artifact generation: PASS
- Artifact contract validation: PASS
- Site build/export: PASS
- Docker end-to-end: PASS
- GitHub Pages basePath: PASS

---

## 9) Feature Verification Table

| Feature | Status | Evidence |
|---|---:|---|
| Replay Player (play/pause/step + evaluation + events) | PASS | `site/components/ReplayPlayer.tsx`, events in `site/public/data/events/*`, `scripts/feature_sanity.py` |
| Why fired / why didn’t | PASS | `site/components/WhyPanel.tsx`, validated `results.json` `why` objects |
| Noise Lab (baseline vs suppressed + patch suggestions) | PASS | `site/app/noise/noise-client.tsx`, `scripts/feature_sanity.py` |
| Rule Risk Meter | PASS | `site/components/RuleRiskMeter.tsx` uses `fields_used` + score signals |
| Environment Profiles | PASS | `site/lib/profiles.ts` + `site/components/ProfileSelector.tsx` |
| Kill-chain Story Mode timeline | PASS | `site/app/stories/story-client.tsx`, events presence validated |
| Diff + history + impact | PASS | `site/app/diff/page.tsx`, `site/components/RuleSnapshotDiff.tsx`, `site/public/data/history/*` |
| Pack Scoreboard + trend | PASS | `site/components/PackScoreboard.tsx` + history snapshot |
| Coverage matrix | PASS | `site/app/coverage/page.tsx`, `coverage.json` integrity validated |
| Copy-as suite (Sigma/KQL/ES|QL/SPL/Sentinel KQL) | PASS | `site/components/CopyAsButtons.tsx`, per-rule artifacts contain required strings |
| Schema Analyzer | PASS | `site/app/schema/page.tsx`, `fields_used` validated non-empty |

---

## 10) Issues Found + Fixes Applied

### Issue 1 — Artifact validation script import path
- Symptom: running `python harness/validate_artifacts.py` failed with `ModuleNotFoundError: No module named 'harness'`.
- Root cause: direct script execution lacked repo-root `sys.path` injection.
- Fix: add repo root to `sys.path` in `harness/validate_artifacts.py`.
- Verified by: `python harness/validate_artifacts.py` (PASS).

### Issue 2 — BasePath build in Docker could fail with `.next` present
- Symptom: `next build` in a Docker bind mount with basePath set intermittently failed writing manifests under `.next/` (ENOENT).
- Root cause: stale `.next` directory on bind mounts caused Next’s cleanup/build sequencing to race on this environment.
- Fix: clean `.next` before building in Docker.
  - Updated `docker-compose.yml` `site-build` command to start with `rm -rf .next`.
- Verified by:
  - Docker end-to-end run + HTTP checks (PASS).
  - Pages basePath build (Docker) (PASS).

### Issue 3 — Nginx subpath routing for Pages simulation
- Symptom: `/detpack-lab/` and directory routes like `/detpack-lab/rules/` returned 404 in the Pages simulation.
- Root cause: `try_files` matched directories but didn’t consistently serve their `index.html`.
- Fix: `scripts/nginx_pages_subpath.conf`
  - Internal rewrite for `/detpack-lab/` (no redirect)
  - `try_files $uri $uri/index.html /index.html` for directory index support
- Verified by: `python3 scripts/http_sanity.py --prefix /detpack-lab` (PASS).

---

## 11) Recruiter Demo Checklist (90 seconds)

1) Open Dashboard: `/` → show pass rate, totals, scoreboard trend (history vs current).
2) Rule Explorer: `/rules/` → filter by tactic/severity, open a rule.
3) Rule Detail: `/rules/RULE-002/` → show evidence panel + “Why fired/Why didn’t”.
4) Replay Player: switch Environment Profile → show alert count changes on benign stream.
5) Noise Lab: `/noise/` → show baseline vs suppressed estimates + patch snippet.
6) Diff: `/diff/` → show pack diffs vs history and open a rule to see snapshot impact.

