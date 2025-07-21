"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DateTimePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DateTimePicker({
  date,
  onDateChange,
  placeholder = "Pick a date and time",
  className,
  disabled = false,
}: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)
  const [timeValue, setTimeValue] = React.useState<string>(
    date ? format(date, "HH:mm") : "09:00"
  )
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    if (date) {
      setSelectedDate(date)
      setTimeValue(format(date, "HH:mm"))
    }
  }, [date])

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      // Preserve the time when date changes
      const [hours, minutes] = timeValue.split(":").map(Number)
      const dateTime = new Date(newDate)
      dateTime.setHours(hours, minutes, 0, 0)
      
      setSelectedDate(dateTime)
      onDateChange?.(dateTime)
    } else {
      setSelectedDate(undefined)
      onDateChange?.(undefined)
    }
  }

  const handleTimeChange = (newTime: string) => {
    setTimeValue(newTime)
    if (selectedDate) {
      const [hours, minutes] = newTime.split(":").map(Number)
      const dateTime = new Date(selectedDate)
      dateTime.setHours(hours, minutes, 0, 0)
      
      setSelectedDate(dateTime)
      onDateChange?.(dateTime)
    }
  }

  const handleSetNow = () => {
    const now = new Date()
    setSelectedDate(now)
    setTimeValue(format(now, "HH:mm"))
    onDateChange?.(now)
  }

  const handleClear = () => {
    setSelectedDate(undefined)
    setTimeValue("09:00")
    onDateChange?.(undefined)
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? (
              format(selectedDate, "PPP 'at' HH:mm")
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="border-b p-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Select Date & Time</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSetNow}
                  className="h-7 px-2"
                >
                  Now
                </Button>
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={handleClear}
                  className="h-7 px-2"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
          
          <div className="p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => 
                date < new Date(new Date().setHours(0, 0, 0, 0)) // Disable past dates
              }
              initialFocus
            />
          </div>
          
          <div className="border-t p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <Label htmlFor="time" className="text-sm font-medium">
                Time
              </Label>
              <Input
                id="time"
                type="time"
                value={timeValue}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-32"
              />
            </div>
          </div>
          
          <div className="border-t p-3">
            <Button 
              onClick={() => setIsOpen(false)} 
              className="w-full"
              size="sm"
            >
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

interface SessionTimeRangePickerProps {
  startDate?: Date
  endDate?: Date
  onStartDateChange?: (date: Date | undefined) => void
  onEndDateChange?: (date: Date | undefined) => void
  className?: string
  disabled?: boolean
}

export function SessionTimeRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className,
  disabled = false,
}: SessionTimeRangePickerProps) {
  const handleStartDateChange = (date: Date | undefined) => {
    onStartDateChange?.(date)
    
    // Auto-set end date to 1 hour after start date if no end date is set
    if (date && !endDate) {
      const autoEndDate = new Date(date)
      autoEndDate.setHours(autoEndDate.getHours() + 1)
      onEndDateChange?.(autoEndDate)
    }
  }

  const handleEndDateChange = (date: Date | undefined) => {
    // Ensure end date is after start date
    if (date && startDate && date <= startDate) {
      const correctedEndDate = new Date(startDate)
      correctedEndDate.setHours(correctedEndDate.getHours() + 1)
      onEndDateChange?.(correctedEndDate)
      return
    }
    onEndDateChange?.(date)
  }

  return (
    <div className={cn("grid gap-4", className)}>
      <div>
        <Label className="text-sm font-medium mb-2 block">Start Time *</Label>
        <DateTimePicker
          date={startDate}
          onDateChange={handleStartDateChange}
          placeholder="Select start date and time"
          disabled={disabled}
        />
      </div>
      
      <div>
        <Label className="text-sm font-medium mb-2 block">End Time *</Label>
        <DateTimePicker
          date={endDate}
          onDateChange={handleEndDateChange}
          placeholder="Select end date and time"
          disabled={disabled}
        />
      </div>
      
      {startDate && endDate && (
        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
          <strong>Duration:</strong> {Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))} minutes
          <br />
          <strong>Date:</strong> {format(startDate, "PPPP")}
          <br />
          <strong>Time:</strong> {format(startDate, "HH:mm")} - {format(endDate, "HH:mm")}
        </div>
      )}
    </div>
  )
}