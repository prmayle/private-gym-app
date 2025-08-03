import { User } from '@supabase/supabase-js'

export const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  email_confirmed_at: '2024-01-01T00:00:00.000Z',
  phone: null,
  confirmed_at: '2024-01-01T00:00:00.000Z',
  last_sign_in_at: '2024-01-01T00:00:00.000Z',
  app_metadata: {
    provider: 'email',
    providers: ['email'],
  },
  user_metadata: {
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'admin',
  },
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
}

export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: mockUser,
}

export const mockProfile = {
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  phone: null,
  role: 'admin' as const,
  avatar_url: null,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  is_active: true,
}

export const mockMember = {
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
}

export const mockSession_DB = {
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
}

// Mock Supabase client
export const createMockSupabaseClient = () => ({
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    getSession: jest.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: { user: mockUser, session: mockSession }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn().mockImplementation((callback) => {
      callback('SIGNED_IN', mockSession)
      return { data: { subscription: { unsubscribe: jest.fn() } } }
    }),
  },
  from: jest.fn().mockImplementation((table: string) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockImplementation(() => {
      switch (table) {
        case 'profiles':
          return Promise.resolve({ data: mockProfile, error: null })
        case 'members':
          return Promise.resolve({ data: mockMember, error: null })
        case 'sessions':
          return Promise.resolve({ data: mockSession_DB, error: null })
        default:
          return Promise.resolve({ data: null, error: null })
      }
    }),
    maybeSingle: jest.fn().mockImplementation(() => {
      switch (table) {
        case 'profiles':
          return Promise.resolve({ data: mockProfile, error: null })
        case 'members':
          return Promise.resolve({ data: mockMember, error: null })
        default:
          return Promise.resolve({ data: null, error: null })
      }
    }),
  })),
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  storage: {
    from: jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://test-url.com' } }),
    }),
  },
})

// Mock the Supabase client creation functions
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => createMockSupabaseClient()),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => createMockSupabaseClient()),
}))

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: jest.fn(() => createMockSupabaseClient()),
}))