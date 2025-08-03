// Test database setup and teardown utilities
const { createClient } = require('@supabase/supabase-js')

// Test database configuration
const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const TEST_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create test Supabase client
const createTestClient = () => {
  if (!TEST_SUPABASE_URL || !TEST_SUPABASE_ANON_KEY) {
    throw new Error('Test Supabase credentials not found')
  }
  
  return createClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY)
}

// Test data generators
const generateTestUser = (overrides = {}) => ({
  email: `test-${Date.now()}@example.com`,
  password: 'testpassword123',
  full_name: 'Test User',
  role: 'member',
  ...overrides,
})

const generateTestMember = (userId, overrides = {}) => ({
  user_id: userId,
  emergency_contact: 'Emergency Contact',
  date_of_birth: '1990-01-01',
  gender: 'male',
  address: '123 Test Street',
  height: 175,
  weight: 70,
  membership_status: 'active',
  ...overrides,
})

const generateTestSession = (trainerId, overrides = {}) => ({
  title: 'Test Session',
  description: 'Test session description',
  trainer_id: trainerId,
  max_capacity: 10,
  start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
  end_time: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
  session_type: 'fitness',
  status: 'scheduled',
  price: 50,
  location: 'Gym Floor 1',
  ...overrides,
})

// Database cleanup utilities
const cleanupTestData = async (client) => {
  try {
    // Clean up in reverse dependency order
    await client.from('bookings').delete().like('id', '%')
    await client.from('sessions').delete().like('title', 'Test%')
    await client.from('member_packages').delete().like('id', '%')
    await client.from('members').delete().like('emergency_contact', 'Emergency%')
    await client.from('trainers').delete().like('bio', 'Test%')
    await client.from('profiles').delete().like('email', 'test-%@example.com')
    
    console.log('✅ Test data cleanup completed')
  } catch (error) {
    console.warn('⚠️  Test data cleanup failed:', error.message)
  }
}

// Test environment setup
const setupTestEnvironment = async () => {
  try {
    const client = createTestClient()
    
    // Verify connection
    const { data, error } = await client.from('profiles').select('count').limit(1)
    if (error) throw error
    
    console.log('✅ Test database connection verified')
    return client
  } catch (error) {
    console.error('❌ Test environment setup failed:', error.message)
    throw error
  }
}

// Global test hooks
const globalSetup = async () => {
  console.log('🧪 Setting up test environment...')
  const client = await setupTestEnvironment()
  await cleanupTestData(client)
}

const globalTeardown = async () => {
  console.log('🧹 Cleaning up test environment...')
  const client = createTestClient()
  await cleanupTestData(client)
}

module.exports = {
  createTestClient,
  generateTestUser,
  generateTestMember,
  generateTestSession,
  cleanupTestData,
  setupTestEnvironment,
  globalSetup,
  globalTeardown,
}