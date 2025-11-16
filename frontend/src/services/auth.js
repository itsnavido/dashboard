// Authentication service
import api from './api';

// Get API URL from environment or use default
// For single deployment (same domain), use relative path. For separate deployments, use full URL
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000');

export const authService = {
  // Get current user
  getCurrentUser: async () => {
    try {
      const response = await api.get('/api/auth/me');
      return response.data;
    } catch (error) {
      return null;
    }
  },

  // Logout
  logout: async () => {
    try {
      await api.post('/api/auth/logout');
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  // Get Discord OAuth URL
  getDiscordAuthUrl: () => {
    // Use the same API_URL constant for consistency
    const authUrl = `${API_URL}/api/auth/discord`;
    // Debug log (remove in production if needed)
    if (import.meta.env.DEV) {
      console.log('Discord Auth URL:', authUrl);
      console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
    }
    return authUrl;
  }
};

