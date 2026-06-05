from __future__ import annotations

from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.utils import is_admin_user, raise_service_error
from app.auth.dependencies import admin_required, get_current_active_user
from app.db.session import get_db
from app.models.enums import ParkingRequestStatus
from app.models.user import User
from app.schemas.parking_request import (
    ParkingRequestCancel,
    ParkingRequestCreate,
    ParkingRequestList,
    ParkingRequestRead,
    ParkingRequestRecommend,
    ParkingRequestStatusUpdate,
)
from app.schemas.recommendation import RecommendationRead
from app.services.exceptions import ServiceError
from app.services.parking_request_service import parking_request_service
from app.services.recommendation_service import recommendation_service


router = APIRouter(
    prefix="/parking-requests",
    tags=["Parking requests"],
)


@router.post("", response_model=ParkingRequestRead)
async def create_parking_request(
    payload: ParkingRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ParkingRequestRead:
    try:
        return await parking_request_service.create_request(
            db=db,
            user_id=current_user.id,
            data=payload.model_dump(),
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.get("/my", response_model=ParkingRequestList)
async def get_my_parking_requests(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ParkingRequestList:
    try:
        items = await parking_request_service.get_my_requests(
            db=db,
            user_id=current_user.id,
            limit=limit,
            offset=offset,
        )
    except ServiceError as exc:
        raise_service_error(exc)

    return ParkingRequestList(
        items=items,
        total=len(items),
        limit=limit,
        offset=offset,
    )


@router.get("/by-parking/{parking_id}", response_model=ParkingRequestList)
async def get_parking_requests_by_parking(
    parking_id: int,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> ParkingRequestList:
    try:
        items = await parking_request_service.get_by_parking_id(
            db=db,
            parking_id=parking_id,
            limit=limit,
            offset=offset,
        )
    except ServiceError as exc:
        raise_service_error(exc)

    return ParkingRequestList(
        items=items,
        total=len(items),
        limit=limit,
        offset=offset,
    )


@router.get("", response_model=ParkingRequestList)
async def get_parking_requests(
    status: ParkingRequestStatus | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> ParkingRequestList:
    try:
        if status is not None:
            items = await parking_request_service.get_by_status(
                db=db,
                status=status,
                limit=limit,
                offset=offset,
            )
        else:
            items = await parking_request_service.get_list(
                db=db,
                limit=limit,
                offset=offset,
            )
    except ServiceError as exc:
        raise_service_error(exc)

    return ParkingRequestList(
        items=items,
        total=len(items),
        limit=limit,
        offset=offset,
    )


@router.get("/{request_id}", response_model=ParkingRequestRead)
async def get_parking_request(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ParkingRequestRead:
    try:
        return await parking_request_service.get_for_user_or_admin(
            db=db,
            request_id=request_id,
            current_user_id=current_user.id,
            is_admin=is_admin_user(current_user),
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.patch("/{request_id}/status", response_model=ParkingRequestRead)
async def update_parking_request_status(
    request_id: int,
    payload: ParkingRequestStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> ParkingRequestRead:
    try:
        return await parking_request_service.update_status(
            db=db,
            request_id=request_id,
            new_status=payload.status,
            recommendation_text=payload.recommendation_text,
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.post("/{request_id}/cancel", response_model=ParkingRequestRead)
async def cancel_parking_request(
    request_id: int,
    payload: ParkingRequestCancel,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ParkingRequestRead:
    try:
        return await parking_request_service.cancel_request(
            db=db,
            request_id=request_id,
            current_user_id=current_user.id,
            is_admin=is_admin_user(current_user),
            reason=payload.reason,
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.post("/{request_id}/recommend", response_model=RecommendationRead)
async def recommend_for_parking_request(
    request_id: int,
    payload: ParkingRequestRecommend | None = Body(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> RecommendationRead:
    try:
        user_latitude = None
        user_longitude = None
        use_prediction = True
        popularity_days = 30

        if payload is not None:
            user_latitude = payload.user_latitude
            user_longitude = payload.user_longitude
            use_prediction = payload.use_prediction
            popularity_days = payload.popularity_days

        return await recommendation_service.recommend_for_parking_request(
            db=db,
            parking_request_id=request_id,
            current_user_id=current_user.id,
            is_admin=is_admin_user(current_user),
            user_latitude=user_latitude,
            user_longitude=user_longitude,
            use_prediction=use_prediction,
            popularity_days=popularity_days,
        )
    except ServiceError as exc:
        raise_service_error(exc)