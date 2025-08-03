import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { createMockSupabaseClient, mockUser, mockProfile, mockSession } from '../__mocks__/supabase'

// Mock the Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}))

const TestComponent = () => {
  const auth = useAuth()
  
  return (
    <div>
      <div data-testid="loading">{auth.loading ? 'loading' : 'not loading'}</div>
      <div data-testid="user">{auth.user ? auth.user.email : 'no user'}</div>
      <div data-testid="profile">{auth.profile ? auth.profile.full_name : 'no profile'}</div>
      <div data-testid="role">{auth.profile?.role || 'no role'}</div>
      <div data-testid="is-admin">{auth.isAdmin ? 'admin' : 'not admin'}</div>
      <div data-testid="is-member">{auth.isMember ? 'member' : 'not member'}</div>
      <div data-testid="is-trainer">{auth.isTrainer ? 'trainer' : 'not trainer'}</div>
      <button onClick={auth.signOut} data-testid="sign-out">Sign Out</button>
      <button onClick={auth.refreshProfile} data-testid="refresh">Refresh</button>
    </div>
  )
}

describe('AuthContext', () => {
  let mockClient: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    mockClient = createMockSupabaseClient()
    const { createClient } = require('@/utils/supabase/client')
    createClient.mockReturnValue(mockClient)
    jest.clearAllMocks()
  })

  it('should provide initial loading state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('loading')).toHaveTextContent('loading')
    expect(screen.getByTestId('user')).toHaveTextContent('no user')
  })

  it('should handle authenticated user with admin profile', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not loading')
    })

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent(mockUser.email!)
      expect(screen.getByTestId('profile')).toHaveTextContent(mockProfile.full_name!)
      expect(screen.getByTestId('role')).toHaveTextContent('admin')
      expect(screen.getByTestId('is-admin')).toHaveTextContent('admin')
      expect(screen.getByTestId('is-member')).toHaveTextContent('not member')
      expect(screen.getByTestId('is-trainer')).toHaveTextContent('not trainer')
    })
  })

  it('should handle member role correctly', async () => {
    const memberProfile = { ...mockProfile, role: 'member' as const }
    mockClient.from = jest.fn().mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: memberProfile, error: null }),
    }))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('role')).toHaveTextContent('member')
      expect(screen.getByTestId('is-admin')).toHaveTextContent('not admin')
      expect(screen.getByTestId('is-member')).toHaveTextContent('member')
      expect(screen.getByTestId('is-trainer')).toHaveTextContent('not trainer')
    })
  })

  it('should handle trainer role correctly', async () => {
    const trainerProfile = { ...mockProfile, role: 'trainer' as const }
    mockClient.from = jest.fn().mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: trainerProfile, error: null }),
    }))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('role')).toHaveTextContent('trainer')
      expect(screen.getByTestId('is-admin')).toHaveTextContent('not admin')
      expect(screen.getByTestId('is-member')).toHaveTextContent('not member')
      expect(screen.getByTestId('is-trainer')).toHaveTextContent('trainer')
    })
  })

  it('should handle sign out', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not loading')
    })

    const signOutButton = screen.getByTestId('sign-out')
    
    await act(async () => {
      signOutButton.click()
    })

    expect(mockClient.auth.signOut).toHaveBeenCalled()
  })

  it('should handle refresh profile', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not loading')
    })

    const refreshButton = screen.getByTestId('refresh')
    
    await act(async () => {
      refreshButton.click()
    })

    // Should call the profile fetch again
    expect(mockClient.from).toHaveBeenCalledWith('profiles')
  })

  it('should handle authentication errors gracefully', async () => {
    mockClient.auth.getUser = jest.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'Auth error' },
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not loading')
      expect(screen.getByTestId('user')).toHaveTextContent('no user')
    })
  })

  it('should handle profile fetch errors gracefully', async () => {
    mockClient.from = jest.fn().mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Profile not found' } 
      }),
    }))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not loading')
      expect(screen.getByTestId('profile')).toHaveTextContent('no profile')
    })
  })

  it('should handle auth state changes', async () => {
    let authCallback: any

    mockClient.auth.onAuthStateChange = jest.fn().mockImplementation((callback) => {
      authCallback = callback
      return { data: { subscription: { unsubscribe: jest.fn() } } }
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Simulate sign out event
    await act(async () => {
      authCallback('SIGNED_OUT', null)
    })

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('no user')
    })

    // Simulate sign in event
    await act(async () => {
      authCallback('SIGNED_IN', mockSession)
    })

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent(mockUser.email!)
    })
  })
})