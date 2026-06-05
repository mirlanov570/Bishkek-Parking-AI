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
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.model_metric import ModelMetric
    from app.models.notification import Notification
    from app.models.parking_request import ParkingRequest
    from app.models.parking_status_history import ParkingStatusHistory
    from app.models.parking_zone import ParkingZone
    from app.models.nearby_object import NearbyObject
    from app.models.prediction import Prediction
    from app.models.recommendation import Recommendation


class Parking(Base):
    __tablename__ = "parkings"

    __table_args__ = (
        UniqueConstraint("name", name="parkings_name_key"),
        CheckConstraint(
            "latitude >= -90 AND latitude <= 90",
            name="chk_parkings_latitude",
        ),
        CheckConstraint(
            "longitude >= -180 AND longitude <= 180",
            name="chk_parkings_longitude",
        ),
        CheckConstraint(
            "occupied_places >= 0 AND occupied_places <= total_places",
            name="chk_parkings_occupied_places",
        ),
        CheckConstraint(
            "((is_deleted = false AND deleted_at IS NULL) OR "
            "(is_deleted = true AND deleted_at IS NOT NULL))",
            name="chk_parkings_soft_delete",
        ),
        CheckConstraint(
            "total_places > 0",
            name="chk_parkings_total_places",
        ),
        CheckConstraint(
            "zone_type IN ("
            "'university', 'school', 'mall', 'office', 'residential', "
            "'market', 'entertainment', 'medical', 'park', 'mixed'"
            ")",
            name="chk_parkings_zone_type",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)

    zone_type: Mapped[str] = mapped_column(String(50), server_default=text("'mixed'"), nullable=False)

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

    working_hours: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

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

    zones: Mapped[list["ParkingZone"]] = relationship(
        "ParkingZone",
        back_populates="parking",
        passive_deletes=True,
    )

    nearby_objects: Mapped[list["NearbyObject"]] = relationship(
        "NearbyObject",
        back_populates="parking",
        passive_deletes=True,
    )

    status_history: Mapped[list["ParkingStatusHistory"]] = relationship(
        "ParkingStatusHistory",
        back_populates="parking",
        passive_deletes=True,
    )

    requests: Mapped[list["ParkingRequest"]] = relationship(
        "ParkingRequest",
        back_populates="parking",
        passive_deletes=True,
    )

    predictions: Mapped[list["Prediction"]] = relationship(
        "Prediction",
        back_populates="parking",
        passive_deletes=True,
    )

    notifications: Mapped[list["Notification"]] = relationship(
        "Notification",
        back_populates="parking",
        passive_deletes=True,
    )

    model_metrics: Mapped[list["ModelMetric"]] = relationship(
        "ModelMetric",
        back_populates="parking",
        passive_deletes=True,
    )

    recommendations_requested: Mapped[list["Recommendation"]] = relationship(
        "Recommendation",
        foreign_keys="Recommendation.requested_parking_id",
        back_populates="requested_parking",
        passive_deletes=True,
    )

    recommendations_recommended: Mapped[list["Recommendation"]] = relationship(
        "Recommendation",
        foreign_keys="Recommendation.recommended_parking_id",
        back_populates="recommended_parking",
        passive_deletes=True,
    )


Index("idx_parkings_is_active", Parking.is_active)
Index("idx_parkings_is_deleted", Parking.is_deleted)
Index("idx_parkings_load_level", Parking.load_level)
Index("idx_parkings_load_percentage", Parking.load_percentage)
Index("idx_parkings_location", Parking.latitude, Parking.longitude)
Index("idx_parkings_zone_type", Parking.zone_type)