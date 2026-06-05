import { useCallback, useEffect, useState } from 'react';
import { getParking } from '../api/parkingsApi';
import { cancelParkingRequest, getMyParkingRequests, recommendForParkingRequest } from '../api/parkingRequestsApi';
import Button from '../components/common/Button';
import ErrorMessage from '../components/common/ErrorMessage';
import Loader from '../components/common/Loader';
import PageHeader from '../components/common/PageHeader';
import RecommendationCard from '../components/recommendations/RecommendationCard';
import ParkingRequestList from '../components/requests/ParkingRequestList';

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const getErrorText = (error, fallback) =>
  error?.apiError?.detail ||
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

function MyRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [parkingById, setParkingById] = useState({});
  const [latestRecommendation, setLatestRecommendation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionState, setActionState] = useState({});
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const loadParkingDetails = useCallback(async (requestItems) => {
    const ids = [...new Set(requestItems.map((request) => Number(request.parking_id)).filter(Boolean))];

    const loadedParkings = await Promise.all(
      ids.map(async (id) => {
        try {
          return await getParking(id);
        } catch {
          return null;
        }
      }),
    );

    const nextParkingById = {};
    loadedParkings.filter(Boolean).forEach((parking) => {
      nextParkingById[parking.id] = parking;
    });

    setParkingById(nextParkingById);
  }, []);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await getMyParkingRequests({ limit: 50, offset: 0 });
      const requestItems = extractItems(response);

      setRequests(requestItems);
      await loadParkingDetails(requestItems);
    } catch (requestError) {
      setRequests([]);
      setError(getErrorText(requestError, 'Не удалось загрузить мои запросы на парковку.'));
    } finally {
      setIsLoading(false);
    }
  }, [loadParkingDetails]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const loadRecommendationParkings = async (recommendation) => {
    const ids = [recommendation.recommended_parking_id, recommendation.requested_parking_id]
      .filter(Boolean)
      .map(Number);

    const loadedParkings = await Promise.all(
      ids.map(async (id) => {
        try {
          return await getParking(id);
        } catch {
          return null;
        }
      }),
    );

    setParkingById((currentValue) => {
      const nextValue = { ...currentValue };
      loadedParkings.filter(Boolean).forEach((parking) => {
        nextValue[parking.id] = parking;
      });
      return nextValue;
    });
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
      setFeedback(`Рекомендация для запроса на парковку #${request.id} получена.`);
      await loadRecommendationParkings(recommendation);
      await loadRequests();
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
      await loadRequests();
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
        title="Мои запросы на парковку"
        subtitle="Список запросов водителя на парковку, получение рекомендации и отмена активного запроса."
        badge="Requests"
        actions={
          <Button variant="secondary" onClick={loadRequests} isLoading={isLoading}>
            Обновить
          </Button>
        }
      />

      {feedback && <div className="recommendations-feedback recommendations-feedback--success">{feedback}</div>}

      {error && (
        <ErrorMessage
          title="Ошибка"
          message={error}
          action={
            <Button variant="secondary" onClick={loadRequests}>
              Повторить
            </Button>
          }
        />
      )}

      {latestRecommendation && (
        <section className="recommendations-section">
          <h2>Последняя рекомендация по запросу на парковку</h2>
          <RecommendationCard
            recommendation={latestRecommendation}
            recommendedParking={parkingById[latestRecommendation.recommended_parking_id]}
            requestedParking={parkingById[latestRecommendation.requested_parking_id]}
            isHighlighted
          />
        </section>
      )}

      {isLoading ? (
        <div className="recommendations-loader-card">
          <Loader text="Загружаем мои запросы на парковку..." />
        </div>
      ) : (
        <ParkingRequestList
          requests={requests}
          parkingById={parkingById}
          actionState={actionState}
          onRecommend={handleRecommendForRequest}
          onCancel={handleCancelRequest}
        />
      )}
    </div>
  );
}

export default MyRequestsPage;