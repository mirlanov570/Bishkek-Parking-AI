export const ZONE_TYPE_OPTIONS = [
  { value: 'mixed', label: 'Смешанная зона' },
  { value: 'university', label: 'Учебная зона / вуз' },
  { value: 'school', label: 'Школьная зона' },
  { value: 'mall', label: 'Торговая зона / ТЦ' },
  { value: 'office', label: 'Офисная зона' },
  { value: 'residential', label: 'Жилой район' },
  { value: 'market', label: 'Рынок' },
  { value: 'entertainment', label: 'Развлечения' },
  { value: 'medical', label: 'Медицинская зона' },
  { value: 'park', label: 'Парк / прогулочная зона' },
];

export const NEARBY_OBJECT_TYPE_OPTIONS = [
  { value: 'university', label: 'Вуз' },
  { value: 'school', label: 'Школа' },
  { value: 'mall', label: 'ТЦ' },
  { value: 'cafe', label: 'Кафе' },
  { value: 'cinema', label: 'Кинотеатр' },
  { value: 'office', label: 'Офис' },
  { value: 'market', label: 'Рынок' },
  { value: 'residential', label: 'Жилой дом' },
  { value: 'hospital', label: 'Больница' },
  { value: 'park', label: 'Парк' },
  { value: 'other', label: 'Другое' },
];

export const WEEKDAY_OPTIONS = [
  { value: 1, short: 'Пн', label: 'Понедельник' },
  { value: 2, short: 'Вт', label: 'Вторник' },
  { value: 3, short: 'Ср', label: 'Среда' },
  { value: 4, short: 'Чт', label: 'Четверг' },
  { value: 5, short: 'Пт', label: 'Пятница' },
  { value: 6, short: 'Сб', label: 'Суббота' },
  { value: 7, short: 'Вс', label: 'Воскресенье' },
];

export const getZoneTypeLabel = (zoneType) => {
  const option = ZONE_TYPE_OPTIONS.find((item) => item.value === zoneType);
  return option?.label || 'Смешанная зона';
};

export const getNearbyObjectTypeLabel = (objectType) => {
  const option = NEARBY_OBJECT_TYPE_OPTIONS.find((item) => item.value === objectType);
  return option?.label || 'Объект';
};

export const parseActiveDays = (activeDays) =>
  String(activeDays || '1,2,3,4,5,6,7')
    .split(',')
    .map((day) => Number(day.trim()))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);

export const formatActiveDays = (activeDays) => {
  const days = parseActiveDays(activeDays);

  if (days.length === 7) return 'Каждый день';
  if (days.length === 5 && days.every((day) => day >= 1 && day <= 5)) return 'Пн–Пт';
  if (days.length === 2 && days.includes(6) && days.includes(7)) return 'Сб–Вс';

  return days
    .map((day) => WEEKDAY_OPTIONS.find((item) => item.value === day)?.short)
    .filter(Boolean)
    .join(', ') || '—';
};

export const formatObjectSchedule = (nearbyObject) => {
  const days = formatActiveDays(nearbyObject?.active_days);
  const openTime = nearbyObject?.open_time?.slice?.(0, 5);
  const closeTime = nearbyObject?.close_time?.slice?.(0, 5);

  if (!openTime || !closeTime) return `${days}, весь день`;

  return `${days}, ${openTime}–${closeTime}`;
};

export const getInfrastructureSummary = (features = {}) => {
  const activeObjectsCount = Number(features.active_objects_count || 0);
  const activeObjectsWeight = Number(features.active_objects_weight || 0);
  const requestsLastHour = Number(features.requests_last_hour || 0);

  return {
    zoneType: features.zone_type || 'mixed',
    activeObjectsCount,
    activeObjectsWeight,
    requestsLastHour,
    hasInfrastructure:
      activeObjectsCount > 0 ||
      activeObjectsWeight > 0 ||
      requestsLastHour > 0 ||
      Boolean(features.zone_type),
  };
};

export const getInfrastructureSummaryFromObjects = (objects = []) => {
  const activeObjects = objects.filter((item) => item?.is_active !== false);

  const totalWeight = activeObjects.reduce(
    (sum, item) => sum + Number(item?.influence_weight || 0),
    0,
  );

  const typeCounts = activeObjects.reduce((acc, item) => {
    const key = item?.object_type || 'other';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    activeObjects,
    activeObjectsCount: activeObjects.length,
    totalWeight,
    typeCounts,
  };
};