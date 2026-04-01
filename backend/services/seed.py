"""Demo seed data bootstrap helpers."""

from __future__ import annotations

from typing import Any

from services.constants import (
    SEED_ACHIEVEMENTS,
    SEED_EMPLOYEES,
    SEED_METADATA,
    SEED_TEAMS,
    SEED_TEAM_MEMBERSHIPS,
    SEED_USERS,
)
from services.security import hash_password
from services.utils import now_iso


def seed_demo_data(database: Any) -> None:
    """Seed users and demo business data when the database is empty."""

    if database["users"].count_documents({}) == 0:
        timestamp = now_iso()
        documents = []
        for user in SEED_USERS:
            documents.append(
                {
                    "_id": user["id"],
                    "id": user["id"],
                    "email": user["email"].lower(),
                    "displayName": user["displayName"],
                    "passwordHash": hash_password(user["password"]),
                    "isActive": True,
                    "refreshTokenHash": None,
                    "createdAt": timestamp,
                    "updatedAt": timestamp,
                }
            )
        database["users"].insert_many(documents)
    if database["employees"].count_documents({}) == 0:
        timestamp = now_iso()
        database["employees"].insert_many(
            [
                {
                    "_id": employee["id"],
                    **employee,
                    "email": employee["email"].lower(),
                    "createdAt": timestamp,
                    "updatedAt": timestamp,
                }
                for employee in SEED_EMPLOYEES
            ]
        )
    if database["teams"].count_documents({}) == 0:
        timestamp = now_iso()
        database["teams"].insert_many(
            [
                {
                    "_id": team["id"],
                    **team,
                    "createdAt": timestamp,
                    "updatedAt": timestamp,
                }
                for team in SEED_TEAMS
            ]
        )
    if database["team_employees"].count_documents({}) == 0:
        timestamp = now_iso()
        database["team_employees"].insert_many(
            [
                {
                    "_id": membership["id"],
                    **membership,
                    "createdAt": timestamp,
                    "updatedAt": timestamp,
                }
                for membership in SEED_TEAM_MEMBERSHIPS
            ]
        )
    if database["achievements"].count_documents({}) == 0:
        timestamp = now_iso()
        database["achievements"].insert_many(
            [
                {
                    "_id": achievement["id"],
                    **achievement,
                    "createdAt": timestamp,
                    "updatedAt": timestamp,
                }
                for achievement in SEED_ACHIEVEMENTS
            ]
        )
    if database["metadata"].count_documents({}) == 0:
        timestamp = now_iso()
        database["metadata"].insert_many(
            [
                {
                    "_id": entry["id"],
                    **entry,
                    "createdAt": timestamp,
                    "updatedAt": timestamp,
                }
                for entry in SEED_METADATA
            ]
        )
