"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/utils/supabase/client"
import { ArrowLeft, ArrowRight, Calendar, Clock, User } from "lucide-react"


// Group sessions by week
const groupSessionsByWeek = (sessions: any[]) => {
  const weeks: any = {}

  sessions.forEach((session: any) => {
    const date = new Date(session.date)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)

    const weekKey = weekStart.toISOString().split("T")[0]

    if (!weeks[weekKey]) {
      weeks[weekKey] = []
    }

    weeks[weekKey].push(session)
  })

  // Sort sessions within each week by date and time
  Object.keys(weeks).forEach((weekKey) => {
    weeks[weekKey].sort((a: any, b: any) => {
      const dateA = new Date(`${a.date} ${a.time.split(" - ")[0]}`)
      const dateB = new Date(`${b.date} ${b.time.split(" - ")[0]}`)
      return dateA.getTime() - dateB.getTime()
    })
  })

  return weeks
}

export default function BookSessionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("available")
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0)
  const [weeklyAvailableSessions, setWeeklyAvailableSessions] = useState({})
  const [memberSessions, setMemberSessions] = useState([])
  const [bookedSessionIds, setBookedSessionIds] = useState(new Set())
  const [memberPackages, setMemberPackages] = useState({})
  const [loading, setLoading] = useState(true)
  const [currentMemberId, setCurrentMemberId] = useState(null)

  useEffect(() => {
    loadMemberData()
  }, [])

  const loadMemberData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to book sessions.",
          variant: "destructive",
        })
        router.push('/login')
        return
      }

      // Get member profile
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id, user_id')
        .eq('user_id', user.id)
        .single()

      if (memberError || !memberData) {
        toast({
          title: "Member Profile Not Found",
          description: "Please contact admin to set up your member profile.",
          variant: "destructive",
        })
        return
      }

      setCurrentMemberId(memberData.id)

      // Load member packages
      const { data: packagesData, error: packagesError } = await supabase
        .from('member_packages')
        .select(`
          id,
          sessions_remaining,
          status,
          end_date,
          packages (
            name,
            package_type,
            session_count
          )
        `)
        .eq('member_id', memberData.id)
        .eq('status', 'active')
        .gt('sessions_remaining', 0)

      if (packagesError) {
        console.error("Error loading member packages:", packagesError)
      }

      // Transform packages data with better session type mapping
      const transformedPackages: any = {}
      if (packagesData) {
        packagesData.forEach(pkg => {
          const packageType = (pkg.packages as any)?.package_type || 'Unknown'
          const packageName = (pkg.packages as any)?.name || packageType
          
          // Map package types to session types they can book
          let sessionTypes = []
          switch(packageType.toLowerCase()) {
            case 'personal_training':
              sessionTypes = ['Personal Training', 'personal_training']
              break
            case 'group_class':
              sessionTypes = ['Group Class', 'group_class', 'Group Training']
              break
            case 'fitness_assessment':
              sessionTypes = ['Fitness Assessment', 'fitness_assessment']
              break
            case 'nutrition_consultation':
              sessionTypes = ['Nutrition Consultation', 'nutrition_consultation']
              break
            case 'monthly':
            case 'general':
              sessionTypes = ['Personal Training', 'Group Class', 'Group Training', 'personal_training', 'group_class']
              break
            default:
              sessionTypes = [packageType, packageName]
          }
          
          // Add entries for all session types this package can book
          sessionTypes.forEach(sessionType => {
            transformedPackages[sessionType] = {
              remaining: pkg.sessions_remaining || 0,
              total: (pkg.packages as any)?.session_count || 0,
              expiry: pkg.end_date,
              packageType: packageType,
              packageName: packageName
            }
          })
        })
      }
      setMemberPackages(transformedPackages)

      // Load available sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          id,
          title,
          session_type,
          start_time,
          end_time,
          max_capacity,
          current_bookings,
          status,
          trainers (
            profiles (
              full_name
            )
          )
        `)
        .gte('start_time', new Date().toISOString())
        .eq('status', 'scheduled')
        .order('start_time', { ascending: true })

      if (sessionsError) {
        console.error("Error loading sessions:", sessionsError)
      }

      // Transform sessions data
      const transformedSessions = (sessionsData || []).map(session => ({
        id: session.id,
        type: session.session_type,
        trainer: (session.trainers as any)?.profiles?.full_name || 'Unassigned',
        date: new Date(session.start_time).toISOString().split('T')[0],
        time: `${new Date(session.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${new Date(session.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
        capacity: {
          booked: session.current_bookings || 0,
          total: session.max_capacity || 1
        },
        isFull: (session.current_bookings || 0) >= (session.max_capacity || 1)
      }))

      // Group sessions by week
      const grouped = groupSessionsByWeek(transformedSessions)
      setWeeklyAvailableSessions(grouped)

      // Load member's booked sessions
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          booking_time,
          sessions (
            id,
            title,
            session_type,
            start_time,
            end_time,
            trainers (
              profiles (
                full_name
              )
            )
          )
        `)
        .eq('member_id', memberData.id)
        .order('booking_time', { ascending: false })

      if (bookingsError) {
        console.error("Error loading bookings:", bookingsError)
      }

      // Transform booked sessions
      const transformedBookedSessions = (bookingsData || []).map(booking => ({
        id: (booking.sessions as any)?.id || booking.id,
        type: (booking.sessions as any)?.session_type || 'Unknown',
        trainer: (booking.sessions as any)?.trainers?.profiles?.full_name || 'Unknown',
        date: (booking.sessions as any)?.start_time ? new Date((booking.sessions as any).start_time).toISOString().split('T')[0] : 'Unknown',
        time: (booking.sessions as any)?.start_time && (booking.sessions as any)?.end_time 
          ? `${new Date((booking.sessions as any).start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${new Date((booking.sessions as any).end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` 
          : 'Unknown',
        status: booking.status === 'confirmed' ? 'Upcoming' : booking.status === 'cancelled' ? 'Cancelled' : 'Completed'
      }))

      setMemberSessions(transformedBookedSessions)

      // Set booked session IDs
      const bookedIds = new Set(transformedBookedSessions.map(session => session.id))
      setBookedSessionIds(bookedIds)

    } catch (error) {
      console.error("Error loading member data:", error)
      toast({
        title: "Error Loading Data",
        description: "Failed to load session data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const weekKeys = Object.keys(weeklyAvailableSessions).sort()
  const currentWeekKey = weekKeys[currentWeekIndex] || ""
  const currentWeekSessions = weeklyAvailableSessions[currentWeekKey] || []

  const formatWeekRange = (weekKey) => {
    if (!weekKey) return "No sessions available"

    const weekStart = new Date(weekKey)
    const weekEnd = new Date(weekKey)
    weekEnd.setDate(weekEnd.getDate() + 6)

    const formatDate = (date) => {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }

    return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`
  }

  const handleBookSession = async (session) => {
    if (!currentMemberId) {
      toast({
        title: "Authentication Required",
        description: "Please log in to book sessions.",
        variant: "destructive",
      })
      return
    }

    // Check if session is already booked
    if (bookedSessionIds.has(session.id)) {
      toast({
        title: "Already Booked",
        description: "You have already booked this session.",
        variant: "destructive",
      })
      return
    }

    // Check if member has available sessions in their package
    const packageInfo = memberPackages[session.type]

    if (!packageInfo) {
      toast({
        title: "Package Not Found",
        description: `You don't have a package for ${session.type} sessions.`,
        variant: "destructive",
      })
      return
    }

    if (packageInfo.remaining <= 0) {
      toast({
        title: "No Sessions Remaining",
        description: `You don't have any ${session.type} sessions remaining in your package.`,
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const supabase = createClient()

      // Find the matching member package that can book this session type
      const packageInfo = memberPackages[session.type]
      if (!packageInfo) {
        throw new Error("No valid package found for this session type")
      }

      const { data: memberPackageData, error: packageError } = await supabase
        .from('member_packages')
        .select(`
          id, 
          sessions_remaining,
          packages (
            package_type,
            name
          )
        `)
        .eq('member_id', currentMemberId)
        .eq('status', 'active')
        .gt('sessions_remaining', 0)

      if (packageError || !memberPackageData || memberPackageData.length === 0) {
        throw new Error("No valid package found")
      }

      // Find the best matching package for this session type
      let selectedPackage = null
      for (const pkg of memberPackageData) {
        const pkgType = (pkg.packages as any)?.package_type || 'Unknown'
        const pkgName = (pkg.packages as any)?.name || pkgType
        
        // Check if this package can book the session type
        if (packageInfo.packageType === pkgType || packageInfo.packageName === pkgName) {
          selectedPackage = pkg
          break
        }
      }
      
      // If no exact match, use the first available package for general/monthly packages
      if (!selectedPackage) {
        for (const pkg of memberPackageData) {
          const pkgType = (pkg.packages as any)?.package_type || 'Unknown'
          if (pkgType.toLowerCase() === 'monthly' || pkgType.toLowerCase() === 'general') {
            selectedPackage = pkg
            break
          }
        }
      }

      // If still no match, use the first available package
      if (!selectedPackage) {
        selectedPackage = memberPackageData[0]
      }

      // Create booking
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          member_id: currentMemberId,
          session_id: session.id,
          member_package_id: selectedPackage.id,
          status: 'confirmed',
          booking_time: new Date().toISOString()
        })
        .select()
        .single()

      if (bookingError) {
        throw bookingError
      }

      // Update member package sessions remaining
      const { error: updatePackageError } = await supabase
        .from('member_packages')
        .update({
          sessions_remaining: selectedPackage.sessions_remaining - 1
        })
        .eq('id', selectedPackage.id)

      if (updatePackageError) {
        throw updatePackageError
      }

      // Update session current bookings
      const { error: updateSessionError } = await supabase
        .from('sessions')
        .update({
          current_bookings: session.capacity.booked + 1
        })
        .eq('id', session.id)

      if (updateSessionError) {
        throw updateSessionError
      }

      // Update local state
      const updatedWeeklySessions = { ...weeklyAvailableSessions }
      Object.keys(updatedWeeklySessions).forEach((weekKey) => {
        updatedWeeklySessions[weekKey] = updatedWeeklySessions[weekKey].map((s) => {
          if (s.id === session.id) {
            return {
              ...s,
              capacity: {
                ...s.capacity,
                booked: s.capacity.booked + 1,
              },
            }
          }
          return s
        })
      })
      setWeeklyAvailableSessions(updatedWeeklySessions)

      // Update member packages
      const updatedPackages = { ...memberPackages }
      updatedPackages[session.type].remaining -= 1
      setMemberPackages(updatedPackages)

      // Add new booking to member sessions
      const newBookedSession = {
        id: session.id,
        type: session.type,
        trainer: session.trainer,
        date: session.date,
        time: session.time,
        status: "Upcoming",
      }

      const updatedMemberSessions = [...memberSessions, newBookedSession]
      setMemberSessions(updatedMemberSessions)

      // Add to booked session IDs
      const updatedBookedIds = new Set([...bookedSessionIds, session.id])
      setBookedSessionIds(updatedBookedIds)

      toast({
        title: "Session Booked",
        description: `Your ${session.type} session has been successfully booked.`,
      })

    } catch (error) {
      console.error("Error booking session:", error)
      toast({
        title: "Booking Failed",
        description: "Failed to book the session. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSession = async (session) => {
    if (!currentMemberId) {
      toast({
        title: "Authentication Required",
        description: "Please log in to cancel sessions.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const supabase = createClient()

      // Find the booking to cancel
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('id, member_package_id')
        .eq('member_id', currentMemberId)
        .eq('session_id', session.id)
        .eq('status', 'confirmed')
        .single()

      if (bookingError || !bookingData) {
        throw new Error("Booking not found")
      }

      // Update booking status to cancelled
      const { error: updateBookingError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingData.id)

      if (updateBookingError) {
        throw updateBookingError
      }

      // Reimburse the session to member package
      const { data: memberPackageData, error: packageError } = await supabase
        .from('member_packages')
        .select('sessions_remaining')
        .eq('id', bookingData.member_package_id)
        .single()

      if (packageError) {
        throw packageError
      }

      const { error: updatePackageError } = await supabase
        .from('member_packages')
        .update({
          sessions_remaining: memberPackageData.sessions_remaining + 1
        })
        .eq('id', bookingData.member_package_id)

      if (updatePackageError) {
        throw updatePackageError
      }

      // Update session current bookings
      const { error: updateSessionError } = await supabase
        .from('sessions')
        .update({
          current_bookings: Math.max(session.capacity.booked - 1, 0)
        })
        .eq('id', session.id)

      if (updateSessionError) {
        throw updateSessionError
      }

      // Update local state
      const updatedMemberSessions = memberSessions.map((s) => 
        s.id === session.id ? { ...s, status: "Cancelled" } : s
      )
      setMemberSessions(updatedMemberSessions)

      // Remove from booked session IDs
      const updatedBookedIds = new Set(bookedSessionIds)
      updatedBookedIds.delete(session.id)
      setBookedSessionIds(updatedBookedIds)

      // Update member packages
      const updatedPackages = { ...memberPackages }
      if (updatedPackages[session.type]) {
        updatedPackages[session.type].remaining += 1
      }
      setMemberPackages(updatedPackages)

      // Update the session capacity in the current week sessions
      const updatedWeeklySessions = { ...weeklyAvailableSessions }
      Object.keys(updatedWeeklySessions).forEach((weekKey) => {
        updatedWeeklySessions[weekKey] = updatedWeeklySessions[weekKey].map((s) => {
          if (s.id === session.id) {
            return {
              ...s,
              capacity: {
                ...s.capacity,
                booked: Math.max(s.capacity.booked - 1, 0),
              },
            }
          }
          return s
        })
      })
      setWeeklyAvailableSessions(updatedWeeklySessions)

      toast({
        title: "Session Cancelled",
        description: "Your session has been cancelled and reimbursed to your package.",
      })

    } catch (error) {
      console.error("Error cancelling session:", error)
      toast({
        title: "Cancellation Failed",
        description: "Failed to cancel the session. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const nextWeek = () => {
    if (currentWeekIndex < weekKeys.length - 1) {
      setCurrentWeekIndex(currentWeekIndex + 1)
    }
  }

  const prevWeek = () => {
    if (currentWeekIndex > 0) {
      setCurrentWeekIndex(currentWeekIndex - 1)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2" aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Book a Session</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Packages</CardTitle>
          <CardDescription>Available sessions in your current packages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(memberPackages).map(([type, info]) => (
              <div key={type} className="border rounded-lg p-4">
                <h3 className="font-medium text-lg">{type}</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Remaining: </span>
                    <span className={info.remaining === 0 ? "text-red-500 font-medium" : "font-medium"}>
                      {info.remaining}/{info.total}
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Expires: </span>
                    <span>{info.expiry}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available">Available Sessions</TabsTrigger>
          <TabsTrigger value="booked">Your Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Available Sessions</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={prevWeek} disabled={currentWeekIndex === 0}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">{formatWeekRange(currentWeekKey)}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextWeek}
                    disabled={currentWeekIndex >= weekKeys.length - 1}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>Select a session to book</CardDescription>
            </CardHeader>
            <CardContent>
              {currentWeekSessions.length > 0 ? (
                <div className="space-y-4">
                  {currentWeekSessions.map((session) => {
                    const packageInfo = memberPackages[session.type]
                    const canBook =
                      packageInfo && packageInfo.remaining > 0 && !session.isFull && !bookedSessionIds.has(session.id)

                    return (
                      <div key={session.id} className="border rounded-lg p-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{session.type}</h3>
                              {session.isFull && <Badge variant="destructive">Full</Badge>}
                              {!packageInfo && <Badge variant="outline">No Package</Badge>}
                              {packageInfo && packageInfo.remaining === 0 && (
                                <Badge variant="outline" className="text-red-500">
                                  No Sessions Left
                                </Badge>
                              )}
                              {bookedSessionIds.has(session.id) && <Badge variant="secondary">Booked</Badge>}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{session.trainer}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{session.date}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{session.time}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-sm">
                              <span className="text-muted-foreground">Capacity: </span>
                              <span>
                                {session.capacity.booked}/{session.capacity.total}
                              </span>
                            </div>
                            <Button onClick={() => handleBookSession(session)} disabled={!canBook}>
                              Book
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No sessions available for this week.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="booked">
          <Card>
            <CardHeader>
              <CardTitle>Your Sessions</CardTitle>
              <CardDescription>All your booked, completed, and cancelled sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {memberSessions.length > 0 ? (
                <div className="space-y-4">
                  {memberSessions.map((session) => (
                    <div key={session.id} className="border rounded-lg p-4">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{session.type}</h3>
                            <Badge
                              variant={
                                session.status === "Completed"
                                  ? "default"
                                  : session.status === "Upcoming"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {session.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{session.trainer}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{session.date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{session.time}</span>
                            </div>
                          </div>
                        </div>
                        {session.status === "Upcoming" && (
                          <Button variant="destructive" onClick={() => handleCancelSession(session)}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">You haven't booked any sessions yet.</p>
                  <Button variant="outline" className="mt-4" onClick={() => setActiveTab("available")}>
                    Browse Available Sessions
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
