import Link from "next/link";

import PackScoreboard from "../../components/PackScoreboard";
import { loadMeta, loadRulesIndex, loadResults } from "../../lib/data";
import { historyAvailable, loadHistoryMeta, loadHistoryResults, loadHistoryRulesIndex } from "../../lib/history";

export default async function Page() {
  const [meta, idx, results] = await Promise.all([loadMeta(), loadRulesIndex(), loadResults()]);
  const failing = idx.rules.filter((r) => r.status === "failing");
  const experimental = idx.rules.filter((r) => r.status === "experimental");
  const histOk = await historyAvailable();
  const [hMeta, hResults, hIndex] = histOk
    ? await Promise.all([loadHistoryMeta(), loadHistoryResults(), loadHistoryRulesIndex()])
    : [null, null, null];

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card">
        <h1 className="title">Pack Health</h1>
        <p className="subtitle">High-level quality and regression signals derived from CI artifacts.</p>
      </div>

      <PackScoreboard
        current={idx.rules}
        currentMeta={meta}
        currentResults={results}
        history={hIndex?.rules || null}
        historyMeta={hMeta}
        historyResults={hResults}
      />

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        <div className="card">
          <div className="pill">rules passing</div>
          <h2 style={{ margin: "10px 0 0 0" }}>{meta.rules_passing}</h2>
          <p className="muted" style={{ margin: 0 }}>
            of {meta.rules_total}
          </p>
        </div>
        <div className="card">
          <div className="pill">pass rate</div>
          <h2 style={{ margin: "10px 0 0 0" }}>{results.summary.pass_rate}%</h2>
          <p className="muted" style={{ margin: 0 }}>
            all test cases
          </p>
        </div>
        <div className="card">
          <div className="pill">failing rules</div>
          <h2 style={{ margin: "10px 0 0 0" }}>{failing.length}</h2>
          <p className="muted" style={{ margin: 0 }}>
            should block merges
          </p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card">
          <div className="pill">failing</div>
          <div className="row" style={{ marginTop: 10 }}>
            {failing.length ? failing.map((r) => <span key={r.id} className="pill bad">{r.id}</span>) : <span className="muted">none</span>}
          </div>
        </div>
        <div className="card">
          <div className="pill">experimental</div>
          <div className="row" style={{ marginTop: 10 }}>
            {experimental.length ? experimental.map((r) => <span key={r.id} className="pill exp">{r.id}</span>) : <span className="muted">none</span>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="pill">rule breakdown</div>
        <div className="grid" style={{ marginTop: 12 }}>
          {idx.rules
            .slice()
            .sort((a, b) => b.quality_score - a.quality_score)
            .map((r) => (
              <Link
                key={r.id}
                href={`/rules/${r.id}`}
                className="card"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <div className="row">
                    <span className="pill">{r.id}</span>
                    <span className="pill">{r.status}</span>
                    <span className="pill">{r.severity}</span>
                    <span className="pill">{r.tactic}</span>
                  </div>
                  <div className="row">
                    <span className="pill">quality {Math.round(r.quality_score)}</span>
                    <span className="pill">noise {Math.round(r.noise_risk)}</span>
                    <span className="pill">conf {Math.round(r.confidence)}</span>
                  </div>
                </div>
                <h3 style={{ margin: "10px 0 0 0" }}>{r.name}</h3>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
