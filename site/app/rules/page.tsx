import { loadRulesIndex } from "../../lib/data";
import RuleExplorerClient from "./rule-explorer-client";

export default async function Page() {
  const index = await loadRulesIndex();
  return <RuleExplorerClient rules={index.rules} />;
}

