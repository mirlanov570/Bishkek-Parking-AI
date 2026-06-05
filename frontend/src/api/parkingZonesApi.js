import axiosClient from './axiosClient';

export const getParkingZones = async (parkingId, params = {}) => {
  const response = await axiosClient.get(`/parkings/${parkingId}/zones`, { params });
  return response.data;
};

export const createParkingZone = async (parkingId, data) => {
  const response = await axiosClient.post(`/parkings/${parkingId}/zones`, data);
  return response.data;
};

export const getZone = async (zoneId) => {
  const response = await axiosClient.get(`/zones/${zoneId}`);
  return response.data;
};

export const updateZone = async (zoneId, data) => {
  const response = await axiosClient.patch(`/zones/${zoneId}`, data);
  return response.data;
};

export const updateZoneStatus = async (zoneId, data) => {
  const response = await axiosClient.patch(`/zones/${zoneId}/status`, data);
  return response.data;
};

export const deleteZone = async (zoneId) => {
  const response = await axiosClient.delete(`/zones/${zoneId}`);
  return response.data;
};