"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { RuleDetail } from "../lib/types";
import { evaluateCompiledRule } from "../lib/eval";
import type { EnvironmentProfile } from "../lib/profiles";
import { isSuppressedByProfile } from "../lib/profiles";

type EventDoc = Record<string, any>;

function parseJsonl(text: string): EventDoc[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function normalizeForDisplay(event: EventDoc) {
  return {
    timestamp: event["@timestamp"] ?? null,
    action: event.eventName ?? event.activityDisplayName ?? event.eventType ?? event.EventID ?? null,
    principal:
      event?.userIdentity?.userName ??
      event?.userIdentity?.sessionContext?.sessionIssuer?.userName ??
      event?.userPrincipalName ??
      event?.initiatedBy?.user?.userPrincipalName ??
      event?.actor?.alternateId ??
      event?.User ??
      event?.SubjectUserName ??
      null,
    ip: event.sourceIPAddress ?? event.client?.ipAddress ?? event.IpAddress ?? event.ipAddress ?? null,
  };
}

export default function ReplayPlayer({
  rule,
  ruleId,
  caseName,
  profile,
}: {
  rule: RuleDetail;
  ruleId: string;
  caseName: "benign" | "malicious";
  profile: EnvironmentProfile;
}) {
  const [raw, setRaw] = useState<string>("");
  const [idx, setIdx] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [speedMs, setSpeedMs] = useState<number>(650);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/data/events/${ruleId}_${caseName}.jsonl`;
    fetch(url)
      .then((r) => r.text())
      .then((t) => {
        if (!cancelled) {
          setRaw(t);
          setIdx(0);
          setPlaying(false);
        }
      })
      .catch(() => setRaw(""));
    return () => {
      cancelled = true;
    };
  }, [ruleId, caseName]);

  const events = useMemo(() => (raw ? parseJsonl(raw) : []), [raw]);
  const compiled = rule.compiled;

  const evaluations = useMemo(() => {
    if (!compiled) return [];
    return events.map((e) => {
      const suppressed = isSuppressedByProfile(profile, e);
      const res = evaluateCompiledRule(compiled, e);
      return { suppressed, ...res };
    });
  }, [compiled, events, profile]);

  const alertCount = useMemo(() => {
    return evaluations.filter((e) => e.matched && !e.suppressed).length;
  }, [evaluations]);

  const cur = events[idx] || null;
  const curEval = evaluations[idx] || null;
  const norm = cur ? normalizeForDisplay(cur) : null;

  useEffect(() => {
    if (!playing) {
      if (timer.current) window.clearInterval(timer.current);
      timer.current = null;
      return;
    }
    if (!events.length) return;
    timer.current = window.setInterval(() => {
      setIdx((v) => (v >= events.length - 1 ? 0 : v + 1));
    }, speedMs);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
      timer.current = null;
    };
  }, [playing, speedMs, events.length]);

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="pill">
          replay • {caseName} • {events.length} events • alerts (profile): {alertCount}
        </div>
        <div className="row">
          <button className="btn" onClick={() => setPlaying((p) => !p)} disabled={!events.length}>
            {playing ? "pause" : "play"}
          </button>
          <button className="btn" onClick={() => setIdx((v) => Math.max(0, v - 1))} disabled={idx === 0}>
            step -
          </button>
          <button
            className="btn"
            onClick={() => setIdx((v) => Math.min(events.length - 1, v + 1))}
            disabled={idx >= events.length - 1}
          >
            step +
          </button>
          <select className="input" style={{ width: 140 }} value={speedMs} onChange={(e) => setSpeedMs(Number(e.target.value))}>
            <option value={950}>slow</option>
            <option value={650}>normal</option>
            <option value={300}>fast</option>
          </select>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <input
          className="input"
          type="range"
          min={0}
          max={Math.max(0, events.length - 1)}
          value={idx}
          onChange={(e) => setIdx(Number(e.target.value))}
          disabled={!events.length}
        />
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        {evaluations.map((e, i) => {
          const c = e.suppressed ? "rgba(255,255,255,0.15)" : e.matched ? "rgba(34,197,94,0.85)" : "rgba(255,255,255,0.08)";
          return (
            <button
              key={i}
              className="btn"
              onClick={() => setIdx(i)}
              style={{
                padding: 0,
                width: 10,
                height: 10,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.14)",
                background: i === idx ? "rgba(34,211,238,0.75)" : c,
              }}
              aria-label={`event ${i + 1}`}
            />
          );
        })}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
        <div className="card" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div className="pill">event {idx + 1}</div>
            {curEval ? (
              <span className="pill">
                {curEval.suppressed ? "suppressed" : curEval.matched ? "matched" : "no match"}
              </span>
            ) : null}
          </div>
          <pre className="muted" style={{ margin: "10px 0 0 0", overflowX: "auto" }}>
            {cur ? JSON.stringify(cur, null, 2) : "no events (missing artifacts?)"}
          </pre>
        </div>

        <div className="card" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="pill">evaluation state</div>
          <div style={{ marginTop: 10 }}>
            {norm ? (
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                {Object.entries(norm).map(([k, v]) => (
                  <div key={k} className="pill" style={{ justifyContent: "space-between" }}>
                    <span>{k}</span>
                    <span className="muted">{v == null ? "—" : String(v)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="muted">no event loaded</div>
            )}

            <div style={{ marginTop: 12 }} className="pill">
              why
            </div>
            <pre className="muted" style={{ margin: "8px 0 0 0", whiteSpace: "pre-wrap" }}>
              {curEval ? JSON.stringify(curEval.why, null, 2) : "n/a"}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

