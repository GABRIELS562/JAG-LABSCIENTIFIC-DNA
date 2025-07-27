import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Token storage utilities
const TOKEN_KEY = 'labdna_auth_token';
const USER_KEY = 'labdna_user_data';

const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  remove: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};

const userStorage = {
  get: () => {
    try {
      const userData = localStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  },
  set: (user) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  remove: () => localStorage.removeItem(USER_KEY)
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = tokenStorage.get();
        const storedUser = userStorage.get();

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);

          // Verify token is still valid by making a request to /me
          try {
            const response = await fetch('/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${storedToken}`,
                'Content-Type': 'application/json'
              }
            });

            if (response.ok) {
              const data = await response.json();
              if (data.success) {
                // Update user data with latest from server
                setUser(data.data);
                userStorage.set(data.data);
              } else {
                // Token is invalid, clear auth state
                clearAuth();
              }
            } else {
              // Token is invalid, clear auth state
              clearAuth();
            }
          } catch (apiError) {
            console.warn('Failed to verify token, will retry on next request:', apiError);
            // Keep existing auth state but log the issue
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Clear all authentication state
  const clearAuth = () => {
    setUser(null);
    setToken(null);
    setError(null);
    tokenStorage.remove();
    userStorage.remove();
  };

  // Login function
  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const { token: newToken, user: userData } = data;
        
        // Store auth state
        setToken(newToken);
        setUser(userData);
        tokenStorage.set(newToken);
        userStorage.set(userData);

        return { success: true, user: userData };
      } else {
        const errorMessage = data.error?.message || data.error || 'Login failed';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = 'Network error during login';
      console.error('Login error:', error);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setLoading(true);
      
      // Call logout endpoint if token exists
      if (token) {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          // Even if logout endpoint fails, clear local state
          console.warn('Logout endpoint failed, clearing local state:', error);
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      setLoading(false);
    }
  };

  // Register function (for staff to create new users)
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);

      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return { success: true, user: data.data.user };
      } else {
        const errorMessage = data.error?.message || data.error || 'Registration failed';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = 'Network error during registration';
      console.error('Registration error:', error);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (userId, updateData) => {
    try {
      setLoading(true);
      setError(null);

      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/auth/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // If updating current user, update local state
        if (userId === user?.id) {
          const updatedUser = data.data.user;
          setUser(updatedUser);
          userStorage.set(updatedUser);
        }
        return { success: true, user: data.data.user };
      } else {
        const errorMessage = data.error?.message || data.error || 'Update failed';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = 'Network error during update';
      console.error('Profile update error:', error);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Refresh token
  const refreshToken = async () => {
    try {
      if (!token) {
        throw new Error('No token to refresh');
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const newToken = data.data.token;
        setToken(newToken);
        tokenStorage.set(newToken);
        return { success: true, token: newToken };
      } else {
        // Token refresh failed, clear auth state
        clearAuth();
        return { success: false, error: 'Token refresh failed' };
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      clearAuth();
      return { success: false, error: 'Token refresh failed' };
    }
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Check if user is staff
  const isStaff = () => {
    return hasRole('staff');
  };

  // Check if user is client
  const isClient = () => {
    return hasRole('client');
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!user && !!token;
  };

  // Get authorization header for API calls
  const getAuthHeader = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Clear any authentication errors
  const clearError = () => {
    setError(null);
  };

  const value = {
    // State
    user,
    token,
    loading,
    error,
    
    // Authentication methods
    login,
    logout,
    register,
    updateProfile,
    refreshToken,
    
    // Utility methods
    hasRole,
    isStaff,
    isClient,
    isAuthenticated,
    getAuthHeader,
    clearError,
    clearAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;