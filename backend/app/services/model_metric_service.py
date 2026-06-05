from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.model_metric import ModelMetric
from app.repositories.model_metric_repository import model_metric_repository
from app.services.exceptions import NotFoundError
from app.services.parking_service import parking_service


class ModelMetricService:
    async def get_by_id(
        self,
        db: AsyncSession,
        metric_id: int,
    ) -> ModelMetric:
        metric = await model_metric_repository.get_by_id(db, metric_id)

        if metric is None:
            raise NotFoundError(
                message="Model metric not found",
                code="MODEL_METRIC_NOT_FOUND",
            )

        return metric

    async def get_list(
        self,
        db: AsyncSession,
        limit: int = 20,
        offset: int = 0,
    ) -> list[ModelMetric]:
        return await model_metric_repository.get_list(
            db=db,
            limit=limit,
            offset=offset,
        )

    async def get_by_model_name(
        self,
        db: AsyncSession,
        model_name: str,
        limit: int = 20,
        offset: int = 0,
    ) -> list[ModelMetric]:
        return await model_metric_repository.get_by_model_name(
            db=db,
            model_name=model_name,
            limit=limit,
            offset=offset,
        )

    async def get_by_parking_id(
        self,
        db: AsyncSession,
        parking_id: int,
        limit: int = 20,
        offset: int = 0,
    ) -> list[ModelMetric]:
        await parking_service.get_by_id(db, parking_id)

        return await model_metric_repository.get_by_parking_id(
            db=db,
            parking_id=parking_id,
            limit=limit,
            offset=offset,
        )

    async def get_latest(
        self,
        db: AsyncSession,
        model_name: str | None = None,
        parking_id: int | None = None,
    ) -> ModelMetric | None:
        if parking_id is not None:
            await parking_service.get_by_id(db, parking_id)

        return await model_metric_repository.get_latest(
            db=db,
            model_name=model_name,
            parking_id=parking_id,
        )

    async def create_metric(
        self,
        db: AsyncSession,
        data: dict[str, Any],
    ) -> ModelMetric:
        if data.get("parking_id") is not None:
            await parking_service.get_by_id(db, data["parking_id"])

        metric = await model_metric_repository.create(db, data)
        await db.commit()
        await db.refresh(metric)

        return metric

    async def update_metric(
        self,
        db: AsyncSession,
        metric_id: int,
        data: dict[str, Any],
    ) -> ModelMetric:
        metric = await self.get_by_id(db, metric_id)

        if data.get("parking_id") is not None:
            await parking_service.get_by_id(db, data["parking_id"])

        updated_metric = await model_metric_repository.update(
            db=db,
            obj=metric,
            data=data,
        )
        await db.commit()
        await db.refresh(updated_metric)

        return updated_metric

    async def delete_metric(
        self,
        db: AsyncSession,
        metric_id: int,
    ) -> None:
        metric = await self.get_by_id(db, metric_id)

        await model_metric_repository.delete(db, metric)
        await db.commit()


model_metric_service = ModelMetricService()