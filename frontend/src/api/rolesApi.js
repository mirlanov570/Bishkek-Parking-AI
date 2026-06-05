import axiosClient from './axiosClient';

export const getRoles = async (params = {}) => {
  const response = await axiosClient.get('/roles', { params });
  return response.data;
};

export const getRole = async (id) => {
  const response = await axiosClient.get(`/roles/${id}`);
  return response.data;
};

export const createRole = async (data) => {
  const response = await axiosClient.post('/roles', data);
  return response.data;
};

export const updateRole = async (id, data) => {
  const response = await axiosClient.patch(`/roles/${id}`, data);
  return response.data;
};