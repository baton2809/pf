import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { apiServiceManager } from '../services/api';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthContextType {
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isBackendAvailable: boolean;
  loginWithEmail: (email: string) => Promise<void>;
  loginWithGoogle: () => void;
  handleAuthCallback: (token: string) => Promise<void>;
  clearInvalidToken: () => void;
  isInitialized: boolean;
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
    // check if user is already logged in and initialize app
    const initializeAuth = async () => {
      try {
        // check if we have a stored token
        const token = localStorage.getItem('authToken');
        
        if (token) {
          const apiService = await apiServiceManager.getApiService();
          setIsBackendAvailable(apiService.isBackendAvailable);
          
          if (apiService.isBackendAvailable) {
            try {
              // try to validate token and get user data
              const user = await apiService.getUserProfile(token);
              setCurrentUser(user);
            } catch (error: any) {
              // token is invalid or expired, remove it
              console.log('token validation failed:', error.message);
              localStorage.removeItem('authToken');
            }
          } else {
            // use mock data if backend unavailable
            const user = await apiService.getUserProfile(token);
            setCurrentUser(user);
          }
        } else {
          // no token, just check backend availability
          const apiService = await apiServiceManager.getApiService();
          setIsBackendAvailable(apiService.isBackendAvailable);
        }
      } catch (error) {
        console.log('auth initialization failed, using mock data');
        setIsBackendAvailable(false);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  const login = (user: User) => {
    setCurrentUser(user);
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('authToken');
  };

  const loginWithEmail = async (email: string) => {
    const apiService = await apiServiceManager.getApiService();
    // for demo purposes, create mock token and user
    const mockToken = 'demo_token_' + Date.now();
    localStorage.setItem('authToken', mockToken);
    
    let user: User;
    if (apiService.isBackendAvailable) {
      // this won't work without proper backend, but fallback to mock
      user = await apiService.getUserProfile(mockToken);
    } else {
      user = {
        id: 'demo',
        name: email.split('@')[0],
        email: email
      };
    }
    setCurrentUser(user);
  };

  const loginWithGoogle = () => {
    // auto-login with mock user
    const mockUser: User = {
      id: 'mock_user_' + Date.now(),
      name: 'Demo User',
      email: 'demo@example.com'
    };
    const mockToken = 'mock_token_' + Date.now();
    localStorage.setItem('authToken', mockToken);
    setCurrentUser(mockUser);
  };

  const handleAuthCallback = async (token: string) => {
    localStorage.setItem('authToken', token);
    
    const apiService = await apiServiceManager.getApiService();
    
    try {
      const user = await apiService.getUserProfile(token);
      setCurrentUser(user);
    } catch (error: any) {
      console.error('failed to get user profile after callback:', error.message);
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
    loginWithEmail,
    loginWithGoogle,
    handleAuthCallback,
    clearInvalidToken,
    isInitialized
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};