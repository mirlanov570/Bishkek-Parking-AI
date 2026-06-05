from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import Field

from app.models.enums import ParkingRequestStatus
from app.schemas.common import (
    Latitude,
    ListResponse,
    Longitude,
    SchemaBase,
)


class ParkingRequestBase(SchemaBase):
    parking_id: int = Field(gt=0)
    selected_zone_id: int | None = Field(default=None, gt=0)
    user_latitude: Latitude | None = None
    user_longitude: Longitude | None = None


class ParkingRequestCreate(ParkingRequestBase):
    pass


class ParkingRequestCreateDB(ParkingRequestBase):
    user_id: int = Field(gt=0)


class ParkingRequestUpdate(SchemaBase):
    selected_zone_id: int | None = Field(default=None, gt=0)
    user_latitude: Latitude | None = None
    user_longitude: Longitude | None = None
    status: ParkingRequestStatus | None = None
    recommendation_text: str | None = None


class ParkingRequestStatusUpdate(SchemaBase):
    status: ParkingRequestStatus
    recommendation_text: str | None = Field(default=None, max_length=1000)


class ParkingRequestCancel(SchemaBase):
    reason: str | None = Field(default=None, max_length=500)


class ParkingRequestRecommend(SchemaBase):
    user_latitude: Latitude | None = None
    user_longitude: Longitude | None = None
    use_prediction: bool = True
    popularity_days: int = Field(default=30, ge=1, le=365)


class ParkingRequestRead(SchemaBase):
    id: int
    user_id: int
    parking_id: int
    selected_zone_id: int | None
    user_latitude: Decimal | None
    user_longitude: Decimal | None
    status: ParkingRequestStatus
    recommendation_text: str | None
    requested_at: datetime
    created_at: datetime
    updated_at: datetime


class ParkingRequestList(ListResponse[ParkingRequestRead]):
    pass