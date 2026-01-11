from __future__ import annotations

import json
import os
import shutil
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import yaml

from harness.evaluate import MatchWhy, evaluate_sigma_event
from harness.schemas import SCHEMAS, validate_json
from harness.sigma_to_elastic import convert_sigma_to_kql


ATTACK_TECHNIQUE_NAMES: Dict[str, str] = {
    "T1098": "Account Manipulation",
    "T1078": "Valid Accounts",
    "T1547": "Boot or Logon Autostart Execution",
    "T1543": "Create or Modify System Process",
    "T1053": "Scheduled Task/Job",
    "T1546": "Event Triggered Execution",
    "T1003": "OS Credential Dumping",
    "T1621": "Multi-Factor Authentication Request Generation",
    "T1070": "Indicator Removal",
    "T1562": "Impair Defenses",
    "T1059": "Command and Scripting Interpreter",
    "T1567": "Exfiltration Over Web Service",
    "T1566": "Phishing",
}

TACTIC_DISPLAY: Dict[str, str] = {
    "attack.persistence": "Persistence",
    "attack.privilege_escalation": "Privilege Escalation",
    "attack.credential_access": "Credential Access",
    "attack.defense_evasion": "Defense Evasion",
    "attack.exfiltration": "Exfiltration",
    "attack.initial_access": "Initial Access",
}


@dataclass(frozen=True)
class RuleFile:
    sigma_path: Path
    elastic_path: Path
    sigma: Dict[str, Any]


