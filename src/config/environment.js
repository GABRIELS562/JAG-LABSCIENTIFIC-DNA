// Environment-based configuration
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const API_TIMEOUT = 30000; // 30 seconds

// Build API endpoints dynamically
const API_ENDPOINTS = {
  // Auth endpoints
  auth: {
    login: `${API_BASE_URL}/api/auth/login`,
    logout: `${API_BASE_URL}/api/auth/logout`,
    register: `${API_BASE_URL}/api/auth/register`,
    verify: `${API_BASE_URL}/api/auth/verify`,
  },
  
  // Sample endpoints
  samples: {
    base: `${API_BASE_URL}/api/samples`,
    batch: `${API_BASE_URL}/api/batch`,
    search: `${API_BASE_URL}/api/samples/search`,
    queues: `${API_BASE_URL}/api/samples/queues`,
  },
  
  // Genetic analysis endpoints
  genetic: {
    base: `${API_BASE_URL}/api/genetic-analysis`,
    cases: `${API_BASE_URL}/api/genetic-analysis/cases`,
    upload: `${API_BASE_URL}/api/genetic-analysis/upload`,
    results: `${API_BASE_URL}/api/genetic-analysis/results`,
    genemapper: `${API_BASE_URL}/api/genetic-analysis/genemapper-results`,
  },
  
  // Reports endpoints
  reports: {
    base: `${API_BASE_URL}/api/reports`,
    generate: `${API_BASE_URL}/api/reports/generate`,
    pdf: `${API_BASE_URL}/api/reports/pdf`,
  },
  
  // Admin endpoints
  admin: {
    users: `${API_BASE_URL}/api/admin/users`,
    settings: `${API_BASE_URL}/api/admin/settings`,
    audit: `${API_BASE_URL}/api/admin/audit`,
  },
};

// WebSocket Configuration
const WS_URL = isDevelopment 
  ? 'ws://localhost:3001' 
  : window.location.protocol === 'https:' 
    ? `wss://${window.location.host}` 
    : `ws://${window.location.host}`;

// Feature Flags
const FEATURES = {
  enableWebSocket: true,
  enableNotifications: true,
  enableOfflineMode: false,
  enableDebugMode: isDevelopment,
  enableAnalytics: isProduction,
};

// Export configuration
export const config = {
  isDevelopment,
  isProduction,
  API_BASE_URL,
  API_TIMEOUT,
  API_ENDPOINTS,
  WS_URL,
  FEATURES,
};

export default config;