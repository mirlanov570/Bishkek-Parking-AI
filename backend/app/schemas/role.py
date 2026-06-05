from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.common import ListResponse, SchemaBase


class RoleBase(SchemaBase):
    code: str = Field(min_length=2, max_length=50)
    name: str = Field(min_length=2, max_length=100)
    description: str | None = None


class RoleCreate(RoleBase):
    pass


class RoleUpdate(SchemaBase):
    code: str | None = Field(default=None, min_length=2, max_length=50)
    name: str | None = Field(default=None, min_length=2, max_length=100)
    description: str | None = None


class RoleRead(RoleBase):
    id: int
    created_at: datetime
    updated_at: datetime


class RoleList(ListResponse[RoleRead]):
    pass