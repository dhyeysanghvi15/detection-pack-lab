export function simpleLineDiff(a: string, b: string) {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const max = Math.max(aLines.length, bLines.length);
  const out: Array<{ type: "same" | "add" | "del"; line: string }> = [];
  for (let i = 0; i < max; i++) {
    const al = aLines[i];
    const bl = bLines[i];
    if (al === bl) {
      if (al !== undefined) out.push({ type: "same", line: al });
      continue;
    }
    if (al !== undefined) out.push({ type: "del", line: al });
    if (bl !== undefined) out.push({ type: "add", line: bl });
  }
  return out;
}

