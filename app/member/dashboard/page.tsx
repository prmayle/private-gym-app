"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Calendar, Package, TrendingUp, Clock } from "lucide-react"
import { UserDropdown } from "@/components/ui/user-dropdown"
import { useAuth } from "@/contexts/AuthContext"

export default function MemberDashboard() {
  const auth = useAuth()

  const [memberData] = useState({
    name: auth.userProfile?.full_name || auth.user?.user_metadata?.full_name || auth.user?.email?.split('@')[0] || "John Doe",
    membershipType: "Premium",
    joinDate: "2023-01-15",
    nextSession: {
      type: "Personal Training",
      trainer: "Mike Johnson",
      date: "2023-06-20",
      time: "10:00 AM",
    },
  })

  const [packages] = useState([
    {
      name: "Personal Training",
      remaining: 5,
      total: 10,
      expiry: "2023-12-31",
    },
    {
      name: "Group Class",
      remaining: 8,
      total: 12,
      expiry: "2023-12-31",
    },
  ])

  const [recentSessions] = useState([
    {
      id: "1",
      type: "Personal Training",
      trainer: "Mike Johnson",
      date: "2023-06-15",
      status: "Completed",
    },
    {
      id: "2",
      type: "Group Class",
      trainer: "Sarah Williams",
      date: "2023-06-12",
      status: "Completed",
    },
    {
      id: "3",
      type: "Personal Training",
      trainer: "David Lee",
      date: "2023-06-10",
      status: "Completed",
    },
  ])

  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Load notifications from localStorage
    const storedNotifications = JSON.parse(localStorage.getItem("member-notifications") || "[]")
    setNotifications(storedNotifications)

    // Calculate unread count
    const unread = storedNotifications.filter((notification: any) => !notification.read).length
    setUnreadCount(unread)
  }, [])

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
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Weight</span>
                <span className="font-medium">75 kg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Body Fat</span>
                <span className="font-medium">15%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Muscle Mass</span>
                <span className="font-medium">45 kg</span>
              </div>
            </div>
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
