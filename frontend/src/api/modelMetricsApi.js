import axiosClient from './axiosClient';

export const getModelMetrics = async (params = {}) => {
  const response = await axiosClient.get('/model-metrics', { params });
  return response.data;
};

export const getLatestModelMetric = async (params = {}) => {
  const response = await axiosClient.get('/model-metrics/latest', { params });
  return response.data;
};

export const getModelMetric = async (id) => {
  const response = await axiosClient.get(`/model-metrics/${id}`);
  return response.data;
};