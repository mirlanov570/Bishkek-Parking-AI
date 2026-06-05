import axiosClient from './axiosClient';
import {
  clearAuthStorage,
  setAccessToken,
  setRefreshToken,
} from '../utils/authStorage';

export const login = async (username, password) => {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const response = await axiosClient.post('/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const { access_token: accessToken, refresh_token: refreshToken } = response.data;

  if (accessToken) {
    setAccessToken(accessToken);
  }

  if (refreshToken) {
    setRefreshToken(refreshToken);
  }

  return response.data;
};

export const refresh = async (refreshToken) => {
  const response = await axiosClient.post('/auth/refresh', {
    refresh_token: refreshToken,
  });

  const { access_token: accessToken } = response.data;

  if (accessToken) {
    setAccessToken(accessToken);
  }

  return response.data;
};

export const me = async () => {
  const response = await axiosClient.get('/auth/me');
  return response.data;
};

export const logout = async () => {
  try {
    const response = await axiosClient.post('/auth/logout');
    return response.data;
  } finally {
    clearAuthStorage();
  }
};