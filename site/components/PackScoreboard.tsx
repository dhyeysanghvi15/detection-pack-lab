"use client";

import { LineChart, Line, Tooltip, ResponsiveContainer, XAxis, YAxis } from "recharts";

import type { Meta, Results, RuleIndexItem } from "../lib/types";

function packQuality(rules: RuleIndexItem[]) {
  if (!rules.length) return 0;
  const avg = rules.reduce((a, r) => a + r.quality_score, 0) / rules.length;
  return Math.round(avg);
}

export default function PackScoreboard({
  current,
  currentMeta,
  currentResults,
  history,
  historyMeta,
  historyResults,
}: {
  current: RuleIndexItem[];
  currentMeta: Meta;
  currentResults: Results;
  history: RuleIndexItem[] | null;
  historyMeta: Meta | null;
  historyResults: Results | null;
}) {
  const series = [];
  if (history && historyMeta && historyResults) {
    series.push({
      when: new Date(historyMeta.generated_at).toISOString().slice(0, 10),
      pass_rate: historyResults.summary.pass_rate,
      quality: packQuality(history),
    });
  }
  series.push({
    when: new Date(currentMeta.generated_at).toISOString().slice(0, 10),
    pass_rate: currentResults.summary.pass_rate,
    quality: packQuality(current),
  });

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="pill">pack scoreboard</div>
          <h2 style={{ margin: "10px 0 0 0", letterSpacing: "-0.02em" }}>{packQuality(current)} / 100</h2>
          <p className="muted" style={{ margin: 0 }}>
            Avg rule quality score • pass rate {currentResults.summary.pass_rate}%
          </p>
        </div>
        <div className="row">
          <span className="pill">rules {currentMeta.rules_total}</span>
          <span className="pill">failing {currentMeta.rules_failing}</span>
        </div>
      </div>
      <div style={{ height: 220, marginTop: 12 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <XAxis dataKey="when" tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="pass_rate" />
            <Line type="monotone" dataKey="quality" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

