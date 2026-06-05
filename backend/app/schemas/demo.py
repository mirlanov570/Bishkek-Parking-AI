from __future__ import annotations

from pydantic import Field

from app.schemas.common import SchemaBase


class DemoSeedRequest(SchemaBase):
    reset: bool = Field(
        default=False,
        description="Если true, сначала удаляет ранее созданные demo данные.",
    )
    days: int = Field(
        default=90,
        ge=7,
        le=365,
        description="Количество дней истории загруженности.",
    )
    history_points_per_day: int = Field(
        default=6,
        ge=1,
        le=24,
        description="Количество точек истории в день.",
    )
    drivers_count: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Количество demo driver пользователей.",
    )
    requests_count: int = Field(
        default=80,
        ge=0,
        le=1000,
        description="Количество demo parking requests.",
    )
    predictions_count: int = Field(
        default=60,
        ge=0,
        le=1000,
        description="Количество demo predictions.",
    )


class DemoSeedRead(SchemaBase):
    reset_performed: bool
    days: int
    history_points_per_day: int
    drivers_count: int
    requests_count: int
    predictions_count: int

    created_parkings: int
    updated_parkings: int
    created_zones: int
    updated_zones: int
    created_drivers: int

    history_records_created: int
    parking_requests_created: int
    recommendations_created: int
    notifications_created: int
    predictions_created: int
    model_metrics_created: int

    message: str