from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class AnalyticsRepository:
    async def get_dashboard_summary(
        self,
        db: AsyncSession,
    ) -> dict[str, Any]:
        dashboard_result = await db.execute(
            text(
                """
                SELECT
                    parking_count,
                    total_places,
                    free_places,
                    occupied_places,
                    average_load_percentage
                FROM public.v_dashboard_summary
                """
            )
        )
        dashboard_row = dashboard_result.mappings().first()

        requests_count_result = await db.execute(
            text("SELECT COUNT(*)::integer FROM public.parking_requests")
        )
        requests_count = int(requests_count_result.scalar_one())

        active_users_count_result = await db.execute(
            text(
                """
                SELECT COUNT(*)::integer
                FROM public.users
                WHERE is_active = true
                  AND is_deleted = false
                """
            )
        )
        active_users_count = int(active_users_count_result.scalar_one())

        predictions_count_result = await db.execute(
            text("SELECT COUNT(*)::integer FROM public.predictions")
        )
        predictions_count = int(predictions_count_result.scalar_one())

        recommendations_count_result = await db.execute(
            text("SELECT COUNT(*)::integer FROM public.recommendations")
        )
        recommendations_count = int(recommendations_count_result.scalar_one())

        unread_notifications_count_result = await db.execute(
            text(
                """
                SELECT COUNT(*)::integer
                FROM public.notifications
                WHERE is_read = false
                """
            )
        )
        unread_notifications_count = int(unread_notifications_count_result.scalar_one())

        if dashboard_row is None:
            return {
                "parking_count": 0,
                "total_places": 0,
                "free_places": 0,
                "occupied_places": 0,
                "average_load_percentage": 0,
                "requests_count": requests_count,
                "active_users_count": active_users_count,
                "predictions_count": predictions_count,
                "recommendations_count": recommendations_count,
                "unread_notifications_count": unread_notifications_count,
            }

        return {
            "parking_count": dashboard_row["parking_count"] or 0,
            "total_places": dashboard_row["total_places"] or 0,
            "free_places": dashboard_row["free_places"] or 0,
            "occupied_places": dashboard_row["occupied_places"] or 0,
            "average_load_percentage": dashboard_row["average_load_percentage"] or 0,
            "requests_count": requests_count,
            "active_users_count": active_users_count,
            "predictions_count": predictions_count,
            "recommendations_count": recommendations_count,
            "unread_notifications_count": unread_notifications_count,
        }

    async def get_popular_parkings(
        self,
        db: AsyncSession,
        limit: int = 20,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        result = await db.execute(
            text(
                """
                SELECT
                    parking_id,
                    parking_name,
                    request_count
                FROM public.v_popular_parkings
                LIMIT :limit OFFSET :offset
                """
            ),
            {
                "limit": limit,
                "offset": offset,
            },
        )

        return [dict(row) for row in result.mappings().all()]

    async def get_peak_hours(
        self,
        db: AsyncSession,
        parking_id: int | None = None,
        limit: int = 24,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        if parking_id is None:
            result = await db.execute(
                text(
                    """
                    SELECT
                        hour,
                        average_load_percentage,
                        records_count
                    FROM public.v_peak_hours
                    LIMIT :limit OFFSET :offset
                    """
                ),
                {
                    "limit": limit,
                    "offset": offset,
                },
            )
            return [dict(row) for row in result.mappings().all()]

        result = await db.execute(
            text(
                """
                SELECT
                    EXTRACT(hour FROM recorded_at)::integer AS hour,
                    ROUND(AVG(load_percentage), 2) AS average_load_percentage,
                    COUNT(*)::integer AS records_count
                FROM public.parking_status_history
                WHERE parking_id = :parking_id
                GROUP BY EXTRACT(hour FROM recorded_at)
                ORDER BY hour
                LIMIT :limit OFFSET :offset
                """
            ),
            {
                "parking_id": parking_id,
                "limit": limit,
                "offset": offset,
            },
        )

        return [dict(row) for row in result.mappings().all()]

    async def get_daily_load(
        self,
        db: AsyncSession,
        parking_id: int | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        limit: int = 30,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        conditions: list[str] = []
        params: dict[str, Any] = {
            "limit": limit,
            "offset": offset,
        }

        if parking_id is not None:
            conditions.append("parking_id = :parking_id")
            params["parking_id"] = parking_id

        if date_from is not None:
            conditions.append("recorded_at::date >= :date_from")
            params["date_from"] = date_from

        if date_to is not None:
            conditions.append("recorded_at::date <= :date_to")
            params["date_to"] = date_to

        where_clause = ""

        if conditions:
            where_clause = "WHERE " + " AND ".join(conditions)

        result = await db.execute(
            text(
                f"""
                SELECT
                    recorded_at::date AS day,
                    ROUND(AVG(load_percentage), 2) AS average_load_percentage,
                    MIN(load_percentage) AS min_load_percentage,
                    MAX(load_percentage) AS max_load_percentage,
                    COUNT(*)::integer AS records_count
                FROM public.parking_status_history
                {where_clause}
                GROUP BY recorded_at::date
                ORDER BY day DESC
                LIMIT :limit OFFSET :offset
                """
            ),
            params,
        )

        return [dict(row) for row in result.mappings().all()]

    async def get_weekdays_vs_weekends(
        self,
        db: AsyncSession,
        parking_id: int | None = None,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {}

        where_clause = ""

        if parking_id is not None:
            where_clause = "WHERE parking_id = :parking_id"
            params["parking_id"] = parking_id

        result = await db.execute(
            text(
                f"""
                SELECT
                    CASE
                        WHEN EXTRACT(ISODOW FROM recorded_at) IN (6, 7)
                        THEN 'weekend'
                        ELSE 'weekday'
                    END AS day_type,
                    ROUND(AVG(load_percentage), 2) AS average_load_percentage,
                    COUNT(*)::integer AS records_count
                FROM public.parking_status_history
                {where_clause}
                GROUP BY
                    CASE
                        WHEN EXTRACT(ISODOW FROM recorded_at) IN (6, 7)
                        THEN 'weekend'
                        ELSE 'weekday'
                    END
                ORDER BY day_type
                """
            ),
            params,
        )

        return [dict(row) for row in result.mappings().all()]

    async def get_parking_load_trend(
        self,
        db: AsyncSession,
        parking_id: int,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        result = await db.execute(
            text(
                """
                SELECT
                    parking_id,
                    zone_id,
                    total_places,
                    occupied_places,
                    free_places,
                    load_percentage,
                    load_level,
                    load_color,
                    source::text AS source,
                    recorded_at
                FROM public.parking_status_history
                WHERE parking_id = :parking_id
                ORDER BY recorded_at DESC
                LIMIT :limit OFFSET :offset
                """
            ),
            {
                "parking_id": parking_id,
                "limit": limit,
                "offset": offset,
            },
        )

        return [dict(row) for row in result.mappings().all()]


analytics_repository = AnalyticsRepository()