from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import admin_required
from app.db.session import get_db
from app.models.user import User
from app.schemas.parking_zone import (
    ParkingZoneCreateForParking,
    ParkingZoneList,
    ParkingZoneRead,
    ParkingZoneUpdate,
)
from app.services.exceptions import ServiceError, ValidationError
from app.services.parking_zone_service import parking_zone_service
from app.api.v1.endpoints.utils import raise_service_error


router = APIRouter(
    tags=["Parking zones"],
)


@router.get("/parkings/{parking_id}/zones", response_model=ParkingZoneList)
async def get_parking_zones(
    parking_id: int,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> ParkingZoneList:
    try:
        items = await parking_zone_service.get_by_parking_id(
            db=db,
            parking_id=parking_id,
            limit=limit,
            offset=offset,
        )
    except ServiceError as exc:
        raise_service_error(exc)

    return ParkingZoneList(
        items=items,
        total=len(items),
        limit=limit,
        offset=offset,
    )


@router.post("/parkings/{parking_id}/zones", response_model=ParkingZoneRead)
async def create_parking_zone(
    parking_id: int,
    payload: ParkingZoneCreateForParking,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> ParkingZoneRead:
    try:
        return await parking_zone_service.create_zone(
            db=db,
            parking_id=parking_id,
            data=payload.model_dump(),
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.get("/zones/{zone_id}", response_model=ParkingZoneRead)
async def get_parking_zone(
    zone_id: int,
    db: AsyncSession = Depends(get_db),
) -> ParkingZoneRead:
    try:
        return await parking_zone_service.get_active_by_id(
            db=db,
            zone_id=zone_id,
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.patch("/zones/{zone_id}", response_model=ParkingZoneRead)
async def update_parking_zone(
    zone_id: int,
    payload: ParkingZoneUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> ParkingZoneRead:
    try:
        return await parking_zone_service.update_zone(
            db=db,
            zone_id=zone_id,
            data=payload.model_dump(exclude_unset=True),
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.patch("/zones/{zone_id}/status", response_model=ParkingZoneRead)
async def update_parking_zone_status(
    zone_id: int,
    payload: ParkingZoneUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> ParkingZoneRead:
    try:
        if payload.occupied_places is None:
            raise ValidationError(
                message="occupied_places is required",
                code="OCCUPIED_PLACES_REQUIRED",
            )

        return await parking_zone_service.update_status(
            db=db,
            zone_id=zone_id,
            occupied_places=payload.occupied_places,
            total_places=payload.total_places,
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.delete("/zones/{zone_id}", response_model=ParkingZoneRead)
async def delete_parking_zone(
    zone_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> ParkingZoneRead:
    try:
        return await parking_zone_service.soft_delete_zone(
            db=db,
            zone_id=zone_id,
        )
    except ServiceError as exc:
        raise_service_error(exc)