from __future__ import annotations

import logging
import pickle
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any

import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import BASE_DIR
from app.models.prediction import Prediction
from app.repositories.ml_prediction_repository import ml_prediction_repository
from app.repositories.model_metric_repository import model_metric_repository
from app.repositories.prediction_repository import prediction_repository
from app.schemas.prediction import PredictionTrainRead
from app.services.exceptions import NotFoundError, ValidationError
from app.services.parking_service import parking_service


logger = logging.getLogger("app.ml_predictions")


MODEL_NAME = "LinearRegression"
ML_MODELS_DIR = BASE_DIR / "ml_models"


ZONE_TYPE_CODES = {
    "mixed": 0,
    "university": 1,
    "school": 2,
    "mall": 3,
    "office": 4,
    "residential": 5,
    "market": 6,
    "entertainment": 7,
    "medical": 8,
    "park": 9,
}


FEATURE_COLUMNS = [
    "parking_id",
    "zone_type_code",
    "hour",
    "day_of_week",
    "month",
    "is_weekend",
    "total_places",
    "previous_load_percentage",
    "average_load_same_hour",
    "requests_last_hour",
    "nearby_university_count",
    "nearby_school_count",
    "nearby_mall_count",
    "nearby_cafe_count",
    "nearby_cinema_count",
    "nearby_office_count",
    "nearby_market_count",
    "nearby_residential_count",
    "active_objects_count",
    "active_objects_weight",
]


INFRASTRUCTURE_FEATURE_COLUMNS = [
    "requests_last_hour",
    "nearby_university_count",
    "nearby_school_count",
    "nearby_mall_count",
    "nearby_cafe_count",
    "nearby_cinema_count",
    "nearby_office_count",
    "nearby_market_count",
    "nearby_residential_count",
    "active_objects_count",
    "active_objects_weight",
]


