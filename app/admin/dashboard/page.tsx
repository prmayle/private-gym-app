"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserDropdown } from "@/components/ui/user-dropdown"
import { AdminRoute } from "@/components/ProtectedRoute"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Users,
  Calendar,
  TrendingUp,
  Activity,
  UserPlus,
  CalendarPlus,
  Settings,
  BarChart3,
  Package,
  Clock,
  AlertCircle,
  BookOpen,
  Home,
  Bell,
  Eye,
  ExternalLink,
  ArrowRight,
  XCircle,
  AlertTriangle,
  Mail,
  Edit,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"

interface DashboardStats {
  totalMembers: number
  activeMembers: number
  totalSessions: number
  upcomingSessions: number
  completedSessions: number
  totalRevenue: number
  monthlyRevenue: number
  pendingTasks: number
}

interface RecentActivity {
  id: string
  type: string
  message: string
  details?: string | object
  timestamp: string
  category?: string
  memberId?: string
  memberName?: string
  sessionId?: string
  sessionTitle?: string
  packageId?: string
  packageType?: string
  notificationId?: string
  priority?: "low" | "medium" | "high"
  status?: "success" | "warning" | "error" | "info"
}

interface UpcomingSession {
  id: string
  title: string
  date: string
  time: string
  trainer: string
  type: string
  capacity: { booked: number; total: number }
  status: string
}

