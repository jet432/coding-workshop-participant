"""Database access and bootstrap helpers."""

from __future__ import annotations

import os
from typing import Any

from services.constants import DEFAULT_DB_NAME, SEED_TEAMS, VALID_ORGANIZATIONS
from services.models import AppError
from services.seed import seed_demo_data
from services.utils import now_iso

try:
    from pymongo import ASCENDING, MongoClient
    from pymongo.errors import DuplicateKeyError
except ImportError:  # pragma: no cover - exercised only when pymongo is missing
    ASCENDING = 1
    MongoClient = None

    class DuplicateKeyError(Exception):
        """Fallback duplicate-key error when pymongo is unavailable."""


_BOOTSTRAPPED_DATABASES: set[str] = set()


def get_database() -> Any:
    """Create or reuse a Mongo database connection."""

    if MongoClient is None:
        raise AppError(
            500,
            "dependency_missing",
            "pymongo is required to run the backend services.",
        )
    mongo_host = os.getenv("MONGO_HOST", "localhost")
    mongo_port = int(os.getenv("MONGO_PORT", "27017"))
    mongo_name = os.getenv("MONGO_NAME") or DEFAULT_DB_NAME
    is_local = os.getenv("IS_LOCAL", "true").lower() == "true"
    if is_local:
        client = MongoClient(
            host=mongo_host,
            port=mongo_port,
            serverSelectionTimeoutMS=5000,
        )
    else:
        mongo_user = os.getenv("MONGO_USER", "")
        mongo_pass = os.getenv("MONGO_PASS", "")
        uri = (
            f"mongodb://{mongo_user}:{mongo_pass}@{mongo_host}:{mongo_port}/"
            "?tls=true&tlsAllowInvalidCertificates=true&retryWrites=false"
        )
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    database = client[mongo_name]
    ensure_bootstrap(database)
    return database


def ensure_bootstrap(database: Any) -> None:
    """Create indexes and seed demo data once per database."""

    db_name = getattr(database, "name", DEFAULT_DB_NAME)
    if db_name in _BOOTSTRAPPED_DATABASES:
        return
    database["users"].create_index([("email", ASCENDING)], unique=True)
    database["employees"].create_index([("email", ASCENDING)], unique=True)
    database["team_employees"].create_index(
        [("teamId", ASCENDING), ("employeeId", ASCENDING)],
        unique=True,
    )
    database["teams"].create_index([("leaderEmployeeId", ASCENDING)])
    database["achievements"].create_index([("teamId", ASCENDING), ("month", ASCENDING)])
    database["metadata"].create_index(
        [("scope", ASCENDING), ("entityId", ASCENDING), ("key", ASCENDING), ("month", ASCENDING)]
    )
    seed_demo_data(database)
    ensure_team_organizations(database)
    _BOOTSTRAPPED_DATABASES.add(db_name)


def ensure_team_organizations(database: Any) -> None:
    """Backfill organizations for existing team documents created before the field existed."""

    seed_organization_by_id = {team["id"]: team["organization"] for team in SEED_TEAMS}
    seed_organization_by_name = {team["name"]: team["organization"] for team in SEED_TEAMS}
    default_organization = VALID_ORGANIZATIONS[0]

    for team in database["teams"].find({}):
        organization = str(team.get("organization") or "").strip()
        if organization:
            continue
        team_id = team.get("id")
        organization = (
            seed_organization_by_id.get(team_id)
            or seed_organization_by_name.get(team.get("name") or "")
            or default_organization
        )
        database["teams"].update_one(
            {"id": team_id},
            {"$set": {"organization": organization, "updatedAt": now_iso()}},
        )


def sanitize_document(document: dict[str, Any] | None) -> dict[str, Any] | None:
    """Remove Mongo internals from a document copy."""

    if document is None:
        return None
    payload = dict(document)
    payload.pop("_id", None)
    if "region" not in payload and "location" in payload:
        payload["region"] = payload["location"]
    payload.pop("location", None)
    return payload


def sanitize_documents(documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Sanitize a list of Mongo documents."""

    return [sanitize_document(document) for document in documents if document is not None]


def assert_employee_exists(database: Any, employee_id: str) -> dict[str, Any]:
    """Fetch an employee or raise a 400 validation error."""

    employee = sanitize_document(database["employees"].find_one({"id": employee_id}))
    if not employee:
        raise AppError(400, "validation_error", "employeeId must reference an existing employee.")
    return employee


def assert_team_exists(database: Any, team_id: str) -> dict[str, Any]:
    """Fetch a team or raise a 400 validation error."""

    team = sanitize_document(database["teams"].find_one({"id": team_id}))
    if not team:
        raise AppError(400, "validation_error", "teamId must reference an existing team.")
    return team


def assert_metadata_target(database: Any, scope: str, entity_id: str) -> None:
    """Ensure metadata points to an existing team or employee."""

    if scope == "team":
        assert_team_exists(database, entity_id)
    elif scope == "employee":
        assert_employee_exists(database, entity_id)
    else:
        raise AppError(400, "validation_error", "scope must be either team or employee.")
