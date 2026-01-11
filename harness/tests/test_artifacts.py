from __future__ import annotations

import json
from pathlib import Path

from harness.artifacts import generate_artifacts
from harness.schemas import RULE_DETAIL_SCHEMA, SCHEMAS, validate_json


def test_generate_artifacts_validates_schemas(tmp_path: Path):
    repo_root = Path(__file__).resolve().parents[2]
    out_dir = tmp_path / "data"
    generate_artifacts(repo_root, out_dir)

    meta = json.loads((out_dir / "meta.json").read_text(encoding="utf-8"))
    results = json.loads((out_dir / "results.json").read_text(encoding="utf-8"))
    coverage = json.loads((out_dir / "coverage.json").read_text(encoding="utf-8"))
    rules_index = json.loads((out_dir / "rules_index.json").read_text(encoding="utf-8"))

    validate_json(meta, SCHEMAS.meta)
    validate_json(results, SCHEMAS.results)
    validate_json(coverage, SCHEMAS.coverage)
    validate_json(rules_index, SCHEMAS.rules_index)

    assert len(rules_index["rules"]) >= 20

    # Per-rule detail files exist and validate against the repo's rule detail schema.
    rules_dir = out_dir / "rules"
    assert rules_dir.exists()
    for r in rules_index["rules"]:
        rid = r["id"]
        detail_path = rules_dir / f"{rid}.json"
        assert detail_path.exists()
        detail = json.loads(detail_path.read_text(encoding="utf-8"))
        validate_json(detail, RULE_DETAIL_SCHEMA)

