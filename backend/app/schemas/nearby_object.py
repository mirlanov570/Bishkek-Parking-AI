from __future__ import annotations

from datetime import datetime, time
from decimal import Decimal
from typing import Literal

from pydantic import Field, model_validator

from app.schemas.common import ListResponse, SchemaBase


NearbyObjectType = Literal[
    "university",
    "school",
    "mall",
    "cafe",
    "cinema",
    "office",
    "market",
    "residential",
    "hospital",
    "park",
    "other",
]


class NearbyObjectBase(SchemaBase):
    parking_id: int = Field(gt=0)
    name: str = Field(min_length=2, max_length=150)
    object_type: NearbyObjectType
    distance_m: int = Field(default=300, ge=0)
    open_time: time | None = None
    close_time: time | None = None
    active_days: str = Field(default="1,2,3,4,5,6,7", min_length=1, max_length=30)
    influence_weight: Decimal = Field(default=Decimal("1.00"), ge=Decimal("0"))
    is_active: bool = True

    @model_validator(mode="after")
    def validate_schedule(self):
        days = [day.strip() for day in self.active_days.split(",") if day.strip()]

        if not days:
            raise ValueError("active_days cannot be empty")

        invalid_days = [
            day for day in days
            if not day.isdigit() or int(day) < 1 or int(day) > 7
        ]

        if invalid_days:
            raise ValueError("active_days must contain numbers from 1 to 7")

        if (self.open_time is None) != (self.close_time is None):
            raise ValueError("open_time and close_time must be provided together")

        self.active_days = ",".join(days)

        return self


class NearbyObjectCreate(NearbyObjectBase):
    pass


class NearbyObjectCreateForParking(SchemaBase):
    name: str = Field(min_length=2, max_length=150)
    object_type: NearbyObjectType
    distance_m: int = Field(default=300, ge=0)
    open_time: time | None = None
    close_time: time | None = None
    active_days: str = Field(default="1,2,3,4,5,6,7", min_length=1, max_length=30)
    influence_weight: Decimal = Field(default=Decimal("1.00"), ge=Decimal("0"))
    is_active: bool = True

    @model_validator(mode="after")
    def validate_schedule(self):
        days = [day.strip() for day in self.active_days.split(",") if day.strip()]

        if not days:
            raise ValueError("active_days cannot be empty")

        invalid_days = [
            day for day in days
            if not day.isdigit() or int(day) < 1 or int(day) > 7
        ]

        if invalid_days:
            raise ValueError("active_days must contain numbers from 1 to 7")

        if (self.open_time is None) != (self.close_time is None):
            raise ValueError("open_time and close_time must be provided together")

        self.active_days = ",".join(days)

        return self


class NearbyObjectUpdate(SchemaBase):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    object_type: NearbyObjectType | None = None
    distance_m: int | None = Field(default=None, ge=0)
    open_time: time | None = None
    close_time: time | None = None
    active_days: str | None = Field(default=None, min_length=1, max_length=30)
    influence_weight: Decimal | None = Field(default=None, ge=Decimal("0"))
    is_active: bool | None = None

    @model_validator(mode="after")
    def validate_schedule(self):
        if self.active_days is not None:
            days = [day.strip() for day in self.active_days.split(",") if day.strip()]

            if not days:
                raise ValueError("active_days cannot be empty")

            invalid_days = [
                day for day in days
                if not day.isdigit() or int(day) < 1 or int(day) > 7
            ]

            if invalid_days:
                raise ValueError("active_days must contain numbers from 1 to 7")

            self.active_days = ",".join(days)

        if (self.open_time is None) != (self.close_time is None):
            raise ValueError("open_time and close_time must be provided together")

        return self


class NearbyObjectRead(SchemaBase):
    id: int
    parking_id: int
    name: str
    object_type: str
    distance_m: int
    open_time: time | None
    close_time: time | None
    active_days: str
    influence_weight: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime


class NearbyObjectShortRead(SchemaBase):
    id: int
    parking_id: int
    name: str
    object_type: str
    distance_m: int
    influence_weight: Decimal
    is_active: bool


class NearbyObjectList(ListResponse[NearbyObjectRead]):
    pass