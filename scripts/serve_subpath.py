from __future__ import annotations

import argparse
import http.server
import os
import socketserver
from pathlib import Path
from typing import Optional


class SubpathHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, directory: Optional[str] = None, prefix: str = "", **kwargs):
        self._prefix = prefix.rstrip("/")
        super().__init__(*args, directory=directory, **kwargs)

    def translate_path(self, path: str) -> str:
        # Serve only under the prefix (e.g., /detpack-lab/*), mapping to directory root.
        if self._prefix and path.startswith(self._prefix + "/"):
            path = path[len(self._prefix) :]
        elif self._prefix and path == self._prefix:
            path = "/"
        elif self._prefix:
            # Anything outside prefix -> 404 by mapping to non-existent path
            path = "/__not_found__"
        return super().translate_path(path)

    def log_message(self, fmt: str, *args) -> None:
        # Keep test output quiet unless debugging.
        return


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dir", default="site/out")
    parser.add_argument("--prefix", default="/detpack-lab")
    parser.add_argument("--port", type=int, default=3999)
    args = parser.parse_args()

    directory = Path(args.dir).resolve()
    if not directory.exists():
        raise SystemExit(f"missing directory: {directory}")

    handler = lambda *a, **kw: SubpathHandler(*a, directory=str(directory), prefix=args.prefix, **kw)  # noqa: E731
    with socketserver.TCPServer(("127.0.0.1", args.port), handler) as httpd:
        httpd.allow_reuse_address = True
        print(f"Serving {directory} at http://127.0.0.1:{args.port}{args.prefix}/")
        httpd.serve_forever()


if __name__ == "__main__":
    raise SystemExit(main())

