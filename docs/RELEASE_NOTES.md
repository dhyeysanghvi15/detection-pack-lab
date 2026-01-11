# Release notes

## v0.2.0 — Recruiter-ready cover + verification tooling

### Highlights
- Updated recruiter-first README cover with an animated SVG hero and a crisp “proof-first” narrative.
- Added deterministic verification helpers used in the test report:
  - `harness/validate_artifacts.py` (artifact contract validation)
  - `scripts/http_sanity.py` (HTTP checks for Docker-served site)
  - `scripts/feature_sanity.py` (artifact-backed feature assertions)
  - `scripts/nginx_pages_subpath.conf` (GitHub Pages basePath simulation)
- Hardened Docker build determinism: site build now cleans `.next` in `docker-compose.yml`.

### How to verify
```bash
python harness/run.py test
python harness/run.py artifacts
python harness/validate_artifacts.py
python scripts/feature_sanity.py
docker compose up --build
```

