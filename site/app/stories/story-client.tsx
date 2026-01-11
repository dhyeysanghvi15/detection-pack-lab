"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { evaluateCompiledRule } from "../../lib/eval";
import { fetchRuleDetail } from "../../lib/clientData";
import type { EnvironmentProfile } from "../../lib/profiles";
import { PROFILES, isSuppressedByProfile } from "../../lib/profiles";
import ProfileSelector from "../../components/ProfileSelector";
import type { RuleDetail } from "../../lib/types";

type Story = {
  id: string;
  title: string;
  steps: Array<{ rule: string; note: string; caseName: "malicious" | "benign" }>;
};

const stories: Story[] = [
  {
    id: "iam-to-exfil",
    title: "Cloud IAM breach → persistence → exfil",
    steps: [
      { rule: "RULE-003", note: "Initial access: console login without MFA", caseName: "malicious" },
      { rule: "RULE-001", note: "Persistence: attacker creates access key", caseName: "malicious" },
      { rule: "RULE-002", note: "Privilege escalation: admin policy attached", caseName: "malicious" },
      { rule: "RULE-019", note: "Exfil: large S3 download", caseName: "malicious" },
    ],
  },
  {
    id: "windows-stealth",
    title: "Windows foothold → stealth persistence → credential dump",
    steps: [
      { rule: "RULE-010", note: "Startup folder drop", caseName: "malicious" },
      { rule: "RULE-009", note: "WMI event subscription", caseName: "malicious" },
      { rule: "RULE-012", note: "Rundll32 MiniDump (LSASS)", caseName: "malicious" },
      { rule: "RULE-011", note: "LSASS access", caseName: "malicious" },
    ],
  },
];

function parseJsonl(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Record<string, any>);
}

async function fetchEvents(ruleId: string, caseName: "benign" | "malicious") {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const res = await fetch(`${base}/data/events/${ruleId}_${caseName}.jsonl`);
  const txt = await res.text();
  return parseJsonl(txt);
}

export default function StoryClient() {
  const [active, setActive] = useState<Story>(stories[0]);
  const [profile, setProfile] = useState<EnvironmentProfile>(PROFILES[0]);
  const [ruleDetails, setRuleDetails] = useState<Record<string, RuleDetail>>({});
  const [timeline, setTimeline] = useState<
    Array<{ ts: string; rule: string; note: string; event: Record<string, any>; matched: boolean; suppressed: boolean }>
  >([]);
  const [idx, setIdx] = useState<number>(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const uniq = Array.from(new Set(active.steps.map((s) => s.rule)));
      const details = await Promise.all(uniq.map((rid) => fetchRuleDetail(rid)));
      if (cancelled) return;
      const map: Record<string, RuleDetail> = {};
      for (const d of details) map[d.id] = d;
      setRuleDetails(map);

      const rows: Array<{ ts: string; rule: string; note: string; event: Record<string, any> }> = [];
      for (const step of active.steps) {
        const evts = await fetchEvents(step.rule, step.caseName);
        for (const e of evts) {
          rows.push({
            ts: String(e["@timestamp"] || e.time || e.timestamp || ""),
            rule: step.rule,
            note: step.note,
            event: e,
          });
        }
      }
      rows.sort((a, b) => a.ts.localeCompare(b.ts));

      const enriched = rows.map((r) => {
        const compiled = map[r.rule]?.compiled;
        const res = compiled ? evaluateCompiledRule(compiled, r.event) : { matched: false, why: null };
        const suppressed = isSuppressedByProfile(profile, r.event);
        return { ...r, matched: !!res.matched, suppressed };
      });

      setTimeline(enriched);
      setIdx(0);
      setPlaying(false);
    })().catch(() => {
      setTimeline([]);
      setIdx(0);
    });
    return () => {
      cancelled = true;
    };
  }, [active, profile]);

  useEffect(() => {
    if (!playing) {
      if (timer.current) window.clearInterval(timer.current);
      timer.current = null;
      return;
    }
    timer.current = window.setInterval(() => {
      setIdx((v) => (v >= timeline.length - 1 ? 0 : v + 1));
    }, 600);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
      timer.current = null;
    };
  }, [playing, timeline.length]);

  const cur = timeline[idx] || null;
  const counts = useMemo(() => {
    const total = timeline.length;
    const matches = timeline.filter((t) => t.matched && !t.suppressed).length;
    return { total, matches };
  }, [timeline]);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card">
        <h1 className="title">Kill-chain Story Mode</h1>
        <p className="subtitle">A narrative timeline across multiple rules, evaluated on real artifacts (offline).</p>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="pill">story</div>
          <select className="input" style={{ width: 420 }} value={active.id} onChange={(e) => setActive(stories.find((s) => s.id === e.target.value) || stories[0])}>
            {stories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ProfileSelector profiles={PROFILES} value={profile} onChange={setProfile} />

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="pill">
            timeline • events {counts.total} • matched (profile) {counts.matches}
          </div>
          <div className="row">
            <button className="btn" onClick={() => setPlaying((p) => !p)} disabled={!timeline.length}>
              {playing ? "pause" : "play"}
            </button>
            <button className="btn" onClick={() => setIdx((v) => Math.max(0, v - 1))} disabled={idx === 0}>
              step -
            </button>
            <button className="btn" onClick={() => setIdx((v) => Math.min(timeline.length - 1, v + 1))} disabled={idx >= timeline.length - 1}>
              step +
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <input
            className="input"
            type="range"
            min={0}
            max={Math.max(0, timeline.length - 1)}
            value={idx}
            onChange={(e) => setIdx(Number(e.target.value))}
            disabled={!timeline.length}
          />
        </div>

        {cur ? (
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
            <div className="card" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="pill">{cur.ts || "—"}</span>
                <Link className="pill" href={`/rules/${cur.rule}`}>
                  {cur.rule}
                </Link>
                <span className="pill">{cur.suppressed ? "suppressed" : cur.matched ? "matched" : "no match"}</span>
              </div>
              <p className="muted" style={{ margin: "10px 0 0 0" }}>
                {cur.note}
              </p>
              <pre className="muted" style={{ margin: "10px 0 0 0", overflowX: "auto" }}>
                {JSON.stringify(cur.event, null, 2)}
              </pre>
            </div>
            <div className="card" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="pill">steps</div>
              <div className="grid" style={{ marginTop: 12 }}>
                {active.steps.map((s, i) => (
                  <div key={s.rule + i} className="card" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <span className="pill">step {i + 1}</span>
                      <span className="pill">{s.rule}</span>
                    </div>
                    <p className="muted" style={{ margin: "10px 0 0 0" }}>
                      {s.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="muted" style={{ marginTop: 12 }}>
            no timeline data
          </div>
        )}
      </div>
    </div>
  );
}
