"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft } from "lucide-react"

export default function BodyCompositionPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    weight: "",
    bodyFat: "",
    muscleMass: "",
    chest: "",
    waist: "",
    hips: "",
    arms: "",
    thighs: "",
    notes: "",
  })

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setIsLoading(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Save body composition data
      const existingData = JSON.parse(localStorage.getItem("member-body-composition") || "{}")
      existingData[params.id] = {
        ...formData,
        date: new Date().toISOString().split("T")[0],
        updatedBy: "Admin",
      }
      localStorage.setItem("member-body-composition", JSON.stringify(existingData))

      toast({
        title: "Body Composition Updated",
        description: "Member's body composition data has been saved successfully.",
      })

      router.push("/admin/members")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save body composition data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Set Body Composition</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Body Composition Data</CardTitle>
          <CardDescription>Update the member's body composition measurements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => handleChange("weight", e.target.value)}
                placeholder="75.5"
              />
            </div>
            <div className="space-y-2">
              <Label>Body Fat (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.bodyFat}
                onChange={(e) => handleChange("bodyFat", e.target.value)}
                placeholder="18.5"
              />
            </div>
            <div className="space-y-2">
              <Label>Muscle Mass (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.muscleMass}
                onChange={(e) => handleChange("muscleMass", e.target.value)}
                placeholder="35.2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Chest (cm)</Label>
              <Input
                type="number"
                value={formData.chest}
                onChange={(e) => handleChange("chest", e.target.value)}
                placeholder="102"
              />
            </div>
            <div className="space-y-2">
              <Label>Waist (cm)</Label>
              <Input
                type="number"
                value={formData.waist}
                onChange={(e) => handleChange("waist", e.target.value)}
                placeholder="85"
              />
            </div>
            <div className="space-y-2">
              <Label>Hips (cm)</Label>
              <Input
                type="number"
                value={formData.hips}
                onChange={(e) => handleChange("hips", e.target.value)}
                placeholder="95"
              />
            </div>
            <div className="space-y-2">
              <Label>Arms (cm)</Label>
              <Input
                type="number"
                value={formData.arms}
                onChange={(e) => handleChange("arms", e.target.value)}
                placeholder="32"
              />
            </div>
            <div className="space-y-2">
              <Label>Thighs (cm)</Label>
              <Input
                type="number"
                value={formData.thighs}
                onChange={(e) => handleChange("thighs", e.target.value)}
                placeholder="55"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Additional notes about the member's progress..."
              rows={3}
            />
          </div>

          <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
            {isLoading ? "Saving..." : "Save Body Composition"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
