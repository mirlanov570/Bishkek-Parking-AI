from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.parking import Parking
    from app.models.parking_request import ParkingRequest
    from app.models.user import User


class Recommendation(Base):
    __tablename__ = "recommendations"

    __table_args__ = (
        CheckConstraint(
            "current_load_percentage >= 0 AND current_load_percentage <= 100",
            name="chk_recommendations_current_load",
        ),
        CheckConstraint(
            "distance_km IS NULL OR distance_km >= 0",
            name="chk_recommendations_distance",
        ),
        CheckConstraint(
            "expected_free_places IS NULL OR expected_free_places >= 0",
            name="chk_recommendations_expected_free",
        ),
        CheckConstraint(
            "predicted_load_percentage IS NULL OR "
            "(predicted_load_percentage >= 0 AND predicted_load_percentage <= 100)",
            name="chk_recommendations_predicted_load",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", onupdate="CASCADE", ondelete="RESTRICT"),
        nullable=False,
    )
    parking_request_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("parking_requests.id", onupdate="CASCADE", ondelete="SET NULL"),
        nullable=True,
    )
    requested_parking_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("parkings.id", onupdate="CASCADE", ondelete="SET NULL"),
        nullable=True,
    )
    recommended_parking_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("parkings.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
    )

    reason: Mapped[str] = mapped_column(Text, nullable=False)
    distance_km: Mapped[Decimal | None] = mapped_column(Numeric(8, 3), nullable=True)
    current_load_percentage: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
    )
    predicted_load_percentage: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2),
        nullable=True,
    )
    expected_free_places: Mapped[int | None] = mapped_column(Integer, nullable=True)
    score: Mapped[Decimal | None] = mapped_column(Numeric(12, 4), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="recommendations",
    )

    parking_request: Mapped["ParkingRequest | None"] = relationship(
        "ParkingRequest",
        back_populates="recommendations",
    )

    requested_parking: Mapped["Parking | None"] = relationship(
        "Parking",
        foreign_keys=[requested_parking_id],
        back_populates="recommendations_requested",
    )

    recommended_parking: Mapped["Parking"] = relationship(
        "Parking",
        foreign_keys=[recommended_parking_id],
        back_populates="recommendations_recommended",
    )


Index("idx_recommendations_user_id", Recommendation.user_id)
Index("idx_recommendations_recommended_parking_id", Recommendation.recommended_parking_id)
Index("idx_recommendations_created_at", Recommendation.created_at.desc())