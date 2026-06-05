from __future__ import annotations

import random
from collections import defaultdict
from datetime import datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.infrastructure_history import InfrastructureHistoryGenerateRead
from app.services.exceptions import ValidationError


class InfrastructureHistoryService:
    def __init__(self) -> None:
        self.random = random.Random(2026)

    def get_history_hours(self, points_per_day: int) -> list[int]:
        if points_per_day >= 24:
            return list(range(24))

        if points_per_day == 1:
            return [12]

        start_hour = 6
        end_hour = 23
        step = (end_hour - start_hour) / (points_per_day - 1)

        hours = sorted(
            {
                int(round(start_hour + step * index))
                for index in range(points_per_day)
            }
        )

        fallback_hour = 0

        while len(hours) < points_per_day:
            if fallback_hour not in hours:
                hours.append(fallback_hour)
            fallback_hour += 1

        return sorted(hours)

    def parse_active_days(self, value: str | None) -> set[int]:
        if not value:
            return {1, 2, 3, 4, 5, 6, 7}

        days: set[int] = set()

        for raw_day in value.split(","):
            raw_day = raw_day.strip()

            if raw_day.isdigit():
                day = int(raw_day)

                if 1 <= day <= 7:
                    days.add(day)

        return days or {1, 2, 3, 4, 5, 6, 7}

    def is_object_active(
        self,
        nearby_object: dict[str, Any],
        recorded_at: datetime,
    ) -> bool:
        active_days = self.parse_active_days(nearby_object.get("active_days"))

        if recorded_at.isoweekday() not in active_days:
            return False

        open_time = nearby_object.get("open_time")
        close_time = nearby_object.get("close_time")

        if open_time is None or close_time is None:
            return True

        current_time = recorded_at.time()

        if open_time <= close_time:
            return open_time <= current_time <= close_time

        return current_time >= open_time or current_time <= close_time

    def get_distance_factor(self, distance_m: int | None) -> float:
        distance = distance_m or 300

        if distance <= 100:
            return 1.20

        if distance <= 300:
            return 1.00

        if distance <= 600:
            return 0.75

        if distance <= 1000:
            return 0.50

        return 0.35

    def get_object_type_factor(
        self,
        object_type: str,
        hour: int,
        is_weekend: bool,
    ) -> float:
        base_factors = {
            "university": 6.5,
            "school": 7.0,
            "mall": 7.5,
            "cafe": 3.5,
            "cinema": 5.5,
            "office": 5.0,
            "market": 6.5,
            "residential": 4.5,
            "hospital": 4.0,
            "park": 3.0,
            "other": 2.0,
        }

        factor = base_factors.get(object_type, 2.0)

        if object_type == "university":
            if not is_weekend and 8 <= hour <= 16:
                factor *= 1.6
            elif is_weekend:
                factor *= 0.35

        elif object_type == "school":
            if not is_weekend and (7 <= hour <= 9 or 12 <= hour <= 14):
                factor *= 1.7
            elif is_weekend:
                factor *= 0.30

        elif object_type == "mall":
            if 17 <= hour <= 22:
                factor *= 1.5
            if is_weekend and 12 <= hour <= 22:
                factor *= 1.8

        elif object_type == "office":
            if not is_weekend and 8 <= hour <= 18:
                factor *= 1.5
            elif is_weekend:
                factor *= 0.35

        elif object_type == "market":
            if 8 <= hour <= 15:
                factor *= 1.5
            if is_weekend:
                factor *= 1.25

        elif object_type == "cinema":
            if 18 <= hour <= 23:
                factor *= 1.8
            if is_weekend:
                factor *= 1.4

        elif object_type == "cafe":
            if 12 <= hour <= 14 or 18 <= hour <= 22:
                factor *= 1.4

        elif object_type == "residential":
            if hour >= 18 or hour <= 7:
                factor *= 1.5

        elif object_type == "park":
            if is_weekend and 10 <= hour <= 20:
                factor *= 1.7

        return factor

    def get_zone_time_factor(
        self,
        zone_type: str,
        hour: int,
        is_weekend: bool,
        day_of_week: int,
    ) -> float:
        factor = 0.0

        if zone_type == "university":
            if not is_weekend:
                if 7 <= hour <= 9:
                    factor += 24
                elif 10 <= hour <= 15:
                    factor += 32
                elif 16 <= hour <= 18:
                    factor += 18
                else:
                    factor -= 5
            else:
                factor -= 18

        elif zone_type == "school":
            if not is_weekend:
                if 7 <= hour <= 9:
                    factor += 34
                elif 12 <= hour <= 14:
                    factor += 28
                elif 16 <= hour <= 18:
                    factor += 16
                else:
                    factor -= 4
            else:
                factor -= 20

        elif zone_type == "mall":
            if 10 <= hour <= 16:
                factor += 10
            if 17 <= hour <= 22:
                factor += 28
            if is_weekend and 12 <= hour <= 22:
                factor += 22

        elif zone_type == "office":
            if not is_weekend and 8 <= hour <= 18:
                factor += 30
            elif not is_weekend and 19 <= hour <= 21:
                factor += 5
            else:
                factor -= 14

        elif zone_type == "residential":
            if hour >= 18 or hour <= 7:
                factor += 30
            elif not is_weekend and 9 <= hour <= 17:
                factor -= 16
            elif is_weekend:
                factor += 8

        elif zone_type == "market":
            if 8 <= hour <= 15:
                factor += 30
            if is_weekend:
                factor += 12
            if hour >= 19:
                factor -= 12

        elif zone_type == "entertainment":
            if 18 <= hour <= 23:
                factor += 35
            if is_weekend:
                factor += 16
            if 6 <= hour <= 11:
                factor -= 12

        elif zone_type == "medical":
            if 8 <= hour <= 17:
                factor += 24
            if is_weekend:
                factor -= 6

        elif zone_type == "park":
            if is_weekend and 10 <= hour <= 20:
                factor += 26
            elif not is_weekend and 17 <= hour <= 20:
                factor += 12
            else:
                factor -= 4

        else:
            if 8 <= hour <= 10:
                factor += 14
            if 12 <= hour <= 14:
                factor += 10
            if 17 <= hour <= 20:
                factor += 20
            if is_weekend:
                factor += 6

        if day_of_week == 5:
            factor += 4

        if day_of_week == 1 and 8 <= hour <= 11:
            factor += 3

        return factor

    def calculate_infrastructure_effect(
        self,
        nearby_objects: list[dict[str, Any]],
        recorded_at: datetime,
    ) -> tuple[float, int]:
        hour = recorded_at.hour
        is_weekend = recorded_at.isoweekday() in {6, 7}

        effect = 0.0
        active_count = 0

        for nearby_object in nearby_objects:
            if not self.is_object_active(nearby_object, recorded_at):
                continue

            object_type = nearby_object.get("object_type") or "other"
            influence_weight = float(nearby_object.get("influence_weight") or 1)
            distance_factor = self.get_distance_factor(nearby_object.get("distance_m"))
            object_factor = self.get_object_type_factor(
                object_type=object_type,
                hour=hour,
                is_weekend=is_weekend,
            )

            effect += object_factor * influence_weight * distance_factor
            active_count += 1

        return effect, active_count

    def calculate_load_percent(
        self,
        parking: dict[str, Any],
        nearby_objects: list[dict[str, Any]],
        recorded_at: datetime,
    ) -> int:
        zone_type = parking.get("zone_type") or "mixed"
        hour = recorded_at.hour
        day_of_week = recorded_at.isoweekday()
        is_weekend = day_of_week in {6, 7}

        base_by_zone = {
            "university": 30,
            "school": 28,
            "mall": 38,
            "office": 32,
            "residential": 42,
            "market": 36,
            "entertainment": 35,
            "medical": 40,
            "park": 25,
            "mixed": 34,
        }

        base = base_by_zone.get(zone_type, 34)

        zone_time_factor = self.get_zone_time_factor(
            zone_type=zone_type,
            hour=hour,
            is_weekend=is_weekend,
            day_of_week=day_of_week,
        )

        infrastructure_effect, active_objects_count = self.calculate_infrastructure_effect(
            nearby_objects=nearby_objects,
            recorded_at=recorded_at,
        )

        active_objects_bonus = min(active_objects_count * 1.8, 12)
        noise = self.random.randint(-7, 7)

        load = base + zone_time_factor + infrastructure_effect + active_objects_bonus + noise

        if 0 <= hour <= 5 and zone_type not in {"residential", "entertainment"}:
            load -= 18

        if zone_type in {"university", "school", "office"} and is_weekend:
            load -= 8

        return max(5, min(int(round(load)), 98))

    def estimate_requests_count(
        self,
        load_percent: int,
        active_objects_count: int,
        max_requests_per_point: int,
    ) -> int:
        if max_requests_per_point <= 0:
            return 0

        if load_percent < 45:
            base = 0
        elif load_percent < 65:
            base = 1
        elif load_percent < 80:
            base = 2
        elif load_percent < 90:
            base = 3
        else:
            base = 4

        if active_objects_count >= 4:
            base += 1

        jitter = self.random.choice([-1, 0, 0, 1])

        return max(0, min(base + jitter, max_requests_per_point))

    async def get_active_parkings(
        self,
        db: AsyncSession,
    ) -> list[dict[str, Any]]:
        result = await db.execute(
            text(
                """
                SELECT
                    id,
                    name,
                    latitude,
                    longitude,
                    total_places,
                    COALESCE(zone_type, 'mixed') AS zone_type
                FROM public.parkings
                WHERE is_active = TRUE
                  AND is_deleted = FALSE
                ORDER BY id
                """
            )
        )

        return [dict(row) for row in result.mappings().all()]

    async def get_active_nearby_objects(
        self,
        db: AsyncSession,
    ) -> dict[int, list[dict[str, Any]]]:
        result = await db.execute(
            text(
                """
                SELECT
                    id,
                    parking_id,
                    object_type,
                    distance_m,
                    open_time,
                    close_time,
                    active_days,
                    influence_weight
                FROM public.nearby_objects
                WHERE is_active = TRUE
                ORDER BY parking_id, distance_m, id
                """
            )
        )

        grouped: dict[int, list[dict[str, Any]]] = defaultdict(list)

        for row in result.mappings().all():
            item = dict(row)
            grouped[int(item["parking_id"])].append(item)

        return grouped

    async def get_driver_user_ids(
        self,
        db: AsyncSession,
    ) -> list[int]:
        result = await db.execute(
            text(
                """
                SELECT u.id
                FROM public.users u
                JOIN public.roles r ON r.id = u.role_id
                WHERE r.code = 'driver'
                  AND u.is_active = TRUE
                  AND u.is_deleted = FALSE
                ORDER BY u.id
                """
            )
        )

        return [int(row[0]) for row in result.all()]

    async def clear_generated_data(
        self,
        db: AsyncSession,
    ) -> None:
        await db.execute(
            text(
                """
                DELETE FROM public.parking_requests
                WHERE recommendation_text LIKE 'AUTO_INFRA_HISTORY:%'
                """
            )
        )

        await db.execute(
            text(
                """
                DELETE FROM public.parking_status_history
                WHERE source = 'generated'::public.history_source
                """
            )
        )

        await db.flush()

    async def bulk_insert_history(
        self,
        db: AsyncSession,
        records: list[dict[str, Any]],
    ) -> int:
        if not records:
            return 0

        await db.execute(
            text(
                """
                INSERT INTO public.parking_status_history (
                    parking_id,
                    zone_id,
                    total_places,
                    occupied_places,
                    source,
                    recorded_at
                )
                VALUES (
                    :parking_id,
                    NULL,
                    :total_places,
                    :occupied_places,
                    'generated'::public.history_source,
                    :recorded_at
                )
                """
            ),
            records,
        )

        await db.flush()

        return len(records)

    async def bulk_insert_requests(
        self,
        db: AsyncSession,
        records: list[dict[str, Any]],
    ) -> int:
        if not records:
            return 0

        await db.execute(
            text(
                """
                INSERT INTO public.parking_requests (
                    user_id,
                    parking_id,
                    selected_zone_id,
                    user_latitude,
                    user_longitude,
                    status,
                    recommendation_text,
                    requested_at,
                    created_at,
                    updated_at
                )
                VALUES (
                    :user_id,
                    :parking_id,
                    NULL,
                    :user_latitude,
                    :user_longitude,
                    CAST(:status AS public.parking_request_status),
                    :recommendation_text,
                    :requested_at,
                    :requested_at,
                    :requested_at
                )
                """
            ),
            records,
        )

        await db.flush()

        return len(records)

    async def update_current_load(
        self,
        db: AsyncSession,
        latest_records_by_parking: dict[int, dict[str, Any]],
    ) -> None:
        for parking_id, record in latest_records_by_parking.items():
            total_places = int(record["total_places"])
            occupied_places = int(record["occupied_places"])
            load_percent = Decimal(str(record["load_percent"]))

            await db.execute(
                text(
                    """
                    UPDATE public.parkings
                    SET
                        occupied_places = :occupied_places,
                        updated_at = now()
                    WHERE id = :parking_id
                    """
                ),
                {
                    "parking_id": parking_id,
                    "occupied_places": occupied_places,
                },
            )

            await db.execute(
                text(
                    """
                    UPDATE public.parking_zones
                    SET
                        occupied_places = LEAST(
                            total_places,
                            GREATEST(
                                0,
                                ROUND(total_places * :load_percent / 100.0)::integer
                            )
                        ),
                        updated_at = now()
                    WHERE parking_id = :parking_id
                      AND is_deleted = FALSE
                    """
                ),
                {
                    "parking_id": parking_id,
                    "load_percent": load_percent,
                },
            )

        await db.flush()

    def build_request_records_for_point(
        self,
        parking: dict[str, Any],
        recorded_at: datetime,
        load_percent: int,
        active_objects_count: int,
        driver_user_ids: list[int],
        max_requests_per_point: int,
    ) -> list[dict[str, Any]]:
        if not driver_user_ids:
            return []

        requests_count = self.estimate_requests_count(
            load_percent=load_percent,
            active_objects_count=active_objects_count,
            max_requests_per_point=max_requests_per_point,
        )

        records: list[dict[str, Any]] = []

        statuses = [
            "created",
            "processing",
            "recommended",
            "completed",
        ]

        for _ in range(requests_count):
            requested_at = recorded_at - timedelta(
                minutes=self.random.randint(5, 55),
            )

            latitude = Decimal(
                str(float(parking["latitude"]) + self.random.uniform(-0.003, 0.003))
            ).quantize(Decimal("0.000001"))

            longitude = Decimal(
                str(float(parking["longitude"]) + self.random.uniform(-0.003, 0.003))
            ).quantize(Decimal("0.000001"))

            records.append(
                {
                    "user_id": self.random.choice(driver_user_ids),
                    "parking_id": parking["id"],
                    "user_latitude": latitude,
                    "user_longitude": longitude,
                    "status": self.random.choice(statuses),
                    "recommendation_text": (
                        f"AUTO_INFRA_HISTORY: generated request, "
                        f"load={load_percent}%"
                    ),
                    "requested_at": requested_at,
                }
            )

        return records

    async def generate_history(
        self,
        db: AsyncSession,
        reset_generated: bool,
        days: int,
        history_points_per_day: int,
        generate_requests: bool,
        max_requests_per_point: int,
    ) -> InfrastructureHistoryGenerateRead:
        if days < 7:
            raise ValidationError(
                message="days must be at least 7",
                code="INVALID_DAYS",
            )

        if history_points_per_day < 1:
            raise ValidationError(
                message="history_points_per_day must be at least 1",
                code="INVALID_HISTORY_POINTS_PER_DAY",
            )

        started_at = datetime.now(timezone.utc)

        if reset_generated:
            await self.clear_generated_data(db)

        parkings = await self.get_active_parkings(db)

        if not parkings:
            raise ValidationError(
                message="No active parkings found",
                code="NO_ACTIVE_PARKINGS",
            )

        nearby_objects_by_parking = await self.get_active_nearby_objects(db)
        driver_user_ids = await self.get_driver_user_ids(db) if generate_requests else []

        hours = self.get_history_hours(history_points_per_day)
        now = datetime.now(timezone.utc)

        history_records: list[dict[str, Any]] = []
        request_records: list[dict[str, Any]] = []
        latest_records_by_parking: dict[int, dict[str, Any]] = {}

        for day_offset in range(days - 1, -1, -1):
            current_day = now - timedelta(days=day_offset)

            for parking in parkings:
                parking_id = int(parking["id"])
                nearby_objects = nearby_objects_by_parking.get(parking_id, [])

                for hour in hours:
                    recorded_at = current_day.replace(
                        hour=hour,
                        minute=self.random.choice([0, 10, 20, 30, 40, 50]),
                        second=0,
                        microsecond=0,
                    )

                    if recorded_at > now:
                        continue

                    load_percent = self.calculate_load_percent(
                        parking=parking,
                        nearby_objects=nearby_objects,
                        recorded_at=recorded_at,
                    )

                    total_places = int(parking["total_places"])
                    occupied_places = int(round(total_places * load_percent / 100))

                    infrastructure_effect, active_objects_count = (
                        self.calculate_infrastructure_effect(
                            nearby_objects=nearby_objects,
                            recorded_at=recorded_at,
                        )
                    )

                    history_records.append(
                        {
                            "parking_id": parking_id,
                            "total_places": total_places,
                            "occupied_places": occupied_places,
                            "recorded_at": recorded_at,
                        }
                    )

                    latest_records_by_parking[parking_id] = {
                        "total_places": total_places,
                        "occupied_places": occupied_places,
                        "load_percent": load_percent,
                    }

                    if generate_requests:
                        request_records.extend(
                            self.build_request_records_for_point(
                                parking=parking,
                                recorded_at=recorded_at,
                                load_percent=load_percent,
                                active_objects_count=active_objects_count,
                                driver_user_ids=driver_user_ids,
                                max_requests_per_point=max_requests_per_point,
                            )
                        )

        history_created = await self.bulk_insert_history(
            db=db,
            records=history_records,
        )

        requests_created = await self.bulk_insert_requests(
            db=db,
            records=request_records,
        )

        await self.update_current_load(
            db=db,
            latest_records_by_parking=latest_records_by_parking,
        )

        await db.commit()

        finished_at = datetime.now(timezone.utc)

        nearby_objects_used = sum(
            len(items)
            for items in nearby_objects_by_parking.values()
        )

        return InfrastructureHistoryGenerateRead(
            reset_performed=reset_generated,
            days=days,
            history_points_per_day=history_points_per_day,
            generate_requests=generate_requests,
            parkings_processed=len(parkings),
            nearby_objects_used=nearby_objects_used,
            history_records_created=history_created,
            parking_requests_created=requests_created,
            started_at=started_at,
            finished_at=finished_at,
            message=(
                "Infrastructure-based parking history generated successfully. "
                "Now delete old ML .pkl files and train the model again."
            ),
        )


infrastructure_history_service = InfrastructureHistoryService()