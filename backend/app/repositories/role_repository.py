from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.role import Role
from app.repositories.base import BaseRepository


class RoleRepository(BaseRepository[Role]):
    def __init__(self) -> None:
        super().__init__(Role)

    async def get_by_code(
        self,
        db: AsyncSession,
        code: str,
    ) -> Role | None:
        result = await db.execute(
            select(Role).where(Role.code == code)
        )
        return result.scalar_one_or_none()


role_repository = RoleRepository()