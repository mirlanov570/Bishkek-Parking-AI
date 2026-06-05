from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.parking_zone import ParkingZone
from app.repositories.base import BaseRepository


class ParkingZoneRepository(BaseRepository[ParkingZone]):
    def __init__(self) -> None:
        super().__init__(ParkingZone)

    async def get_by_parking_id(
        self,
        db: AsyncSession,
        parking_id: int,
        limit: int = 50,
        offset: int = 0,
    ) -> list[ParkingZone]:
        result = await db.execute(
            select(ParkingZone)
            .where(
                ParkingZone.parking_id == parking_id,
                ParkingZone.is_deleted.is_(False),
            )
            .order_by(ParkingZone.id)
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def get_by_id_and_parking_id(
        self,
        db: AsyncSession,
        zone_id: int,
        parking_id: int,
    ) -> ParkingZone | None:
        result = await db.execute(
            select(ParkingZone).where(
                ParkingZone.id == zone_id,
                ParkingZone.parking_id == parking_id,
            )
        )
        return result.scalar_one_or_none()

    async def update_places(
        self,
        db: AsyncSession,
        zone: ParkingZone,
        occupied_places: int,
        total_places: int | None = None,
    ) -> ParkingZone:
        if total_places is not None:
            zone.total_places = total_places

        zone.occupied_places = occupied_places

        await db.flush()
        await db.refresh(zone)

        return zone


parking_zone_repository = ParkingZoneRepository()