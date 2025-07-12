"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/ui/status-badge"
import { useToast } from "@/hooks/use-toast"
import { ReactivationDialog } from "@/components/ui/reactivation-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  ArrowLeft,
  Edit,
  Eye,
  Power,
  PowerOff,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Users,
  MoreHorizontal,
  UserPlus,
} from "lucide-react"

// Enhanced Session interface
export interface Session {
  id: string
  title: string
  date: string
  time: string
  type: string
  trainer: string
  status: "Inactive" | "Completed" | "Available" | "Full"
  capacity: { booked: number; total: number }
  bookedMembers?: string[]
  isManuallyDeactivated?: boolean
  deactivatedAt?: string
  reactivatedAt?: string
  lastModified?: string
  description?: string
}

// Session status logic
const determineSessionStatus = (params: {
  date: string
  capacity: { booked: number; total: number }
  isManuallyDeactivated?: boolean
  bookedMembers?: string[]
}): Session["status"] => {
  const { date, capacity, isManuallyDeactivated, bookedMembers } = params
  const sessionDate = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Priority 1: Inactive (manually deactivated)
  if (isManuallyDeactivated) {
    return "Inactive"
  }

  // Priority 2: Completed (past sessions with bookings)
  if (sessionDate < today && bookedMembers && bookedMembers.length > 0) {
    return "Completed"
  }

  // Priority 3: Full (upcoming and fully booked)
  if (sessionDate >= today && capacity.booked >= capacity.total) {
    return "Full"
  }

  // Priority 4: Available (upcoming with spots)
  return "Available"
}

const getAvailableActions = (status: Session["status"]): string[] => {
  switch (status) {
    case "Inactive":
      return ["reactivate", "view-details"]
    case "Completed":
      return ["view-details"]
    case "Available":
      return ["view-details", "edit-details", "deactivate", "mark-full", "book-member"]
    case "Full":
      return ["view-details", "edit-details"]
    default:
      return ["view-details"]
  }
}

const canDeactivateSession = (status: Session["status"]): boolean => {
  return status === "Available" || status === "Full"
}

const canReactivateSession = (status: Session["status"]): boolean => {
  return status === "Inactive"
}

const canEditSession = (status: Session["status"]): boolean => {
  return status === "Available" || status === "Full"
}

const canBookMember = (status: Session["status"]): boolean => {
  return status === "Available"
}

// Mock trainers and session types
const trainers = [
  { id: "1", name: "Mike Johnson" },
  { id: "2", name: "Sarah Williams" },
  { id: "3", name: "David Lee" },
  { id: "4", name: "Emma Thompson" },
  { id: "5", name: "Lisa Johnson" },
]

const sessionTypes = [
  "Personal Training",
  "Group Class",
  "Fitness Assessment",
  "Nutrition Consultation",
  "Yoga",
  "HIIT",
  "Pilates",
  "Strength Training",
]

