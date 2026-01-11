"use client";

import type { RuleDetail } from "../lib/types";

function pick(arr: string[], n: number) {
  return arr.slice(0, n);
}

export default function RuleRiskMeter({
  rule,
  fieldCounts,
}: {
  rule: RuleDetail;
  fieldCounts: Record<string, number>;
}) {
  const fields = rule.fields_used || [];
  const brittle = fields.filter((f) => (fieldCounts[f] || 0) <= 2);
  const contains = (rule.score_breakdown?.contains_or_regex_clauses as number | undefined) || 0;
  const missingFilter = rule.compiled ? !Object.keys(rule.compiled.selections).some((k) => k.startsWith("filter")) : true;

  const reasons: string[] = [];
  if (brittle.length) reasons.push(`Brittle fields (rare in pack): ${pick(brittle, 6).join(", ")}${brittle.length > 6 ? "…" : ""}`);
  if (contains > 0) reasons.push(`Broad matching clauses: ${contains} contains/regex operator(s)`);
  if (missingFilter) reasons.push("No filter_* selection present (consider allowlists for principals/IPs/hosts)");

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="pill">rule risk meter</div>
        <div className="pill">noise risk {Math.round(rule.noise_risk)} / 100</div>
      </div>
      <div style={{ marginTop: 10 }}>
        {reasons.length ? (
          <div className="grid">
            {reasons.map((r) => (
              <div key={r} className="pill">
                {r}
              </div>
            ))}
          </div>
        ) : (
          <div className="muted">No elevated risk signals detected in this pack context.</div>
        )}
      </div>
    </div>
  );
}