interface ActivityGroup {
  type: string
  title: string
  description: string
  activities: RecentActivity[]
  viewAllPath: string
  icon: React.ReactNode
  color: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    totalSessions: 0,
    upcomingSessions: 0,
    completedSessions: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    pendingTasks: 0,
  })

  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedActivity, setSelectedActivity] = useState<RecentActivity | null>(null)
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false)

  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(loadDashboardData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Load real data from Supabase
      const [membersResult, sessionsResult] = await Promise.all([
        supabase.from('members').select('id, membership_status'),
        supabase.from('sessions').select('id, title, start_time, end_time, session_type, status').limit(5)
      ])

      // Calculate stats
      const members = membersResult.data || []
      const sessions = sessionsResult.data || []
      const activeMembers = members.filter(m => m.membership_status === 'active')
      
      // Mock some sessions for demo since we may not have real data yet
      const mockSessions: UpcomingSession[] = [
        {
          id: "s1",
          title: "Personal Training Session",
          date: "2025-01-15",
          time: "10:00 AM - 11:00 AM",
          type: "Personal Training",
          trainer: "Mike Johnson",
          status: "Available",
          capacity: { booked: 0, total: 1 },
        },
        {
          id: "s2",
          title: "Group HIIT Class",
          date: "2025-01-15",
          time: "2:00 PM - 3:00 PM",
          type: "Group Class",
          trainer: "Sarah Williams",
          status: "Available",
          capacity: { booked: 5, total: 10 },
        },
        {
          id: "s3",
          title: "Yoga Flow Session",
          date: "2025-01-16",
          time: "9:00 AM - 10:00 AM",
          type: "Yoga",
          trainer: "Emma Thompson",
          status: "Available",
          capacity: { booked: 3, total: 12 },
        },
      ]

      const today = new Date()
      const upcomingSessions = mockSessions.filter((session) => new Date(session.date) >= today)
      const completedSessions = mockSessions.filter((session) => new Date(session.date) < today)

      // Load recent activities
      const activities = JSON.parse(localStorage.getItem("admin-activities") || "[]")

      // Generate sample activities if none exist
      if (activities.length === 0) {
        const sampleActivities = generateSampleActivities()
        localStorage.setItem("admin-activities", JSON.stringify(sampleActivities))
        setRecentActivities(sampleActivities)
      } else {
        setRecentActivities(activities.slice(0, 20))
      }

      // Calculate stats
      const dashboardStats: DashboardStats = {
        totalMembers: members.length,
        activeMembers: activeMembers.length,
        totalSessions: sessions.length,
        upcomingSessions: upcomingSessions.length,
        completedSessions: completedSessions.length,
        totalRevenue: 15750, // Mock data
        monthlyRevenue: 3200, // Mock data
        pendingTasks: 5, // Mock data
      }

      setStats(dashboardStats)
      setUpcomingSessions(upcomingSessions.slice(0, 5))
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateSampleActivities = (): RecentActivity[] => {
    const now = new Date()
    return [
      {
        id: "act-1",
        type: "member_created",
        category: "members",
        message: "New member John Doe registered",
        details: "Personal Training package selected, payment completed",
        timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
        memberId: "1",
        memberName: "John Doe",
        status: "success",
        priority: "medium",
      },
      {
        id: "act-2",
        type: "session_booked",
        category: "sessions",
        message: "Jane Smith booked Morning Yoga session",
        details: "Session scheduled for tomorrow at 9:00 AM with Emma Thompson",
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(),
        memberId: "2",
        memberName: "Jane Smith",
        sessionId: "s3",
        sessionTitle: "Morning Yoga",
        status: "success",
        priority: "low",
      },
      {
        id: "act-3",
        type: "package_assigned",
        category: "packages",
        message: "Emily Williams purchased Personal Training package",
        details: "10-session package, expires in 3 months, payment completed",
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 4).toISOString(),
        memberId: "4",
        memberName: "Emily Williams",
        packageType: "Personal Training",
        status: "success",
        priority: "medium",
      },
      {
        id: "act-4",
        type: "session_status_updated",
        category: "sessions",
        message: "HIIT Training session marked as Full",
        details: "All 10 spots filled, waitlist activated",
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 6).toISOString(),
        sessionId: "s2",
        sessionTitle: "HIIT Training",
        status: "warning",
        priority: "medium",
      },
      {
        id: "act-5",
        type: "package_expiry_warning",
        category: "packages",
        message: "Robert Brown's Group Class package expires soon",
        details: "Package expires in 3 days, 2 sessions remaining",
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 8).toISOString(),
        memberId: "5",
        memberName: "Robert Brown",
        packageType: "Group Class",
        status: "warning",
        priority: "high",
      },
      {
        id: "act-6",
        type: "session_cancelled",
        category: "sessions",
        message: "Evening Pilates session cancelled",
        details: "Cancelled due to trainer unavailability, 5 members notified",
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 12).toISOString(),
        sessionTitle: "Evening Pilates",
        status: "error",
        priority: "high",
      },
      {
        id: "act-7",
        type: "notification_sent",
        category: "notifications",
        message: "Package renewal reminder sent to 3 members",
        details: "Automated reminders for packages expiring within 7 days",
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 18).toISOString(),
        status: "info",
        priority: "low",
      },
      {
        id: "act-8",
        type: "session_modified",
        category: "sessions",
        message: "Yoga class time changed",
        details: "Morning Yoga moved from 8:00 AM to 9:00 AM, participants notified",
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
        sessionId: "s3",
        sessionTitle: "Morning Yoga",
        status: "info",
        priority: "medium",
      },
      {
        id: "act-9",
        type: "package_request_received",
        category: "notifications",
        message: "Package upgrade request from Michael Johnson",
        details: "Requesting upgrade from Group Class to Personal Training",
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 36).toISOString(),
        memberId: "3",
        memberName: "Michael Johnson",
        status: "info",
        priority: "medium",
      },
      {
        id: "act-10",
        type: "package_created",
        category: "packages",
        message: "New package type 'Physio Sessions' created",
        details: "8-session package for physiotherapy, $320 price point",
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString(),
        packageType: "Physio Sessions",
        status: "success",
        priority: "low",
      },
    ]
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "member_created":
        return <UserPlus className="h-4 w-4" />
      case "member_updated":
        return <Edit className="h-4 w-4" />
      case "session_created":
        return <CalendarPlus className="h-4 w-4" />
      case "session_booked":
        return <BookOpen className="h-4 w-4" />
      case "session_status_updated":
        return <AlertTriangle className="h-4 w-4" />
      case "session_cancelled":
        return <XCircle className="h-4 w-4" />
      case "session_modified":
        return <Edit className="h-4 w-4" />
      case "package_assigned":
      case "package_created":
        return <Package className="h-4 w-4" />
      case "package_expiry_warning":
        return <AlertCircle className="h-4 w-4" />
      case "notification_sent":
      case "package_request_received":
        return <Mail className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getActivityColor = (status?: string) => {
    switch (status) {
      case "success":
        return "text-green-600"
      case "warning":
        return "text-yellow-600"
      case "error":
        return "text-red-600"
      case "info":
        return "text-blue-600"
      default:
        return "text-gray-600"
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800">Success</Badge>
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
      case "error":
        return <Badge className="bg-red-100 text-red-800">Error</Badge>
      case "info":
        return <Badge className="bg-blue-100 text-blue-800">Info</Badge>
      default:
        return null
    }
  }

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case "high":
        return (
          <Badge variant="destructive" className="text-xs">
            High
          </Badge>
        )
      case "medium":
        return (
          <Badge variant="secondary" className="text-xs">
            Medium
          </Badge>
        )
      case "low":
        return (
          <Badge variant="outline" className="text-xs">
            Low
          </Badge>
        )
      default:
        return null
    }
  }

  const groupActivitiesByType = (activities: RecentActivity[]): ActivityGroup[] => {
    const groups: { [key: string]: ActivityGroup } = {
      members: {
        type: "members",
        title: "Member Activities",
        description: "New registrations, updates, and member-related actions",
        activities: [],
        viewAllPath: "/admin/members",
        icon: <Users className="h-5 w-5" />,
        color: "text-blue-600",
      },
      sessions: {
        type: "sessions",
        title: "Session Management",
        description: "Bookings, cancellations, and session updates",
        activities: [],
        viewAllPath: "/admin/sessions",
        icon: <Calendar className="h-5 w-5" />,
        color: "text-green-600",
      },
      packages: {
        type: "packages",
        title: "Package Management",
        description: "Package assignments, creations, and expiry notifications",
        activities: [],
        viewAllPath: "/admin/packages",
        icon: <Package className="h-5 w-5" />,
        color: "text-purple-600",
      },
      notifications: {
        type: "notifications",
        title: "Communications",
        description: "Notifications sent and received, member requests",
        activities: [],
        viewAllPath: "/admin/notifications",
        icon: <Bell className="h-5 w-5" />,
        color: "text-orange-600",
      },
    }

    activities.forEach((activity) => {
      const category = activity.category || "general"
      if (groups[category]) {
        groups[category].activities.push(activity)
      }
    })

    return Object.values(groups).filter((group) => group.activities.length > 0)
  }

  const handleActivityClick = (activity: RecentActivity) => {
    setSelectedActivity(activity)
    setIsActivityDialogOpen(true)
  }

  const handleViewAll = (path: string) => {
    router.push(path)
  }

  const formatActivityDetails = (activity: RecentActivity) => {
    if (typeof activity.details === "string") {
      return activity.details
    }

    if (typeof activity.details === "object" && activity.details !== null) {
      return JSON.stringify(activity.details, null, 2)
    }

    // Fallback to constructing details from other properties
    const details = []
    if (activity.memberName) details.push(`Member: ${activity.memberName}`)
    if (activity.memberId) details.push(`Member ID: ${activity.memberId}`)
    if (activity.sessionTitle) details.push(`Session: ${activity.sessionTitle}`)
    if (activity.packageType) details.push(`Package: ${activity.packageType}`)

    return details.length > 0 ? details.join("\n") : "No additional details available"
  }

  const activityGroups = groupActivitiesByType(recentActivities)

  return (
    <AdminRoute>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's what's happening at your gym.</p>
          </div>
          <UserDropdown />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Button asChild className="h-auto p-4 flex-col gap-2">
                <Link href="/admin/book-session">
                  <BookOpen className="h-6 w-6" />
                  <span className="text-sm">Book Session</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 flex-col gap-2 bg-transparent">
                <Link href="/admin/members/new">
                  <UserPlus className="h-6 w-6" />
                  <span className="text-sm">Add Member</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 flex-col gap-2 bg-transparent">
                <Link href="/admin/sessions">
                  <CalendarPlus className="h-6 w-6" />
                  <span className="text-sm">Manage Sessions</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 flex-col gap-2 bg-transparent">
                <Link href="/admin/home-config">
                  <Home className="h-6 w-6" />
                  <span className="text-sm">Website Settings</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 flex-col gap-2 bg-transparent">
                <Link href="/admin/reports">
                  <BarChart3 className="h-6 w-6" />
                  <span className="text-sm">View Reports</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMembers}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">{stats.activeMembers} active</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingSessions}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-blue-600">{stats.completedSessions} completed</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.monthlyRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+12% from last month</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingTasks}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-orange-600">Requires attention</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Activity Groups */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Recent Activity</h2>
            <Button variant="outline" asChild>
              <Link href="/admin/activity">
                <Activity className="h-4 w-4 mr-2" />
                View All Activities
              </Link>
            </Button>
          </div>

          {loading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <div key={j} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && activityGroups.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No recent activities to display</p>
              </CardContent>
            </Card>
          )}

          {!loading && activityGroups.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activityGroups.map((group) => (
                <Card key={group.type}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={group.color}>{group.icon}</div>
                        <div>
                          <CardTitle className="text-lg">{group.title}</CardTitle>
                          <CardDescription>{group.description}</CardDescription>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewAll(group.viewAllPath)}
                        className="flex items-center gap-1"
                      >
                        View All
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {group.activities.slice(0, 5).map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border"
                            onClick={() => handleActivityClick(activity)}
                          >
                            <div className={`mt-0.5 ${getActivityColor(activity.status)}`}>
                              {getActivityIcon(activity.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium line-clamp-1">{activity.message}</p>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {getPriorityBadge(activity.priority)}
                                  {getStatusBadge(activity.status)}
                                </div>
                              </div>
                              {activity.details && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {typeof activity.details === "string" ? activity.details : "Click to view details"}
                                </p>
                              )}
                              <div className="flex items-center justify-between mt-2">
                                <p className="text-xs text-muted-foreground">
                                  {new Date(activity.timestamp).toLocaleString()}
                                </p>
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                  <Eye className="h-3 w-3 mr-1" />
                                  Details
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {group.activities.length > 5 && (
                          <div className="text-center pt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewAll(group.viewAllPath)}
                              className="text-xs"
                            >
                              View {group.activities.length - 5} more activities
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Upcoming Sessions
                </CardTitle>
                <CardDescription>Next scheduled sessions</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/sessions">
                  View All Sessions
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {loading && (
                <div className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">Loading sessions...</p>
                </div>
              )}

              {!loading && upcomingSessions.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No upcoming sessions</p>
                </div>
              )}

              {!loading && upcomingSessions.length > 0 && (
                <div className="space-y-4">
                  {upcomingSessions.map((session) => (
                    <div key={session.id} className="p-3 rounded-lg border hover:bg-muted/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{session.title}</h4>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(session.date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {session.time}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {session.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">with {session.trainer}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            {session.capacity.booked}/{session.capacity.total}
                          </div>
                          <Badge
                            variant={session.status === "Available" ? "secondary" : "default"}
                            className="text-xs mt-1"
                          >
                            {session.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Navigation Links */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <Link href="/admin/members" className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold">Members</h3>
                  <p className="text-sm text-muted-foreground">Manage member profiles</p>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <Link href="/admin/sessions" className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="font-semibold">Sessions</h3>
                  <p className="text-sm text-muted-foreground">Schedule sessions</p>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <Link href="/admin/packages" className="flex items-center gap-3">
                <Package className="h-8 w-8 text-purple-600" />
                <div>
                  <h3 className="font-semibold">Packages</h3>
                  <p className="text-sm text-muted-foreground">Manage packages</p>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <Link href="/admin/notifications" className="flex items-center gap-3">
                <Bell className="h-8 w-8 text-orange-600" />
                <div>
                  <h3 className="font-semibold">Notifications</h3>
                  <p className="text-sm text-muted-foreground">Member communications</p>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <Link href="/admin/reports" className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-red-600" />
                <div>
                  <h3 className="font-semibold">Reports</h3>
                  <p className="text-sm text-muted-foreground">Analytics & insights</p>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Activity Detail Dialog */}
        <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedActivity && getActivityIcon(selectedActivity.type)}
                Activity Details
              </DialogTitle>
              <DialogDescription>
                {selectedActivity?.message}
              </DialogDescription>
            </DialogHeader>
            {selectedActivity && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Type</Label>
                    <p className="text-sm">{selectedActivity.type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Timestamp</Label>
                    <p className="text-sm">{new Date(selectedActivity.timestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(selectedActivity.status)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Priority</Label>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(selectedActivity.priority)}
                    </div>
                  </div>
                </div>
                {selectedActivity.details && (
                  <div>
                    <Label className="text-sm font-medium">Details</Label>
                    <div className="mt-1 p-3 bg-muted rounded-md">
                      <pre className="text-sm whitespace-pre-wrap">{formatActivityDetails(selectedActivity)}</pre>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  {selectedActivity.memberId && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/members/${selectedActivity.memberId}`}>
                        View Member
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  )}
                  {selectedActivity.sessionId && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/sessions/${selectedActivity.sessionId}`}>
                        View Session
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminRoute>
  )
}