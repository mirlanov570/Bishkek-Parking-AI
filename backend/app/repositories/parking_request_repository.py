from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import ParkingRequestStatus
from app.models.parking_request import ParkingRequest
from app.repositories.base import BaseRepository


class ParkingRequestRepository(BaseRepository[ParkingRequest]):
    def __init__(self) -> None:
        super().__init__(ParkingRequest)

    async def get_by_id_with_relations(
        self,
        db: AsyncSession,
        request_id: int,
    ) -> ParkingRequest | None:
        result = await db.execute(
            select(ParkingRequest)
            .options(
                selectinload(ParkingRequest.user),
                selectinload(ParkingRequest.parking),
                selectinload(ParkingRequest.recommendations),
            )
            .where(ParkingRequest.id == request_id)
        )
        return result.scalar_one_or_none()

    async def get_by_user_id(
        self,
        db: AsyncSession,
        user_id: int,
        limit: int = 20,
        offset: int = 0,
    ) -> list[ParkingRequest]:
        result = await db.execute(
            select(ParkingRequest)
            .where(ParkingRequest.user_id == user_id)
            .order_by(ParkingRequest.requested_at.desc())
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
    ) -> list[ParkingRequest]:
        result = await db.execute(
            select(ParkingRequest)
            .where(ParkingRequest.parking_id == parking_id)
            .order_by(ParkingRequest.requested_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def get_by_status(
        self,
        db: AsyncSession,
        status: ParkingRequestStatus,
        limit: int = 20,
        offset: int = 0,
    ) -> list[ParkingRequest]:
        result = await db.execute(
            select(ParkingRequest)
            .where(ParkingRequest.status == status)
            .order_by(ParkingRequest.requested_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def update_status(
        self,
        db: AsyncSession,
        parking_request: ParkingRequest,
        status: ParkingRequestStatus,
        recommendation_text: str | None = None,
    ) -> ParkingRequest:
        parking_request.status = status

        if recommendation_text is not None:
            parking_request.recommendation_text = recommendation_text

        await db.flush()
        await db.refresh(parking_request)

        return parking_request


parking_request_repository = ParkingRequestRepository()