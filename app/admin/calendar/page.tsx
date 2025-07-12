"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import type { Session } from "@/types/status"

// Mock trainers data
const trainers = [
  { id: "1", name: "Mike Johnson" },
  { id: "2", name: "Sarah Williams" },
  { id: "3", name: "David Lee" },
  { id: "4", name: "Emma Thompson" },
  { id: "5", name: "Lisa Johnson" },
]

// Session types
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

export default function CalendarPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState("")
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0)

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

  useEffect(() => {
    // Redirect to sessions page since calendar functionality is now consolidated there
    router.replace("/admin/sessions")
  }, [router])

  return (
    <div className="container mx-auto py-6">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting to Sessions...</p>
      </div>
    </div>
  )
}
