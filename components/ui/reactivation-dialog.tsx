"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ReactivationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: { date: string; time: string; notes?: string }) => void
  sessionTitle: string
  isLoading?: boolean
}

export function ReactivationDialog({
  isOpen,
  onClose,
  onConfirm,
  sessionTitle,
  isLoading = false,
}: ReactivationDialogProps) {
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    notes: "",
  })

  const handleSubmit = () => {
    if (!formData.date || !formData.time) {
      return
    }

    onConfirm({
      date: formData.date,
      time: formData.time,
      notes: formData.notes,
    })

    // Reset form
    setFormData({
      date: "",
      time: "",
      notes: "",
    })
  }

  const handleClose = () => {
    setFormData({
      date: "",
      time: "",
      notes: "",
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reactivate Session</DialogTitle>
          <DialogDescription>Reactivate "{sessionTitle}" by setting a new date and time.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reactivate-date">New Date *</Label>
            <Input
              id="reactivate-date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reactivate-time">New Time *</Label>
            <Input
              id="reactivate-time"
              value={formData.time}
              onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
              placeholder="e.g., 10:00 AM - 11:00 AM"
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reactivate-notes">Notes (Optional)</Label>
            <Textarea
              id="reactivate-notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Reason for reactivation or additional notes..."
              rows={3}
              disabled={isLoading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.date || !formData.time || isLoading}>
            {isLoading ? "Reactivating..." : "Reactivate Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
