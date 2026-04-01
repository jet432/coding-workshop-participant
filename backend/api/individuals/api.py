"""Employee service logic."""

from __future__ import annotations

import re
from typing import Any

from services.database import ASCENDING, sanitize_document, sanitize_documents
from services.http import execute_service_request, json_response
from services.models import AppError, RequestContext
from services.utils import now_iso, uuid_id
from services.validation import normalize_text, validate_email, validate_region


def employee_projection(employee: dict[str, Any], database: Any) -> dict[str, Any]:
    """Build an enriched employee payload."""

    payload = sanitize_document(employee) or {}
    memberships = sanitize_documents(
        list(database["team_employees"].find({"employeeId": payload["id"]}))
    )
    member_team_ids = [membership["teamId"] for membership in memberships]
    leader_team_ids = [
        team["id"]
        for team in sanitize_documents(list(database["teams"].find({"leaderEmployeeId": payload["id"]})))
    ]
    payload["memberTeamIds"] = member_team_ids
    payload["leaderTeamIds"] = leader_team_ids
    payload["teamIds"] = sorted(set(member_team_ids + leader_team_ids))
    return payload


def list_employees(database: Any, query: dict[str, str]) -> list[dict[str, Any]]:
    """List employees with search and region filters."""

    filters: dict[str, Any] = {}
    q_value = (query.get("q") or "").strip()
    region = (query.get("region") or query.get("location") or "").strip().upper()
    if q_value:
        filters["$or"] = [
            {"firstName": {"$regex": q_value, "$options": "i"}},
            {"lastName": {"$regex": q_value, "$options": "i"}},
            {"email": {"$regex": q_value, "$options": "i"}},
            {"title": {"$regex": q_value, "$options": "i"}},
            {"region": {"$regex": q_value, "$options": "i"}},
        ]
    if region:
        filters["region"] = {"$regex": f"^{re.escape(region)}$", "$options": "i"}
    employees = database["employees"].find(filters).sort([("firstName", ASCENDING), ("lastName", ASCENDING)])
    return [employee_projection(employee, database) for employee in employees]


def validate_employee_payload(
    database: Any,
    payload: dict[str, Any],
    employee_id: str | None = None,
) -> dict[str, Any]:
    """Validate employee create or update data."""

    normalized = {
        "firstName": normalize_text(payload.get("firstName"), "firstName"),
        "lastName": normalize_text(payload.get("lastName"), "lastName"),
        "email": validate_email(payload.get("email")),
        "title": normalize_text(payload.get("title"), "title", required=False),
        "region": validate_region(payload.get("region")),
    }
    existing = sanitize_document(database["employees"].find_one({"email": normalized["email"]}))
    if existing and existing["id"] != employee_id:
        raise AppError(409, "duplicate_record", "An employee with this email already exists.")
    return normalized


def create_employee(database: Any, payload: dict[str, Any]) -> dict[str, Any]:
    """Create an employee record."""

    validated = validate_employee_payload(database, payload)
    timestamp = now_iso()
    employee_id = uuid_id("emp")
    employee = {
        "_id": employee_id,
        "id": employee_id,
        **validated,
        "createdAt": timestamp,
        "updatedAt": timestamp,
    }
    database["employees"].insert_one(employee)
    return employee_projection(employee, database)


def update_employee(database: Any, employee_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Update an employee record."""

    validated = validate_employee_payload(database, payload, employee_id)
    validated["updatedAt"] = now_iso()
    database["employees"].update_one({"id": employee_id}, {"$set": validated})
    employee = database["employees"].find_one({"id": employee_id})
    return employee_projection(employee, database)


def delete_employee(database: Any, employee_id: str) -> None:
    """Delete an employee if they are not currently leading a team."""

    active_lead = sanitize_document(database["teams"].find_one({"leaderEmployeeId": employee_id}))
    if active_lead:
        raise AppError(
            409,
            "leader_assignment_required",
            "The team leader must be reassigned before deleting this employee.",
            {"teamId": active_lead["id"], "teamName": active_lead["name"]},
        )
    database["employees"].delete_one({"id": employee_id})
    database["team_employees"].delete_many({"employeeId": employee_id})
    database["metadata"].delete_many({"scope": "employee", "entityId": employee_id})


def handle_employees(
    database: Any,
    request: RequestContext,
    user: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Handle employee routes."""

    _ = user
    if request.path in ("/", ""):
        if request.method == "GET":
            return json_response(200, {"items": list_employees(database, request.query)})
        if request.method == "POST":
            payload = create_employee(database, request.body or {})
            return json_response(201, payload)
        raise AppError(405, "method_not_allowed", "HTTP method is not supported.")
    employee_id = request.segments[0]
    employee = database["employees"].find_one({"id": employee_id})
    if request.method == "GET":
        if not employee:
            raise AppError(404, "not_found", "Employee not found.")
        return json_response(200, employee_projection(employee, database))
    if request.method == "PUT":
        if not employee:
            raise AppError(404, "not_found", "Employee not found.")
        payload = update_employee(database, employee_id, request.body or {})
        return json_response(200, payload)
    if request.method == "DELETE":
        if not employee:
            raise AppError(404, "not_found", "Employee not found.")
        delete_employee(database, employee_id)
        return json_response(204)
    raise AppError(405, "method_not_allowed", "HTTP method is not supported.")


def handle_individuals(event: dict[str, Any] | None, context: Any | None = None) -> dict[str, Any]:
    """Lambda entrypoint for the employee service."""

    _ = context
    return execute_service_request("individuals", event, handle_employees)
