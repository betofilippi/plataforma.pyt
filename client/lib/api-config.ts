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

// Base URL do backend
export const getApiBaseUrl = () => {
  if (isDevelopment()) {
    // Em desenvolvimento, o backend Express roda na porta 4000
    // Mas o Vite proxy redireciona /api para o backend
    return window.location.origin; // Usa a mesma origem pois o Vite faz proxy de /api
  }
  // Em produção, usa o mesmo domínio
  return '';
};

// URLs específicas das APIs
export const API_URLS = {
  auth: `${getApiBaseUrl()}/api/auth`,
  database: `${getApiBaseUrl()}/api/database`,
  modules: `${getApiBaseUrl()}/api/modules`,
  settings: `${getApiBaseUrl()}/api/settings`,
  notifications: `${getApiBaseUrl()}/api/notifications`,
};

// Configurações de requisição
export const API_CONFIG = {
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
};

// Helper para adicionar token de autenticação
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