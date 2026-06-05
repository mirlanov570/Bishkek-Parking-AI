from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.role import Role
from app.repositories.role_repository import role_repository
from app.services.exceptions import ConflictError, NotFoundError


class RoleService:
    async def get_by_id(
        self,
        db: AsyncSession,
        role_id: int,
    ) -> Role:
        role = await role_repository.get_by_id(db, role_id)

        if role is None:
            raise NotFoundError(
                message="Role not found",
                code="ROLE_NOT_FOUND",
            )

        return role

    async def get_by_code(
        self,
        db: AsyncSession,
        code: str,
    ) -> Role:
        role = await role_repository.get_by_code(db, code)

        if role is None:
            raise NotFoundError(
                message="Role not found",
                code="ROLE_NOT_FOUND",
            )

        return role

    async def get_list(
        self,
        db: AsyncSession,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Role]:
        return await role_repository.get_list(
            db=db,
            limit=limit,
            offset=offset,
        )

    async def create_role(
        self,
        db: AsyncSession,
        data: dict[str, Any],
    ) -> Role:
        existing_role = await role_repository.get_by_code(db, data["code"])

        if existing_role is not None:
            raise ConflictError(
                message="Role with this code already exists",
                code="ROLE_CODE_ALREADY_EXISTS",
            )

        role = await role_repository.create(db, data)
        await db.commit()
        await db.refresh(role)

        return role

    async def update_role(
        self,
        db: AsyncSession,
        role_id: int,
        data: dict[str, Any],
    ) -> Role:
        role = await self.get_by_id(db, role_id)

        if "code" in data and data["code"] != role.code:
            existing_role = await role_repository.get_by_code(db, data["code"])

            if existing_role is not None:
                raise ConflictError(
                    message="Role with this code already exists",
                    code="ROLE_CODE_ALREADY_EXISTS",
                )

        updated_role = await role_repository.update(db, role, data)
        await db.commit()
        await db.refresh(updated_role)

        return updated_role


role_service = RoleService()