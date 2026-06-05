from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.recommendation import Recommendation
from app.repositories.base import BaseRepository


class RecommendationRepository(BaseRepository[Recommendation]):
    def __init__(self) -> None:
        super().__init__(Recommendation)

    async def get_by_user_id(
        self,
        db: AsyncSession,
        user_id: int,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Recommendation]:
        result = await db.execute(
            select(Recommendation)
            .options(
                selectinload(Recommendation.requested_parking),
                selectinload(Recommendation.recommended_parking),
            )
            .where(Recommendation.user_id == user_id)
            .order_by(Recommendation.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def get_by_request_id(
        self,
        db: AsyncSession,
        parking_request_id: int,
    ) -> list[Recommendation]:
        result = await db.execute(
            select(Recommendation)
            .where(Recommendation.parking_request_id == parking_request_id)
            .order_by(Recommendation.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_recommended_parking_id(
        self,
        db: AsyncSession,
        parking_id: int,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Recommendation]:
        result = await db.execute(
            select(Recommendation)
            .where(Recommendation.recommended_parking_id == parking_id)
            .order_by(Recommendation.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())


recommendation_repository = RecommendationRepository()