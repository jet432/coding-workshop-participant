"""Shared request and error models."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any


class AppError(Exception):
    """Application error that maps to a structured HTTP response."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


@dataclass(slots=True)
class RequestContext:
    """Normalized request data extracted from a Lambda event."""

    method: str
    path: str
    segments: list[str]
    query: dict[str, str]
    headers: dict[str, str]
    body: dict[str, Any] | None


ServiceHandler = Callable[[Any, RequestContext, dict[str, Any] | None], dict[str, Any]]
