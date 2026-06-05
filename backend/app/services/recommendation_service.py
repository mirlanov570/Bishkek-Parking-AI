from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import ParkingRequestStatus
from app.models.parking import Parking
from app.models.prediction import Prediction
from app.models.recommendation import Recommendation
from app.repositories.parking_repository import parking_repository
from app.repositories.parking_request_repository import parking_request_repository
from app.repositories.recommendation_repository import recommendation_repository
from app.repositories.recommendation_scoring_repository import (
    recommendation_scoring_repository,
)
from app.services.exceptions import (
    NotFoundError,
    PermissionDeniedError,
    ValidationError,
)
from app.services.parking_service import parking_service
from app.services.user_service import user_service


logger = logging.getLogger("app.recommendations")

OBJECT_TYPE_LABELS = {
    "university": "вуз",
    "school": "школа",
    "mall": "ТЦ",
    "cafe": "кафе",
    "cinema": "кинотеатр",
    "office": "офис",
    "market": "рынок",
    "residential": "жилой объект",
    "hospital": "медицинский объект",
    "park": "парк",
    "other": "объект",
}


ZONE_TYPE_LABELS = {
    "mixed": "смешанная зона",
    "university": "учебная зона",
    "school": "школьная зона",
    "mall": "торговая зона",
    "office": "офисная зона",
    "residential": "жилая зона",
    "market": "рыночная зона",
    "entertainment": "зона развлечений",
    "medical": "медицинская зона",
    "park": "парковая зона",
}

@dataclass
class NearbyObjectSummary:
    object_type: str
    name: str
    distance_m: int | None
    influence_weight: Decimal

@dataclass
class RecommendationCandidate:
    parking: Parking
    prediction: Prediction | None
    distance_km: Decimal | None
    request_count: int
    score: Decimal
    current_load_percentage: Decimal
    predicted_load_percentage: Decimal | None
    expected_free_places: int
    zone_type: str
    active_objects_count: int
    active_objects_weight: Decimal
    infrastructure_score: Decimal
    nearby_objects: list[NearbyObjectSummary]


