import Link from "next/link";

import { loadRulesIndex, loadRuleDetail } from "../../lib/data";

function extractFieldsFromSigmaText(sigmaText: string): string[] {
  const fields: string[] = [];
  const lines = sigmaText.split("\n");
  let inDetection = false;
  for (const line of lines) {
    if (line.startsWith("detection:")) inDetection = true;
    if (!inDetection) continue;
    const m = line.match(/^\s{4}([A-Za-z0-9_.|\\-]+):\s/);
    if (m) {
      const key = m[1];
      if (key === "condition") continue;
      if (key === "selection" || key.startsWith("filter_") || key === "filter") continue;
      const field = key.split("|")[0];
      if (!fields.includes(field)) fields.push(field);
    }
  }
  return fields;
}

export default async function Page() {
  const idx = await loadRulesIndex();
  const details = await Promise.all(idx.rules.map((r) => loadRuleDetail(r.id)));
  const fieldCount: Record<string, number> = {};
  for (const d of details) {
    const fields = d.fields_used?.length ? d.fields_used : extractFieldsFromSigmaText(d.sigma);
    for (const f of fields) fieldCount[f] = (fieldCount[f] || 0) + 1;
  }

  const rows = Object.entries(fieldCount)
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => b.count - a.count);

  const brittle = rows.filter((r) => r.count <= 2).slice(0, 12);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card">
        <h1 className="title">Schema Analyzer</h1>
        <p className="subtitle">Which fields does this pack rely on? Where is it brittle?</p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card">
          <div className="pill">top relied-on fields</div>
          <div className="grid" style={{ marginTop: 12, gridTemplateColumns: "1fr 1fr" }}>
            {rows.slice(0, 20).map((r) => (
              <div key={r.field} className="pill" style={{ justifyContent: "space-between" }}>
                <span>{r.field}</span>
                <span className="muted">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="pill">brittle field warnings</div>
          <p className="muted" style={{ margin: "10px 0 0 0" }}>
            Fields used by very few rules can be fragile across vendors/mappings. Validate pipeline mappings.
          </p>
          <div className="grid" style={{ marginTop: 12 }}>
            {brittle.map((r) => (
              <div key={r.field} className="pill" style={{ justifyContent: "space-between" }}>
                <span>{r.field}</span>
                <span className="muted">used by {r.count}</span>
              </div>
            ))}
          </div>
          <div className="muted" style={{ marginTop: 12 }}>
            Tip: check <Link href="/coverage">coverage</Link> and tune rules to use stable fields.
          </div>
        </div>
      </div>
    </div>
  );
}

