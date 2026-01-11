"use client";

import { useEffect, useMemo, useState } from "react";

import type { RuleDetail, Results } from "../lib/types";
import { evaluateCompiledRule } from "../lib/eval";
import { PROFILES, type EnvironmentProfile, isSuppressedByProfile } from "../lib/profiles";
import ProfileSelector from "./ProfileSelector";

export default function RuleTuningSimulator({
  ruleId,
  results,
  rule,
}: {
  ruleId: string;
  results: Results;
  rule: RuleDetail;
}) {
  const knobs = results.by_rule[ruleId]?.tuning_knobs ?? rule.tuning_knobs ?? [];
  const [profile, setProfile] = useState<EnvironmentProfile>(PROFILES[0]);
  const [eventsRaw, setEventsRaw] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const url = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/data/events/${ruleId}_benign.jsonl`;
    fetch(url)
      .then((r) => r.text())
      .then((t) => {
        if (!cancelled) setEventsRaw(t);
      })
      .catch(() => setEventsRaw(""));
    return () => {
      cancelled = true;
    };
  }, [ruleId]);

  const events = useMemo(() => {
    return eventsRaw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => JSON.parse(l) as Record<string, any>);
  }, [eventsRaw]);

  const estimate = useMemo(() => {
    const compiled = rule.compiled;
    if (!compiled) return { baseline: 0, suppressed: 0, delta: 0 };

    // Estimate noise reduction by simulating profile suppressions on the benign stream.
    let baseline = 0;
    let suppressed = 0;
    for (const e of events) {
      const res = evaluateCompiledRule(compiled, e);
      if (res.matched) baseline += 1;
      if (res.matched && isSuppressedByProfile(profile, e)) suppressed += 1;
    }
    return { baseline, suppressed, delta: suppressed };
  }, [events, profile, rule.compiled]);

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="pill">tuning simulator</div>
        <div className="pill">
          benign alerts baseline: {estimate.baseline} • suppressed by profile: {estimate.suppressed}
        </div>
      </div>
      <p className="muted" style={{ margin: "10px 0 0 0" }}>
        This simulator replays the benign dataset client-side and applies environment suppressions to estimate noise reduction.
      </p>

      <div style={{ marginTop: 12 }}>
        <ProfileSelector profiles={PROFILES} value={profile} onChange={setProfile} />
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
