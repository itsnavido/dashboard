// Authentication service
import api from './api';

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
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${apiUrl}/api/auth/discord`;
  }
};

