from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.common import SchemaBase


class InfrastructureHistoryGenerateRequest(SchemaBase):
    reset_generated: bool = Field(
        default=True,
        description="Если true, удаляет ранее сгенерированную историю source='generated'.",
    )
    days: int = Field(
        default=120,
        ge=7,
        le=365,
        description="Количество дней истории.",
    )
    history_points_per_day: int = Field(
        default=8,
        ge=1,
        le=24,
        description="Количество точек истории за один день.",
    )
    generate_requests: bool = Field(
        default=True,
        description="Создавать ли синтетические заявки водителей рядом с пиками загрузки.",
    )
    max_requests_per_point: int = Field(
        default=5,
        ge=0,
        le=20,
        description="Максимум заявок на одну точку истории.",
    )


class InfrastructureHistoryGenerateRead(SchemaBase):
    reset_performed: bool
    days: int
    history_points_per_day: int
    generate_requests: bool

    parkings_processed: int
    nearby_objects_used: int
    history_records_created: int
    parking_requests_created: int

    started_at: datetime
    finished_at: datetime

    message: str