from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings


pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_token(
    subject: str | int,
    token_type: str,
    expires_delta: timedelta,
    extra_data: dict[str, Any] | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    expire = now + expires_delta

    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": expire,
    }

    if extra_data:
        payload.update(extra_data)

    return jwt.encode(
        payload,
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def create_access_token(
    subject: str | int,
    extra_data: dict[str, Any] | None = None,
) -> str:
    return create_token(
        subject=subject,
        token_type="access",
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
        extra_data=extra_data,
    )


def create_refresh_token(
    subject: str | int,
    extra_data: dict[str, Any] | None = None,
) -> str:
    return create_token(
        subject=subject,
        token_type="refresh",
        expires_delta=timedelta(days=settings.refresh_token_expire_days),
        extra_data=extra_data,
    )


def decode_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
    except JWTError as exc:
        raise ValueError("Invalid token") from exc

    return payload


def get_token_subject(payload: dict[str, Any]) -> int:
    subject = payload.get("sub")

    if subject is None:
        raise ValueError("Token subject is missing")

    try:
        return int(subject)
    except ValueError as exc:
        raise ValueError("Token subject must be integer user id") from exc


def validate_token_type(payload: dict[str, Any], expected_type: str) -> None:
    token_type = payload.get("type")

    if token_type != expected_type:
        raise ValueError("Invalid token type")