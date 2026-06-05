from __future__ import annotations

import asyncio
import os

from dotenv import load_dotenv
from sqlalchemy import or_, select

from app.core.config import BASE_DIR
from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal
from app.models.role import Role
from app.models.user import User


load_dotenv(BASE_DIR / ".env")


async def seed_admin() -> None:
    admin_full_name = os.getenv("SEED_ADMIN_FULL_NAME", "Администратор")
    admin_email = os.getenv("SEED_ADMIN_EMAIL", "administrator@example.com")
    admin_phone = os.getenv("SEED_ADMIN_PHONE", "+996555123456")
    admin_login = os.getenv("SEED_ADMIN_LOGIN", "administrator")
    admin_password = os.getenv("SEED_ADMIN_PASSWORD", "admin123")
    admin_language = os.getenv("SEED_ADMIN_LANGUAGE", "ru")

    async with AsyncSessionLocal() as db:
        role_result = await db.execute(
            select(Role).where(Role.code == "admin")
        )
        admin_role = role_result.scalar_one_or_none()

        if admin_role is None:
            raise RuntimeError(
                "Role with code='admin' not found. "
                "Restore dump first or insert roles before seeding admin."
            )

        user_result = await db.execute(
            select(User).where(
                or_(
                    User.login == admin_login,
                    User.email == admin_email,
                    User.phone == admin_phone,
                )
            )
        )
        existing_user = user_result.scalar_one_or_none()

        if existing_user is not None:
            print("Admin user already exists.")
            print(f"login: {existing_user.login}")
            print(f"email: {existing_user.email}")
            return

        admin_user = User(
            full_name=admin_full_name,
            email=admin_email,
            phone=admin_phone,
            login=admin_login,
            password_hash=get_password_hash(admin_password),
            role_id=admin_role.id,
            preferred_language=admin_language,
            is_active=True,
        )

        db.add(admin_user)
        await db.commit()

        print("Admin user created successfully.")
        print(f"login: {admin_login}")
        print(f"email: {admin_email}")
        print(f"password: {admin_password}")


if __name__ == "__main__":
    asyncio.run(seed_admin())