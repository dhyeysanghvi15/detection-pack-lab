# Contributing

## Add a new rule (checklist)
1) Create `rules/sigma/RULE-XXX-<slug>.yml` with ATT&CK tags and a deterministic detection.
2) Create `rules/elastic/RULE-XXX-<slug>.kql` (best-effort translation).
3) Add `tests/cases/RULE-XXX/{benign.jsonl,malicious.jsonl,expected.json}`.
4) Run `python harness/run.py test --rule RULE-XXX`.
5) Run `python harness/run.py artifacts` and verify the site renders offline.

## Rule authoring conventions
- Keep conditions simple and deterministic (no aggregations in this lab repo).
- Prefer stable fields that exist in the dataset.
- Document false positive scenarios and tuning knobs.

