from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import admin_required, get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.notification import (
    NotificationCreate,
    NotificationList,
    NotificationRead,
)
from app.services.exceptions import ServiceError
from app.services.notification_service import notification_service
from app.api.v1.endpoints.utils import is_admin_user, raise_service_error


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


@router.get("", response_model=NotificationList)
async def get_notifications(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> NotificationList:
    try:
        if unread_only:
            items = await notification_service.get_unread_for_user(
                db=db,
                user_id=current_user.id,
                limit=limit,
                offset=offset,
            )
        else:
            items = await notification_service.get_for_user(
                db=db,
                user_id=current_user.id,
                limit=limit,
                offset=offset,
            )
    except ServiceError as exc:
        raise_service_error(exc)

    return NotificationList(
        items=items,
        total=len(items),
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=NotificationRead)
async def create_notification(
    payload: NotificationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> NotificationRead:
    try:
        return await notification_service.create_notification(
            db=db,
            data=payload.model_dump(),
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.patch("/{notification_id}/read", response_model=NotificationRead)
async def mark_notification_as_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> NotificationRead:
    try:
        return await notification_service.mark_as_read(
            db=db,
            notification_id=notification_id,
            current_user_id=current_user.id,
            is_admin=is_admin_user(current_user),
        )
    except ServiceError as exc:
        raise_service_error(exc)