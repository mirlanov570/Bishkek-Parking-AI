import axiosClient from './axiosClient';

export const getParkings = async (params = {}) => {
  const response = await axiosClient.get('/parkings', { params });
  return response.data;
};

export const getAllParkings = async () => {
  const limit = 100;
  let offset = 0;
  let allItems = [];
  let shouldContinue = true;

  while (shouldContinue) {
    const response = await getParkings({ limit, offset });
    const items = Array.isArray(response?.items)
      ? response.items
      : Array.isArray(response)
        ? response
        : [];

    allItems = [...allItems, ...items];

    if (items.length < limit) {
      shouldContinue = false;
    } else {
      offset += limit;
    }
  }

  return {
    items: allItems,
    total: allItems.length,
    limit: allItems.length,
    offset: 0,
  };
};

export const getParking = async (id) => {
  const response = await axiosClient.get(`/parkings/${id}`);
  return response.data;
};

export const createParking = async (data) => {
  const response = await axiosClient.post('/parkings', data);
  return response.data;
};

export const updateParking = async (id, data) => {
  const response = await axiosClient.patch(`/parkings/${id}`, data);
  return response.data;
};

export const updateParkingStatus = async (id, data) => {
  const response = await axiosClient.patch(`/parkings/${id}/status`, data);
  return response.data;
};

export const deleteParking = async (id) => {
  const response = await axiosClient.delete(`/parkings/${id}`);
  return response.data;
};

export const getParkingHistory = async (id, params = {}) => {
  const response = await axiosClient.get(`/parkings/${id}/history`, { params });
  return response.data;
};