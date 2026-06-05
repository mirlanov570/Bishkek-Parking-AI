from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.repositories.role_repository import role_repository
from app.repositories.user_repository import user_repository
from app.services.exceptions import (
    AuthenticationError,
    ConflictError,
    NotFoundError,
    PermissionDeniedError,
    ValidationError,
)


class UserService:
    def ensure_user_available(self, user: User) -> None:
        if user.is_deleted or user.deleted_at is not None:
            raise PermissionDeniedError(
                message="User is deleted",
                code="USER_DELETED",
            )

        if not user.is_active:
            raise PermissionDeniedError(
                message="User is inactive",
                code="USER_INACTIVE",
            )

    async def get_by_id(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> User:
        user = await user_repository.get_by_id_with_role(db, user_id)

        if user is None:
            raise NotFoundError(
                message="User not found",
                code="USER_NOT_FOUND",
            )

        return user

    async def get_active_by_id(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> User:
        user = await self.get_by_id(db, user_id)
        self.ensure_user_available(user)

        return user

    async def get_by_login_or_email(
        self,
        db: AsyncSession,
        login_or_email: str,
    ) -> User:
        user = await user_repository.get_by_login_or_email(db, login_or_email)

        if user is None:
            raise NotFoundError(
                message="User not found",
                code="USER_NOT_FOUND",
            )

        return user

    async def authenticate(
        self,
        db: AsyncSession,
        login_or_email: str,
        password: str,
    ) -> User:
        user = await user_repository.get_by_login_or_email(db, login_or_email)

        if user is None:
            raise AuthenticationError(
                message="Invalid login or password",
                code="INVALID_LOGIN_OR_PASSWORD",
            )

        if not verify_password(password, user.password_hash):
            raise AuthenticationError(
                message="Invalid login or password",
                code="INVALID_LOGIN_OR_PASSWORD",
            )

        self.ensure_user_available(user)

        user.last_login_at = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(user)

        return user

    async def get_list(
        self,
        db: AsyncSession,
        limit: int = 20,
        offset: int = 0,
        only_active: bool = False,
    ) -> list[User]:
        if only_active:
            return await user_repository.get_active_list(
                db=db,
                limit=limit,
                offset=offset,
            )

        return await user_repository.get_list(
            db=db,
            limit=limit,
            offset=offset,
        )

    async def create_user(
        self,
        db: AsyncSession,
        data: dict[str, Any],
    ) -> User:
        password = data.pop("password", None)

        if not password:
            raise ValidationError(
                message="Password is required",
                code="PASSWORD_REQUIRED",
            )

        existing_user = await user_repository.get_by_login_email_or_phone(
            db=db,
            login=data["login"],
            email=data["email"],
            phone=data["phone"],
        )

        if existing_user is not None:
            raise ConflictError(
                message="User with this login, email or phone already exists",
                code="USER_ALREADY_EXISTS",
            )

        role = await role_repository.get_by_id(db, data["role_id"])

        if role is None:
            raise NotFoundError(
                message="Role not found",
                code="ROLE_NOT_FOUND",
            )

        data["password_hash"] = get_password_hash(password)

        user = await user_repository.create(db, data)
        await db.commit()
        await db.refresh(user)

        return user

    async def update_user(
        self,
        db: AsyncSession,
        user_id: int,
        data: dict[str, Any],
    ) -> User:
        user = await self.get_by_id(db, user_id)

        if "password" in data:
            password = data.pop("password")

            if password:
                data["password_hash"] = get_password_hash(password)

        if "role_id" in data:
            role = await role_repository.get_by_id(db, data["role_id"])

            if role is None:
                raise NotFoundError(
                    message="Role not found",
                    code="ROLE_NOT_FOUND",
                )

        updated_user = await user_repository.update(db, user, data)
        await db.commit()
        await db.refresh(updated_user)

        return updated_user

    async def soft_delete_user(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> User:
        user = await self.get_by_id(db, user_id)

        if user.is_deleted:
            return user

        deleted_user = await user_repository.soft_delete(db, user)
        await db.commit()
        await db.refresh(deleted_user)

        return deleted_user


user_service = UserService()