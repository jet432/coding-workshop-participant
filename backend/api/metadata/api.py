"""Metadata service logic."""

from __future__ import annotations

from typing import Any

from services.database import ASCENDING, assert_metadata_target, sanitize_document, sanitize_documents
from services.http import execute_service_request, json_response
from services.models import AppError, RequestContext
from services.utils import now_iso, uuid_id
from services.validation import normalize_text, validate_month


def build_metadata_filter(query: dict[str, str]) -> dict[str, Any]:
    """Build metadata filters."""

    filters: dict[str, Any] = {}
    q_value = (query.get("q") or "").strip()
    scope = (query.get("scope") or "").strip()
    entity_id = (query.get("entityId") or "").strip()
    month = (query.get("month") or "").strip()
    if q_value:
        filters["$or"] = [
            {"key": {"$regex": q_value, "$options": "i"}},
            {"value": {"$regex": q_value, "$options": "i"}},
        ]
    if scope:
        filters["scope"] = scope
    if entity_id:
        filters["entityId"] = entity_id
    if month:
        filters["month"] = month
    return filters


def validate_metadata_payload(database: Any, payload: dict[str, Any]) -> dict[str, Any]:
    """Validate metadata create/update input."""

    scope = normalize_text(payload.get("scope"), "scope")
    entity_id = normalize_text(payload.get("entityId"), "entityId")
    assert_metadata_target(database, scope or "", entity_id or "")
    month_value = payload.get("month")
    return {
        "scope": scope,
        "entityId": entity_id,
        "key": normalize_text(payload.get("key"), "key"),
        "value": normalize_text(payload.get("value"), "value"),
        "month": validate_month(month_value) if month_value not in (None, "") else None,
    }


def create_metadata(database: Any, payload: dict[str, Any]) -> dict[str, Any]:
    """Create a metadata record."""

    validated = validate_metadata_payload(database, payload)
    metadata_id = uuid_id("meta")
    timestamp = now_iso()
    metadata_item = {
        "_id": metadata_id,
        "id": metadata_id,
        **validated,
        "createdAt": timestamp,
        "updatedAt": timestamp,
    }
    database["metadata"].insert_one(metadata_item)
    return sanitize_document(metadata_item) or {}


def update_metadata(database: Any, metadata_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Update a metadata record."""

    validated = validate_metadata_payload(database, payload)
    validated["updatedAt"] = now_iso()
    database["metadata"].update_one({"id": metadata_id}, {"$set": validated})
    return sanitize_document(database["metadata"].find_one({"id": metadata_id})) or {}


def handle_metadata(
    database: Any,
    request: RequestContext,
    user: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Handle metadata routes."""

    _ = user
    if request.path in ("/", ""):
        if request.method == "GET":
            filters = build_metadata_filter(request.query)
            items = sanitize_documents(
                list(database["metadata"].find(filters).sort([("scope", ASCENDING), ("key", ASCENDING)]))
            )
            return json_response(200, {"items": items})
        if request.method == "POST":
            payload = create_metadata(database, request.body or {})
            return json_response(201, payload)
        raise AppError(405, "method_not_allowed", "HTTP method is not supported.")
    metadata_id = request.segments[0]
    metadata_item = database["metadata"].find_one({"id": metadata_id})
    if request.method == "GET":
        if not metadata_item:
            raise AppError(404, "not_found", "Metadata not found.")
        return json_response(200, sanitize_document(metadata_item))
    if request.method == "PUT":
        if not metadata_item:
            raise AppError(404, "not_found", "Metadata not found.")
        payload = update_metadata(database, metadata_id, request.body or {})
        return json_response(200, payload)
    if request.method == "DELETE":
        if not metadata_item:
            raise AppError(404, "not_found", "Metadata not found.")
        database["metadata"].delete_one({"id": metadata_id})
        return json_response(204)
    raise AppError(405, "method_not_allowed", "HTTP method is not supported.")


def handle_metadata_lambda(
    event: dict[str, Any] | None,
    context: Any | None = None,
) -> dict[str, Any]:
    """Lambda entrypoint for the metadata service."""

    _ = context
    return execute_service_request("metadata", event, handle_metadata)
