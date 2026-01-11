from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def _read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _read_jsonl(path: Path) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        out.append(json.loads(line))
    return out


def _get_path(event: Dict[str, Any], dotted: str) -> Any:
    if dotted in event:
        return event[dotted]
    cur: Any = event
    for part in dotted.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    return cur


def _as_list(v: Any) -> List[Any]:
    return v if isinstance(v, list) else [v]


def _stringify(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, (dict, list)):
        return json.dumps(v, sort_keys=True)
    return str(v)


def _coerce_num(v: Any) -> Optional[float]:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    try:
        return float(str(v))
    except Exception:
        return None


def _match_op(actual: Any, op: str, expected: Any) -> bool:
    values = _as_list(actual)
    if op == "eq":
        return any(v == expected for v in values)
    if op == "contains":
        exp = _stringify(expected).lower()
        return any(exp in _stringify(v).lower() for v in values)
    if op == "startswith":
        exp = _stringify(expected).lower()
        return any(_stringify(v).lower().startswith(exp) for v in values)
    if op == "endswith":
        exp = _stringify(expected).lower()
        return any(_stringify(v).lower().endswith(exp) for v in values)
    if op == "re":
        import re

        r = re.compile(str(expected))
        return any(r.search(_stringify(v)) is not None for v in values)
    if op in {"gt", "gte", "lt", "lte"}:
        exp = _coerce_num(expected)
        if exp is None:
            return False
        for v in values:
            n = _coerce_num(v)
            if n is None:
                continue
            if op == "gt" and n > exp:
                return True
            if op == "gte" and n >= exp:
                return True
            if op == "lt" and n < exp:
                return True
            if op == "lte" and n <= exp:
                return True
        return False
    raise ValueError(f"unsupported op: {op}")


def eval_selection(compiled: Dict[str, Any], name: str, event: Dict[str, Any]) -> bool:
    clauses = compiled["selections"].get(name, [])
    for c in clauses:
        field = c["field"]
        op = c["op"]
        vals = c["values"]
        actual = _get_path(event, field)
        if actual is None:
            return False
        if not any(_match_op(actual, op, v) for v in vals):
            return False
    return True


def eval_primary_only(compiled: Dict[str, Any], event: Dict[str, Any]) -> bool:
    primary = "selection" if "selection" in compiled["selections"] else next(iter(compiled["selections"].keys()))
    return eval_selection(compiled, primary, event)


@dataclass(frozen=True)
class Profile:
    id: str
    allowlist_principals: List[str]
    allowlist_ip_prefixes: List[str]


PROFILES = {
    "default": Profile("default", [], []),
    "corp-automation": Profile(
        "corp-automation",
        ["ApprovedAutomationRole", "SYSTEM", r"CONTOSO\\admin", "admin@contoso.example"],
        ["203.0.113."],
    ),
}


def get_principal(event: Dict[str, Any]) -> Optional[str]:
    candidates = [
        _get_path(event, "userIdentity.userName"),
        _get_path(event, "userIdentity.sessionContext.sessionIssuer.userName"),
        _get_path(event, "userPrincipalName"),
        _get_path(event, "initiatedBy.user.userPrincipalName"),
        _get_path(event, "actor.alternateId"),
        _get_path(event, "User"),
        _get_path(event, "SubjectUserName"),
    ]
    for c in candidates:
        if isinstance(c, str) and c.strip():
            return c
    return None


def get_ip(event: Dict[str, Any]) -> Optional[str]:
    candidates = [
        _get_path(event, "sourceIPAddress"),
        _get_path(event, "client.ipAddress"),
        _get_path(event, "IpAddress"),
        _get_path(event, "ipAddress"),
    ]
    for c in candidates:
        if isinstance(c, str) and c.strip():
            return c
    return None


