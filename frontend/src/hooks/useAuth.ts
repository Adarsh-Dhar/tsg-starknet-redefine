import { useState, useEffect, useCallback } from 'react';
import {
  getToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
  isTokenExpired,
  getUserEmail
} from '../lib/tokenStorage';

const API_BASE_URL = 'http://localhost:3333/api';

export interface AuthUser {
  id: string;
  email: string;
  starknetAddr: string | null;
  amountDelegated: number;
  lastTxHash?: string;
  lastUpdated?: string;
}

export interface UseAuthReturn {
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

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Debug: Log state changes
  useEffect(() => {
    console.log('[useAuth] State changed:', {
      hasToken: !!token,
      hasUser: !!user,
      isAuthenticated: !!token,
      user: user ? { email: user.email, amountDelegated: user.amountDelegated } : null
    });
  }, [user, token]);

  // Initialize auth state from storage
  useEffect(() => {
    initializeAuth();
  }, []);

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
            setLoading(false);
            return;
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

  const fetchUserInfoFn = useCallback(async (authToken: string): Promise<AuthUser | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token is invalid, clear it
          await clearTokens();
          setToken(null);
          setUser(null);
        }
        return null;
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      return null;
    }
  }, []);

  const refreshTokenFn = useCallback(async (): Promise<boolean> => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        // Refresh failed, clear tokens
        await clearTokens();
        setToken(null);
        setUser(null);
        return false;
      }

      const data = await response.json();
      const newToken = data.token;

      // Update token in storage
      await saveTokens(newToken, refreshToken);
      setToken(newToken);

      // Fetch updated user info
      const userInfo = await fetchUserInfoFn(newToken);
      setUser(userInfo);

      return true;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      await clearTokens();
      setToken(null);
      setUser(null);
      return false;
    }
  }, [fetchUserInfoFn]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      console.log('[useAuth] Login starting...');
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('[useAuth] Login failed:', data.error);
        throw new Error(data.error || 'Login failed');
      }

      const data = await response.json();
      const newToken = data.token;
      const newRefreshToken = data.refreshToken;
      console.log('[useAuth] Got token from server');

      // Save tokens
      await saveTokens(newToken, newRefreshToken, email);
      console.log('[useAuth] Tokens saved to storage');
      
      setToken(newToken);
      console.log('[useAuth] Token state updated');

      // Fetch user info
      console.log('[useAuth] Fetching user info...');
      const userInfo = await fetchUserInfoFn(newToken);
      console.log('[useAuth] User info fetched:', userInfo);
      
      setUser(userInfo);
      console.log('[useAuth] User state updated');
    } catch (error: any) {
      console.error('[useAuth] Login error:', error);
      throw error;
    }
  }, [fetchUserInfoFn]);

  const signup = useCallback(async (email: string, password: string) => {
    try {
      console.log('[useAuth] Signup starting...');
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('[useAuth] Signup failed:', data.error);
        throw new Error(data.error || 'Signup failed');
      }

      const data = await response.json();
      const newToken = data.token;
      const newRefreshToken = data.refreshToken;
      console.log('[useAuth] Got token from server');

      // Save tokens
      await saveTokens(newToken, newRefreshToken, email);
      console.log('[useAuth] Tokens saved to storage');
      
      setToken(newToken);
      console.log('[useAuth] Token state updated');

      // Fetch user info
      console.log('[useAuth] Fetching user info...');
      const userInfo = await fetchUserInfoFn(newToken);
      console.log('[useAuth] User info fetched:', userInfo);
      
      setUser(userInfo);
      console.log('[useAuth] User state updated');
    } catch (error: any) {
      console.error('[useAuth] Signup error:', error);
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

  return {
    user,
    token,
    loading,
    isAuthenticated: !!token, // Just check token, user will be fetched
    login,
    signup,
    logout,
    refreshToken: refreshTokenFn,
    fetchUserInfo
  };
}
