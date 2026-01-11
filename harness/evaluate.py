from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Tuple


def _get_path(event: Dict[str, Any], dotted: str) -> Any:
    if dotted in event:
        return event[dotted]
    cur: Any = event
    for part in dotted.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    return cur


def _stringify(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return str(value)
    return str(value)


def _as_iter(value: Any) -> Iterable[Any]:
    if isinstance(value, list):
        return value
    return [value]


def _coerce_number(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value))
    except Exception:
        return None


@dataclass
class MatchWhy:
    matched_fields: List[Dict[str, str]]
    failed_clause: Optional[str]
    missing_fields: List[str]


@dataclass
class SelectionResult:
    matched: bool
    matched_fields: List[Dict[str, str]]
    missing_fields: List[str]
    failed_clause: Optional[str]


class ConditionNode:
    def evaluate(self, mapping: Dict[str, SelectionResult]) -> Tuple[bool, Optional[str]]:
        raise NotImplementedError


class NameNode(ConditionNode):
    def __init__(self, name: str):
        self.name = name

    def evaluate(self, mapping: Dict[str, SelectionResult]) -> Tuple[bool, Optional[str]]:
        if self.name not in mapping:
            return False, f"unknown selection: {self.name}"
        if mapping[self.name].matched:
            return True, None
        return False, self.name


class NotNode(ConditionNode):
    def __init__(self, child: ConditionNode):
        self.child = child

    def evaluate(self, mapping: Dict[str, SelectionResult]) -> Tuple[bool, Optional[str]]:
        ok, reason = self.child.evaluate(mapping)
        if ok:
            return False, f"not({reason or 'true'})"
        return True, None


class AndNode(ConditionNode):
    def __init__(self, left: ConditionNode, right: ConditionNode):
        self.left = left
        self.right = right

    def evaluate(self, mapping: Dict[str, SelectionResult]) -> Tuple[bool, Optional[str]]:
        ok_left, reason_left = self.left.evaluate(mapping)
        if not ok_left:
            return False, reason_left
        ok_right, reason_right = self.right.evaluate(mapping)
        if not ok_right:
            return False, reason_right
        return True, None


class OrNode(ConditionNode):
    def __init__(self, left: ConditionNode, right: ConditionNode):
        self.left = left
        self.right = right

    def evaluate(self, mapping: Dict[str, SelectionResult]) -> Tuple[bool, Optional[str]]:
        ok_left, _ = self.left.evaluate(mapping)
        if ok_left:
            return True, None
        ok_right, _ = self.right.evaluate(mapping)
        if ok_right:
            return True, None
        ok_left2, reason_left = self.left.evaluate(mapping)
        if not ok_left2:
            return False, reason_left
        ok_right2, reason_right = self.right.evaluate(mapping)
        return False, reason_right


class ConditionParser:
    def __init__(self, text: str):
        self.tokens = self._tokenize(text)
        self.pos = 0

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        raw = re.findall(r"\(|\)|[A-Za-z0-9_]+", text)
        return [t.lower() if t.lower() in {"and", "or", "not"} else t for t in raw]

    def _peek(self) -> Optional[str]:
        if self.pos >= len(self.tokens):
            return None
        return self.tokens[self.pos]

    def _eat(self, expected: Optional[str] = None) -> str:
        tok = self._peek()
        if tok is None:
            raise ValueError("unexpected end of condition")
        if expected is not None and tok != expected:
            raise ValueError(f"expected '{expected}' but got '{tok}'")
        self.pos += 1
        return tok

    def parse(self) -> ConditionNode:
        node = self._parse_or()
        if self._peek() is not None:
            raise ValueError(f"unexpected token: {self._peek()}")
        return node

    def _parse_or(self) -> ConditionNode:
        node = self._parse_and()
        while self._peek() == "or":
            self._eat("or")
            node = OrNode(node, self._parse_and())
        return node

    def _parse_and(self) -> ConditionNode:
        node = self._parse_unary()
        while self._peek() == "and":
            self._eat("and")
            node = AndNode(node, self._parse_unary())
        return node

    def _parse_unary(self) -> ConditionNode:
        if self._peek() == "not":
            self._eat("not")
            return NotNode(self._parse_unary())
        return self._parse_primary()

    def _parse_primary(self) -> ConditionNode:
        tok = self._peek()
        if tok == "(":
            self._eat("(")
            node = self._parse_or()
            self._eat(")")
            return node
        if tok is None:
            raise ValueError("unexpected end of condition")
        self._eat()
        return NameNode(tok)


