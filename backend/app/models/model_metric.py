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


class ModelMetric(Base):
    __tablename__ = "model_metrics"

    __table_args__ = (
        CheckConstraint(
            "(train_rows_count IS NULL OR train_rows_count >= 0) AND "
            "(test_rows_count IS NULL OR test_rows_count >= 0)",
            name="chk_model_metrics_rows",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    model_name: Mapped[str] = mapped_column(String(100), nullable=False)

    parking_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("parkings.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=True,
    )

    mae: Mapped[Decimal | None] = mapped_column(Numeric(12, 4), nullable=True)
    mse: Mapped[Decimal | None] = mapped_column(Numeric(12, 4), nullable=True)
    r2_score: Mapped[Decimal | None] = mapped_column(Numeric(12, 4), nullable=True)

    train_rows_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    test_rows_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    extra_info: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        server_default=text("'{}'::jsonb"),
        nullable=False,
    )

    trained_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    parking: Mapped["Parking | None"] = relationship(
        "Parking",
        back_populates="model_metrics",
    )


Index("idx_model_metrics_model_name", ModelMetric.model_name)
Index("idx_model_metrics_parking_id", ModelMetric.parking_id)
Index("idx_model_metrics_trained_at", ModelMetric.trained_at.desc())