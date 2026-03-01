/**
 * Token Storage Utility
 * Manages JWT tokens using chrome.storage.local for the extension
 */

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_EMAIL_KEY = 'user_email';

interface StorageData {
  token?: string;
  refreshToken?: string;
  userEmail?: string;
}

/**
 * Get token from chrome.storage.local
 */
export async function getToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(TOKEN_KEY, (result) => {
      resolve(result[TOKEN_KEY] || null);
    });
  });
}

/**
 * Get refresh token from chrome.storage.local
 */
export async function getRefreshToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(REFRESH_TOKEN_KEY, (result) => {
      resolve(result[REFRESH_TOKEN_KEY] || null);
    });
  });
}

/**
 * Save tokens to chrome.storage.local
 */
export async function saveTokens(token: string, refreshToken: string, email?: string): Promise<void> {
  return new Promise((resolve) => {
    const data: StorageData = {
      token,
      refreshToken,
    };
    if (email) {
      data.userEmail = email;
    }
    chrome.storage.local.set(data, () => {
      resolve();
    });
  });
}

/**
 * Clear all tokens from chrome.storage.local
 */
export async function clearTokens(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_EMAIL_KEY], () => {
      resolve();
    });
  });
}

/**
 * Get stored user email
 */
export async function getUserEmail(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(USER_EMAIL_KEY, (result) => {
      resolve(result[USER_EMAIL_KEY] || null);
    });
  });
}

/**
 * Check if token exists
 */
export async function hasToken(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}

/**
 * Decode JWT token (basic decoding, doesn't verify signature)
 */
export function decodeToken(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }
  // exp is in seconds, Date.now() is in milliseconds
  return decoded.exp * 1000 < Date.now();
}

/**
 * Get Authorization header value
 */
export async function getAuthHeader(): Promise<string | null> {
  const token = await getToken();
  return token ? `Bearer ${token}` : null;
}
