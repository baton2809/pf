import { API_URL } from '../config.js';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

class AuthApiService {
  private baseUrl = API_URL;

  async getUserProfile(token: string): Promise<User> {
    const response = await fetch(`${this.baseUrl}/api/auth/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('unauthorized');
      }
      throw new Error('failed to get user profile');
    }

    return response.json();
  }

  loginWithGoogle(): void {
    window.location.href = `${this.baseUrl}/api/auth/google`;
  }

  async logout(token: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
    } catch (error: any) {
      console.warn('logout request failed:', error.message);
    }
  }

  async refreshToken(token: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true'
      }
    });

    if (!response.ok) {
      throw new Error('token refresh failed');
    }

    const data = await response.json();
    return data.token;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      return response.ok;
    } catch (error: any) {
      return false;
    }
  }
}

export const authApiService = new AuthApiService();