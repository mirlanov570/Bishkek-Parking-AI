from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.model_metric import ModelMetric
from app.models.notification import Notification
from app.models.parking import Parking
from app.models.parking_request import ParkingRequest
from app.models.parking_status_history import ParkingStatusHistory
from app.models.parking_zone import ParkingZone
from app.models.prediction import Prediction
from app.models.recommendation import Recommendation
from app.models.role import Role
from app.models.user import User


class DemoDataRepository:
    async def get_role_by_code(
        self,
        db: AsyncSession,
        code: str,
    ) -> Role | None:
        result = await db.execute(
            select(Role).where(Role.code == code)
        )
        return result.scalar_one_or_none()

    async def get_user_by_login(
        self,
        db: AsyncSession,
        login: str,
    ) -> User | None:
        result = await db.execute(
            select(User).where(User.login == login)
        )
        return result.scalar_one_or_none()

    async def create_user(
        self,
        db: AsyncSession,
        data: dict[str, Any],
    ) -> User:
        user = User(**data)

        db.add(user)
        await db.flush()
        await db.refresh(user)

        return user

    async def get_parking_by_name(
        self,
        db: AsyncSession,
        name: str,
    ) -> Parking | None:
        result = await db.execute(
            select(Parking).where(Parking.name == name)
        )
        return result.scalar_one_or_none()

    async def create_parking(
        self,
        db: AsyncSession,
        data: dict[str, Any],
    ) -> Parking:
        parking = Parking(**data)

        db.add(parking)
        await db.flush()
        await db.refresh(parking)

        return parking

    async def update_parking(
        self,
        db: AsyncSession,
        parking: Parking,
        data: dict[str, Any],
    ) -> Parking:
        for key, value in data.items():
            if hasattr(parking, key):
                setattr(parking, key, value)

        await db.flush()
        await db.refresh(parking)

        return parking

    async def get_zone_by_name(
        self,
        db: AsyncSession,
        parking_id: int,
        name: str,
    ) -> ParkingZone | None:
        result = await db.execute(
            select(ParkingZone).where(
                ParkingZone.parking_id == parking_id,
                ParkingZone.name == name,
            )
        )
        return result.scalar_one_or_none()

    async def create_zone(
        self,
        db: AsyncSession,
        data: dict[str, Any],
    ) -> ParkingZone:
        zone = ParkingZone(**data)

        db.add(zone)
        await db.flush()
        await db.refresh(zone)

        return zone

    async def update_zone(
        self,
        db: AsyncSession,
        zone: ParkingZone,
        data: dict[str, Any],
    ) -> ParkingZone:
        for key, value in data.items():
            if hasattr(zone, key):
                setattr(zone, key, value)

        await db.flush()
        await db.refresh(zone)

        return zone

    async def create_history_records(
        self,
        db: AsyncSession,
        records: Sequence[dict[str, Any]],
    ) -> int:
        if not records:
            return 0

        objects = [ParkingStatusHistory(**record) for record in records]
        db.add_all(objects)
        await db.flush()

        return len(objects)

    async def create_parking_requests(
        self,
        db: AsyncSession,
        records: Sequence[dict[str, Any]],
    ) -> list[ParkingRequest]:
        if not records:
            return []

        objects = [ParkingRequest(**record) for record in records]
        db.add_all(objects)
        await db.flush()

        return objects

    async def create_recommendations(
        self,
        db: AsyncSession,
        records: Sequence[dict[str, Any]],
    ) -> int:
        if not records:
            return 0

        objects = [Recommendation(**record) for record in records]
        db.add_all(objects)
        await db.flush()

        return len(objects)

    async def create_notifications(
        self,
        db: AsyncSession,
        records: Sequence[dict[str, Any]],
    ) -> int:
        if not records:
            return 0

        objects = [Notification(**record) for record in records]
        db.add_all(objects)
        await db.flush()

        return len(objects)

    async def create_predictions(
        self,
        db: AsyncSession,
        records: Sequence[dict[str, Any]],
    ) -> int:
        if not records:
            return 0

        objects = [Prediction(**record) for record in records]
        db.add_all(objects)
        await db.flush()

        return len(objects)

    async def create_model_metrics(
        self,
        db: AsyncSession,
        records: Sequence[dict[str, Any]],
    ) -> int:
        if not records:
            return 0

        objects = [ModelMetric(**record) for record in records]
        db.add_all(objects)
        await db.flush()

        return len(objects)

    async def get_parking_ids_by_names(
        self,
        db: AsyncSession,
        names: Sequence[str],
    ) -> list[int]:
        if not names:
            return []

        result = await db.execute(
            select(Parking.id).where(Parking.name.in_(names))
        )
        return list(result.scalars().all())

    async def get_user_ids_by_logins(
        self,
        db: AsyncSession,
        logins: Sequence[str],
    ) -> list[int]:
        if not logins:
            return []

        result = await db.execute(
            select(User.id).where(User.login.in_(logins))
        )
        return list(result.scalars().all())

    async def reset_demo_data(
        self,
        db: AsyncSession,
        parking_names: Sequence[str],
        driver_logins: Sequence[str],
    ) -> None:
        parking_ids = await self.get_parking_ids_by_names(db, parking_names)
        user_ids = await self.get_user_ids_by_logins(db, driver_logins)

        notification_conditions = []

        if parking_ids:
            notification_conditions.append(Notification.parking_id.in_(parking_ids))

        if user_ids:
            notification_conditions.append(Notification.user_id.in_(user_ids))

        if notification_conditions:
            await db.execute(
                delete(Notification).where(or_(*notification_conditions))
            )

        recommendation_conditions = []

        if user_ids:
            recommendation_conditions.append(Recommendation.user_id.in_(user_ids))

        if parking_ids:
            recommendation_conditions.append(
                Recommendation.requested_parking_id.in_(parking_ids)
            )
            recommendation_conditions.append(
                Recommendation.recommended_parking_id.in_(parking_ids)
            )

        if recommendation_conditions:
            await db.execute(
                delete(Recommendation).where(or_(*recommendation_conditions))
            )

        if parking_ids:
            await db.execute(
                delete(Prediction).where(Prediction.parking_id.in_(parking_ids))
            )
            await db.execute(
                delete(ModelMetric).where(ModelMetric.parking_id.in_(parking_ids))
            )
            await db.execute(
                delete(ParkingRequest).where(ParkingRequest.parking_id.in_(parking_ids))
            )
            await db.execute(
                delete(ParkingStatusHistory).where(
                    ParkingStatusHistory.parking_id.in_(parking_ids)
                )
            )
            await db.execute(
                delete(ParkingZone).where(ParkingZone.parking_id.in_(parking_ids))
            )
            await db.execute(
                delete(Parking).where(Parking.id.in_(parking_ids))
            )

        if user_ids:
            await db.execute(
                delete(ParkingRequest).where(ParkingRequest.user_id.in_(user_ids))
            )
            await db.execute(
                delete(User).where(User.id.in_(user_ids))
            )

        await db.flush()


demo_data_repository = DemoDataRepository()