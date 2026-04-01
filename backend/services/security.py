"""Security helpers for passwords and token hashes."""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets


def base64url_encode(value: bytes) -> str:
    """Encode bytes using unpadded URL-safe base64."""

    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("utf-8")


def base64url_decode(value: str) -> bytes:
    """Decode unpadded URL-safe base64 text."""

    padded = value + "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(padded.encode("utf-8"))


def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256."""

    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 390000)
    return f"{base64url_encode(salt)}.{base64url_encode(digest)}"


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against a PBKDF2 hash."""

    try:
        salt_b64, digest_b64 = hashed_password.split(".", maxsplit=1)
    except ValueError:
        return False
    salt = base64url_decode(salt_b64)
    expected = base64url_decode(digest_b64)
    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 390000)
    return hmac.compare_digest(expected, actual)


def hash_token(token: str) -> str:
    """Create a stable hash for storing refresh tokens."""

    return hashlib.sha256(token.encode("utf-8")).hexdigest()
