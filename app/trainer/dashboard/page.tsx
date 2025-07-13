"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, Clock, Users, DollarSign, TrendingUp, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { UserDropdown } from "@/components/ui/user-dropdown"
import { useAuth } from "@/contexts/AuthContext"
import { createClient } from "@/utils/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface TrainerStats {
  totalSessions: number
  completedSessions: number
  upcomingSessions: number
  cancelledSessions: number
  totalEarnings: number
  monthlyEarnings: number
  averageRating: number
  totalClients: number
}

interface UpcomingSession {
  id: string
  title: string
  start_time: string
  end_time: string
  session_type: string
  max_capacity: number
  booked_count: number
  status: string
}

interface RecentBooking {
  id: string
  member_name: string
  session_title: string
  booking_time: string
  status: string
  attended: boolean
  rating: number | null
  feedback: string | null
}

interface TrainerProfile {
  id: string
  full_name: string
  email: string
  phone: string | null
  specializations: string[]
  certifications: string[]
  bio: string
  hourly_rate: number
  experience_years: number
  is_available: boolean
  profile_photo_url: string | null
}

export default function TrainerDashboard() {
  const auth = useAuth()
  const { toast } = useToast()

  const [trainerProfile, setTrainerProfile] = useState<TrainerProfile | null>(null)
  const [stats, setStats] = useState<TrainerStats>({
    totalSessions: 0,
    completedSessions: 0,
    upcomingSessions: 0,
    cancelledSessions: 0,
    totalEarnings: 0,
    monthlyEarnings: 0,
    averageRating: 0,
    totalClients: 0
  })
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([])
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (auth.user) {
      loadTrainerDashboard()
    }
  }, [auth.user])

  const loadTrainerDashboard = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      if (!auth.user) {
        return
      }

      // Get trainer profile
      const { data: trainerData, error: trainerError } = await supabase
        .from('trainers')
        .select(`
          *,
          profiles!trainers_user_id_fkey (
            full_name,
            email,
            phone
          )
        `)
        .eq('user_id', auth.user.id)
        .single()

      if (trainerError) {
        console.error("Error loading trainer profile:", trainerError)
        toast({
          title: "Profile Error",
          description: "Unable to load trainer profile. Please contact admin.",
          variant: "destructive",
        })
        return
      }

      const profile: TrainerProfile = {
        id: trainerData.id,
        full_name: trainerData.profiles?.full_name || "Trainer",
        email: trainerData.profiles?.email || "",
        phone: trainerData.profiles?.phone || null,
        specializations: trainerData.specializations || [],
        certifications: trainerData.certifications || [],
        bio: trainerData.bio || "",
        hourly_rate: trainerData.hourly_rate || 0,
        experience_years: trainerData.experience_years || 0,
        is_available: trainerData.is_available || false,
        profile_photo_url: trainerData.profile_photo_url || null
      }
      setTrainerProfile(profile)

      // Load trainer sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('trainer_id', trainerData.id)
        .order('start_time', { ascending: true })

      if (sessionsError) {
        console.error("Error loading sessions:", sessionsError)
      }

      const sessions = sessionsData || []
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      // Calculate stats
      const completedSessions = sessions.filter(s => s.status === 'completed').length
      const upcomingSessions = sessions.filter(s => new Date(s.start_time) > now && s.status === 'scheduled').length
      const cancelledSessions = sessions.filter(s => s.status === 'cancelled').length
      const monthlySessions = sessions.filter(s => 
        new Date(s.start_time) >= startOfMonth && s.status === 'completed'
      )

      // Load upcoming sessions with booking counts
      const upcomingSessionsWithBookings = await Promise.all(
        sessions
          .filter(s => new Date(s.start_time) > now && s.status === 'scheduled')
          .slice(0, 5)
          .map(async (session) => {
            const { data: bookingsData } = await supabase
              .from('bookings')
              .select('id')
              .eq('session_id', session.id)
              .eq('status', 'confirmed')

            return {
              ...session,
              booked_count: bookingsData?.length || 0
            }
          })
      )
      setUpcomingSessions(upcomingSessionsWithBookings)

      // Load recent bookings with member names
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          sessions!bookings_session_id_fkey (
            title,
            trainer_id
          ),
          members!bookings_member_id_fkey (
            profiles!members_user_id_fkey (
              full_name
            )
          )
        `)
        .eq('sessions.trainer_id', trainerData.id)
        .order('booking_time', { ascending: false })
        .limit(10)

      if (bookingsError) {
        console.error("Error loading bookings:", bookingsError)
      } else {
        const transformedBookings = (bookingsData || [])
          .filter(booking => booking.sessions?.trainer_id === trainerData.id)
          .map(booking => ({
            id: booking.id,
            member_name: booking.members?.profiles?.full_name || "Unknown Member",
            session_title: booking.sessions?.title || "Unknown Session",
            booking_time: booking.booking_time,
            status: booking.status,
            attended: booking.attended || false,
            rating: booking.rating || null,
            feedback: booking.feedback || null
          }))
        setRecentBookings(transformedBookings)
      }

      // Calculate earnings (simplified - assumes hourly rate per session)
      const totalEarnings = completedSessions * profile.hourly_rate
      const monthlyEarnings = monthlySessions.length * profile.hourly_rate

      // Calculate average rating from recent bookings
      const ratingsData = (bookingsData || [])
        .filter(b => b.rating !== null)
        .map(b => b.rating)
      const averageRating = ratingsData.length > 0 
        ? ratingsData.reduce((sum, rating) => sum + rating, 0) / ratingsData.length 
        : 0

      // Get unique clients count
      const uniqueClients = new Set(
        (bookingsData || [])
          .filter(b => b.status === 'confirmed' || b.attended)
          .map(b => b.member_id)
      ).size

      setStats({
        totalSessions: sessions.length,
        completedSessions,
        upcomingSessions,
        cancelledSessions,
        totalEarnings,
        monthlyEarnings,
        averageRating,
        totalClients: uniqueClients
      })

    } catch (error) {
      console.error("Error loading trainer dashboard:", error)
      toast({
        title: "Error Loading Dashboard",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateAvailability = async (isAvailable: boolean) => {
    if (!trainerProfile) return

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('trainers')
        .update({
          is_available: isAvailable,
          updated_at: new Date().toISOString()
        })
        .eq('id', trainerProfile.id)

      if (error) {
        throw error
      }

      setTrainerProfile(prev => prev ? { ...prev, is_available: isAvailable } : prev)
      
      toast({
        title: "Status Updated",
        description: `You are now ${isAvailable ? 'available' : 'unavailable'} for sessions.`,
      })

    } catch (error) {
      console.error("Error updating availability:", error)
      toast({
        title: "Error",
        description: "Failed to update availability status.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!trainerProfile) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Trainer profile not found. Please contact administration.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={trainerProfile.profile_photo_url || ""} />
            <AvatarFallback>
              {trainerProfile.full_name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {trainerProfile.full_name}!</h1>
            <p className="text-muted-foreground">
              Trainer Dashboard • {trainerProfile.experience_years} years experience
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={trainerProfile.is_available ? "outline" : "default"}
            onClick={() => updateAvailability(!trainerProfile.is_available)}
            className={trainerProfile.is_available ? "" : "bg-green-600 hover:bg-green-700"}
          >
            {trainerProfile.is_available ? "Set Unavailable" : "Set Available"}
          </Button>
          <UserDropdown />
        </div>
      </div>

      {/* Availability Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${trainerProfile.is_available ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="font-medium">
                Status: {trainerProfile.is_available ? 'Available for Sessions' : 'Unavailable'}
              </span>
            </div>
            <Badge variant={trainerProfile.is_available ? "default" : "secondary"}>
              {trainerProfile.is_available ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedSessions} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingSessions}</div>
            <p className="text-xs text-muted-foreground">
              sessions scheduled
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-muted-foreground">
              unique members
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalEarnings}</div>
            <p className="text-xs text-muted-foreground">
              ${stats.monthlyEarnings} this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              out of 5 stars
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalSessions > 0 ? Math.round((stats.completedSessions / stats.totalSessions) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Upcoming Sessions
            </CardTitle>
            <CardDescription>Your scheduled sessions for the coming days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No upcoming sessions scheduled
                </p>
              ) : (
                upcomingSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{session.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.start_time).toLocaleDateString()} at{" "}
                        {new Date(session.start_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.booked_count}/{session.max_capacity} booked
                      </p>
                    </div>
                    <Badge variant="secondary">{session.session_type}</Badge>
                  </div>
                ))
              )}
            </div>
            <Button variant="outline" className="w-full mt-4 bg-transparent" asChild>
              <Link href="/trainer/sessions">View All Sessions</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest bookings and session updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              ) : (
                recentBookings.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{booking.member_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {booking.session_title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(booking.booking_time).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {booking.attended ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : booking.status === 'cancelled' ? (
                        <XCircle className="h-4 w-4 text-red-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Button variant="outline" className="w-full mt-4 bg-transparent" asChild>
              <Link href="/trainer/bookings">View All Bookings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Profile Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>Professional information and specializations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Specializations</h3>
              <div className="flex flex-wrap gap-2">
                {trainerProfile.specializations.map(spec => (
                  <Badge key={spec} variant="secondary">{spec}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Certifications</h3>
              <div className="flex flex-wrap gap-2">
                {trainerProfile.certifications.map(cert => (
                  <Badge key={cert} variant="outline">{cert}</Badge>
                ))}
              </div>
            </div>
          </div>
          {trainerProfile.bio && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Bio</h3>
              <p className="text-sm text-muted-foreground">{trainerProfile.bio}</p>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Hourly Rate: <span className="font-medium">${trainerProfile.hourly_rate}</span>
            </div>
            <Button variant="outline" asChild>
              <Link href="/trainer/profile">Edit Profile</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}