import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createParkingRequest } from '../../api/parkingRequestsApi';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import Button from '../common/Button';

const getErrorText = (error, fallback) =>
  error?.apiError?.detail || error?.response?.data?.detail || error?.message || fallback;

function ParkingRequestButton({ parking, fullWidth = false, onSuccess }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const isInactive = parking?.is_active === false;
  const hasNoFreePlaces = Number(parking?.free_places) <= 0;
  const isDisabled = isInactive || hasNoFreePlaces;

  const disabledTitle = isInactive
    ? t('parkings.requestDisabledInactive')
    : hasNoFreePlaces
      ? t('parkings.requestDisabledFull')
      : '';

  const handleClick = async () => {
    setFeedback(null);

    if (!isAuthenticated) {
      navigate('/login', { replace: true, state: { from: { pathname: '/parkings' } } });
      return;
    }

    if (isDisabled || !parking?.id) {
      return;
    }

    setIsLoading(true);

    try {
      const createdRequest = await createParkingRequest({
        parking_id: parking.id,
        selected_zone_id: null,
        user_latitude: null,
        user_longitude: null,
      });

      setFeedback({ type: 'success', message: t('parkings.requestSuccess') });

      if (onSuccess) {
        onSuccess(createdRequest);
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorText(error, t('parkings.requestError')),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="parking-request">
      <Button
        variant="primary"
        fullWidth={fullWidth}
        isLoading={isLoading}
        disabled={isDisabled}
        onClick={handleClick}
        title={disabledTitle || t('parkings.findPlace')}
      >
        {t('parkings.findPlace')}
      </Button>

      {disabledTitle && <small className="parking-request__hint">{disabledTitle}</small>}

      {feedback && (
        <small className={`parking-request__feedback parking-request__feedback--${feedback.type}`}>
          {feedback.message}
        </small>
      )}
    </div>
  );
}

export default ParkingRequestButton;
