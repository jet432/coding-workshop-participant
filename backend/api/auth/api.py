"""Authentication service logic."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from services.auth import decode_jwt, issue_jwt, require_authentication
from services.constants import ACCESS_TOKEN_HOURS, REFRESH_TOKEN_DAYS, SEED_USERS
from services.database import sanitize_document
from services.http import assert_method, execute_service_request, json_response
from services.models import AppError, RequestContext
from services.security import hash_token, verify_password
from services.utils import now_iso
from services.validation import normalize_text, validate_email


def handle_auth(database: Any, request: RequestContext, user: dict[str, Any] | None = None) -> dict[str, Any]:
    """Handle authentication routes."""

    _ = user
    if request.path in ("/", ""):
        assert_method({"GET"}, request.method)
        return json_response(
            200,
            {
                "service": "auth",
                "message": "Use /login, /refresh, or /me for authentication operations.",
                "demoCredentials": [
                    {"email": demo_user["email"], "password": "Welcome123!"}
                    for demo_user in SEED_USERS
                ],
            },
        )
    if request.path == "/login":
        assert_method({"POST"}, request.method)
        payload = request.body or {}
        email = validate_email(payload.get("email"))
        password = normalize_text(payload.get("password"), "password")
        user = sanitize_document(database["users"].find_one({"email": email, "isActive": True}))
        if not user or not verify_password(password or "", user["passwordHash"]):
            raise AppError(401, "invalid_credentials", "Email or password is incorrect.")
        access_token = issue_jwt(
            user["id"],
            user["email"],
            "access",
            timedelta(hours=ACCESS_TOKEN_HOURS),
        )
        refresh_token = issue_jwt(
            user["id"],
            user["email"],
            "refresh",
            timedelta(days=REFRESH_TOKEN_DAYS),
        )
        database["users"].update_one(
            {"id": user["id"]},
            {
                "$set": {
                    "refreshTokenHash": hash_token(refresh_token),
                    "updatedAt": now_iso(),
                }
            },
        )
        return json_response(
            200,
            {
                "user": {
                    "id": user["id"],
                    "email": user["email"],
                    "displayName": user["displayName"],
                },
                "tokens": {
                    "accessToken": access_token,
                    "refreshToken": refresh_token,
                    "tokenType": "Bearer",
                    "expiresIn": ACCESS_TOKEN_HOURS * 3600,
                },
            },
        )
    if request.path == "/refresh":
        assert_method({"POST"}, request.method)
        payload = request.body or {}
        refresh_token = normalize_text(payload.get("refreshToken"), "refreshToken")
        decoded = decode_jwt(refresh_token or "", "refresh")
        user = sanitize_document(database["users"].find_one({"id": decoded["sub"], "isActive": True}))
        if not user or user.get("refreshTokenHash") != hash_token(refresh_token or ""):
            raise AppError(401, "invalid_token", "Refresh token is not recognized.")
        access_token = issue_jwt(
            user["id"],
            user["email"],
            "access",
            timedelta(hours=ACCESS_TOKEN_HOURS),
        )
        new_refresh_token = issue_jwt(
            user["id"],
            user["email"],
            "refresh",
            timedelta(days=REFRESH_TOKEN_DAYS),
        )
        database["users"].update_one(
            {"id": user["id"]},
            {
                "$set": {
                    "refreshTokenHash": hash_token(new_refresh_token),
                    "updatedAt": now_iso(),
                }
            },
        )
        return json_response(
            200,
            {
                "tokens": {
                    "accessToken": access_token,
                    "refreshToken": new_refresh_token,
                    "tokenType": "Bearer",
                    "expiresIn": ACCESS_TOKEN_HOURS * 3600,
                }
            },
        )
    if request.path == "/me":
        assert_method({"GET"}, request.method)
        current_user = require_authentication(database, request.headers)
        return json_response(
            200,
            {
                "user": {
                    "id": current_user["id"],
                    "email": current_user["email"],
                    "displayName": current_user["displayName"],
                }
            },
        )
    raise AppError(404, "not_found", "Route not found.")


def handle_auth_lambda(event: dict[str, Any] | None, context: Any | None = None) -> dict[str, Any]:
    """Lambda entrypoint for the auth service."""

    _ = context
    return execute_service_request("auth", event, handle_auth, requires_auth=False)