class MLPredictionService:
    def ensure_model_dir_exists(self) -> None:
        ML_MODELS_DIR.mkdir(parents=True, exist_ok=True)

    def get_model_path(
        self,
        parking_id: int | None = None,
    ) -> Path:
        if parking_id is None:
            return ML_MODELS_DIR / "linear_regression_all_parkings.pkl"

        return ML_MODELS_DIR / f"linear_regression_parking_{parking_id}.pkl"

    def get_relative_model_path(
        self,
        model_path: Path,
    ) -> str:
        return str(model_path.relative_to(BASE_DIR)).replace("\\", "/")

    def decimal_metric(
        self,
        value: float,
    ) -> Decimal:
        return Decimal(str(round(float(value), 4)))

    def encode_zone_type(
        self,
        zone_type: str | None,
    ) -> int:
        if not zone_type:
            return ZONE_TYPE_CODES["mixed"]

        return ZONE_TYPE_CODES.get(zone_type, ZONE_TYPE_CODES["mixed"])

    def get_level_and_color(
        self,
        load_percentage: Decimal,
    ) -> tuple[str, str]:
        if load_percentage <= Decimal("50"):
            return "low", "green"

        if load_percentage <= Decimal("80"):
            return "medium", "yellow"

        return "high", "red"

    def prepare_training_dataframe(
        self,
        rows: list[dict[str, Any]],
        min_rows: int,
    ) -> pd.DataFrame:
        if len(rows) < min_rows:
            raise ValidationError(
                message=(
                    f"Not enough history rows for training. "
                    f"Required at least {min_rows}, found {len(rows)}"
                ),
                code="NOT_ENOUGH_HISTORY_FOR_TRAINING",
            )

        df = pd.DataFrame(rows)

        required_columns = {
            "parking_id",
            "zone_type",
            "total_places",
            "occupied_places",
            "load_percentage",
            "recorded_at",
        }

        missing_columns = required_columns - set(df.columns)

        if missing_columns:
            raise ValidationError(
                message=f"Training data is missing columns: {', '.join(sorted(missing_columns))}",
                code="TRAINING_DATA_INVALID",
            )

        df["recorded_at"] = pd.to_datetime(df["recorded_at"])
        df = df.sort_values(["parking_id", "recorded_at"])

        df["hour"] = df["recorded_at"].dt.hour
        df["day_of_week"] = df["recorded_at"].dt.isocalendar().day.astype(int)
        df["month"] = df["recorded_at"].dt.month
        df["is_weekend"] = df["day_of_week"].isin([6, 7]).astype(int)

        df["zone_type"] = df["zone_type"].fillna("mixed")
        df["zone_type_code"] = df["zone_type"].map(ZONE_TYPE_CODES).fillna(0).astype(int)

        df["load_percentage"] = pd.to_numeric(
            df["load_percentage"],
            errors="coerce",
        ).fillna(0)

        df["total_places"] = pd.to_numeric(
            df["total_places"],
            errors="coerce",
        ).fillna(0)

        df["occupied_places"] = pd.to_numeric(
            df["occupied_places"],
            errors="coerce",
        ).fillna(0)

        for column in INFRASTRUCTURE_FEATURE_COLUMNS:
            if column not in df.columns:
                df[column] = 0

            df[column] = pd.to_numeric(
                df[column],
                errors="coerce",
            ).fillna(0)

        df["previous_load_percentage"] = (
            df.groupby("parking_id")["load_percentage"].shift(1)
        )
        df["previous_load_percentage"] = df["previous_load_percentage"].fillna(
            df["load_percentage"]
        )

        df["average_load_same_hour"] = (
            df.groupby(["parking_id", "hour"])["load_percentage"].transform("mean")
        )
        df["average_load_same_hour"] = df["average_load_same_hour"].fillna(
            df["load_percentage"]
        )

        for column in FEATURE_COLUMNS:
            df[column] = pd.to_numeric(
                df[column],
                errors="coerce",
            ).fillna(0)

        df = df.dropna(subset=FEATURE_COLUMNS + ["occupied_places"])

        if len(df) < min_rows:
            raise ValidationError(
                message=(
                    f"Not enough prepared rows for training. "
                    f"Required at least {min_rows}, found {len(df)}"
                ),
                code="NOT_ENOUGH_PREPARED_ROWS_FOR_TRAINING",
            )

        return df

    def save_model(
        self,
        model: LinearRegression,
        parking_id: int | None,
    ) -> Path:
        self.ensure_model_dir_exists()

        model_path = self.get_model_path(parking_id)

        payload = {
            "model_name": MODEL_NAME,
            "parking_id": parking_id,
            "features": FEATURE_COLUMNS,
            "zone_type_codes": ZONE_TYPE_CODES,
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "model": model,
        }

        with model_path.open("wb") as file:
            pickle.dump(payload, file)

        return model_path

    def load_model(
        self,
        parking_id: int,
    ) -> dict[str, Any]:
        specific_model_path = self.get_model_path(parking_id)
        global_model_path = self.get_model_path(None)

        if specific_model_path.exists():
            model_path = specific_model_path
        elif global_model_path.exists():
            model_path = global_model_path
        else:
            raise NotFoundError(
                message="ML model is not trained yet. Run POST /api/v1/predictions/train first.",
                code="ML_MODEL_NOT_TRAINED",
            )

        with model_path.open("rb") as file:
            payload = pickle.load(file)

        saved_features = payload.get("features", [])

        if saved_features != FEATURE_COLUMNS:
            raise ValidationError(
                message=(
                    "ML model features are outdated. "
                    "Delete old model files or train the model again."
                ),
                code="ML_MODEL_FEATURES_OUTDATED",
            )

        payload["model_path"] = model_path

        return payload

    async def train_model(
        self,
        db: AsyncSession,
        parking_id: int | None,
        test_size: float,
        min_rows: int,
    ) -> PredictionTrainRead:
        if parking_id is not None:
            await parking_service.get_by_id(db, parking_id)

        logger.info(
            "ML training started | parking_id=%s test_size=%s min_rows=%s",
            parking_id,
            test_size,
            min_rows,
        )

        rows = await ml_prediction_repository.get_training_rows(
            db=db,
            parking_id=parking_id,
        )

        df = self.prepare_training_dataframe(
            rows=rows,
            min_rows=min_rows,
        )

        x = df[FEATURE_COLUMNS]
        y = df["occupied_places"]

        x_train, x_test, y_train, y_test = train_test_split(
            x,
            y,
            test_size=test_size,
            random_state=42,
            shuffle=True,
        )

        model = LinearRegression()
        model.fit(x_train, y_train)

        y_pred = model.predict(x_test)

        mae = self.decimal_metric(mean_absolute_error(y_test, y_pred))
        mse = self.decimal_metric(mean_squared_error(y_test, y_pred))
        r2 = self.decimal_metric(r2_score(y_test, y_pred))

        model_path = self.save_model(
            model=model,
            parking_id=parking_id,
        )

        metric = await model_metric_repository.create(
            db=db,
            data={
                "model_name": MODEL_NAME,
                "parking_id": parking_id,
                "mae": mae,
                "mse": mse,
                "r2_score": r2,
                "train_rows_count": int(len(x_train)),
                "test_rows_count": int(len(x_test)),
                "extra_info": {
                    "source": "linear_regression_training_with_infrastructure",
                    "features": FEATURE_COLUMNS,
                    "target": "occupied_places",
                    "model_file": self.get_relative_model_path(model_path),
                    "test_size": test_size,
                    "history_rows_count": len(rows),
                    "prepared_rows_count": len(df),
                    "zone_type_codes": ZONE_TYPE_CODES,
                    "infrastructure_features": INFRASTRUCTURE_FEATURE_COLUMNS,
                },
            },
        )

        await db.commit()
        await db.refresh(metric)

        logger.info(
            "ML training completed | parking_id=%s metric_id=%s mae=%s mse=%s r2=%s",
            parking_id,
            metric.id,
            mae,
            mse,
            r2,
        )

        return PredictionTrainRead(
            model_name=MODEL_NAME,
            parking_id=parking_id,
            train_rows_count=int(len(x_train)),
            test_rows_count=int(len(x_test)),
            mae=mae,
            mse=mse,
            r2_score=r2,
            metric_id=metric.id,
            model_file=self.get_relative_model_path(model_path),
            features=FEATURE_COLUMNS,
            message="LinearRegression model trained successfully with infrastructure features",
        )

    async def build_prediction_features(
        self,
        db: AsyncSession,
        parking_id: int,
        prediction_datetime: datetime,
    ) -> dict[str, Any]:
        parking = await parking_service.get_active_by_id(
            db=db,
            parking_id=parking_id,
        )

        latest_context = await ml_prediction_repository.get_latest_history_context(
            db=db,
            parking_id=parking_id,
        )

        hour = prediction_datetime.hour
        day_of_week = prediction_datetime.isoweekday()
        month = prediction_datetime.month
        is_weekend = 1 if day_of_week in {6, 7} else 0

        average_load_same_hour = await ml_prediction_repository.get_average_load_for_hour(
            db=db,
            parking_id=parking_id,
            hour=hour,
        )

        requests_last_hour = await ml_prediction_repository.get_requests_count_last_hour(
            db=db,
            parking_id=parking_id,
            prediction_datetime=prediction_datetime,
        )

        infrastructure_context = await ml_prediction_repository.get_infrastructure_context(
            db=db,
            parking_id=parking_id,
            day_of_week=day_of_week,
            target_time=prediction_datetime.time(),
        )

        if latest_context is not None:
            previous_load_percentage = latest_context["load_percentage"]
        else:
            previous_load_percentage = parking.load_percentage or Decimal("0")

        if average_load_same_hour is None:
            average_load_same_hour = previous_load_percentage

        zone_type = infrastructure_context.get(
            "zone_type",
            getattr(parking, "zone_type", "mixed"),
        )

        return {
            "parking_id": parking.id,
            "zone_type_code": self.encode_zone_type(zone_type),
            "hour": hour,
            "day_of_week": day_of_week,
            "month": month,
            "is_weekend": is_weekend,
            "total_places": parking.total_places,
            "previous_load_percentage": float(previous_load_percentage or 0),
            "average_load_same_hour": float(average_load_same_hour or 0),
            "requests_last_hour": int(requests_last_hour or 0),
            "nearby_university_count": int(
                infrastructure_context.get("nearby_university_count") or 0
            ),
            "nearby_school_count": int(
                infrastructure_context.get("nearby_school_count") or 0
            ),
            "nearby_mall_count": int(
                infrastructure_context.get("nearby_mall_count") or 0
            ),
            "nearby_cafe_count": int(
                infrastructure_context.get("nearby_cafe_count") or 0
            ),
            "nearby_cinema_count": int(
                infrastructure_context.get("nearby_cinema_count") or 0
            ),
            "nearby_office_count": int(
                infrastructure_context.get("nearby_office_count") or 0
            ),
            "nearby_market_count": int(
                infrastructure_context.get("nearby_market_count") or 0
            ),
            "nearby_residential_count": int(
                infrastructure_context.get("nearby_residential_count") or 0
            ),
            "active_objects_count": int(
                infrastructure_context.get("active_objects_count") or 0
            ),
            "active_objects_weight": float(
                infrastructure_context.get("active_objects_weight") or 0
            ),
        }

    async def predict(
        self,
        db: AsyncSession,
        parking_id: int,
        prediction_datetime: datetime,
    ) -> Prediction:
        parking = await parking_service.get_active_by_id(
            db=db,
            parking_id=parking_id,
        )

        model_payload = self.load_model(parking_id)
        model: LinearRegression = model_payload["model"]
        features: list[str] = model_payload["features"]
        model_path: Path = model_payload["model_path"]

        feature_values = await self.build_prediction_features(
            db=db,
            parking_id=parking_id,
            prediction_datetime=prediction_datetime,
        )

        x = pd.DataFrame(
            [feature_values],
            columns=features,
        )

        raw_prediction = float(model.predict(x)[0])

        predicted_occupied_places = int(round(raw_prediction))
        predicted_occupied_places = max(
            0,
            min(predicted_occupied_places, parking.total_places),
        )

        predicted_free_places = max(
            parking.total_places - predicted_occupied_places,
            0,
        )

        predicted_load_percentage = Decimal(
            str(
                round(
                    (predicted_occupied_places / parking.total_places) * 100,
                    2,
                )
            )
        )

        predicted_load_level, predicted_color = self.get_level_and_color(
            predicted_load_percentage
        )

        prediction = await prediction_repository.create(
            db=db,
            data={
                "parking_id": parking.id,
                "prediction_datetime": prediction_datetime,
                "predicted_occupied_places": predicted_occupied_places,
                "predicted_free_places": predicted_free_places,
                "predicted_load_percentage": predicted_load_percentage,
                "predicted_load_level": predicted_load_level,
                "predicted_color": predicted_color,
                "model_name": MODEL_NAME,
                "features": {
                    **feature_values,
                    "zone_type": getattr(parking, "zone_type", "mixed"),
                    "zone_type_codes": ZONE_TYPE_CODES,
                    "model_file": self.get_relative_model_path(model_path),
                },
            },
        )

        await db.commit()
        await db.refresh(prediction)

        logger.info(
            "ML prediction created | prediction_id=%s parking_id=%s load=%s",
            prediction.id,
            parking.id,
            predicted_load_percentage,
        )

        return prediction


ml_prediction_service = MLPredictionService()