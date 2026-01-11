import Link from "next/link";

import { loadMeta, loadResults, loadRulesIndex } from "../../lib/data";
import {
  historyAvailable,
  loadHistoryMeta,
  loadHistoryResults,
  loadHistoryRulesIndex,
} from "../../lib/history";

export default async function Page() {
  const [meta, results, index] = await Promise.all([loadMeta(), loadResults(), loadRulesIndex()]);
  const histOk = await historyAvailable();
  const [hMeta, hResults, hIndex] = histOk
    ? await Promise.all([loadHistoryMeta(), loadHistoryResults(), loadHistoryRulesIndex()])
    : [null, null, null];

  const currentById = new Map(index.rules.map((r) => [r.id, r]));
  const historyById = new Map((hIndex?.rules || []).map((r) => [r.id, r]));

  const deltas = index.rules
    .map((r) => {
      const prev = historyById.get(r.id);
      return {
        id: r.id,
        name: r.name,
        status: r.status,
        quality_delta: prev ? r.quality_score - prev.quality_score : null,
        noise_delta: prev ? r.noise_risk - prev.noise_risk : null,
        status_prev: prev?.status || null,
      };
    })
    .filter((d) => d.quality_delta != null || d.status_prev != null)
    .sort((a, b) => Math.abs((b.quality_delta ?? 0) + (b.noise_delta ?? 0)) - Math.abs((a.quality_delta ?? 0) + (a.noise_delta ?? 0)));

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card">
        <h1 className="title">Diff & Alert Impact</h1>
        <p className="subtitle">
          Compares current artifacts to `public/data/history/*` to show what changed and what it would do to alert volume.
        </p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card">
          <div className="pill">current</div>
          <p className="muted" style={{ margin: "10px 0 0 0" }}>
            commit <span className="kbd">{meta.commit}</span> • run <span className="kbd">{meta.run_id}</span> • pass{" "}
            {results.summary.pass_rate}%
          </p>
        </div>
        <div className="card">
          <div className="pill">history</div>
          {hMeta && hResults ? (
            <p className="muted" style={{ margin: "10px 0 0 0" }}>
              commit <span className="kbd">{hMeta.commit}</span> • run <span className="kbd">{hMeta.run_id}</span> • pass{" "}
              {hResults.summary.pass_rate}%
            </p>
          ) : (
            <p className="muted" style={{ margin: "10px 0 0 0" }}>
              no history snapshot found
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="pill">largest changes</div>
        <div className="grid" style={{ marginTop: 12 }}>
          {deltas.slice(0, 20).map((d) => (
            <Link key={d.id} href={`/rules/${d.id}`} className="card" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div className="row">
                  <span className="pill">{d.id}</span>
                  <span className="pill">now {d.status}</span>
                  {d.status_prev ? <span className="pill">was {d.status_prev}</span> : null}
                </div>
                <div className="row">
                  {d.quality_delta != null ? <span className="pill">Δ quality {d.quality_delta.toFixed(0)}</span> : null}
                  {d.noise_delta != null ? <span className="pill">Δ noise {d.noise_delta.toFixed(0)}</span> : null}
                </div>
              </div>
              <h3 style={{ margin: "10px 0 0 0" }}>{d.name}</h3>
              <p className="muted" style={{ margin: "6px 0 0 0" }}>
                Open the rule to see a per-rule snapshot diff and computed benign alert impact.
              </p>
            </Link>
          ))}
          {!deltas.length ? <div className="muted">no diffs detected</div> : null}
        </div>
      </div>
    </div>
  );
}

