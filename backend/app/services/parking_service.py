from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.parking import Parking
from app.repositories.parking_repository import parking_repository
from app.services.exceptions import ConflictError, NotFoundError, ValidationError


PARKING_READ_ONLY_FIELDS = {
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


class ParkingService:
    def _clean_data(
        self,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            key: value
            for key, value in data.items()
            if key not in PARKING_READ_ONLY_FIELDS
        }

    def ensure_not_deleted(
        self,
        parking: Parking,
    ) -> None:
        if parking.is_deleted or parking.deleted_at is not None:
            raise NotFoundError(
                message="Parking not found",
                code="PARKING_NOT_FOUND",
            )

    def ensure_active(
        self,
        parking: Parking,
    ) -> None:
        self.ensure_not_deleted(parking)

        if not parking.is_active:
            raise ValidationError(
                message="Parking is inactive",
                code="PARKING_INACTIVE",
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

    async def get_by_id(
        self,
        db: AsyncSession,
        parking_id: int,
    ) -> Parking:
        parking = await parking_repository.get_by_id(db, parking_id)

        if parking is None:
            raise NotFoundError(
                message="Parking not found",
                code="PARKING_NOT_FOUND",
            )

        self.ensure_not_deleted(parking)

        return parking

    async def get_active_by_id(
        self,
        db: AsyncSession,
        parking_id: int,
    ) -> Parking:
        parking = await self.get_by_id(db, parking_id)
        self.ensure_active(parking)

        return parking

    async def get_by_id_with_zones(
        self,
        db: AsyncSession,
        parking_id: int,
    ) -> Parking:
        parking = await parking_repository.get_by_id_with_zones(db, parking_id)

        if parking is None:
            raise NotFoundError(
                message="Parking not found",
                code="PARKING_NOT_FOUND",
            )

        self.ensure_not_deleted(parking)

        return parking

    async def get_list(
        self,
        db: AsyncSession,
        limit: int = 20,
        offset: int = 0,
        only_active: bool = True,
    ) -> list[Parking]:
        if only_active:
            return await parking_repository.get_active_list(
                db=db,
                limit=limit,
                offset=offset,
            )

        return await parking_repository.get_list(
            db=db,
            limit=limit,
            offset=offset,
        )

    async def search_by_name(
        self,
        db: AsyncSession,
        search: str,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Parking]:
        return await parking_repository.search_by_name(
            db=db,
            search=search,
            limit=limit,
            offset=offset,
        )

    async def create_parking(
        self,
        db: AsyncSession,
        data: dict[str, Any],
    ) -> Parking:
        cleaned_data = self._clean_data(data)

        self.validate_places(
            total_places=cleaned_data["total_places"],
            occupied_places=cleaned_data.get("occupied_places", 0),
        )

        same_name = await parking_repository.search_by_name(
            db=db,
            search=cleaned_data["name"],
            limit=1,
            offset=0,
        )

        if any(parking.name == cleaned_data["name"] for parking in same_name):
            raise ConflictError(
                message="Parking with this name already exists",
                code="PARKING_NAME_ALREADY_EXISTS",
            )

        parking = await parking_repository.create(db, cleaned_data)
        await db.commit()
        await db.refresh(parking)

        return parking

    async def update_parking(
        self,
        db: AsyncSession,
        parking_id: int,
        data: dict[str, Any],
    ) -> Parking:
        parking = await self.get_by_id(db, parking_id)
        cleaned_data = self._clean_data(data)

        total_places = cleaned_data.get("total_places", parking.total_places)
        occupied_places = cleaned_data.get("occupied_places", parking.occupied_places)

        self.validate_places(
            total_places=total_places,
            occupied_places=occupied_places,
        )

        updated_parking = await parking_repository.update(
            db=db,
            obj=parking,
            data=cleaned_data,
        )
        await db.commit()
        await db.refresh(updated_parking)

        return updated_parking

    async def update_status(
        self,
        db: AsyncSession,
        parking_id: int,
        occupied_places: int,
        total_places: int | None = None,
    ) -> Parking:
        parking = await self.get_by_id(db, parking_id)

        final_total_places = total_places if total_places is not None else parking.total_places

        self.validate_places(
            total_places=final_total_places,
            occupied_places=occupied_places,
        )

        updated_parking = await parking_repository.update_places(
            db=db,
            parking=parking,
            occupied_places=occupied_places,
            total_places=total_places,
        )
        await db.commit()
        await db.refresh(updated_parking)

        return updated_parking

    async def soft_delete_parking(
        self,
        db: AsyncSession,
        parking_id: int,
    ) -> Parking:
        parking = await self.get_by_id(db, parking_id)

        deleted_parking = await parking_repository.soft_delete(db, parking)
        await db.commit()
        await db.refresh(deleted_parking)

        return deleted_parking


parking_service = ParkingService()