// Mock data with enhanced session structure
const mockEvents: Session[] = [
  {
    id: "past-1",
    title: "Group Class – Pilates",
    date: "2023-05-15",
    time: "10:00 AM - 11:00 AM",
    type: "Group Class",
    trainer: "Emma Thompson",
    status: "Completed",
    capacity: { booked: 2, total: 10 },
    bookedMembers: ["John Doe", "Jane Smith"],
    lastModified: "2023-05-15T09:00:00Z",
    description: "Relaxing pilates session for core strength",
  },
  {
    id: "future-1",
    title: "Group Class – HIIT",
    date: "2025-07-15",
    time: "11:30 AM - 12:30 PM",
    type: "Group Class",
    trainer: "Sarah Williams",
    status: "Available",
    capacity: { booked: 2, total: 10 },
    bookedMembers: ["Michael Brown", "Emily Davis"],
    lastModified: "2025-07-01T10:00:00Z",
    description: "High-intensity interval training",
  },
  {
    id: "today-1",
    title: "Personal Training - Alex Murphy",
    date: new Date().toISOString().split("T")[0],
    time: "2:00 PM - 3:00 PM",
    type: "Personal Training",
    trainer: "Mike Johnson",
    status: "Full",
    capacity: { booked: 1, total: 1 },
    bookedMembers: ["Alex Murphy"],
    lastModified: new Date().toISOString(),
    description: "One-on-one strength training session",
  },
  {
    id: "inactive-1",
    title: "Group Class - Cancelled Yoga",
    date: "2025-06-20",
    time: "6:00 PM - 7:00 PM",
    type: "Group Class",
    trainer: "Sarah Williams",
    status: "Inactive",
    capacity: { booked: 0, total: 12 },
    bookedMembers: [],
    isManuallyDeactivated: true,
    deactivatedAt: "2025-06-01T10:00:00Z",
    lastModified: "2025-06-01T10:00:00Z",
    description: "Cancelled due to trainer unavailability",
  },
  {
    id: "1",
    title: "Personal Training - John Doe",
    date: "2025-06-15",
    time: "10:00 AM - 11:00 AM",
    type: "Personal Training",
    trainer: "Mike Johnson",
    status: "Available",
    capacity: { booked: 0, total: 1 },
    bookedMembers: [],
    lastModified: "2025-06-01T10:00:00Z",
    description: "Personalized fitness training",
  },
]

// Pagination constants
const SESSIONS_PER_PAGE = 20

// Activity logging helper
const logActivity = (activity: {
  type: string
  message: string
  details?: string
  sessionId?: string
  sessionTitle?: string
  memberId?: string
  memberName?: string
  status?: string
  priority?: string
}) => {
  const activities = JSON.parse(localStorage.getItem("admin-activities") || "[]")
  activities.unshift({
    id: `activity-${Date.now()}`,
    category: "sessions",
    timestamp: new Date().toISOString(),
    ...activity,
  })
  localStorage.setItem("admin-activities", JSON.stringify(activities.slice(0, 50)))
}

