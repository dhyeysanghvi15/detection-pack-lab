from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from harness.schemas import RULE_DETAIL_SCHEMA, SCHEMAS, validate_json


def _read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _assert(cond: bool, msg: str) -> None:
    if not cond:
        raise AssertionError(msg)


def validate_artifacts_dir(data_dir: Path) -> Dict[str, Any]:
    meta_path = data_dir / "meta.json"
    results_path = data_dir / "results.json"
    coverage_path = data_dir / "coverage.json"
    index_path = data_dir / "rules_index.json"

    for p in [meta_path, results_path, coverage_path, index_path]:
        _assert(p.exists(), f"missing required artifact: {p}")

    meta = _read_json(meta_path)
    results = _read_json(results_path)
    coverage = _read_json(coverage_path)
    rules_index = _read_json(index_path)

    validate_json(meta, SCHEMAS.meta)
    validate_json(results, SCHEMAS.results)
    validate_json(coverage, SCHEMAS.coverage)
    validate_json(rules_index, SCHEMAS.rules_index)

    rules: List[Dict[str, Any]] = rules_index["rules"]
    _assert(len(rules) >= 20, f"rules_index has <20 rules: {len(rules)}")
    _assert(meta["rules_total"] == len(rules), "meta.rules_total != len(rules_index.rules)")
    _assert(
        meta["rules_passing"] + meta["rules_failing"] <= meta["rules_total"],
        "meta passing+failing > total",
    )

    # pass_rate contract: this repo uses 0..100
    pass_rate = float(results["summary"]["pass_rate"])
    _assert(0.0 <= pass_rate <= 100.0, f"results.summary.pass_rate out of range: {pass_rate}")

    # Sanity: summary events_total equals sum of per-test events (current harness behavior)
    per_test_events = sum(
        int(t["events"]) for rr in results["by_rule"].values() for t in rr["tests"]
    )
    _assert(
        int(results["summary"]["events_total"]) == per_test_events,
        f"events_total mismatch: summary={results['summary']['events_total']} computed={per_test_events}",
    )

    # Ensure why structure exists for each test
    for rid, rr in results["by_rule"].items():
        for t in rr["tests"]:
            why = t["why"]
            _assert(isinstance(why["matched_fields"], list), f"{rid} why.matched_fields not list")
            _assert(isinstance(why["missing_fields"], list), f"{rid} why.missing_fields not list")
            _assert(
                why["failed_clause"] is None or isinstance(why["failed_clause"], str),
                f"{rid} why.failed_clause not string|null",
            )

    # Per-rule detail artifacts
    rules_dir = data_dir / "rules"
    events_dir = data_dir / "events"
    _assert(rules_dir.exists(), "missing site/public/data/rules/")
    _assert(events_dir.exists(), "missing site/public/data/events/")

    for r in rules:
        rid = r["id"]
        detail_path = rules_dir / f"{rid}.json"
        _assert(detail_path.exists(), f"missing per-rule artifact: {detail_path}")
        detail = _read_json(detail_path)
        validate_json(detail, RULE_DETAIL_SCHEMA)

        # Required fields for the site
        for key in ["sigma_text", "elastic_text", "tuning_knobs", "false_positive_notes", "score_breakdown", "compiled"]:
            _assert(key in detail, f"{rid} missing required key: {key}")

        for case in ["benign", "malicious"]:
            ev_path = events_dir / f"{rid}_{case}.jsonl"
            _assert(ev_path.exists(), f"missing exported events: {ev_path}")

    # History snapshot exists
    hist = data_dir / "history"
    _assert(hist.exists(), "missing history snapshot directory: site/public/data/history/")
    _assert((hist / "meta.json").exists(), "missing history/meta.json")
    _assert((hist / "rules_index.json").exists(), "missing history/rules_index.json")
    _assert((hist / "results.json").exists(), "missing history/results.json")

    return {"meta": meta, "rules_total": len(rules), "pass_rate": pass_rate}


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    data_dir = repo_root / "site" / "public" / "data"
    info = validate_artifacts_dir(data_dir)
    print(f"OK artifacts: rules={info['rules_total']} pass_rate={info['pass_rate']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
