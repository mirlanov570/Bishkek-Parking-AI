from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.utils import raise_service_error
from app.auth.dependencies import admin_required
from app.db.session import get_db
from app.models.user import User
from app.schemas.demo import DemoSeedRead, DemoSeedRequest
from app.schemas.infrastructure_history import (
    InfrastructureHistoryGenerateRead,
    InfrastructureHistoryGenerateRequest,
)
from app.services.demo_data_service import demo_data_service
from app.services.exceptions import ServiceError
from app.services.infrastructure_history_service import infrastructure_history_service


router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


@router.post("/seed-demo-data", response_model=DemoSeedRead)
async def seed_demo_data(
    payload: DemoSeedRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> DemoSeedRead:
    try:
        return await demo_data_service.seed_demo_data(
            db=db,
            reset=payload.reset,
            days=payload.days,
            history_points_per_day=payload.history_points_per_day,
            drivers_count=payload.drivers_count,
            requests_count=payload.requests_count,
            predictions_count=payload.predictions_count,
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.post(
    "/generate-infrastructure-history",
    response_model=InfrastructureHistoryGenerateRead,
)
async def generate_infrastructure_history(
    payload: InfrastructureHistoryGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> InfrastructureHistoryGenerateRead:
    try:
        return await infrastructure_history_service.generate_history(
            db=db,
            reset_generated=payload.reset_generated,
            days=payload.days,
            history_points_per_day=payload.history_points_per_day,
            generate_requests=payload.generate_requests,
            max_requests_per_point=payload.max_requests_per_point,
        )
    except ServiceError as exc:
        raise_service_error(exc)