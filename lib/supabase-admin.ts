import { createClient } from '@supabase/supabase-js'

// Admin client with service role key (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // This bypasses RLS
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Helper function to set user role in auth metadata
export async function setUserRole(userId: string, role: 'admin' | 'member' | 'trainer') {
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { role }
  })
  
  if (error) {
    console.error('Error setting user role:', error)
    throw error
  }
  
  return data
}

// Helper function to create admin user
export async function createAdminUser(email: string, password: string, fullName: string) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: {
      role: 'admin',
      full_name: fullName
    },
    email_confirm: true // Skip email verification for admin
  })
  
  if (error) {
    console.error('Error creating admin user:', error)
    throw error
  }
  
  return data
}

// Bootstrap function to ensure admin exists
export async function bootstrapAdmin() {
  const adminEmail = 'admin@corefactory.com'
  const adminPassword = 'Admin123!'
  
  try {
    // Try to get existing admin user
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const adminUser = existingUser.users.find(user => user.email === adminEmail)
    
    if (!adminUser) {
      // Create admin user if doesn't exist
      console.log('Creating admin user...')
      await createAdminUser(adminEmail, adminPassword, 'System Administrator')
      console.log('Admin user created successfully')
    } else if (!adminUser.user_metadata?.role) {
      // Set role if missing
      console.log('Setting admin role...')
      await setUserRole(adminUser.id, 'admin')
      console.log('Admin role set successfully')
    }
    
    return true
  } catch (error) {
    console.error('Bootstrap admin error:', error)
    return false
  }
}

export default supabaseAdmin 