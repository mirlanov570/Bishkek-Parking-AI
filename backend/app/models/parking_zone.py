from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Computed,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.parking import Parking


class ParkingZone(Base):
    __tablename__ = "parking_zones"

    __table_args__ = (
        UniqueConstraint("id", "parking_id", name="uq_parking_zones_id_parking"),
        UniqueConstraint("parking_id", "name", name="uq_parking_zones_parking_name"),
        CheckConstraint(
            "occupied_places >= 0 AND occupied_places <= total_places",
            name="chk_zones_occupied_places",
        ),
        CheckConstraint(
            "((is_deleted = false AND deleted_at IS NULL) OR "
            "(is_deleted = true AND deleted_at IS NOT NULL))",
            name="chk_zones_soft_delete",
        ),
        CheckConstraint(
            "total_places > 0",
            name="chk_zones_total_places",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    parking_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("parkings.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    total_places: Mapped[int] = mapped_column(Integer, nullable=False)
    occupied_places: Mapped[int] = mapped_column(
        Integer,
        server_default=text("0"),
        nullable=False,
    )

    free_places: Mapped[int | None] = mapped_column(
        Integer,
        Computed("GREATEST((total_places - occupied_places), 0)", persisted=True),
        nullable=True,
    )
    load_percentage: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2),
        Computed(
            """
            CASE
                WHEN (total_places > 0)
                THEN round((((occupied_places)::numeric / (total_places)::numeric) * (100)::numeric), 2)
                ELSE (0)::numeric
            END
            """,
            persisted=True,
        ),
        nullable=True,
    )
    load_level: Mapped[str | None] = mapped_column(
        String(20),
        Computed(
            """
            CASE
                WHEN (total_places <= 0) THEN 'low'::text
                WHEN ((((occupied_places)::numeric / (total_places)::numeric) * (100)::numeric) <= (50)::numeric) THEN 'low'::text
                WHEN ((((occupied_places)::numeric / (total_places)::numeric) * (100)::numeric) <= (80)::numeric) THEN 'medium'::text
                ELSE 'high'::text
            END
            """,
            persisted=True,
        ),
        nullable=True,
    )
    load_color: Mapped[str | None] = mapped_column(
        String(20),
        Computed(
            """
            CASE
                WHEN (total_places <= 0) THEN 'green'::text
                WHEN ((((occupied_places)::numeric / (total_places)::numeric) * (100)::numeric) <= (50)::numeric) THEN 'green'::text
                WHEN ((((occupied_places)::numeric / (total_places)::numeric) * (100)::numeric) <= (80)::numeric) THEN 'yellow'::text
                ELSE 'red'::text
            END
            """,
            persisted=True,
        ),
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        server_default=text("true"),
        nullable=False,
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

    parking: Mapped["Parking"] = relationship(
        "Parking",
        back_populates="zones",
    )


Index("idx_parking_zones_parking_id", ParkingZone.parking_id)
Index("idx_parking_zones_is_active", ParkingZone.is_active)
Index("idx_parking_zones_is_deleted", ParkingZone.is_deleted)