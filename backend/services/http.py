"""HTTP request parsing and Lambda dispatch helpers."""

from __future__ import annotations

import base64
import json
from typing import Any
from urllib.parse import parse_qs

from services.auth import require_authentication
from services.database import DuplicateKeyError, get_database
from services.models import AppError, RequestContext, ServiceHandler


def json_response(status_code: int, payload: Any | None = None) -> dict[str, Any]:
    """Build a Lambda-compatible JSON response."""

    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    }
    if status_code == 204:
        return {"statusCode": status_code, "headers": headers, "body": ""}
    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(payload),
    }


def error_response(error: AppError) -> dict[str, Any]:
    """Convert an application error into the standard API shape."""

    return json_response(
        error.status_code,
        {
            "error": {
                "code": error.code,
                "message": error.message,
                "details": error.details,
            }
        },
    )


def parse_event(event: dict[str, Any] | None, service_name: str) -> RequestContext:
    """Normalize a Lambda event into a request context."""

    event = event or {}
    headers = {
        str(key).lower(): value
        for key, value in (event.get("headers") or {}).items()
        if value is not None
    }
    method = (
        event.get("requestContext", {}).get("http", {}).get("method")
        or event.get("httpMethod")
        or "GET"
    ).upper()
    raw_path = (
        event.get("rawPath")
        or event.get("requestContext", {}).get("http", {}).get("path")
        or "/"
    )
    query = parse_query_params(event)
    body = parse_json_body(event)
    path = normalize_service_path(raw_path, service_name)
    segments = [segment for segment in path.split("/") if segment]
    return RequestContext(
        method=method,
        path=path,
        segments=segments,
        query=query,
        headers=headers,
        body=body,
    )


def parse_query_params(event: dict[str, Any]) -> dict[str, str]:
    """Read query parameters from a Lambda event."""

    query = event.get("queryStringParameters")
    if isinstance(query, dict):
        return {key: value for key, value in query.items() if value is not None}
    raw_query = event.get("rawQueryString") or ""
    if not raw_query:
        return {}
    parsed = parse_qs(raw_query, keep_blank_values=True)
    return {key: values[-1] for key, values in parsed.items() if values}


def parse_json_body(event: dict[str, Any]) -> dict[str, Any] | None:
    """Parse a JSON request body, raising a 400 on malformed input."""

    raw_body = event.get("body")
    if raw_body in (None, ""):
        return None
    if event.get("isBase64Encoded"):
        raw_body = base64.b64decode(raw_body).decode("utf-8")
    if isinstance(raw_body, dict):
        return raw_body
    try:
        parsed = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise AppError(400, "invalid_json", "Malformed JSON body.", {"error": str(exc)}) from exc
    if not isinstance(parsed, dict):
        raise AppError(400, "invalid_json", "Request body must be a JSON object.")
    return parsed


def normalize_service_path(raw_path: str, service_name: str) -> str:
    """Strip any service-specific API prefix from a request path."""

    path = raw_path.split("?", maxsplit=1)[0] if raw_path else "/"
    candidates = [f"/api/{service_name}", f"/{service_name}"]
    for candidate in candidates:
        if path == candidate:
            return "/"
        if path.startswith(candidate + "/"):
            return path[len(candidate) :]
    return path if path.startswith("/") else f"/{path}"


def execute_service_request(
    service_name: str,
    event: dict[str, Any] | None,
    service_handler: ServiceHandler,
    requires_auth: bool = True,
) -> dict[str, Any]:
    """Parse, authenticate, and dispatch a request to a service handler."""

    try:
        request = parse_event(event, service_name)
        if request.method == "OPTIONS":
            return json_response(204, {})
        database = get_database()
        user = require_authentication(database, request.headers) if requires_auth else None
        return service_handler(database, request, user)
    except AppError as error:
        return error_response(error)
    except DuplicateKeyError:
        return error_response(
            AppError(409, "duplicate_record", "A record with the same unique field already exists.")
        )
    except Exception as error:  # pragma: no cover - defensive catch for Lambda runtime
        return error_response(
            AppError(500, "internal_error", "Unexpected server error.", {"error": str(error)})
        )


def assert_method(allowed_methods: set[str], method: str) -> None:
    """Reject unsupported HTTP methods."""

    if method not in allowed_methods:
        raise AppError(405, "method_not_allowed", "HTTP method is not supported.")
