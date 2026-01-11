"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { RuleIndexItem, RuleDetail, Results } from "../../lib/types";
import { evaluateCompiledRule } from "../../lib/eval";
import { PROFILES, type EnvironmentProfile, isSuppressedByProfile } from "../../lib/profiles";
import { fetchRuleDetail } from "../../lib/clientData";
import ProfileSelector from "../../components/ProfileSelector";

type NoiseRow = {
  id: string;
  name: string;
  noise_risk: number;
  quality_score: number;
  status: string;
  baseline_alerts: number;
  suppressed_alerts: number;
  suggestion: string;
  patch: string | null;
};

function parseJsonl(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Record<string, any>);
}

async function fetchJsonl(ruleId: string, caseName: "benign" | "malicious") {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const res = await fetch(`${base}/data/events/${ruleId}_${caseName}.jsonl`);
  const txt = await res.text();
  return parseJsonl(txt);
}

function hasFilter(compiled: RuleDetail["compiled"]) {
  if (!compiled) return false;
  return Object.keys(compiled.selections).some((k) => k.startsWith("filter"));
}

function suggestedFilterSnippet(rule: RuleDetail) {
  const compiled = rule.compiled;
  if (!compiled) return null;
  const fields = Object.values(compiled.selections)
    .flat()
    .map((c) => c.field);
  const candidate =
    fields.find((f) => f.includes("userIdentity.sessionContext.sessionIssuer.userName")) ||
    fields.find((f) => f.toLowerCase().includes("userprincipalname")) ||
    fields.find((f) => f.toLowerCase().includes("username")) ||
    fields.find((f) => f.toLowerCase().includes("user"));
  if (!candidate) return null;
  return `filter_allowlist:\n  ${candidate}: ApprovedAutomationRole\ncondition: selection and not filter_allowlist`;
}

export default function NoiseClient({
  rules,
  results,
}: {
  rules: RuleIndexItem[];
  results: Results;
}) {
  const [profile, setProfile] = useState<EnvironmentProfile>(PROFILES[0]);
  const [details, setDetails] = useState<Record<string, RuleDetail>>({});
  const top = useMemo(() => [...rules].sort((a, b) => b.noise_risk - a.noise_risk).slice(0, 10), [rules]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pairs = await Promise.all(top.map((r) => fetchRuleDetail(r.id)));
      if (cancelled) return;
      const map: Record<string, RuleDetail> = {};
      for (const d of pairs) map[d.id] = d;
      setDetails(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [top]);

  const [rows, setRows] = useState<NoiseRow[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: NoiseRow[] = [];
      for (const r of top) {
        const d = details[r.id];
        if (!d?.compiled) continue;
        const events = await fetchJsonl(r.id, "benign");
        const primary = d.compiled.selections["selection"] ? "selection" : Object.keys(d.compiled.selections)[0] || "selection";

        // Baseline = evaluate only the primary selection (simulates "broad" rule without filters).
        const baselineCompiled = { ...d.compiled, condition: primary };

        let baseline = 0;
        let suppressed = 0;
        for (const e of events) {
          const baseMatch = evaluateCompiledRule(baselineCompiled, e).matched;
          if (baseMatch) baseline += 1;
          if (baseMatch && isSuppressedByProfile(profile, e)) suppressed += 1;
        }

        const suggestion = hasFilter(d.compiled)
          ? "Already uses filter_* selections; extend allowlists for principals/IPs that match baseline triggers."
          : "Add a filter_* selection for known automation/admin principals and update condition: `selection and not filter_*`.";

        const patch = suggestedFilterSnippet(d);

        out.push({
          id: r.id,
          name: r.name,
          noise_risk: r.noise_risk,
          quality_score: r.quality_score,
          status: r.status,
          baseline_alerts: baseline,
          suppressed_alerts: suppressed,
          suggestion,
          patch,
        });
      }
      if (!cancelled) setRows(out);
    })().catch(() => setRows([]));
    return () => {
      cancelled = true;
    };
  }, [details, profile, top]);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card">
        <h1 className="title">Noise Lab</h1>
        <p className="subtitle">
          Ranks noisiest rules (heuristic) and simulates suppressions on the benign stream to estimate noise reduction.
        </p>
      </div>

      <ProfileSelector profiles={PROFILES} value={profile} onChange={setProfile} />

      <div className="card">
        <div className="pill">top noisy rules</div>
        <div className="grid" style={{ marginTop: 12 }}>
          {rows === null ? (
            <div className="muted">loading…</div>
          ) : (
            rows.map((r) => (
              <Link key={r.id} href={`/rules/${r.id}`} className="card" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <div className="row">
                    <span className="pill">{r.id}</span>
                    <span className="pill">{r.status}</span>
                    <span className="pill">noise {Math.round(r.noise_risk)}</span>
                    <span className="pill">quality {Math.round(r.quality_score)}</span>
                  </div>
                  <span className="pill">
                    benign baseline {r.baseline_alerts} • suppressed {r.suppressed_alerts}
                  </span>
                </div>
                <h3 style={{ margin: "10px 0 0 0" }}>{r.name}</h3>
                <p className="muted" style={{ margin: "6px 0 0 0" }}>
                  {r.suggestion}
                </p>
                {r.patch ? (
                  <pre className="muted" style={{ margin: "10px 0 0 0", whiteSpace: "pre-wrap" }}>
                    {r.patch}
                  </pre>
                ) : null}
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
