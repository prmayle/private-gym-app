"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, ArrowRight, Calendar, Clock, User } from "lucide-react"

// Mock data for the current member's package
const memberPackages = {
  "Personal Training": {
    remaining: 5,
    total: 10,
    expiry: "2023-12-31",
  },
  "Group Class": {
    remaining: 8,
    total: 12,
    expiry: "2023-12-31",
  },
  "Fitness Assessment": {
    remaining: 0,
    total: 2,
    expiry: "2023-12-31",
  },
}

// Add more mock sessions for different weeks to enable proper week navigation
const availableSessions = [
  // Week 1: June 18-24, 2023
  {
    id: "101",
    type: "Personal Training",
    trainer: "Mike Johnson",
    date: "2023-06-20",
    time: "10:00 AM - 11:00 AM",
    capacity: { booked: 0, total: 1 },
    isFull: false,
  },
  {
    id: "102",
    type: "Group Class",
    trainer: "Sarah Williams",
    date: "2023-06-20",
    time: "2:00 PM - 3:00 PM",
    capacity: { booked: 5, total: 10 },
    isFull: false,
  },
  {
    id: "103",
    type: "Personal Training",
    trainer: "David Lee",
    date: "2023-06-21",
    time: "11:00 AM - 12:00 PM",
    capacity: { booked: 0, total: 1 },
    isFull: false,
  },
  {
    id: "104",
    type: "Fitness Assessment",
    trainer: "Mike Johnson",
    date: "2023-06-21",
    time: "3:00 PM - 4:00 PM",
    capacity: { booked: 0, total: 1 },
    isFull: false,
  },
  {
    id: "105",
    type: "Group Class",
    trainer: "Sarah Williams",
    date: "2023-06-22",
    time: "9:00 AM - 10:00 AM",
    capacity: { booked: 8, total: 10 },
    isFull: false,
  },
  {
    id: "106",
    type: "Personal Training",
    trainer: "Mike Johnson",
    date: "2023-06-22",
    time: "1:00 PM - 2:00 PM",
    capacity: { booked: 0, total: 1 },
    isFull: false,
  },
  {
    id: "107",
    type: "Group Class",
    trainer: "David Lee",
    date: "2023-06-23",
    time: "5:00 PM - 6:00 PM",
    capacity: { booked: 9, total: 10 },
    isFull: false,
  },
  {
    id: "108",
    type: "Fitness Assessment",
    trainer: "Sarah Williams",
    date: "2023-06-24",
    time: "10:00 AM - 11:00 AM",
    capacity: { booked: 0, total: 1 },
    isFull: false,
  },
  // Week 2: June 25 - July 1, 2023
  {
    id: "201",
    type: "Personal Training",
    trainer: "Mike Johnson",
    date: "2023-06-26",
    time: "9:00 AM - 10:00 AM",
    capacity: { booked: 0, total: 1 },
    isFull: false,
  },
  {
    id: "202",
    type: "Group Class",
    trainer: "Sarah Williams",
    date: "2023-06-26",
    time: "6:00 PM - 7:00 PM",
    capacity: { booked: 3, total: 12 },
    isFull: false,
  },
  {
    id: "203",
    type: "Personal Training",
    trainer: "David Lee",
    date: "2023-06-27",
    time: "2:00 PM - 3:00 PM",
    capacity: { booked: 0, total: 1 },
    isFull: false,
  },
  {
    id: "204",
    type: "Group Class",
    trainer: "Mike Johnson",
    date: "2023-06-28",
    time: "7:00 AM - 8:00 AM",
    capacity: { booked: 6, total: 15 },
    isFull: false,
  },
  {
    id: "205",
    type: "Fitness Assessment",
    trainer: "Sarah Williams",
    date: "2023-06-29",
    time: "11:00 AM - 12:00 PM",
    capacity: { booked: 0, total: 1 },
    isFull: false,
  },
  // Week 3: July 2 - July 8, 2023
  {
    id: "301",
    type: "Personal Training",
    trainer: "David Lee",
    date: "2023-07-03",
    time: "8:00 AM - 9:00 AM",
    capacity: { booked: 0, total: 1 },
    isFull: false,
  },
  {
    id: "302",
    type: "Group Class",
    trainer: "Mike Johnson",
    date: "2023-07-03",
    time: "5:00 PM - 6:00 PM",
    capacity: { booked: 4, total: 10 },
    isFull: false,
  },
  {
    id: "303",
    type: "Personal Training",
    trainer: "Sarah Williams",
    date: "2023-07-04",
    time: "10:00 AM - 11:00 AM",
    capacity: { booked: 0, total: 1 },
    isFull: false,
  },
  {
    id: "304",
    type: "Group Class",
    trainer: "David Lee",
    date: "2023-07-05",
    time: "6:30 PM - 7:30 PM",
    capacity: { booked: 7, total: 12 },
    isFull: false,
  },
]

