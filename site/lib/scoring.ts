import type { RuleIndexItem, RuleStatus } from "./types";

export function statusRank(s: RuleStatus): number {
  if (s === "failing") return 0;
  if (s === "experimental") return 1;
  return 2;
}

export function sortRules(rules: RuleIndexItem[], sort: string): RuleIndexItem[] {
  const copy = [...rules];
  if (sort === "quality_desc") return copy.sort((a, b) => b.quality_score - a.quality_score);
  if (sort === "noise_desc") return copy.sort((a, b) => b.noise_risk - a.noise_risk);
  if (sort === "confidence_desc") return copy.sort((a, b) => b.confidence - a.confidence);
  if (sort === "status") return copy.sort((a, b) => statusRank(b.status) - statusRank(a.status));
  return copy.sort((a, b) => a.id.localeCompare(b.id));
}