export default function SessionsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [customSlots, setCustomSlots] = useState<Session[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [reactivationDialog, setReactivationDialog] = useState<{
    isOpen: boolean
    session: Session | null
  }>({
    isOpen: false,
    session: null,
  })

  // Filter and sort state
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [trainerFilter, setTrainerFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)

  // Form state for creating new sessions
  const [newSession, setNewSession] = useState({
    title: "",
    date: "",
    time: "",
    type: "",
    trainer: "",
    capacity: 1,
    description: "",
  })

  // Booking state
  const [members, setMembers] = useState<any[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState("")
  const [availableMembers, setAvailableMembers] = useState<any[]>([])

  // Data Loading
  useEffect(() => {
    loadData()
    const id = setInterval(loadData, 30_000) // 30s refresh
    return () => clearInterval(id)
  }, [])

  const loadData = async () => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 300))

    const stored = JSON.parse(localStorage.getItem("gym-calendar-slots") || "[]")
    setCustomSlots(stored)

    // Merge and determine status for each session
    const merged: Session[] = [...mockEvents, ...stored].map((s) => ({
      ...s,
      status: determineSessionStatus({
        date: s.date,
        capacity: s.capacity,
        isManuallyDeactivated: s.isManuallyDeactivated,
        bookedMembers: s.bookedMembers,
      }),
    }))

    setSessions(merged)

    // Load members
    const storedMembers = JSON.parse(localStorage.getItem("gym-members") || "[]")
    const defaultMembers = [
      {
        id: "1",
        name: "John Doe",
        email: "john.doe@email.com",
        status: "Active",
        packages: [
          { name: "Personal Training", remaining: 6, type: "Personal Training" },
          { name: "Group Classes", remaining: 15, type: "Group Class" },
        ],
      },
      {
        id: "2",
        name: "Jane Smith",
        email: "jane.smith@email.com",
        status: "Active",
        packages: [{ name: "Personal Training", remaining: 4, type: "Personal Training" }],
      },
      {
        id: "4",
        name: "Emily Williams",
        email: "emily.williams@email.com",
        status: "Active",
        packages: [
          { name: "Group Classes", remaining: 8, type: "Group Class" },
          { name: "Yoga Sessions", remaining: 7, type: "Yoga" },
        ],
      },
      {
        id: "5",
        name: "Robert Brown",
        email: "robert.brown@email.com",
        status: "Active",
        packages: [{ name: "HIIT Classes", remaining: 12, type: "Group Class" }],
      },
    ]
    setMembers([...storedMembers, ...defaultMembers].filter((m) => m.status === "Active"))

    setLoading(false)
  }

  // Filter and sort sessions
  const filteredAndSortedSessions = useMemo(() => {
    const filtered = sessions.filter((session) => {
      const matchesSearch =
        session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.trainer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.type.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === "all" || session.status === statusFilter
      const matchesType = typeFilter === "all" || session.type === typeFilter
      const matchesTrainer = trainerFilter === "all" || session.trainer === trainerFilter

      return matchesSearch && matchesStatus && matchesType && matchesTrainer
    })

    // Sort sessions
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case "date":
          aValue = new Date(`${a.date} ${a.time.split(" - ")[0]}`)
          bValue = new Date(`${b.date} ${b.time.split(" - ")[0]}`)
          break
        case "status":
          aValue = a.status
          bValue = b.status
          break
        case "type":
          aValue = a.type
          bValue = b.type
          break
        case "trainer":
          aValue = a.trainer
          bValue = b.trainer
          break
        case "capacity":
          aValue = a.capacity.booked / a.capacity.total
          bValue = b.capacity.booked / b.capacity.total
          break
        default:
          aValue = a.title
          bValue = b.title
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1
      return 0
    })

    return filtered
  }, [sessions, searchTerm, statusFilter, typeFilter, trainerFilter, sortBy, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedSessions.length / SESSIONS_PER_PAGE)
  const paginatedSessions = filteredAndSortedSessions.slice(
    (currentPage - 1) * SESSIONS_PER_PAGE,
    currentPage * SESSIONS_PER_PAGE,
  )

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, typeFilter, trainerFilter, sortBy, sortOrder])

  // Session Actions
  const updateSessionInStorage = (updatedSession: Session) => {
    const updatedSessions = sessions.map((s) => (s.id === updatedSession.id ? updatedSession : s))
    setSessions(updatedSessions)

    // Update localStorage
    const customUpdated = customSlots.map((s) => (s.id === updatedSession.id ? updatedSession : s))
    localStorage.setItem("gym-calendar-slots", JSON.stringify(customUpdated))
  }

  const handleCreateSession = async () => {
    if (!newSession.title || !newSession.date || !newSession.time || !newSession.type || !newSession.trainer) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      const sessionId = `session-${Date.now()}`
      const session: Session = {
        id: sessionId,
        title: newSession.title,
        date: newSession.date,
        time: newSession.time,
        type: newSession.type,
        trainer: newSession.trainer,
        status: "Available",
        capacity: { booked: 0, total: newSession.capacity },
        bookedMembers: [],
        description: newSession.description,
        lastModified: new Date().toISOString(),
      }

      // Determine actual status based on business rules
      session.status = determineSessionStatus({
        date: session.date,
        capacity: session.capacity,
        isManuallyDeactivated: false,
        bookedMembers: session.bookedMembers,
      })

      // Save to localStorage
      const existingSessions = JSON.parse(localStorage.getItem("gym-calendar-slots") || "[]")
      const updatedSessions = [...existingSessions, session]
      localStorage.setItem("gym-calendar-slots", JSON.stringify(updatedSessions))

      // Log activity
      logActivity({
        type: "session_created",
        message: `New session "${session.title}" created`,
        details: `${session.type} session scheduled for ${session.date} at ${session.time} with ${session.trainer}`,
        sessionId: session.id,
        sessionTitle: session.title,
        status: "success",
        priority: "medium",
      })

      // Update local state
      setSessions((prev) => [...prev, session])

      // Reset form
      setNewSession({
        title: "",
        date: "",
        time: "",
        type: "",
        trainer: "",
        capacity: 1,
        description: "",
      })

      setIsCreateDialogOpen(false)

      toast({
        title: "Session Created",
        description: `${session.title} has been created successfully`,
      })
    } catch (error) {
      console.error("Error creating session:", error)
      toast({
        title: "Error",
        description: "Failed to create session",
        variant: "destructive",
      })
    }
  }

  const handleBookMember = (session: Session) => {
    setSelectedSession(session)

    // Filter members who have packages matching this session type
    const eligible = members.filter((member) => {
      return member.packages?.some((pkg: any) => {
        const remaining = typeof pkg === "object" && pkg.remaining ? pkg.remaining : 0
        const type = typeof pkg === "object" && pkg.type ? pkg.type : pkg
        return remaining > 0 && type === session.type
      })
    })

    setAvailableMembers(eligible)
    setSelectedMemberId("")
    setIsBookingDialogOpen(true)
  }

  const handleConfirmBooking = async () => {
    if (!selectedSession || !selectedMemberId) {
      toast({
        title: "Selection Required",
        description: "Please select a member to book for this session.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      const selectedMember = members.find((m) => m.id === selectedMemberId)
      if (!selectedMember) {
        throw new Error("Selected member not found")
      }

      // Find matching package
      const matchingPackage = selectedMember.packages?.find((pkg: any) => {
        const type = typeof pkg === "object" && pkg.type ? pkg.type : pkg
        const remaining = typeof pkg === "object" && pkg.remaining ? pkg.remaining : 0
        return remaining > 0 && type === selectedSession.type
      })

      if (!matchingPackage) {
        throw new Error("No matching package found for this session type")
      }

      // Update session with new booking
      const updatedSession: Session = {
        ...selectedSession,
        capacity: {
          ...selectedSession.capacity,
          booked: selectedSession.capacity.booked + 1,
        },
        bookedMembers: [...(selectedSession.bookedMembers || []), selectedMember.name],
        status: determineSessionStatus({
          date: selectedSession.date,
          capacity: {
            ...selectedSession.capacity,
            booked: selectedSession.capacity.booked + 1,
          },
          isManuallyDeactivated: selectedSession.isManuallyDeactivated,
          bookedMembers: [...(selectedSession.bookedMembers || []), selectedMember.name],
        }),
        lastModified: new Date().toISOString(),
      }

      updateSessionInStorage(updatedSession)

      // Update member's package
      const updatedMembers = members.map((member) => {
        if (member.id === selectedMemberId) {
          const updatedPackages = member.packages?.map((pkg: any) => {
            if (pkg.type === selectedSession.type && pkg.remaining > 0) {
              return { ...pkg, remaining: pkg.remaining - 1 }
            }
            return pkg
          })
          return { ...member, packages: updatedPackages }
        }
        return member
      })

      setMembers(updatedMembers)

      // Update localStorage for members
      const storedMembers = JSON.parse(localStorage.getItem("gym-members") || "[]")
      const updatedStoredMembers = storedMembers.map((member: any) => {
        if (member.id === selectedMemberId) {
          const updatedPackages = member.packages?.map((pkg: any) => {
            if (pkg.type === selectedSession.type && pkg.remaining > 0) {
              return { ...pkg, remaining: pkg.remaining - 1 }
            }
            return pkg
          })
          return { ...member, packages: updatedPackages }
        }
        return member
      })
      localStorage.setItem("gym-members", JSON.stringify(updatedStoredMembers))

      // Save booking record
      const memberBookings = JSON.parse(localStorage.getItem("member-booked-sessions") || "[]")
      memberBookings.push({
        id: selectedSession.id,
        memberId: selectedMemberId,
        memberName: selectedMember.name,
        sessionTitle: selectedSession.title,
        sessionType: selectedSession.type,
        date: selectedSession.date,
        time: selectedSession.time,
        trainer: selectedSession.trainer,
        bookedAt: new Date().toISOString(),
        bookedBy: "admin",
      })
      localStorage.setItem("member-booked-sessions", JSON.stringify(memberBookings))

      // Log activity
      logActivity({
        type: "session_booked",
        message: `Session booked for ${selectedMember.name}`,
        details: `${selectedSession.title} booked for ${selectedMember.name} on ${selectedSession.date}`,
        sessionId: selectedSession.id,
        sessionTitle: selectedSession.title,
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        status: "success",
        priority: "low",
      })

      setIsBookingDialogOpen(false)
      setSelectedSession(null)
      setSelectedMemberId("")

      toast({
        title: "Booking Confirmed",
        description: `${selectedSession.title} has been successfully booked for ${selectedMember.name}`,
      })
    } catch (error) {
      console.error("Error booking session:", error)
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "Failed to book the session. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsFull = async (session: Session) => {
    if (session.status !== "Available") {
      toast({
        title: "Cannot Mark as Full",
        description: "Only available sessions can be marked as full",
        variant: "destructive",
      })
      return
    }

    try {
      const updatedSession: Session = {
        ...session,
        capacity: { ...session.capacity, booked: session.capacity.total },
        status: "Full",
        lastModified: new Date().toISOString(),
      }

      updateSessionInStorage(updatedSession)

      // Log activity
      logActivity({
        type: "session_status_updated",
        message: `Session "${session.title}" marked as Full`,
        details: `All ${session.capacity.total} spots filled for ${session.title} on ${session.date}`,
        sessionId: session.id,
        sessionTitle: session.title,
        status: "warning",
        priority: "medium",
      })

      toast({
        title: "Session Marked as Full",
        description: `${session.title} is now marked as full`,
      })
    } catch (error) {
      console.error("Error marking session as full:", error)
      toast({
        title: "Error",
        description: "Failed to mark session as full",
        variant: "destructive",
      })
    }
  }

  const handleDeactivateSession = async (session: Session) => {
    if (!canDeactivateSession(session.status)) return

    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000)) // Simulate API call

    const updatedSession: Session = {
      ...session,
      isManuallyDeactivated: true,
      deactivatedAt: new Date().toISOString(),
      bookedMembers: [], // Remove all booked members
      capacity: { ...session.capacity, booked: 0 },
      status: "Inactive",
      lastModified: new Date().toISOString(),
    }

    updateSessionInStorage(updatedSession)

    // Log activity
    logActivity({
      type: "session_cancelled",
      message: `Session "${session.title}" cancelled`,
      details: `${session.title} cancelled and ${session.bookedMembers?.length || 0} members notified`,
      sessionId: session.id,
      sessionTitle: session.title,
      status: "error",
      priority: "high",
    })

    // Simulate sending cancellation notifications
    if (session.bookedMembers && session.bookedMembers.length > 0) {
      toast({
        title: "Session Deactivated",
        description: `${session.bookedMembers.length} members have been notified of the cancellation.`,
      })
    } else {
      toast({
        title: "Session Deactivated",
        description: "The session has been deactivated successfully.",
      })
    }

    setLoading(false)
  }

  const handleReactivateSession = async (session: Session, data: { date: string; time: string; notes?: string }) => {
    if (!canReactivateSession(session.status)) return

    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000)) // Simulate API call

    const updatedSession: Session = {
      ...session,
      date: data.date,
      time: data.time,
      isManuallyDeactivated: false,
      reactivatedAt: new Date().toISOString(),
      status: determineSessionStatus({
        date: data.date,
        capacity: session.capacity,
        isManuallyDeactivated: false,
        bookedMembers: session.bookedMembers,
      }),
      lastModified: new Date().toISOString(),
    }

    updateSessionInStorage(updatedSession)

    // Log activity
    logActivity({
      type: "session_modified",
      message: `Session "${session.title}" reactivated`,
      details: `${session.title} reactivated for ${data.date} at ${data.time}`,
      sessionId: session.id,
      sessionTitle: session.title,
      status: "info",
      priority: "medium",
    })

    toast({
      title: "Session Reactivated",
      description: `The session has been reactivated for ${data.date} at ${data.time}.`,
    })

    setReactivationDialog({ isOpen: false, session: null })
    setLoading(false)
  }

  const handleEditSession = (session: Session) => {
    if (!canEditSession(session.status)) return
    router.push(`/admin/sessions/${session.id}/edit`)
  }

  const handleViewDetails = (session: Session) => {
    router.push(`/admin/sessions/${session.id}`)
  }

  const handleBackToDashboard = () => {
    router.push("/admin")
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setTypeFilter("all")
    setTrainerFilter("all")
    setSortBy("date")
    setSortOrder("asc")
  }

  // Get unique values for filters
  const uniqueTypes = [...new Set(sessions.map((s) => s.type))]
  const uniqueTrainers = [...new Set(sessions.map((s) => s.trainer))]

  return (
    <main className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToDashboard}
            className="flex items-center gap-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">Sessions Management</h1>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Session
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Session</DialogTitle>
              <DialogDescription>Add a new session. Fill in all required information.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Session Title *</Label>
                <Input
                  id="title"
                  value={newSession.title}
                  onChange={(e) => setNewSession((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Personal Training - John Doe"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newSession.date}
                    onChange={(e) => setNewSession((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="time">Time *</Label>
                  <Input
                    id="time"
                    value={newSession.time}
                    onChange={(e) => setNewSession((prev) => ({ ...prev, time: e.target.value }))}
                    placeholder="e.g., 10:00 AM - 11:00 AM"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Session Type *</Label>
                  <Select
                    value={newSession.type}
                    onValueChange={(value) => setNewSession((prev) => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessionTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="trainer">Trainer *</Label>
                  <Select
                    value={newSession.trainer}
                    onValueChange={(value) => setNewSession((prev) => ({ ...prev, trainer: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trainer" />
                    </SelectTrigger>
                    <SelectContent>
                      {trainers.map((trainer) => (
                        <SelectItem key={trainer.id} value={trainer.name}>
                          {trainer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  max="50"
                  value={newSession.capacity}
                  onChange={(e) =>
                    setNewSession((prev) => ({ ...prev, capacity: Number.parseInt(e.target.value) || 1 }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newSession.description}
                  onChange={(e) => setNewSession((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Additional notes about the session..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSession}>Create Session</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Sessions</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by title, trainer, or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Full">Full</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type-filter">Session Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trainer-filter">Trainer</Label>
              <Select value={trainerFilter} onValueChange={setTrainerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Trainers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trainers</SelectItem>
                  {uniqueTrainers.map((trainer) => (
                    <SelectItem key={trainer} value={trainer}>
                      {trainer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label>Sort by:</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                  <SelectItem value="trainer">Trainer</SelectItem>
                  <SelectItem value="capacity">Capacity</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                {sortOrder === "asc" ? "↑" : "↓"}
              </Button>
            </div>

            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sessions ({filteredAndSortedSessions.length} total)</CardTitle>
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-muted-foreground">Loading sessions...</p>}

          {!loading && filteredAndSortedSessions.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No sessions found matching your criteria.</p>
              <Button onClick={clearFilters} variant="outline">
                Clear Filters
              </Button>
            </div>
          )}

          {!loading && paginatedSessions.length > 0 && (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("title")}>
                      Session Title {sortBy === "title" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("date")}>
                      Date & Time {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("type")}>
                      Type {sortBy === "type" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("trainer")}>
                      Trainer {sortBy === "trainer" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                      Status {sortBy === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("capacity")}>
                      Members {sortBy === "capacity" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSessions.map((session) => (
                    <TableRow key={session.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{session.title}</div>
                          {session.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-xs">{session.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>
                            {new Date(session.date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-muted-foreground">{session.time}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          {session.type}
                        </span>
                      </TableCell>
                      <TableCell>{session.trainer}</TableCell>
                      <TableCell>
                        <StatusBadge status={session.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span className="text-sm">
                            {session.capacity.booked}/{session.capacity.total}
                          </span>
                        </div>
                        {session.bookedMembers && session.bookedMembers.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {session.bookedMembers.slice(0, 2).join(", ")}
                            {session.bookedMembers.length > 2 && ` +${session.bookedMembers.length - 2}`}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(session)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>

                            {canEditSession(session.status) && (
                              <DropdownMenuItem onClick={() => handleEditSession(session)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Session
                              </DropdownMenuItem>
                            )}

                            {canBookMember(session.status) && (
                              <DropdownMenuItem onClick={() => handleBookMember(session)}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Book Member
                              </DropdownMenuItem>
                            )}

                            {session.status === "Available" && (
                              <DropdownMenuItem onClick={() => handleMarkAsFull(session)}>
                                <Users className="h-4 w-4 mr-2" />
                                Mark as Full
                              </DropdownMenuItem>
                            )}

                            {canDeactivateSession(session.status) && (
                              <DropdownMenuItem
                                onClick={() => handleDeactivateSession(session)}
                                className="text-red-600"
                              >
                                <PowerOff className="h-4 w-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                            )}

                            {canReactivateSession(session.status) && (
                              <DropdownMenuItem onClick={() => setReactivationDialog({ isOpen: true, session })}>
                                <Power className="h-4 w-4 mr-2" />
                                Reactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * SESSIONS_PER_PAGE + 1} to{" "}
                    {Math.min(currentPage * SESSIONS_PER_PAGE, filteredAndSortedSessions.length)} of{" "}
                    {filteredAndSortedSessions.length} sessions
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = i + 1
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                      {totalPages > 5 && (
                        <>
                          <span className="text-muted-foreground">...</span>
                          <Button
                            variant={currentPage === totalPages ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(totalPages)}
                          >
                            {totalPages}
                          </Button>
                        </>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Book Member Dialog */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Book Member for Session</DialogTitle>
            <DialogDescription>Select a member to book for "{selectedSession?.title}"</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedSession && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">Session Details</h4>
                <div className="text-sm space-y-1">
                  <div>
                    <strong>Title:</strong> {selectedSession.title}
                  </div>
                  <div>
                    <strong>Date:</strong> {new Date(selectedSession.date).toLocaleDateString()}
                  </div>
                  <div>
                    <strong>Time:</strong> {selectedSession.time}
                  </div>
                  <div>
                    <strong>Type:</strong> {selectedSession.type}
                  </div>
                  <div>
                    <strong>Trainer:</strong> {selectedSession.trainer}
                  </div>
                  <div>
                    <strong>Capacity:</strong> {selectedSession.capacity.booked + 1}/{selectedSession.capacity.total}{" "}
                    after booking
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="member">Select Member *</Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a member with matching package" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.map((member) => {
                    const matchingPackage = member.packages?.find((pkg: any) => {
                      const type = typeof pkg === "object" && pkg.type ? pkg.type : pkg
                      const remaining = typeof pkg === "object" && pkg.remaining ? pkg.remaining : 0
                      return remaining > 0 && type === selectedSession?.type
                    })

                    return (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex flex-col">
                          <span>{member.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {matchingPackage?.name} ({matchingPackage?.remaining} sessions left)
                          </span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {availableMembers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No members have available packages for this session type.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBookingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmBooking} disabled={!selectedMemberId || loading}>
              {loading ? "Booking..." : "Confirm Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivation Dialog */}
      <ReactivationDialog
        isOpen={reactivationDialog.isOpen}
        onClose={() => setReactivationDialog({ isOpen: false, session: null })}
        onConfirm={(data) => reactivationDialog.session && handleReactivateSession(reactivationDialog.session, data)}
        sessionTitle={reactivationDialog.session?.title || ""}
        isLoading={loading}
      />
    </main>
  )
}
