from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.parking import Parking


class Prediction(Base):
    __tablename__ = "predictions"

    __table_args__ = (
        CheckConstraint(
            "predicted_color IN ('green', 'yellow', 'red')",
            name="chk_predictions_color",
        ),
        CheckConstraint(
            "predicted_load_level IN ('low', 'medium', 'high')",
            name="chk_predictions_load_level",
        ),
        CheckConstraint(
            "predicted_load_percentage >= 0 AND predicted_load_percentage <= 100",
            name="chk_predictions_load_percentage",
        ),
        CheckConstraint(
            "predicted_occupied_places >= 0 AND predicted_free_places >= 0",
            name="chk_predictions_places",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    parking_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("parkings.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
    )

    prediction_datetime: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    predicted_occupied_places: Mapped[int] = mapped_column(Integer, nullable=False)
    predicted_free_places: Mapped[int] = mapped_column(Integer, nullable=False)
    predicted_load_percentage: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
    )
    predicted_load_level: Mapped[str] = mapped_column(String(20), nullable=False)
    predicted_color: Mapped[str] = mapped_column(String(20), nullable=False)

    model_name: Mapped[str] = mapped_column(
        String(100),
        server_default=text("'LinearRegression'"),
        nullable=False,
    )
    features: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        server_default=text("'{}'::jsonb"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    parking: Mapped["Parking"] = relationship(
        "Parking",
        back_populates="predictions",
    )


Index(
    "idx_predictions_parking_datetime",
    Prediction.parking_id,
    Prediction.prediction_datetime.desc(),
)
Index("idx_predictions_model_name", Prediction.model_name)