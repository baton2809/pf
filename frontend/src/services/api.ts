import { User } from '../context/AuthContext';

export interface ApiService {
  isBackendAvailable: boolean;
  getUserProfile: (token: string) => Promise<User>;
  getUserData: () => Promise<any>;
  getSessions: (userId?: string) => Promise<any[]>;
  getSessionsByType: (type: string, userId?: string) => Promise<any[]>;
  checkConnection: () => Promise<boolean>;
}

class MockApiService implements ApiService {
  isBackendAvailable = false;

  async getUserProfile(token: string): Promise<User> {
    // simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // mock user data for demo mode
    return {
      id: '123',
      name: 'Артем Бутомов (Демо)',
      email: 'demo@example.com'
    };
  }

  async getUserData(): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      sessions: [],
      tutorials: [],
      statistics: {
        totalSessions: 0,
        averageScore: 0,
        improvementRate: 0
      }
    };
  }

  async getSessions(userId?: string): Promise<any[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [];
  }

  async getSessionsByType(type: string, userId?: string): Promise<any[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [];
  }

  async checkConnection(): Promise<boolean> {
    return false; // mock service always returns false for backend
  }
}

class RealApiService implements ApiService {
  isBackendAvailable = true;
  private baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  async getUserProfile(token: string): Promise<User> {
    const response = await fetch(`${this.baseUrl}/api/auth/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token invalid or expired');
      }
      throw new Error('failed to fetch user profile');
    }

    return response.json();
  }

  async getUserData(): Promise<any> {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${this.baseUrl}/api/auth/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token invalid or expired');
      }
      throw new Error('Failed to fetch user data');
    }
    return response.json();
  }

  async getSessions(userId?: string): Promise<any[]> {
    const url = new URL(`${this.baseUrl}/api/audio/sessions`);
    if (userId) {
      url.searchParams.append('userId', userId);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch sessions');
    }
    
    const data = await response.json();
    return data.sessions || [];
  }

  async getSessionsByType(type: string, userId?: string): Promise<any[]> {
    const url = new URL(`${this.baseUrl}/api/audio/sessions/type/${type}`);
    if (userId) {
      url.searchParams.append('userId', userId);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch sessions by type');
    }
    
    const data = await response.json();
    return data.sessions || [];
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET'
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
}

// create singleton for API service
class ApiServiceManager {
  private static instance: ApiServiceManager;
  private apiService: ApiService;
  private connectionChecked = false;
  private lastConnectionCheck = 0;
  private readonly CONNECTION_CACHE_TIME = 60000; // 1 minute
  private checkPromise: Promise<void> | null = null;

  private constructor() {
    this.apiService = new MockApiService(); // by default use mock
  }

  static getInstance(): ApiServiceManager {
    if (!ApiServiceManager.instance) {
      ApiServiceManager.instance = new ApiServiceManager();
    }
    return ApiServiceManager.instance;
  }

  async getApiService(): Promise<ApiService> {
    const now = Date.now();
    
    // if check was recent, use cache
    if (this.connectionChecked && (now - this.lastConnectionCheck < this.CONNECTION_CACHE_TIME)) {
      console.log('[API] Using cached service (last check:', new Date(this.lastConnectionCheck).toISOString(), ')');
      return this.apiService;
    }
    
    // if already checking, wait for that check to complete
    if (this.checkPromise) {
      console.log('[API] Connection check already in progress, waiting...');
      await this.checkPromise;
      return this.apiService;
    }
    
    // need to check connection
    if (!this.connectionChecked || (now - this.lastConnectionCheck >= this.CONNECTION_CACHE_TIME)) {
      console.log('[API] Starting connection check...');
      this.checkPromise = this.checkAndSetupService();
      
      try {
        await this.checkPromise;
      } finally {
        this.checkPromise = null;
      }
    }
    
    return this.apiService;
  }

  private async checkAndSetupService(): Promise<void> {
    this.lastConnectionCheck = Date.now();
    
    const realService = new RealApiService();
    const previousServiceType = this.apiService instanceof RealApiService ? 'real' : 'mock';
    
    try {
      const isBackendAvailable = await realService.checkConnection();
      
      if (isBackendAvailable) {
        this.apiService = realService;
        const currentServiceType = 'real';
        
        // log only when service changes or first startup
        if (!this.connectionChecked || previousServiceType !== currentServiceType) {
          console.log('[API] Backend available, switched to real service');
        } else {
          console.log('[API] Backend check successful, continuing with real service');
        }
      } else {
        const currentServiceType = 'mock';
        
        // use mock only if first attempt or was real service
        if (!this.connectionChecked || previousServiceType !== currentServiceType) {
          this.apiService = new MockApiService();
          console.log('[API] Backend unavailable, switched to mock service');
        } else {
          console.log('[API] Backend still unavailable, continuing with mock service');
        }
      }
    } catch (error) {
      const currentServiceType = 'mock';
      
      // use mock only if first attempt or was real service
      if (!this.connectionChecked || previousServiceType !== currentServiceType) {
        this.apiService = new MockApiService();
        console.log('[API] Backend connection error, switched to mock service:', error);
      } else {
        console.log('[API] Backend connection error, continuing with mock service');
      }
    }
    
    this.connectionChecked = true;
  }

  // forced reinitialization (for retry logic)
  async reinitialize(): Promise<void> {
    console.log('[API] Forcing service reinitialization...');
    
    // wait for any pending check to complete
    if (this.checkPromise) {
      await this.checkPromise;
    }
    
    this.connectionChecked = false;
    this.lastConnectionCheck = 0;
    await this.getApiService();
  }
}

export const apiServiceManager = ApiServiceManager.getInstance();