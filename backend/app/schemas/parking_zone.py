from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import Field, model_validator

from app.schemas.common import (
    ListResponse,
    NonNegativeInt,
    PositiveInt,
    SchemaBase,
)


class ParkingZoneBase(SchemaBase):
    parking_id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=150)
    total_places: PositiveInt
    occupied_places: NonNegativeInt = 0
    is_active: bool = True

    @model_validator(mode="after")
    def validate_places(self):
        if self.occupied_places > self.total_places:
            raise ValueError("occupied_places cannot be greater than total_places")
        return self


class ParkingZoneCreate(ParkingZoneBase):
    pass


class ParkingZoneCreateForParking(SchemaBase):
    name: str = Field(min_length=1, max_length=150)
    total_places: PositiveInt
    occupied_places: NonNegativeInt = 0
    is_active: bool = True

    @model_validator(mode="after")
    def validate_places(self):
        if self.occupied_places > self.total_places:
            raise ValueError("occupied_places cannot be greater than total_places")
        return self


class ParkingZoneUpdate(SchemaBase):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    total_places: PositiveInt | None = None
    occupied_places: NonNegativeInt | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def validate_places(self):
        if (
            self.total_places is not None
            and self.occupied_places is not None
            and self.occupied_places > self.total_places
        ):
            raise ValueError("occupied_places cannot be greater than total_places")
        return self


class ParkingZoneRead(SchemaBase):
    id: int
    parking_id: int
    name: str
    total_places: int
    occupied_places: int
    free_places: int
    load_percentage: Decimal
    load_level: str
    load_color: str
    is_active: bool
    is_deleted: bool
    deleted_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ParkingZoneShortRead(SchemaBase):
    id: int
    parking_id: int
    name: str
    total_places: int
    occupied_places: int
    free_places: int
    load_percentage: Decimal
    load_level: str
    load_color: str
    is_active: bool


class ParkingZoneList(ListResponse[ParkingZoneRead]):
    pass