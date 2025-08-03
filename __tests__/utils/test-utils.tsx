import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { mockUser, mockProfile } from '../__mocks__/supabase'

// Mock AuthContext with default values
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const mockAuthValue = {
    user: mockUser,
    profile: mockProfile,
    loading: false,
    isAdmin: true,
    isMember: false,
    isTrainer: false,
    signOut: jest.fn(),
    refreshProfile: jest.fn(),
  }

  return (
    <div data-testid="mock-auth-provider">
      {React.createElement(AuthProvider as any, { value: mockAuthValue }, children)}
    </div>
  )
}

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <MockAuthProvider>
        {children}
        <Toaster />
      </MockAuthProvider>
    </ThemeProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Mock data generators
export const generateMockUser = (overrides = {}) => ({
  ...mockUser,
  ...overrides,
})

export const generateMockProfile = (overrides = {}) => ({
  ...mockProfile,
  ...overrides,
})

export const generateMockMember = (overrides = {}) => ({
  id: 'test-member-id',
  user_id: 'test-user-id',
  emergency_contact: 'Emergency Contact',
  medical_conditions: null,
  date_of_birth: '1990-01-01',
  gender: 'male',
  address: '123 Test St',
  height: 175,
  weight: 70,
  profile_photo_url: null,
  joined_at: '2024-01-01',
  membership_status: 'active' as const,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

export const generateMockSession = (overrides = {}) => ({
  id: 'test-session-id',
  title: 'Test Session',
  description: 'Test session description',
  trainer_id: 'test-trainer-id',
  max_capacity: 10,
  start_time: '2024-12-01T10:00:00.000Z',
  end_time: '2024-12-01T11:00:00.000Z',
  session_type: 'fitness',
  status: 'scheduled' as const,
  price: 50,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  current_bookings: 0,
  location: 'Gym Floor 1',
  equipment_needed: ['weights', 'mats'],
  is_recurring: false,
  recurrence_rule: null,
  recurrence_end_date: null,
  original_session_id: null,
  template_id: null,
  ...overrides,
})

// Helper functions for common test scenarios
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0))

export const mockApiResponse = (data: any, error = null) => ({
  data,
  error,
})