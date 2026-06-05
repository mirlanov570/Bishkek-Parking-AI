import axios from 'axios';
import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
} from '../utils/authStorage';
import {
  dispatchApiErrorEvent,
  getApiErrorCode,
  getApiErrorDetail,
  normalizeApiError,
} from '../utils/apiErrors';
import { API_BASE_URL } from '../utils/constants';

let refreshTokenPromise = null;

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

const isAuthRefreshRequest = (url = '') => url.includes('/auth/refresh');
const isAuthLoginRequest = (url = '') => url.includes('/auth/login');

const createNormalizedError = (error) => {
  const normalizedError = normalizeApiError(error);

  error.apiError = normalizedError;
  error.message = normalizedError.message || error.message;

  return error;
};

const requestNewAccessToken = async (refreshToken) => {
  const response = await axios.post(
    `${API_BASE_URL}/auth/refresh`,
    { refresh_token: refreshToken },
    {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    },
  );

  return response.data;
};

axiosClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(createNormalizedError(error)),
);

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;
    const requestUrl = originalRequest?.url || '';

    const shouldTryRefresh =
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRefreshRequest(requestUrl) &&
      !isAuthLoginRequest(requestUrl);

    if (!shouldTryRefresh) {
      const normalizedError = createNormalizedError(error);
      dispatchApiErrorEvent(normalizedError);
      return Promise.reject(normalizedError);
    }

    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearAuthStorage();
      const normalizedError = createNormalizedError(error);
      dispatchApiErrorEvent(normalizedError);
      return Promise.reject(normalizedError);
    }

    originalRequest._retry = true;

    try {
      if (!refreshTokenPromise) {
        refreshTokenPromise = requestNewAccessToken(refreshToken).finally(() => {
          refreshTokenPromise = null;
        });
      }

      const tokenResponse = await refreshTokenPromise;
      const newAccessToken = tokenResponse?.access_token;

      if (!newAccessToken) {
        clearAuthStorage();
        const normalizedError = createNormalizedError(error);
        dispatchApiErrorEvent(normalizedError);
        return Promise.reject(normalizedError);
      }

      setAccessToken(newAccessToken);
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return axiosClient(originalRequest);
    } catch (refreshError) {
      clearAuthStorage();
      const normalizedRefreshError = createNormalizedError(refreshError);
      dispatchApiErrorEvent(normalizedRefreshError);
      return Promise.reject(normalizedRefreshError);
    }
  },
);

export { getApiErrorCode, getApiErrorDetail };
export default axiosClient;