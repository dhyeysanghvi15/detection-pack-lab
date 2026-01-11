"use client";

import toast from "react-hot-toast";

async function copy(text: string) {
  await navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard");
}

function bestEffortSpl(kql: string) {
  return `search ${kql.replace(/:/g, "=")}`;
}

function bestEffortSentinelKql(kql: string) {
  return kql.replace(/:/g, " == ");
}

function bestEffortEsql(kql: string) {
  return `FROM logs | WHERE ${kql}`;
}

export default function CopyAsButtons({
  sigma,
  kql,
  esql,
}: {
  sigma: string;
  kql: string;
  esql?: string;
}) {
  return (
    <div className="card">
      <div className="pill">copy as</div>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn" onClick={() => copy(sigma)}>
          Sigma
        </button>
        <button className="btn" onClick={() => copy(kql)}>
          Elastic KQL
        </button>
        <button className="btn" onClick={() => copy(esql || bestEffortEsql(kql))}>
          ES|QL {esql ? "" : "(best-effort)"}
        </button>
        <button className="btn" onClick={() => copy(bestEffortSpl(kql))}>
          SPL (best-effort)
        </button>
        <button className="btn" onClick={() => copy(bestEffortSentinelKql(kql))}>
          Sentinel KQL (best-effort)
        </button>
      </div>
    </div>
  );
}
