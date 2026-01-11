import NoiseClient from "./noise-client";
import { loadResults, loadRulesIndex } from "../../lib/data";

export default async function Page() {
  const [idx, results] = await Promise.all([loadRulesIndex(), loadResults()]);
  return <NoiseClient rules={idx.rules} results={results} />;
}
