import PassRateGauge from "../components/Charts/PassRateGauge";
import SeverityPie from "../components/Charts/SeverityPie";
import TacticBar from "../components/Charts/TacticBar";
import PackScoreboard from "../components/PackScoreboard";
import { loadCoverage, loadMeta, loadResults, loadRulesIndex } from "../lib/data";
import { historyAvailable, loadHistoryMeta, loadHistoryResults, loadHistoryRulesIndex } from "../lib/history";

export default async function Page() {
  const [meta, results, coverage, index] = await Promise.all([
    loadMeta(),
    loadResults(),
    loadCoverage(),
    loadRulesIndex(),
  ]);

  const histOk = await historyAvailable();
  const [hMeta, hResults, hIndex] = histOk
    ? await Promise.all([loadHistoryMeta(), loadHistoryResults(), loadHistoryRulesIndex()])
    : [null, null, null];

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card">
        <h1 className="title">Evidence Dashboard</h1>
        <p className="subtitle">
          Generated from CI artifacts • commit <span className="kbd">{meta.commit}</span> • run{" "}
          <span className="kbd">{meta.run_id}</span> • {new Date(meta.generated_at).toLocaleString()}
        </p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.1fr 1fr 1fr" }}>
        <PassRateGauge passRate={results.summary.pass_rate} />
        <SeverityPie rules={index.rules} />
        <TacticBar rules={index.rules} />
      </div>

      <PackScoreboard
        current={index.rules}
        currentMeta={meta}
        currentResults={results}
        history={hIndex?.rules || null}
        historyMeta={hMeta}
        historyResults={hResults}
      />

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
        <div className="card">
          <div className="pill">rules</div>
          <h2 style={{ margin: "10px 0 0 0" }}>{meta.rules_total}</h2>
          <p className="muted" style={{ margin: 0 }}>
            passing {meta.rules_passing} • failing {meta.rules_failing}
          </p>
        </div>
        <div className="card">
          <div className="pill">events replayed</div>
          <h2 style={{ margin: "10px 0 0 0" }}>{results.summary.events_total}</h2>
          <p className="muted" style={{ margin: 0 }}>
            across benign + malicious streams
          </p>
        </div>
        <div className="card">
          <div className="pill">alerts</div>
          <h2 style={{ margin: "10px 0 0 0" }}>{results.summary.alerts_actual}</h2>
          <p className="muted" style={{ margin: 0 }}>
            expected {results.summary.alerts_expected}
          </p>
        </div>
        <div className="card">
          <div className="pill">avg time-to-detect</div>
          <h2 style={{ margin: "10px 0 0 0" }}>{results.summary.avg_time_to_detect_ms}ms</h2>
          <p className="muted" style={{ margin: 0 }}>
            first match index × 10ms (lab metric)
          </p>
        </div>
      </div>

      <div className="card">
        <div className="pill">ATT&CK techniques covered</div>
        <div className="row" style={{ marginTop: 10 }}>
          {coverage.techniques.slice(0, 16).map((t) => (
            <span key={t.technique} className="pill">
              {t.technique} • {t.rules.length} rule(s)
            </span>
          ))}
          {coverage.techniques.length > 16 ? <span className="pill">…</span> : null}
        </div>
      </div>
    </div>
  );
}
