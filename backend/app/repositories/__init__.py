from app.repositories.base import BaseRepository
from app.repositories.demo_data_repository import (
    DemoDataRepository,
    demo_data_repository,
)
from app.repositories.model_metric_repository import (
    ModelMetricRepository,
    model_metric_repository,
)
from app.repositories.notification_repository import (
    NotificationRepository,
    notification_repository,
)
from app.repositories.parking_repository import (
    ParkingRepository,
    parking_repository,
)
from app.repositories.parking_request_repository import (
    ParkingRequestRepository,
    parking_request_repository,
)
from app.repositories.parking_status_history_repository import (
    ParkingStatusHistoryRepository,
    parking_status_history_repository,
)
from app.repositories.parking_zone_repository import (
    ParkingZoneRepository,
    parking_zone_repository,
)
from app.repositories.prediction_repository import (
    PredictionRepository,
    prediction_repository,
)
from app.repositories.recommendation_repository import (
    RecommendationRepository,
    recommendation_repository,
)
from app.repositories.recommendation_scoring_repository import (
    RecommendationScoringRepository,
    recommendation_scoring_repository,
)
from app.repositories.role_repository import (
    RoleRepository,
    role_repository,
)
from app.repositories.user_repository import (
    UserRepository,
    user_repository,
)


__all__ = [
    "BaseRepository",
    "DemoDataRepository",
    "demo_data_repository",
    "RoleRepository",
    "role_repository",
    "UserRepository",
    "user_repository",
    "ParkingRepository",
    "parking_repository",
    "ParkingZoneRepository",
    "parking_zone_repository",
    "ParkingStatusHistoryRepository",
    "parking_status_history_repository",
    "ParkingRequestRepository",
    "parking_request_repository",
    "PredictionRepository",
    "prediction_repository",
    "RecommendationRepository",
    "recommendation_repository",
    "RecommendationScoringRepository",
    "recommendation_scoring_repository",
    "NotificationRepository",
    "notification_repository",
    "ModelMetricRepository",
    "model_metric_repository",
]