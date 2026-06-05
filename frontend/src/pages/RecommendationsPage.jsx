import { useCallback, useEffect, useMemo, useState } from 'react';
import { getParking, getParkings } from '../api/parkingsApi';
import {
  cancelParkingRequest,
  getMyParkingRequests,
  recommendForParkingRequest,
} from '../api/parkingRequestsApi';
import { createRecommendation, getMyRecommendations } from '../api/recommendationsApi';
import { getParkingNearbyObjects } from '../api/nearbyObjectsApi';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import ErrorMessage from '../components/common/ErrorMessage';
import Loader from '../components/common/Loader';
import PageHeader from '../components/common/PageHeader';
import RecommendationCard from '../components/recommendations/RecommendationCard';
import RecommendationForm from '../components/recommendations/RecommendationForm';
import ParkingRequestList from '../components/requests/ParkingRequestList';

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const getErrorText = (error, fallback) => {
  const detail = error?.apiError?.detail || error?.response?.data?.detail;

  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((item) => item?.msg || item?.message || JSON.stringify(item)).join('; ');
  }

  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

const getUniqueIds = (items, fields) => {
  const ids = new Set();

  items.forEach((item) => {
    fields.forEach((field) => {
      if (item?.[field]) {
        ids.add(Number(item[field]));
      }
    });
  });

  return [...ids];
};

