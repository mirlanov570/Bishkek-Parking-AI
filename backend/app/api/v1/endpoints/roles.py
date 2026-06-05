from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import admin_required
from app.db.session import get_db
from app.models.user import User
from app.schemas.role import RoleCreate, RoleList, RoleRead, RoleUpdate
from app.services.exceptions import ServiceError
from app.services.role_service import role_service
from app.api.v1.endpoints.utils import raise_service_error


router = APIRouter(
    prefix="/roles",
    tags=["Roles"],
)


@router.get("", response_model=RoleList)
async def get_roles(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> RoleList:
    try:
        items = await role_service.get_list(
            db=db,
            limit=limit,
            offset=offset,
        )
    except ServiceError as exc:
        raise_service_error(exc)

    return RoleList(
        items=items,
        total=len(items),
        limit=limit,
        offset=offset,
    )


@router.get("/{role_id}", response_model=RoleRead)
async def get_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> RoleRead:
    try:
        return await role_service.get_by_id(db, role_id)
    except ServiceError as exc:
        raise_service_error(exc)


@router.post("", response_model=RoleRead)
async def create_role(
    payload: RoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> RoleRead:
    try:
        return await role_service.create_role(
            db=db,
            data=payload.model_dump(),
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.patch("/{role_id}", response_model=RoleRead)
async def update_role(
    role_id: int,
    payload: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> RoleRead:
    try:
        return await role_service.update_role(
            db=db,
            role_id=role_id,
            data=payload.model_dump(exclude_unset=True),
        )
    except ServiceError as exc:
        raise_service_error(exc)