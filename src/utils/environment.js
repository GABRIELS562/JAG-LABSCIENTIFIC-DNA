/**
 * Environment detection and configuration utilities for LIMS production deployment
 */

// Detect current environment
export const getEnvironment = () => {
  // Check build mode
  const isDevelopment = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;

  // Check hostname for environment detection
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  // Determine environment type
  let environmentType = 'development';
  if (isProduction && !isLocalhost) {
    environmentType = 'production';
  } else if (isProduction && isLocalhost) {
    environmentType = 'staging';
  }

  return {
    isDevelopment,
    isProduction,
    isLocalhost,
    environmentType,
    hostname
  };
};

// Get API base URL based on environment
export const getApiBaseUrl = () => {
  const env = getEnvironment();
  const envApiUrl = import.meta.env.VITE_API_URL;

  // If VITE_API_URL is explicitly set to empty string, use relative paths
  if (envApiUrl === '') {
    console.log('🔧 Using relative API paths for production deployment');
    return '/api';
  }

  // If VITE_API_URL is set to a specific URL, use it
  if (envApiUrl && envApiUrl !== 'undefined') {
    console.log('🔧 Using configured API URL:', envApiUrl);
    return envApiUrl;
  }

  // Auto-detect based on environment
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;

    // Production deployment - use relative paths
    if (env.isProduction && !env.isLocalhost) {
      console.log('🔧 Production environment detected - using relative API paths');
      return '/api';
    }

    // Development or local testing
    if (env.isLocalhost) {
      const devApiUrl = `${protocol}//${hostname}:3001/api`;
      console.log('🔧 Development environment detected - API URL:', devApiUrl);
      return devApiUrl;
    }
  }

  // Fallback
  console.log('🔧 Using fallback relative API paths');
  return '/api';
};

// Get application configuration based on environment
export const getAppConfig = () => {
  const env = getEnvironment();

  return {
    // API Configuration
    apiBaseUrl: getApiBaseUrl(),
    apiTimeout: env.isProduction ? 30000 : 60000,
    apiRetries: env.isProduction ? 3 : 1,

    // Caching Configuration
    enableCaching: true,
    cacheTimeout: env.isProduction ? 30000 : 5000,
    enableOfflineStorage: env.isProduction,

    // Error Handling
    enableErrorReporting: env.isProduction,
    showDetailedErrors: env.isDevelopment,
    enableErrorNotifications: true,

    // Performance
    enableServiceWorker: env.isProduction,
    enableAnalytics: env.isProduction && import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enableDebugLogs: env.isDevelopment || import.meta.env.VITE_ENABLE_DEBUG === 'true',

    // Features
    enableDevTools: env.isDevelopment,
    enableHotReload: env.isDevelopment,
    enableMockData: env.isDevelopment && import.meta.env.VITE_USE_MOCK_DATA === 'true',

    // Security
    enableCSRFProtection: env.isProduction,
    enableSecurity: env.isProduction,

    // Build info
    buildVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
    buildTimestamp: import.meta.env.VITE_BUILD_TIMESTAMP || new Date().toISOString(),

    // Environment info
    ...env
  };
};

// Check if running in production
export const isProduction = () => {
  return getEnvironment().isProduction && !getEnvironment().isLocalhost;
};

// Check if running in development
export const isDevelopment = () => {
  return getEnvironment().isDevelopment;
};

// Check if running locally
export const isLocalhost = () => {
  return getEnvironment().isLocalhost;
};

// Get health check URL
export const getHealthCheckUrl = () => {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}/health`;
};

// Get database connection info for display
export const getDatabaseInfo = () => {
  // Don't expose sensitive info in production
  if (isProduction()) {
    return {
      adapter: 'PostgreSQL',
      status: 'Connected',
      host: 'Production Database'
    };
  }

  return {
    adapter: import.meta.env.VITE_DB_ADAPTER || 'PostgreSQL',
    host: import.meta.env.VITE_DB_HOST || 'localhost',
    port: import.meta.env.VITE_DB_PORT || '5432',
    name: import.meta.env.VITE_DB_NAME || 'limsdb'
  };
};

// Feature flags based on environment
export const getFeatureFlags = () => {
  const env = getEnvironment();

  return {
    // Development only features
    showDebugPanel: env.isDevelopment,
    enableHotReload: env.isDevelopment,
    showBundleAnalyzer: env.isDevelopment,
    enableMockAPI: env.isDevelopment && import.meta.env.VITE_USE_MOCK_API === 'true',

    // Production features
    enableServiceWorker: env.isProduction,
    enableOfflineMode: env.isProduction,
    enableErrorReporting: env.isProduction,
    enablePerformanceMonitoring: env.isProduction,
    enableSecurityFeatures: env.isProduction,

    // Universal features
    enableConnectionStatus: true,
    enableErrorNotifications: true,
    enableLoadingSkeletons: true,
    enableRetryLogic: true,
    enableCaching: true
  };
};

// Log environment information
export const logEnvironmentInfo = () => {
  const config = getAppConfig();
  const features = getFeatureFlags();

  console.group('🔧 LIMS Environment Configuration');
  console.log('Environment:', config.environmentType);
  console.log('Build Version:', config.buildVersion);
  console.log('API Base URL:', config.apiBaseUrl);
  console.log('Production Mode:', config.isProduction);
  console.log('Development Mode:', config.isDevelopment);
  console.log('Localhost:', config.isLocalhost);
  console.log('Features:', features);
  console.groupEnd();

  return config;
};

// Export default configuration
export default {
  getEnvironment,
  getApiBaseUrl,
  getAppConfig,
  isProduction,
  isDevelopment,
  isLocalhost,
  getHealthCheckUrl,
  getDatabaseInfo,
  getFeatureFlags,
  logEnvironmentInfo
};