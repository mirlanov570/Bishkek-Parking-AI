from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.nearby_object import NearbyObject
from app.repositories.base import BaseRepository


class NearbyObjectRepository(BaseRepository[NearbyObject]):
    def __init__(self) -> None:
        super().__init__(NearbyObject)

    async def get_by_parking_id(
        self,
        db: AsyncSession,
        parking_id: int,
        limit: int = 100,
        offset: int = 0,
        only_active: bool = True,
    ) -> list[NearbyObject]:
        query = select(NearbyObject).where(
            NearbyObject.parking_id == parking_id
        )

        if only_active:
            query = query.where(NearbyObject.is_active.is_(True))

        result = await db.execute(
            query.order_by(NearbyObject.distance_m, NearbyObject.id)
            .limit(limit)
            .offset(offset)
        )

        return list(result.scalars().all())

    async def get_by_type(
        self,
        db: AsyncSession,
        object_type: str,
        limit: int = 100,
        offset: int = 0,
        only_active: bool = True,
    ) -> list[NearbyObject]:
        query = select(NearbyObject).where(
            NearbyObject.object_type == object_type
        )

        if only_active:
            query = query.where(NearbyObject.is_active.is_(True))

        result = await db.execute(
            query.order_by(NearbyObject.parking_id, NearbyObject.distance_m)
            .limit(limit)
            .offset(offset)
        )

        return list(result.scalars().all())


nearby_object_repository = NearbyObjectRepository()