def _match_op(field_value: Any, op: str, expected: Any) -> bool:
    values = list(_as_iter(field_value))

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

    if op in {"gt", "gte", "lt", "lte"}:
        exp_num = _coerce_number(expected)
        if exp_num is None:
            return False
        for v in values:
            v_num = _coerce_number(v)
            if v_num is None:
                continue
            if op == "gt" and v_num > exp_num:
                return True
            if op == "gte" and v_num >= exp_num:
                return True
            if op == "lt" and v_num < exp_num:
                return True
            if op == "lte" and v_num <= exp_num:
                return True
        return False

    if op == "re":
        pattern = re.compile(str(expected))
        return any(pattern.search(_stringify(v)) is not None for v in values)

    raise ValueError(f"unsupported operator: {op}")


def _parse_field_key(field_key: str) -> Tuple[str, str]:
    if "|contains" in field_key:
        return field_key.replace("|contains", ""), "contains"
    if "|startswith" in field_key:
        return field_key.replace("|startswith", ""), "startswith"
    if "|endswith" in field_key:
        return field_key.replace("|endswith", ""), "endswith"
    if "|re" in field_key:
        return field_key.replace("|re", ""), "re"
    if "|gte" in field_key:
        return field_key.replace("|gte", ""), "gte"
    if "|gt" in field_key:
        return field_key.replace("|gt", ""), "gt"
    if "|lte" in field_key:
        return field_key.replace("|lte", ""), "lte"
    if "|lt" in field_key:
        return field_key.replace("|lt", ""), "lt"
    return field_key, "eq"


def evaluate_selection(event: Dict[str, Any], selection: Dict[str, Any]) -> SelectionResult:
    matched_fields: List[Dict[str, str]] = []
    missing_fields: List[str] = []

    for key, expected in selection.items():
        field, op = _parse_field_key(str(key))
        actual = _get_path(event, field)
        if actual is None:
            missing_fields.append(field)
            return SelectionResult(
                matched=False,
                matched_fields=matched_fields,
                missing_fields=missing_fields,
                failed_clause=f"missing field: {field}",
            )

        any_ok = False
        expected_values = list(_as_iter(expected))
        if op == "eq" and isinstance(expected, list):
            any_ok = any(_match_op(actual, "eq", v) for v in expected_values)
        else:
            any_ok = any(_match_op(actual, op, v) for v in expected_values)

        if not any_ok:
            return SelectionResult(
                matched=False,
                matched_fields=matched_fields,
                missing_fields=missing_fields,
                failed_clause=f"{field} {op} {expected_values}",
            )

        matched_fields.append({"field": field, "value": _stringify(actual)})

    return SelectionResult(
        matched=True,
        matched_fields=matched_fields,
        missing_fields=missing_fields,
        failed_clause=None,
    )


def evaluate_sigma_event(sigma: Dict[str, Any], event: Dict[str, Any]) -> Tuple[bool, MatchWhy]:
    detection = sigma.get("detection") or {}
    condition = str(detection.get("condition", "selection")).strip()

    selection_results: Dict[str, SelectionResult] = {}
    for name, body in detection.items():
        if name == "condition":
            continue
        if not isinstance(body, dict):
            continue
        selection_results[name] = evaluate_selection(event, body)

    try:
        ast = ConditionParser(condition).parse()
        matched, failed_sel = ast.evaluate(selection_results)
    except Exception as exc:
        return False, MatchWhy(matched_fields=[], failed_clause=f"bad condition: {exc}", missing_fields=[])

    if matched:
        # Prefer fields from the first selection mentioned in the condition.
        primary = None
        for tok in ConditionParser._tokenize(condition):
            if tok not in {"and", "or", "not", "(", ")"} and tok in selection_results:
                primary = tok
                break
        matched_fields = selection_results.get(primary, SelectionResult(False, [], [], None)).matched_fields
        return True, MatchWhy(matched_fields=matched_fields, failed_clause=None, missing_fields=[])

    if failed_sel and failed_sel in selection_results:
        res = selection_results[failed_sel]
        return False, MatchWhy(
            matched_fields=res.matched_fields,
            failed_clause=res.failed_clause or failed_sel,
            missing_fields=res.missing_fields,
        )

    missing = sorted({f for r in selection_results.values() for f in r.missing_fields})
    return False, MatchWhy(matched_fields=[], failed_clause=failed_sel, missing_fields=missing)
