from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import Field, field_validator

from app.schemas.common import (
    ListResponse,
    LoadPercentage,
    NonNegativeInt,
    SchemaBase,
)


class PredictionBase(SchemaBase):
    parking_id: int = Field(gt=0)
    prediction_datetime: datetime
    predicted_occupied_places: NonNegativeInt
    predicted_free_places: NonNegativeInt
    predicted_load_percentage: LoadPercentage
    predicted_load_level: str = Field(max_length=20)
    predicted_color: str = Field(max_length=20)
    model_name: str = Field(default="LinearRegression", max_length=100)
    features: dict[str, Any] = Field(default_factory=dict)

    @field_validator("predicted_load_level")
    @classmethod
    def validate_load_level(cls, value: str) -> str:
        allowed = {"low", "medium", "high"}
        if value not in allowed:
            raise ValueError("predicted_load_level must be one of: low, medium, high")
        return value

    @field_validator("predicted_color")
    @classmethod
    def validate_color(cls, value: str) -> str:
        allowed = {"green", "yellow", "red"}
        if value not in allowed:
            raise ValueError("predicted_color must be one of: green, yellow, red")
        return value


class PredictionCreate(PredictionBase):
    pass


class PredictionUpdate(SchemaBase):
    prediction_datetime: datetime | None = None
    predicted_occupied_places: NonNegativeInt | None = None
    predicted_free_places: NonNegativeInt | None = None
    predicted_load_percentage: LoadPercentage | None = None
    predicted_load_level: str | None = Field(default=None, max_length=20)
    predicted_color: str | None = Field(default=None, max_length=20)
    model_name: str | None = Field(default=None, max_length=100)
    features: dict[str, Any] | None = None

    @field_validator("predicted_load_level")
    @classmethod
    def validate_load_level(cls, value: str | None) -> str | None:
        if value is None:
            return value

        allowed = {"low", "medium", "high"}
        if value not in allowed:
            raise ValueError("predicted_load_level must be one of: low, medium, high")
        return value

    @field_validator("predicted_color")
    @classmethod
    def validate_color(cls, value: str | None) -> str | None:
        if value is None:
            return value

        allowed = {"green", "yellow", "red"}
        if value not in allowed:
            raise ValueError("predicted_color must be one of: green, yellow, red")
        return value


class PredictionTrainRequest(SchemaBase):
    parking_id: int | None = Field(
        default=None,
        gt=0,
        description="Если передать parking_id, модель обучается только для одной парковки.",
    )
    test_size: float = Field(
        default=0.2,
        gt=0,
        lt=0.5,
        description="Доля тестовой выборки.",
    )
    min_rows: int = Field(
        default=30,
        ge=10,
        le=100000,
        description="Минимальное количество строк истории для обучения.",
    )


class PredictionTrainRead(SchemaBase):
    model_name: str
    parking_id: int | None
    train_rows_count: int
    test_rows_count: int
    mae: Decimal
    mse: Decimal
    r2_score: Decimal
    metric_id: int
    model_file: str
    features: list[str]
    message: str


class PredictionPredictRequest(SchemaBase):
    parking_id: int = Field(gt=0)
    prediction_datetime: datetime


class PredictionRead(SchemaBase):
    id: int
    parking_id: int
    prediction_datetime: datetime
    predicted_occupied_places: int
    predicted_free_places: int
    predicted_load_percentage: Decimal
    predicted_load_level: str
    predicted_color: str
    model_name: str
    features: dict[str, Any]
    created_at: datetime


class PredictionList(ListResponse[PredictionRead]):
    pass