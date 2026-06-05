from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.enums import NotificationType, ParkingRequestStatus
from app.models.parking import Parking
from app.models.parking_request import ParkingRequest
from app.models.user import User
from app.repositories.demo_data_repository import demo_data_repository
from app.schemas.demo import DemoSeedRead
from app.services.exceptions import NotFoundError, ValidationError


DEMO_PASSWORD = "demo123"
DEMO_MODEL_NAME = "LinearRegression"


DEMO_PARKINGS: list[dict[str, Any]] = [
    {
        "name": "Demo Parking — ЦУМ Айчурек",
        "address": "Бишкек, проспект Чуй, район ЦУМ Айчурек",
        "latitude": Decimal("42.875210"),
        "longitude": Decimal("74.614380"),
        "total_places": 120,
        "working_hours": "08:00-23:00",
        "description": "Демо-парковка возле ЦУМ Айчурек.",
        "zones": [
            {"name": "Северная зона", "total_places": 50},
            {"name": "Южная зона", "total_places": 70},
        ],
    },
    {
        "name": "Demo Parking — Бишкек Парк",
        "address": "Бишкек, Киевская улица, район Бишкек Парк",
        "latitude": Decimal("42.874030"),
        "longitude": Decimal("74.590990"),
        "total_places": 180,
        "working_hours": "09:00-00:00",
        "description": "Демо-парковка возле ТРЦ Бишкек Парк.",
        "zones": [
            {"name": "Подземная зона", "total_places": 100},
            {"name": "Гостевая зона", "total_places": 80},
        ],
    },
    {
        "name": "Demo Parking — Азия Молл",
        "address": "Бишкек, проспект Чынгыза Айтматова, Азия Молл",
        "latitude": Decimal("42.851810"),
        "longitude": Decimal("74.584850"),
        "total_places": 220,
        "working_hours": "09:00-00:00",
        "description": "Демо-парковка возле Азия Молл.",
        "zones": [
            {"name": "Зона A", "total_places": 90},
            {"name": "Зона B", "total_places": 80},
            {"name": "Зона C", "total_places": 50},
        ],
    },
    {
        "name": "Demo Parking — Ошский рынок",
        "address": "Бишкек, район Ошского рынка",
        "latitude": Decimal("42.875910"),
        "longitude": Decimal("74.569830"),
        "total_places": 150,
        "working_hours": "07:00-21:00",
        "description": "Демо-парковка возле Ошского рынка.",
        "zones": [
            {"name": "Рыночная зона", "total_places": 90},
            {"name": "Гостевая зона", "total_places": 60},
        ],
    },
    {
        "name": "Demo Parking — Дордой Плаза",
        "address": "Бишкек, улица Ибраимова, Дордой Плаза",
        "latitude": Decimal("42.875590"),
        "longitude": Decimal("74.624760"),
        "total_places": 160,
        "working_hours": "08:00-23:00",
        "description": "Демо-парковка возле Дордой Плаза.",
        "zones": [
            {"name": "Основная зона", "total_places": 110},
            {"name": "VIP зона", "total_places": 50},
        ],
    },
    {
        "name": "Demo Parking — Ала-Тоо",
        "address": "Бишкек, площадь Ала-Тоо",
        "latitude": Decimal("42.876520"),
        "longitude": Decimal("74.603650"),
        "total_places": 90,
        "working_hours": "08:00-22:00",
        "description": "Демо-парковка в центре города.",
        "zones": [
            {"name": "Центральная зона", "total_places": 90},
        ],
    },
    {
        "name": "Demo Parking — Филармония",
        "address": "Бишкек, район Кыргызской национальной филармонии",
        "latitude": Decimal("42.881050"),
        "longitude": Decimal("74.595960"),
        "total_places": 110,
        "working_hours": "08:00-22:00",
        "description": "Демо-парковка возле Филармонии.",
        "zones": [
            {"name": "Главная зона", "total_places": 70},
            {"name": "Боковая зона", "total_places": 40},
        ],
    },
    {
        "name": "Demo Parking — Цирк",
        "address": "Бишкек, район Государственного цирка",
        "latitude": Decimal("42.882360"),
        "longitude": Decimal("74.614910"),
        "total_places": 130,
        "working_hours": "08:00-22:00",
        "description": "Демо-парковка возле цирка.",
        "zones": [
            {"name": "Восточная зона", "total_places": 60},
            {"name": "Западная зона", "total_places": 70},
        ],
    },
    {
        "name": "Demo Parking — Vefa Center",
        "address": "Бишкек, улица Горького, Vefa Center",
        "latitude": Decimal("42.858830"),
        "longitude": Decimal("74.609410"),
        "total_places": 170,
        "working_hours": "09:00-23:00",
        "description": "Демо-парковка возле Vefa Center.",
        "zones": [
            {"name": "Торговая зона", "total_places": 100},
            {"name": "Офисная зона", "total_places": 70},
        ],
    },
    {
        "name": "Demo Parking — ГУМ Чынар",
        "address": "Бишкек, район ГУМ Чынар",
        "latitude": Decimal("42.874820"),
        "longitude": Decimal("74.616150"),
        "total_places": 100,
        "working_hours": "08:00-22:00",
        "description": "Демо-парковка возле ГУМ Чынар.",
        "zones": [
            {"name": "Основная зона", "total_places": 100},
        ],
    },
]


