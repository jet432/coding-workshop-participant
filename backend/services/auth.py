"""JWT and authentication helpers."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from services.database import sanitize_document
from services.models import AppError
from services.security import base64url_decode, base64url_encode


def get_jwt_secret() -> str:
    """Return the JWT secret for the current environment."""

    return os.getenv("JWT_SECRET") or f"{os.getenv('APP_NAME', 'coding-workshop')}-local-secret"


def issue_jwt(subject: str, email: str, token_type: str, lifetime: timedelta) -> str:
    """Issue a signed HS256 JWT."""

    issued_at = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "email": email,
        "typ": token_type,
        "iat": int(issued_at.timestamp()),
        "exp": int((issued_at + lifetime).timestamp()),
    }
    header = {"alg": "HS256", "typ": "JWT"}
    header_part = base64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_part = base64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(
        get_jwt_secret().encode("utf-8"),
        f"{header_part}.{payload_part}".encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return f"{header_part}.{payload_part}.{base64url_encode(signature)}"


def decode_jwt(token: str, expected_type: str) -> dict[str, Any]:
    """Decode and verify a JWT."""

    try:
        header_part, payload_part, signature_part = token.split(".")
    except ValueError as exc:
        raise AppError(401, "invalid_token", "Token format is invalid.") from exc
    expected_signature = hmac.new(
        get_jwt_secret().encode("utf-8"),
        f"{header_part}.{payload_part}".encode("utf-8"),
        hashlib.sha256,
    ).digest()
    actual_signature = base64url_decode(signature_part)
    if not hmac.compare_digest(expected_signature, actual_signature):
        raise AppError(401, "invalid_token", "Token signature is invalid.")
    payload = json.loads(base64url_decode(payload_part))
    if payload.get("typ") != expected_type:
        raise AppError(401, "invalid_token", "Token type is invalid.")
    if int(payload.get("exp", 0)) < int(datetime.now(timezone.utc).timestamp()):
        raise AppError(401, "expired_token", "Token has expired.")
    return payload


def require_authentication(database: Any, headers: dict[str, str]) -> dict[str, Any]:
    """Resolve the current authenticated user from the Authorization header."""

    authorization = headers.get("authorization", "")
    if not authorization.startswith("Bearer "):
        raise AppError(401, "missing_auth", "Authorization header is required.")
    payload = decode_jwt(authorization.split(" ", maxsplit=1)[1], "access")
    user = sanitize_document(database["users"].find_one({"id": payload["sub"], "isActive": True}))
    if not user:
        raise AppError(401, "invalid_token", "User account is not active.")
    return user
