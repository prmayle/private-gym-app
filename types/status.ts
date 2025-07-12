// Centralized status types and utilities for session management
export type SessionStatus = "Inactive" | "Completed" | "Available" | "Full" | "Active" // legacy value for non-session entities (packages, members)

export interface StatusConfig {
  value: SessionStatus
  label: string
  className: string
  bgColor: string
  textColor: string
  priority: number // Higher number = higher priority
}

// Session interface with enhanced status management
export interface Session {
  id: string
  title: string
  date: string // YYYY-MM-DD
  time: string // "10:00 AM - 11:00 AM"
  type: string
  trainer: string
  status: SessionStatus
  capacity: { booked: number; total: number }
  bookedMembers?: string[]
  isManuallyDeactivated?: boolean // Track if admin manually deactivated
  deactivatedAt?: string // When it was deactivated
  reactivatedAt?: string // When it was reactivated
  lastModified?: string
}

// Determine session status based on business rules
export function determineSessionStatus(session: {
  date: string
  capacity: { booked: number; total: number }
  isManuallyDeactivated?: boolean
  bookedMembers?: string[]
}): SessionStatus {
  const sessionDate = new Date(session.date)
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset time for date comparison
  sessionDate.setHours(0, 0, 0, 0)

  // Priority 1: If manually deactivated by admin
  if (session.isManuallyDeactivated) {
    return "Inactive"
  }

  // Priority 2: If session date has passed and had bookings
  if (sessionDate < today) {
    if (session.bookedMembers && session.bookedMembers.length > 0) {
      return "Completed"
    }
    // Past sessions with no bookings could be considered inactive
    return "Completed"
  }

  // Priority 3: If fully booked (upcoming session)
  if (session.capacity.booked >= session.capacity.total) {
    return "Full"
  }

  // Priority 4: Default for upcoming sessions with available spots
  return "Available"
}

// Get status configuration with priority
export function getSessionStatusConfig(status: SessionStatus): StatusConfig {
  const configs: Record<SessionStatus, StatusConfig> = {
    Inactive: {
      value: "Inactive",
      label: "Inactive",
      className: "bg-gray-100 text-gray-800 border-gray-200",
      bgColor: "bg-gray-100",
      textColor: "text-gray-800",
      priority: 4, // Highest priority
    },
    Completed: {
      value: "Completed",
      label: "Completed",
      className: "bg-blue-100 text-blue-800 border-blue-200",
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
      priority: 3,
    },
    Full: {
      value: "Full",
      label: "Full",
      className: "bg-orange-100 text-orange-800 border-orange-200",
      bgColor: "bg-orange-100",
      textColor: "text-orange-800",
      priority: 2,
    },
    Available: {
      value: "Available",
      label: "Available",
      className: "bg-green-100 text-green-800 border-green-200",
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      priority: 1, // Lowest priority
    },
    Active: {
      value: "Active",
      label: "Active",
      className: "bg-green-100 text-green-800 border-green-200",
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      priority: 0, // lower than Inactive/Completed/Full/Available
    },
  }

  return configs[status]
}

// Check if session allows booking
export function canBookSession(status: SessionStatus): boolean {
  return status === "Available"
}

// Check if session allows editing
export function canEditSession(status: SessionStatus): boolean {
  return status === "Available" || status === "Full"
}

// Check if session is read-only
export function isReadOnlySession(status: SessionStatus): boolean {
  return status === "Completed"
}

// Check if session can be deactivated
export function canDeactivateSession(status: SessionStatus): boolean {
  return status === "Available" || status === "Full"
}

// Check if session can be reactivated
export function canReactivateSession(status: SessionStatus): boolean {
  return status === "Inactive"
}

// Get available actions for a session status
export function getAvailableActions(status: SessionStatus): string[] {
  switch (status) {
    case "Inactive":
      return ["reactivate", "view-details"]
    case "Completed":
      return ["view-details"]
    case "Available":
      return ["view-details", "edit-details", "deactivate"]
    case "Full":
      return ["view-details", "edit-details"]
    default:
      return ["view-details"]
  }
}

// Get all possible session status values
export function getAllSessionStatusValues(): SessionStatus[] {
  return ["Inactive", "Completed", "Available", "Full"]
}

// Get status options for select components
export function getSessionStatusOptions() {
  return getAllSessionStatusValues().map((status) => ({
    value: status,
    label: status,
    config: getSessionStatusConfig(status),
  }))
}

// Legacy support - map old status values to new system
export function normalizeStatus(status: string | undefined | null): SessionStatus {
  if (!status) return "Available"

  const normalized = status.toString().toLowerCase().trim()

  // Map old status values to new system
  const statusMap: Record<string, SessionStatus> = {
    // Legacy “active” ⇢ **Active** (not Available)
    active: "Active",
    enabled: "Active",
    on: "Active",
    true: "Active",
    yes: "Active",

    // Legacy “inactive” ⇢ Inactive
    inactive: "Inactive",
    disabled: "Inactive",
    off: "Inactive",
    false: "False",
    no: "No",
    cancelled: "Inactive",
    suspended: "Inactive",

    // Session-specific values
    open: "Available",
    available: "Available",
    full: "Full",
    booked: "Full",
    completed: "Completed",
    finished: "Completed",
    done: "Completed",
  }

  return statusMap[normalized] || "Available"
}

/**
 * Legacy helper kept for screens that still filter by simple Active/Inactive.
 * It returns only those two options.
 */
export function getStatusOptions() {
  return ["Active", "Inactive"].map((value) => ({
    value,
    label: value,
    config: getSessionStatusConfig(value as any),
  }))
}

/**
 * Legacy helpers (Active / Inactive) — kept for non-session entities
 * like packages or members that still rely on simple status checks.
 */
export function isActiveStatus(status: string | undefined | null): boolean {
  return normalizeStatus(status) === "Active"
}

export function isInactiveStatus(status: string | undefined | null): boolean {
  return normalizeStatus(status) === "Inactive"
}
