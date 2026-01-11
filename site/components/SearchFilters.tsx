"use client";

import type { RuleIndexItem, RuleSeverity, RuleStatus } from "../lib/types";

export type Filters = {
  q: string;
  status: RuleStatus | "all";
  severity: RuleSeverity | "all";
  tactic: string | "all";
  sort: string;
};

export const defaultFilters: Filters = {
  q: "",
  status: "all",
  severity: "all",
  tactic: "all",
  sort: "id",
};

export function applyFilters(rules: RuleIndexItem[], f: Filters) {
  const q = f.q.trim().toLowerCase();
  return rules.filter((r) => {
    if (f.status !== "all" && r.status !== f.status) return false;
    if (f.severity !== "all" && r.severity !== f.severity) return false;
    if (f.tactic !== "all" && r.tactic !== f.tactic) return false;
    if (!q) return true;
    const hay = `${r.id} ${r.name} ${r.description} ${r.logsource} ${r.tactic} ${r.techniques.join(
      " "
    )}`.toLowerCase();
    return hay.includes(q);
  });
}

export default function SearchFilters({
  rules,
  filters,
  onChange,
}: {
  rules: RuleIndexItem[];
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const tactics = Array.from(new Set(rules.map((r) => r.tactic))).sort();
  return (
    <div className="card">
      <div className="grid" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr" }}>
        <input
          className="input"
          placeholder="Search id, title, technique, logsource…"
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
        />
        <select
          className="input"
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value as any })}
        >
          <option value="all">status: all</option>
          <option value="passing">passing</option>
          <option value="failing">failing</option>
          <option value="experimental">experimental</option>
        </select>
        <select
          className="input"
          value={filters.severity}
          onChange={(e) => onChange({ ...filters, severity: e.target.value as any })}
        >
          <option value="all">severity: all</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </select>
        <select
          className="input"
          value={filters.tactic}
          onChange={(e) => onChange({ ...filters, tactic: e.target.value })}
        >
          <option value="all">tactic: all</option>
          {tactics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value })}
        >
          <option value="id">sort: id</option>
          <option value="status">sort: status</option>
          <option value="quality_desc">sort: quality</option>
          <option value="noise_desc">sort: noise</option>
          <option value="confidence_desc">sort: confidence</option>
        </select>
      </div>
    </div>
  );
}

