"use client";

import type { RuleDetail } from "../lib/types";

export default function Scoreboard({ rule }: { rule: RuleDetail }) {
  return (
    <div className="card">
      <div className="pill">scores</div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginTop: 12 }}>
        <div className="card" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="pill">quality</div>
          <h2 style={{ margin: "10px 0 0 0" }}>{Math.round(rule.quality_score)}</h2>
          <p className="muted" style={{ margin: 0 }}>
            pass status + robustness
          </p>
        </div>
        <div className="card" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="pill">noise risk</div>
          <h2 style={{ margin: "10px 0 0 0" }}>{Math.round(rule.noise_risk)}</h2>
          <p className="muted" style={{ margin: 0 }}>
            more contains/regex → noisier
          </p>
        </div>
        <div className="card" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="pill">confidence</div>
          <h2 style={{ margin: "10px 0 0 0" }}>{Math.round(rule.confidence)}</h2>
          <p className="muted" style={{ margin: 0 }}>
            severity + FP notes
          </p>
        </div>
      </div>
    </div>
  );
}

