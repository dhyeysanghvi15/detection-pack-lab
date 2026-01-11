"use client";

import { useMemo, useState } from "react";
import type { Results } from "../lib/types";

export default function RuleTuningSimulator({
  ruleId,
  results,
}: {
  ruleId: string;
  results: Results;
}) {
  const knobs = results.by_rule[ruleId]?.tuning_knobs ?? [];
  const [aggressiveness, setAggressiveness] = useState<number>(50);

  const estimate = useMemo(() => {
    const base = results.by_rule[ruleId]?.tests.find((t) => t.case === "malicious")?.actual_alerts ?? 0;
    const multiplier = 1 + (50 - aggressiveness) / 80; // lower aggressiveness → more alerts
    return Math.max(0, Math.round(base * multiplier));
  }, [aggressiveness, results, ruleId]);

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="pill">tuning simulator (demo)</div>
        <div className="pill">estimated alerts: {estimate}</div>
      </div>
      <p className="muted" style={{ margin: "10px 0 0 0" }}>
        This is a client-side demo knob (real tuning would modify rule filters/allowlists and re-run the harness).
      </p>
      <div style={{ marginTop: 12 }}>
        <div className="pill">aggressiveness</div>
        <input
          className="input"
          type="range"
          min={0}
          max={100}
          value={aggressiveness}
          onChange={(e) => setAggressiveness(Number(e.target.value))}
        />
      </div>
      {knobs.length ? (
        <div style={{ marginTop: 12 }}>
          <div className="pill">suggested tuning knobs</div>
          <div className="grid" style={{ marginTop: 10 }}>
            {knobs.map((k) => (
              <div key={k.name} className="card" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 650 }}>{k.name}</span>
                  <span className="muted">{String(k.default)}</span>
                </div>
                <p className="muted" style={{ margin: "8px 0 0 0" }}>
                  {k.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

