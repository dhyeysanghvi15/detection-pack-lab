import type { Coverage } from "./types";

export function groupCoverageByTactic(cov: Coverage) {
  const byTactic: Record<string, Coverage["techniques"]> = {};
  for (const t of cov.techniques) {
    byTactic[t.tactic] ||= [];
    byTactic[t.tactic].push(t);
  }
  return byTactic;
}

