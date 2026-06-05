from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import ParkingRequestStatus
from app.models.parking import Parking
from app.models.parking_request import ParkingRequest
from app.models.parking_zone import ParkingZone
from app.repositories.parking_request_repository import parking_request_repository
from app.services.exceptions import (
    NotFoundError,
    PermissionDeniedError,
    ValidationError,
)
from app.services.parking_service import parking_service
from app.services.parking_zone_service import parking_zone_service
from app.services.user_service import user_service


logger = logging.getLogger("app.parking_requests")


ALLOWED_REQUEST_STATUS_TRANSITIONS: dict[ParkingRequestStatus, set[ParkingRequestStatus]] = {
    ParkingRequestStatus.CREATED: {
        ParkingRequestStatus.PROCESSING,
        ParkingRequestStatus.RECOMMENDED,
        ParkingRequestStatus.CANCELLED,
    },
    ParkingRequestStatus.PROCESSING: {
        ParkingRequestStatus.RECOMMENDED,
        ParkingRequestStatus.COMPLETED,
        ParkingRequestStatus.CANCELLED,
    },
    ParkingRequestStatus.RECOMMENDED: {
        ParkingRequestStatus.COMPLETED,
        ParkingRequestStatus.CANCELLED,
    },
    ParkingRequestStatus.COMPLETED: set(),
    ParkingRequestStatus.CANCELLED: set(),
}


