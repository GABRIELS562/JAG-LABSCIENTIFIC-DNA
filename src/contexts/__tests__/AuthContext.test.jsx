import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'
import { mockLocalStorage } from '../../test/utils'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
})

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const renderAuthHook = () => {
    return renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>
    })
  }

  describe('useAuth Hook', () => {
    it('throws error when used outside AuthProvider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      expect(() => renderHook(() => useAuth())).toThrow(
        'useAuth must be used within an AuthProvider'
      )
      
      consoleError.mockRestore()
    })

    it('provides auth context when used inside AuthProvider', () => {
      const { result } = renderAuthHook()

      expect(result.current).toMatchObject({
        user: null,
        token: null,
        loading: expect.any(Boolean),
        error: null,
        login: expect.any(Function),
        logout: expect.any(Function),
        register: expect.any(Function),
        updateProfile: expect.any(Function),
        refreshToken: expect.any(Function),
        isAuthenticated: expect.any(Function),
        hasRole: expect.any(Function),
        isStaff: expect.any(Function),
        isClient: expect.any(Function),
        getAuthHeader: expect.any(Function),
        clearError: expect.any(Function),
        clearAuth: expect.any(Function)
      })
    })
  })

  describe('Authentication State Initialization', () => {
    it('initializes with stored auth data', async () => {
      const storedUser = { id: 1, username: 'testuser', role: 'staff' }
      const storedToken = 'stored-token'

      mockLocalStorage.getItem
        .mockImplementation((key) => {
          if (key === 'labdna_auth_token') return storedToken
          if (key === 'labdna_user_data') return JSON.stringify(storedUser)
          return null
        })

      // Mock successful token verification
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: storedUser
        })
      })

      const { result } = renderAuthHook()

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toEqual(storedUser)
      expect(result.current.token).toBe(storedToken)
      expect(result.current.isAuthenticated()).toBe(true)
    })

    it('clears invalid stored auth data', async () => {
      const storedUser = { id: 1, username: 'testuser', role: 'staff' }
      const storedToken = 'invalid-token'

      mockLocalStorage.getItem
        .mockImplementation((key) => {
          if (key === 'labdna_auth_token') return storedToken
          if (key === 'labdna_user_data') return JSON.stringify(storedUser)
          return null
        })

      // Mock failed token verification
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401
      })

      const { result } = renderAuthHook()

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toBe(null)
      expect(result.current.token).toBe(null)
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('labdna_auth_token')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('labdna_user_data')
    })

    it('handles corrupted stored user data', async () => {
      mockLocalStorage.getItem
        .mockImplementation((key) => {
          if (key === 'labdna_auth_token') return 'token'
          if (key === 'labdna_user_data') return 'invalid-json'
          return null
        })

      const { result } = renderAuthHook()

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toBe(null)
    })
  })

  describe('Login Functionality', () => {
    it('successfully logs in user', async () => {
      const credentials = { username: 'testuser', password: 'password123' }
      const userData = { id: 1, username: 'testuser', role: 'staff' }
      const token = 'auth-token'

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          token,
          user: userData
        })
      })

      const { result } = renderAuthHook()

      let loginResult
      await act(async () => {
        loginResult = await result.current.login(credentials)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      })

      expect(loginResult).toEqual({ success: true, user: userData })
      expect(result.current.user).toEqual(userData)
      expect(result.current.token).toBe(token)
      expect(result.current.isAuthenticated()).toBe(true)
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('labdna_auth_token', token)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('labdna_user_data', JSON.stringify(userData))
    })

    it('handles login failure', async () => {
      const credentials = { username: 'testuser', password: 'wrongpass' }

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          success: false,
          error: { message: 'Invalid credentials' }
        })
      })

      const { result } = renderAuthHook()

      let loginResult
      await act(async () => {
        loginResult = await result.current.login(credentials)
      })

      expect(loginResult).toEqual({ 
        success: false, 
        error: 'Invalid credentials' 
      })
      expect(result.current.user).toBe(null)
      expect(result.current.token).toBe(null)
      expect(result.current.error).toBe('Invalid credentials')
    })

    it('handles network errors during login', async () => {
      const credentials = { username: 'testuser', password: 'password123' }

      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderAuthHook()

      let loginResult
      await act(async () => {
        loginResult = await result.current.login(credentials)
      })

      expect(loginResult).toEqual({ 
        success: false, 
        error: 'Network error during login' 
      })
      expect(result.current.error).toBe('Network error during login')
    })
  })

  describe('Logout Functionality', () => {
    it('successfully logs out user', async () => {
      // First set up authenticated state
      const userData = { id: 1, username: 'testuser', role: 'staff' }
      const token = 'auth-token'

      mockLocalStorage.getItem
        .mockImplementation((key) => {
          if (key === 'labdna_auth_token') return token
          if (key === 'labdna_user_data') return JSON.stringify(userData)
          return null
        })

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: userData })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })

      const { result } = renderAuthHook()

      await waitFor(() => {
        expect(result.current.user).toEqual(userData)
      })

      await act(async () => {
        await result.current.logout()
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      expect(result.current.user).toBe(null)
      expect(result.current.token).toBe(null)
      expect(result.current.isAuthenticated()).toBe(false)
    })

    it('clears local state even if logout endpoint fails', async () => {
      const userData = { id: 1, username: 'testuser', role: 'staff' }
      const token = 'auth-token'

      mockLocalStorage.getItem
        .mockImplementation((key) => {
          if (key === 'labdna_auth_token') return token
          if (key === 'labdna_user_data') return JSON.stringify(userData)
          return null
        })

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: userData })
        })
        .mockRejectedValue(new Error('Network error'))

      const { result } = renderAuthHook()

      await waitFor(() => {
        expect(result.current.user).toEqual(userData)
      })

      await act(async () => {
        await result.current.logout()
      })

      expect(result.current.user).toBe(null)
      expect(result.current.token).toBe(null)
    })
  })

  describe('Registration Functionality', () => {
    it('successfully registers new user', async () => {
      const userData = { username: 'newuser', role: 'client', email: 'test@example.com' }
      const token = 'auth-token'
      const newUser = { id: 2, ...userData }

      // Set up authenticated staff user
      mockLocalStorage.getItem
        .mockImplementation((key) => {
          if (key === 'labdna_auth_token') return token
          if (key === 'labdna_user_data') return JSON.stringify({ id: 1, role: 'staff' })
          return null
        })

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { id: 1, role: 'staff' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { user: newUser }
          })
        })

      const { result } = renderAuthHook()

      await waitFor(() => {
        expect(result.current.user).toBeDefined()
      })

      let registerResult
      await act(async () => {
        registerResult = await result.current.register(userData)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })

      expect(registerResult).toEqual({ success: true, user: newUser })
    })

    it('fails registration without authentication', async () => {
      const userData = { username: 'newuser', role: 'client' }

      const { result } = renderAuthHook()

      let registerResult
      await act(async () => {
        registerResult = await result.current.register(userData)
      })

      expect(registerResult).toEqual({ 
        success: false, 
        error: 'Network error during registration' 
      })
    })
  })

  describe('Profile Update', () => {
    it('updates current user profile', async () => {
      const originalUser = { id: 1, username: 'testuser', role: 'staff' }
      const updatedUser = { ...originalUser, email: 'updated@example.com' }
      const token = 'auth-token'

      mockLocalStorage.getItem
        .mockImplementation((key) => {
          if (key === 'labdna_auth_token') return token
          if (key === 'labdna_user_data') return JSON.stringify(originalUser)
          return null
        })

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: originalUser })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { user: updatedUser }
          })
        })

      const { result } = renderAuthHook()

      await waitFor(() => {
        expect(result.current.user).toEqual(originalUser)
      })

      let updateResult
      await act(async () => {
        updateResult = await result.current.updateProfile(1, { email: 'updated@example.com' })
      })

      expect(updateResult).toEqual({ success: true, user: updatedUser })
      expect(result.current.user).toEqual(updatedUser)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'labdna_user_data', 
        JSON.stringify(updatedUser)
      )
    })
  })

  describe('Token Refresh', () => {
    it('successfully refreshes token', async () => {
      const originalToken = 'old-token'
      const newToken = 'new-token'
      const userData = { id: 1, username: 'testuser', role: 'staff' }

      mockLocalStorage.getItem
        .mockImplementation((key) => {
          if (key === 'labdna_auth_token') return originalToken
          if (key === 'labdna_user_data') return JSON.stringify(userData)
          return null
        })

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: userData })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { token: newToken }
          })
        })

      const { result } = renderAuthHook()

      await waitFor(() => {
        expect(result.current.token).toBe(originalToken)
      })

      let refreshResult
      await act(async () => {
        refreshResult = await result.current.refreshToken()
      })

      expect(refreshResult).toEqual({ success: true, token: newToken })
      expect(result.current.token).toBe(newToken)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('labdna_auth_token', newToken)
    })

    it('clears auth on failed token refresh', async () => {
      const originalToken = 'old-token'
      const userData = { id: 1, username: 'testuser', role: 'staff' }

      mockLocalStorage.getItem
        .mockImplementation((key) => {
          if (key === 'labdna_auth_token') return originalToken
          if (key === 'labdna_user_data') return JSON.stringify(userData)
          return null
        })

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: userData })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ success: false })
        })

      const { result } = renderAuthHook()

      await waitFor(() => {
        expect(result.current.user).toEqual(userData)
      })

      let refreshResult
      await act(async () => {
        refreshResult = await result.current.refreshToken()
      })

      expect(refreshResult).toEqual({ success: false, error: 'Token refresh failed' })
      expect(result.current.user).toBe(null)
      expect(result.current.token).toBe(null)
    })
  })

  describe('Utility Functions', () => {
    it('checks user roles correctly', async () => {
      const staffUser = { id: 1, username: 'staff', role: 'staff' }
      const clientUser = { id: 2, username: 'client', role: 'client' }

      mockLocalStorage.getItem
        .mockImplementation((key) => {
          if (key === 'labdna_auth_token') return 'token'
          if (key === 'labdna_user_data') return JSON.stringify(staffUser)
          return null
        })

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: staffUser })
      })

      const { result } = renderAuthHook()

      await waitFor(() => {
        expect(result.current.user).toEqual(staffUser)
      })

      expect(result.current.hasRole('staff')).toBe(true)
      expect(result.current.hasRole('client')).toBe(false)
      expect(result.current.isStaff()).toBe(true)
      expect(result.current.isClient()).toBe(false)
    })

    it('generates correct auth headers', async () => {
      const token = 'auth-token'
      const userData = { id: 1, username: 'testuser', role: 'staff' }

      mockLocalStorage.getItem
        .mockImplementation((key) => {
          if (key === 'labdna_auth_token') return token
          if (key === 'labdna_user_data') return JSON.stringify(userData)
          return null
        })

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: userData })
      })

      const { result } = renderAuthHook()

      await waitFor(() => {
        expect(result.current.token).toBe(token)
      })

      expect(result.current.getAuthHeader()).toEqual({
        Authorization: `Bearer ${token}`
      })
    })

    it('returns empty auth header when not authenticated', () => {
      const { result } = renderAuthHook()

      expect(result.current.getAuthHeader()).toEqual({})
    })

    it('clears errors correctly', async () => {
      const { result } = renderAuthHook()

      // Set an error
      await act(async () => {
        await result.current.login({ username: 'wrong', password: 'wrong' })
      })

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ success: false, error: { message: 'Invalid' } })
      })

      expect(result.current.error).toBeTruthy()

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBe(null)
    })
  })

  describe('Demo Mode Handling', () => {
    it('skips token verification in non-localhost environments', async () => {
      const originalHostname = window.location.hostname
      Object.defineProperty(window.location, 'hostname', {
        value: 'production.com',
        writable: true
      })

      const userData = { id: 1, username: 'testuser', role: 'staff' }
      const token = 'stored-token'

      mockLocalStorage.getItem
        .mockImplementation((key) => {
          if (key === 'labdna_auth_token') return token
          if (key === 'labdna_user_data') return JSON.stringify(userData)
          return null
        })

      const { result } = renderAuthHook()

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toEqual(userData)
      expect(result.current.token).toBe(token)
      expect(mockFetch).not.toHaveBeenCalledWith('/api/auth/me', expect.any(Object))

      // Restore original hostname
      Object.defineProperty(window.location, 'hostname', {
        value: originalHostname,
        writable: true
      })
    })
  })
})