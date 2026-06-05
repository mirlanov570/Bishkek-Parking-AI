from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.notification import Notification
    from app.models.parking_request import ParkingRequest
    from app.models.recommendation import Recommendation
    from app.models.role import Role


class User(Base):
    __tablename__ = "users"

    __table_args__ = (
        UniqueConstraint("email", name="users_email_key"),
        UniqueConstraint("login", name="users_login_key"),
        UniqueConstraint("phone", name="users_phone_key"),
        CheckConstraint(
            "preferred_language IN ('ru', 'ky', 'en')",
            name="chk_users_language",
        ),
        CheckConstraint(
            "((is_deleted = false AND deleted_at IS NULL) OR "
            "(is_deleted = true AND deleted_at IS NOT NULL))",
            name="chk_users_soft_delete",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(CITEXT(), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    login: Mapped[str] = mapped_column(CITEXT(), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    role_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("roles.id", onupdate="CASCADE", ondelete="RESTRICT"),
        nullable=False,
    )

    preferred_language: Mapped[str] = mapped_column(
        String(5),
        server_default=text("'ru'"),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        server_default=text("true"),
        nullable=False,
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        server_default=text("false"),
        nullable=False,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    role: Mapped["Role"] = relationship(
        "Role",
        back_populates="users",
    )

    parking_requests: Mapped[list["ParkingRequest"]] = relationship(
        "ParkingRequest",
        back_populates="user",
        passive_deletes=True,
    )

    recommendations: Mapped[list["Recommendation"]] = relationship(
        "Recommendation",
        back_populates="user",
        passive_deletes=True,
    )

    notifications: Mapped[list["Notification"]] = relationship(
        "Notification",
        back_populates="user",
        passive_deletes=True,
    )


Index("idx_users_role_id", User.role_id)
Index("idx_users_is_active", User.is_active)
Index("idx_users_is_deleted", User.is_deleted)