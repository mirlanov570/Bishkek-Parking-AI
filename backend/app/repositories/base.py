from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Generic, TypeVar

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base


ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    def __init__(self, model: type[ModelType]) -> None:
        self.model = model

    async def get_by_id(
        self,
        db: AsyncSession,
        obj_id: int,
    ) -> ModelType | None:
        result = await db.execute(
            select(self.model).where(self.model.id == obj_id)
        )
        return result.scalar_one_or_none()

    async def get_list(
        self,
        db: AsyncSession,
        limit: int = 20,
        offset: int = 0,
    ) -> list[ModelType]:
        query = select(self.model)

        if hasattr(self.model, "id"):
            query = query.order_by(self.model.id)

        result = await db.execute(
            query.limit(limit).offset(offset)
        )
        return list(result.scalars().all())

    async def count(
        self,
        db: AsyncSession,
    ) -> int:
        result = await db.execute(
            select(func.count()).select_from(self.model)
        )
        return int(result.scalar_one())

    async def create(
        self,
        db: AsyncSession,
        data: dict[str, Any],
    ) -> ModelType:
        obj = self.model(**data)

        db.add(obj)
        await db.flush()
        await db.refresh(obj)

        return obj

    async def update(
        self,
        db: AsyncSession,
        obj: ModelType,
        data: dict[str, Any],
    ) -> ModelType:
        for field, value in data.items():
            if hasattr(obj, field):
                setattr(obj, field, value)

        await db.flush()
        await db.refresh(obj)

        return obj

    async def delete(
        self,
        db: AsyncSession,
        obj: ModelType,
    ) -> None:
        await db.delete(obj)
        await db.flush()

    async def soft_delete(
        self,
        db: AsyncSession,
        obj: ModelType,
    ) -> ModelType:
        if hasattr(obj, "is_deleted"):
            setattr(obj, "is_deleted", True)

        if hasattr(obj, "deleted_at"):
            setattr(obj, "deleted_at", datetime.now(timezone.utc))

        if hasattr(obj, "is_active"):
            setattr(obj, "is_active", False)

        await db.flush()
        await db.refresh(obj)

        return obj