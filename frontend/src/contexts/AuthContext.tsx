import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  getToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
  isTokenExpired,
  getUserEmail
} from '../lib/tokenStorage';

const ENV_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
const API_BASE_URL_CANDIDATES = Array.from(
  new Set(
    [
      ENV_API_BASE_URL,
      'http://localhost:3333/api',
      'http://127.0.0.1:3333/api',
      'http://localhost:3000/api',
    ].filter(Boolean)
  )
);

let activeApiBaseUrl = API_BASE_URL_CANDIDATES[0] || 'http://localhost:3333/api';

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const ordered = [activeApiBaseUrl, ...API_BASE_URL_CANDIDATES.filter((u) => u !== activeApiBaseUrl)];
  let lastError: unknown;

  for (const base of ordered) {
    try {
      const response = await fetch(`${base}${path}`, init);
      activeApiBaseUrl = base;
      return response;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to reach auth server');
}

export interface Delegation {
  id: string;
  address: string;
  amountDelegated: number;
  lastUpdated: string;
  lastTxHash?: string | null;
  userId?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  starknetAddr: string | null;
  amountDelegated?: number;
  delegation?: Delegation | null;
  lastTxHash?: string;
  lastUpdated?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  fetchUserInfo: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Debug: Log state changes
  useEffect(() => {
    // This space is intentionally left blank after removing console.logs
  }, [user, token]);

  // Fetch user info helper
  const fetchUserInfoFn = useCallback(async (authToken: string): Promise<AuthUser | null> => {
    try {
      const response = await authFetch(`/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      return null;
    }
  }, []);

  // Refresh token helper
  const refreshTokenFn = useCallback(async (): Promise<boolean> => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const response = await authFetch(`/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      const email = await getUserEmail();
      await saveTokens(data.token, refreshToken, email || '');
      setToken(data.token);
      
      // Fetch user info with new token
      const userInfo = await fetchUserInfoFn(data.token);
      setUser(userInfo);
      
      return true;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return false;
    }
  }, [fetchUserInfoFn]);

  // Initialize auth state from storage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = await getToken();
        if (storedToken) {
          // Check if token is expired
          if (isTokenExpired(storedToken)) {
            // Try to refresh
            const refreshed = await refreshTokenFn();
            if (!refreshed) {
              // Refresh failed, clear tokens
              await clearTokens();
              setToken(null);
              setUser(null);
            }
          } else {
            setToken(storedToken);
            // Fetch user info
            const userInfo = await fetchUserInfoFn(storedToken);
            setUser(userInfo);
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [fetchUserInfoFn, refreshTokenFn]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authFetch(`/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('[AuthContext] Login failed:', data.error);
        throw new Error(data.error || 'Login failed');
      }

      const data = await response.json();
      const newToken = data.token;
      const newRefreshToken = data.refreshToken;

      // Save tokens
      await saveTokens(newToken, newRefreshToken, email);
      
      setToken(newToken);

      // Fetch user info
      const userInfo = await fetchUserInfoFn(newToken);
      
      setUser(userInfo);
    } catch (error: any) {
      console.error('[AuthContext] Login error:', error);
      throw error;
    }
  }, [fetchUserInfoFn]);

  const signup = useCallback(async (email: string, password: string) => {
    try {
      const response = await authFetch(`/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('[AuthContext] Signup failed:', data.error);
        throw new Error(data.error || 'Signup failed');
      }

      const data = await response.json();
      const newToken = data.token;
      const newRefreshToken = data.refreshToken;

      // Save tokens
      await saveTokens(newToken, newRefreshToken, email);
      
      setToken(newToken);

      // Fetch user info
      const userInfo = await fetchUserInfoFn(newToken);
      
      setUser(userInfo);
    } catch (error: any) {
      console.error('[AuthContext] Signup error:', error);
      throw error;
    }
  }, [fetchUserInfoFn]);

  const logout = useCallback(async () => {
    await clearTokens();
    setToken(null);
    setUser(null);
  }, []);

  const fetchUserInfo = useCallback(async (): Promise<AuthUser | null> => {
    if (!token) {
      return null;
    }
    const userInfo = await fetchUserInfoFn(token);
    setUser(userInfo);
    return userInfo;
  }, [token, fetchUserInfoFn]);

  const value: AuthContextType = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    signup,
    logout,
    refreshToken: refreshTokenFn,
    fetchUserInfo
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
