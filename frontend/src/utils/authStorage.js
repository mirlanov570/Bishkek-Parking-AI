const ACCESS_TOKEN_KEY = 'bishkek_parking_ai_access_token';
const REFRESH_TOKEN_KEY = 'bishkek_parking_ai_refresh_token';

const isStorageAvailable = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export const getAccessToken = () => {
  if (!isStorageAvailable()) {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const setAccessToken = (token) => {
  if (!isStorageAvailable() || !token) {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
};

export const removeAccessToken = () => {
  if (!isStorageAvailable()) {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = () => {
  if (!isStorageAvailable()) {
    return null;
  }

  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setRefreshToken = (token) => {
  if (!isStorageAvailable() || !token) {
    return;
  }

  window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const removeRefreshToken = () => {
  if (!isStorageAvailable()) {
    return;
  }

  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const clearAuthStorage = () => {
  removeAccessToken();
  removeRefreshToken();
};