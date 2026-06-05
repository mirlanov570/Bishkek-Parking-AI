import axiosClient from './axiosClient';

export const getPredictions = async (params = {}) => {
  const response = await axiosClient.get('/predictions', { params });
  return response.data;
};

export const trainPredictionModel = async (data = {}) => {
  const response = await axiosClient.post('/predictions/train', data);
  return response.data;
};

export const predictParkingLoad = async (data) => {
  const response = await axiosClient.post('/predictions/predict', data);
  return response.data;
};

export const getPrediction = async (id) => {
  const response = await axiosClient.get(`/predictions/${id}`);
  return response.data;
};