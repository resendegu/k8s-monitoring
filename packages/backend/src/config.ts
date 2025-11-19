// Environment configuration utility
export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiBaseUrl: process.env.API_BASE_URL || '/api',
  
  // Session
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  secureCookies: process.env.SECURE_COOKIES === 'true', // Explicit control over secure cookies
  
  // CORS
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [],
  
  // Frontend URL (for production)
  frontendUrl: process.env.FRONTEND_URL || '',
  
  // Kubernetes
  kubeconfigPath: process.env.KUBECONFIG_PATH,
  inClusterMode: process.env.IN_CLUSTER_MODE === 'true',
  
  // Feature flags
  enableMetrics: process.env.ENABLE_METRICS !== 'false',
  
  // Check if running in production
  isProduction: () => process.env.NODE_ENV === 'production',
  isDevelopment: () => process.env.NODE_ENV !== 'production',
};

export default config;
