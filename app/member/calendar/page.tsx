"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"

// 1. Add interface for calendar event data
interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  trainer: string;
}

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
  const auth = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth.user) {
      loadCalendarEvents();
    }
  }, [auth.user, currentDate]);

  const loadCalendarEvents = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      // Get member profile
      const { data: memberProfile, error: memberError } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", auth.user.id)
        .single();
      if (memberError || !memberProfile) {
        toast({
          title: "Error Loading Member Data",
          description: "Could not load your member profile.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      // Get bookings for the week
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - currentDate.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_time,
          sessions (
            title,
            session_type,
            start_time,
            end_time,
            trainers (
              profiles (full_name)
            )
          )
        `)
        .eq("member_id", memberProfile.id)
        .gte("booking_time", weekStart.toISOString())
        .lte("booking_time", weekEnd.toISOString());
      if (bookingsError) {
        console.error("Error loading bookings:", bookingsError);
        setEvents([]);
      } else {
        const transformedEvents = (bookingsData || []).map((booking: any) => {
          const session = Array.isArray(booking.sessions) ? booking.sessions[0] : booking.sessions;
          return {
            id: booking.id,
            title: session?.title || "Session",
            date: session?.start_time ? new Date(session.start_time).toISOString().split("T")[0] : "",
            time:
              session?.start_time && session?.end_time
                ? `${new Date(session.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(session.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "",
            type: session?.session_type || "",
            trainer: session?.trainers?.profiles?.full_name || "Trainer",
          };
        });
        setEvents(transformedEvents);
      }
    } catch (error) {
      console.error("Error loading calendar events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

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
    return events.filter((event) => event.date === dateString)
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
                  {loading ? (
                    <div className="text-center text-muted-foreground text-sm py-4">Loading sessions...</div>
                  ) : getEventsForDate(date).length > 0 ? (
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
