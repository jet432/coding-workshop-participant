"""Lambda handler for employee routes."""

from __future__ import annotations

from typing import Any

from api import handle_individuals


def handler(event: dict[str, Any] | None = None, context: Any | None = None) -> dict[str, Any]:
    """Handle Lambda requests for the employee service."""

    return handle_individuals(event, context)


if __name__ == "__main__":
    print(handler())
