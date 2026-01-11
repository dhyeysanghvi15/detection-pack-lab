import type { RuleDetail } from "./types";

export async function fetchRuleDetail(id: string): Promise<RuleDetail> {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const res = await fetch(`${base}/data/rules/${id}.json`);
  if (!res.ok) throw new Error(`failed to load rule detail: ${id}`);
  return (await res.json()) as RuleDetail;
}

