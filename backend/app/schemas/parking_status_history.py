from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import Field, model_validator

from app.models.enums import HistorySource
from app.schemas.common import (
    ListResponse,
    NonNegativeInt,
    PositiveInt,
    SchemaBase,
)


class ParkingStatusHistoryBase(SchemaBase):
    parking_id: int = Field(gt=0)
    zone_id: int | None = Field(default=None, gt=0)
    total_places: PositiveInt
    occupied_places: NonNegativeInt
    source: HistorySource = HistorySource.ADMIN_MANUAL

    @model_validator(mode="after")
    def validate_places(self):
        if self.occupied_places > self.total_places:
            raise ValueError("occupied_places cannot be greater than total_places")
        return self


class ParkingStatusHistoryCreate(ParkingStatusHistoryBase):
    pass


class ParkingStatusHistoryUpdate(SchemaBase):
    total_places: PositiveInt | None = None
    occupied_places: NonNegativeInt | None = None
    source: HistorySource | None = None

    @model_validator(mode="after")
    def validate_places(self):
        if (
            self.total_places is not None
            and self.occupied_places is not None
            and self.occupied_places > self.total_places
        ):
            raise ValueError("occupied_places cannot be greater than total_places")
        return self


class ParkingStatusHistoryRead(SchemaBase):
    id: int
    parking_id: int
    zone_id: int | None
    total_places: int
    occupied_places: int
    free_places: int
    load_percentage: Decimal
    load_level: str
    load_color: str
    source: HistorySource
    recorded_at: datetime


class ParkingStatusHistoryList(ListResponse[ParkingStatusHistoryRead]):
    pass