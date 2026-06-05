from __future__ import annotations

from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.analytics_repository import analytics_repository
from app.schemas.analytics import (
    DailyLoadRead,
    DashboardSummaryRead,
    ParkingLoadPointRead,
    PeakHourRead,
    PopularParkingRead,
    WeekdayVsWeekendRead,
)
from app.services.parking_service import parking_service


class AnalyticsService:
    async def get_dashboard_summary(
        self,
        db: AsyncSession,
    ) -> DashboardSummaryRead:
        data = await analytics_repository.get_dashboard_summary(db)
        return DashboardSummaryRead(**data)

    async def get_popular_parkings(
        self,
        db: AsyncSession,
        limit: int = 20,
        offset: int = 0,
    ) -> list[PopularParkingRead]:
        rows = await analytics_repository.get_popular_parkings(
            db=db,
            limit=limit,
            offset=offset,
        )

        return [PopularParkingRead(**row) for row in rows]

    async def get_peak_hours(
        self,
        db: AsyncSession,
        parking_id: int | None = None,
        limit: int = 24,
        offset: int = 0,
    ) -> list[PeakHourRead]:
        if parking_id is not None:
            await parking_service.get_by_id(db, parking_id)

        rows = await analytics_repository.get_peak_hours(
            db=db,
            parking_id=parking_id,
            limit=limit,
            offset=offset,
        )

        return [PeakHourRead(**row) for row in rows]

    async def get_daily_load(
        self,
        db: AsyncSession,
        parking_id: int | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        limit: int = 30,
        offset: int = 0,
    ) -> list[DailyLoadRead]:
        if parking_id is not None:
            await parking_service.get_by_id(db, parking_id)

        rows = await analytics_repository.get_daily_load(
            db=db,
            parking_id=parking_id,
            date_from=date_from,
            date_to=date_to,
            limit=limit,
            offset=offset,
        )

        return [DailyLoadRead(**row) for row in rows]

    async def get_weekdays_vs_weekends(
        self,
        db: AsyncSession,
        parking_id: int | None = None,
    ) -> list[WeekdayVsWeekendRead]:
        if parking_id is not None:
            await parking_service.get_by_id(db, parking_id)

        rows = await analytics_repository.get_weekdays_vs_weekends(
            db=db,
            parking_id=parking_id,
        )

        return [WeekdayVsWeekendRead(**row) for row in rows]

    async def get_parking_load_trend(
        self,
        db: AsyncSession,
        parking_id: int,
        limit: int = 100,
        offset: int = 0,
    ) -> list[ParkingLoadPointRead]:
        await parking_service.get_by_id(db, parking_id)

        rows = await analytics_repository.get_parking_load_trend(
            db=db,
            parking_id=parking_id,
            limit=limit,
            offset=offset,
        )

        return [ParkingLoadPointRead(**row) for row in rows]


analytics_service = AnalyticsService()