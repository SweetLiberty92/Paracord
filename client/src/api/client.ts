import axios from 'axios';
import { API_BASE_URL } from '../lib/apiBaseUrl';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

const clearPersistedAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('auth-storage');
};

// Auth interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && token !== 'null' && token !== 'undefined') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Error interceptor
apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config as { _retry?: boolean; url?: string; headers?: Record<string, string> };
    const token = localStorage.getItem('token');
    if (
      err.response?.status === 401 &&
      token &&
      !original?._retry &&
      original?.url !== '/auth/refresh'
    ) {
      original._retry = true;
      try {
        const refresh = await apiClient.post<{ token: string }>('/auth/refresh');
        const nextToken = refresh.data.token;
        localStorage.setItem('token', nextToken);
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${nextToken}`;
        return apiClient.request(original);
      } catch {
        clearPersistedAuth();
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }
    if (err.response?.status === 401) {
      clearPersistedAuth();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
