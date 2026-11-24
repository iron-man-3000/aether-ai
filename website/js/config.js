/**
 * Web App Configuration
 */
export const CONFIG = {
  // If running in development with separate ports, point to express backend
  DEFAULT_API_BASE_URL: window.location.port === '3000' ? '' : 'http://localhost:3000'
};
