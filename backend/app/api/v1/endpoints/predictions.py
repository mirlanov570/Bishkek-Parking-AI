from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.utils import raise_service_error
from app.auth.dependencies import admin_required, get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.prediction import (
    PredictionCreate,
    PredictionList,
    PredictionPredictRequest,
    PredictionRead,
    PredictionTrainRead,
    PredictionTrainRequest,
    PredictionUpdate,
)
from app.services.exceptions import ServiceError
from app.services.ml_prediction_service import ml_prediction_service
from app.services.prediction_service import prediction_service


router = APIRouter(
    prefix="/predictions",
    tags=["Predictions"],
)


@router.get("", response_model=PredictionList)
async def get_predictions(
    parking_id: int | None = Query(default=None, gt=0),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> PredictionList:
    try:
        if parking_id is not None:
            items = await prediction_service.get_by_parking_id(
                db=db,
                parking_id=parking_id,
                limit=limit,
                offset=offset,
            )
        else:
            items = await prediction_service.get_list(
                db=db,
                limit=limit,
                offset=offset,
            )
    except ServiceError as exc:
        raise_service_error(exc)

    return PredictionList(
        items=items,
        total=len(items),
        limit=limit,
        offset=offset,
    )


@router.post("/train", response_model=PredictionTrainRead)
async def train_prediction_model(
    payload: PredictionTrainRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> PredictionTrainRead:
    try:
        return await ml_prediction_service.train_model(
            db=db,
            parking_id=payload.parking_id,
            test_size=payload.test_size,
            min_rows=payload.min_rows,
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.post("/predict", response_model=PredictionRead)
async def predict_parking_load(
    payload: PredictionPredictRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PredictionRead:
    try:
        return await ml_prediction_service.predict(
            db=db,
            parking_id=payload.parking_id,
            prediction_datetime=payload.prediction_datetime,
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.get("/{prediction_id}", response_model=PredictionRead)
async def get_prediction(
    prediction_id: int,
    db: AsyncSession = Depends(get_db),
) -> PredictionRead:
    try:
        return await prediction_service.get_by_id(
            db=db,
            prediction_id=prediction_id,
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.post("", response_model=PredictionRead)
async def create_prediction(
    payload: PredictionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> PredictionRead:
    try:
        return await prediction_service.create_prediction(
            db=db,
            data=payload.model_dump(),
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.patch("/{prediction_id}", response_model=PredictionRead)
async def update_prediction(
    prediction_id: int,
    payload: PredictionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> PredictionRead:
    try:
        return await prediction_service.update_prediction(
            db=db,
            prediction_id=prediction_id,
            data=payload.model_dump(exclude_unset=True),
        )
    except ServiceError as exc:
        raise_service_error(exc)


@router.delete("/{prediction_id}")
async def delete_prediction(
    prediction_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required),
) -> dict[str, str]:
    try:
        await prediction_service.delete_prediction(
            db=db,
            prediction_id=prediction_id,
        )
    except ServiceError as exc:
        raise_service_error(exc)

    return {
        "detail": "Prediction deleted successfully",
    }