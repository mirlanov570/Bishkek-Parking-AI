from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import Field, model_validator

from app.schemas.common import (
    Latitude,
    ListResponse,
    LoadPercentage,
    Longitude,
    NonNegativeInt,
    PositiveInt,
    SchemaBase,
)

ParkingZoneType = Literal[
    "university",
    "school",
    "mall",
    "office",
    "residential",
    "market",
    "entertainment",
    "medical",
    "park",
    "mixed",
]


class ParkingBase(SchemaBase):
    name: str = Field(min_length=2, max_length=150)
    address: str = Field(min_length=2)
    latitude: Latitude
    longitude: Longitude
    zone_type: ParkingZoneType = "mixed"
    total_places: PositiveInt
    occupied_places: NonNegativeInt = 0
    working_hours: str | None = Field(default=None, max_length=100)
    description: str | None = None
    is_active: bool = True

    @model_validator(mode="after")
    def validate_places(self):
        if self.occupied_places > self.total_places:
            raise ValueError("occupied_places cannot be greater than total_places")
        return self


class ParkingCreate(ParkingBase):
    pass


class ParkingUpdate(SchemaBase):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    address: str | None = Field(default=None, min_length=2)
    latitude: Latitude | None = None
    longitude: Longitude | None = None
    zone_type: ParkingZoneType | None = None
    total_places: PositiveInt | None = None
    occupied_places: NonNegativeInt | None = None
    working_hours: str | None = Field(default=None, max_length=100)
    description: str | None = None
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


class ParkingStatusUpdate(SchemaBase):
    total_places: PositiveInt | None = None
    occupied_places: NonNegativeInt

    @model_validator(mode="after")
    def validate_places(self):
        if self.total_places is not None and self.occupied_places > self.total_places:
            raise ValueError("occupied_places cannot be greater than total_places")
        return self


class ParkingRead(SchemaBase):
    id: int
    name: str
    address: str
    latitude: Decimal
    longitude: Decimal
    zone_type: str
    total_places: int
    occupied_places: int
    free_places: int
    load_percentage: Decimal
    load_level: str
    load_color: str
    working_hours: str | None
    description: str | None
    is_active: bool
    is_deleted: bool
    deleted_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ParkingShortRead(SchemaBase):
    id: int
    name: str
    address: str
    latitude: Decimal
    longitude: Decimal
    zone_type: str
    total_places: int
    occupied_places: int
    free_places: int
    load_percentage: LoadPercentage
    load_level: str
    load_color: str
    is_active: bool


class ParkingList(ListResponse[ParkingRead]):
    pass