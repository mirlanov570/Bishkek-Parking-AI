import { useEffect, useMemo, useState } from 'react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Card from '../common/Card';
import { getZoneTypeLabel } from '../../utils/infrastructure';

const BISHKEK_TIMEZONE_OFFSET = '+06:00';

const cleanParkingName = (name, fallback = 'Парковка') =>
  String(name || fallback)
    .replace(/^Demo Parking\s*[—-]\s*/i, '')
    .trim() || fallback;

const getBishkekDateParts = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bishkek',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type) => parts.find((part) => part.type === type)?.value || '';

  return {
    date: `${getPart('year')}-${getPart('month')}-${getPart('day')}`,
    time: `${getPart('hour')}:${getPart('minute')}`,
  };
};

const getRelativeBishkekDateParts = (hoursToAdd = 0) => {
  const date = new Date();
  date.setHours(date.getHours() + hoursToAdd);
  return getBishkekDateParts(date);
};

const getTomorrowMorningParts = () => {
  const nowParts = getBishkekDateParts();
  const [year, month, day] = nowParts.date.split('-').map(Number);
  const localDate = new Date(Date.UTC(year, month - 1, day + 1, 2, 0));
  const parts = getBishkekDateParts(localDate);

  return {
    date: parts.date,
    time: '09:00',
  };
};

const buildPredictionDatetime = ({ predictionDate, predictionTime }) => {
  const normalizedTime = predictionTime?.length === 5 ? `${predictionTime}:00` : predictionTime;
  return `${predictionDate}T${normalizedTime}${BISHKEK_TIMEZONE_OFFSET}`;
};

const formatParkingOption = (parking) => {
  const name = cleanParkingName(parking?.name || parking?.parking_name, `Парковка #${parking?.id}`);
  const address = parking?.address ? ` — ${parking.address}` : '';
  const freePlaces = parking?.free_places ?? parking?.freePlaces;
  const totalPlaces = parking?.total_places ?? parking?.totalPlaces;

  if (freePlaces !== undefined && totalPlaces !== undefined) {
    return `${name}${address} · свободно ${freePlaces}/${totalPlaces}`;
  }

  return `${name}${address}`;
};

function PredictionForm({ parkings = [], isLoading = false, isSubmitting = false, onSubmit }) {
  const defaults = useMemo(() => getBishkekDateParts(), []);

  const [parkingId, setParkingId] = useState('');
  const [predictionDate, setPredictionDate] = useState(defaults.date);
  const [predictionTime, setPredictionTime] = useState(defaults.time);
  const [formError, setFormError] = useState('');

  const selectedParking = useMemo(
    () => parkings.find((parking) => String(parking.id) === String(parkingId)),
    [parkingId, parkings],
  );

  useEffect(() => {
    if (!parkingId && parkings.length > 0) {
      setParkingId(String(parkings[0].id));
    }
  }, [parkingId, parkings]);

  const setPreset = (preset) => {
    const nextParts = preset();
    setPredictionDate(nextParts.date);
    setPredictionTime(nextParts.time);
    setFormError('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError('');

    if (!parkingId) {
      setFormError('Выберите парковку для прогноза.');
      return;
    }

    if (!predictionDate || !predictionTime) {
      setFormError('Выберите дату и время прогноза.');
      return;
    }

    onSubmit({
      parking_id: Number(parkingId),
      prediction_datetime: buildPredictionDatetime({ predictionDate, predictionTime }),
    });
  };

  const predictionText = predictionDate && predictionTime ? `${predictionDate} ${predictionTime}` : '—';

  return (
    <Card
      className="prediction-form-card prediction-form-card--modern"
      title="Сделать прогноз"
      subtitle="Выберите парковку и время поездки. Система рассчитает, насколько парковка будет загружена."
    >
      <form className="prediction-form prediction-form--modern" onSubmit={handleSubmit}>
        <label className="prediction-field prediction-field--full">
          <span>Парковка</span>
          <select
            className="form-input prediction-input"
            value={parkingId}
            onChange={(event) => {
              setParkingId(event.target.value);
              setFormError('');
            }}
            disabled={isLoading || isSubmitting || parkings.length === 0}
          >
            <option value="">{isLoading ? 'Загружаем парковки...' : 'Выберите парковку'}</option>
            {parkings.map((parking) => (
              <option key={parking.id} value={parking.id}>
                {formatParkingOption(parking)}
              </option>
            ))}
          </select>
        </label>

        {selectedParking && (
          <div className="prediction-selected-parking">
            <div>
              <strong>{cleanParkingName(selectedParking.name || selectedParking.parking_name)}</strong>
              <span>{selectedParking.address || 'Адрес не указан'}</span>
              <Badge variant="info">{getZoneTypeLabel(selectedParking.zone_type)}</Badge>
            </div>
            <div>
              <strong>
                {selectedParking.free_places ?? '—'} / {selectedParking.total_places ?? '—'}
              </strong>
              <span>свободно сейчас</span>
            </div>
          </div>
        )}

        <div className="prediction-form__grid prediction-form__grid--modern">
          <label className="prediction-field">
            <span>Дата</span>
            <input
              className="form-input prediction-input"
              type="date"
              min={defaults.date}
              value={predictionDate}
              onChange={(event) => {
                setPredictionDate(event.target.value);
                setFormError('');
              }}
              disabled={isSubmitting}
            />
          </label>

          <label className="prediction-field">
            <span>Время</span>
            <input
              className="form-input prediction-input"
              type="time"
              value={predictionTime}
              onChange={(event) => {
                setPredictionTime(event.target.value);
                setFormError('');
              }}
              disabled={isSubmitting}
            />
          </label>
        </div>

        <div className="prediction-presets" aria-label="Быстрый выбор времени">
          <button type="button" onClick={() => setPreset(() => getRelativeBishkekDateParts(1))}>
            Через 1 час
          </button>
          <button
            type="button"
            onClick={() =>
              setPreset(() => ({
                date: getBishkekDateParts().date,
                time: '18:00',
              }))
            }
          >
            Сегодня вечером
          </button>
          <button type="button" onClick={() => setPreset(getTomorrowMorningParts)}>
            Завтра утром
          </button>
        </div>

        <div className="prediction-form-summary">
          <span>Прогноз будет рассчитан для</span>
          <strong>{predictionText}</strong>
          <p>Backend также учтёт тип зоны, день недели, час и активные объекты рядом.</p>
        </div>

        {formError && <div className="form-error">{formError}</div>}

        <Button type="submit" fullWidth isLoading={isSubmitting} disabled={isLoading || parkings.length === 0}>
          Получить прогноз
        </Button>
      </form>
    </Card>
  );
}

export default PredictionForm;