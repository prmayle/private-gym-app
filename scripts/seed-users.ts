import { createClient } from '@supabase/supabase-js'
import type { Database } from '../lib/supabase'

// Admin client with service role key (bypasses RLS)
const supabaseAdmin = createClient<Database>(
  'https://bywctqsywiljzhubwqmt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5d2N0cXN5d2lsanpodWJ3cW10Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM5NTI2MywiZXhwIjoyMDczOTcxMjYzfQ.WKjpbx19HtWIUmwPeTXrAqKQCNzvR_-IeTW1GRKHfoU',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

type UserRole = 'admin' | 'member' | 'trainer'

interface SeedUser {
  email: string
  password: string
  full_name: string
  role: UserRole
  phone?: string
  // Member-specific data
  memberData?: {
    membership_status: 'active' | 'inactive' | 'suspended'
    fitness_goals?: string
    emergency_contact_name?: string
    emergency_contact_phone?: string
    medical_conditions?: string
  }
  // Trainer-specific data
  trainerData?: {
    certification?: string
  }
}

// Define users to seed
const SEED_USERS: SeedUser[] = [
  // Admin Users
  {
    email: 'admin@corefactory.com',
    password: 'Admin123!',
    full_name: 'System Administrator',
    role: 'admin',
    phone: '+1234567890'
  },
  {
    email: 'admin+admin@corefactory.com',
    password: 'Admin123!',
    full_name: 'Core Factory Admin',
    role: 'admin',
    phone: '+1234567891'
  },

  // Member Users
  {
    email: 'corefactorymember@corefactory.com',
    password: 'TempPass020138!',
    full_name: 'Core Factory Member',
    role: 'member',
    phone: '+1234567892',
    memberData: {
      membership_status: 'active',
      emergency_contact_phone: '+1234567999',
      medical_conditions: 'None'
    }
  },
  {
    email: 'john.member@example.com',
    password: 'Member123!',
    full_name: 'John Member',
    role: 'member',
    phone: '+1234567893',
    memberData: {
      membership_status: 'active',
      emergency_contact_phone: '+1234567998'
    }
  },
  {
    email: 'sarah.fitness@example.com',
    password: 'Member123!',
    full_name: 'Sarah Fitness',
    role: 'member',
    phone: '+1234567894',
    memberData: {
      membership_status: 'active',
      emergency_contact_phone: '+1234567997'
    }
  },

  // Trainer Users
  {
    email: 'trainer@corefactory.com',
    password: 'Trainer123!',
    full_name: 'Head Trainer',
    role: 'trainer',
    phone: '+1234567895',
    trainerData: {
        certification: 'NASM-CPT, CSCS',
    //   specialization: 'Strength Training & Nutrition',
    //   hourly_rate: 75,
    //   bio: 'Certified personal trainer with 10+ years experience in strength training and nutrition coaching.'
    }
  },
  {
    email: 'mike.trainer@example.com',
    password: 'Trainer123!',
    full_name: 'Mike Trainer',
    role: 'trainer',
    phone: '+1234567896',
    trainerData: {
      certification: 'ACE-CPT',
    }
  }
]

async function createUserWithProfile(userData: SeedUser) {
  console.log(`Creating user: ${userData.email}`)
  
  try {
    // 1. Create auth user with metadata
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      user_metadata: {
        role: userData.role,
        full_name: userData.full_name
      },
      email_confirm: true // Skip email verification
    })

    if (authError) {
      console.error(`Error creating auth user ${userData.email}:`, authError)
      return { success: false, error: authError }
    }

    const userId = authData.user.id
    console.log(`✅ Auth user created: ${userId}`)

    // 2. Create profile in database
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        phone: userData.phone || null,
        is_active: true
      })

    if (profileError) {
      console.error(`Error creating profile for ${userData.email}:`, profileError)
      return { success: false, error: profileError }
    }

    console.log(`✅ Profile created for: ${userData.email}`)

    // 3. Create role-specific records
    if (userData.role === 'member' && userData.memberData) {
      const { error: memberError } = await supabaseAdmin
        .from('members')
        .insert({
          user_id: userId,
          membership_status: userData.memberData.membership_status,
          emergency_contact: userData.memberData.emergency_contact_phone || null,
          medical_conditions: userData.memberData.medical_conditions || null,
          joined_at: new Date().toISOString()
        })

      if (memberError) {
        console.error(`Error creating member record for ${userData.email}:`, memberError)
        return { success: false, error: memberError }
      }

      console.log(`✅ Member record created for: ${userData.email}`)
    }

    if (userData.role === 'trainer' && userData.trainerData) {
      const { error: trainerError } = await supabaseAdmin
        .from('trainers')
        .insert({
          user_id: userId,
          certifications: '{'  +userData.trainerData.certification + '}',
        //   hourly_rate: userData.trainerData.hourly_rate || null,
        //   bio: userData.trainerData.bio || null,
        //   is_available: true
        })

      if (trainerError) {
        console.error(`Error creating trainer record for ${userData.email}:`, trainerError)
        return { success: false, error: trainerError }
      }

      console.log(`✅ Trainer record created for: ${userData.email}`)
    }

    return { success: true, userId }

  } catch (error) {
    console.error(`Unexpected error creating user ${userData.email}:`, error)
    return { success: false, error }
  }
}

async function deleteExistingUser(email: string) {
  try {
    // Get existing user
    const { data: users } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = users.users.find(user => user.email === email)
    
    if (existingUser) {
      console.log(`🗑️  Deleting existing user: ${email}`)
      
      // Delete from auth (this should cascade to related tables)
      const { error } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id)
      
      if (error) {
        console.error(`Error deleting user ${email}:`, error)
      } else {
        console.log(`✅ Deleted existing user: ${email}`)
      }
    }
  } catch (error) {
    console.error(`Error checking/deleting existing user ${email}:`, error)
  }
}

async function seedUsers() {
  console.log('🌱 Starting user seeding process...\n')
  
  const results = {
    success: 0,
    failed: 0,
    errors: [] as any[]
  }

  for (const userData of SEED_USERS) {
    console.log(`\n--- Processing ${userData.email} (${userData.role}) ---`)
    
    // Delete existing user first (optional - remove if you want to skip existing)
    await deleteExistingUser(userData.email)
    
    // Create new user
    const result = await createUserWithProfile(userData)
    
    if (result.success) {
      results.success++
      console.log(`✅ Successfully created: ${userData.email}`)
    } else {
      results.failed++
      results.errors.push({ email: userData.email, error: result.error })
      console.log(`❌ Failed to create: ${userData.email}`)
    }
  }

  // Summary
  console.log('\n🎉 Seeding complete!')
  console.log(`✅ Successfully created: ${results.success} users`)
  console.log(`❌ Failed: ${results.failed} users`)
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:')
    results.errors.forEach(({ email, error }) => {
      console.log(`- ${email}: ${error.message}`)
    })
  }

  console.log('\n📧 Seeded Users:')
  SEED_USERS.forEach(user => {
    console.log(`- ${user.email} (${user.role}) - Password: ${user.password}`)
  })
}

// Run the seeding
  seedUsers()
    .then(() => {
      console.log('\n🏁 Seeding script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Seeding script failed:', error)
      process.exit(1)
    })

export { seedUsers, createUserWithProfile, SEED_USERS } 