from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.parking_status_history import ParkingStatusHistory
from app.repositories.base import BaseRepository


class ParkingStatusHistoryRepository(BaseRepository[ParkingStatusHistory]):
    def __init__(self) -> None:
        super().__init__(ParkingStatusHistory)

    async def get_by_parking_id(
        self,
        db: AsyncSession,
        parking_id: int,
        limit: int = 100,
        offset: int = 0,
    ) -> list[ParkingStatusHistory]:
        result = await db.execute(
            select(ParkingStatusHistory)
            .where(ParkingStatusHistory.parking_id == parking_id)
            .order_by(ParkingStatusHistory.recorded_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def get_by_zone_id(
        self,
        db: AsyncSession,
        zone_id: int,
        limit: int = 100,
        offset: int = 0,
    ) -> list[ParkingStatusHistory]:
        result = await db.execute(
            select(ParkingStatusHistory)
            .where(ParkingStatusHistory.zone_id == zone_id)
            .order_by(ParkingStatusHistory.recorded_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())


parking_status_history_repository = ParkingStatusHistoryRepository()