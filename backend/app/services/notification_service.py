from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.repositories.notification_repository import notification_repository
from app.services.exceptions import NotFoundError, PermissionDeniedError
from app.services.parking_service import parking_service
from app.services.user_service import user_service


class NotificationService:
    async def get_by_id(
        self,
        db: AsyncSession,
        notification_id: int,
    ) -> Notification:
        notification = await notification_repository.get_by_id(
            db=db,
            obj_id=notification_id,
        )

        if notification is None:
            raise NotFoundError(
                message="Notification not found",
                code="NOTIFICATION_NOT_FOUND",
            )

        return notification

    async def get_for_user(
        self,
        db: AsyncSession,
        user_id: int,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Notification]:
        await user_service.get_active_by_id(db, user_id)

        return await notification_repository.get_by_user_id(
            db=db,
            user_id=user_id,
            limit=limit,
            offset=offset,
        )

    async def get_unread_for_user(
        self,
        db: AsyncSession,
        user_id: int,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Notification]:
        await user_service.get_active_by_id(db, user_id)

        return await notification_repository.get_unread_by_user_id(
            db=db,
            user_id=user_id,
            limit=limit,
            offset=offset,
        )

    async def create_notification(
        self,
        db: AsyncSession,
        data: dict[str, Any],
    ) -> Notification:
        if data.get("user_id") is not None:
            await user_service.get_active_by_id(db, data["user_id"])

        if data.get("parking_id") is not None:
            await parking_service.get_by_id(db, data["parking_id"])

        notification = await notification_repository.create(db, data)
        await db.commit()
        await db.refresh(notification)

        return notification

    async def mark_as_read(
        self,
        db: AsyncSession,
        notification_id: int,
        current_user_id: int | None = None,
        is_admin: bool = False,
    ) -> Notification:
        notification = await self.get_by_id(db, notification_id)

        if (
            current_user_id is not None
            and not is_admin
            and notification.user_id != current_user_id
        ):
            raise PermissionDeniedError(
                message="You do not have access to this notification",
                code="NOTIFICATION_ACCESS_DENIED",
            )

        updated_notification = await notification_repository.mark_as_read(
            db=db,
            notification=notification,
        )
        await db.commit()
        await db.refresh(updated_notification)

        return updated_notification

    async def delete_notification(
        self,
        db: AsyncSession,
        notification_id: int,
    ) -> None:
        notification = await self.get_by_id(db, notification_id)

        await notification_repository.delete(db, notification)
        await db.commit()


notification_service = NotificationService()