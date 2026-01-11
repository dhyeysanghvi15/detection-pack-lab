import { loadMeta, loadRulesIndex, loadResults } from "../../lib/data";

export default async function Page() {
  const [meta, idx, results] = await Promise.all([loadMeta(), loadRulesIndex(), loadResults()]);
  const failing = idx.rules.filter((r) => r.status === "failing");
  const experimental = idx.rules.filter((r) => r.status === "experimental");

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card">
        <h1 className="title">Pack Health</h1>
        <p className="subtitle">High-level quality and regression signals derived from CI artifacts.</p>
      </div>

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
    </div>
  );
}

