from __future__ import annotations

from typing import Any, Dict, List, Tuple

from harness.evaluate import ConditionParser, _parse_field_key


def _kql_value(v: Any) -> str:
    if isinstance(v, (int, float)):
        return str(v)
    s = str(v).replace('"', '\\"')
    return f"\"{s}\""


def _sel_to_kql(selection: Dict[str, Any]) -> str:
    parts: List[str] = []
    for raw_key, raw_expected in selection.items():
        field, op = _parse_field_key(str(raw_key))
        expected_values = raw_expected if isinstance(raw_expected, list) else [raw_expected]

        if op == "eq":
            if len(expected_values) == 1:
                parts.append(f"{field}:{_kql_value(expected_values[0])}")
            else:
                ors = " or ".join(f"{field}:{_kql_value(v)}" for v in expected_values)
                parts.append(f"({ors})")
            continue

        if op == "contains":
            if len(expected_values) == 1:
                parts.append(f"{field}:*{expected_values[0]}*")
            else:
                ors = " or ".join(f"{field}:*{v}*" for v in expected_values)
                parts.append(f"({ors})")
            continue

        if op == "startswith":
            if len(expected_values) == 1:
                parts.append(f"{field}:{expected_values[0]}*")
            else:
                ors = " or ".join(f"{field}:{v}*" for v in expected_values)
                parts.append(f"({ors})")
            continue

        if op == "endswith":
            if len(expected_values) == 1:
                parts.append(f"{field}:*{expected_values[0]}")
            else:
                ors = " or ".join(f"{field}:*{v}" for v in expected_values)
                parts.append(f"({ors})")
            continue

        if op in {"gt", "gte", "lt", "lte"}:
            op_map = {"gt": ">", "gte": ">=", "lt": "<", "lte": "<="}
            parts.append(f"{field} {op_map[op]} {expected_values[0]}")
            continue

        if op == "re":
            parts.append(f"{field}:/{expected_values[0]}/")
            continue

        parts.append(f"{field}:{_kql_value(expected_values[0])}")

    return " and ".join(parts) if parts else "*"


def _extract_names(condition: str) -> List[str]:
    names: List[str] = []
    for tok in ConditionParser._tokenize(condition):
        if tok in {"and", "or", "not", "(", ")"}:
            continue
        if tok not in names:
            names.append(tok)
    return names


def convert_sigma_to_kql(sigma: Dict[str, Any]) -> Tuple[str, List[str]]:
    detection = sigma.get("detection") or {}
    condition = str(detection.get("condition", "selection")).strip()
    names = _extract_names(condition)

    selection_kql: Dict[str, str] = {}
    for name in names:
        sel = detection.get(name)
        if isinstance(sel, dict):
            selection_kql[name] = _sel_to_kql(sel)

    # Best-effort: rebuild boolean expression by string replacement on tokens.
    rebuilt: List[str] = []
    for tok in ConditionParser._tokenize(condition):
        if tok in {"and", "or", "not", "(", ")"}:
            rebuilt.append(tok)
            continue
        rebuilt.append(f"({selection_kql.get(tok, tok)})")

    return " ".join(rebuilt), names

