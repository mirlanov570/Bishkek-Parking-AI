from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user
from app.auth.schemas import (
    AccessTokenRead,
    LogoutRead,
    MeRead,
    RefreshTokenRequest,
    TokenRead,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_token_subject,
    validate_token_type,
)
from app.db.session import get_db
from app.models.user import User
from app.services.exceptions import AuthenticationError, ServiceError
from app.services.user_service import user_service
from app.api.v1.endpoints.utils import raise_service_error


logger = logging.getLogger("app.auth")


router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


@router.post("/login", response_model=TokenRead)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> TokenRead:
    login_or_email = form_data.username

    logger.info("Login attempt | login_or_email=%s", login_or_email)

    try:
        user = await user_service.authenticate(
            db=db,
            login_or_email=login_or_email,
            password=form_data.password,
        )
        await db.commit()
        await db.refresh(user)
    except ServiceError as exc:
        logger.warning(
            "Login failed | login_or_email=%s code=%s detail=%s",
            login_or_email,
            exc.code,
            exc.message,
        )
        raise_service_error(exc)

    logger.info(
        "Login success | user_id=%s login=%s role_id=%s",
        user.id,
        user.login,
        user.role_id,
    )

    token_data = {
        "login": user.login,
        "role_id": user.role_id,
    }

    access_token = create_access_token(
        subject=user.id,
        extra_data=token_data,
    )
    refresh_token = create_refresh_token(
        subject=user.id,
        extra_data=token_data,
    )

    return TokenRead(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.post("/refresh", response_model=AccessTokenRead)
async def refresh_token(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> AccessTokenRead:
    logger.info("Refresh token attempt")

    try:
        token_payload = decode_token(payload.refresh_token)
        validate_token_type(token_payload, "refresh")
        user_id = get_token_subject(token_payload)
        user = await user_service.get_active_by_id(db, user_id)
    except ValueError:
        logger.warning("Refresh token failed | reason=invalid_token")
        raise_service_error(
            AuthenticationError(
                message="Invalid refresh token",
                code="INVALID_REFRESH_TOKEN",
            )
        )
    except ServiceError as exc:
        logger.warning(
            "Refresh token failed | code=%s detail=%s",
            exc.code,
            exc.message,
        )
        raise_service_error(exc)

    logger.info("Refresh token success | user_id=%s login=%s", user.id, user.login)

    access_token = create_access_token(
        subject=user.id,
        extra_data={
            "login": user.login,
            "role_id": user.role_id,
        },
    )

    return AccessTokenRead(
        access_token=access_token,
        token_type="bearer",
    )


@router.get("/me", response_model=MeRead)
async def me(
    current_user: User = Depends(get_current_active_user),
) -> User:
    logger.debug(
        "Current user requested | user_id=%s login=%s",
        current_user.id,
        current_user.login,
    )

    return current_user


@router.post("/logout", response_model=LogoutRead)
async def logout(
    current_user: User = Depends(get_current_active_user),
) -> LogoutRead:
    logger.info(
        "Logout requested | user_id=%s login=%s",
        current_user.id,
        current_user.login,
    )

    return LogoutRead(
        success=True,
        message="Logged out successfully",
    )