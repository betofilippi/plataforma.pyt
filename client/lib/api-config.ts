/**
 * API Configuration - Centraliza todas as configurações de API
 */

// Detecta se está em desenvolvimento baseado na porta
const isDevelopment = () => {
  const port = window.location.port;
  // Portas comuns de desenvolvimento do Vite
  return port && (
    port.startsWith('30') || // 3000-3099 (inclui 3002)
    port.startsWith('31') || // 3100-3199
    port === '5173' ||       // Porta padrão do Vite
    port === '5174'           // Porta alternativa do Vite
  );
};

// Base URL do backend Express (Node.js)
export const getApiBaseUrl = () => {
  if (isDevelopment()) {
    // Em desenvolvimento, o backend Express roda na porta 4000
    // Mas o Vite proxy redireciona /api para o backend
    return window.location.origin; // Usa a mesma origem pois o Vite faz proxy de /api
  }
  // Em produção, usa o mesmo domínio
  return '';
};

// Base URL do Python backend (FastAPI)
export const getPythonApiBaseUrl = () => {
  // SEMPRE usa URLs relativas pois o Vite proxy cuida do redirecionamento
  // Em desenvolvimento: proxy para localhost:8001
  // Em produção: mesma origem
  return ''; // URL relativa - usa o proxy do Vite
};

// URLs específicas das APIs Node.js
export const API_URLS = {
  auth: `${getApiBaseUrl()}/api/auth`,
  database: `${getApiBaseUrl()}/api/database`,
  modules: `${getApiBaseUrl()}/api/modules`,
  settings: `${getApiBaseUrl()}/api/settings`,
  notifications: `${getApiBaseUrl()}/api/notifications`,
};

// URLs específicas do Python backend
export const PYTHON_API_URLS = {
  base: getPythonApiBaseUrl(),
  auth: `${getPythonApiBaseUrl()}/api/v1/auth`,
  users: `${getPythonApiBaseUrl()}/api/v1/users`,
  dashboard: `${getPythonApiBaseUrl()}/api/v1/dashboard`,
  websocket: isDevelopment() ? `ws://localhost:8001/api/v1/ws` : `${window.location.origin.replace('http', 'ws')}/api/v1/ws`,
  health: `${getPythonApiBaseUrl()}/health`,
  metrics: `${getPythonApiBaseUrl()}/metrics`,
};

// Configurações de requisição Node.js
export const API_CONFIG = {
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
};

// Configurações de requisição Python backend
export const PYTHON_API_CONFIG = {
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
  retries: 3,
  retryDelay: 1000,
};

// WebSocket configuration for Python backend
export const WEBSOCKET_CONFIG = {
  reconnectAttempts: 5,
  reconnectDelay: 3000,
  heartbeatInterval: 30000,
  timeout: 10000,
};

// Helper para adicionar token de autenticação (Node.js)
export const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    return {
      ...API_CONFIG.headers,
      'Authorization': `Bearer ${token}`,
    };
  }
  return API_CONFIG.headers;
};

// Helper para adicionar token de autenticação (Python backend)
export const getPythonAuthHeaders = () => {
  const token = localStorage.getItem('pythonAccessToken') || localStorage.getItem('accessToken');
  if (token) {
    return {
      ...PYTHON_API_CONFIG.headers,
      'Authorization': `Bearer ${token}`,
    };
  }
  return PYTHON_API_CONFIG.headers;
};

// Environment detection
export const getEnvironment = () => {
  return isDevelopment() ? 'development' : 'production';
};

// Debug logging configuration
export const DEBUG_CONFIG = {
  enabled: isDevelopment(),
  logRequests: true,
  logResponses: true,
  logErrors: true,
  logWebSocket: true,
};