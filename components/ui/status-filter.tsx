"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getStatusOptions } from "@/types/status"

interface StatusFilterProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  includeAll?: boolean
  className?: string
  disabled?: boolean
}

export function StatusFilter({
  value,
  onValueChange,
  placeholder = "Filter by status",
  includeAll = true,
  className,
  disabled = false,
}: StatusFilterProps) {
  const statusOptions = getStatusOptions()

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all">All Statuses</SelectItem>}
        {statusOptions.map((option) => (
          <SelectItem key={option.value} value={option.value.toLowerCase()}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${option.value === "Active" ? "bg-green-600" : "bg-red-600"}`} />
              {option.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
