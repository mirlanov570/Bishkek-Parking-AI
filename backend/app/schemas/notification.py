from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.models.enums import NotificationType
from app.schemas.common import ListResponse, SchemaBase


class NotificationCreate(SchemaBase):
    user_id: int | None = Field(default=None, gt=0)
    parking_id: int | None = Field(default=None, gt=0)
    type: NotificationType
    title: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1)


class NotificationUpdate(SchemaBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    message: str | None = Field(default=None, min_length=1)
    is_read: bool | None = None


class NotificationMarkRead(SchemaBase):
    is_read: bool = True


class NotificationRead(SchemaBase):
    id: int
    user_id: int | None
    parking_id: int | None
    type: NotificationType
    title: str
    message: str
    is_read: bool
    read_at: datetime | None
    created_at: datetime


class NotificationList(ListResponse[NotificationRead]):
    pass