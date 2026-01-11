import fs from "node:fs/promises";
import path from "node:path";

import type { Coverage, Meta, Results, RuleDetail, RulesIndex } from "./types";

const dataDir = path.join(process.cwd(), "public", "data");

async function readJson<T>(file: string): Promise<T> {
  const p = path.join(dataDir, file);
  const raw = await fs.readFile(p, "utf-8");
  return JSON.parse(raw) as T;
}

export async function loadMeta(): Promise<Meta> {
  return readJson<Meta>("meta.json");
}

export async function loadRulesIndex(): Promise<RulesIndex> {
  return readJson<RulesIndex>("rules_index.json");
}

export async function loadResults(): Promise<Results> {
  return readJson<Results>("results.json");
}

export async function loadCoverage(): Promise<Coverage> {
  return readJson<Coverage>("coverage.json");
}

export async function loadRuleDetail(id: string): Promise<RuleDetail> {
  return readJson<RuleDetail>(path.join("rules", `${id}.json`));
}

export async function loadAllRuleDetails(ids: string[]): Promise<RuleDetail[]> {
  return Promise.all(ids.map((id) => loadRuleDetail(id)));
}
