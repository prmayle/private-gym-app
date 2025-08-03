import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/utils/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // First, delete all related database records
    // This must be done before deleting the auth user to maintain referential integrity
    
    // 1. Get member record to find member_id
    const { data: memberData, error: memberFetchError } = await supabaseAdmin
      .from('members')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (memberFetchError && memberFetchError.code !== 'PGRST116') {
      console.error('Error fetching member:', memberFetchError)
      return NextResponse.json(
        { error: 'Failed to fetch member data' },
        { status: 400 }
      )
    }

    if (memberData) {
      const memberId = memberData.id

      // 2. Delete related records in correct order (to avoid foreign key constraints)
      
      // Delete bookings first
      const { error: bookingsError } = await supabaseAdmin
        .from('bookings')
        .delete()
        .eq('member_id', memberId)

      if (bookingsError) {
        console.error('Error deleting bookings:', bookingsError)
      }

      // Delete member packages
      const { error: packagesError } = await supabaseAdmin
        .from('member_packages')
        .delete()
        .eq('member_id', memberId)

      if (packagesError) {
        console.error('Error deleting member packages:', packagesError)
      }

      // Delete package requests
      const { error: requestsError } = await supabaseAdmin
        .from('package_requests')
        .delete()
        .eq('member_id', memberId)

      if (requestsError) {
        console.error('Error deleting package requests:', requestsError)
      }

      // Delete payments
      const { error: paymentsError } = await supabaseAdmin
        .from('payments')
        .delete()
        .eq('member_id', memberId)

      if (paymentsError) {
        console.error('Error deleting payments:', paymentsError)
      }

      // Delete notifications
      const { error: notificationsError } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('user_id', userId)

      if (notificationsError) {
        console.error('Error deleting notifications:', notificationsError)
      }

      // Delete activity logs
      const { error: activityError } = await supabaseAdmin
        .from('activity_logs')
        .delete()
        .eq('performed_by', userId)

      if (activityError) {
        console.error('Error deleting activity logs:', activityError)
      }

      // Delete member record
      const { error: memberDeleteError } = await supabaseAdmin
        .from('members')
        .delete()
        .eq('id', memberId)

      if (memberDeleteError) {
        console.error('Error deleting member:', memberDeleteError)
        return NextResponse.json(
          { error: 'Failed to delete member record' },
          { status: 400 }
        )
      }
    }

    // 3. Delete profile record
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Error deleting profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to delete profile record' },
        { status: 400 }
      )
    }

    // 4. Finally, delete the auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Delete user error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'User and all related data deleted successfully'
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}