class RecommendationService:
    def calculate_distance_km(
        self,
        lat1: Decimal | float,
        lon1: Decimal | float,
        lat2: Decimal | float,
        lon2: Decimal | float,
    ) -> Decimal:
        radius_km = 6371.0

        lat1_rad = math.radians(float(lat1))
        lon1_rad = math.radians(float(lon1))
        lat2_rad = math.radians(float(lat2))
        lon2_rad = math.radians(float(lon2))

        delta_lat = lat2_rad - lat1_rad
        delta_lon = lon2_rad - lon1_rad

        a = (
            math.sin(delta_lat / 2) ** 2
            + math.cos(lat1_rad)
            * math.cos(lat2_rad)
            * math.sin(delta_lon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        distance = radius_km * c

        return Decimal(str(round(distance, 3)))

    def to_decimal(
        self,
        value: Any,
        default: Decimal = Decimal("0"),
    ) -> Decimal:
        if value is None:
            return default

        return Decimal(str(value))

    def normalize_distance_score(
        self,
        distance_km: Decimal | None,
    ) -> Decimal:
        if distance_km is None:
            return Decimal("50")

        score = distance_km * Decimal("10")

        if score > Decimal("100"):
            return Decimal("100")

        return score

    def normalize_popularity_score(
        self,
        request_count: int,
    ) -> Decimal:
        score = Decimal(str(request_count)) * Decimal("2")

        if score > Decimal("100"):
            return Decimal("100")

        return score

    def calculate_infrastructure_score(
        self,
        active_objects_count: int,
        active_objects_weight: Decimal,
    ) -> Decimal:
        score = active_objects_weight * Decimal("8") + Decimal(str(active_objects_count)) * Decimal("3")

        if score > Decimal("100"):
            return Decimal("100")

        if score < Decimal("0"):
            return Decimal("0")

        return score.quantize(Decimal("0.01"))


    def parse_active_objects_text(
        self,
        value: str | None,
    ) -> list[NearbyObjectSummary]:
        if not value:
            return []

        objects: list[NearbyObjectSummary] = []

        for raw_item in value.split("|"):
            parts = raw_item.split(":")

            if len(parts) < 4:
                continue

            object_type, name, raw_distance, raw_weight = parts[0], parts[1], parts[2], parts[3]

            try:
                distance_m = int(raw_distance)
            except (TypeError, ValueError):
                distance_m = None

            objects.append(
                NearbyObjectSummary(
                    object_type=object_type or "other",
                    name=name or "Объект рядом",
                    distance_m=distance_m,
                    influence_weight=self.to_decimal(raw_weight, Decimal("1")),
                )
            )

        return objects


    def get_infrastructure_context(
        self,
        infrastructure_map: dict[int, dict[str, Any]],
        parking: Parking,
    ) -> tuple[str, int, Decimal, Decimal, list[NearbyObjectSummary]]:
        context = infrastructure_map.get(parking.id, {})

        zone_type = context.get("zone_type") or getattr(parking, "zone_type", None) or "mixed"
        active_objects_count = int(context.get("active_objects_count") or 0)
        active_objects_weight = self.to_decimal(context.get("active_objects_weight"))
        infrastructure_score = self.calculate_infrastructure_score(
            active_objects_count=active_objects_count,
            active_objects_weight=active_objects_weight,
        )
        nearby_objects = self.parse_active_objects_text(context.get("active_objects_text"))

        return (
            zone_type,
            active_objects_count,
            active_objects_weight,
            infrastructure_score,
            nearby_objects,
        )


    def build_infrastructure_text(
        self,
        candidate: RecommendationCandidate,
    ) -> str:
        zone_label = ZONE_TYPE_LABELS.get(candidate.zone_type, candidate.zone_type)

        if candidate.active_objects_count <= 0:
            return f"тип зоны: {zone_label}, активных объектов рядом сейчас не найдено"

        top_objects = candidate.nearby_objects[:3]
        object_names = []

        for item in top_objects:
            type_label = OBJECT_TYPE_LABELS.get(item.object_type, item.object_type)

            if item.distance_m is not None:
                object_names.append(f"{type_label} «{item.name}» ({item.distance_m} м)")
            else:
                object_names.append(f"{type_label} «{item.name}»")

        objects_text = "; ".join(object_names)

        if not objects_text:
            objects_text = f"активных объектов: {candidate.active_objects_count}"

        return (
            f"тип зоны: {zone_label}; активных объектов рядом: "
            f"{candidate.active_objects_count}; суммарный вес влияния: "
            f"{candidate.active_objects_weight}; основные объекты: {objects_text}"
        )

    def calculate_free_places_penalty(
        self,
        free_places: int,
        total_places: int,
    ) -> Decimal:
        if total_places <= 0:
            return Decimal("100")

        free_percent = Decimal(str(free_places)) / Decimal(str(total_places)) * Decimal("100")
        penalty = Decimal("100") - free_percent

        if penalty < Decimal("0"):
            return Decimal("0")

        if penalty > Decimal("100"):
            return Decimal("100")

        return penalty

    def calculate_candidate_score(
        self,
        parking: Parking,
        prediction: Prediction | None,
        distance_km: Decimal | None,
        request_count: int,
        infrastructure_score: Decimal,
    ) -> tuple[Decimal, Decimal, Decimal | None, int]:
        current_load_score = self.to_decimal(parking.load_percentage)

        if prediction is not None:
            predicted_load_score = self.to_decimal(prediction.predicted_load_percentage)
            expected_free_places = prediction.predicted_free_places
        else:
            predicted_load_score = current_load_score
            expected_free_places = parking.free_places or 0

        distance_score = self.normalize_distance_score(distance_km)
        free_places_penalty = self.calculate_free_places_penalty(
            free_places=expected_free_places,
            total_places=parking.total_places,
        )
        popularity_score = self.normalize_popularity_score(request_count)

        score = (
            distance_score * Decimal("0.22")
            + current_load_score * Decimal("0.22")
            + predicted_load_score * Decimal("0.28")
            + free_places_penalty * Decimal("0.14")
            + popularity_score * Decimal("0.08")
            + infrastructure_score * Decimal("0.06")
        )

        return (
            score.quantize(Decimal("0.0001")),
            current_load_score.quantize(Decimal("0.01")),
            predicted_load_score.quantize(Decimal("0.01")) if prediction is not None else None,
            expected_free_places,
        )

    def build_reason(
        self,
        candidate: RecommendationCandidate,
        use_prediction: bool,
    ) -> str:
        parking = candidate.parking

        distance_text = "расстояние не указано"

        if candidate.distance_km is not None:
            distance_text = f"расстояние примерно {candidate.distance_km} км"

        prediction_text = "прогноз не использовался"

        if use_prediction and candidate.predicted_load_percentage is not None:
            prediction_text = (
                f"прогнозируемая загруженность "
                f"{candidate.predicted_load_percentage}%"
            )

        infrastructure_text = self.build_infrastructure_text(candidate)

        return (
            f"Рекомендуется парковка «{parking.name}». "
            f"Текущая загруженность: {candidate.current_load_percentage}%, "
            f"ожидаемых свободных мест: {candidate.expected_free_places}, "
            f"{distance_text}, "
            f"{prediction_text}, "
            f"популярность за период: {candidate.request_count} запросов. "
            f"Инфраструктура: {infrastructure_text}. "
            f"Инфраструктурный риск спроса: {candidate.infrastructure_score}. "
            f"Итоговая оценка: {candidate.score}."
        )

    async def get_by_id(
        self,
        db: AsyncSession,
        recommendation_id: int,
    ) -> Recommendation:
        recommendation = await recommendation_repository.get_by_id(
            db=db,
            obj_id=recommendation_id,
        )

        if recommendation is None:
            raise NotFoundError(
                message="Recommendation not found",
                code="RECOMMENDATION_NOT_FOUND",
            )

        return recommendation

    async def get_by_user_id(
        self,
        db: AsyncSession,
        user_id: int,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Recommendation]:
        await user_service.get_active_by_id(db, user_id)

        return await recommendation_repository.get_by_user_id(
            db=db,
            user_id=user_id,
            limit=limit,
            offset=offset,
        )

    async def create_recommendation(
        self,
        db: AsyncSession,
        data: dict[str, Any],
    ) -> Recommendation:
        await user_service.get_active_by_id(db, data["user_id"])

        if data.get("requested_parking_id") is not None:
            await parking_service.get_by_id(db, data["requested_parking_id"])

        await parking_service.get_active_by_id(
            db=db,
            parking_id=data["recommended_parking_id"],
        )

        if data.get("parking_request_id") is not None:
            parking_request = await parking_request_repository.get_by_id(
                db=db,
                obj_id=data["parking_request_id"],
            )

            if parking_request is None:
                raise NotFoundError(
                    message="Parking request not found",
                    code="PARKING_REQUEST_NOT_FOUND",
                )

        recommendation = await recommendation_repository.create(db, data)
        await db.commit()
        await db.refresh(recommendation)

        return recommendation

    async def build_candidates(
        self,
        db: AsyncSession,
        active_parkings: list[Parking],
        user_latitude: Decimal | None,
        user_longitude: Decimal | None,
        use_prediction: bool,
        popularity_days: int,
    ) -> list[RecommendationCandidate]:
        parking_ids = [parking.id for parking in active_parkings]

        latest_predictions: dict[int, Prediction] = {}

        if use_prediction:
            latest_predictions = await (
                recommendation_scoring_repository.get_latest_predictions_by_parking_ids(
                    db=db,
                    parking_ids=parking_ids,
                )
            )

        request_counts = await recommendation_scoring_repository.get_request_counts_by_parking_ids(
            db=db,
            parking_ids=parking_ids,
            days=popularity_days,
        )

        infrastructure_map = await recommendation_scoring_repository.get_infrastructure_context_by_parking_ids(
            db=db,
            parking_ids=parking_ids,
        )

        candidates: list[RecommendationCandidate] = []

        for parking in active_parkings:
            if parking.free_places is not None and parking.free_places <= 0:
                continue

            distance_km = None

            if user_latitude is not None and user_longitude is not None:
                distance_km = self.calculate_distance_km(
                    lat1=user_latitude,
                    lon1=user_longitude,
                    lat2=parking.latitude,
                    lon2=parking.longitude,
                )

            prediction = latest_predictions.get(parking.id)
            request_count = request_counts.get(parking.id, 0)

            (
                zone_type,
                active_objects_count,
                active_objects_weight,
                infrastructure_score,
                nearby_objects,
            ) = self.get_infrastructure_context(
                infrastructure_map=infrastructure_map,
                parking=parking,
            )

            (
                score,
                current_load_percentage,
                predicted_load_percentage,
                expected_free_places,
            ) = self.calculate_candidate_score(
                parking=parking,
                prediction=prediction,
                distance_km=distance_km,
                request_count=request_count,
                infrastructure_score=infrastructure_score,
            )

            candidates.append(
                RecommendationCandidate(
                    parking=parking,
                    prediction=prediction,
                    distance_km=distance_km,
                    request_count=request_count,
                    score=score,
                    current_load_percentage=current_load_percentage,
                    predicted_load_percentage=predicted_load_percentage,
                    expected_free_places=expected_free_places,
                    zone_type=zone_type,
                    active_objects_count=active_objects_count,
                    active_objects_weight=active_objects_weight,
                    infrastructure_score=infrastructure_score,
                    nearby_objects=nearby_objects,
                )
            )

        return candidates

    async def recommend_best_parking(
        self,
        db: AsyncSession,
        user_id: int,
        requested_parking_id: int | None = None,
        parking_request_id: int | None = None,
        user_latitude: Decimal | None = None,
        user_longitude: Decimal | None = None,
        use_prediction: bool = True,
        popularity_days: int = 30,
    ) -> Recommendation:
        await user_service.get_active_by_id(db, user_id)

        if requested_parking_id is not None:
            await parking_service.get_by_id(db, requested_parking_id)

        parking_request = None

        if parking_request_id is not None:
            parking_request = await parking_request_repository.get_by_id(
                db=db,
                obj_id=parking_request_id,
            )

            if parking_request is None:
                raise NotFoundError(
                    message="Parking request not found",
                    code="PARKING_REQUEST_NOT_FOUND",
                )

            if parking_request.status in {
                ParkingRequestStatus.CANCELLED,
                ParkingRequestStatus.COMPLETED,
            }:
                raise ValidationError(
                    message="Cannot create recommendation for completed or cancelled request",
                    code="INVALID_REQUEST_STATUS_FOR_RECOMMENDATION",
                )

        active_parkings = await parking_repository.get_active_list(
            db=db,
            limit=1000,
            offset=0,
        )

        if not active_parkings:
            raise NotFoundError(
                message="No active parkings found",
                code="NO_ACTIVE_PARKINGS_FOUND",
            )

        candidates = await self.build_candidates(
            db=db,
            active_parkings=active_parkings,
            user_latitude=user_latitude,
            user_longitude=user_longitude,
            use_prediction=use_prediction,
            popularity_days=popularity_days,
        )

        if not candidates:
            raise ValidationError(
                message="No parking with free places found",
                code="NO_PARKING_WITH_FREE_PLACES",
            )

        best_candidate = min(candidates, key=lambda candidate: candidate.score)

        recommendation_data = {
            "user_id": user_id,
            "parking_request_id": parking_request_id,
            "requested_parking_id": requested_parking_id,
            "recommended_parking_id": best_candidate.parking.id,
            "reason": self.build_reason(
                candidate=best_candidate,
                use_prediction=use_prediction,
            ),
            "distance_km": best_candidate.distance_km,
            "current_load_percentage": best_candidate.current_load_percentage,
            "predicted_load_percentage": best_candidate.predicted_load_percentage,
            "expected_free_places": best_candidate.expected_free_places,
            "score": best_candidate.score,
        }

        recommendation = await recommendation_repository.create(
            db=db,
            data=recommendation_data,
        )

        if parking_request is not None:
            await parking_request_repository.update_status(
                db=db,
                parking_request=parking_request,
                status=ParkingRequestStatus.RECOMMENDED,
                recommendation_text=recommendation.reason,
            )

        await db.commit()
        await db.refresh(recommendation)

        logger.info(
            "Improved recommendation created | recommendation_id=%s user_id=%s recommended_parking_id=%s score=%s",
            recommendation.id,
            user_id,
            best_candidate.parking.id,
            best_candidate.score,
        )

        return recommendation

    async def recommend_for_parking_request(
        self,
        db: AsyncSession,
        parking_request_id: int,
        current_user_id: int,
        is_admin: bool = False,
        user_latitude: Decimal | None = None,
        user_longitude: Decimal | None = None,
        use_prediction: bool = True,
        popularity_days: int = 30,
    ) -> Recommendation:
        parking_request = await parking_request_repository.get_by_id(
            db=db,
            obj_id=parking_request_id,
        )

        if parking_request is None:
            raise NotFoundError(
                message="Parking request not found",
                code="PARKING_REQUEST_NOT_FOUND",
            )

        if not is_admin and parking_request.user_id != current_user_id:
            raise PermissionDeniedError(
                message="You do not have access to this parking request",
                code="PARKING_REQUEST_ACCESS_DENIED",
            )

        if parking_request.status in {
            ParkingRequestStatus.CANCELLED,
            ParkingRequestStatus.COMPLETED,
        }:
            raise ValidationError(
                message="Cannot recommend parking for completed or cancelled request",
                code="INVALID_REQUEST_STATUS_FOR_RECOMMENDATION",
            )

        final_latitude = user_latitude
        final_longitude = user_longitude

        if final_latitude is None:
            final_latitude = parking_request.user_latitude

        if final_longitude is None:
            final_longitude = parking_request.user_longitude

        return await self.recommend_best_parking(
            db=db,
            user_id=parking_request.user_id,
            requested_parking_id=parking_request.parking_id,
            parking_request_id=parking_request.id,
            user_latitude=final_latitude,
            user_longitude=final_longitude,
            use_prediction=use_prediction,
            popularity_days=popularity_days,
        )


recommendation_service = RecommendationService()