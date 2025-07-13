import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create admin client directly in the API route
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    // Check if service role key is configured
    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY environment variable is not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { id, email, full_name, phone, role, is_active } = body

    if (!id || !email) {
      return NextResponse.json(
        { error: 'ID and email are required' },
        { status: 400 }
      )
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    let profileData

    if (existingProfile) {
      // Profile already exists, update it
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          email,
          full_name,
          phone,
          role: role || 'member',
          is_active: is_active !== undefined ? is_active : true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('Profile update error:', updateError)
        return NextResponse.json(
          { error: updateError.message },
          { status: 400 }
        )
      }
      profileData = updatedProfile
    } else {
      // Create new profile
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id,
          email,
          full_name,
          phone,
          role: role || 'member',
          is_active: is_active !== undefined ? is_active : true,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Profile creation error:', insertError)
        return NextResponse.json(
          { error: insertError.message },
          { status: 400 }
        )
      }
      profileData = newProfile
    }

    return NextResponse.json({ 
      success: true, 
      profile: profileData 
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}