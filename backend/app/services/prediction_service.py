from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.prediction import Prediction
from app.repositories.prediction_repository import prediction_repository
from app.services.exceptions import NotFoundError
from app.services.parking_service import parking_service


class PredictionService:
    async def get_by_id(
        self,
        db: AsyncSession,
        prediction_id: int,
    ) -> Prediction:
        prediction = await prediction_repository.get_by_id(db, prediction_id)

        if prediction is None:
            raise NotFoundError(
                message="Prediction not found",
                code="PREDICTION_NOT_FOUND",
            )

        return prediction

    async def get_list(
        self,
        db: AsyncSession,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Prediction]:
        return await prediction_repository.get_list(
            db=db,
            limit=limit,
            offset=offset,
        )

    async def get_by_parking_id(
        self,
        db: AsyncSession,
        parking_id: int,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Prediction]:
        await parking_service.get_by_id(db, parking_id)

        return await prediction_repository.get_by_parking_id(
            db=db,
            parking_id=parking_id,
            limit=limit,
            offset=offset,
        )

    async def get_latest_by_parking_id(
        self,
        db: AsyncSession,
        parking_id: int,
    ) -> Prediction | None:
        await parking_service.get_by_id(db, parking_id)

        return await prediction_repository.get_latest_by_parking_id(
            db=db,
            parking_id=parking_id,
        )

    async def create_prediction(
        self,
        db: AsyncSession,
        data: dict[str, Any],
    ) -> Prediction:
        await parking_service.get_active_by_id(
            db=db,
            parking_id=data["parking_id"],
        )

        prediction = await prediction_repository.create(db, data)
        await db.commit()
        await db.refresh(prediction)

        return prediction

    async def update_prediction(
        self,
        db: AsyncSession,
        prediction_id: int,
        data: dict[str, Any],
    ) -> Prediction:
        prediction = await self.get_by_id(db, prediction_id)

        if "parking_id" in data:
            await parking_service.get_active_by_id(
                db=db,
                parking_id=data["parking_id"],
            )

        updated_prediction = await prediction_repository.update(
            db=db,
            obj=prediction,
            data=data,
        )
        await db.commit()
        await db.refresh(updated_prediction)

        return updated_prediction

    async def delete_prediction(
        self,
        db: AsyncSession,
        prediction_id: int,
    ) -> None:
        prediction = await self.get_by_id(db, prediction_id)

        await prediction_repository.delete(db, prediction)
        await db.commit()


prediction_service = PredictionService()