from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.prediction import Prediction
from app.repositories.base import BaseRepository


class PredictionRepository(BaseRepository[Prediction]):
    def __init__(self) -> None:
        super().__init__(Prediction)

    async def get_by_parking_id(
        self,
        db: AsyncSession,
        parking_id: int,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Prediction]:
        result = await db.execute(
            select(Prediction)
            .where(Prediction.parking_id == parking_id)
            .order_by(Prediction.prediction_datetime.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def get_latest_by_parking_id(
        self,
        db: AsyncSession,
        parking_id: int,
    ) -> Prediction | None:
        result = await db.execute(
            select(Prediction)
            .where(Prediction.parking_id == parking_id)
            .order_by(Prediction.prediction_datetime.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()


prediction_repository = PredictionRepository()