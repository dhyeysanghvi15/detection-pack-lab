import fs from "node:fs/promises";
import path from "node:path";

import type { Coverage, Meta, Results, RuleDetail, RulesIndex } from "./types";

const histDir = path.join(process.cwd(), "public", "data", "history");

async function readJson<T>(file: string): Promise<T> {
  const p = path.join(histDir, file);
  const raw = await fs.readFile(p, "utf-8");
  return JSON.parse(raw) as T;
}

export async function historyAvailable(): Promise<boolean> {
  try {
    await fs.access(path.join(histDir, "meta.json"));
    return true;
  } catch {
    return false;
  }
}

export async function loadHistoryMeta(): Promise<Meta> {
  return readJson<Meta>("meta.json");
}

export async function loadHistoryRulesIndex(): Promise<RulesIndex> {
  return readJson<RulesIndex>("rules_index.json");
}

export async function loadHistoryResults(): Promise<Results> {
  return readJson<Results>("results.json");
}

export async function loadHistoryCoverage(): Promise<Coverage> {
  return readJson<Coverage>("coverage.json");
}

export async function loadHistoryRuleDetail(id: string): Promise<RuleDetail> {
  return readJson<RuleDetail>(path.join("rules", `${id}.json`));
}

