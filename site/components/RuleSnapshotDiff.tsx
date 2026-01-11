"use client";

import { useEffect, useMemo, useState } from "react";

import type { RuleDetail } from "../lib/types";
import { evaluateCompiledRule } from "../lib/eval";
import DiffViewer from "./DiffViewer";

function parseJsonl(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Record<string, any>);
}

export default function RuleSnapshotDiff({ current }: { current: RuleDetail }) {
  const [prev, setPrev] = useState<RuleDetail | null>(null);
  const [benignRaw, setBenignRaw] = useState<string>("");
  const [malRaw, setMalRaw] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    fetch(`${base}/data/history/rules/${current.id}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled) setPrev(j);
      })
      .catch(() => setPrev(null));
    fetch(`${base}/data/events/${current.id}_benign.jsonl`)
      .then((r) => r.text())
      .then((t) => {
        if (!cancelled) setBenignRaw(t);
      })
      .catch(() => setBenignRaw(""));
    fetch(`${base}/data/events/${current.id}_malicious.jsonl`)
      .then((r) => r.text())
      .then((t) => {
        if (!cancelled) setMalRaw(t);
      })
      .catch(() => setMalRaw(""));
    return () => {
      cancelled = true;
    };
  }, [current.id]);

  const benignEvents = useMemo(() => (benignRaw ? parseJsonl(benignRaw) : []), [benignRaw]);
  const malEvents = useMemo(() => (malRaw ? parseJsonl(malRaw) : []), [malRaw]);

  const impact = useMemo(() => {
    if (!prev?.compiled || !current.compiled) return null;
    const count = (events: Array<Record<string, any>>, compiled: NonNullable<RuleDetail["compiled"]>) =>
      events.reduce((acc, e) => acc + (evaluateCompiledRule(compiled, e).matched ? 1 : 0), 0);

    const prevBen = count(benignEvents, prev.compiled);
    const curBen = count(benignEvents, current.compiled);
    const prevMal = count(malEvents, prev.compiled);
    const curMal = count(malEvents, current.compiled);
    return {
      benign: { prev: prevBen, cur: curBen, delta: curBen - prevBen },
      malicious: { prev: prevMal, cur: curMal, delta: curMal - prevMal },
    };
  }, [benignEvents, current.compiled, malEvents, prev?.compiled]);

  if (!prev) {
    return (
      <div className="card">
        <div className="pill">snapshot diff</div>
        <p className="muted" style={{ margin: "10px 0 0 0" }}>
          No history snapshot found for this rule.
        </p>
      </div>
    );
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="pill">snapshot diff (history → current)</div>
          {impact ? (
            <div className="pill">
              benign: {impact.benign.prev} → {impact.benign.cur} ({impact.benign.delta >= 0 ? "+" : ""}
              {impact.benign.delta}) • malicious: {impact.malicious.prev} → {impact.malicious.cur} (
              {impact.malicious.delta >= 0 ? "+" : ""}
              {impact.malicious.delta})
            </div>
          ) : (
            <div className="pill">impact: n/a</div>
          )}
        </div>
        <p className="muted" style={{ margin: "10px 0 0 0" }}>
          Alert impact is computed by replaying the datasets against both compiled rule snapshots client-side.
        </p>
      </div>
      <DiffViewer a={prev.sigma_text || ""} b={current.sigma_text || ""} />
    </div>
  );
}
