# Tuning guide

## Goals
- Reduce false positives without making the detection brittle.
- Prefer stable, security-relevant fields (actor, target, admin action) over noisy telemetry.

## Practical knobs
- Narrow by known admin principals (allowlist) or approved automation roles.
- Add environment-specific exclusions (CI accounts, break-glass workflows).
- Add time windows (e.g., “after-hours”) only when paired with a robust signal.

## Avoid common pitfalls
- Don’t tune on volatile strings (process paths in user profile temp folders) unless necessary.
- Don’t rely solely on IP geolocation for “impossible travel”.
- Document every exclusion with a reason and owner.

