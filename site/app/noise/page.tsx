import Link from "next/link";

import { loadRulesIndex } from "../../lib/data";

export default async function Page() {
  const idx = await loadRulesIndex();
  const noisy = [...idx.rules].sort((a, b) => b.noise_risk - a.noise_risk).slice(0, 10);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card">
        <h1 className="title">Noise Lab</h1>
        <p className="subtitle">Find the rules most likely to produce alert volume and tune them safely.</p>
      </div>

      <div className="card">
        <div className="pill">top noisy rules</div>
        <div className="grid" style={{ marginTop: 12 }}>
          {noisy.map((r) => (
            <Link key={r.id} href={`/rules/${r.id}`} className="card" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div className="row">
                  <span className="pill">{r.id}</span>
                  <span className="pill">{r.status}</span>
                  <span className="pill">{r.severity}</span>
                </div>
                <span className="pill">noise {Math.round(r.noise_risk)}</span>
              </div>
              <h3 style={{ margin: "10px 0 0 0" }}>{r.name}</h3>
              <p className="muted" style={{ margin: "6px 0 0 0" }}>
                Suggested tune: add allowlists for known principals + tighten string matches.
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

