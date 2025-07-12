"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Search, Filter, Calendar, Users, Package, ActivityIcon, Clock } from "lucide-react"

interface Activity {
  id: string
  type: string
  message: string
  timestamp: string
  memberId?: string
  memberName?: string
  details?: string | object | undefined
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const itemsPerPage = 20

  useEffect(() => {
    loadActivities()
  }, [])

  useEffect(() => {
    filterActivities()
  }, [activities, searchQuery, typeFilter])

  const loadActivities = () => {
    try {
      setIsLoading(true)
      const storedActivities = JSON.parse(localStorage.getItem("admin-activities") || "[]")

      // Generate sample activities if none exist
      if (storedActivities.length === 0) {
        const sampleActivities = generateSampleActivities()
        localStorage.setItem("admin-activities", JSON.stringify(sampleActivities))
        setActivities(sampleActivities)
      } else {
        setActivities(storedActivities)
      }
    } catch (error) {
      console.error("Error loading activities:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateSampleActivities = (): Activity[] => {
    const now = new Date()
    return [
      {
        id: "1",
        type: "member_registered",
        message: "New member John Doe registered",
        timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
        memberId: "1",
        memberName: "John Doe",
        details: "Signed up for Personal Training package",
      },
      {
        id: "2",
        type: "session_booked",
        message: "Jane Smith booked Morning Yoga session",
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(),
        memberId: "2",
        memberName: "Jane Smith",
        details: "Session scheduled for tomorrow at 9:00 AM",
      },
      {
        id: "3",
        type: "package_assigned",
        message: "Emily Williams purchased Personal Training package",
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 4).toISOString(),
        memberId: "4",
        memberName: "Emily Williams",
        details: "10-session package, expires in 3 months",
      },
      {
        id: "4",
        type: "session_completed",
        message: "HIIT Training session completed",
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 6).toISOString(),
        details: "8 participants attended, session duration: 45 minutes",
      },
      {
        id: "5",
        type: "member_updated",
        message: "Robert Brown profile updated",
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 8).toISOString(),
        memberId: "5",
        memberName: "Robert Brown",
        details: {
          contact: "555-123-4567",
          emergencyContact: "Jane Brown",
        },
      },
      {
        id: "6",
        type: "session_cancelled",
        message: "Evening Pilates session cancelled",
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 12).toISOString(),
        details: "Cancelled due to trainer unavailability, members notified",
      },
      {
        id: "7",
        type: "package_expired",
        message: "Michael Johnson's Group Class package expired",
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
        memberId: "3",
        memberName: "Michael Johnson",
        details: "Package expired, renewal reminder sent",
      },
      {
        id: "8",
        type: "member_deactivated",
        message: "Member account deactivated",
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 36).toISOString(),
        details: "Account deactivated due to non-payment",
      },
      {
        id: "9",
        type: "session_created",
        message: "New Zumba class session created",
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString(),
        details: "Weekly recurring session, Fridays at 7:00 PM",
      },
      {
        id: "10",
        type: "payment_received",
        message: "Payment received for membership renewal",
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 72).toISOString(),
        details: "Monthly membership fee processed successfully",
      },
    ]
  }

  const filterActivities = () => {
    let filtered = activities

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((activity) => {
        const detailsStr = stringifyDetails(activity.details).toLowerCase()
        return (
          activity.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          activity.memberName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          detailsStr.includes(searchQuery.toLowerCase())
        )
      })
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((activity) => {
        switch (typeFilter) {
          case "members":
            return ["member_registered", "member_updated", "member_deactivated"].includes(activity.type)
          case "sessions":
            return ["session_booked", "session_cancelled", "session_completed", "session_created"].includes(
              activity.type,
            )
          case "packages":
            return ["package_assigned", "package_expired", "payment_received"].includes(activity.type)
          default:
            return true
        }
      })
    }

    setFilteredActivities(filtered)
    setCurrentPage(1)
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "member_registered":
      case "member_updated":
      case "member_deactivated":
        return <Users className="h-4 w-4" />
      case "session_booked":
      case "session_cancelled":
      case "session_completed":
      case "session_created":
        return <Calendar className="h-4 w-4" />
      case "package_assigned":
      case "package_expired":
      case "payment_received":
        return <Package className="h-4 w-4" />
      default:
        return <ActivityIcon className="h-4 w-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case "member_registered":
      case "session_booked":
      case "package_assigned":
      case "session_created":
      case "payment_received":
        return "text-green-600 bg-green-50"
      case "session_cancelled":
      case "package_expired":
      case "member_deactivated":
        return "text-red-600 bg-red-50"
      case "session_completed":
      case "member_updated":
        return "text-blue-600 bg-blue-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  const getActivityTypeLabel = (type: string) => {
    const typeMap: { [key: string]: string } = {
      member_registered: "Member Registered",
      member_updated: "Member Updated",
      member_deactivated: "Member Deactivated",
      session_booked: "Session Booked",
      session_cancelled: "Session Cancelled",
      session_completed: "Session Completed",
      session_created: "Session Created",
      package_assigned: "Package Assigned",
      package_expired: "Package Expired",
      payment_received: "Payment Received",
    }
    return typeMap[type] || type
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return "Just now"
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  // Safely convert the `details` field to a searchable / renderable string
  const stringifyDetails = (details: string | object | undefined) => {
    if (!details) return ""
    return typeof details === "string" ? details : JSON.stringify(details, null, 2)
  }

  // Pagination
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedActivities = filteredActivities.slice(startIndex, startIndex + itemsPerPage)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" asChild className="mr-2">
            <Link href="/admin/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Loading Activities...</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" asChild className="mr-2">
            <Link href="/admin/dashboard">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back to Dashboard</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Activity Log</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Activities</CardTitle>
          <CardDescription>Complete log of all gym activities and system events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="members">Members</SelectItem>
                <SelectItem value="sessions">Sessions</SelectItem>
                <SelectItem value="packages">Packages</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {paginatedActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTimestamp(activity.timestamp)}
                    </div>
                  </div>
                  {activity.details && (
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                      {stringifyDetails(activity.details)}
                    </p>
                  )}
                  <div className="flex items-center mt-2 space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {getActivityTypeLabel(activity.type)}
                    </Badge>
                    {activity.memberName && (
                      <Badge variant="outline" className="text-xs">
                        {activity.memberName}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredActivities.length === 0 && (
            <div className="text-center py-8">
              <ActivityIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No activities found matching your criteria.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
