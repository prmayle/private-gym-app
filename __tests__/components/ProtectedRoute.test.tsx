import React from 'react'
import { render, screen } from '../utils/test-utils'
import ProtectedRoute from '@/components/ProtectedRoute'
import { mockUser, mockProfile } from '../__mocks__/supabase'

// Mock useRouter
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '',
}))

const TestComponent = () => <div data-testid="protected-content">Protected Content</div>

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render loading state when auth is loading', () => {
    // Mock loading state
    const AuthProvider = ({ children }: { children: React.ReactNode }) => {
      const mockAuthValue = {
        user: null,
        profile: null,
        loading: true,
        isAdmin: false,
        isMember: false,
        isTrainer: false,
        signOut: jest.fn(),
        refreshProfile: jest.fn(),
      }

      return React.createElement('div', { 'data-testid': 'auth-provider' }, children)
    }

    render(
      <AuthProvider>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </AuthProvider>
    )

    // Should show loading or redirect, not the protected content
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('should render children when user is authenticated with correct role', () => {
    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    )

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
  })

  it('should redirect when user is not authenticated', () => {
    const AuthProvider = ({ children }: { children: React.ReactNode }) => {
      const mockAuthValue = {
        user: null,
        profile: null,
        loading: false,
        isAdmin: false,
        isMember: false,
        isTrainer: false,
        signOut: jest.fn(),
        refreshProfile: jest.fn(),
      }

      return React.createElement('div', { 'data-testid': 'auth-provider' }, children)
    }

    render(
      <AuthProvider>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </AuthProvider>
    )

    expect(mockPush).toHaveBeenCalledWith('/login')
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('should restrict access based on required roles - admin only', () => {
    const AuthProvider = ({ children }: { children: React.ReactNode }) => {
      const mockAuthValue = {
        user: mockUser,
        profile: { ...mockProfile, role: 'member' as const },
        loading: false,
        isAdmin: false,
        isMember: true,
        isTrainer: false,
        signOut: jest.fn(),
        refreshProfile: jest.fn(),
      }

      return React.createElement('div', { 'data-testid': 'auth-provider' }, children)
    }

    render(
      <AuthProvider>
        <ProtectedRoute requiredRoles={['admin']}>
          <TestComponent />
        </ProtectedRoute>
      </AuthProvider>
    )

    expect(mockPush).toHaveBeenCalledWith('/login')
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('should allow access when user has required role', () => {
    const AuthProvider = ({ children }: { children: React.ReactNode }) => {
      const mockAuthValue = {
        user: mockUser,
        profile: { ...mockProfile, role: 'admin' as const },
        loading: false,
        isAdmin: true,
        isMember: false,
        isTrainer: false,
        signOut: jest.fn(),
        refreshProfile: jest.fn(),
      }

      return React.createElement('div', { 'data-testid': 'auth-provider' }, children)
    }

    render(
      <AuthProvider>
        <ProtectedRoute requiredRoles={['admin']}>
          <TestComponent />
        </ProtectedRoute>
      </AuthProvider>
    )

    expect(mockPush).not.toHaveBeenCalled()
    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
  })

  it('should allow access when user has one of multiple required roles', () => {
    const AuthProvider = ({ children }: { children: React.ReactNode }) => {
      const mockAuthValue = {
        user: mockUser,
        profile: { ...mockProfile, role: 'trainer' as const },
        loading: false,
        isAdmin: false,
        isMember: false,
        isTrainer: true,
        signOut: jest.fn(),
        refreshProfile: jest.fn(),
      }

      return React.createElement('div', { 'data-testid': 'auth-provider' }, children)
    }

    render(
      <AuthProvider>
        <ProtectedRoute requiredRoles={['admin', 'trainer']}>
          <TestComponent />
        </ProtectedRoute>
      </AuthProvider>
    )

    expect(mockPush).not.toHaveBeenCalled()
    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
  })

  it('should show unauthorized message when user lacks required role', () => {
    const AuthProvider = ({ children }: { children: React.ReactNode }) => {
      const mockAuthValue = {
        user: mockUser,
        profile: { ...mockProfile, role: 'member' as const },
        loading: false,
        isAdmin: false,
        isMember: true,
        isTrainer: false,
        signOut: jest.fn(),
        refreshProfile: jest.fn(),
      }

      return React.createElement('div', { 'data-testid': 'auth-provider' }, children)
    }

    render(
      <AuthProvider>
        <ProtectedRoute requiredRoles={['admin']} showUnauthorized>
          <TestComponent />
        </ProtectedRoute>
      </AuthProvider>
    )

    expect(screen.getByText(/not authorized/i)).toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })
})