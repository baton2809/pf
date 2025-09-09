import { User } from '../context/AuthContext';

export const simulateEmailLogin = (email: string): User => {
  return {
    id: '123',
    name: email.split('@')[0],
    email: email
  };
};

export const simulateGoogleLogin = (): User => {
  return {
    id: '123',
    name: 'Артем Бутомов',
    email: 'artem@example.com'
  };
};

// utility to get auth token from localStorage
export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// utility to create auth headers for fetch requests
export const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// utility to handle auth errors and redirect to login
export const handleAuthError = (error: any, clearInvalidToken?: () => void) => {
  if (error.message.includes('Token invalid') || error.message.includes('401')) {
    if (clearInvalidToken) {
      clearInvalidToken();
    }
    window.location.href = '/login?error=session_expired';
  }
};