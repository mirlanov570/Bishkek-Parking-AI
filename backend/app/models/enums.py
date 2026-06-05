from enum import Enum


class HistorySource(str, Enum):
    ADMIN_MANUAL = "admin_manual"
    GENERATED = "generated"
    SENSOR_FUTURE = "sensor_future"


class NotificationType(str, Enum):
    PLACE_AVAILABLE = "place_available"
    PARKING_ALMOST_FULL = "parking_almost_full"
    HIGH_LOAD_FORECAST = "high_load_forecast"
    SYSTEM = "system"


class ParkingRequestStatus(str, Enum):
    CREATED = "created"
    PROCESSING = "processing"
    RECOMMENDED = "recommended"
    COMPLETED = "completed"
    CANCELLED = "cancelled"