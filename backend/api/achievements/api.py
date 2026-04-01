"""Achievement service logic."""

from __future__ import annotations

from typing import Any

from services.database import ASCENDING, assert_team_exists, sanitize_document, sanitize_documents
from services.http import execute_service_request, json_response
from services.models import AppError, RequestContext
from services.utils import now_iso, uuid_id
from services.validation import normalize_text, validate_month


def build_achievement_filter(query: dict[str, str]) -> dict[str, Any]:
    """Build search filters for achievements."""

    filters: dict[str, Any] = {}
    q_value = (query.get("q") or "").strip()
    team_id = (query.get("teamId") or "").strip()
    month = (query.get("month") or "").strip()
    if q_value:
        filters["$or"] = [
            {"title": {"$regex": q_value, "$options": "i"}},
            {"description": {"$regex": q_value, "$options": "i"}},
            {"impact": {"$regex": q_value, "$options": "i"}},
        ]
    if team_id:
        filters["teamId"] = team_id
    if month:
        filters["month"] = month
    return filters


def validate_achievement_payload(database: Any, payload: dict[str, Any]) -> dict[str, Any]:
    """Validate an achievement payload."""

    team_id = normalize_text(payload.get("teamId"), "teamId")
    assert_team_exists(database, team_id or "")
    return {
        "teamId": team_id,
        "month": validate_month(payload.get("month")),
        "title": normalize_text(payload.get("title"), "title"),
        "description": normalize_text(payload.get("description"), "description"),
        "impact": normalize_text(payload.get("impact"), "impact", required=False),
    }


def create_achievement(database: Any, payload: dict[str, Any]) -> dict[str, Any]:
    """Create an achievement record."""

    validated = validate_achievement_payload(database, payload)
    achievement_id = uuid_id("ach")
    timestamp = now_iso()
    achievement = {
        "_id": achievement_id,
        "id": achievement_id,
        **validated,
        "createdAt": timestamp,
        "updatedAt": timestamp,
    }
    database["achievements"].insert_one(achievement)
    return sanitize_document(achievement) or {}


def update_achievement(database: Any, achievement_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Update an achievement record."""

    validated = validate_achievement_payload(database, payload)
    validated["updatedAt"] = now_iso()
    database["achievements"].update_one({"id": achievement_id}, {"$set": validated})
    return sanitize_document(database["achievements"].find_one({"id": achievement_id})) or {}


def handle_achievements(
    database: Any,
    request: RequestContext,
    user: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Handle achievement routes."""

    _ = user
    if request.path in ("/", ""):
        if request.method == "GET":
            filters = build_achievement_filter(request.query)
            items = sanitize_documents(
                list(database["achievements"].find(filters).sort([("month", ASCENDING), ("title", ASCENDING)]))
            )
            return json_response(200, {"items": items})
        if request.method == "POST":
            payload = create_achievement(database, request.body or {})
            return json_response(201, payload)
        raise AppError(405, "method_not_allowed", "HTTP method is not supported.")
    achievement_id = request.segments[0]
    achievement = database["achievements"].find_one({"id": achievement_id})
    if request.method == "GET":
        if not achievement:
            raise AppError(404, "not_found", "Achievement not found.")
        return json_response(200, sanitize_document(achievement))
    if request.method == "PUT":
        if not achievement:
            raise AppError(404, "not_found", "Achievement not found.")
        payload = update_achievement(database, achievement_id, request.body or {})
        return json_response(200, payload)
    if request.method == "DELETE":
        if not achievement:
            raise AppError(404, "not_found", "Achievement not found.")
        database["achievements"].delete_one({"id": achievement_id})
        return json_response(204)
    raise AppError(405, "method_not_allowed", "HTTP method is not supported.")


def handle_achievements_lambda(
    event: dict[str, Any] | None,
    context: Any | None = None,
) -> dict[str, Any]:
    """Lambda entrypoint for the achievement service."""

    _ = context
    return execute_service_request("achievements", event, handle_achievements)
