from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Optional, Tuple


@dataclass(frozen=True)
class Resp:
    status: int
    body: bytes
    final_url: str


def get(url: str, timeout_s: float = 5.0) -> Resp:
    req = urllib.request.Request(url, headers={"User-Agent": "detpack-lab-http-sanity"})
    with urllib.request.urlopen(req, timeout=timeout_s) as r:
        return Resp(status=int(r.status), body=r.read(), final_url=str(r.geturl()))


def wait_for(url: str, deadline_s: float = 60.0) -> Resp:
    start = time.time()
    last_err: Optional[str] = None
    while time.time() - start < deadline_s:
        try:
            return get(url)
        except Exception as e:
            last_err = str(e)
            time.sleep(0.6)
    raise RuntimeError(f"timeout waiting for {url}; last_error={last_err}")


def assert_status(url: str, expected: Tuple[int, ...] = (200,)) -> Resp:
    r = get(url)
    if r.status not in expected:
        raise AssertionError(f"{url}: expected {expected}, got {r.status} (final={r.final_url})")
    return r


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:3000")
    parser.add_argument("--prefix", default="", help="e.g. /detpack-lab")
    args = parser.parse_args()

    base = args.base.rstrip("/")
    prefix = args.prefix.rstrip("/")

    root = base + (prefix or "")
    print(f"Waiting for {root} ...")
    wait_for(root + "/")

    # Static export uses trailing slashes.
    paths = [
        "/",
        "/rules/",
        "/coverage/",
        "/noise/",
        "/stories/",
        "/diff/",
    ]
    for p in paths:
        r = assert_status(root + p, (200,))
        print(f"OK {prefix}{p} -> {r.status} ({len(r.body)} bytes)")

    meta = assert_status(root + "/data/meta.json", (200,))
    meta_obj = json.loads(meta.body.decode("utf-8"))
    for k in ["generated_at", "commit", "run_id", "rules_total", "rules_passing", "rules_failing"]:
        if k not in meta_obj:
            raise AssertionError(f"meta.json missing key: {k}")
    print(f"OK {prefix}/data/meta.json parses and has required keys")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
