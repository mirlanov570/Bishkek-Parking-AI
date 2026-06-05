from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.utils import raise_service_error
from app.auth.dependencies import admin_required
from app.db.session import get_db
from app.models.user import User
from app.schemas.nearby_object import (
    NearbyObjectCreate,
    NearbyObjectCreateForParking,
    NearbyObjectList,
    NearbyObjectRead,
    NearbyObjectUpdate,
)
from app.services.exceptions import ServiceError
from app.services.nearby_object_service import nearby_object_service


router = APIRouter(
    tags=["Nearby objects"],
)


@router.get("/parkings/{parking_id}/nearby-objects", response_model=NearbyObjectList)
async def get_parking_nearby_objects(
    parking_id: int,
    limit: int = Query(default=100, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    only_active: bool = Query(default=True),
    db: AsyncSession = Depends(get_db),
) -> NearbyObjectList:
    try:
        items = await nearby_object_service.get_by_parking_id(
            db=db,
            parking_id=parking_id,
            limit=limit,
            offset=offset,
            only_active=only_active,
        )
    except ServiceError as exc:
        raise_service_error(exc)

    return NearbyObjectList(
        items=items,
        total=len(items),
        limit=limit,
        offset=offset,
    )


@router.post("/parkings/{parking_id}/nearby-objects", response_model=NearbyObjectRead)
async def create_parking_nearby_object(
    parking_id: int,
    payload: NearbyObjectCreateForParking,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> NearbyObjectRead:
    try:
        return await nearby_object_service.create_for_parking(
            db=db,
            parking_id=parking_id,
            data=payload.model_dump(),
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.get("/nearby-objects", response_model=NearbyObjectList)
async def get_nearby_objects_by_type(
    object_type: str = Query(..., min_length=2, max_length=50),
    limit: int = Query(default=100, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    only_active: bool = Query(default=True),
    db: AsyncSession = Depends(get_db),
) -> NearbyObjectList:
    try:
        items = await nearby_object_service.get_by_type(
            db=db,
            object_type=object_type,
            limit=limit,
            offset=offset,
            only_active=only_active,
        )
    except ServiceError as exc:
        raise_service_error(exc)

    return NearbyObjectList(
        items=items,
        total=len(items),
        limit=limit,
        offset=offset,
    )


@router.get("/nearby-objects/{object_id}", response_model=NearbyObjectRead)
async def get_nearby_object(
    object_id: int,
    db: AsyncSession = Depends(get_db),
) -> NearbyObjectRead:
    try:
        return await nearby_object_service.get_active_by_id(
            db=db,
            object_id=object_id,
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.post("/nearby-objects", response_model=NearbyObjectRead)
async def create_nearby_object(
    payload: NearbyObjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> NearbyObjectRead:
    try:
        return await nearby_object_service.create_object(
            db=db,
            data=payload.model_dump(),
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.patch("/nearby-objects/{object_id}", response_model=NearbyObjectRead)
async def update_nearby_object(
    object_id: int,
    payload: NearbyObjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> NearbyObjectRead:
    try:
        return await nearby_object_service.update_object(
            db=db,
            object_id=object_id,
            data=payload.model_dump(exclude_unset=True),
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.delete("/nearby-objects/{object_id}", response_model=NearbyObjectRead)
async def delete_nearby_object(
    object_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> NearbyObjectRead:
    try:
        return await nearby_object_service.delete_object(
            db=db,
            object_id=object_id,
        )
    except ServiceError as exc:
        raise_service_error(exc)