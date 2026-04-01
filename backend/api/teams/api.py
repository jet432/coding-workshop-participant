"""Team service logic."""

from __future__ import annotations

import re
from typing import Any

from services.constants import MAX_TEAM_MEMBERS
from services.database import ASCENDING, assert_employee_exists, sanitize_document, sanitize_documents
from services.http import assert_method, execute_service_request, json_response
from services.models import AppError, RequestContext
from services.utils import now_iso, uuid_id
from services.validation import normalize_text, validate_organization, validate_region


def team_payload(team: dict[str, Any], database: Any) -> dict[str, Any]:
    """Build an enriched team payload with leader and members."""

    payload = sanitize_document(team) or {}
    leader = sanitize_document(database["employees"].find_one({"id": payload["leaderEmployeeId"]}))
    memberships = sanitize_documents(
        list(database["team_employees"].find({"teamId": payload["id"]}).sort("createdAt", ASCENDING))
    )
    employee_ids = [membership["employeeId"] for membership in memberships]
    employees = {
        employee["id"]: sanitize_document(employee)
        for employee in database["employees"].find({"id": {"$in": employee_ids}})
    }
    members = [
        {**membership, "employee": employees.get(membership["employeeId"])}
        for membership in memberships
    ]
    payload["leader"] = leader
    payload["members"] = members
    payload["memberCount"] = len(members)
    payload["totalPeople"] = len(members) + (1 if leader else 0)
    return payload


def build_dashboard_summary(database: Any) -> dict[str, Any]:
    """Create the dashboard summary for the remaining in-scope metrics."""

    teams = sanitize_documents(list(database["teams"].find({}).sort("name", ASCENDING)))
    achievements = sanitize_documents(
        list(database["achievements"].find({}).sort([("month", ASCENDING), ("teamId", ASCENDING)]))
    )
    employees = sanitize_documents(list(database["employees"].find({}).sort("firstName", ASCENDING)))
    employee_map = {employee["id"]: employee for employee in employees}
    team_rosters = [team_payload(team, database) for team in teams]
    teams_by_region_map: dict[str, dict[str, Any]] = {}
    for roster in team_rosters:
        region = roster.get("region") or "Unknown"
        bucket = teams_by_region_map.setdefault(
            region,
            {"region": region, "teamCount": 0, "teamIds": [], "teamNames": []},
        )
        bucket["teamCount"] += 1
        bucket["teamIds"].append(roster["id"])
        bucket["teamNames"].append(roster["name"])
    achievements_by_team: dict[str, list[dict[str, Any]]] = {}
    for achievement in achievements:
        achievements_by_team.setdefault(achievement["teamId"], []).append(achievement)
    achievement_cards = []
    for team in teams:
        achievement_cards.append(
            {
                "teamId": team["id"],
                "teamName": team["name"],
                "items": achievements_by_team.get(team["id"], []),
            }
        )
    membership_count = database["team_employees"].count_documents({})
    return {
        "overview": {
            "teamCount": len(teams),
            "employeeCount": len(employees),
            "memberAssignmentCount": membership_count,
            "achievementCount": len(achievements),
        },
        "teamsByRegion": sorted(
            teams_by_region_map.values(),
            key=lambda bucket: (bucket["region"], bucket["teamCount"]),
        ),
        "teamRosters": team_rosters,
        "monthlyAchievementsByTeam": achievement_cards,
        "employeeDirectory": list(employee_map.values()),
    }


def build_team_filter(query: dict[str, str]) -> dict[str, Any]:
    """Create search filters for team queries."""

    filters: dict[str, Any] = {}
    q_value = (query.get("q") or "").strip()
    region = (query.get("region") or query.get("location") or "").strip().upper()
    if q_value:
        filters["$or"] = [
            {"name": {"$regex": q_value, "$options": "i"}},
            {"description": {"$regex": q_value, "$options": "i"}},
            {"region": {"$regex": q_value, "$options": "i"}},
            {"organization": {"$regex": q_value, "$options": "i"}},
        ]
    if region:
        filters["region"] = {"$regex": f"^{re.escape(region)}$", "$options": "i"}
    return filters


def assert_can_assign_regular_member(
    database: Any,
    employee_id: str,
    team_id: str | None = None,
) -> None:
    """Block employees who lead another team from becoming regular members."""

    leader_teams = sanitize_documents(list(database["teams"].find({"leaderEmployeeId": employee_id})))
    conflicting_teams = [team for team in leader_teams if team["id"] != team_id]

    if conflicting_teams:
        raise AppError(
            409,
            "leader_membership_conflict",
            "A team leader cannot be assigned as a regular member on another team.",
            {
                "employeeId": employee_id,
                "leaderTeamIds": [team["id"] for team in conflicting_teams],
                "leaderTeamNames": [team["name"] for team in conflicting_teams],
            },
        )


