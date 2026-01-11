"use client";

import { ResponsiveContainer, PieChart, Pie } from "recharts";

export default function PassRateGauge({ passRate }: { passRate: number }) {
  const ok = Math.max(0, Math.min(100, passRate));
  const data = [
    { name: "pass", value: ok },
    { name: "rest", value: 100 - ok },
  ];
  return (
    <div className="card" style={{ height: 220 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="pill">pack pass rate</div>
          <h2 style={{ margin: "10px 0 0 0", letterSpacing: "-0.02em" }}>{ok.toFixed(2)}%</h2>
          <p className="muted" style={{ margin: 0 }}>
            Based on deterministic replay tests
          </p>
        </div>
      </div>
      <div style={{ height: 130, marginTop: 10 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              startAngle={180}
              endAngle={0}
              innerRadius={45}
              outerRadius={70}
              paddingAngle={2}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
