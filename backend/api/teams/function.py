"""Lambda handler for team routes."""

from __future__ import annotations

from typing import Any

from api import handle_teams_lambda


def handler(event: dict[str, Any] | None = None, context: Any | None = None) -> dict[str, Any]:
    """Handle Lambda requests for the team service."""

    return handle_teams_lambda(event, context)


if __name__ == "__main__":
    print(handler())
