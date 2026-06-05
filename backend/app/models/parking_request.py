from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Numeric,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ENUM as PGEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ParkingRequestStatus

if TYPE_CHECKING:
    from app.models.parking import Parking
    from app.models.parking_zone import ParkingZone
    from app.models.recommendation import Recommendation
    from app.models.user import User


class ParkingRequest(Base):
    __tablename__ = "parking_requests"

    __table_args__ = (
        ForeignKeyConstraint(
            ["selected_zone_id", "parking_id"],
            ["parking_zones.id", "parking_zones.parking_id"],
            name="fk_request_selected_zone_parking",
            onupdate="CASCADE",
            ondelete="SET NULL",
        ),
        CheckConstraint(
            "user_latitude IS NULL OR (user_latitude >= -90 AND user_latitude <= 90)",
            name="chk_request_latitude",
        ),
        CheckConstraint(
            "user_longitude IS NULL OR (user_longitude >= -180 AND user_longitude <= 180)",
            name="chk_request_longitude",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", onupdate="CASCADE", ondelete="RESTRICT"),
        nullable=False,
    )
    parking_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("parkings.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
    )
    selected_zone_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    user_latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    user_longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)

    status: Mapped[ParkingRequestStatus] = mapped_column(
        PGEnum(
            ParkingRequestStatus,
            name="parking_request_status",
            schema="public",
            create_type=False,
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        server_default=text("'created'::public.parking_request_status"),
        nullable=False,
    )
    recommendation_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
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

    user: Mapped["User"] = relationship(
        "User",
        back_populates="parking_requests",
    )

    parking: Mapped["Parking"] = relationship(
        "Parking",
        back_populates="requests",
    )

    selected_zone: Mapped["ParkingZone | None"] = relationship(
        "ParkingZone",
        primaryjoin=(
            "and_(ParkingRequest.selected_zone_id == ParkingZone.id, "
            "ParkingRequest.parking_id == ParkingZone.parking_id)"
        ),
        foreign_keys="[ParkingRequest.selected_zone_id, ParkingRequest.parking_id]",
        viewonly=True,
    )

    recommendations: Mapped[list["Recommendation"]] = relationship(
        "Recommendation",
        back_populates="parking_request",
        passive_deletes=True,
    )


Index("idx_requests_user_id", ParkingRequest.user_id)
Index("idx_requests_parking_id", ParkingRequest.parking_id)
Index("idx_requests_status", ParkingRequest.status)
Index("idx_requests_requested_at", ParkingRequest.requested_at.desc())