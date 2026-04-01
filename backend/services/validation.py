"""Shared validation helpers."""

from __future__ import annotations

import re
from typing import Any

from services.constants import VALID_ORGANIZATIONS, VALID_REGIONS
from services.models import AppError


def normalize_text(value: Any, field_name: str, required: bool = True) -> str | None:
    """Normalize and validate a string field."""

    if value is None:
        if required:
            raise AppError(400, "validation_error", f"{field_name} is required.")
        return None
    text = str(value).strip()
    if required and not text:
        raise AppError(400, "validation_error", f"{field_name} is required.")
    return text or None


def validate_email(value: Any, field_name: str = "email") -> str:
    """Validate a basic email address."""

    email = normalize_text(value, field_name)
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email or ""):
        raise AppError(400, "validation_error", f"{field_name} must be a valid email address.")
    return email.lower()


def validate_month(value: Any) -> str:
    """Validate a YYYY-MM month string."""

    month = normalize_text(value, "month")
    if not re.match(r"^\d{4}-\d{2}$", month or ""):
        raise AppError(400, "validation_error", "month must use YYYY-MM format.")
    return month


def validate_region(value: Any, field_name: str = "region", required: bool = True) -> str | None:
    """Validate a region against the supported region codes."""

    region = normalize_text(value, field_name, required=required)
    if region is None:
        return None
    normalized_region = region.upper()
    if normalized_region not in VALID_REGIONS:
        raise AppError(
            400,
            "validation_error",
            f"{field_name} must be one of: {', '.join(VALID_REGIONS)}.",
        )
    return normalized_region


def validate_organization(value: Any, field_name: str = "organization", required: bool = True) -> str | None:
    """Validate an organization against the supported organization names."""

    organization = normalize_text(value, field_name, required=required)
    if organization is None:
        return None
    for valid_organization in VALID_ORGANIZATIONS:
        if valid_organization.casefold() == organization.casefold():
            return valid_organization
    raise AppError(
        400,
        "validation_error",
        f"{field_name} must be one of: {', '.join(VALID_ORGANIZATIONS)}.",
    )
