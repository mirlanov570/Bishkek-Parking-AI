from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import Field

from app.schemas.common import ListResponse, NonNegativeInt, SchemaBase


class ModelMetricCreate(SchemaBase):
    model_name: str = Field(min_length=1, max_length=100)
    parking_id: int | None = Field(default=None, gt=0)
    mae: Decimal | None = Field(default=None, ge=0)
    mse: Decimal | None = Field(default=None, ge=0)
    r2_score: Decimal | None = None
    train_rows_count: NonNegativeInt | None = None
    test_rows_count: NonNegativeInt | None = None
    extra_info: dict[str, Any] = Field(default_factory=dict)


class ModelMetricUpdate(SchemaBase):
    model_name: str | None = Field(default=None, min_length=1, max_length=100)
    parking_id: int | None = Field(default=None, gt=0)
    mae: Decimal | None = Field(default=None, ge=0)
    mse: Decimal | None = Field(default=None, ge=0)
    r2_score: Decimal | None = None
    train_rows_count: NonNegativeInt | None = None
    test_rows_count: NonNegativeInt | None = None
    extra_info: dict[str, Any] | None = None


class ModelMetricRead(SchemaBase):
    id: int
    model_name: str
    parking_id: int | None
    mae: Decimal | None
    mse: Decimal | None
    r2_score: Decimal | None
    train_rows_count: int | None
    test_rows_count: int | None
    extra_info: dict[str, Any]
    trained_at: datetime


class ModelMetricList(ListResponse[ModelMetricRead]):
    pass