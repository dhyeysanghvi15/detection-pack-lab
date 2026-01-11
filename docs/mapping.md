# ATT&CK mapping rationale

Rules in this repo include ATT&CK technique tags (e.g., `attack.t1078`) and are grouped by themes:
- IAM abuse (AWS + Entra ID)
- Windows persistence (Security + Sysmon)
- Credential access
- Defense evasion
- Exfil indicators

Mapping rule-of-thumb:
- Use the most specific technique that explains the adversary behavior the log represents.
- If multiple techniques apply, pick one primary technique and keep others as secondary tags.