// Mock data for member's booked sessions
const bookedSessions = [
  {
    id: "201",
    type: "Personal Training",
    trainer: "Mike Johnson",
    date: "2023-06-18",
    time: "10:00 AM - 11:00 AM",
    status: "Completed",
  },
  {
    id: "202",
    type: "Group Class",
    trainer: "Sarah Williams",
    date: "2023-06-25",
    time: "2:00 PM - 3:00 PM",
    status: "Upcoming",
  },
  {
    id: "203",
    type: "Personal Training",
    trainer: "David Lee",
    date: "2023-06-15",
    time: "11:00 AM - 12:00 PM",
    status: "Cancelled",
  },
]

// Group sessions by week
const groupSessionsByWeek = (sessions) => {
  const weeks = {}

  sessions.forEach((session) => {
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
    weeks[weekKey].sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time.split(" - ")[0]}`)
      const dateB = new Date(`${b.date} ${b.time.split(" - ")[0]}`)
      return dateA - dateB
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
  const [memberSessions, setMemberSessions] = useState(bookedSessions)
  const [bookedSessionIds, setBookedSessionIds] = useState(new Set())

  useEffect(() => {
    // Load booked sessions from localStorage
    const storedBookedSessions = JSON.parse(localStorage.getItem("member-booked-sessions") || "[]")
    const bookedIds = new Set(storedBookedSessions.map((session) => session.id))
    setBookedSessionIds(bookedIds)

    // Load member sessions from localStorage
    const storedMemberSessions = JSON.parse(localStorage.getItem("member-sessions") || "[]")
    if (storedMemberSessions.length > 0) {
      setMemberSessions(storedMemberSessions)
    }

    // Group available sessions by week
    const grouped = groupSessionsByWeek(availableSessions)
    setWeeklyAvailableSessions(grouped)
  }, [])

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

  const handleBookSession = (session) => {
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

    // Update the session capacity in the current week sessions
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

    // Book the session
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

    // Update package remaining sessions
    memberPackages[session.type].remaining -= 1

    // Save to localStorage
    localStorage.setItem("member-sessions", JSON.stringify(updatedMemberSessions))
    localStorage.setItem(
      "member-booked-sessions",
      JSON.stringify(updatedMemberSessions.filter((s) => s.status === "Upcoming")),
    )

    // After booking the session, update session capacity
    const existingSlots = JSON.parse(localStorage.getItem("gym-calendar-slots") || "[]")
    const updatedSlots = existingSlots.map((slot) => {
      if (slot.id === session.id) {
        return {
          ...slot,
          capacity: slot.capacity
            ? {
                ...slot.capacity,
                booked: (slot.capacity.booked || 0) + 1,
              }
            : { booked: 1, total: slot.total || 1 },
        }
      }
      return slot
    })
    localStorage.setItem("gym-calendar-slots", JSON.stringify(updatedSlots))

    toast({
      title: "Session Booked",
      description: `Your ${session.type} session has been successfully booked.`,
    })
  }

  const handleCancelSession = (session) => {
    // Update session status to cancelled
    const updatedMemberSessions = memberSessions.map((s) => (s.id === session.id ? { ...s, status: "Cancelled" } : s))
    setMemberSessions(updatedMemberSessions)

    // Remove from booked session IDs
    const updatedBookedIds = new Set(bookedSessionIds)
    updatedBookedIds.delete(session.id)
    setBookedSessionIds(updatedBookedIds)

    // Reimburse the package
    memberPackages[session.type].remaining += 1

    // Save to localStorage
    localStorage.setItem("member-sessions", JSON.stringify(updatedMemberSessions))
    localStorage.setItem(
      "member-booked-sessions",
      JSON.stringify(updatedMemberSessions.filter((s) => s.status === "Upcoming")),
    )

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

    // After cancelling the session, update session capacity
    const existingSlots = JSON.parse(localStorage.getItem("gym-calendar-slots") || "[]")
    const updatedSlots = existingSlots.map((slot) => {
      if (slot.id === session.id) {
        return {
          ...slot,
          capacity: slot.capacity
            ? {
                ...slot.capacity,
                booked: Math.max((slot.capacity.booked || 0) - 1, 0),
              }
            : { booked: 0, total: slot.total || 1 },
        }
      }
      return slot
    })
    localStorage.setItem("gym-calendar-slots", JSON.stringify(updatedSlots))

    toast({
      title: "Session Cancelled",
      description: "Your session has been cancelled and reimbursed to your package.",
    })
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
