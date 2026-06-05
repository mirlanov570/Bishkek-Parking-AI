from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Computed,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    Numeric,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ENUM as PGEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import HistorySource

if TYPE_CHECKING:
    from app.models.parking import Parking
    from app.models.parking_zone import ParkingZone


class ParkingStatusHistory(Base):
    __tablename__ = "parking_status_history"

    __table_args__ = (
        ForeignKeyConstraint(
            ["zone_id", "parking_id"],
            ["parking_zones.id", "parking_zones.parking_id"],
            name="fk_history_zone_parking",
            onupdate="CASCADE",
            ondelete="SET NULL",
        ),
        CheckConstraint(
            "occupied_places >= 0 AND occupied_places <= total_places",
            name="chk_history_occupied_places",
        ),
        CheckConstraint(
            "total_places > 0",
            name="chk_history_total_places",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    parking_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("parkings.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
    )
    zone_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    total_places: Mapped[int] = mapped_column(Integer, nullable=False)
    occupied_places: Mapped[int] = mapped_column(Integer, nullable=False)

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

    source: Mapped[HistorySource] = mapped_column(
        PGEnum(
            HistorySource,
            name="history_source",
            schema="public",
            create_type=False,
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        server_default=text("'admin_manual'::public.history_source"),
        nullable=False,
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    parking: Mapped["Parking"] = relationship(
        "Parking",
        back_populates="status_history",
    )

    zone: Mapped["ParkingZone | None"] = relationship(
        "ParkingZone",
        primaryjoin=(
            "and_(ParkingStatusHistory.zone_id == ParkingZone.id, "
            "ParkingStatusHistory.parking_id == ParkingZone.parking_id)"
        ),
        foreign_keys="[ParkingStatusHistory.zone_id, ParkingStatusHistory.parking_id]",
        viewonly=True,
    )


Index(
    "idx_history_parking_recorded_at",
    ParkingStatusHistory.parking_id,
    ParkingStatusHistory.recorded_at.desc(),
)
Index(
    "idx_history_zone_recorded_at",
    ParkingStatusHistory.zone_id,
    ParkingStatusHistory.recorded_at.desc(),
)
Index("idx_history_source", ParkingStatusHistory.source)