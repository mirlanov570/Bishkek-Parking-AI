from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import and_, bindparam, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.parking_request import ParkingRequest
from app.models.prediction import Prediction


class RecommendationScoringRepository:
    async def get_latest_predictions_by_parking_ids(
        self,
        db: AsyncSession,
        parking_ids: list[int],
    ) -> dict[int, Prediction]:
        if not parking_ids:
            return {}

        latest_subquery = (
            select(
                Prediction.parking_id.label("parking_id"),
                func.max(Prediction.prediction_datetime).label("latest_datetime"),
            )
            .where(Prediction.parking_id.in_(parking_ids))
            .group_by(Prediction.parking_id)
            .subquery()
        )

        result = await db.execute(
            select(Prediction).join(
                latest_subquery,
                and_(
                    Prediction.parking_id == latest_subquery.c.parking_id,
                    Prediction.prediction_datetime == latest_subquery.c.latest_datetime,
                ),
            )
        )

        predictions = result.scalars().all()

        return {
            prediction.parking_id: prediction
            for prediction in predictions
        }

    async def get_request_counts_by_parking_ids(
        self,
        db: AsyncSession,
        parking_ids: list[int],
        days: int = 30,
    ) -> dict[int, int]:
        if not parking_ids:
            return {}

        since = datetime.now(timezone.utc) - timedelta(days=days)

        result = await db.execute(
            select(
                ParkingRequest.parking_id,
                func.count(ParkingRequest.id),
            )
            .where(
                ParkingRequest.parking_id.in_(parking_ids),
                ParkingRequest.created_at >= since,
            )
            .group_by(ParkingRequest.parking_id)
        )

        rows = result.all()

        return {
            int(parking_id): int(count)
            for parking_id, count in rows
        }

    async def get_infrastructure_context_by_parking_ids(
        self,
        db: AsyncSession,
        parking_ids: list[int],
        target_datetime: datetime | None = None,
    ) -> dict[int, dict[str, Any]]:
        if not parking_ids:
            return {}

        if target_datetime is None:
            target_datetime = datetime.now(timezone.utc)

        day_of_week = target_datetime.isoweekday()
        target_time = target_datetime.time()
        active_day_pattern = f"%,{day_of_week},%"

        query = text(
            """
            SELECT
                p.id AS parking_id,
                COALESCE(p.zone_type, 'mixed') AS zone_type,

                COUNT(no.id) FILTER (WHERE no.object_type = 'university') AS nearby_university_count,
                COUNT(no.id) FILTER (WHERE no.object_type = 'school') AS nearby_school_count,
                COUNT(no.id) FILTER (WHERE no.object_type = 'mall') AS nearby_mall_count,
                COUNT(no.id) FILTER (WHERE no.object_type = 'cafe') AS nearby_cafe_count,
                COUNT(no.id) FILTER (WHERE no.object_type = 'cinema') AS nearby_cinema_count,
                COUNT(no.id) FILTER (WHERE no.object_type = 'office') AS nearby_office_count,
                COUNT(no.id) FILTER (WHERE no.object_type = 'market') AS nearby_market_count,
                COUNT(no.id) FILTER (WHERE no.object_type = 'residential') AS nearby_residential_count,
                COUNT(no.id) FILTER (WHERE no.object_type = 'hospital') AS nearby_hospital_count,
                COUNT(no.id) FILTER (WHERE no.object_type = 'park') AS nearby_park_count,

                COUNT(no.id) AS active_objects_count,
                COALESCE(SUM(no.influence_weight), 0) AS active_objects_weight,

                COALESCE(
                    STRING_AGG(
                        CONCAT(
                            no.object_type,
                            ':',
                            no.name,
                            ':',
                            no.distance_m::text,
                            ':',
                            no.influence_weight::text
                        ),
                        '|'
                        ORDER BY no.influence_weight DESC, no.distance_m ASC
                    ) FILTER (WHERE no.id IS NOT NULL),
                    ''
                ) AS active_objects_text

            FROM public.parkings p

            LEFT JOIN public.nearby_objects no
                ON no.parking_id = p.id
               AND no.is_active = TRUE
               AND (',' || no.active_days || ',') LIKE :active_day_pattern
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

            WHERE p.id IN :parking_ids

            GROUP BY p.id, p.zone_type
            """
        ).bindparams(bindparam("parking_ids", expanding=True))

        result = await db.execute(
            query,
            {
                "parking_ids": parking_ids,
                "active_day_pattern": active_day_pattern,
                "target_time": target_time,
            },
        )

        rows = result.mappings().all()

        return {
            int(row["parking_id"]): dict(row)
            for row in rows
        }


recommendation_scoring_repository = RecommendationScoringRepository()