class DemoDataService:
    def __init__(self) -> None:
        self.random = random.Random(42)

    def get_demo_parking_names(self) -> list[str]:
        return [parking["name"] for parking in DEMO_PARKINGS]

    def get_demo_driver_logins(
        self,
        drivers_count: int,
    ) -> list[str]:
        return [
            f"demo_driver_{index}"
            for index in range(1, drivers_count + 1)
        ]

    def get_history_hours(
        self,
        points_per_day: int,
    ) -> list[int]:
        if points_per_day <= 1:
            return [12]

        start_hour = 7
        end_hour = 22
        step = (end_hour - start_hour) / (points_per_day - 1)

        return [
            int(round(start_hour + step * index))
            for index in range(points_per_day)
        ]

    def calculate_load_percent(
        self,
        hour: int,
        is_weekend: bool,
        parking_index: int,
    ) -> int:
        base = 35

        if 8 <= hour <= 10:
            base += 18

        if 12 <= hour <= 14:
            base += 12

        if 17 <= hour <= 20:
            base += 28

        if is_weekend:
            base += 10

        base += parking_index % 7
        base += self.random.randint(-12, 12)

        return max(5, min(base, 98))

    def get_level_and_color(
        self,
        load_percentage: Decimal,
    ) -> tuple[str, str]:
        if load_percentage <= Decimal("50"):
            return "low", "green"

        if load_percentage <= Decimal("80"):
            return "medium", "yellow"

        return "high", "red"

    def calculate_distance_km(
        self,
        user_latitude: Decimal,
        user_longitude: Decimal,
        parking: Parking,
    ) -> Decimal:
        lat_diff = abs(float(user_latitude) - float(parking.latitude))
        lon_diff = abs(float(user_longitude) - float(parking.longitude))
        approximate_distance = ((lat_diff * 111) ** 2 + (lon_diff * 85) ** 2) ** 0.5

        return Decimal(str(round(approximate_distance, 3)))

    async def ensure_driver_role(
        self,
        db: AsyncSession,
    ):
        role = await demo_data_repository.get_role_by_code(db, "driver")

        if role is None:
            raise NotFoundError(
                message="Role with code='driver' not found. Restore dump first.",
                code="DRIVER_ROLE_NOT_FOUND",
            )

        return role

    async def ensure_demo_drivers(
        self,
        db: AsyncSession,
        drivers_count: int,
    ) -> tuple[list[User], int]:
        role = await self.ensure_driver_role(db)

        drivers: list[User] = []
        created_count = 0

        for index in range(1, drivers_count + 1):
            login = f"demo_driver_{index}"
            user = await demo_data_repository.get_user_by_login(db, login)

            if user is None:
                user = await demo_data_repository.create_user(
                    db=db,
                    data={
                        "full_name": f"Demo Driver {index}",
                        "email": f"demo_driver_{index}@example.com",
                        "phone": f"+99670010{index:04d}",
                        "login": login,
                        "password_hash": get_password_hash(DEMO_PASSWORD),
                        "role_id": role.id,
                        "preferred_language": "ru",
                        "is_active": True,
                    },
                )
                created_count += 1

            drivers.append(user)

        return drivers, created_count

    async def ensure_demo_parkings(
        self,
        db: AsyncSession,
    ) -> tuple[list[Parking], int, int, int, int]:
        parkings: list[Parking] = []
        created_parkings = 0
        updated_parkings = 0
        created_zones = 0
        updated_zones = 0

        for index, demo_parking in enumerate(DEMO_PARKINGS):
            current_load_percent = self.calculate_load_percent(
                hour=18,
                is_weekend=False,
                parking_index=index,
            )
            occupied_places = int(
                demo_parking["total_places"] * current_load_percent / 100
            )

            parking_data = {
                "name": demo_parking["name"],
                "address": demo_parking["address"],
                "latitude": demo_parking["latitude"],
                "longitude": demo_parking["longitude"],
                "total_places": demo_parking["total_places"],
                "occupied_places": occupied_places,
                "working_hours": demo_parking["working_hours"],
                "description": demo_parking["description"],
                "is_active": True,
                "is_deleted": False,
                "deleted_at": None,
            }

            parking = await demo_data_repository.get_parking_by_name(
                db=db,
                name=demo_parking["name"],
            )

            if parking is None:
                parking = await demo_data_repository.create_parking(
                    db=db,
                    data=parking_data,
                )
                created_parkings += 1
            else:
                parking = await demo_data_repository.update_parking(
                    db=db,
                    parking=parking,
                    data=parking_data,
                )
                updated_parkings += 1

            parkings.append(parking)

            for zone_data in demo_parking["zones"]:
                zone_occupied = int(
                    zone_data["total_places"] * current_load_percent / 100
                )

                final_zone_data = {
                    "parking_id": parking.id,
                    "name": zone_data["name"],
                    "total_places": zone_data["total_places"],
                    "occupied_places": zone_occupied,
                    "is_active": True,
                    "is_deleted": False,
                    "deleted_at": None,
                }

                zone = await demo_data_repository.get_zone_by_name(
                    db=db,
                    parking_id=parking.id,
                    name=zone_data["name"],
                )

                if zone is None:
                    await demo_data_repository.create_zone(
                        db=db,
                        data=final_zone_data,
                    )
                    created_zones += 1
                else:
                    await demo_data_repository.update_zone(
                        db=db,
                        zone=zone,
                        data=final_zone_data,
                    )
                    updated_zones += 1

        return (
            parkings,
            created_parkings,
            updated_parkings,
            created_zones,
            updated_zones,
        )

    async def create_demo_history(
        self,
        db: AsyncSession,
        parkings: list[Parking],
        days: int,
        history_points_per_day: int,
    ) -> int:
        now = datetime.now(timezone.utc)
        hours = self.get_history_hours(history_points_per_day)
        records: list[dict[str, Any]] = []

        for day_offset in range(days, 0, -1):
            current_day = now - timedelta(days=day_offset)
            is_weekend = current_day.isoweekday() in {6, 7}

            for parking_index, parking in enumerate(parkings):
                for hour in hours:
                    recorded_at = current_day.replace(
                        hour=hour,
                        minute=self.random.choice([0, 10, 20, 30, 40, 50]),
                        second=0,
                        microsecond=0,
                    )

                    load_percent = self.calculate_load_percent(
                        hour=hour,
                        is_weekend=is_weekend,
                        parking_index=parking_index,
                    )
                    occupied_places = int(parking.total_places * load_percent / 100)

                    records.append(
                        {
                            "parking_id": parking.id,
                            "zone_id": None,
                            "total_places": parking.total_places,
                            "occupied_places": occupied_places,
                            "source": "generated",
                            "recorded_at": recorded_at,
                        }
                    )

        return await demo_data_repository.create_history_records(db, records)

    async def create_demo_requests(
        self,
        db: AsyncSession,
        drivers: list[User],
        parkings: list[Parking],
        requests_count: int,
    ) -> list[ParkingRequest]:
        if requests_count <= 0:
            return []

        now = datetime.now(timezone.utc)
        records: list[dict[str, Any]] = []

        statuses = [
            ParkingRequestStatus.CREATED,
            ParkingRequestStatus.PROCESSING,
            ParkingRequestStatus.RECOMMENDED,
            ParkingRequestStatus.COMPLETED,
            ParkingRequestStatus.CANCELLED,
        ]

        for index in range(requests_count):
            driver = drivers[index % len(drivers)]
            parking = parkings[index % len(parkings)]
            status = statuses[index % len(statuses)]

            requested_at = now - timedelta(
                days=self.random.randint(0, 45),
                hours=self.random.randint(0, 23),
                minutes=self.random.randint(0, 59),
            )

            records.append(
                {
                    "user_id": driver.id,
                    "parking_id": parking.id,
                    "selected_zone_id": None,
                    "user_latitude": Decimal("42.870000") + Decimal(
                        str(self.random.uniform(-0.02, 0.02))
                    ).quantize(Decimal("0.000001")),
                    "user_longitude": Decimal("74.610000") + Decimal(
                        str(self.random.uniform(-0.02, 0.02))
                    ).quantize(Decimal("0.000001")),
                    "status": status,
                    "recommendation_text": (
                        "Демо-рекомендация создана системой."
                        if status in {
                            ParkingRequestStatus.RECOMMENDED,
                            ParkingRequestStatus.COMPLETED,
                        }
                        else None
                    ),
                    "requested_at": requested_at,
                    "created_at": requested_at,
                    "updated_at": requested_at,
                }
            )

        return await demo_data_repository.create_parking_requests(db, records)

    async def create_demo_recommendations(
        self,
        db: AsyncSession,
        parking_requests: list[ParkingRequest],
        parkings: list[Parking],
    ) -> int:
        records: list[dict[str, Any]] = []

        for request in parking_requests:
            if request.status not in {
                ParkingRequestStatus.RECOMMENDED,
                ParkingRequestStatus.COMPLETED,
            }:
                continue

            recommended_parking = min(
                parkings,
                key=lambda parking: (
                    Decimal(str(parking.load_percentage or 0))
                    - Decimal(str(parking.free_places or 0)) * Decimal("0.10")
                ),
            )

            distance_km = None

            if request.user_latitude is not None and request.user_longitude is not None:
                distance_km = self.calculate_distance_km(
                    user_latitude=request.user_latitude,
                    user_longitude=request.user_longitude,
                    parking=recommended_parking,
                )

            reason = (
                f"Demo рекомендация: парковка «{recommended_parking.name}» "
                f"имеет {recommended_parking.free_places} свободных мест "
                f"и загрузку {recommended_parking.load_percentage}%."
            )

            records.append(
                {
                    "user_id": request.user_id,
                    "parking_request_id": request.id,
                    "requested_parking_id": request.parking_id,
                    "recommended_parking_id": recommended_parking.id,
                    "reason": reason,
                    "distance_km": distance_km,
                    "current_load_percentage": recommended_parking.load_percentage,
                    "predicted_load_percentage": None,
                    "expected_free_places": recommended_parking.free_places,
                    "score": Decimal(str(self.random.uniform(1, 100))).quantize(
                        Decimal("0.0001")
                    ),
                    "created_at": request.created_at + timedelta(minutes=2),
                }
            )

        return await demo_data_repository.create_recommendations(db, records)

    async def create_demo_notifications(
        self,
        db: AsyncSession,
        drivers: list[User],
        parkings: list[Parking],
    ) -> int:
        records: list[dict[str, Any]] = []

        for index, driver in enumerate(drivers):
            parking = parkings[index % len(parkings)]

            records.append(
                {
                    "user_id": driver.id,
                    "parking_id": parking.id,
                    "type": NotificationType.SYSTEM,
                    "title": "Добро пожаловать в Bishkek Parking AI",
                    "message": "Это демо-уведомление для проверки frontend и backend.",
                    "is_read": False,
                }
            )

            records.append(
                {
                    "user_id": driver.id,
                    "parking_id": parking.id,
                    "type": NotificationType.PARKING_ALMOST_FULL,
                    "title": "Парковка почти заполнена",
                    "message": f"Парковка «{parking.name}» имеет высокий уровень загруженности.",
                    "is_read": index % 2 == 0,
                }
            )

        return await demo_data_repository.create_notifications(db, records)

    async def create_demo_predictions(
        self,
        db: AsyncSession,
        parkings: list[Parking],
        predictions_count: int,
    ) -> int:
        if predictions_count <= 0:
            return 0

        now = datetime.now(timezone.utc)
        records: list[dict[str, Any]] = []

        for index in range(predictions_count):
            parking = parkings[index % len(parkings)]
            prediction_datetime = now + timedelta(
                hours=index + 1,
            )

            hour = prediction_datetime.hour
            is_weekend = prediction_datetime.isoweekday() in {6, 7}

            load_percent_int = self.calculate_load_percent(
                hour=hour,
                is_weekend=is_weekend,
                parking_index=index,
            )

            predicted_load_percentage = Decimal(str(load_percent_int)).quantize(
                Decimal("0.01")
            )
            predicted_occupied_places = int(
                parking.total_places * load_percent_int / 100
            )
            predicted_free_places = max(
                parking.total_places - predicted_occupied_places,
                0,
            )
            load_level, color = self.get_level_and_color(predicted_load_percentage)

            records.append(
                {
                    "parking_id": parking.id,
                    "prediction_datetime": prediction_datetime,
                    "predicted_occupied_places": predicted_occupied_places,
                    "predicted_free_places": predicted_free_places,
                    "predicted_load_percentage": predicted_load_percentage,
                    "predicted_load_level": load_level,
                    "predicted_color": color,
                    "model_name": DEMO_MODEL_NAME,
                    "features": {
                        "hour": hour,
                        "day_of_week": prediction_datetime.isoweekday(),
                        "month": prediction_datetime.month,
                        "is_weekend": is_weekend,
                        "source": "demo_generator",
                    },
                }
            )

        return await demo_data_repository.create_predictions(db, records)

    async def create_demo_model_metrics(
        self,
        db: AsyncSession,
        parkings: list[Parking],
    ) -> int:
        records: list[dict[str, Any]] = []

        for index, parking in enumerate(parkings):
            records.append(
                {
                    "model_name": DEMO_MODEL_NAME,
                    "parking_id": parking.id,
                    "mae": Decimal(str(round(3.5 + index * 0.2, 4))),
                    "mse": Decimal(str(round(15.0 + index * 1.4, 4))),
                    "r2_score": Decimal(str(round(0.72 + index * 0.01, 4))),
                    "train_rows_count": 1000 + index * 50,
                    "test_rows_count": 200 + index * 10,
                    "extra_info": {
                        "source": "demo_generator",
                        "description": "Demo metric for diploma presentation",
                    },
                }
            )

        return await demo_data_repository.create_model_metrics(db, records)

    async def seed_demo_data(
        self,
        db: AsyncSession,
        reset: bool,
        days: int,
        history_points_per_day: int,
        drivers_count: int,
        requests_count: int,
        predictions_count: int,
    ) -> DemoSeedRead:
        if days < 7:
            raise ValidationError(
                message="days must be at least 7",
                code="INVALID_DEMO_DAYS",
            )

        if history_points_per_day < 1:
            raise ValidationError(
                message="history_points_per_day must be at least 1",
                code="INVALID_HISTORY_POINTS_PER_DAY",
            )

        if reset:
            await demo_data_repository.reset_demo_data(
                db=db,
                parking_names=self.get_demo_parking_names(),
                driver_logins=self.get_demo_driver_logins(drivers_count),
            )
            await db.commit()

        drivers, created_drivers = await self.ensure_demo_drivers(
            db=db,
            drivers_count=drivers_count,
        )

        (
            parkings,
            created_parkings,
            updated_parkings,
            created_zones,
            updated_zones,
        ) = await self.ensure_demo_parkings(db)

        history_records_created = await self.create_demo_history(
            db=db,
            parkings=parkings,
            days=days,
            history_points_per_day=history_points_per_day,
        )

        parking_requests = await self.create_demo_requests(
            db=db,
            drivers=drivers,
            parkings=parkings,
            requests_count=requests_count,
        )

        recommendations_created = await self.create_demo_recommendations(
            db=db,
            parking_requests=parking_requests,
            parkings=parkings,
        )

        notifications_created = await self.create_demo_notifications(
            db=db,
            drivers=drivers,
            parkings=parkings,
        )

        predictions_created = await self.create_demo_predictions(
            db=db,
            parkings=parkings,
            predictions_count=predictions_count,
        )

        model_metrics_created = await self.create_demo_model_metrics(
            db=db,
            parkings=parkings,
        )

        await db.commit()

        return DemoSeedRead(
            reset_performed=reset,
            days=days,
            history_points_per_day=history_points_per_day,
            drivers_count=drivers_count,
            requests_count=requests_count,
            predictions_count=predictions_count,
            created_parkings=created_parkings,
            updated_parkings=updated_parkings,
            created_zones=created_zones,
            updated_zones=updated_zones,
            created_drivers=created_drivers,
            history_records_created=history_records_created,
            parking_requests_created=len(parking_requests),
            recommendations_created=recommendations_created,
            notifications_created=notifications_created,
            predictions_created=predictions_created,
            model_metrics_created=model_metrics_created,
            message="Demo data generated successfully",
        )


demo_data_service = DemoDataService()