import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { authApiService, User } from '../services/authApi';
import { authTrainingApiService } from '../services/authTrainingApi';

export interface AuthContextType {
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isBackendAvailable: boolean;
  loginWithGoogle: () => void;
  loginWithEmail: (email: string) => Promise<void>;
  handleAuthCallback: (token: string) => Promise<void>;
  clearInvalidToken: () => void;
  isInitialized: boolean;
  getAuthToken: () => string | null;
  addAuthHeaders: (headers?: Record<string, string>) => Record<string, string>;
  trainingApi: typeof authTrainingApiService;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isBackendAvailable, setIsBackendAvailable] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // initialize auth training api service with auth headers provider
        authTrainingApiService.setAuthHeadersProvider(() => addAuthHeaders());

        // check backend availability
        const isHealthy = await authApiService.checkHealth();
        setIsBackendAvailable(isHealthy);

        // check if user is already logged in
        const token = localStorage.getItem('authToken');
        console.log('[AuthInit] Token from localStorage:', token ? 'present' : 'absent');
        
        if (token && isHealthy) {
          try {
            // validate token and get user data
            const user = await authApiService.getUserProfile(token);
            console.log('[AuthInit] Token valid, user:', user.email);
            setCurrentUser(user);
          } catch (error: any) {
            // token is invalid or expired, remove it
            console.log('[AuthInit] Token validation failed:', error.message);
            localStorage.removeItem('authToken');
          }
        } else {
          console.log('[AuthInit] No token or backend unhealthy');
        }
      } catch (error: any) {
        console.log('auth initialization failed:', error.message);
        setIsBackendAvailable(false);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  const getAuthToken = (): string | null => {
    return localStorage.getItem('authToken');
  };

  const addAuthHeaders = (headers: Record<string, string> = {}): Record<string, string> => {
    const token = localStorage.getItem('authToken');
    if (token) {
      return {
        ...headers,
        'Authorization': `Bearer ${token}`
      };
    }
    return headers;
  };

  const login = (user: User) => {
    setCurrentUser(user);
  };

  const logout = async () => {
    const token = getAuthToken();
    if (token) {
      try {
        await authApiService.logout(token);
      } catch (error: any) {
        console.warn('logout api call failed:', error.message);
      }
    }
    
    setCurrentUser(null);
    localStorage.removeItem('authToken');
  };

  const loginWithGoogle = () => {
    authApiService.loginWithGoogle();
  };

  const loginWithEmail = async (email: string) => {
    // simulate email login - in real app this would call API
    const mockUser: User = {
      id: Date.now().toString(),
      email: email,
      name: email.split('@')[0]
    };
    setCurrentUser(mockUser);
    localStorage.setItem('authToken', 'mock-token-' + Date.now());
  };

  const handleAuthCallback = async (token: string) => {
    console.log('[AuthCallback] Starting auth callback with token:', token.substring(0, 20) + '...');
    localStorage.setItem('authToken', token);
    
    try {
      const user = await authApiService.getUserProfile(token);
      console.log('[AuthCallback] Got user profile:', user.email);
      setCurrentUser(user);
      console.log('[AuthCallback] Auth context updated successfully');
    } catch (error: any) {
      console.error('[AuthCallback] Failed to get user profile after callback:', error.message);
      localStorage.removeItem('authToken');
      throw error;
    }
  };

  const clearInvalidToken = () => {
    localStorage.removeItem('authToken');
    setCurrentUser(null);
  };

  const isAuthenticated = currentUser !== null;

  const value: AuthContextType = {
    currentUser,
    login,
    logout,
    isAuthenticated,
    isBackendAvailable,
    loginWithGoogle,
    loginWithEmail,
    handleAuthCallback,
    clearInvalidToken,
    isInitialized,
    getAuthToken,
    addAuthHeaders,
    trainingApi: authTrainingApiService
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};