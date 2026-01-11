# Data safety

All datasets in `tests/` are synthetic and intentionally sanitized:
- No secrets, tokens, real usernames, real org identifiers, or production IPs.
- Events are small JSON documents meant to exercise the harness deterministically.

If you add new datasets:
- Keep them synthetic or fully sanitized.
- Avoid including any proprietary event shapes.