class ParkingRequestService:
    def ensure_parking_has_free_places(
        self,
        parking: Parking,
    ) -> None:
        if parking.free_places is not None and parking.free_places <= 0:
            logger.warning(
                "Parking request rejected | parking_id=%s reason=no_free_places",
                parking.id,
            )
            raise ValidationError(
                message="Parking has no free places",
                code="PARKING_HAS_NO_FREE_PLACES",
            )

    def ensure_zone_has_free_places(
        self,
        zone: ParkingZone,
    ) -> None:
        if zone.free_places is not None and zone.free_places <= 0:
            logger.warning(
                "Parking request rejected | zone_id=%s parking_id=%s reason=zone_no_free_places",
                zone.id,
                zone.parking_id,
            )
            raise ValidationError(
                message="Parking zone has no free places",
                code="PARKING_ZONE_HAS_NO_FREE_PLACES",
            )

    async def get_by_id(
        self,
        db: AsyncSession,
        request_id: int,
    ) -> ParkingRequest:
        parking_request = await parking_request_repository.get_by_id_with_relations(
            db=db,
            request_id=request_id,
        )

        if parking_request is None:
            raise NotFoundError(
                message="Parking request not found",
                code="PARKING_REQUEST_NOT_FOUND",
            )

        return parking_request

    async def get_list(
        self,
        db: AsyncSession,
        limit: int = 20,
        offset: int = 0,
    ) -> list[ParkingRequest]:
        return await parking_request_repository.get_list(
            db=db,
            limit=limit,
            offset=offset,
        )

    async def get_for_user_or_admin(
        self,
        db: AsyncSession,
        request_id: int,
        current_user_id: int,
        is_admin: bool = False,
    ) -> ParkingRequest:
        parking_request = await self.get_by_id(db, request_id)

        if not is_admin and parking_request.user_id != current_user_id:
            logger.warning(
                "Parking request access denied | request_id=%s current_user_id=%s owner_user_id=%s",
                request_id,
                current_user_id,
                parking_request.user_id,
            )
            raise PermissionDeniedError(
                message="You do not have access to this parking request",
                code="PARKING_REQUEST_ACCESS_DENIED",
            )

        return parking_request

    async def get_my_requests(
        self,
        db: AsyncSession,
        user_id: int,
        limit: int = 20,
        offset: int = 0,
    ) -> list[ParkingRequest]:
        await user_service.get_active_by_id(db, user_id)

        return await parking_request_repository.get_by_user_id(
            db=db,
            user_id=user_id,
            limit=limit,
            offset=offset,
        )

    async def get_by_parking_id(
        self,
        db: AsyncSession,
        parking_id: int,
        limit: int = 20,
        offset: int = 0,
    ) -> list[ParkingRequest]:
        await parking_service.get_by_id(db, parking_id)

        return await parking_request_repository.get_by_parking_id(
            db=db,
            parking_id=parking_id,
            limit=limit,
            offset=offset,
        )

    async def get_by_status(
        self,
        db: AsyncSession,
        status: ParkingRequestStatus,
        limit: int = 20,
        offset: int = 0,
    ) -> list[ParkingRequest]:
        return await parking_request_repository.get_by_status(
            db=db,
            status=status,
            limit=limit,
            offset=offset,
        )

    async def create_request(
        self,
        db: AsyncSession,
        user_id: int,
        data: dict[str, Any],
    ) -> ParkingRequest:
        logger.info(
            "Parking request create attempt | user_id=%s parking_id=%s selected_zone_id=%s",
            user_id,
            data.get("parking_id"),
            data.get("selected_zone_id"),
        )

        await user_service.get_active_by_id(db, user_id)

        parking = await parking_service.get_active_by_id(
            db=db,
            parking_id=data["parking_id"],
        )

        self.ensure_parking_has_free_places(parking)

        selected_zone_id = data.get("selected_zone_id")

        if selected_zone_id is not None:
            zone = await parking_zone_service.get_by_id_and_parking_id(
                db=db,
                zone_id=selected_zone_id,
                parking_id=parking.id,
            )
            parking_zone_service.ensure_active(zone)
            self.ensure_zone_has_free_places(zone)

        create_data = {
            "user_id": user_id,
            "parking_id": data["parking_id"],
            "selected_zone_id": selected_zone_id,
            "user_latitude": data.get("user_latitude"),
            "user_longitude": data.get("user_longitude"),
            "status": ParkingRequestStatus.CREATED,
            "recommendation_text": data.get("recommendation_text"),
        }

        parking_request = await parking_request_repository.create(db, create_data)
        await db.commit()
        await db.refresh(parking_request)

        logger.info(
            "Parking request created | request_id=%s user_id=%s parking_id=%s status=%s",
            parking_request.id,
            parking_request.user_id,
            parking_request.parking_id,
            parking_request.status.value,
        )

        return parking_request

    def validate_status_transition(
        self,
        current_status: ParkingRequestStatus,
        new_status: ParkingRequestStatus,
    ) -> None:
        allowed_statuses = ALLOWED_REQUEST_STATUS_TRANSITIONS[current_status]

        if new_status not in allowed_statuses:
            logger.warning(
                "Invalid parking request status transition | from=%s to=%s",
                current_status.value,
                new_status.value,
            )
            raise ValidationError(
                message=(
                    f"Cannot change parking request status "
                    f"from {current_status.value} to {new_status.value}"
                ),
                code="INVALID_PARKING_REQUEST_STATUS_TRANSITION",
            )

    async def update_status(
        self,
        db: AsyncSession,
        request_id: int,
        new_status: ParkingRequestStatus,
        recommendation_text: str | None = None,
    ) -> ParkingRequest:
        parking_request = await self.get_by_id(db, request_id)

        old_status = parking_request.status

        self.validate_status_transition(
            current_status=parking_request.status,
            new_status=new_status,
        )

        updated_request = await parking_request_repository.update_status(
            db=db,
            parking_request=parking_request,
            status=new_status,
            recommendation_text=recommendation_text,
        )
        await db.commit()
        await db.refresh(updated_request)

        logger.info(
            "Parking request status updated | request_id=%s old_status=%s new_status=%s",
            updated_request.id,
            old_status.value,
            updated_request.status.value,
        )

        return updated_request

    async def cancel_request(
        self,
        db: AsyncSession,
        request_id: int,
        current_user_id: int,
        is_admin: bool = False,
        reason: str | None = None,
    ) -> ParkingRequest:
        logger.info(
            "Parking request cancel attempt | request_id=%s current_user_id=%s is_admin=%s",
            request_id,
            current_user_id,
            is_admin,
        )

        parking_request = await self.get_for_user_or_admin(
            db=db,
            request_id=request_id,
            current_user_id=current_user_id,
            is_admin=is_admin,
        )

        if parking_request.status == ParkingRequestStatus.CANCELLED:
            logger.info(
                "Parking request already cancelled | request_id=%s",
                parking_request.id,
            )
            return parking_request

        if parking_request.status == ParkingRequestStatus.COMPLETED:
            logger.warning(
                "Parking request cancel rejected | request_id=%s reason=completed",
                parking_request.id,
            )
            raise ValidationError(
                message="Completed parking request cannot be cancelled",
                code="COMPLETED_REQUEST_CANNOT_BE_CANCELLED",
            )

        recommendation_text = parking_request.recommendation_text

        if reason:
            recommendation_text = f"Cancelled. Reason: {reason}"

        updated_request = await parking_request_repository.update_status(
            db=db,
            parking_request=parking_request,
            status=ParkingRequestStatus.CANCELLED,
            recommendation_text=recommendation_text,
        )
        await db.commit()
        await db.refresh(updated_request)

        logger.info(
            "Parking request cancelled | request_id=%s current_user_id=%s",
            updated_request.id,
            current_user_id,
        )

        return updated_request


parking_request_service = ParkingRequestService()