from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import Field

from app.schemas.common import (
    Latitude,
    ListResponse,
    LoadPercentage,
    Longitude,
    NonNegativeInt,
    SchemaBase,
)


class RecommendationCreate(SchemaBase):
    user_id: int = Field(gt=0)
    parking_request_id: int | None = Field(default=None, gt=0)
    requested_parking_id: int | None = Field(default=None, gt=0)
    recommended_parking_id: int = Field(gt=0)
    reason: str = Field(min_length=1)
    distance_km: Decimal | None = Field(default=None, ge=0)
    current_load_percentage: LoadPercentage
    predicted_load_percentage: LoadPercentage | None = None
    expected_free_places: NonNegativeInt | None = None
    score: Decimal | None = None


class RecommendationRequest(SchemaBase):
    requested_parking_id: int | None = Field(default=None, gt=0)
    user_latitude: Latitude | None = None
    user_longitude: Longitude | None = None
    use_prediction: bool = True
    popularity_days: int = Field(default=30, ge=1, le=365)


class RecommendationUpdate(SchemaBase):
    reason: str | None = Field(default=None, min_length=1)
    distance_km: Decimal | None = Field(default=None, ge=0)
    current_load_percentage: LoadPercentage | None = None
    predicted_load_percentage: LoadPercentage | None = None
    expected_free_places: NonNegativeInt | None = None
    score: Decimal | None = None


class RecommendationRead(SchemaBase):
    id: int
    user_id: int
    parking_request_id: int | None
    requested_parking_id: int | None
    recommended_parking_id: int
    reason: str
    distance_km: Decimal | None
    current_load_percentage: Decimal
    predicted_load_percentage: Decimal | None
    expected_free_places: int | None
    score: Decimal | None
    created_at: datetime


class RecommendationList(ListResponse[RecommendationRead]):
    pass