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
import { createClient } from "@/utils/supabase/client"
import { ActivityLogger } from "@/utils/activity-logger"
import { useAuth } from "@/contexts/AuthContext"
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

// Session status and booking logic

// Pagination constants
const SESSIONS_PER_PAGE = 20

// Activity logging helper - removed localStorage dependency
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
  // Activity logging will be handled by dashboard data refresh
  console.log("Activity logged:", activity)
}

export default function SessionsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const auth = useAuth()

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
    
    try {
      const supabase = createClient()

      // Load sessions from database
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          id,
          title,
          description,
          start_time,
          end_time,
          session_type,
          status,
          max_capacity,
          current_bookings,
          location,
          equipment_needed,
          trainer_id
        `)
        .order('start_time', { ascending: true })

      if (sessionsError) {
        console.error("Error loading sessions:", sessionsError)
        // Don't throw, just continue with fallback
      }

      // Load trainers separately (with error handling)
      let trainersData = []
      try {
        const { data, error: trainersError } = await supabase
          .from('trainers')
          .select(`
            id,
            user_id,
            profiles!trainers_user_id_fkey (
              full_name
            )
          `)

        if (trainersError) {
          console.error("Error loading trainers:", trainersError)
        } else {
          trainersData = (data || []).map(trainer => ({
            id: trainer.id,
            name: trainer.profiles?.full_name || 'Unknown Trainer',
            user_id: trainer.user_id
          }))
        }
      } catch (error) {
        console.error("Trainers table might not exist:", error)
      }

      // Load bookings to get booked members for each session
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          session_id,
          status,
          member_id
        `)
        .eq('status', 'confirmed')

      if (bookingsError) {
        console.error("Error loading bookings:", bookingsError)
      }

      // Transform sessions data to match expected format
      const transformedSessions: Session[] = (sessionsData || []).map(session => {
        const sessionBookings = (bookingsData || []).filter(b => b.session_id === session.id)
        const bookedMembers = sessionBookings.map(b => 'Member').filter(Boolean)
        
        // Format date and time
        const startTime = new Date(session.start_time)
        const endTime = new Date(session.end_time)
        const date = startTime.toISOString().split('T')[0]
        const time = `${startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`

        // Find trainer name for this session
        const sessionTrainer = trainersData.find(t => t.id === session.trainer_id)
        
        const transformedSession = {
          id: session.id,
          title: session.title,
          date: date,
          time: time,
          type: session.session_type,
          trainer: sessionTrainer?.name || 'Unassigned',
          status: session.status as Session["status"],
          capacity: { 
            booked: session.current_bookings || 0, 
            total: session.max_capacity || 1 
          },
          bookedMembers: bookedMembers,
          description: session.description,
          lastModified: session.start_time,
          location: session.location,
          equipmentNeeded: session.equipment_needed
        }

        // Determine correct status based on business rules
        transformedSession.status = determineSessionStatus({
          date: transformedSession.date,
          capacity: transformedSession.capacity,
          isManuallyDeactivated: session.status === 'cancelled',
          bookedMembers: transformedSession.bookedMembers,
        })

        return transformedSession
      })

      setSessions(transformedSessions)

      // Load members with their packages
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select(`
          id,
          membership_status,
          user_id
        `)
        .eq('membership_status', 'active')

      if (membersError) {
        console.error("Error loading members:", membersError)
      }

      // Load member packages with package type information
      const { data: memberPackagesData, error: packageError } = await supabase
        .from('member_packages')
        .select(`
          member_id,
          sessions_remaining,
          sessions_total,
          status,
          package_id,
          packages (
            name,
            package_type,
            session_count
          )
        `)
        .eq('status', 'active')
        .gt('sessions_remaining', 0)

      if (packageError) {
        console.error("Error loading member packages:", packageError)
      }

      // Get profile information for members
      const memberIds = (membersData || []).map(m => m.user_id)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', memberIds)

      if (profilesError) {
        console.error("Error loading member profiles:", profilesError)
      }

      // Transform members data with real package types
      const transformedMembers = (membersData || []).map(member => {
        const profile = (profilesData || []).find(p => p.id === member.user_id)
        const memberPackages = (memberPackagesData || [])
          .filter(mp => mp.member_id === member.id)
          .map(mp => ({
            id: mp.id,
            name: mp.packages?.name || 'Package',
            remaining: mp.sessions_remaining || 0,
            total: mp.packages?.session_count || mp.sessions_total || 0,
            type: mp.packages?.package_type || 'monthly'
          }))

        return {
          id: member.id,
          name: profile?.full_name || `Member ${member.id}`,
          email: profile?.email || 'No email',
          status: member.membership_status || 'active',
          packages: memberPackages
        }
      })

      // Don't filter out members without packages - show all members for debugging
      console.log('All members loaded:', transformedMembers.length);
      console.log('Members with packages:', transformedMembers.filter(m => m.packages.length > 0).length);
      console.log('Sample member data:', transformedMembers.slice(0, 3));
      
      // If no members found, create some sample data for testing
      if (transformedMembers.length === 0) {
        console.log('No members found in database, creating sample data for testing...');
        const sampleMembers = [
          {
            id: 'sample-1',
            name: 'John Doe',
            email: 'john@example.com',
            status: 'active',
            packages: [
              { id: 'pkg1', name: 'Personal Training Package', remaining: 8, total: 10, type: 'personal_training' },
              { id: 'pkg2', name: 'Monthly Pass', remaining: 15, total: 20, type: 'monthly' }
            ]
          },
          {
            id: 'sample-2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            status: 'active',
            packages: [
              { id: 'pkg3', name: 'Group Class Package', remaining: 6, total: 12, type: 'group_class' }
            ]
          },
          {
            id: 'sample-3',
            name: 'Mike Johnson',
            email: 'mike@example.com',
            status: 'active',
            packages: [
              { id: 'pkg4', name: 'Premium Package', remaining: 12, total: 15, type: 'monthly' }
            ]
          }
        ];
        setMembers(sampleMembers);
        console.log('Sample members created:', sampleMembers);
      } else {
        setMembers(transformedMembers);
      }

    } catch (error) {
      console.error("Error loading data:", error)
      // No fallback - let user know there's an issue
      setSessions([])
      setMembers([])
      toast({
        title: "Data Loading Error",
        description: "Failed to load sessions data. Please check your database connection.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
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

  // Session Actions - removed localStorage dependency
  const updateSessionInStorage = async (updatedSession: Session) => {
    // This function now just triggers a data reload
    await loadData()
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
      setLoading(true)
      const supabase = createClient()

      // Parse time format (e.g., "10:00 AM - 11:00 AM")
      const [startTimeStr, endTimeStr] = newSession.time.split(' - ')
      const startDateTime = new Date(`${newSession.date} ${startTimeStr}`)
      const endDateTime = new Date(`${newSession.date} ${endTimeStr}`)

      // Find the trainer ID from the selected trainer name
      const selectedTrainer = trainers.find(t => t.name === newSession.trainer)
      
      // Insert into sessions table
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          title: newSession.title,
          description: newSession.description,
          trainer_id: selectedTrainer?.id || null,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          session_type: newSession.type,
          status: 'scheduled',
          max_capacity: newSession.capacity,
          current_bookings: 0,
          price: 0, // Default price, could be made configurable
          location: null,
          equipment_needed: []
        })
        .select()
        .single()

      if (sessionError) {
        throw sessionError
      }

      // Log activity
      if (auth.user && sessionData) {
        await ActivityLogger.sessionCreated(
          newSession.title,
          sessionData.id,
          auth.user.id,
          selectedTrainer?.name
        )
      }

      // Reload data to get fresh from database
      await loadData()

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
        description: `${newSession.title} has been created successfully`,
      })
    } catch (error) {
      console.error("Error creating session:", error)
      toast({
        title: "Error",
        description: "Failed to create session",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBookMember = (session: Session) => {
    setSelectedSession(session)

    // Enhanced filter for members who have packages matching this session type
    const eligible = members.filter((member) => {
      if (!member.packages || member.packages.length === 0) {
        return false;
      }

      return member.packages.some((pkg: any) => {
        const remaining = pkg.remaining || 0
        const packageType = pkg.type || 'Unknown'
        const sessionType = session.type

        // Must have remaining sessions
        if (remaining <= 0) return false;

        // Direct type match
        if (packageType === sessionType) return true;

        // Universal package types that can book any session
        const universalTypes = ['monthly', 'general', 'universal', 'all_access', 'premium']
        if (universalTypes.includes(packageType.toLowerCase())) return true;

        // Personal training packages can book various individual sessions
        if (packageType.toLowerCase() === 'personal_training' && [
          'Personal Training', 'Strength Training', 'Fitness Assessment', 'Nutrition Consultation'
        ].includes(sessionType)) return true;

        // Group class packages can book various group sessions  
        if (packageType.toLowerCase() === 'group_class' && [
          'Group Class', 'Yoga', 'HIIT', 'Pilates', 'Group Training'
        ].includes(sessionType)) return true;

        // Flexible matching for similar types
        const pkgTypeLower = packageType.toLowerCase().replace(/[_\s]/g, '');
        const sessionTypeLower = sessionType.toLowerCase().replace(/[_\s]/g, '');
        
        if (pkgTypeLower.includes(sessionTypeLower) || sessionTypeLower.includes(pkgTypeLower)) {
          return true;
        }

        return false;
      })
    })

    console.log('Session type:', session.type);
    console.log('Total members:', members.length);
    console.log('Eligible members:', eligible.length);
    console.log('Member packages:', members.map(m => ({ name: m.name, packages: m.packages })));

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
      const supabase = createClient()

      const selectedMember = members.find((m) => m.id === selectedMemberId)
      if (!selectedMember) {
        throw new Error("Selected member not found")
      }

      // Check if this is a sample member (for testing when no real data exists)
      if (selectedMemberId.startsWith('sample-')) {
        // Handle sample member booking (mock success)
        console.log('Booking sample member:', selectedMember.name);
        
        // Simulate successful booking by updating local state
        const updatedSessions = sessions.map(s => 
          s.id === selectedSession.id 
            ? { ...s, capacity: { ...s.capacity, booked: s.capacity.booked + 1 } }
            : s
        );
        setSessions(updatedSessions);

        toast({
          title: "Booking Confirmed (Sample)",
          description: `${selectedSession.title} has been successfully booked for ${selectedMember.name} (This is sample data)`,
        });

        setIsBookingDialogOpen(false);
        setSelectedSession(null);
        setSelectedMemberId("");
        return;
      }

      // Find matching package for the member with better logic
      const { data: memberPackages, error: packageError } = await supabase
        .from('member_packages')
        .select(`
          id,
          sessions_remaining,
          packages (
            package_type,
            name
          )
        `)
        .eq('member_id', selectedMemberId)
        .eq('status', 'active')
        .gt('sessions_remaining', 0)

      if (packageError) {
        throw packageError
      }

      if (!memberPackages || memberPackages.length === 0) {
        throw new Error("No active packages with remaining sessions found for this member")
      }

      // Find the best matching package for this session type
      let selectedPackage = null
      const sessionType = selectedSession.type

      for (const pkg of memberPackages) {
        const packageType = (pkg.packages as any)?.package_type || 'Unknown'
        
        // Direct match
        if (packageType === sessionType) {
          selectedPackage = pkg
          break
        }
        
        // Universal package types
        const universalTypes = ['monthly', 'general', 'universal', 'all_access', 'premium']
        if (universalTypes.includes(packageType.toLowerCase())) {
          selectedPackage = pkg
          break
        }
      }

      // If no perfect match, use first available package
      if (!selectedPackage) {
        selectedPackage = memberPackages[0]
      }

      // Create booking record
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          member_id: selectedMemberId,
          session_id: selectedSession.id,
          member_package_id: selectedPackage.id,
          booking_time: new Date().toISOString(),
          status: 'confirmed',
          attended: false,
          notes: 'Booked by admin'
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
          sessions_remaining: selectedPackage.sessions_remaining - 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPackage.id)

      if (updatePackageError) {
        throw updatePackageError
      }

      // Update session current bookings
      const { error: updateSessionError } = await supabase
        .from('sessions')
        .update({
          current_bookings: (selectedSession.capacity.booked || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSession.id)

      if (updateSessionError) {
        throw updateSessionError
      }

      // Log activity
      if (auth.user) {
        await ActivityLogger.sessionBooked(
          selectedSession.title,
          selectedMember.name,
          selectedSession.id,
          auth.user.id
        )
      }

      // Reload data to reflect changes
      await loadData()

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
      setLoading(true)
      const supabase = createClient()

      // Update session to mark as full
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          current_bookings: session.capacity.total,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.id)

      if (updateError) {
        throw updateError
      }

      // Reload data to reflect changes
      await loadData()

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
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivateSession = async (session: Session) => {
    if (!canDeactivateSession(session.status)) return

    try {
      setLoading(true)
      const supabase = createClient()

      // Update session status to cancelled
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', session.id)

      if (updateError) {
        throw updateError
      }

      // Cancel all bookings for this session
      const { error: cancelBookingsError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('session_id', session.id)
        .eq('status', 'confirmed')

      if (cancelBookingsError) {
        console.error("Error cancelling bookings:", cancelBookingsError)
      }

      // Reload data to reflect changes
      await loadData()

      toast({
        title: "Session Deactivated",
        description: "The session has been deactivated and bookings cancelled.",
      })
    } catch (error) {
      console.error("Error deactivating session:", error)
      toast({
        title: "Error",
        description: "Failed to deactivate session",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReactivateSession = async (session: Session, data: { date: string; time: string; notes?: string }) => {
    if (!canReactivateSession(session.status)) return

    try {
      setLoading(true)
      const supabase = createClient()

      // Parse new time format
      const [startTimeStr, endTimeStr] = data.time.split(' - ')
      const startDateTime = new Date(`${data.date} ${startTimeStr}`)
      const endDateTime = new Date(`${data.date} ${endTimeStr}`)

      // Update session to reactivate
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          status: 'scheduled',
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', session.id)

      if (updateError) {
        throw updateError
      }

      // Reload data to reflect changes
      await loadData()

      toast({
        title: "Session Reactivated",
        description: `The session has been reactivated for ${data.date} at ${data.time}.`,
      })

      setReactivationDialog({ isOpen: false, session: null })
    } catch (error) {
      console.error("Error reactivating session:", error)
      toast({
        title: "Error",
        description: "Failed to reactivate session",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
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
                <SelectContent className="max-h-48">
                  {availableMembers.length > 0 ? (
                    availableMembers
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((member) => {
                        const matchingPackages = member.packages?.filter((pkg: any) => {
                          const remaining = pkg.remaining || 0
                          const packageType = pkg.type || 'Unknown'
                          const sessionType = selectedSession?.type

                          if (remaining <= 0) return false;

                          // Use the same logic as handleBookMember
                          if (packageType === sessionType) return true;
                          
                          const universalTypes = ['monthly', 'general', 'universal', 'all_access', 'premium']
                          if (universalTypes.includes(packageType.toLowerCase())) return true;

                          if (packageType.toLowerCase() === 'personal_training' && [
                            'Personal Training', 'Strength Training', 'Fitness Assessment', 'Nutrition Consultation'
                          ].includes(sessionType)) return true;

                          if (packageType.toLowerCase() === 'group_class' && [
                            'Group Class', 'Yoga', 'HIIT', 'Pilates', 'Group Training'
                          ].includes(sessionType)) return true;

                          const pkgTypeLower = packageType.toLowerCase().replace(/[_\s]/g, '');
                          const sessionTypeLower = sessionType.toLowerCase().replace(/[_\s]/g, '');
                          
                          return pkgTypeLower.includes(sessionTypeLower) || sessionTypeLower.includes(pkgTypeLower);
                        }) || []

                        const bestPackage = matchingPackages[0] || member.packages?.[0]

                        return (
                          <SelectItem key={member.id} value={member.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{member.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {bestPackage ? (
                                  `${bestPackage.name} - ${bestPackage.type} (${bestPackage.remaining}/${bestPackage.total} sessions)`
                                ) : (
                                  'No packages available'
                                )}
                              </span>
                            </div>
                          </SelectItem>
                        )
                      })
                  ) : (
                    // Show all members for debugging when no eligible members found
                    members
                      .slice(0, 10) // Limit to first 10 for debugging
                      .map((member) => (
                        <SelectItem key={member.id} value={member.id} disabled>
                          <div className="flex flex-col">
                            <span className="font-medium">{member.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {member.packages?.length > 0 ? (
                                `${member.packages.map(p => `${p.type} (${p.remaining})`).join(', ')}`
                              ) : (
                                'No packages'
                              )}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground">
                {availableMembers.length === 0 ? (
                  <div>
                    <p>No eligible members found for session type "{selectedSession?.type}".</p>
                    <p>Total members: {members.length}</p>
                    <p>Members with packages: {members.filter(m => m.packages?.length > 0).length}</p>
                  </div>
                ) : (
                  <p>{availableMembers.length} eligible member(s) found.</p>
                )}
              </div>
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
