import { LOAD_LEVELS } from './constants';

const LOAD_LABELS = {
  [LOAD_LEVELS.LOW]: 'Свободно',
  [LOAD_LEVELS.MEDIUM]: 'Средняя загрузка',
  [LOAD_LEVELS.HIGH]: 'Высокая загрузка',
};

const LOAD_COLORS = {
  [LOAD_LEVELS.LOW]: 'green',
  [LOAD_LEVELS.MEDIUM]: 'yellow',
  [LOAD_LEVELS.HIGH]: 'red',
  green: 'green',
  yellow: 'yellow',
  red: 'red',
  gray: 'gray',
  blue: 'blue',
};

export const getLoadLevel = (value) => {
  if (typeof value === 'string') {
    const normalizedValue = value.toLowerCase();

    if (Object.values(LOAD_LEVELS).includes(normalizedValue)) {
      return normalizedValue;
    }
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return LOAD_LEVELS.LOW;
  }

  if (numericValue >= 80) {
    return LOAD_LEVELS.HIGH;
  }

  if (numericValue >= 50) {
    return LOAD_LEVELS.MEDIUM;
  }

  return LOAD_LEVELS.LOW;
};

export const getLoadLabel = (level) => {
  const normalizedLevel = getLoadLevel(level);
  return LOAD_LABELS[normalizedLevel] || 'Неизвестно';
};

export const getLoadColor = (levelOrColor) => {
  if (!levelOrColor) {
    return LOAD_COLORS[LOAD_LEVELS.LOW];
  }

  const normalizedValue = String(levelOrColor).toLowerCase();

  if (LOAD_COLORS[normalizedValue]) {
    return LOAD_COLORS[normalizedValue];
  }

  return LOAD_COLORS[getLoadLevel(levelOrColor)] || 'gray';
};

export const getLoadClassName = (level) => {
  const normalizedLevel = getLoadLevel(level);
  return `load-status load-status--${normalizedLevel}`;
};

export const formatLoadPercentage = (value) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return '—';
  }

  const normalizedValue = Math.min(Math.max(numericValue, 0), 100);
  return `${Math.round(normalizedValue)}%`;
};