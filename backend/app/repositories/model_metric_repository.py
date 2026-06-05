from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.model_metric import ModelMetric
from app.repositories.base import BaseRepository


class ModelMetricRepository(BaseRepository[ModelMetric]):
    def __init__(self) -> None:
        super().__init__(ModelMetric)

    async def get_by_model_name(
        self,
        db: AsyncSession,
        model_name: str,
        limit: int = 20,
        offset: int = 0,
    ) -> list[ModelMetric]:
        result = await db.execute(
            select(ModelMetric)
            .where(ModelMetric.model_name == model_name)
            .order_by(ModelMetric.trained_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def get_by_parking_id(
        self,
        db: AsyncSession,
        parking_id: int,
        limit: int = 20,
        offset: int = 0,
    ) -> list[ModelMetric]:
        result = await db.execute(
            select(ModelMetric)
            .where(ModelMetric.parking_id == parking_id)
            .order_by(ModelMetric.trained_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def get_latest(
        self,
        db: AsyncSession,
        model_name: str | None = None,
        parking_id: int | None = None,
    ) -> ModelMetric | None:
        query = select(ModelMetric)

        if model_name is not None:
            query = query.where(ModelMetric.model_name == model_name)

        if parking_id is not None:
            query = query.where(ModelMetric.parking_id == parking_id)

        result = await db.execute(
            query.order_by(ModelMetric.trained_at.desc()).limit(1)
        )
        return result.scalar_one_or_none()


model_metric_repository = ModelMetricRepository()