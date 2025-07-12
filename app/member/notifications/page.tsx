"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Bell, Calendar, Check, Clock } from "lucide-react"

// Mock data for notifications
const mockNotifications = [
  {
    id: "1",
    title: "Session Reminder",
    message: "Your Personal Training session with Mike Johnson is tomorrow at 10:00 AM.",
    date: "2023-06-14",
    time: "09:30 AM",
    type: "reminder",
    read: false,
  },
  {
    id: "2",
    title: "Package Expiring Soon",
    message: "Your Personal Training package will expire in 7 days. Consider renewing to avoid interruption.",
    date: "2023-06-13",
    time: "02:15 PM",
    type: "alert",
    read: false,
  },
  {
    id: "3",
    title: "Session Cancelled",
    message:
      "Your Group Class on June 12 has been cancelled due to trainer illness. We apologize for the inconvenience.",
    date: "2023-06-12",
    time: "11:00 AM",
    type: "cancellation",
    read: true,
  },
  {
    id: "4",
    title: "Progress Update",
    message: "Your trainer has updated your progress report. Check your progress page to see your latest measurements.",
    date: "2023-06-10",
    time: "03:45 PM",
    type: "update",
    read: true,
  },
  {
    id: "5",
    title: "Gym Announcement",
    message: "The gym will be closed for maintenance on June 20 from 10:00 PM to 5:00 AM.",
    date: "2023-06-08",
    time: "10:00 AM",
    type: "announcement",
    read: true,
  },
]

export default function NotificationsPage() {
  const router = useRouter()
  // Update useState to load from localStorage
  const [notifications, setNotifications] = useState([])

  // Add useEffect to load notifications from localStorage
  useEffect(() => {
    const storedNotifications = JSON.parse(localStorage.getItem("member-notifications") || "[]")
    if (storedNotifications.length > 0) {
      setNotifications(storedNotifications)
    } else {
      // Save initial mock data to localStorage
      localStorage.setItem("member-notifications", JSON.stringify(mockNotifications))
      setNotifications(mockNotifications)
    }
  }, [])
  const [activeTab, setActiveTab] = useState("all")

  const unreadCount = notifications.filter((notification) => !notification.read).length

  const filteredNotifications =
    activeTab === "all"
      ? notifications
      : activeTab === "unread"
        ? notifications.filter((notification) => !notification.read)
        : notifications.filter((notification) => notification.read)

  // Update markAsRead function to save to localStorage
  const markAsRead = (id) => {
    const updatedNotifications = notifications.map((notification) =>
      notification.id === id ? { ...notification, read: true } : notification,
    )
    setNotifications(updatedNotifications)
    localStorage.setItem("member-notifications", JSON.stringify(updatedNotifications))
  }

  // Update markAllAsRead function to save to localStorage
  const markAllAsRead = () => {
    const updatedNotifications = notifications.map((notification) => ({ ...notification, read: true }))
    setNotifications(updatedNotifications)
    localStorage.setItem("member-notifications", JSON.stringify(updatedNotifications))
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case "reminder":
        return <Clock className="h-5 w-5 text-blue-500" />
      case "alert":
        return <Bell className="h-5 w-5 text-amber-500" />
      case "cancellation":
        return <Calendar className="h-5 w-5 text-red-500" />
      case "update":
        return <Check className="h-5 w-5 text-green-500" />
      case "announcement":
        return <Bell className="h-5 w-5 text-primary" />
      default:
        return <Bell className="h-5 w-5 text-primary" />
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2" aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Notifications</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Your Notifications</CardTitle>
            <CardDescription>Stay updated with important gym information</CardDescription>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              Mark All as Read
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                All
                <Badge variant="secondary" className="ml-2">
                  {notifications.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="unread">
                Unread
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="read">Read</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`border rounded-lg p-4 ${!notification.read ? "bg-muted/30" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{notification.title}</h3>
                          {!notification.read && <Badge variant="secondary">New</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">
                            {notification.date} at {notification.time}
                          </p>
                          {!notification.read && (
                            <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}>
                              Mark as Read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-lg">No notifications</h3>
                  <p className="text-sm text-muted-foreground">
                    {activeTab === "unread"
                      ? "You've read all your notifications."
                      : activeTab === "read"
                        ? "You don't have any read notifications yet."
                        : "You don't have any notifications yet."}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
