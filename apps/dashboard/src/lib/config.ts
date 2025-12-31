/**
 * Configuration for API endpoints
 */

// Backend API base URL - defaults to development port, can be overridden
// 使用 localhost 而不是 127.0.0.1，以便与后端的 cookie domain: 'localhost' 匹配
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3333';

// For production, set NEXT_PUBLIC_API_BASE_URL to your backend URL
// Example: NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
