import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type StatusType = "Active" | "Inactive" | "Available" | "Full" | "Completed"

interface StatusBadgeProps {
  status: StatusType | string
  className?: string
  children?: React.ReactNode
}

export function StatusBadge({ status, className, children }: StatusBadgeProps) {
  const normalizedStatus = normalizeStatus(status)

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "available":
        return "bg-green-100 text-green-800 hover:bg-green-200"
      case "inactive":
      case "full":
        return "bg-red-100 text-red-800 hover:bg-red-200"
      case "completed":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200"
    }
  }

  return (
    <Badge variant="secondary" className={cn(getStatusColor(normalizedStatus), className)}>
      {normalizedStatus}
    </Badge>
  )
}

export function TableStatusBadge({ status, className }: StatusBadgeProps) {
  return <StatusBadge status={status} className={cn("text-xs", className)} />
}

export function StatusBadgeWithIcon({ status, className }: StatusBadgeProps) {
  const normalizedStatus = normalizeStatus(status)

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "available":
        return "●"
      case "inactive":
      case "full":
        return "●"
      case "completed":
        return "✓"
      default:
        return "●"
    }
  }

  return (
    <StatusBadge status={normalizedStatus} className={cn("flex items-center gap-1", className)}>
      <span className="text-xs">{getStatusIcon(normalizedStatus)}</span>
      {normalizedStatus}
    </StatusBadge>
  )
}

// Helper function to normalize status values
export function normalizeStatus(status: string | StatusType): string {
  if (!status) return "Inactive"

  const statusStr = status.toString().toLowerCase().trim()

  switch (statusStr) {
    case "active":
    case "enabled":
    case "on":
    case "yes":
    case "true":
      return "Active"
    case "inactive":
    case "disabled":
    case "off":
    case "no":
    case "false":
      return "Inactive"
    case "available":
    case "open":
      return "Available"
    case "full":
    case "closed":
      return "Full"
    case "completed":
    case "done":
    case "finished":
      return "Completed"
    default:
      // Capitalize first letter for unknown statuses
      return statusStr.charAt(0).toUpperCase() + statusStr.slice(1)
  }
}

// Helper function to check if status is active
export function isActiveStatus(status: string | StatusType): boolean {
  const normalized = normalizeStatus(status)
  return normalized === "Active" || normalized === "Available"
}
