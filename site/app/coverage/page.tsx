import Link from "next/link";

import { loadCoverage } from "../../lib/data";
import { groupCoverageByTactic } from "../../lib/atta_ck";

export default async function Page() {
  const cov = await loadCoverage();
  const byTactic = groupCoverageByTactic(cov);
  const tactics = Object.keys(byTactic).sort();

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card">
        <h1 className="title">ATT&CK Coverage Matrix</h1>
        <p className="subtitle">Click a technique to jump into its rules.</p>
      </div>

      <div className="grid">
        {tactics.map((tactic) => (
          <div key={tactic} className="card">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div className="pill">{tactic}</div>
              <div className="muted">{byTactic[tactic].length} technique(s)</div>
            </div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginTop: 12 }}>
              {byTactic[tactic].map((tech) => {
                const total = tech.rules.length || 1;
                const heat = Math.round(((tech.status_breakdown.passing + 0.5 * tech.status_breakdown.experimental) / total) * 100);
                return (
                  <div
                    key={tech.technique}
                    className="card"
                    style={{
                      background: `linear-gradient(135deg, rgba(34,211,238,${0.08 + heat / 800}), rgba(124,58,237,0.10))`,
                    }}
                  >
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <span className="pill">{tech.technique}</span>
                      <span className="pill">{tech.rules.length} rule(s)</span>
                    </div>
                    <h3 style={{ margin: "10px 0 0 0" }}>{tech.name}</h3>
                    <div className="row" style={{ marginTop: 10 }}>
                      <span className="pill">pass {tech.status_breakdown.passing}</span>
                      <span className="pill">exp {tech.status_breakdown.experimental}</span>
                      <span className="pill">fail {tech.status_breakdown.failing}</span>
                    </div>
                    <div className="row" style={{ marginTop: 10 }}>
                      {tech.rules.slice(0, 6).map((rid) => (
                        <Link key={rid} className="pill" href={`/rules/${rid}`}>
                          {rid}
                        </Link>
                      ))}
                      {tech.rules.length > 6 ? <span className="pill">…</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

