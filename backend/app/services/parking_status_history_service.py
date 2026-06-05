from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.parking_status_history import ParkingStatusHistory
from app.repositories.parking_status_history_repository import (
    parking_status_history_repository,
)
from app.services.exceptions import NotFoundError, ValidationError
from app.services.parking_service import parking_service
from app.services.parking_zone_service import parking_zone_service


class ParkingStatusHistoryService:
    def validate_places(
        self,
        total_places: int,
        occupied_places: int,
    ) -> None:
        if total_places <= 0:
            raise ValidationError(
                message="total_places must be greater than 0",
                code="INVALID_TOTAL_PLACES",
            )

        if occupied_places < 0:
            raise ValidationError(
                message="occupied_places cannot be negative",
                code="INVALID_OCCUPIED_PLACES",
            )

        if occupied_places > total_places:
            raise ValidationError(
                message="occupied_places cannot be greater than total_places",
                code="OCCUPIED_GREATER_THAN_TOTAL",
            )

    async def get_by_id(
        self,
        db: AsyncSession,
        history_id: int,
    ) -> ParkingStatusHistory:
        history = await parking_status_history_repository.get_by_id(db, history_id)

        if history is None:
            raise NotFoundError(
                message="Parking status history record not found",
                code="PARKING_HISTORY_NOT_FOUND",
            )

        return history

    async def get_by_parking_id(
        self,
        db: AsyncSession,
        parking_id: int,
        limit: int = 100,
        offset: int = 0,
    ) -> list[ParkingStatusHistory]:
        await parking_service.get_by_id(db, parking_id)

        return await parking_status_history_repository.get_by_parking_id(
            db=db,
            parking_id=parking_id,
            limit=limit,
            offset=offset,
        )

    async def get_by_zone_id(
        self,
        db: AsyncSession,
        zone_id: int,
        limit: int = 100,
        offset: int = 0,
    ) -> list[ParkingStatusHistory]:
        await parking_zone_service.get_by_id(db, zone_id)

        return await parking_status_history_repository.get_by_zone_id(
            db=db,
            zone_id=zone_id,
            limit=limit,
            offset=offset,
        )

    async def create_manual_history_record(
        self,
        db: AsyncSession,
        data: dict[str, Any],
    ) -> ParkingStatusHistory:
        await parking_service.get_by_id(db, data["parking_id"])

        if data.get("zone_id") is not None:
            await parking_zone_service.get_by_id_and_parking_id(
                db=db,
                zone_id=data["zone_id"],
                parking_id=data["parking_id"],
            )

        self.validate_places(
            total_places=data["total_places"],
            occupied_places=data["occupied_places"],
        )

        history = await parking_status_history_repository.create(db, data)
        await db.commit()
        await db.refresh(history)

        return history


parking_status_history_service = ParkingStatusHistoryService()