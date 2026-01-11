.PHONY: test artifacts site up

test:
\tpython3 -m venv .venv && . .venv/bin/activate && pip install -r harness/requirements.txt && pytest -q

artifacts:
\tpython3 -m venv .venv && . .venv/bin/activate && pip install -r harness/requirements.txt && python harness/run.py artifacts

site:
\tcd site && npm ci && npm run build && npm run export

up:
\tdocker compose up --build --remove-orphans
