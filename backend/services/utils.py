"""Small reusable utility helpers."""

from __future__ import annotations

import secrets
from datetime import datetime, timezone


def now_iso() -> str:
    """Return the current UTC timestamp in ISO format."""

    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def uuid_id(prefix: str) -> str:
    """Generate a stable string identifier with a readable prefix."""

    return f"{prefix}-{secrets.token_hex(6)}"
