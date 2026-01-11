"use client";

import { PieChart, Pie, Tooltip, ResponsiveContainer } from "recharts";
import type { RuleIndexItem } from "../../lib/types";

export default function SeverityPie({ rules }: { rules: RuleIndexItem[] }) {
  const counts: Record<string, number> = {};
  for (const r of rules) counts[r.severity] = (counts[r.severity] || 0) + 1;
  const data = Object.entries(counts).map(([name, value]) => ({ name, value }));

  return (
    <div className="card" style={{ height: 260 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="pill">severity distribution</div>
        <div className="muted">{rules.length} rules</div>
      </div>
      <div style={{ height: 210 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

