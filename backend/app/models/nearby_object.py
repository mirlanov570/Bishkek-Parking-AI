from __future__ import annotations

from datetime import datetime, time
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Time,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.parking import Parking


class NearbyObject(Base):
    __tablename__ = "nearby_objects"

    __table_args__ = (
        CheckConstraint(
            "distance_m >= 0",
            name="chk_nearby_objects_distance",
        ),
        CheckConstraint(
            "influence_weight >= 0",
            name="chk_nearby_objects_weight",
        ),
        CheckConstraint(
            "object_type IN ("
            "'university', 'school', 'mall', 'cafe', 'cinema', "
            "'office', 'market', 'residential', 'hospital', 'park', 'other'"
            ")",
            name="chk_nearby_objects_type",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    parking_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("parkings.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    object_type: Mapped[str] = mapped_column(String(50), nullable=False)

    distance_m: Mapped[int] = mapped_column(
        Integer,
        server_default=text("300"),
        nullable=False,
    )

    open_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    close_time: Mapped[time | None] = mapped_column(Time, nullable=True)

    active_days: Mapped[str] = mapped_column(
        String(30),
        server_default=text("'1,2,3,4,5,6,7'"),
        nullable=False,
    )

    influence_weight: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        server_default=text("1.00"),
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        server_default=text("true"),
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

    parking: Mapped["Parking"] = relationship(
        "Parking",
        back_populates="nearby_objects",
    )


Index("idx_nearby_objects_parking_id", NearbyObject.parking_id)
Index("idx_nearby_objects_type", NearbyObject.object_type)
Index("idx_nearby_objects_is_active", NearbyObject.is_active)