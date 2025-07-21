"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/utils/supabase/client"
import { emailService } from "@/lib/email-service"
import { ArrowLeft, Calendar, User, Users, CheckCircle, AlertCircle, Package, Loader2 } from "lucide-react"

interface Session {
  id: string
  title: string
  date: string
  time: string
  type: string
  trainer: string
  capacity: { booked: number; total: number }
  bookedMembers?: string[]
  description?: string
}

interface Member {
  id: string
  name: string
  email: string
  packages: any[]
}

export default function ConfirmBookingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const memberId = searchParams.get("memberId")
  const memberName = searchParams.get("memberName")
  const sessionId = searchParams.get("sessionId")

  const [member, setMember] = useState<Member | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!memberId || !sessionId) {
      router.push("/admin/book-session")
      return
    }
    loadData()
  }, [memberId, sessionId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      // Load member data from Supabase
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select(`
          id,
          user_id,
          joined_at,
          membership_status,
          profiles (
            id,
            email,
            full_name,
            phone
          )
        `)
        .eq('id', memberId)
        .single()

      if (memberError) {
        setError("Member not found")
        return
      }

      // Load member packages
      const { data: memberPackagesData, error: packagesError } = await supabase
        .from('member_packages')
        .select(`
          id,
          member_id,
          sessions_remaining,
          status,
          start_date,
          end_date,
          packages (
            id,
            name,
            package_type,
            session_count
          )
        `)
        .eq('member_id', memberId)
        .eq('status', 'active')
        .gt('sessions_remaining', 0)

      if (packagesError) {
        console.error("Error loading member packages:", packagesError)
      }

      // Transform member data
      const memberPackages = (memberPackagesData || []).map(mp => ({
        id: mp.id,
        name: (mp.packages as any)?.name || 'Unknown Package',
        sessions: (mp.packages as any)?.session_count || 0,
        remaining: mp.sessions_remaining || 0,
        expiryDate: mp.end_date,
        type: (mp.packages as any)?.package_type || 'Unknown'
      }))

      const foundMember: Member = {
        id: memberData.id,
        name: (memberData.profiles as any)?.full_name || 'No Name',
        email: (memberData.profiles as any)?.email || 'No Email',
        packages: memberPackages
      }

      setMember(foundMember)

      // Load session data from Supabase
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select(`
          id,
          title,
          start_time,
          end_time,
          session_type,
          status,
          current_bookings,
          max_capacity,
          description,
          trainer_id,
          trainers (
            profiles (
              full_name
            )
          )
        `)
        .eq('id', sessionId)
        .single()

      if (sessionError) {
        setError("Session not found")
        return
      }

      // Transform session data
      const startTime = new Date(sessionData.start_time)
      const endTime = new Date(sessionData.end_time)
      
      const foundSession: Session = {
        id: sessionData.id,
        title: sessionData.title,
        date: startTime.toISOString().split('T')[0],
        time: `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        type: sessionData.session_type,
        trainer: (sessionData.trainers as any)?.profiles?.full_name || 'Unknown Trainer',
        capacity: {
          booked: sessionData.current_bookings || 0,
          total: sessionData.max_capacity || 1
        },
        description: sessionData.description || ''
      }

      setSession(foundSession)
    } catch (error) {
      console.error("Error loading data:", error)
      setError("Failed to load booking information")
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmBooking = async () => {
    if (!member || !session) return

    try {
      setBooking(true)
      const supabase = createClient()

      // Find matching package
      const matchingPackage = member.packages?.find((pkg: any) => {
        const type = typeof pkg === "object" && pkg.type ? pkg.type : pkg
        const remaining = typeof pkg === "object" && pkg.remaining ? pkg.remaining : 0
        return type === session.type && remaining > 0
      })

      if (!matchingPackage) {
        throw new Error("No matching package found")
      }

      // Create booking in database
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          member_id: member.id,
          session_id: session.id,
          member_package_id: matchingPackage.id,
          booking_time: new Date().toISOString(),
          status: 'confirmed',
          notes: 'Booked by admin',
          created_by: 'admin'
        })
        .select()
        .single()

      if (bookingError) {
        throw bookingError
      }

      // Update session capacity
      const { error: sessionUpdateError } = await supabase
        .from('sessions')
        .update({
          current_bookings: session.capacity.booked + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.id)

      if (sessionUpdateError) {
        throw sessionUpdateError
      }

      // Update package remaining sessions
      const { error: packageUpdateError } = await supabase
        .from('member_packages')
        .update({
          sessions_remaining: matchingPackage.remaining - 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', matchingPackage.id)

      if (packageUpdateError) {
        throw packageUpdateError
      }

      // Create notification for member
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: member.id,
          title: 'Session Booked',
          message: `Your ${session.title} session has been booked for ${new Date(session.date).toLocaleDateString()}`,
          type: 'booking',
          is_read: false,
          metadata: {
            session_id: session.id,
            session_title: session.title,
            session_date: session.date,
            session_time: session.time,
            trainer: session.trainer,
            booked_by: 'admin'
          }
        })

      if (notificationError) {
        console.error("Error creating notification:", notificationError)
      }

      // Send booking confirmation email
      try {
        await emailService.sendBookingConfirmation({
          memberName: member.name,
          memberEmail: member.email,
          sessionTitle: session.title,
          sessionDate: new Date(session.date).toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          sessionTime: session.time,
          trainerName: session.trainer,
          sessionLocation: session.location || 'Main Gym Floor',
          sessionType: session.type
        })
        console.log('📧 Booking confirmation email sent successfully')
      } catch (emailError) {
        console.error("Error sending booking confirmation email:", emailError)
        // Don't fail the booking if email fails
      }

      toast({
        title: "Booking Confirmed",
        description: `${session.title} has been successfully booked for ${member.name}. Confirmation email sent.`,
      })

      // Redirect to success or back to admin
      setTimeout(() => {
        router.push("/admin")
      }, 2000)
    } catch (error) {
      console.error("Error booking session:", error)
      toast({
        title: "Booking Failed",
        description: "Failed to book the session. Please try again.",
        variant: "destructive",
      })
    } finally {
      setBooking(false)
    }
  }

  const getMatchingPackage = () => {
    if (!member || !session) return null
    return member.packages?.find((pkg: any) => {
      const type = typeof pkg === "object" && pkg.type ? pkg.type : pkg
      const remaining = typeof pkg === "object" && pkg.remaining ? pkg.remaining : 0
      return type === session.type && remaining > 0
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading booking information...</span>
      </div>
    )
  }

  if (error || !member || !session) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" asChild className="mr-2">
            <Link href="/admin/book-session">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Booking Error</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "Failed to load booking information"}</AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/admin/book-session">Start Over</Link>
        </Button>
      </div>
    )
  }

  const matchingPackage = getMatchingPackage()

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link href={`/admin/book-session/select-session?memberId=${memberId}&memberName=${memberName}`}>
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to Session Selection</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Confirm Booking</h1>
          <p className="text-muted-foreground">Step 3: Review and confirm the session booking</p>
        </div>
      </div>

      {/* Booking Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Booking Summary
          </CardTitle>
          <CardDescription>Please review the booking details before confirming</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Member Information */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Member Information
            </h3>
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Name:</span>
                  <p className="font-medium">{member.name}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <p>{member.email}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Session Information */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Session Information
            </h3>
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">Session:</span>
                  <p className="font-medium">{session.title}</p>
                </div>
                {session.description && (
                  <div>
                    <span className="text-sm text-muted-foreground">Description:</span>
                    <p className="text-sm">{session.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Date:</span>
                    <p className="font-medium">
                      {new Date(session.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Time:</span>
                    <p className="font-medium">{session.time}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Trainer:</span>
                    <p className="font-medium">{session.trainer}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Type:</span>
                    <Badge variant="outline" className="ml-2">
                      {session.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span className="text-sm">
                      {session.capacity.booked + 1}/{session.capacity.total} after booking
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Package Information */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Package Usage
            </h3>
            <div className="bg-muted/30 rounded-lg p-4">
              {matchingPackage ? (
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Package:</span>
                    <p className="font-medium">{matchingPackage.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Sessions remaining:</span>
                    <p className="font-medium">
                      {matchingPackage.remaining} → {matchingPackage.remaining - 1}
                    </p>
                  </div>
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Package Match Confirmed</AlertTitle>
                    <AlertDescription>
                      This session will use 1 session from the member's {matchingPackage.name} package.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Matching Package</AlertTitle>
                  <AlertDescription>
                    The member doesn't have an available package for this session type.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href={`/admin/book-session/select-session?memberId=${memberId}&memberName=${memberName}`}>
            Back to Session Selection
          </Link>
        </Button>

        <Button
          onClick={handleConfirmBooking}
          disabled={!matchingPackage || booking}
          className="flex items-center gap-2"
        >
          {booking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Booking Session...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              Confirm Booking
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
