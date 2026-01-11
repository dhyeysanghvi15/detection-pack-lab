export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function statusPillClass(status: string) {
  if (status === "passing") return "pill good";
  if (status === "failing") return "pill bad";
  return "pill exp";
}

