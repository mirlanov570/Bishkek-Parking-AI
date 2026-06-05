from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import admin_required
from app.db.session import get_db
from app.models.user import User
from app.schemas.model_metric import (
    ModelMetricCreate,
    ModelMetricList,
    ModelMetricRead,
    ModelMetricUpdate,
)
from app.services.exceptions import NotFoundError, ServiceError
from app.services.model_metric_service import model_metric_service
from app.api.v1.endpoints.utils import raise_service_error


router = APIRouter(
    prefix="/model-metrics",
    tags=["Model metrics"],
)


@router.get("", response_model=ModelMetricList)
async def get_model_metrics(
    model_name: str | None = Query(default=None, min_length=1),
    parking_id: int | None = Query(default=None, gt=0),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> ModelMetricList:
    try:
        if model_name is not None:
            items = await model_metric_service.get_by_model_name(
                db=db,
                model_name=model_name,
                limit=limit,
                offset=offset,
            )
        elif parking_id is not None:
            items = await model_metric_service.get_by_parking_id(
                db=db,
                parking_id=parking_id,
                limit=limit,
                offset=offset,
            )
        else:
            items = await model_metric_service.get_list(
                db=db,
                limit=limit,
                offset=offset,
            )
    except ServiceError as exc:
        raise_service_error(exc)

    return ModelMetricList(
        items=items,
        total=len(items),
        limit=limit,
        offset=offset,
    )


@router.get("/latest", response_model=ModelMetricRead)
async def get_latest_model_metric(
    model_name: str | None = Query(default=None, min_length=1),
    parking_id: int | None = Query(default=None, gt=0),
    db: AsyncSession = Depends(get_db),
) -> ModelMetricRead:
    try:
        metric = await model_metric_service.get_latest(
            db=db,
            model_name=model_name,
            parking_id=parking_id,
        )

        if metric is None:
            raise NotFoundError(
                message="Model metric not found",
                code="MODEL_METRIC_NOT_FOUND",
            )

        return metric
    except ServiceError as exc:
        raise_service_error(exc)


@router.get("/{metric_id}", response_model=ModelMetricRead)
async def get_model_metric(
    metric_id: int,
    db: AsyncSession = Depends(get_db),
) -> ModelMetricRead:
    try:
        return await model_metric_service.get_by_id(
            db=db,
            metric_id=metric_id,
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.post("", response_model=ModelMetricRead)
async def create_model_metric(
    payload: ModelMetricCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> ModelMetricRead:
    try:
        return await model_metric_service.create_metric(
            db=db,
            data=payload.model_dump(),
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.patch("/{metric_id}", response_model=ModelMetricRead)
async def update_model_metric(
    metric_id: int,
    payload: ModelMetricUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> ModelMetricRead:
    try:
        return await model_metric_service.update_metric(
            db=db,
            metric_id=metric_id,
            data=payload.model_dump(exclude_unset=True),
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.delete("/{metric_id}")
async def delete_model_metric(
    metric_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> dict[str, str]:
    try:
        await model_metric_service.delete_metric(
            db=db,
            metric_id=metric_id,
        )
    except ServiceError as exc:
        raise_service_error(exc)

    return {
        "detail": "Model metric deleted successfully",
    }