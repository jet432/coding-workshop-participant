"""Unit tests for shared backend behavior."""

from __future__ import annotations

import pathlib
import sys
import unittest

BACKEND_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from services.auth import decode_jwt, issue_jwt  # noqa: E402
from services.http import normalize_service_path  # noqa: E402
from services.models import AppError  # noqa: E402
from services.security import hash_password, verify_password  # noqa: E402
from services.validation import validate_month  # noqa: E402
from api.individuals.api import employee_projection  # noqa: E402
from api.teams.api import (  # noqa: E402
    build_dashboard_summary,
    validate_member_employee_ids,
)


def _matches(document: dict[str, str], query: dict[str, object]) -> bool:
    """Evaluate a tiny subset of the Mongo query language for unit tests."""

    for key, value in query.items():
        current = document.get(key)
        if isinstance(value, dict) and "$in" in value:
            if current not in value["$in"]:
                return False
        elif current != value:
            return False
    return True


class FakeCursor(list):
    """A list-like cursor with minimal `.sort()` support."""

    def sort(self, key, direction=None):
        if isinstance(key, list):
            key_name, sort_direction = key[0]
        else:
            key_name = key
            sort_direction = direction or 1
        reverse = sort_direction != 1
        return FakeCursor(sorted(self, key=lambda item: item.get(key_name, ""), reverse=reverse))


class FakeCollection:
    """A tiny collection stub for unit tests."""

    def __init__(self, documents: list[dict[str, object]]) -> None:
        self.documents = list(documents)

    def find(self, query: dict[str, object] | None = None) -> FakeCursor:
        query = query or {}
        return FakeCursor([document for document in self.documents if _matches(document, query)])

    def find_one(self, query: dict[str, object]) -> dict[str, object] | None:
        for document in self.documents:
            if _matches(document, query):
                return document
        return None

    def count_documents(self, query: dict[str, object]) -> int:
        return len(self.find(query))


class FakeDatabase(dict):
    """Dictionary-backed fake database for shared handler tests."""

    def __getitem__(self, collection_name: str) -> FakeCollection:
        return super().__getitem__(collection_name)


class SharedApiTests(unittest.TestCase):
    """Exercise the critical shared backend helpers."""

    def setUp(self) -> None:
        self.database = FakeDatabase(
            {
                "employees": FakeCollection(
                    [
                        {
                            "_id": "emp-001",
                            "id": "emp-001",
                            "firstName": "Lara",
                            "lastName": "Chen",
                            "email": "lara.chen@acme.test",
                        },
                        {
                            "_id": "emp-002",
                            "id": "emp-002",
                            "firstName": "Devon",
                            "lastName": "Park",
                            "email": "devon.park@acme.test",
                        },
                        {
                            "_id": "emp-003",
                            "id": "emp-003",
                            "firstName": "Amina",
                            "lastName": "Yusuf",
                            "email": "amina.yusuf@acme.test",
                        },
                    ]
                ),
                "teams": FakeCollection(
                    [
                        {
                            "_id": "team-001",
                            "id": "team-001",
                            "name": "Platform",
                            "region": "NAM",
                            "leaderEmployeeId": "emp-001",
                        },
                        {
                            "_id": "team-002",
                            "id": "team-002",
                            "name": "Orbit",
                            "region": "APAC",
                            "leaderEmployeeId": "emp-003",
                        },
                    ]
                ),
                "team_employees": FakeCollection(
                    [
                        {
                            "_id": "membership-001",
                            "id": "membership-001",
                            "teamId": "team-001",
                            "employeeId": "emp-002",
                        },
                        {
                            "_id": "membership-002",
                            "id": "membership-002",
                            "teamId": "team-002",
                            "employeeId": "emp-002",
                        },
                    ]
                ),
                "achievements": FakeCollection(
                    [
                        {
                            "_id": "ach-001",
                            "id": "ach-001",
                            "teamId": "team-001",
                            "month": "2026-03",
                            "title": "Shared Toolkit",
                            "description": "Released a shared toolkit.",
                        }
                    ]
                ),
            }
        )

    def test_password_hash_round_trip(self) -> None:
        """Password hashing should verify the original password."""

        hashed_password = hash_password("Welcome123!")
        self.assertTrue(verify_password("Welcome123!", hashed_password))
        self.assertFalse(verify_password("WrongPassword!", hashed_password))

    def test_issue_and_decode_jwt(self) -> None:
        """JWT issuing and decoding should round-trip the claims."""

        token = issue_jwt("user-001", "lara.chen@acme.test", "access", lifetime=__import__("datetime").timedelta(minutes=5))
        payload = decode_jwt(token, "access")
        self.assertEqual(payload["sub"], "user-001")
        self.assertEqual(payload["email"], "lara.chen@acme.test")

    def test_normalize_service_path_handles_api_prefixes(self) -> None:
        """Service prefix stripping should support local and cloud paths."""

        self.assertEqual(normalize_service_path("/api/teams/dashboard/summary", "teams"), "/dashboard/summary")
        self.assertEqual(normalize_service_path("/teams/abc", "teams"), "/abc")
        self.assertEqual(normalize_service_path("/abc", "teams"), "/abc")

    def test_validate_month_rejects_invalid_values(self) -> None:
        """Month validation should reject malformed input."""

        self.assertEqual(validate_month("2026-03"), "2026-03")
        with self.assertRaises(AppError):
            validate_month("March-2026")

    def test_employee_projection_collects_team_links(self) -> None:
        """Employees should expose member and leader team links."""

        employee = self.database["employees"].find_one({"id": "emp-002"})
        payload = employee_projection(employee, self.database)
        self.assertEqual(payload["memberTeamIds"], ["team-001", "team-002"])
        self.assertEqual(payload["leaderTeamIds"], [])
        self.assertEqual(payload["teamIds"], ["team-001", "team-002"])

    def test_dashboard_summary_reports_rosters_and_regions(self) -> None:
        """Dashboard summary should include in-scope counts and rosters."""

        summary = build_dashboard_summary(self.database)
        roster_by_id = {roster["id"]: roster for roster in summary["teamRosters"]}
        self.assertEqual(summary["overview"]["teamCount"], 2)
        self.assertEqual(summary["overview"]["employeeCount"], 3)
        self.assertEqual(summary["overview"]["achievementCount"], 1)
        self.assertEqual(summary["teamsByRegion"][0]["region"], "APAC")
        self.assertEqual(roster_by_id["team-001"]["leader"]["id"], "emp-001")
        self.assertEqual(roster_by_id["team-001"]["memberCount"], 1)

    def test_team_leader_cannot_join_another_team_as_member(self) -> None:
        """Team leaders should be blocked from regular-member assignments elsewhere."""

        with self.assertRaises(AppError) as context:
            validate_member_employee_ids(self.database, "emp-001", ["emp-003"], "team-001")

        self.assertEqual(context.exception.code, "leader_membership_conflict")

    def test_current_team_leader_can_become_member_after_reassignment(self) -> None:
        """A leader being replaced on the same team can stay as a regular member."""

        member_ids = validate_member_employee_ids(self.database, "emp-002", ["emp-001"], "team-001")
        self.assertEqual(member_ids, ["emp-001"])


if __name__ == "__main__":
    unittest.main()