def _read_jsonl(path: Path) -> List[Dict[str, Any]]:
    events: List[Dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        events.append(json.loads(line))
    return events


def _load_expected(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _iter_sigma_rules(repo_root: Path) -> List[RuleFile]:
    sigma_dir = repo_root / "rules" / "sigma"
    elastic_dir = repo_root / "rules" / "elastic"
    rules: List[RuleFile] = []
    for sigma_path in sorted(sigma_dir.glob("RULE-*.yml")):
        sigma = yaml.safe_load(sigma_path.read_text(encoding="utf-8"))
        rule_id = str(sigma.get("id", "")).strip()
        basename = sigma_path.name.replace(".yml", "")
        elastic_candidates = [
            elastic_dir / f"{basename}.kql",
            elastic_dir / f"{basename}.esql",
            elastic_dir / f"{basename}.json",
        ]
        elastic_path = next((p for p in elastic_candidates if p.exists()), elastic_candidates[0])
        rules.append(RuleFile(sigma_path=sigma_path, elastic_path=elastic_path, sigma=sigma))
        if not rule_id:
            raise ValueError(f"missing id in {sigma_path}")
    return rules


def _extract_techniques(tags: List[str]) -> List[str]:
    out: List[str] = []
    for t in tags:
        t = str(t).strip()
        if t.lower().startswith("attack.t"):
            out.append(t.split(".")[-1].upper())
    return sorted(set(out))


def _extract_tactic(tags: List[str]) -> str:
    for t in tags:
        if t in TACTIC_DISPLAY:
            return TACTIC_DISPLAY[t]
    for t in tags:
        if t.startswith("attack.") and not t.startswith("attack.t"):
            return t.replace("attack.", "").replace("_", " ").title()
    return "Uncategorized"


def _severity_from_level(level: str) -> str:
    lvl = str(level or "medium").lower().strip()
    if lvl in {"low", "medium", "high", "critical"}:
        return lvl
    return "medium"


def _heuristics(sigma: Dict[str, Any], passed: bool) -> Tuple[int, int, int]:
    level = _severity_from_level(sigma.get("level", "medium"))
    base_conf = {"low": 55, "medium": 70, "high": 82, "critical": 90}[level]

    detection = sigma.get("detection") or {}
    contains_ops = 0
    fields = 0
    for k, v in detection.items():
        if k == "condition" or not isinstance(v, dict):
            continue
        for raw_key in v.keys():
            fields += 1
            if "|contains" in str(raw_key) or "|re" in str(raw_key):
                contains_ops += 1

    fp = sigma.get("falsepositives") or []
    fp_bonus = 5 if isinstance(fp, list) and len(fp) >= 1 else 0
    noise = min(100, 20 + contains_ops * 15 + max(0, fields - 3) * 8)
    if level in {"critical", "high"}:
        noise = min(100, noise + 5)

    confidence = max(0, min(100, base_conf + fp_bonus - (noise // 10)))
    quality = int(round((confidence * 0.6) + ((100 - noise) * 0.4)))
    if not passed:
        quality = max(0, quality - 35)

    return int(confidence), int(noise), int(quality)


def _fields_used(sigma: Dict[str, Any]) -> List[str]:
    detection = sigma.get("detection") or {}
    fields: List[str] = []
    for name, body in detection.items():
        if name == "condition" or not isinstance(body, dict):
            continue
        for raw_key in body.keys():
            key = str(raw_key)
            field = key.split("|")[0]
            if field not in fields:
                fields.append(field)
    return fields


def _tuning_knobs(sigma: Dict[str, Any]) -> List[Dict[str, Any]]:
    logsource = sigma.get("logsource") or {}
    service = str(logsource.get("service", "")).lower()
    knobs: List[Dict[str, Any]] = []
    knobs.append(
        {
            "name": "allowlist.principal",
            "description": "Exclude known admin/automation principals that legitimately trigger this behavior.",
            "default": "[]",
        }
    )
    if service in {"sysmon", "security", "system", "powershell"}:
        knobs.append(
            {
                "name": "allowlist.hosts",
                "description": "Exclude known management hosts or jump boxes that legitimately perform the action.",
                "default": "[]",
            }
        )
    if service in {"cloudtrail", "entra_id", "system_log"}:
        knobs.append(
            {
                "name": "allowlist.ip_ranges",
                "description": "Exclude trusted corporate egress ranges to reduce noise.",
                "default": "[]",
            }
        )
    return knobs


def run_rule_case(rule: RuleFile, case_name: str, events: List[Dict[str, Any]], expected_alerts: int) -> Dict[str, Any]:
    actual = 0
    first_match_index: Optional[int] = None
    best_why: Optional[MatchWhy] = None

    for idx, evt in enumerate(events):
        ok, why = evaluate_sigma_event(rule.sigma, evt)
        if ok:
            actual += 1
            best_why = why
            if first_match_index is None:
                first_match_index = idx
        elif best_why is None:
            best_why = why

    time_to_detect_ms = 0
    if first_match_index is not None:
        time_to_detect_ms = first_match_index * 10

    why_out = best_why or MatchWhy(matched_fields=[], failed_clause=None, missing_fields=[])
    matched_fields = [
        {"field": mf["field"], "value": str(mf["value"])} for mf in (why_out.matched_fields or [])
    ]

    return {
        "case": case_name,
        "events": len(events),
        "expected_alerts": expected_alerts,
        "actual_alerts": actual,
        "time_to_detect_ms": time_to_detect_ms,
        "passed": actual == expected_alerts,
        "why": {
            "matched_fields": matched_fields,
            "failed_clause": why_out.failed_clause,
            "missing_fields": list(why_out.missing_fields or []),
        },
    }


def run_all_tests(repo_root: Path, only_rule: Optional[str] = None) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    rules = _iter_sigma_rules(repo_root)
    by_rule: Dict[str, Any] = {}
    failures: List[Dict[str, Any]] = []

    events_total = 0
    alerts_expected = 0
    alerts_actual = 0
    ttd_values: List[int] = []

    for rule in rules:
        rid = str(rule.sigma.get("id"))
        if only_rule and rid != only_rule:
            continue

        case_dir = repo_root / "tests" / "cases" / rid
        expected = _load_expected(case_dir / "expected.json")

        tests: List[Dict[str, Any]] = []
        for case_name in ["benign", "malicious"]:
            events = _read_jsonl(case_dir / f"{case_name}.jsonl")
            exp_alerts = int(expected[case_name]["expected_alerts"])
            res = run_rule_case(rule, case_name, events, exp_alerts)
            tests.append(res)

            events_total += res["events"]
            alerts_expected += exp_alerts
            alerts_actual += int(res["actual_alerts"])
            if case_name == "malicious" and res["actual_alerts"] > 0:
                ttd_values.append(int(res["time_to_detect_ms"]))

            if not res["passed"]:
                failures.append({"rule_id": rid, "case": case_name, "result": res})

        by_rule[rid] = {
            "tests": tests,
            "false_positive_notes": list(rule.sigma.get("falsepositives") or []),
            "tuning_knobs": _tuning_knobs(rule.sigma),
        }

    total_tests = sum(len(v["tests"]) for v in by_rule.values())
    passed_tests = sum(1 for v in by_rule.values() for t in v["tests"] if t["passed"])
    pass_rate = 0.0 if total_tests == 0 else (passed_tests / total_tests) * 100.0
    avg_ttd = 0.0 if not ttd_values else sum(ttd_values) / len(ttd_values)

    results = {
        "summary": {
            "pass_rate": round(pass_rate, 2),
            "avg_time_to_detect_ms": round(avg_ttd, 2),
            "events_total": events_total,
            "alerts_expected": alerts_expected,
            "alerts_actual": alerts_actual,
        },
        "by_rule": by_rule,
    }

    validate_json(results, SCHEMAS.results)
    return results, failures


def _status_for_rule(sigma: Dict[str, Any], rule_results: Dict[str, Any]) -> str:
    any_failed = any(not t["passed"] for t in rule_results["tests"])
    if any_failed:
        return "failing"
    if str(sigma.get("status", "")).lower().strip() == "experimental":
        return "experimental"
    return "passing"


def _logsource_string(sigma: Dict[str, Any]) -> str:
    logsource = sigma.get("logsource") or {}
    product = str(logsource.get("product", "")).strip()
    service = str(logsource.get("service", "")).strip()
    if product and service:
        return f"{product}/{service}"
    return service or product or "unknown"


def generate_artifacts(repo_root: Path, out_dir: Path, only_rule: Optional[str] = None) -> Dict[str, Any]:
    results, _ = run_all_tests(repo_root, only_rule=only_rule)
    rules = _iter_sigma_rules(repo_root)
    if only_rule:
        rules = [r for r in rules if str(r.sigma.get("id")) == only_rule]

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "rules").mkdir(parents=True, exist_ok=True)
    (out_dir / "events").mkdir(parents=True, exist_ok=True)

    commit = os.getenv("GITHUB_SHA", "local")
    run_id = os.getenv("GITHUB_RUN_ID", "local")
    generated_at = datetime.now(timezone.utc).isoformat()

    rules_index_rules: List[Dict[str, Any]] = []
    passing = 0
    failing = 0

    per_rule_status: Dict[str, str] = {}

    for rule in rules:
        rid = str(rule.sigma.get("id"))
        rule_res = results["by_rule"][rid]
        status = _status_for_rule(rule.sigma, rule_res)
        per_rule_status[rid] = status
        passed = status != "failing"

        confidence, noise_risk, quality_score = _heuristics(rule.sigma, passed=passed)

        if status == "failing":
            failing += 1
        else:
            passing += 1

        tags = list(rule.sigma.get("tags") or [])
        techniques = _extract_techniques(tags)
        tactic = _extract_tactic(tags)
        severity = _severity_from_level(rule.sigma.get("level", "medium"))

        rules_index_rules.append(
            {
                "id": rid,
                "name": str(rule.sigma.get("title", "")),
                "description": str(rule.sigma.get("description", "")),
                "logsource": _logsource_string(rule.sigma),
                "tactic": tactic,
                "techniques": techniques,
                "severity": severity,
                "status": status,
                "confidence": confidence,
                "noise_risk": noise_risk,
                "quality_score": quality_score,
            }
        )

        # Per-rule detail artifact (site-specific; not part of the mandated schemas)
        sigma_text = rule.sigma_path.read_text(encoding="utf-8")
        elastic_text = ""
        if rule.elastic_path.exists():
            elastic_text = rule.elastic_path.read_text(encoding="utf-8").strip()
        else:
            elastic_text, _ = convert_sigma_to_kql(rule.sigma)

        detail = {
            "id": rid,
            "title": str(rule.sigma.get("title", "")),
            "description": str(rule.sigma.get("description", "")),
            "sigma_path": str(rule.sigma_path.as_posix()),
            "elastic_path": str(rule.elastic_path.as_posix()),
            "sigma": sigma_text,
            "elastic": elastic_text,
            "logsource": _logsource_string(rule.sigma),
            "tags": tags,
            "tactic": tactic,
            "techniques": techniques,
            "severity": severity,
            "status": status,
            "confidence": confidence,
            "noise_risk": noise_risk,
            "quality_score": quality_score,
            "fields_used": _fields_used(rule.sigma),
        }
        (out_dir / "rules" / f"{rid}.json").write_text(json.dumps(detail, indent=2), encoding="utf-8")

        case_dir = repo_root / "tests" / "cases" / rid
        for case_name in ["benign", "malicious"]:
            src = case_dir / f"{case_name}.jsonl"
            dst = out_dir / "events" / f"{rid}_{case_name}.jsonl"
            shutil.copyfile(src, dst)

    rules_index = {"rules": rules_index_rules}
    validate_json(rules_index, SCHEMAS.rules_index)

    meta = {
        "generated_at": generated_at,
        "commit": commit,
        "run_id": run_id,
        "rules_total": len(rules_index_rules),
        "rules_passing": passing,
        "rules_failing": failing,
    }
    validate_json(meta, SCHEMAS.meta)

    # Coverage
    technique_to_rules: Dict[str, List[str]] = {}
    technique_to_tactic: Dict[str, str] = {}
    technique_to_status: Dict[str, Dict[str, int]] = {}

    tactics: List[str] = []

    for r in rules_index_rules:
        rid = r["id"]
        if r["tactic"] not in tactics:
            tactics.append(r["tactic"])
        for tech in r["techniques"]:
            technique_to_rules.setdefault(tech, []).append(rid)
            technique_to_tactic.setdefault(tech, r["tactic"])
            technique_to_status.setdefault(
                tech, {"passing": 0, "failing": 0, "experimental": 0}
            )[r["status"]] += 1

    coverage = {
        "tactics": tactics,
        "techniques": [
            {
                "technique": tech,
                "name": ATTACK_TECHNIQUE_NAMES.get(tech, "Technique"),
                "tactic": technique_to_tactic.get(tech, "Uncategorized"),
                "rules": sorted(technique_to_rules.get(tech, [])),
                "status_breakdown": technique_to_status.get(
                    tech, {"passing": 0, "failing": 0, "experimental": 0}
                ),
            }
            for tech in sorted(technique_to_rules.keys())
        ],
    }
    validate_json(coverage, SCHEMAS.coverage)

    (out_dir / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    (out_dir / "results.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    (out_dir / "coverage.json").write_text(json.dumps(coverage, indent=2), encoding="utf-8")
    (out_dir / "rules_index.json").write_text(json.dumps(rules_index, indent=2), encoding="utf-8")

    return {"meta": meta, "results": results, "coverage": coverage, "rules_index": rules_index}
