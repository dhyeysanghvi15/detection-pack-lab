from __future__ import annotations

import argparse
from pathlib import Path
from typing import Optional

from rich.console import Console
from rich.table import Table

import sys

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from harness.artifacts import generate_artifacts, run_all_tests


def _repo_root() -> Path:
    return REPO_ROOT


def cmd_test(rule: Optional[str]) -> int:
    console = Console()
    repo_root = _repo_root()
    results, failures = run_all_tests(repo_root, only_rule=rule)

    table = Table(title="detpack-lab harness")
    table.add_column("Rule")
    table.add_column("Case")
    table.add_column("Expected")
    table.add_column("Actual")
    table.add_column("TTD(ms)")
    table.add_column("Passed")

    for rid, rr in sorted(results["by_rule"].items()):
        for t in rr["tests"]:
            table.add_row(
                rid,
                t["case"],
                str(t["expected_alerts"]),
                str(t["actual_alerts"]),
                str(t["time_to_detect_ms"]),
                "✅" if t["passed"] else "❌",
            )

    console.print(table)
    console.print(
        f"pass_rate={results['summary']['pass_rate']}% events_total={results['summary']['events_total']} alerts_expected={results['summary']['alerts_expected']} alerts_actual={results['summary']['alerts_actual']}"
    )

    if failures:
        console.print(f"[red]FAIL[/red] {len(failures)} failing test(s)")
        for f in failures[:10]:
            console.print(f" - {f['rule_id']} {f['case']}: {f['result']['why']}")
        return 1

    console.print("[green]OK[/green] all tests passed")
    return 0


def cmd_artifacts(rule: Optional[str], out_dir: Optional[str]) -> int:
    repo_root = _repo_root()
    out = Path(out_dir) if out_dir else repo_root / "site" / "public" / "data"
    generate_artifacts(repo_root, out, only_rule=rule)
    Console().print(f"[green]Wrote[/green] artifacts to {out}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(prog="detpack-lab harness")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_test = sub.add_parser("test", help="Run all rule replay tests")
    p_test.add_argument("--rule", help="Only run a single rule id (e.g., RULE-001)")

    p_art = sub.add_parser("artifacts", help="Generate site artifacts into site/public/data")
    p_art.add_argument("--rule", help="Only generate for a single rule id (e.g., RULE-001)")
    p_art.add_argument("--out", help="Output directory (defaults to site/public/data)")

    args = parser.parse_args()
    if args.cmd == "test":
        return cmd_test(args.rule)
    if args.cmd == "artifacts":
        return cmd_artifacts(args.rule, args.out)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
