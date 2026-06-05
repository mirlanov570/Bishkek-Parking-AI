import axiosClient from './axiosClient';

export const createRecommendation = async (data) => {
  const response = await axiosClient.post('/recommendations', data);
  return response.data;
};

export const getMyRecommendations = async (params = {}) => {
  const response = await axiosClient.get('/recommendations/my', { params });
  return response.data;
};

export const getRecommendation = async (id) => {
  const response = await axiosClient.get(`/recommendations/${id}`);
  return response.data;
};