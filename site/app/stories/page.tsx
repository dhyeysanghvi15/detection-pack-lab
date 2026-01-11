import Link from "next/link";

import { loadRulesIndex } from "../../lib/data";

const stories = [
  {
    id: "iam-to-persistence",
    title: "Cloud IAM breach → persistence → exfil",
    steps: [
      { rule: "RULE-003", note: "Initial access: successful console login without MFA" },
      { rule: "RULE-001", note: "Persistence: attacker creates a fresh access key" },
      { rule: "RULE-002", note: "Privilege escalation: admin policy attached" },
      { rule: "RULE-019", note: "Exfil: large S3 download" },
    ],
  },
  {
    id: "windows-stealth-persist",
    title: "Windows foothold → stealth persistence → credential dump",
    steps: [
      { rule: "RULE-010", note: "Startup folder drop" },
      { rule: "RULE-009", note: "WMI event subscription" },
      { rule: "RULE-012", note: "Rundll32 MiniDump (LSASS)" },
      { rule: "RULE-011", note: "LSASS access" },
    ],
  },
];

export default async function Page() {
  const idx = await loadRulesIndex();
  const present = new Set(idx.rules.map((r) => r.id));

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card">
        <h1 className="title">Kill-chain Story Mode</h1>
        <p className="subtitle">Curated narratives that link multiple detections into a replayable storyline.</p>
      </div>

      <div className="grid">
        {stories.map((s) => (
          <div key={s.id} className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <div className="pill">story</div>
                <h2 style={{ margin: "10px 0 0 0" }}>{s.title}</h2>
              </div>
              <div className="pill">{s.steps.length} steps</div>
            </div>
            <div className="grid" style={{ marginTop: 12 }}>
              {s.steps.map((st, i) => (
                <div key={st.rule + i} className="card" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <span className="pill">step {i + 1}</span>
                    {present.has(st.rule) ? (
                      <Link href={`/rules/${st.rule}`} className="pill">
                        {st.rule}
                      </Link>
                    ) : (
                      <span className="pill">{st.rule}</span>
                    )}
                  </div>
                  <p className="muted" style={{ margin: "10px 0 0 0" }}>
                    {st.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

