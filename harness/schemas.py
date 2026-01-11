from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict

from jsonschema import Draft202012Validator


META_SCHEMA: Dict[str, Any] = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": [
        "generated_at",
        "commit",
        "run_id",
        "rules_total",
        "rules_passing",
        "rules_failing",
    ],
    "additionalProperties": False,
    "properties": {
        "generated_at": {"type": "string"},
        "commit": {"type": "string"},
        "run_id": {"type": "string"},
        "rules_total": {"type": "number"},
        "rules_passing": {"type": "number"},
        "rules_failing": {"type": "number"},
    },
}

RULES_INDEX_SCHEMA: Dict[str, Any] = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": ["rules"],
    "additionalProperties": False,
    "properties": {
        "rules": {
            "type": "array",
            "items": {
                "type": "object",
                "required": [
                    "id",
                    "name",
                    "description",
                    "logsource",
                    "tactic",
                    "techniques",
                    "severity",
                    "status",
                    "confidence",
                    "noise_risk",
                    "quality_score",
                ],
                "additionalProperties": False,
                "properties": {
                    "id": {"type": "string"},
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "logsource": {"type": "string"},
                    "tactic": {"type": "string"},
                    "techniques": {"type": "array", "items": {"type": "string"}},
                    "severity": {
                        "type": "string",
                        "enum": ["low", "medium", "high", "critical"],
                    },
                    "status": {
                        "type": "string",
                        "enum": ["passing", "failing", "experimental"],
                    },
                    "confidence": {"type": "number"},
                    "noise_risk": {"type": "number"},
                    "quality_score": {"type": "number"},
                },
            },
        }
    },
}

RESULTS_SCHEMA: Dict[str, Any] = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": ["summary", "by_rule"],
    "additionalProperties": False,
    "properties": {
        "summary": {
            "type": "object",
            "required": [
                "pass_rate",
                "avg_time_to_detect_ms",
                "events_total",
                "alerts_expected",
                "alerts_actual",
            ],
            "additionalProperties": False,
            "properties": {
                "pass_rate": {"type": "number"},
                "avg_time_to_detect_ms": {"type": "number"},
                "events_total": {"type": "number"},
                "alerts_expected": {"type": "number"},
                "alerts_actual": {"type": "number"},
            },
        },
        "by_rule": {
            "type": "object",
            "additionalProperties": {
                "type": "object",
                "required": ["tests", "false_positive_notes", "tuning_knobs"],
                "additionalProperties": False,
                "properties": {
                    "tests": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": [
                                "case",
                                "events",
                                "expected_alerts",
                                "actual_alerts",
                                "time_to_detect_ms",
                                "passed",
                                "why",
                            ],
                            "additionalProperties": False,
                            "properties": {
                                "case": {"type": "string", "enum": ["benign", "malicious"]},
                                "events": {"type": "number"},
                                "expected_alerts": {"type": "number"},
                                "actual_alerts": {"type": "number"},
                                "time_to_detect_ms": {"type": "number"},
                                "passed": {"type": "boolean"},
                                "why": {
                                    "type": "object",
                                    "required": [
                                        "matched_fields",
                                        "failed_clause",
                                        "missing_fields",
                                    ],
                                    "additionalProperties": False,
                                    "properties": {
                                        "matched_fields": {
                                            "type": "array",
                                            "items": {
                                                "type": "object",
                                                "required": ["field", "value"],
                                                "additionalProperties": False,
                                                "properties": {
                                                    "field": {"type": "string"},
                                                    "value": {"type": "string"},
                                                },
                                            },
                                        },
                                        "failed_clause": {"type": ["string", "null"]},
                                        "missing_fields": {
                                            "type": "array",
                                            "items": {"type": "string"},
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "false_positive_notes": {"type": "array", "items": {"type": "string"}},
                    "tuning_knobs": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["name", "description", "default"],
                            "additionalProperties": False,
                            "properties": {
                                "name": {"type": "string"},
                                "description": {"type": "string"},
                                "default": {"type": ["string", "number"]},
                            },
                        },
                    },
                },
            }
        },
    },
}

COVERAGE_SCHEMA: Dict[str, Any] = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": ["tactics", "techniques"],
    "additionalProperties": False,
    "properties": {
        "tactics": {"type": "array", "items": {"type": "string"}},
        "techniques": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["technique", "name", "tactic", "rules", "status_breakdown"],
                "additionalProperties": False,
                "properties": {
                    "technique": {"type": "string"},
                    "name": {"type": "string"},
                    "tactic": {"type": "string"},
                    "rules": {"type": "array", "items": {"type": "string"}},
                    "status_breakdown": {
                        "type": "object",
                        "required": ["passing", "failing", "experimental"],
                        "additionalProperties": False,
                        "properties": {
                            "passing": {"type": "number"},
                            "failing": {"type": "number"},
                            "experimental": {"type": "number"},
                        },
                    },
                },
            },
        },
    },
}


@dataclass(frozen=True)
class SchemaBundle:
    meta: Dict[str, Any]
    rules_index: Dict[str, Any]
    results: Dict[str, Any]
    coverage: Dict[str, Any]


SCHEMAS = SchemaBundle(
    meta=META_SCHEMA,
    rules_index=RULES_INDEX_SCHEMA,
    results=RESULTS_SCHEMA,
    coverage=COVERAGE_SCHEMA,
)


def validate_json(instance: Any, schema: Dict[str, Any]) -> None:
    Draft202012Validator(schema).validate(instance)