def validate_member_employee_ids(
    database: Any,
    leader_employee_id: str,
    employee_ids: list[Any],
    team_id: str | None = None,
) -> list[str]:
    """Validate member employee IDs for a team."""

    member_ids = []
    for employee_id in employee_ids:
        employee_text = normalize_text(employee_id, "memberEmployeeIds")
        if employee_text == leader_employee_id:
            raise AppError(400, "validation_error", "The leader cannot also appear as a regular member.")
        if employee_text not in member_ids:
            assert_employee_exists(database, employee_text)
            assert_can_assign_regular_member(database, employee_text, team_id)
            member_ids.append(employee_text)
    if len(member_ids) > MAX_TEAM_MEMBERS:
        raise AppError(
            400,
            "validation_error",
            f"A team can have at most {MAX_TEAM_MEMBERS} non-leader employees.",
        )
    return member_ids


def validate_team_payload(
    database: Any,
    payload: dict[str, Any],
    team_id: str | None = None,
) -> tuple[dict[str, Any], list[str]]:
    """Validate team create/update data."""

    leader_employee_id = normalize_text(payload.get("leaderEmployeeId"), "leaderEmployeeId")
    assert_employee_exists(database, leader_employee_id or "")
    member_employee_ids = payload.get("memberEmployeeIds") or []
    if not isinstance(member_employee_ids, list):
        raise AppError(400, "validation_error", "memberEmployeeIds must be an array when provided.")
    validated = {
        "name": normalize_text(payload.get("name"), "name"),
        "description": normalize_text(payload.get("description"), "description", required=False),
        "region": validate_region(payload.get("region")),
        "organization": validate_organization(payload.get("organization")),
        "leaderEmployeeId": leader_employee_id,
    }
    return validated, validate_member_employee_ids(
        database,
        leader_employee_id or "",
        member_employee_ids,
        team_id,
    )


def create_team(database: Any, payload: dict[str, Any]) -> dict[str, Any]:
    """Create a team and optional memberships."""

    validated, member_employee_ids = validate_team_payload(database, payload)
    timestamp = now_iso()
    team_id = uuid_id("team")
    team = {
        "_id": team_id,
        "id": team_id,
        **validated,
        "createdAt": timestamp,
        "updatedAt": timestamp,
    }
    database["teams"].insert_one(team)
    if member_employee_ids:
        membership_documents = []
        for employee_id in member_employee_ids:
            membership_id = uuid_id("membership")
            membership_documents.append(
                {
                    "_id": membership_id,
                    "id": membership_id,
                    "teamId": team_id,
                    "employeeId": employee_id,
                    "createdAt": timestamp,
                    "updatedAt": timestamp,
                }
            )
        database["team_employees"].insert_many(membership_documents)
    return team_payload(team, database)


def replace_team_members(database: Any, team_id: str, member_employee_ids: list[str]) -> None:
    """Replace the non-leader members assigned to a team."""

    database["team_employees"].delete_many({"teamId": team_id})
    timestamp = now_iso()
    if member_employee_ids:
        membership_documents = []
        for employee_id in member_employee_ids:
            membership_id = uuid_id("membership")
            membership_documents.append(
                {
                    "_id": membership_id,
                    "id": membership_id,
                    "teamId": team_id,
                    "employeeId": employee_id,
                    "createdAt": timestamp,
                    "updatedAt": timestamp,
                }
            )
        database["team_employees"].insert_many(membership_documents)


