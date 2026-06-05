from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.utils import raise_service_error
from app.auth.dependencies import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.analytics import (
    DailyLoadList,
    DashboardSummaryRead,
    ParkingLoadTrendList,
    PeakHourList,
    PopularParkingList,
    WeekdayVsWeekendList,
)
from app.services.analytics_service import analytics_service
from app.services.exceptions import ServiceError


router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


@router.get("/dashboard", response_model=DashboardSummaryRead)
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> DashboardSummaryRead:
    try:
        return await analytics_service.get_dashboard_summary(db)
    except ServiceError as exc:
        raise_service_error(exc)


@router.get("/popular-parkings", response_model=PopularParkingList)
async def get_popular_parkings(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PopularParkingList:
    try:
        items = await analytics_service.get_popular_parkings(
            db=db,
            limit=limit,
            offset=offset,
        )
    except ServiceError as exc:
        raise_service_error(exc)

    return PopularParkingList(
        items=items,
        total=len(items),
        limit=limit,
        offset=offset,
    )


@router.get("/peak-hours", response_model=PeakHourList)
async def get_peak_hours(
    parking_id: int | None = Query(default=None, gt=0),
    limit: int = Query(default=24, ge=1, le=24),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PeakHourList:
    try:
        items = await analytics_service.get_peak_hours(
            db=db,
            parking_id=parking_id,
            limit=limit,
            offset=offset,
        )
    except ServiceError as exc:
        raise_service_error(exc)

    return PeakHourList(
        items=items,
        total=len(items),
        limit=limit,
        offset=offset,
    )


@router.get("/daily-load", response_model=DailyLoadList)
async def get_daily_load(
    parking_id: int | None = Query(default=None, gt=0),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    limit: int = Query(default=30, ge=1, le=365),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> DailyLoadList:
    try:
        items = await analytics_service.get_daily_load(
            db=db,
            parking_id=parking_id,
            date_from=date_from,
            date_to=date_to,
            limit=limit,
            offset=offset,
        )
    except ServiceError as exc:
        raise_service_error(exc)

    return DailyLoadList(
        items=items,
        total=len(items),
        limit=limit,
        offset=offset,
    )


@router.get("/weekdays-vs-weekends", response_model=WeekdayVsWeekendList)
async def get_weekdays_vs_weekends(
    parking_id: int | None = Query(default=None, gt=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> WeekdayVsWeekendList:
    try:
        items = await analytics_service.get_weekdays_vs_weekends(
            db=db,
            parking_id=parking_id,
        )
    except ServiceError as exc:
        raise_service_error(exc)

    return WeekdayVsWeekendList(
        items=items,
        total=len(items),
        limit=max(len(items), 1),
        offset=0,
    )


@router.get("/parking-load/{parking_id}", response_model=ParkingLoadTrendList)
async def get_parking_load_trend(
    parking_id: int,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ParkingLoadTrendList:
    try:
        items = await analytics_service.get_parking_load_trend(
            db=db,
            parking_id=parking_id,
            limit=limit,
            offset=offset,
        )
    except ServiceError as exc:
        raise_service_error(exc)

    return ParkingLoadTrendList(
        items=items,
        total=len(items),
        limit=limit,
        offset=offset,
    )