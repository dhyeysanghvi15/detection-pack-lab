from __future__ import annotations

import yaml

from harness.evaluate import evaluate_sigma_event


def test_equals_and_contains_and_condition_and_not():
    sigma = yaml.safe_load(
        """
title: demo
id: RULE-X
logsource: {product: aws, service: cloudtrail}
detection:
  selection:
    eventSource: iam.amazonaws.com
    eventName: AttachUserPolicy
    requestParameters.policyArn|contains: AdministratorAccess
  filter:
    userIdentity.sessionContext.sessionIssuer.userName: ApprovedAutomationRole
  condition: selection and not filter
"""
    )

    event_ok = {
        "eventSource": "iam.amazonaws.com",
        "eventName": "AttachUserPolicy",
        "requestParameters": {"policyArn": "arn:aws:iam::aws:policy/AdministratorAccess"},
        "userIdentity": {"sessionContext": {"sessionIssuer": {"userName": "alice"}}},
    }
    matched, why = evaluate_sigma_event(sigma, event_ok)
    assert matched is True
    assert why.failed_clause is None
    assert any(mf["field"] == "eventName" for mf in why.matched_fields)

    event_filtered = {
        "eventSource": "iam.amazonaws.com",
        "eventName": "AttachUserPolicy",
        "requestParameters": {"policyArn": "arn:aws:iam::aws:policy/AdministratorAccess"},
        "userIdentity": {"sessionContext": {"sessionIssuer": {"userName": "ApprovedAutomationRole"}}},
    }
    matched2, _ = evaluate_sigma_event(sigma, event_filtered)
    assert matched2 is False


def test_numeric_gte():
    sigma = yaml.safe_load(
        """
title: demo
id: RULE-Y
logsource: {product: aws, service: cloudtrail}
detection:
  selection:
    bytesTransferredOut|gte: 50000000
  condition: selection
"""
    )
    matched, _ = evaluate_sigma_event(sigma, {"bytesTransferredOut": 75000000})
    assert matched is True
    matched2, _ = evaluate_sigma_event(sigma, {"bytesTransferredOut": 120000})
    assert matched2 is False