def update_team(database: Any, team_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Update a team record and optionally replace its members."""

    validated, member_employee_ids = validate_team_payload(database, payload, team_id)
    current_team = sanitize_document(database["teams"].find_one({"id": team_id})) or {}
    current_leader = current_team.get("leaderEmployeeId")
    next_leader = validated["leaderEmployeeId"]
    if (
        current_leader
        and current_leader != next_leader
        and current_leader not in member_employee_ids
        and len(member_employee_ids) < MAX_TEAM_MEMBERS
    ):
        member_employee_ids.append(current_leader)
    member_employee_ids = validate_member_employee_ids(
        database,
        next_leader,
        member_employee_ids,
        team_id,
    )
    validated["updatedAt"] = now_iso()
    database["teams"].update_one({"id": team_id}, {"$set": validated})
    replace_team_members(database, team_id, member_employee_ids)
    team = database["teams"].find_one({"id": team_id})
    return team_payload(team, database)


def delete_team(database: Any, team_id: str) -> None:
    """Delete a team and cascade related data."""

    database["teams"].delete_one({"id": team_id})
    database["team_employees"].delete_many({"teamId": team_id})
    database["achievements"].delete_many({"teamId": team_id})
    database["metadata"].delete_many({"scope": "team", "entityId": team_id})


def add_team_member(database: Any, team_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Add a non-leader member to a team."""

    team = sanitize_document(database["teams"].find_one({"id": team_id})) or {}
    employee_id = normalize_text(payload.get("employeeId"), "employeeId")
    if employee_id == team.get("leaderEmployeeId"):
        raise AppError(400, "validation_error", "The leader is already assigned to this team.")
    assert_employee_exists(database, employee_id or "")
    assert_can_assign_regular_member(database, employee_id or "", team_id)
    current_count = database["team_employees"].count_documents({"teamId": team_id})
    if current_count >= MAX_TEAM_MEMBERS:
        raise AppError(
            409,
            "membership_limit_reached",
            f"A team can have at most {MAX_TEAM_MEMBERS} non-leader employees.",
        )
    membership_id = uuid_id("membership")
    timestamp = now_iso()
    membership = {
        "_id": membership_id,
        "id": membership_id,
        "teamId": team_id,
        "employeeId": employee_id,
        "createdAt": timestamp,
        "updatedAt": timestamp,
    }
    database["team_employees"].insert_one(membership)
    return team_payload(database["teams"].find_one({"id": team_id}), database)


def remove_team_member(database: Any, team_id: str, employee_id: str) -> None:
    """Remove a non-leader member from a team."""

    result = database["team_employees"].delete_one({"teamId": team_id, "employeeId": employee_id})
    if result.deleted_count == 0:
        raise AppError(404, "not_found", "Team member not found.")


def update_team_leader(database: Any, team_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Reassign a team's leader while keeping the previous leader on the team."""

    new_leader_id = normalize_text(payload.get("leaderEmployeeId"), "leaderEmployeeId")
    assert_employee_exists(database, new_leader_id or "")
    team = sanitize_document(database["teams"].find_one({"id": team_id})) or {}
    current_leader_id = team.get("leaderEmployeeId")
    if current_leader_id == new_leader_id:
        return team_payload(database["teams"].find_one({"id": team_id}), database)
    database["team_employees"].delete_many({"teamId": team_id, "employeeId": new_leader_id})
    member_ids = [
        membership["employeeId"]
        for membership in sanitize_documents(database["team_employees"].find({"teamId": team_id}))
    ]
    if (
        current_leader_id
        and current_leader_id not in member_ids
        and len(member_ids) < MAX_TEAM_MEMBERS
    ):
        member_ids.append(current_leader_id)
    member_ids = validate_member_employee_ids(database, new_leader_id or "", member_ids, team_id)
    replace_team_members(database, team_id, member_ids)
    database["teams"].update_one(
        {"id": team_id},
        {"$set": {"leaderEmployeeId": new_leader_id, "updatedAt": now_iso()}},
    )
    return team_payload(database["teams"].find_one({"id": team_id}), database)


def handle_teams(
    database: Any,
    request: RequestContext,
    user: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Handle team and membership routes."""

    _ = user
    if request.path in ("/", ""):
        if request.method == "GET":
            teams = database["teams"].find(build_team_filter(request.query)).sort("name", ASCENDING)
            return json_response(200, {"items": [team_payload(team, database) for team in teams]})
        if request.method == "POST":
            payload = create_team(database, request.body or {})
            return json_response(201, payload)
        raise AppError(405, "method_not_allowed", "HTTP method is not supported.")
    if request.path == "/dashboard/summary":
        assert_method({"GET"}, request.method)
        return json_response(200, build_dashboard_summary(database))
    team_id = request.segments[0]
    team = database["teams"].find_one({"id": team_id})
    if not team:
        raise AppError(404, "not_found", "Team not found.")
    if len(request.segments) == 1:
        if request.method == "GET":
            return json_response(200, team_payload(team, database))
        if request.method == "PUT":
            payload = update_team(database, team_id, request.body or {})
            return json_response(200, payload)
        if request.method == "DELETE":
            delete_team(database, team_id)
            return json_response(204)
        raise AppError(405, "method_not_allowed", "HTTP method is not supported.")
    if request.segments[1] == "members":
        if len(request.segments) == 2:
            if request.method == "GET":
                return json_response(200, team_payload(team, database))
            if request.method == "POST":
                payload = add_team_member(database, team_id, request.body or {})
                return json_response(201, payload)
            raise AppError(405, "method_not_allowed", "HTTP method is not supported.")
        if len(request.segments) == 3 and request.method == "DELETE":
            remove_team_member(database, team_id, request.segments[2])
            return json_response(204)
        raise AppError(405, "method_not_allowed", "HTTP method is not supported.")
    if request.segments[1] == "leader":
        assert_method({"PUT"}, request.method)
        payload = update_team_leader(database, team_id, request.body or {})
        return json_response(200, payload)
    raise AppError(404, "not_found", "Route not found.")


def handle_teams_lambda(event: dict[str, Any] | None, context: Any | None = None) -> dict[str, Any]:
    """Lambda entrypoint for the team service."""

    _ = context
    return execute_service_request("teams", event, handle_teams)
