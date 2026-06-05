from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.parking import Parking
from app.repositories.base import BaseRepository


class ParkingRepository(BaseRepository[Parking]):
    def __init__(self) -> None:
        super().__init__(Parking)

    async def get_by_id_with_zones(
        self,
        db: AsyncSession,
        parking_id: int,
    ) -> Parking | None:
        result = await db.execute(
            select(Parking)
            .options(selectinload(Parking.zones))
            .where(Parking.id == parking_id)
        )
        return result.scalar_one_or_none()

    async def get_active_list(
        self,
        db: AsyncSession,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Parking]:
        result = await db.execute(
            select(Parking)
            .where(
                Parking.is_active.is_(True),
                Parking.is_deleted.is_(False),
            )
            .order_by(Parking.id)
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def search_by_name(
        self,
        db: AsyncSession,
        search: str,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Parking]:
        result = await db.execute(
            select(Parking)
            .where(
                Parking.is_deleted.is_(False),
                Parking.name.ilike(f"%{search}%"),
            )
            .order_by(Parking.id)
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def update_places(
        self,
        db: AsyncSession,
        parking: Parking,
        occupied_places: int,
        total_places: int | None = None,
    ) -> Parking:
        if total_places is not None:
            parking.total_places = total_places

        parking.occupied_places = occupied_places

        await db.flush()
        await db.refresh(parking)

        return parking


parking_repository = ParkingRepository()