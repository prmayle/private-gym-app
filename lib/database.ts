import { supabase } from './supabase'
import { Database } from '../types/supabase'

// Type aliases for easier use
type Tables = Database['public']['Tables']
type User = Tables['users']['Row']
type Member = Tables['members']['Row']
type Session = Tables['sessions']['Row']
type Booking = Tables['bookings']['Row']
type Package = Tables['packages']['Row']

// =============================================
// USER OPERATIONS
// =============================================

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
}

export async function updateUserProfile(userId: string, updates: Partial<User>) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// =============================================
// MEMBER OPERATIONS
// =============================================

export async function getAllMembers() {
  const { data, error } = await supabase
    .from('members')
    .select(`
      *,
      user:users(*)
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function getMemberById(memberId: string) {
  const { data, error } = await supabase
    .from('members')
    .select(`
      *,
      user:users(*),
      member_packages(
        *,
        package:packages(*)
      )
    `)
    .eq('id', memberId)
    .single()
  
  if (error) throw error
  return data
}

export async function createMember(memberData: Tables['members']['Insert']) {
  const { data, error } = await supabase
    .from('members')
    .insert(memberData)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateMember(memberId: string, updates: Partial<Member>) {
  const { data, error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', memberId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// =============================================
// SESSION OPERATIONS
// =============================================

export async function getAllSessions() {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      trainer:trainers(
        *,
        user:users(*)
      ),
      bookings(
        *,
        member:members(
          *,
          user:users(*)
        )
      )
    `)
    .order('start_time', { ascending: true })
  
  if (error) throw error
  return data
}

export async function getUpcomingSessions() {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      trainer:trainers(
        *,
        user:users(*)
      )
    `)
    .eq('status', 'scheduled')
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(10)
  
  if (error) throw error
  return data
}

export async function createSession(sessionData: Tables['sessions']['Insert']) {
  const { data, error } = await supabase
    .from('sessions')
    .insert(sessionData)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateSession(sessionId: string, updates: Partial<Session>) {
  const { data, error } = await supabase
    .from('sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// =============================================
// BOOKING OPERATIONS
// =============================================

export async function getMemberBookings(memberId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      session:sessions(
        *,
        trainer:trainers(
          *,
          user:users(*)
        )
      )
    `)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function createBooking(bookingData: Tables['bookings']['Insert']) {
  // Check if session has capacity
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('max_capacity, bookings(count)')
    .eq('id', bookingData.session_id)
    .single()
  
  if (sessionError) throw sessionError
  
  const currentBookings = session.bookings?.[0]?.count || 0
  if (currentBookings >= session.max_capacity) {
    throw new Error('Session is fully booked')
  }
  
  const { data, error } = await supabase
    .from('bookings')
    .insert(bookingData)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function cancelBooking(bookingId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// =============================================
// PACKAGE OPERATIONS
// =============================================

export async function getAllPackages() {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true })
  
  if (error) throw error
  return data
}

export async function createPackage(packageData: Tables['packages']['Insert']) {
  const { data, error } = await supabase
    .from('packages')
    .insert(packageData)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// =============================================
// REAL-TIME SUBSCRIPTIONS
// =============================================

export function subscribeToBookings(callback: (payload: any) => void) {
  return supabase
    .channel('bookings')
    .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'bookings' }, 
        callback
    )
    .subscribe()
}

export function subscribeToSessions(callback: (payload: any) => void) {
  return supabase
    .channel('sessions')
    .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'sessions' }, 
        callback
    )
    .subscribe()
}

// =============================================
// ANALYTICS FUNCTIONS
// =============================================

export async function getDashboardStats() {
  const [
    { count: totalMembers },
    { count: activeMembers },
    { count: totalSessions },
    { count: todayBookings }
  ] = await Promise.all([
    supabase.from('members').select('*', { count: 'exact', head: true }),
    supabase.from('members').select('*', { count: 'exact', head: true }).eq('membership_status', 'active'),
    supabase.from('sessions').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().split('T')[0])
  ])
  
  return {
    totalMembers: totalMembers || 0,
    activeMembers: activeMembers || 0,
    totalSessions: totalSessions || 0,
    todayBookings: todayBookings || 0
  }
} 
