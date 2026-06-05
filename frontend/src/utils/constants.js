export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Bishkek Parking AI';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL || 'http://127.0.0.1:8000';

export const UPLOADS_BASE_URL =
  import.meta.env.VITE_UPLOADS_BASE_URL || 'http://127.0.0.1:8000/uploads';

export const FRONTEND_BASE_URL = 'http://127.0.0.1:5173';

export const IS_DEVELOPMENT = import.meta.env.DEV;

export const PROJECT_LINKS = {
  backend: BACKEND_BASE_URL,
  swagger: `${BACKEND_BASE_URL}/docs`,
  frontend: FRONTEND_BASE_URL,
};

export const USER_ROLES = {
  ADMIN: 'admin',
  DRIVER: 'driver',
};

export const USER_ROLE_IDS = {
  ADMIN: 1,
  DRIVER: 2,
};

export const PARKING_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  MAINTENANCE: 'maintenance',
};

export const REQUEST_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELED: 'canceled',
};

export const LOAD_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

export const DEFAULT_PAGE_SIZE = 20;

export const HEALTH_ENDPOINTS = [
  {
    key: 'health',
    label: 'Backend health',
    method: 'GET',
    url: `${BACKEND_BASE_URL}/health`,
  },
  {
    key: 'healthDb',
    label: 'Database health',
    method: 'GET',
    url: `${BACKEND_BASE_URL}/health/db`,
  },
  {
    key: 'ping',
    label: 'API ping',
    method: 'GET',
    url: `${API_BASE_URL}/ping`,
  },
];