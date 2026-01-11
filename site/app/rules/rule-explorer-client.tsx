"use client";

import { useMemo, useState } from "react";

import RuleCard from "../../components/RuleCard";
import SearchFilters, { applyFilters, defaultFilters, type Filters } from "../../components/SearchFilters";
import { sortRules } from "../../lib/scoring";
import type { RuleIndexItem } from "../../lib/types";

export default function RuleExplorerClient({ rules }: { rules: RuleIndexItem[] }) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const filtered = useMemo(() => applyFilters(rules, filters), [rules, filters]);
  const sorted = useMemo(() => sortRules(filtered, filters.sort), [filtered, filters.sort]);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card">
        <h1 className="title">Rule Explorer</h1>
        <p className="subtitle">
          Search, filter, and open a rule to see Sigma, Elastic KQL, replay evidence, and “why” explanations.
        </p>
      </div>
      <SearchFilters rules={rules} filters={filters} onChange={setFilters} />
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="pill">{sorted.length} shown</span>
        <span className="pill">
          tip: use <span className="kbd">RULE-00</span> to jump by id
        </span>
      </div>
      <div className="grid">
        {sorted.map((r) => (
          <RuleCard key={r.id} r={r} />
        ))}
      </div>
    </div>
  );
}

