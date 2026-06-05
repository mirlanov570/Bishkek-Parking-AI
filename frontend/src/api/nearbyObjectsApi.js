import axiosClient from './axiosClient';

export const getParkingNearbyObjects = async (parkingId, params = {}) => {
  const response = await axiosClient.get(`/parkings/${parkingId}/nearby-objects`, { params });
  return response.data;
};

export const createParkingNearbyObject = async (parkingId, data) => {
  const response = await axiosClient.post(`/parkings/${parkingId}/nearby-objects`, data);
  return response.data;
};

export const getNearbyObjectsByType = async (objectType, params = {}) => {
  const response = await axiosClient.get('/nearby-objects', {
    params: {
      object_type: objectType,
      ...params,
    },
  });

  return response.data;
};

export const getNearbyObject = async (id) => {
  const response = await axiosClient.get(`/nearby-objects/${id}`);
  return response.data;
};

export const createNearbyObject = async (data) => {
  const response = await axiosClient.post('/nearby-objects', data);
  return response.data;
};

export const updateNearbyObject = async (id, data) => {
  const response = await axiosClient.patch(`/nearby-objects/${id}`, data);
  return response.data;
};

export const deleteNearbyObject = async (id) => {
  const response = await axiosClient.delete(`/nearby-objects/${id}`);
  return response.data;
};