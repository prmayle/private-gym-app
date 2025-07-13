"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Calendar, Package, TrendingUp, Clock } from "lucide-react"
import { UserDropdown } from "@/components/ui/user-dropdown"
import { useAuth } from "@/contexts/AuthContext"
import { createClient } from "@/utils/supabase/client"
import { useToast } from "@/hooks/use-toast"

export default function MemberDashboard() {
  const auth = useAuth()
  const { toast } = useToast()

  const [memberData, setMemberData] = useState({
    name: auth.userProfile?.full_name || auth.user?.user_metadata?.full_name || auth.user?.email?.split('@')[0] || "Loading...",
    membershipType: "Loading...",
    joinDate: "Loading...",
    nextSession: null,
  })

  const [packages, setPackages] = useState([])
  const [recentSessions, setRecentSessions] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [progressData, setProgressData] = useState({
    weight: null,
    bodyFat: null,
    muscleMass: null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (auth.user) {
      loadMemberDashboardData()
    }
  }, [auth.user])

  const loadMemberDashboardData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      if (!auth.user) {
        return
      }

      // Get member profile
      const { data: memberProfile, error: memberError } = await supabase
        .from('members')
        .select(`
          id,
          joined_at,
          membership_status,
          user_id
        `)
        .eq('user_id', auth.user.id)
        .single()

      if (memberError) {
        console.error("Error loading member profile:", memberError)
        // Create fallback member data
        setMemberData({
          name: auth.user.email?.split('@')[0] || "Member",
          membershipType: 'Active Member',
          joinDate: new Date().toLocaleDateString(),
          nextSession: null
        })
        return
      }

      // Update member data
      setMemberData({
        name: auth.user.email?.split('@')[0] || "Member",
        membershipType: memberProfile.membership_status === 'active' ? 'Active Member' : 'Inactive Member',
        joinDate: new Date(memberProfile.joined_at).toLocaleDateString(),
        nextSession: null // Will be populated later
      })

      // Load member packages
      const { data: packagesData, error: packagesError } = await supabase
        .from('member_packages')
        .select(`
          id,
          sessions_remaining,
          sessions_total,
          end_date,
          status,
          package_id
        `)
        .eq('member_id', memberProfile.id)
        .eq('status', 'active')
        .order('end_date', { ascending: true })

      if (packagesError) {
        console.error("Error loading packages:", packagesError)
      } else {
        const transformedPackages = (packagesData || []).map(pkg => ({
          name: 'Package',
          remaining: pkg.sessions_remaining || 0,
          total: pkg.sessions_total || 0,
          expiry: new Date(pkg.end_date).toLocaleDateString()
        }))
        setPackages(transformedPackages)
      }

      // Load recent sessions (bookings)
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          booking_time,
          attended,
          session_id
        `)
        .eq('member_id', memberProfile.id)
        .order('booking_time', { ascending: false })
        .limit(5)

      if (bookingsError) {
        console.error("Error loading recent sessions:", bookingsError)
      } else {
        const transformedSessions = (bookingsData || []).map(booking => ({
          id: booking.id,
          type: 'Training Session',
          trainer: 'Trainer',
          date: new Date(booking.booking_time).toLocaleDateString(),
          status: booking.attended ? 'Completed' : booking.status === 'confirmed' ? 'Upcoming' : 'Cancelled'
        }))
        setRecentSessions(transformedSessions)

        // Find next upcoming session
        const upcomingSessions = transformedSessions.filter(session => session.status === 'Upcoming')
        if (upcomingSessions.length > 0) {
          const nextSession = upcomingSessions[0]
          setMemberData(prev => ({
            ...prev,
            nextSession: {
              type: nextSession.type,
              trainer: nextSession.trainer,
              date: nextSession.date,
              time: "Check sessions for time"
            }
          }))
        }
      }

      // Load notifications (with error handling)
      try {
        const { data: notificationsData, error: notificationsError } = await supabase
          .from('notifications')
          .select('id, title, message, is_read, created_at')
          .eq('user_id', auth.user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (notificationsError) {
          console.error("Error loading notifications:", notificationsError)
        } else {
          setNotifications(notificationsData || [])
          const unread = (notificationsData || []).filter(notification => !notification.is_read).length
          setUnreadCount(unread)
        }
      } catch (error) {
        console.error("Notifications table might not exist:", error)
        setNotifications([])
        setUnreadCount(0)
      }

      // Load latest progress data (with error handling)
      try {
        const { data: progressData, error: progressError } = await supabase
          .from('progress_tracking')
          .select('weight, body_fat_percentage, muscle_mass, measurement_date')
          .eq('member_id', memberProfile.id)
          .order('measurement_date', { ascending: false })
          .limit(1)
          .single()

        if (progressError) {
          console.error("Error loading progress data:", progressError)
        } else if (progressData) {
          setProgressData({
            weight: progressData.weight,
            bodyFat: progressData.body_fat_percentage,
            muscleMass: progressData.muscle_mass
          })
        }
      } catch (error) {
        console.error("Progress tracking table might not exist:", error)
        setProgressData({
          weight: null,
          bodyFat: null,
          muscleMass: null
        })
      }

    } catch (error) {
      console.error("Error loading dashboard data:", error)
      toast({
        title: "Error Loading Dashboard",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {memberData.name}!</h1>
          <p className="text-muted-foreground">
            {memberData.membershipType} Member since {memberData.joinDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Book Session Button */}
          <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white">
            <Link href="/member/book-session">
              <Calendar className="mr-2 h-4 w-4" />
              Book Session
            </Link>
          </Button>

          {/* Notifications */}
          <div className="relative">
            <Button variant="outline" size="icon" asChild>
              <Link href="/member/notifications">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Link>
            </Button>
          </div>

          {/* User Dropdown */}
          <UserDropdown />
        </div>
      </div>

      {/* Next Session Card */}
      {memberData.nextSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Next Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-medium text-lg">{memberData.nextSession.type}</h3>
                <p className="text-muted-foreground">with {memberData.nextSession.trainer}</p>
                <p className="text-sm">
                  {memberData.nextSession.date} at {memberData.nextSession.time}
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/member/book-session">Manage Sessions</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Package Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5" />
            Your Packages
          </CardTitle>
          <CardDescription>Current package status and remaining sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {packages.map((pkg, index) => (
              <div key={index} className="border rounded-lg p-4">
                <h3 className="font-medium">{pkg.name}</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Remaining: </span>
                    <span className={pkg.remaining === 0 ? "text-red-500 font-medium" : "font-medium"}>
                      {pkg.remaining}/{pkg.total}
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Expires: </span>
                    <span>{pkg.expiry}</span>
                  </p>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${(pkg.remaining / pkg.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4 bg-transparent" asChild>
            <Link href="/member/packages">Manage Packages</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fitness Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Fitness Progress
            </CardTitle>
            <CardDescription>Your latest measurements and progress</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Weight</span>
                  <span className="font-medium">
                    {progressData.weight ? `${progressData.weight} kg` : 'Not recorded'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Body Fat</span>
                  <span className="font-medium">
                    {progressData.bodyFat ? `${progressData.bodyFat}%` : 'Not recorded'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Muscle Mass</span>
                  <span className="font-medium">
                    {progressData.muscleMass ? `${progressData.muscleMass} kg` : 'Not recorded'}
                  </span>
                </div>
              </div>
            )}
            <Button variant="outline" className="w-full mt-4 bg-transparent" asChild>
              <Link href="/member/progress">View Detailed Progress</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Recent Sessions
            </CardTitle>
            <CardDescription>Your latest training sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{session.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.trainer} • {session.date}
                    </p>
                  </div>
                  <Badge variant="secondary">{session.status}</Badge>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4 bg-transparent" asChild>
              <Link href="/member/book-session?tab=booked">View All Sessions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
