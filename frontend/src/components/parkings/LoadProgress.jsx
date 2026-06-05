import { formatLoadPercentage, getLoadClassName, getLoadLevel } from '../../utils/loadStatus';

const clampPercentage = (value) => {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return 0;
  }

  return Math.min(Math.max(numericValue, 0), 100);
};

function LoadProgress({ value = 0, level, label, statusLabel, compact = false }) {
  const normalizedLevel = getLoadLevel(level || value);
  const normalizedValue = clampPercentage(value);

  return (
    <div className={compact ? 'load-progress load-progress--compact' : 'load-progress'}>
      <div className="load-progress__meta">
        <span>{label}</span>
        <strong>{formatLoadPercentage(normalizedValue)}</strong>
      </div>

      <div
        className={`load-progress__track load-progress__track--${normalizedLevel}`}
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={Math.round(normalizedValue)}
      >
        <span style={{ width: `${normalizedValue}%` }} />
      </div>

      <span className={getLoadClassName(normalizedLevel)}>
        {statusLabel || normalizedLevel}
      </span>
    </div>
  );
}

export default LoadProgress;