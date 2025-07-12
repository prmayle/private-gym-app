"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"

// Mock data for calendar events
const mockEvents = [
  {
    id: "1",
    title: "Personal Training",
    date: "2023-06-15",
    time: "10:00 AM - 11:00 AM",
    type: "Personal Training",
    trainer: "Mike Johnson",
  },
  {
    id: "2",
    title: "Group Class - HIIT",
    date: "2023-06-17",
    time: "11:30 AM - 12:30 PM",
    type: "Group Class",
    trainer: "Sarah Williams",
  },
  {
    id: "3",
    title: "Fitness Assessment",
    date: "2023-06-20",
    time: "2:00 PM - 3:00 PM",
    type: "Assessment",
    trainer: "Mike Johnson",
  },
]

// Generate dates for the week view
const generateWeekDates = (startDate) => {
  const dates = []
  const currentDate = new Date(startDate)

  for (let i = 0; i < 7; i++) {
    dates.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dates
}

export default function MemberCalendarPage() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())

  // Generate week dates
  const weekDates = generateWeekDates(currentDate)

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  }

  // Navigate to previous week
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentDate(newDate)
  }

  // Navigate to next week
  const goToNextWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentDate(newDate)
  }

  // Get events for a specific date
  const getEventsForDate = (date) => {
    const dateString = date.toISOString().split("T")[0]
    return mockEvents.filter((event) => event.date === dateString)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2" aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">My Schedule</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Upcoming Sessions</CardTitle>
              <CardDescription>View your scheduled training sessions and classes</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Week View */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {weekDates.map((date, index) => (
              <div key={index} className="border rounded-md overflow-hidden">
                <div className="bg-muted p-2 text-center font-medium">{formatDate(date)}</div>
                <div className="p-2 space-y-2 h-[300px] overflow-y-auto">
                  {getEventsForDate(date).length > 0 ? (
                    getEventsForDate(date).map((event) => (
                      <div
                        key={event.id}
                        className={`p-2 rounded-md text-xs ${
                          event.type === "Personal Training"
                            ? "bg-blue-100 text-blue-800"
                            : event.type === "Group Class"
                              ? "bg-green-100 text-green-800"
                              : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        <div className="font-medium">{event.title}</div>
                        <div>{event.time}</div>
                        <div>Trainer: {event.trainer}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground text-sm py-4">No sessions</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
