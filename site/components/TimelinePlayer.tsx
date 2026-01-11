"use client";

import { useEffect, useMemo, useState } from "react";

type EventDoc = Record<string, any>;

function parseJsonl(text: string): EventDoc[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

export default function TimelinePlayer({ ruleId, caseName }: { ruleId: string; caseName: "benign" | "malicious" }) {
  const [raw, setRaw] = useState<string>("");
  const [idx, setIdx] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    const url = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/data/events/${ruleId}_${caseName}.jsonl`;
    fetch(url)
      .then((r) => r.text())
      .then((t) => {
        if (!cancelled) {
          setRaw(t);
          setIdx(0);
        }
      })
      .catch(() => setRaw(""));
    return () => {
      cancelled = true;
    };
  }, [ruleId, caseName]);

  const events = useMemo(() => (raw ? parseJsonl(raw) : []), [raw]);
  const cur = events[idx] || null;

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="pill">
          log replay • {caseName} • {events.length} events
        </div>
        <div className="row">
          <button className="btn" onClick={() => setIdx((v) => Math.max(0, v - 1))} disabled={idx === 0}>
            prev
          </button>
          <button
            className="btn"
            onClick={() => setIdx((v) => Math.min(events.length - 1, v + 1))}
            disabled={idx >= events.length - 1}
          >
            next
          </button>
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
        />
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
        <div className="card" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="pill">event {idx + 1}</div>
          <pre className="muted" style={{ margin: "10px 0 0 0", overflowX: "auto" }}>
            {cur ? JSON.stringify(cur, null, 2) : "no events"}
          </pre>
        </div>
        <div className="card" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="pill">key fields</div>
          <div style={{ marginTop: 10 }}>
            {cur ? (
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                {Object.entries(cur)
                  .slice(0, 16)
                  .map(([k, v]) => (
                    <div key={k} className="pill" style={{ justifyContent: "space-between" }}>
                      <span>{k}</span>
                      <span className="muted" style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {typeof v === "string" ? v : JSON.stringify(v)}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="muted">no events</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

