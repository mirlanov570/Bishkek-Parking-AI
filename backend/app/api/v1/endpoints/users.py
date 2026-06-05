from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import admin_required
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserList, UserRead, UserUpdate
from app.services.exceptions import ServiceError
from app.services.user_service import user_service
from app.api.v1.endpoints.utils import raise_service_error


router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


@router.get("", response_model=UserList)
async def get_users(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    only_active: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> UserList:
    try:
        items = await user_service.get_list(
            db=db,
            limit=limit,
            offset=offset,
            only_active=only_active,
        )
    except ServiceError as exc:
        raise_service_error(exc)

    return UserList(
        items=items,
        total=len(items),
        limit=limit,
        offset=offset,
    )


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> UserRead:
    try:
        return await user_service.get_by_id(db, user_id)
    except ServiceError as exc:
        raise_service_error(exc)


@router.post("", response_model=UserRead)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    # current_user: User = Depends(admin_required),
) -> UserRead:
    try:
        return await user_service.create_user(
            db=db,
            data=payload.model_dump(),
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> UserRead:
    try:
        return await user_service.update_user(
            db=db,
            user_id=user_id,
            data=payload.model_dump(exclude_unset=True),
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.delete("/{user_id}", response_model=UserRead)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> UserRead:
    try:
        return await user_service.soft_delete_user(
            db=db,
            user_id=user_id,
        )
    except ServiceError as exc:
        raise_service_error(exc)