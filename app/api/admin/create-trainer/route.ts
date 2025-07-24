import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // First verify the requesting user is an admin
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { email, full_name, phone, specializations, certifications, bio, hourly_rate, experience_years, max_sessions_per_day, profile_photo_url } = body

    if (!email || !full_name) {
      return NextResponse.json({ error: 'Email and full name are required' }, { status: 400 })
    }

    // Check if user already exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role')
      .eq('email', email)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing profile:', checkError)
    }

    let profileId: string

    if (existingProfile) {
      // Update existing profile to trainer role
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          full_name,
          phone,
          role: 'trainer',
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProfile.id)
        .select('id')
        .single()

      if (updateError) {
        console.error('Error updating profile:', updateError)
        return NextResponse.json({ error: 'Failed to update existing profile' }, { status: 500 })
      }

      profileId = existingProfile.id
    } else {
      // Create new user using admin auth
      const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: generateTempPassword(), // Generate a temporary password
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name,
          phone,
          role: 'trainer'
        }
      })

      if (authCreateError || !authData.user) {
        console.error('Error creating auth user:', authCreateError)
        return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 })
      }

      // Create or update profile record
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email,
          full_name,
          phone,
          role: 'trainer',
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (profileError) {
        console.error('Error creating profile:', profileError)
        // Clean up auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      }

      profileId = profileData.id

      // Send password reset email so trainer can set their own password
      await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/trainer/dashboard`
        }
      })
    }

    // Check if trainer record already exists
    const { data: existingTrainer, error: checkTrainerError } = await supabaseAdmin
      .from('trainers')
      .select('*')
      .eq('user_id', profileId)
      .maybeSingle()

    if (checkTrainerError) {
      console.error('Error checking existing trainer:', checkTrainerError)
      return NextResponse.json({ error: 'Failed to check existing trainer' }, { status: 500 })
    }

    let trainerData
    if (existingTrainer) {
      // Update existing trainer record
      const { data: updatedTrainer, error: updateTrainerError } = await supabaseAdmin
        .from('trainers')
        .update({
          specializations: specializations || existingTrainer.specializations || [],
          certifications: certifications || existingTrainer.certifications || [],
          bio: bio || existingTrainer.bio || '',
          hourly_rate: hourly_rate || existingTrainer.hourly_rate || 50,
          experience_years: experience_years || existingTrainer.experience_years || 0,
          max_sessions_per_day: max_sessions_per_day || existingTrainer.max_sessions_per_day || 8,
          profile_photo_url: profile_photo_url || existingTrainer.profile_photo_url || null,
          is_available: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', profileId)
        .select('*')
        .single()

      if (updateTrainerError) {
        console.error('Error updating trainer:', updateTrainerError)
        return NextResponse.json({ error: 'Failed to update trainer profile' }, { status: 500 })
      }
      trainerData = updatedTrainer
    } else {
      // Create new trainer record
      const { data: newTrainer, error: trainerError } = await supabaseAdmin
        .from('trainers')
        .insert({
          user_id: profileId,
          specializations: specializations || [],
          certifications: certifications || [],
          bio: bio || '',
          hourly_rate: hourly_rate || 50,
          experience_years: experience_years || 0,
          max_sessions_per_day: max_sessions_per_day || 8,
          profile_photo_url: profile_photo_url || null,
          is_available: true
        })
        .select('*')
        .single()

      if (trainerError) {
        console.error('Error creating trainer:', trainerError)
        return NextResponse.json({ error: 'Failed to create trainer profile' }, { status: 500 })
      }
      trainerData = newTrainer
    }

    return NextResponse.json({
      success: true,
      trainer: {
        id: trainerData.id,
        user_id: profileId,
        full_name,
        email,
        phone,
        specializations: trainerData.specializations,
        certifications: trainerData.certifications,
        bio: trainerData.bio,
        hourly_rate: trainerData.hourly_rate,
        experience_years: trainerData.experience_years,
        is_available: trainerData.is_available
      },
      isNewUser: !existingProfile
    })

  } catch (error) {
    console.error('Server error creating trainer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateTempPassword(): string {
  // Generate a random 12-character password
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}