function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [parkings, setParkings] = useState([]);
  const [parkingById, setParkingById] = useState({});
  const [latestRecommendation, setLatestRecommendation] = useState(null);

  const [nearbyObjectsByParkingId, setNearbyObjectsByParkingId] = useState({});
  const [isInfrastructureLoading, setIsInfrastructureLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingRecommendation, setIsSubmittingRecommendation] = useState(false);
  const [actionState, setActionState] = useState({});
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const cacheParkings = useCallback((parkingItems) => {
    setParkingById((currentValue) => {
      const nextValue = { ...currentValue };

      parkingItems.forEach((parking) => {
        if (parking?.id) {
          nextValue[parking.id] = parking;
        }
      });

      return nextValue;
    });
  }, []);

  const loadParkingDetails = useCallback(
    async (ids) => {
      const normalizedIds = [...new Set(ids.filter(Boolean).map(Number))];

      if (normalizedIds.length === 0) return;

      const loadedParkings = await Promise.all(
        normalizedIds.map(async (id) => {
          try {
            return await getParking(id);
          } catch {
            return null;
          }
        }),
      );

      cacheParkings(loadedParkings.filter(Boolean));
    },
    [cacheParkings],
  );

  const loadNearbyObjectsForParkings = useCallback(async (ids) => {
    const normalizedIds = [...new Set(ids.filter(Boolean).map(Number))];

    if (normalizedIds.length === 0) return;

    setIsInfrastructureLoading(true);

    try {
      const loadedPairs = await Promise.all(
        normalizedIds.map(async (parkingId) => {
          try {
            const response = await getParkingNearbyObjects(parkingId, {
              limit: 100,
              offset: 0,
              only_active: true,
            });

            return [parkingId, extractItems(response)];
          } catch {
            return [parkingId, []];
          }
        }),
      );

      setNearbyObjectsByParkingId((currentValue) => {
        const nextValue = { ...currentValue };

        loadedPairs.forEach(([parkingId, objects]) => {
          nextValue[parkingId] = objects;
        });

        return nextValue;
      });
    } finally {
      setIsInfrastructureLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const [parkingsResponse, recommendationsResponse, requestsResponse] = await Promise.all([
        getParkings({ limit: 100, offset: 0 }),
        getMyRecommendations({ limit: 50, offset: 0 }),
        getMyParkingRequests({ limit: 50, offset: 0 }),
      ]);

      const parkingItems = extractItems(parkingsResponse);
      const recommendationItems = extractItems(recommendationsResponse);
      const requestItems = extractItems(requestsResponse);

      const recommendationParkingIds = getUniqueIds(recommendationItems, [
        'recommended_parking_id',
        'requested_parking_id',
      ]);

      const requestParkingIds = getUniqueIds(requestItems, ['parking_id']);
      const allRelatedParkingIds = [...recommendationParkingIds, ...requestParkingIds];

      setParkings(parkingItems);
      setRecommendations(recommendationItems);
      setRequests(requestItems);

      cacheParkings(parkingItems);

      await loadParkingDetails(allRelatedParkingIds);
      await loadNearbyObjectsForParkings(
        getUniqueIds(recommendationItems, ['recommended_parking_id']),
      );
    } catch (requestError) {
      setRecommendations([]);
      setRequests([]);
      setError(getErrorText(requestError, 'Не удалось загрузить рекомендации или мои запросы на парковку.'));
    } finally {
      setIsLoading(false);
    }
  }, [cacheParkings, loadParkingDetails, loadNearbyObjectsForParkings]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sortedRecommendations = useMemo(
    () =>
      [...recommendations].sort(
        (left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0),
      ),
    [recommendations],
  );

  const handleCreateRecommendation = async (payload) => {
    setIsSubmittingRecommendation(true);
    setError('');
    setFeedback('');

    try {
      const recommendation = await createRecommendation(payload);

      setLatestRecommendation(recommendation);
      setFeedback('Рекомендация успешно получена. Список обновлен.');

      await loadParkingDetails([
        recommendation.recommended_parking_id,
        recommendation.requested_parking_id,
      ]);

      await loadNearbyObjectsForParkings([recommendation.recommended_parking_id]);
      await loadData();
    } catch (requestError) {
      setError(getErrorText(requestError, 'Не удалось получить рекомендацию.'));
    } finally {
      setIsSubmittingRecommendation(false);
    }
  };

  const handleRecommendForRequest = async (request) => {
    setActionState((currentValue) => ({ ...currentValue, [request.id]: 'recommend' }));
    setError('');
    setFeedback('');

    try {
      const recommendation = await recommendForParkingRequest(request.id, {
        user_latitude: request.user_latitude || undefined,
        user_longitude: request.user_longitude || undefined,
        use_prediction: true,
        popularity_days: 30,
      });

      setLatestRecommendation(recommendation);
      setFeedback(`Рекомендация для запроса на парковку #${request.id} успешно получена.`);

      await loadParkingDetails([
        recommendation.recommended_parking_id,
        recommendation.requested_parking_id,
      ]);

      await loadNearbyObjectsForParkings([recommendation.recommended_parking_id]);
      await loadData();
    } catch (requestError) {
      setError(getErrorText(requestError, `Не удалось получить рекомендацию для запроса на парковку #${request.id}.`));
    } finally {
      setActionState((currentValue) => {
        const nextValue = { ...currentValue };
        delete nextValue[request.id];
        return nextValue;
      });
    }
  };

  const handleCancelRequest = async (request) => {
    setActionState((currentValue) => ({ ...currentValue, [request.id]: 'cancel' }));
    setError('');
    setFeedback('');

    try {
      await cancelParkingRequest(request.id, {
        reason: 'Cancelled from frontend by driver',
      });

      setFeedback(`Запрос на парковку #${request.id} отменен.`);
      await loadData();
    } catch (requestError) {
      setError(getErrorText(requestError, `Не удалось отменить запрос на парковку #${request.id}.`));
    } finally {
      setActionState((currentValue) => {
        const nextValue = { ...currentValue };
        delete nextValue[request.id];
        return nextValue;
      });
    }
  };

  return (
    <div className="page-stack recommendations-page">
      <PageHeader
        title="Рекомендации"
        subtitle="Получение AI-рекомендации, история рекомендаций и мои запросы на парковку."
        badge="Stage 9"
        actions={
          <Button variant="secondary" onClick={loadData} isLoading={isLoading}>
            Обновить
          </Button>
        }
      />

      {feedback && (
        <div className="recommendations-feedback recommendations-feedback--success">
          {feedback}
        </div>
      )}

      {error && (
        <ErrorMessage
          title="Ошибка"
          message={error}
          action={
            <Button variant="secondary" onClick={loadData}>
              Повторить
            </Button>
          }
        />
      )}

      {isLoading ? (
        <div className="recommendations-loader-card">
          <Loader text="Загружаем рекомендации и запросы на парковку..." />
        </div>
      ) : (
        <>
          <section className="recommendations-layout">
            <RecommendationForm
              parkings={parkings}
              onSubmit={handleCreateRecommendation}
              isSubmitting={isSubmittingRecommendation}
            />

            <Card
              className="recommendations-help-card recommendations-help-card--infrastructure"
              title="Как считается рекомендация"
              subtitle="Backend выбирает парковку с минимальным score. Чем ниже score, тем лучше вариант."
            >
              <div className="recommendations-help-card__list">
                <div>
                  <strong>Загрузка</strong>
                  <span>Учитываются текущая и прогнозируемая загруженность.</span>
                </div>
                <div>
                  <strong>Свободные места</strong>
                  <span>Парковки без свободных мест не рекомендуются.</span>
                </div>
                <div>
                  <strong>Расстояние</strong>
                  <span>Если указаны координаты пользователя, считается distance_km.</span>
                </div>
                <div>
                  <strong>Популярность</strong>
                  <span>Параметр popularity_days задает период анализа запросов.</span>
                </div>
                <div>
                  <strong>Инфраструктура</strong>
                  <span>Учитываются тип зоны и активные объекты рядом: вузы, школы, ТЦ, кафе, кинотеатры и офисы.</span>
                </div>
              </div>

              {isInfrastructureLoading && (
                <div className="recommendations-feedback">
                  Загружаем инфраструктуру для рекомендаций...
                </div>
              )}
            </Card>
          </section>

          {latestRecommendation && (
            <section className="recommendations-section">
              <h2>Последняя полученная рекомендация</h2>
              <RecommendationCard
                recommendation={latestRecommendation}
                recommendedParking={parkingById[latestRecommendation.recommended_parking_id]}
                requestedParking={parkingById[latestRecommendation.requested_parking_id]}
                nearbyObjects={
                  nearbyObjectsByParkingId[latestRecommendation.recommended_parking_id] || []
                }
                isHighlighted
              />
            </section>
          )}

          <section className="recommendations-section">
            <div className="recommendations-section__header">
              <div>
                <h2>Мои запросы на парковку</h2>
                <p>
                  Запросы на парковку создаются на странице парковок. Здесь можно получить
                  рекомендацию или отменить запрос.
                </p>
              </div>
            </div>

            <ParkingRequestList
              requests={requests}
              parkingById={parkingById}
              actionState={actionState}
              onRecommend={handleRecommendForRequest}
              onCancel={handleCancelRequest}
            />
          </section>

          <section className="recommendations-section">
            <div className="recommendations-section__header">
              <div>
                <h2>Список моих рекомендаций</h2>
                <p>История ответов backend по endpoint GET /api/v1/recommendations/my.</p>
              </div>
            </div>

            {sortedRecommendations.length === 0 ? (
              <EmptyState
                title="Рекомендаций пока нет"
                description="Заполните форму выше или получите рекомендацию по одному из запросов на парковку."
                icon="★"
              />
            ) : (
              <div className="recommendations-grid">
                {sortedRecommendations.map((recommendation) => (
                  <RecommendationCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    recommendedParking={parkingById[recommendation.recommended_parking_id]}
                    requestedParking={parkingById[recommendation.requested_parking_id]}
                    nearbyObjects={
                      nearbyObjectsByParkingId[recommendation.recommended_parking_id] || []
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default RecommendationsPage;