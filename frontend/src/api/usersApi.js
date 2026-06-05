import axiosClient from './axiosClient';

export const getUsers = async (params = {}) => {
  const response = await axiosClient.get('/users', { params });
  return response.data;
};

export const getUser = async (id) => {
  const response = await axiosClient.get(`/users/${id}`);
  return response.data;
};

export const createUser = async (data) => {
  const response = await axiosClient.post('/users', data);
  return response.data;
};

export const updateUser = async (id, data) => {
  const response = await axiosClient.patch(`/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await axiosClient.delete(`/users/${id}`);
  return response.data;
};