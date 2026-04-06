import axios from 'axios';

export const API_URL_STORAGE_KEY = 'expluse_api_url';

export const normalizeApiBaseUrl = (value) => {
  const trimmedValue = (value || '').trim().replace(/\/+$/, '');

  if (!trimmedValue) {
    return '';
  }

  return trimmedValue.endsWith('/api') ? trimmedValue : `${trimmedValue}/api`;
};

export const getApiBaseUrl = () => {
  const savedUrl = normalizeApiBaseUrl(localStorage.getItem(API_URL_STORAGE_KEY));
  const envUrl = normalizeApiBaseUrl(process.env.REACT_APP_API_URL);

  return savedUrl || envUrl || 'http://127.0.0.1:8000/api';
};

const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();

    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

export const predictRppg = (payload) => api.post('/predict', payload);

export default api;
