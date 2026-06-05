from __future__ import annotations

from typing import NoReturn

from fastapi import HTTPException

from app.models.user import User
from app.services.exceptions import ServiceError


def raise_service_error(exc: ServiceError) -> NoReturn:
    raise HTTPException(
        status_code=exc.status_code,
        detail={
            "detail": exc.message,
            "code": exc.code,
        },
    )


def is_admin_user(user: User) -> bool:
    return user.role is not None and user.role.code == "admin"