from __future__ import annotations

from datetime import datetime

from pydantic import Field, field_validator

from app.schemas.common import ListResponse, SchemaBase


class UserBase(SchemaBase):
    full_name: str = Field(min_length=2, max_length=255)
    email: str = Field(min_length=5, max_length=255)
    phone: str = Field(min_length=3, max_length=30)
    login: str = Field(min_length=3, max_length=255)
    role_id: int = Field(gt=0)
    preferred_language: str = Field(default="ru", max_length=5)
    is_active: bool = True

    @field_validator("preferred_language")
    @classmethod
    def validate_preferred_language(cls, value: str) -> str:
        allowed = {"ru", "ky", "en"}
        if value not in allowed:
            raise ValueError("preferred_language must be one of: ru, ky, en")
        return value


class UserCreate(UserBase):
    password: str = Field(min_length=6, max_length=128)


class UserUpdate(SchemaBase):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    email: str | None = Field(default=None, min_length=5, max_length=255)
    phone: str | None = Field(default=None, min_length=3, max_length=30)
    login: str | None = Field(default=None, min_length=3, max_length=255)
    password: str | None = Field(default=None, min_length=6, max_length=128)
    role_id: int | None = Field(default=None, gt=0)
    preferred_language: str | None = Field(default=None, max_length=5)
    is_active: bool | None = None

    @field_validator("preferred_language")
    @classmethod
    def validate_preferred_language(cls, value: str | None) -> str | None:
        if value is None:
            return value

        allowed = {"ru", "ky", "en"}
        if value not in allowed:
            raise ValueError("preferred_language must be one of: ru, ky, en")
        return value


class UserRead(SchemaBase):
    id: int
    full_name: str
    email: str
    phone: str
    login: str
    role_id: int
    preferred_language: str
    is_active: bool
    last_login_at: datetime | None
    is_deleted: bool
    deleted_at: datetime | None
    created_at: datetime
    updated_at: datetime


class UserShortRead(SchemaBase):
    id: int
    full_name: str
    email: str
    login: str
    role_id: int
    is_active: bool


class UserList(ListResponse[UserRead]):
    pass