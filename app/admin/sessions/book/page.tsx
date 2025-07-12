"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Check } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export default function BookSessionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const memberId = searchParams.get("memberId")

  const [member, setMember] = useState(null)
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState("")
  const [selectedPackage, setSelectedPackage] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [availablePackages, setAvailablePackages] = useState([])

  useEffect(() => {
    // Load member data if memberId is provided
    if (memberId) {
      const storedMembers = JSON.parse(localStorage.getItem("gym-members") || "[]")
      const foundMember = storedMembers.find((m) => m.id === memberId)

      if (foundMember) {
        setMember(foundMember)

        // Set available packages for this member
        const memberPackages = foundMember.packages || [
          {
            id: "pkg1",
            name: "Personal Training",
            sessions: 10,
            remaining: 6,
            expiryDate: "2023-12-31",
            type: "Personal",
          },
          {
            id: "pkg2",
            name: "Group Classes",
            sessions: 20,
            remaining: 15,
            expiryDate: "2023-12-31",
            type: "Group",
          },
        ]

        setAvailablePackages(memberPackages.filter((pkg) => pkg.remaining > 0))
      } else {
        // Use mock data if member not found
        setMember({
          id: memberId,
          name: "John Doe",
          email: "john.doe@example.com",
          packages: [
            {
              id: "pkg1",
              name: "Personal Training",
              sessions: 10,
              remaining: 6,
              expiryDate: "2023-12-31",
              type: "Personal",
            },
            {
              id: "pkg2",
              name: "Group Classes",
              sessions: 20,
              remaining: 15,
              expiryDate: "2023-12-31",
              type: "Group",
            },
          ],
        })

        setAvailablePackages([
          {
            id: "pkg1",
            name: "Personal Training",
            sessions: 10,
            remaining: 6,
            expiryDate: "2023-12-31",
            type: "Personal",
          },
          {
            id: "pkg2",
            name: "Group Classes",
            sessions: 20,
            remaining: 15,
            expiryDate: "2023-12-31",
            type: "Group",
          },
        ])
      }
    }

    // Load available sessions
    const savedSlots = JSON.parse(localStorage.getItem("gym-calendar-slots") || "[]")

    // Mock sessions if none exist
    const mockSessions = [
      {
        id: "s1",
        title: "Personal Training",
        date: "2023-06-20",
        time: "10:00 AM - 11:00 AM",
        type: "Personal",
        trainer: "Mike Johnson",
        capacity: { booked: 0, total: 1 },
        bookedMembers: [],
      },
      {
        id: "s2",
        title: "Group HIIT",
        date: "2023-06-20",
        time: "2:00 PM - 3:00 PM",
        type: "Group",
        trainer: "Sarah Williams",
        capacity: { booked: 5, total: 10 },
        bookedMembers: [],
      },
      {
        id: "s3",
        title: "Yoga Class",
        date: "2023-06-21",
        time: "9:00 AM - 10:00 AM",
        type: "Group",
        trainer: "David Lee",
        capacity: { booked: 8, total: 15 },
        bookedMembers: [],
      },
      {
        id: "s4",
        title: "Nutrition Consultation",
        date: "2023-06-22",
        time: "1:00 PM - 2:00 PM",
        type: "Nutrition",
        trainer: "Lisa Johnson",
        capacity: { booked: 0, total: 1 },
        bookedMembers: [],
      },
    ]

    // Combine saved slots with mock sessions
    const allSessions = [...mockSessions, ...savedSlots].filter((session) => {
      // Only show sessions that aren't full
      return !session.capacity || session.capacity.booked < session.capacity.total
    })

    setSessions(allSessions)
    setLoading(false)
  }, [memberId])

  const handleBookSession = () => {
    if (!selectedSession || !selectedPackage) {
      setError("Please select both a session and a package")
      return
    }

    try {
      // Find the selected session and package
      const session = sessions.find((s) => s.id === selectedSession)
      const packageObj = availablePackages.find((p) => p.id === selectedPackage)

      if (!session || !packageObj) {
        setError("Invalid session or package selection")
        return
      }

      // Check if session type matches package type
      if (session.type !== packageObj.type) {
        setError(`This session requires a ${session.type} package, but you selected a ${packageObj.type} package`)
        return
      }

      // Update package remaining sessions
      const updatedPackages = availablePackages.map((p) => {
        if (p.id === selectedPackage) {
          return { ...p, remaining: p.remaining - 1 }
        }
        return p
      })

      // Update session capacity
      const updatedSession = {
        ...session,
        capacity: {
          ...session.capacity,
          booked: session.capacity.booked + 1,
        },
        bookedMembers: [...(session.bookedMembers || []), member.name],
      }

      // Save updated session to localStorage
      const allSessions = JSON.parse(localStorage.getItem("gym-calendar-slots") || "[]")
      const sessionIndex = allSessions.findIndex((s) => s.id === selectedSession)

      if (sessionIndex !== -1) {
        allSessions[sessionIndex] = updatedSession
      } else {
        // This is a mock session, add it to localStorage
        allSessions.push(updatedSession)
      }

      localStorage.setItem("gym-calendar-slots", JSON.stringify(allSessions))

      // Update member packages in localStorage if member exists
      if (memberId) {
        const storedMembers = JSON.parse(localStorage.getItem("gym-members") || "[]")
        const memberIndex = storedMembers.findIndex((m) => m.id === memberId)

        if (memberIndex !== -1) {
          storedMembers[memberIndex] = {
            ...storedMembers[memberIndex],
            packages: updatedPackages,
          }
          localStorage.setItem("gym-members", JSON.stringify(storedMembers))
        }
      }

      // Save booking to member-booked-sessions
      const memberBookings = JSON.parse(localStorage.getItem("member-booked-sessions") || "[]")
      memberBookings.push({
        id: selectedSession,
        memberId,
        memberName: member.name,
        sessionTitle: session.title,
        sessionType: session.type,
        date: session.date,
        time: session.time,
        trainer: session.trainer,
        bookedAt: new Date().toISOString(),
      })

      localStorage.setItem("member-booked-sessions", JSON.stringify(memberBookings))

      setSuccess(true)
      setError(null)

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push("/admin/members")
      }, 2000)
    } catch (err) {
      setError("Failed to book session. Please try again.")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link href="/admin/members">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to Members</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Book Session for Member</h1>
      </div>

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Session booked successfully! Redirecting...</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Book a Session</CardTitle>
          <CardDescription>{member ? `Booking for ${member.name}` : "Select a session and package"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Member Info */}
          {member && (
            <div className="border rounded-md p-4 bg-muted/30">
              <h3 className="font-medium mb-2">Member Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span> {member.name}
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span> {member.email}
                </div>
              </div>
            </div>
          )}

          {/* Session Selection */}
          <div className="space-y-2">
            <Label htmlFor="session">Select Session</Label>
            <RadioGroup value={selectedSession} onValueChange={setSelectedSession} className="space-y-3">
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <div key={session.id} className="flex items-center space-x-2 border rounded-md p-3">
                    <RadioGroupItem value={session.id} id={`session-${session.id}`} />
                    <Label htmlFor={`session-${session.id}`} className="flex-1 cursor-pointer">
                      <div className="font-medium">{session.title || session.type}</div>
                      <div className="text-sm text-muted-foreground">
                        {session.date} • {session.time} • {session.trainer}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {session.capacity.booked}/{session.capacity.total} booked • Type: {session.type}
                      </div>
                    </Label>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 border rounded-md">
                  <p className="text-muted-foreground">No available sessions found</p>
                </div>
              )}
            </RadioGroup>
          </div>

          {/* Package Selection */}
          <div className="space-y-2">
            <Label htmlFor="package">Select Package</Label>
            <Select value={selectedPackage} onValueChange={setSelectedPackage}>
              <SelectTrigger>
                <SelectValue placeholder="Select a package" />
              </SelectTrigger>
              <SelectContent>
                {availablePackages.length > 0 ? (
                  availablePackages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.remaining} sessions left) - Type: {pkg.type}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No packages available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" asChild>
            <Link href="/admin/members">Cancel</Link>
          </Button>
          <Button onClick={handleBookSession} disabled={!selectedSession || !selectedPackage || success}>
            Book Session
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
