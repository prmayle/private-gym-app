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

      // Load member data
      const storedMembers = JSON.parse(localStorage.getItem("gym-members") || "[]")
      let foundMember = storedMembers.find((m: any) => m.id === memberId)

      // Fallback to default members
      if (!foundMember) {
        const defaultMembers = [
          {
            id: "1",
            name: "John Doe",
            email: "john.doe@email.com",
            packages: [
              {
                id: "pkg1",
                name: "Personal Training",
                sessions: 10,
                remaining: 6,
                type: "Personal Training",
              },
              {
                id: "pkg2",
                name: "Group Classes",
                sessions: 20,
                remaining: 15,
                type: "Group Class",
              },
            ],
          },
          {
            id: "2",
            name: "Jane Smith",
            email: "jane.smith@email.com",
            packages: [
              {
                id: "pkg3",
                name: "Personal Training",
                sessions: 8,
                remaining: 4,
                type: "Personal Training",
              },
            ],
          },
          {
            id: "4",
            name: "Emily Williams",
            email: "emily.williams@email.com",
            packages: [
              {
                id: "pkg4",
                name: "Group Classes",
                sessions: 12,
                remaining: 8,
                type: "Group Class",
              },
              {
                id: "pkg5",
                name: "Yoga Sessions",
                sessions: 10,
                remaining: 7,
                type: "Yoga",
              },
            ],
          },
          {
            id: "5",
            name: "Robert Brown",
            email: "robert.brown@email.com",
            packages: [
              {
                id: "pkg6",
                name: "HIIT Classes",
                sessions: 15,
                remaining: 12,
                type: "Group Class",
              },
            ],
          },
        ]
        foundMember = defaultMembers.find((m) => m.id === memberId)
      }

      if (!foundMember) {
        setError("Member not found")
        return
      }

      setMember(foundMember)

      // Load session data
      const storedSessions = JSON.parse(localStorage.getItem("gym-calendar-slots") || "[]")
      const mockSessions: Session[] = [
        {
          id: "s1",
          title: "Personal Training Session",
          date: "2025-01-15",
          time: "10:00 AM - 11:00 AM",
          type: "Personal Training",
          trainer: "Mike Johnson",
          capacity: { booked: 0, total: 1 },
          description: "One-on-one personal training session",
        },
        {
          id: "s2",
          title: "Group HIIT Class",
          date: "2025-01-15",
          time: "2:00 PM - 3:00 PM",
          type: "Group Class",
          trainer: "Sarah Williams",
          capacity: { booked: 5, total: 10 },
          description: "High-intensity interval training class",
        },
        {
          id: "s3",
          title: "Yoga Flow Session",
          date: "2025-01-16",
          time: "9:00 AM - 10:00 AM",
          type: "Yoga",
          trainer: "Emma Thompson",
          capacity: { booked: 3, total: 12 },
          description: "Relaxing yoga flow for all levels",
        },
        {
          id: "s4",
          title: "Personal Training Session",
          date: "2025-01-16",
          time: "11:00 AM - 12:00 PM",
          type: "Personal Training",
          trainer: "David Lee",
          capacity: { booked: 0, total: 1 },
          description: "Strength training focused session",
        },
        {
          id: "s5",
          title: "Group Fitness Class",
          date: "2025-01-17",
          time: "6:00 PM - 7:00 PM",
          type: "Group Class",
          trainer: "Sarah Williams",
          capacity: { booked: 15, total: 15 },
          description: "Full body workout class",
        },
        {
          id: "s6",
          title: "Morning Yoga",
          date: "2025-01-18",
          time: "7:00 AM - 8:00 AM",
          type: "Yoga",
          trainer: "Emma Thompson",
          capacity: { booked: 2, total: 10 },
          description: "Start your day with gentle yoga",
        },
      ]

      const foundSession = [...storedSessions, ...mockSessions].find((s) => s.id === sessionId)

      if (!foundSession) {
        setError("Session not found")
        return
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

      // Find matching package
      const matchingPackage = member.packages?.find((pkg: any) => {
        const type = typeof pkg === "object" && pkg.type ? pkg.type : pkg
        const remaining = typeof pkg === "object" && pkg.remaining ? pkg.remaining : 0
        return type === session.type && remaining > 0
      })

      if (!matchingPackage) {
        throw new Error("No matching package found")
      }

      // Simulate booking process
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Update session capacity
      const updatedSession = {
        ...session,
        capacity: {
          ...session.capacity,
          booked: session.capacity.booked + 1,
        },
        bookedMembers: [...(session.bookedMembers || []), member.name],
      }

      // Update package remaining sessions
      const updatedPackages = member.packages.map((pkg: any) => {
        if (pkg.id === matchingPackage.id) {
          return { ...pkg, remaining: pkg.remaining - 1 }
        }
        return pkg
      })

      // Save updated session to localStorage
      const allSessions = JSON.parse(localStorage.getItem("gym-calendar-slots") || "[]")
      const sessionIndex = allSessions.findIndex((s: any) => s.id === sessionId)

      if (sessionIndex !== -1) {
        allSessions[sessionIndex] = updatedSession
      } else {
        allSessions.push(updatedSession)
      }

      localStorage.setItem("gym-calendar-slots", JSON.stringify(allSessions))

      // Update member packages in localStorage
      const storedMembers = JSON.parse(localStorage.getItem("gym-members") || "[]")
      const memberIndex = storedMembers.findIndex((m: any) => m.id === memberId)

      if (memberIndex !== -1) {
        storedMembers[memberIndex] = {
          ...storedMembers[memberIndex],
          packages: updatedPackages,
        }
        localStorage.setItem("gym-members", JSON.stringify(storedMembers))
      }

      // Save booking to member-booked-sessions
      const memberBookings = JSON.parse(localStorage.getItem("member-booked-sessions") || "[]")
      memberBookings.push({
        id: sessionId,
        memberId,
        memberName: member.name,
        sessionTitle: session.title,
        sessionType: session.type,
        date: session.date,
        time: session.time,
        trainer: session.trainer,
        bookedAt: new Date().toISOString(),
        bookedBy: "admin",
      })

      localStorage.setItem("member-booked-sessions", JSON.stringify(memberBookings))

      // Log activity
      const activities = JSON.parse(localStorage.getItem("admin-activities") || "[]")
      activities.unshift({
        id: `activity-${Date.now()}`,
        type: "session_booked",
        message: "Session booked for member",
        details: `${session.title} booked for ${member.name}`,
        timestamp: new Date().toISOString(),
        category: "bookings",
        memberId: member.id,
        memberName: member.name,
        sessionId: session.id,
        sessionTitle: session.title,
      })
      localStorage.setItem("admin-activities", JSON.stringify(activities))

      toast({
        title: "Booking Confirmed",
        description: `${session.title} has been successfully booked for ${member.name}`,
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
