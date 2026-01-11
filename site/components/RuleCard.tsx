"use client";

import Link from "next/link";
import type { RuleIndexItem } from "../lib/types";
import { statusPillClass } from "../lib/normalize";

function sevBadge(sev: RuleIndexItem["severity"]) {
  const color =
    sev === "critical"
      ? "rgba(239,68,68,0.92)"
      : sev === "high"
      ? "rgba(245,158,11,0.95)"
      : sev === "medium"
      ? "rgba(34,211,238,0.95)"
      : "rgba(148,163,184,0.95)";
  return <span className="pill" style={{ borderColor: "rgba(255,255,255,0.12)", color }}>{sev}</span>;
}

export default function RuleCard({ r }: { r: RuleIndexItem }) {
  return (
    <Link href={`/rules/${r.id}`} className="card" style={{ display: "block" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ maxWidth: 820 }}>
          <div className="row" style={{ alignItems: "center" }}>
            <span className="pill">{r.id}</span>
            <span className={statusPillClass(r.status)}>{r.status}</span>
            {sevBadge(r.severity)}
            <span className="pill">{r.logsource}</span>
          </div>
          <h3 style={{ margin: "10px 0 6px 0", letterSpacing: "-0.02em" }}>{r.name}</h3>
          <p className="muted" style={{ margin: 0 }}>
            {r.description}
          </p>
        </div>
        <div style={{ textAlign: "right", minWidth: 180 }}>
          <div className="pill">quality {Math.round(r.quality_score)}</div>
          <div className="pill">noise {Math.round(r.noise_risk)}</div>
          <div className="pill">confidence {Math.round(r.confidence)}</div>
        </div>
      </div>
    </Link>
  );
}

