/**
 * Configuration for API endpoints
 */

// Backend API base URL - defaults to development port, can be overridden
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3333';

// For production, set NEXT_PUBLIC_API_BASE_URL to your backend URL
// Example: NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
