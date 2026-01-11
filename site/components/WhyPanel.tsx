"use client";

import type { Results } from "../lib/types";

export default function WhyPanel({
  ruleId,
  results,
}: {
  ruleId: string;
  results: Results;
}) {
  const rr = results.by_rule[ruleId];
  const mal = rr?.tests.find((t) => t.case === "malicious");
  const ben = rr?.tests.find((t) => t.case === "benign");

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
      <div className="card">
        <div className="pill">why fired (malicious)</div>
        <div style={{ marginTop: 10 }}>
          {mal ? (
            <>
              <div className="pill">{mal.passed ? "passed" : "failed"}</div>
              <div className="muted" style={{ marginTop: 8 }}>
                expected {mal.expected_alerts} • actual {mal.actual_alerts} • ttd {mal.time_to_detect_ms}ms
              </div>
              <div style={{ marginTop: 10 }} className="grid">
                {(mal.why.matched_fields || []).slice(0, 8).map((m, i) => (
                  <div key={i} className="pill" style={{ justifyContent: "space-between" }}>
                    <span>{m.field}</span>
                    <span className="muted">{m.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="muted">no data</div>
          )}
        </div>
      </div>
      <div className="card">
        <div className="pill">why didn’t (benign)</div>
        <div style={{ marginTop: 10 }}>
          {ben ? (
            <>
              <div className="pill">{ben.passed ? "passed" : "failed"}</div>
              <div className="muted" style={{ marginTop: 8 }}>
                expected {ben.expected_alerts} • actual {ben.actual_alerts}
              </div>
              <div style={{ marginTop: 10 }}>
                <div className="pill">failed clause</div>
                <pre className="muted" style={{ margin: "8px 0 0 0", whiteSpace: "pre-wrap" }}>
                  {ben.why.failed_clause ?? "n/a"}
                </pre>
                {ben.why.missing_fields?.length ? (
                  <>
                    <div style={{ marginTop: 10 }} className="pill">
                      missing fields
                    </div>
                    <div className="row" style={{ marginTop: 8 }}>
                      {ben.why.missing_fields.slice(0, 10).map((f) => (
                        <span key={f} className="pill">
                          {f}
                        </span>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </>
          ) : (
            <div className="muted">no data</div>
          )}
        </div>
      </div>
    </div>
  );
}

