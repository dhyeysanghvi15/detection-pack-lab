# Detection Pack Lab — Sigma → Elastic + Validation Harness (CI-verified detections + interactive evidence website)

Production-style detection engineering portfolio repo: portable Sigma rules, best-effort Elastic conversions, deterministic replay validation, and a static “evidence website” generated from CI artifacts.

## Run in 60 seconds (Docker)
```bash
docker compose up --build
```
- Runs harness validation and generates `site/public/data/*`
- Serves the site at `http://localhost:3000` (Next.js dev server reading local artifacts)

## Run locally
### 1) Harness tests (Python 3.11+)
```bash
python -m venv .venv
. .venv/bin/activate
pip install -r harness/requirements.txt
python harness/run.py test
```

### 2) Generate artifacts for the website
```bash
python harness/run.py artifacts
```

### 3) Build the static website
```bash
cd site
npm install
npm run build
npm run export
```

## GitHub Pages deployment
- Workflow: `.github/workflows/pages.yml`
- One-time repo setting: enable Pages → “GitHub Actions” as the source.

## How validation works
- Each rule has two replay datasets: `benign.jsonl` and `malicious.jsonl` under `tests/cases/RULE-XXX/`.
- The harness loads the Sigma YAML, evaluates it against each JSONL event stream, and asserts expected alert counts from `expected.json`.
- The harness writes CI-grade artifacts into `site/public/data/` so the website always matches test results.

## Repo map
- `rules/sigma/` — portable Sigma rules (`RULE-001` … `RULE-020`)
- `rules/elastic/` — best-effort Elastic KQL equivalents
- `tests/cases/` — per-rule benign/malicious datasets + expected outcomes
- `harness/` — replay engine, Sigma→Elastic scaffold, artifacts generator, JSON schema validation
- `site/` — Next.js static evidence website (no backend; reads `public/data/*`)
- `.github/workflows/` — CI pipeline + GitHub Pages deployment

## Architecture (CI-driven)
```mermaid
flowchart LR
  A[Sigma rules] --> B[Harness: replay + assertions]
  C[Test datasets] --> B
  B --> D[Artifacts JSON\nmeta/results/coverage/index]
  D --> E[Static Next.js site\nreads /public/data/*]
  E --> F[GitHub Pages]
```

## Skills demonstrated
- Sigma authoring + constraints for portability
- Best-effort translation to Elastic KQL with explainable limitations
- Deterministic validation harness (CI-friendly, fast, synthetic data)
- Artifact-driven documentation and visualization (recruiter-first “proof”)
- ATT&CK mapping + pack health metrics + tuning workflow

## Example screenshots (placeholders)
- Dashboard
- Rule Explorer
- Rule Detail (evidence + timeline replay + “why”)
- ATT&CK Coverage Matrix
- Noise Lab + tuning suggestions

## Limitations
- Sigma parsing/evaluation supports a pragmatic subset (`equals`, `contains`, `startswith`, `endswith`, numeric comparisons, and boolean conditions).
- Elastic conversions are best-effort KQL for demo rules (not a full sigma backend).

## Roadmap
- Add ECS normalization presets per logsource
- Add richer rule semantics (thresholding, aggregations)
- Add historical trend artifacts (pass-rate over time)
