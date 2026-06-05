from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.parking_zone import ParkingZone
from app.repositories.parking_repository import parking_repository
from app.repositories.parking_zone_repository import parking_zone_repository
from app.services.exceptions import NotFoundError, ValidationError


PARKING_ZONE_READ_ONLY_FIELDS = {
    "id",
    "free_places",
    "load_percentage",
    "load_level",
    "load_color",
    "is_deleted",
    "deleted_at",
    "created_at",
    "updated_at",
}


class ParkingZoneService:
    def _clean_data(
        self,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            key: value
            for key, value in data.items()
            if key not in PARKING_ZONE_READ_ONLY_FIELDS
        }

    def ensure_not_deleted(
        self,
        zone: ParkingZone,
    ) -> None:
        if zone.is_deleted or zone.deleted_at is not None:
            raise NotFoundError(
                message="Parking zone not found",
                code="PARKING_ZONE_NOT_FOUND",
            )

    def ensure_active(
        self,
        zone: ParkingZone,
    ) -> None:
        self.ensure_not_deleted(zone)

        if not zone.is_active:
            raise ValidationError(
                message="Parking zone is inactive",
                code="PARKING_ZONE_INACTIVE",
            )

    def validate_places(
        self,
        total_places: int,
        occupied_places: int,
    ) -> None:
        if total_places <= 0:
            raise ValidationError(
                message="total_places must be greater than 0",
                code="INVALID_TOTAL_PLACES",
            )

        if occupied_places < 0:
            raise ValidationError(
                message="occupied_places cannot be negative",
                code="INVALID_OCCUPIED_PLACES",
            )

        if occupied_places > total_places:
            raise ValidationError(
                message="occupied_places cannot be greater than total_places",
                code="OCCUPIED_GREATER_THAN_TOTAL",
            )

    async def validate_parking_exists(
        self,
        db: AsyncSession,
        parking_id: int,
    ) -> None:
        parking = await parking_repository.get_by_id(db, parking_id)

        if parking is None or parking.is_deleted or parking.deleted_at is not None:
            raise NotFoundError(
                message="Parking not found",
                code="PARKING_NOT_FOUND",
            )

        if not parking.is_active:
            raise ValidationError(
                message="Parking is inactive",
                code="PARKING_INACTIVE",
            )

    async def get_by_id(
        self,
        db: AsyncSession,
        zone_id: int,
    ) -> ParkingZone:
        zone = await parking_zone_repository.get_by_id(db, zone_id)

        if zone is None:
            raise NotFoundError(
                message="Parking zone not found",
                code="PARKING_ZONE_NOT_FOUND",
            )

        self.ensure_not_deleted(zone)

        return zone

    async def get_active_by_id(
        self,
        db: AsyncSession,
        zone_id: int,
    ) -> ParkingZone:
        zone = await self.get_by_id(db, zone_id)
        self.ensure_active(zone)

        return zone

    async def get_by_id_and_parking_id(
        self,
        db: AsyncSession,
        zone_id: int,
        parking_id: int,
    ) -> ParkingZone:
        zone = await parking_zone_repository.get_by_id_and_parking_id(
            db=db,
            zone_id=zone_id,
            parking_id=parking_id,
        )

        if zone is None:
            raise NotFoundError(
                message="Parking zone not found for this parking",
                code="PARKING_ZONE_NOT_FOUND",
            )

        self.ensure_not_deleted(zone)

        return zone

    async def get_by_parking_id(
        self,
        db: AsyncSession,
        parking_id: int,
        limit: int = 50,
        offset: int = 0,
    ) -> list[ParkingZone]:
        await self.validate_parking_exists(db, parking_id)

        return await parking_zone_repository.get_by_parking_id(
            db=db,
            parking_id=parking_id,
            limit=limit,
            offset=offset,
        )

    async def create_zone(
        self,
        db: AsyncSession,
        parking_id: int,
        data: dict[str, Any],
    ) -> ParkingZone:
        await self.validate_parking_exists(db, parking_id)

        cleaned_data = self._clean_data(data)
        cleaned_data["parking_id"] = parking_id

        self.validate_places(
            total_places=cleaned_data["total_places"],
            occupied_places=cleaned_data.get("occupied_places", 0),
        )

        zone = await parking_zone_repository.create(db, cleaned_data)
        await db.commit()
        await db.refresh(zone)

        return zone

    async def update_zone(
        self,
        db: AsyncSession,
        zone_id: int,
        data: dict[str, Any],
    ) -> ParkingZone:
        zone = await self.get_by_id(db, zone_id)
        cleaned_data = self._clean_data(data)

        total_places = cleaned_data.get("total_places", zone.total_places)
        occupied_places = cleaned_data.get("occupied_places", zone.occupied_places)

        self.validate_places(
            total_places=total_places,
            occupied_places=occupied_places,
        )

        updated_zone = await parking_zone_repository.update(
            db=db,
            obj=zone,
            data=cleaned_data,
        )
        await db.commit()
        await db.refresh(updated_zone)

        return updated_zone

    async def update_status(
        self,
        db: AsyncSession,
        zone_id: int,
        occupied_places: int,
        total_places: int | None = None,
    ) -> ParkingZone:
        zone = await self.get_by_id(db, zone_id)

        final_total_places = total_places if total_places is not None else zone.total_places

        self.validate_places(
            total_places=final_total_places,
            occupied_places=occupied_places,
        )

        updated_zone = await parking_zone_repository.update_places(
            db=db,
            zone=zone,
            occupied_places=occupied_places,
            total_places=total_places,
        )
        await db.commit()
        await db.refresh(updated_zone)

        return updated_zone

    async def soft_delete_zone(
        self,
        db: AsyncSession,
        zone_id: int,
    ) -> ParkingZone:
        zone = await self.get_by_id(db, zone_id)

        deleted_zone = await parking_zone_repository.soft_delete(db, zone)
        await db.commit()
        await db.refresh(deleted_zone)

        return deleted_zone


parking_zone_service = ParkingZoneService()