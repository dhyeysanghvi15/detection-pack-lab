import fs from "node:fs";
import path from "node:path";

const outDir = path.join(process.cwd(), "out");
if (!fs.existsSync(outDir)) {
  console.error(
    "Static export output not found. Run `npm run build` first (Next output: export)."
  );
  process.exit(1);
}
console.log(`OK: static site ready at ${outDir}`);

