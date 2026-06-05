from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self) -> None:
        super().__init__(User)

    async def get_by_id_with_role(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> User | None:
        result = await db.execute(
            select(User)
            .options(selectinload(User.role))
            .where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_login_or_email(
        self,
        db: AsyncSession,
        login_or_email: str,
    ) -> User | None:
        result = await db.execute(
            select(User)
            .options(selectinload(User.role))
            .where(
                or_(
                    User.login == login_or_email,
                    User.email == login_or_email,
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_by_login_email_or_phone(
        self,
        db: AsyncSession,
        login: str,
        email: str,
        phone: str,
    ) -> User | None:
        result = await db.execute(
            select(User).where(
                or_(
                    User.login == login,
                    User.email == email,
                    User.phone == phone,
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_active_list(
        self,
        db: AsyncSession,
        limit: int = 20,
        offset: int = 0,
    ) -> list[User]:
        result = await db.execute(
            select(User)
            .where(
                User.is_active.is_(True),
                User.is_deleted.is_(False),
            )
            .order_by(User.id)
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())


user_repository = UserRepository()