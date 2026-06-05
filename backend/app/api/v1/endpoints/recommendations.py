from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.recommendation import (
    RecommendationList,
    RecommendationRead,
    RecommendationRequest,
)
from app.services.exceptions import PermissionDeniedError, ServiceError
from app.services.recommendation_service import recommendation_service
from app.api.v1.endpoints.utils import is_admin_user, raise_service_error


router = APIRouter(
    prefix="/recommendations",
    tags=["Recommendations"],
)


@router.post("", response_model=RecommendationRead)
async def create_recommendation(
    payload: RecommendationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> RecommendationRead:
    try:
        return await recommendation_service.recommend_best_parking(
            db=db,
            user_id=current_user.id,
            requested_parking_id=payload.requested_parking_id,
            user_latitude=payload.user_latitude,
            user_longitude=payload.user_longitude,
            use_prediction=payload.use_prediction,
            popularity_days=payload.popularity_days,
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.get("/my", response_model=RecommendationList)
async def get_my_recommendations(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> RecommendationList:
    try:
        items = await recommendation_service.get_by_user_id(
            db=db,
            user_id=current_user.id,
            limit=limit,
            offset=offset,
        )
    except ServiceError as exc:
        raise_service_error(exc)

    return RecommendationList(
        items=items,
        total=len(items),
        limit=limit,
        offset=offset,
    )


@router.get("/{recommendation_id}", response_model=RecommendationRead)
async def get_recommendation(
    recommendation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> RecommendationRead:
    try:
        recommendation = await recommendation_service.get_by_id(
            db=db,
            recommendation_id=recommendation_id,
        )

        if not is_admin_user(current_user) and recommendation.user_id != current_user.id:
            raise PermissionDeniedError(
                message="You do not have access to this recommendation",
                code="RECOMMENDATION_ACCESS_DENIED",
            )

        return recommendation
    except ServiceError as exc:
        raise_service_error(exc)