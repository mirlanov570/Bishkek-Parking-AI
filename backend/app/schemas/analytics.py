from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from app.schemas.common import ListResponse, SchemaBase


class DashboardSummaryRead(SchemaBase):
    parking_count: int
    total_places: int
    free_places: int
    occupied_places: int
    average_load_percentage: Decimal

    requests_count: int
    active_users_count: int
    predictions_count: int
    recommendations_count: int
    unread_notifications_count: int


class PopularParkingRead(SchemaBase):
    parking_id: int
    parking_name: str
    request_count: int


class PopularParkingList(ListResponse[PopularParkingRead]):
    pass


class PeakHourRead(SchemaBase):
    hour: int
    average_load_percentage: Decimal
    records_count: int


class PeakHourList(ListResponse[PeakHourRead]):
    pass


class DailyLoadRead(SchemaBase):
    day: date
    average_load_percentage: Decimal
    min_load_percentage: Decimal
    max_load_percentage: Decimal
    records_count: int


class DailyLoadList(ListResponse[DailyLoadRead]):
    pass


class WeekdayVsWeekendRead(SchemaBase):
    day_type: str
    average_load_percentage: Decimal
    records_count: int


class WeekdayVsWeekendList(ListResponse[WeekdayVsWeekendRead]):
    pass


class ParkingLoadPointRead(SchemaBase):
    parking_id: int
    zone_id: int | None
    total_places: int
    occupied_places: int
    free_places: int
    load_percentage: Decimal
    load_level: str
    load_color: str
    source: str
    recorded_at: datetime


class ParkingLoadTrendList(ListResponse[ParkingLoadPointRead]):
    pass