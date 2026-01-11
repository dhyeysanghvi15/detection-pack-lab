import { notFound } from "next/navigation";

import CopyAsButtons from "../../../components/CopyAsButtons";
import DiffViewer from "../../../components/DiffViewer";
import MonacoViewer from "../../../components/MonacoViewer";
import RuleTuningSimulator from "../../../components/RuleTuningSimulator";
import Scoreboard from "../../../components/Scoreboard";
import RuleReplaySection from "../../../components/RuleReplaySection";
import RuleRiskMeter from "../../../components/RuleRiskMeter";
import RuleSnapshotDiff from "../../../components/RuleSnapshotDiff";
import WhyPanel from "../../../components/WhyPanel";
import { loadAllRuleDetails, loadResults, loadRuleDetail, loadRulesIndex } from "../../../lib/data";
import { statusPillClass } from "../../../lib/normalize";

export async function generateStaticParams() {
  const idx = await loadRulesIndex();
  return idx.rules.map((r) => ({ id: r.id }));
}

export default async function Page({ params }: { params: { id: string } }) {
  const id = params.id;
  const [rule, results, idx] = await Promise.all([loadRuleDetail(id), loadResults(), loadRulesIndex()]);
  if (!rule) return notFound();

  const rr = results.by_rule[id];
  if (!rr) return notFound();

  const allDetails = await loadAllRuleDetails(idx.rules.map((r) => r.id));
  const fieldCounts: Record<string, number> = {};
  for (const d of allDetails) {
    for (const f of d.fields_used || []) fieldCounts[f] = (fieldCounts[f] || 0) + 1;
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ maxWidth: 860 }}>
            <div className="row">
              <span className="pill">{rule.id}</span>
              <span className={statusPillClass(rule.status)}>{rule.status}</span>
              <span className="pill">{rule.severity}</span>
              <span className="pill">{rule.logsource}</span>
            </div>
            <h1 className="title" style={{ marginTop: 12 }}>
              {rule.title}
            </h1>
            <p className="subtitle">{rule.description}</p>
            <div className="row" style={{ marginTop: 10 }}>
              {rule.techniques.map((t) => (
                <span key={t} className="pill">
                  {t}
                </span>
              ))}
              <span className="pill">{rule.tactic}</span>
            </div>
          </div>
          <div style={{ minWidth: 260 }}>
            <div className="card" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="pill">validation proof</div>
              <div style={{ marginTop: 10 }} className="grid">
                {rr.tests.map((t) => (
                  <div key={t.case} className="row" style={{ justifyContent: "space-between" }}>
                    <span className="pill">{t.case}</span>
                    <span className="pill">
                      exp {t.expected_alerts} • act {t.actual_alerts}
                    </span>
                    <span className="pill">{t.passed ? "pass" : "fail"}</span>
                  </div>
                ))}
              </div>
              <p className="muted" style={{ margin: "10px 0 0 0" }}>
                First-match time-to-detect is a lab metric (index × 10ms).
              </p>
            </div>
          </div>
        </div>
      </div>

      <Scoreboard rule={rule} />
      <RuleRiskMeter rule={rule} fieldCounts={fieldCounts} />

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <div className="pill" style={{ marginBottom: 10 }}>
            sigma
          </div>
          <MonacoViewer language="yaml" value={rule.sigma_text} />
        </div>
        <div>
          <div className="pill" style={{ marginBottom: 10 }}>
            elastic (kql)
          </div>
          <MonacoViewer language="text" value={rule.elastic_text} />
        </div>
      </div>

      <CopyAsButtons sigma={rule.sigma_text} kql={rule.elastic_text} esql={rule.elastic_esql} />
      <WhyPanel ruleId={id} results={results} />

      <div className="card">
        <div className="pill">detection replay player</div>
        <p className="muted" style={{ margin: "10px 0 0 0" }}>
          Plays the event stream and evaluates the compiled Sigma logic client-side (deterministic + explainable).
        </p>
      </div>
      <RuleReplaySection rule={rule} />

      <RuleTuningSimulator ruleId={id} results={results} rule={rule} />
      <RuleSnapshotDiff current={rule} />
      <DiffViewer a={rule.sigma_text} b={rule.elastic_text} />
    </div>
  );
}
