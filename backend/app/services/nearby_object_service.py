from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.nearby_object import NearbyObject
from app.repositories.nearby_object_repository import nearby_object_repository
from app.repositories.parking_repository import parking_repository
from app.services.exceptions import NotFoundError, ValidationError


NEARBY_OBJECT_READ_ONLY_FIELDS = {
    "id",
    "created_at",
    "updated_at",
}


class NearbyObjectService:
    def _clean_data(self, data: dict[str, Any]) -> dict[str, Any]:
        return {
            key: value
            for key, value in data.items()
            if key not in NEARBY_OBJECT_READ_ONLY_FIELDS
        }

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

    def ensure_active(self, nearby_object: NearbyObject) -> None:
        if not nearby_object.is_active:
            raise ValidationError(
                message="Nearby object is inactive",
                code="NEARBY_OBJECT_INACTIVE",
            )

    async def get_by_id(
        self,
        db: AsyncSession,
        object_id: int,
    ) -> NearbyObject:
        nearby_object = await nearby_object_repository.get_by_id(
            db,
            object_id,
        )

        if nearby_object is None:
            raise NotFoundError(
                message="Nearby object not found",
                code="NEARBY_OBJECT_NOT_FOUND",
            )

        return nearby_object

    async def get_active_by_id(
        self,
        db: AsyncSession,
        object_id: int,
    ) -> NearbyObject:
        nearby_object = await self.get_by_id(db, object_id)
        self.ensure_active(nearby_object)

        return nearby_object

    async def get_by_parking_id(
        self,
        db: AsyncSession,
        parking_id: int,
        limit: int = 100,
        offset: int = 0,
        only_active: bool = True,
    ) -> list[NearbyObject]:
        await self.validate_parking_exists(db, parking_id)

        return await nearby_object_repository.get_by_parking_id(
            db=db,
            parking_id=parking_id,
            limit=limit,
            offset=offset,
            only_active=only_active,
        )

    async def get_by_type(
        self,
        db: AsyncSession,
        object_type: str,
        limit: int = 100,
        offset: int = 0,
        only_active: bool = True,
    ) -> list[NearbyObject]:
        return await nearby_object_repository.get_by_type(
            db=db,
            object_type=object_type,
            limit=limit,
            offset=offset,
            only_active=only_active,
        )

    async def create_for_parking(
        self,
        db: AsyncSession,
        parking_id: int,
        data: dict[str, Any],
    ) -> NearbyObject:
        await self.validate_parking_exists(db, parking_id)

        cleaned_data = self._clean_data(data)
        cleaned_data["parking_id"] = parking_id

        nearby_object = await nearby_object_repository.create(
            db,
            cleaned_data,
        )

        await db.commit()
        await db.refresh(nearby_object)

        return nearby_object

    async def create_object(
        self,
        db: AsyncSession,
        data: dict[str, Any],
    ) -> NearbyObject:
        cleaned_data = self._clean_data(data)

        await self.validate_parking_exists(
            db,
            cleaned_data["parking_id"],
        )

        nearby_object = await nearby_object_repository.create(
            db,
            cleaned_data,
        )

        await db.commit()
        await db.refresh(nearby_object)

        return nearby_object

    async def update_object(
        self,
        db: AsyncSession,
        object_id: int,
        data: dict[str, Any],
    ) -> NearbyObject:
        nearby_object = await self.get_by_id(db, object_id)
        cleaned_data = self._clean_data(data)

        updated_object = await nearby_object_repository.update(
            db=db,
            obj=nearby_object,
            data=cleaned_data,
        )

        await db.commit()
        await db.refresh(updated_object)

        return updated_object

    async def delete_object(
        self,
        db: AsyncSession,
        object_id: int,
    ) -> NearbyObject:
        nearby_object = await self.get_by_id(db, object_id)

        await nearby_object_repository.delete(db, nearby_object)
        await db.commit()

        return nearby_object


nearby_object_service = NearbyObjectService()