def suppressed(profile: Profile, event: Dict[str, Any]) -> bool:
    p = get_principal(event)
    if p and p in profile.allowlist_principals:
        return True
    ip = get_ip(event)
    if ip and any(ip.startswith(pref) for pref in profile.allowlist_ip_prefixes):
        return True
    return False


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    data = repo_root / "site" / "public" / "data"
    idx = _read_json(data / "rules_index.json")
    ids = [r["id"] for r in idx["rules"]]

    # A) Replay Player: ensure events exist and profile changes suppress count for at least one rule.
    target = "RULE-002" if "RULE-002" in ids else ids[0]
    detail = _read_json(data / "rules" / f"{target}.json")
    compiled = detail["compiled"]
    benign = _read_jsonl(data / "events" / f"{target}_benign.jsonl")

    baseline = sum(1 for e in benign if eval_primary_only(compiled, e))
    suppressed_count = sum(
        1
        for e in benign
        if eval_primary_only(compiled, e) and suppressed(PROFILES["corp-automation"], e)
    )
    after_profile = baseline - suppressed_count
    if after_profile == baseline:
        raise AssertionError(
            f"Replay/Profile sanity failed: expected some suppression delta for {target}, baseline={baseline} after_profile={after_profile}"
        )
    if suppressed_count > baseline:
        raise AssertionError("suppressed_count > baseline (impossible)")

    # B) Noise Lab sanity: suppressed <= baseline for all rules (benign stream).
    for rid in ids:
        d = _read_json(data / "rules" / f"{rid}.json")
        comp = d["compiled"]
        ev = _read_jsonl(data / "events" / f"{rid}_benign.jsonl")
        base = sum(1 for e in ev if eval_primary_only(comp, e))
        sup = sum(1 for e in ev if eval_primary_only(comp, e) and suppressed(PROFILES["corp-automation"], e))
        if sup > base:
            raise AssertionError(f"Noise sanity failed: {rid} suppressed {sup} > baseline {base}")

    # C) Story Mode sanity: stories reference real rules and events exist.
    stories = [
        ["RULE-003", "RULE-001", "RULE-002", "RULE-019"],
        ["RULE-010", "RULE-009", "RULE-012", "RULE-011"],
    ]
    for seq in stories:
        for rid in seq:
            if rid not in ids:
                raise AssertionError(f"Story references missing rule: {rid}")
            for case in ["benign", "malicious"]:
                p = data / "events" / f"{rid}_{case}.jsonl"
                if not p.exists():
                    raise AssertionError(f"Story rule missing exported events: {p}")

    # D) Diff/history sanity: at least one status differs between history and current.
    hist = data / "history"
    hist_idx = _read_json(hist / "rules_index.json")
    hist_by = {r["id"]: r for r in hist_idx["rules"]}
    diffs = 0
    for r in idx["rules"]:
        hr = hist_by.get(r["id"])
        if hr and hr.get("status") != r.get("status"):
            diffs += 1
    if diffs < 1:
        raise AssertionError("Expected at least one rule status diff between history and current.")

    # E) Scoreboard validation: score ranges 0..100
    for r in idx["rules"]:
        for k in ["confidence", "noise_risk", "quality_score"]:
            v = float(r[k])
            if not (0.0 <= v <= 100.0):
                raise AssertionError(f"score out of range: {r['id']} {k}={v}")

    # F) Coverage validation: technique.rules all exist
    cov = _read_json(data / "coverage.json")
    id_set = set(ids)
    for tech in cov["techniques"]:
        for rid in tech["rules"]:
            if rid not in id_set:
                raise AssertionError(f"coverage references missing rule: {rid}")

    # Copy-as suite: per-rule required fields exist
    for rid in ids[:3]:
        d = _read_json(data / "rules" / f"{rid}.json")
        for key in ["sigma_text", "elastic_text", "elastic_esql"]:
            if key not in d or not isinstance(d[key], str) or not d[key].strip():
                raise AssertionError(f"copy-as required field missing/empty for {rid}: {key}")

    # Schema analyzer: fields_used present
    for rid in ids:
        d = _read_json(data / "rules" / f"{rid}.json")
        if not isinstance(d.get("fields_used"), list) or not d["fields_used"]:
            raise AssertionError(f"fields_used missing/empty for {rid}")

    print(
        f"OK feature sanity: profile delta {target} baseline={baseline} after_profile={after_profile} diffs={diffs}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
