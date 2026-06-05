from fastapi import APIRouter

from app.auth.router import router as auth_router
from app.api.v1.endpoints.admin import router as admin_router
from app.api.v1.endpoints.analytics import router as analytics_router
from app.api.v1.endpoints.files import router as files_router
from app.api.v1.endpoints.model_metrics import router as model_metrics_router
from app.api.v1.endpoints.notifications import router as notifications_router
from app.api.v1.endpoints.nearby_objects import router as nearby_objects_router
from app.api.v1.endpoints.parking_requests import router as parking_requests_router
from app.api.v1.endpoints.parking_zones import router as parking_zones_router
from app.api.v1.endpoints.parkings import router as parkings_router
from app.api.v1.endpoints.predictions import router as predictions_router
from app.api.v1.endpoints.recommendations import router as recommendations_router
from app.api.v1.endpoints.roles import router as roles_router
from app.api.v1.endpoints.users import router as users_router


api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(roles_router)
api_router.include_router(users_router)
api_router.include_router(parkings_router)
api_router.include_router(parking_zones_router)
api_router.include_router(nearby_objects_router)
api_router.include_router(parking_requests_router)
api_router.include_router(predictions_router)
api_router.include_router(recommendations_router)
api_router.include_router(notifications_router)
api_router.include_router(model_metrics_router)
api_router.include_router(files_router)
api_router.include_router(analytics_router)
api_router.include_router(admin_router)


@api_router.get("/ping", tags=["System"])
async def ping() -> dict[str, str]:
    return {
        "message": "pong",
    }