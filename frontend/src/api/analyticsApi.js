import axiosClient from './axiosClient';

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );

export const getDashboard = async () => {
  const response = await axiosClient.get('/analytics/dashboard');
  return response.data;
};

export const getPopularParkings = async (params = {}) => {
  const response = await axiosClient.get('/analytics/popular-parkings', {
    params: cleanParams(params),
  });
  return response.data;
};

export const getPeakHours = async (params = {}) => {
  const response = await axiosClient.get('/analytics/peak-hours', {
    params: cleanParams(params),
  });
  return response.data;
};

export const getDailyLoad = async (params = {}) => {
  const response = await axiosClient.get('/analytics/daily-load', {
    params: cleanParams(params),
  });
  return response.data;
};

export const getWeekdaysVsWeekends = async (params = {}) => {
  const response = await axiosClient.get('/analytics/weekdays-vs-weekends', {
    params: cleanParams(params),
  });
  return response.data;
};

export const getParkingLoad = async (parkingId, params = {}) => {
  const response = await axiosClient.get(`/analytics/parking-load/${parkingId}`, {
    params: cleanParams(params),
  });
  return response.data;
};