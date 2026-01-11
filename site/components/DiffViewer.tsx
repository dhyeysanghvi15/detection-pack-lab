"use client";

import { simpleLineDiff } from "../lib/diff";

export default function DiffViewer({ a, b }: { a: string; b: string }) {
  const diff = simpleLineDiff(a, b);
  return (
    <div className="card">
      <div className="pill">diff (naive line diff)</div>
      <pre style={{ margin: "10px 0 0 0", overflowX: "auto" }}>
        {diff.slice(0, 220).map((d, i) => {
          const prefix = d.type === "add" ? "+ " : d.type === "del" ? "- " : "  ";
          const color =
            d.type === "add"
              ? "rgba(34,197,94,0.92)"
              : d.type === "del"
              ? "rgba(239,68,68,0.92)"
              : "rgba(255,255,255,0.60)";
          return (
            <div key={i} style={{ color, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
              {prefix}
              {d.line}
            </div>
          );
        })}
      </pre>
    </div>
  );
}

