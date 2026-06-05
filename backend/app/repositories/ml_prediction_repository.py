from __future__ import annotations

from datetime import datetime, time, timedelta
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class MLPredictionRepository:
    async def get_training_rows(
        self,
        db: AsyncSession,
        parking_id: int | None = None,
    ) -> list[dict[str, Any]]:
        base_sql = """
            SELECT
                h.parking_id,
                COALESCE(p.zone_type, 'mixed') AS zone_type,
                h.total_places,
                h.occupied_places,
                h.load_percentage,
                h.recorded_at,

                COALESCE((
                    SELECT COUNT(*)
                    FROM public.parking_requests pr
                    WHERE pr.parking_id = h.parking_id
                      AND pr.requested_at >= h.recorded_at - INTERVAL '1 hour'
                      AND pr.requested_at <= h.recorded_at
                ), 0) AS requests_last_hour,

                COUNT(no.id) FILTER (WHERE no.object_type = 'university') AS nearby_university_count,
                COUNT(no.id) FILTER (WHERE no.object_type = 'school') AS nearby_school_count,
                COUNT(no.id) FILTER (WHERE no.object_type = 'mall') AS nearby_mall_count,
                COUNT(no.id) FILTER (WHERE no.object_type = 'cafe') AS nearby_cafe_count,
                COUNT(no.id) FILTER (WHERE no.object_type = 'cinema') AS nearby_cinema_count,
                COUNT(no.id) FILTER (WHERE no.object_type = 'office') AS nearby_office_count,
                COUNT(no.id) FILTER (WHERE no.object_type = 'market') AS nearby_market_count,
                COUNT(no.id) FILTER (WHERE no.object_type = 'residential') AS nearby_residential_count,

                COUNT(no.id) AS active_objects_count,
                COALESCE(SUM(no.influence_weight), 0) AS active_objects_weight

            FROM public.parking_status_history h
            JOIN public.parkings p ON p.id = h.parking_id

            LEFT JOIN public.nearby_objects no
                ON no.parking_id = h.parking_id
               AND no.is_active = TRUE
               AND (
                    ',' || no.active_days || ','
               ) LIKE (
                    '%,' || EXTRACT(ISODOW FROM h.recorded_at)::integer::text || ',%'
               )
               AND (
                    no.open_time IS NULL
                    OR no.close_time IS NULL
                    OR (
                        no.open_time <= no.close_time
                        AND h.recorded_at::time >= no.open_time
                        AND h.recorded_at::time <= no.close_time
                    )
                    OR (
                        no.open_time > no.close_time
                        AND (
                            h.recorded_at::time >= no.open_time
                            OR h.recorded_at::time <= no.close_time
                        )
                    )
               )

            {where_clause}

            GROUP BY
                h.parking_id,
                p.zone_type,
                h.total_places,
                h.occupied_places,
                h.load_percentage,
                h.recorded_at

            ORDER BY h.parking_id, h.recorded_at
        """

        if parking_id is None:
            result = await db.execute(
                text(base_sql.format(where_clause=""))
            )
        else:
            result = await db.execute(
                text(base_sql.format(where_clause="WHERE h.parking_id = :parking_id")),
                {
                    "parking_id": parking_id,
                },
            )

        return [dict(row) for row in result.mappings().all()]

    async def get_latest_history_context(
        self,
        db: AsyncSession,
        parking_id: int,
    ) -> dict[str, Any] | None:
        result = await db.execute(
            text(
                """
                SELECT
                    total_places,
                    occupied_places,
                    load_percentage,
                    recorded_at
                FROM public.parking_status_history
                WHERE parking_id = :parking_id
                ORDER BY recorded_at DESC
                LIMIT 1
                """
            ),
            {
                "parking_id": parking_id,
            },
        )

        row = result.mappings().first()

        if row is None:
            return None

        return dict(row)

    async def get_average_load_for_hour(
        self,
        db: AsyncSession,
        parking_id: int,
        hour: int,
    ):
        result = await db.execute(
            text(
                """
                SELECT ROUND(AVG(load_percentage), 2)
                FROM public.parking_status_history
                WHERE parking_id = :parking_id
                  AND EXTRACT(hour FROM recorded_at)::integer = :hour
                """
            ),
            {
                "parking_id": parking_id,
                "hour": hour,
            },
        )

        return result.scalar_one_or_none()

    async def get_requests_count_last_hour(
        self,
        db: AsyncSession,
        parking_id: int,
        prediction_datetime: datetime,
    ) -> int:
        start_datetime = prediction_datetime - timedelta(hours=1)

        result = await db.execute(
            text(
                """
                SELECT COUNT(*)
                FROM public.parking_requests
                WHERE parking_id = :parking_id
                AND requested_at >= :start_datetime
                AND requested_at <= :end_datetime
                """
            ),
            {
                "parking_id": parking_id,
                "start_datetime": start_datetime,
                "end_datetime": prediction_datetime,
            },
        )

        return int(result.scalar_one() or 0)

    async def get_infrastructure_context(
        self,
        db: AsyncSession,
        parking_id: int,
        day_of_week: int,
        target_time: time,
    ) -> dict[str, Any]:
        active_day_pattern = f"%,{day_of_week},%"

        result = await db.execute(
            text(
                """
                SELECT
                    COALESCE(p.zone_type, 'mixed') AS zone_type,

                    COUNT(no.id) FILTER (WHERE no.object_type = 'university') AS nearby_university_count,
                    COUNT(no.id) FILTER (WHERE no.object_type = 'school') AS nearby_school_count,
                    COUNT(no.id) FILTER (WHERE no.object_type = 'mall') AS nearby_mall_count,
                    COUNT(no.id) FILTER (WHERE no.object_type = 'cafe') AS nearby_cafe_count,
                    COUNT(no.id) FILTER (WHERE no.object_type = 'cinema') AS nearby_cinema_count,
                    COUNT(no.id) FILTER (WHERE no.object_type = 'office') AS nearby_office_count,
                    COUNT(no.id) FILTER (WHERE no.object_type = 'market') AS nearby_market_count,
                    COUNT(no.id) FILTER (WHERE no.object_type = 'residential') AS nearby_residential_count,

                    COUNT(no.id) AS active_objects_count,
                    COALESCE(SUM(no.influence_weight), 0) AS active_objects_weight

                FROM public.parkings p

                LEFT JOIN public.nearby_objects no
                    ON no.parking_id = p.id
                AND no.is_active = TRUE
                AND (
                        ',' || no.active_days || ','
                ) LIKE :active_day_pattern
                AND (
                        no.open_time IS NULL
                        OR no.close_time IS NULL
                        OR (
                            no.open_time <= no.close_time
                            AND :target_time >= no.open_time
                            AND :target_time <= no.close_time
                        )
                        OR (
                            no.open_time > no.close_time
                            AND (
                                :target_time >= no.open_time
                                OR :target_time <= no.close_time
                            )
                        )
                )

                WHERE p.id = :parking_id

                GROUP BY p.id, p.zone_type
                """
            ),
            {
                "parking_id": parking_id,
                "active_day_pattern": active_day_pattern,
                "target_time": target_time,
            },
        )

        row = result.mappings().first()

        if row is None:
            return {
                "zone_type": "mixed",
                "nearby_university_count": 0,
                "nearby_school_count": 0,
                "nearby_mall_count": 0,
                "nearby_cafe_count": 0,
                "nearby_cinema_count": 0,
                "nearby_office_count": 0,
                "nearby_market_count": 0,
                "nearby_residential_count": 0,
                "active_objects_count": 0,
                "active_objects_weight": 0,
            }

        return dict(row)

ml_prediction_repository = MLPredictionRepository()