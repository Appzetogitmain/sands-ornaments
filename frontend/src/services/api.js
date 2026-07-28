import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const clearStoredSession = () => {
  const path = window.location.pathname;
  if (path.startsWith('/admin')) {
    localStorage.removeItem('sands_admin_token');
    localStorage.removeItem('sands_admin_user');
  } else if (path.startsWith('/seller')) {
    localStorage.removeItem('sands_seller_token');
    localStorage.removeItem('sands_seller_user');
  } else {
    localStorage.removeItem('sands_token');
    localStorage.removeItem('sands_current_user');
  }
  // Clean up legacy keys
  localStorage.removeItem('sellerToken');
  localStorage.removeItem('sellerAuth');
  localStorage.removeItem('currentSeller');
};

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const path = window.location.pathname;
    let tokenKey = 'sands_token';
    if (path.startsWith('/admin')) {
      tokenKey = 'sands_admin_token';
    } else if (path.startsWith('/seller')) {
      tokenKey = 'sands_seller_token';
    }

    const token = localStorage.getItem(tokenKey);
    if (token && token !== 'undefined' && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized (Expired token, etc.)
    if (error.response && error.response.status === 401 && !error.config?.skipUnauthorizedLogout) {
      clearStoredSession();
      const isAdminPath = window.location.pathname.startsWith('/admin');
      window.location.href = isAdminPath ? '/admin/login' : '/login';
    }

    if (error.response && error.response.status === 403 && error.response?.data?.error === 'ACCOUNT_BLOCKED') {
      clearStoredSession();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
