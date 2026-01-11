"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { RuleIndexItem } from "../../lib/types";

export default function TacticBar({ rules }: { rules: RuleIndexItem[] }) {
  const counts: Record<string, number> = {};
  for (const r of rules) counts[r.tactic] = (counts[r.tactic] || 0) + 1;
  const data = Object.entries(counts)
    .map(([tactic, rules]) => ({ tactic, rules }))
    .sort((a, b) => b.rules - a.rules);

  return (
    <div className="card" style={{ height: 260 }}>
      <div className="pill">tactic coverage</div>
      <div style={{ height: 210, marginTop: 10 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="tactic" tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="rules" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

