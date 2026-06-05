import axiosClient from './axiosClient';

export const createParkingRequest = async (data) => {
  const response = await axiosClient.post('/parking-requests', data);
  return response.data;
};

export const getMyParkingRequests = async (params = {}) => {
  const response = await axiosClient.get('/parking-requests/my', { params });
  return response.data;
};

export const getParkingRequests = async (params = {}) => {
  const response = await axiosClient.get('/parking-requests', { params });
  return response.data;
};

export const getParkingRequest = async (id) => {
  const response = await axiosClient.get(`/parking-requests/${id}`);
  return response.data;
};

export const updateParkingRequestStatus = async (id, data) => {
  const response = await axiosClient.patch(`/parking-requests/${id}/status`, data);
  return response.data;
};

export const cancelParkingRequest = async (id, data = {}) => {
  const response = await axiosClient.post(`/parking-requests/${id}/cancel`, data);
  return response.data;
};

export const recommendForParkingRequest = async (id, data = {}) => {
  const response = await axiosClient.post(`/parking-requests/${id}/recommend`, data);
  return response.data;
};