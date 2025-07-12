"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, User } from "lucide-react"
import { normalizeStatus } from "@/types/status"

interface Member {
  id: string
  name: string
  email: string
  phone: string
  joinDate: string
  status: string
  packages: string[]
  lastActivity: string
  address?: string
  emergencyContact?: string
  emergencyPhone?: string
  dateOfBirth?: string
  notes?: string
}

export default function EditMemberPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [member, setMember] = useState<Member | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    status: "Active",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    dateOfBirth: "",
    notes: "",
  })

  useEffect(() => {
    loadMember()
  }, [params.id])

  const loadMember = () => {
    try {
      setIsLoading(true)
      const storedMembers = JSON.parse(localStorage.getItem("gym-members") || "[]")

      // Default members
      const defaultMembers = [
        {
          id: "1",
          name: "John Doe",
          email: "john.doe@email.com",
          phone: "+1234567890",
          joinDate: "2023-01-15",
          status: "Active",
          packages: ["Personal Training", "Group Class"],
          lastActivity: "2023-06-10",
          address: "123 Main St, City, State 12345",
          emergencyContact: "Jane Doe",
          emergencyPhone: "+1234567899",
          dateOfBirth: "1990-05-15",
          notes: "Prefers morning sessions",
        },
        {
          id: "2",
          name: "Jane Smith",
          email: "jane.smith@email.com",
          phone: "+1234567891",
          joinDate: "2023-02-20",
          status: "Active",
          packages: ["Personal Training"],
          lastActivity: "2023-06-08",
          address: "456 Oak Ave, City, State 12345",
          emergencyContact: "John Smith",
          emergencyPhone: "+1234567898",
          dateOfBirth: "1985-08-22",
          notes: "Has knee injury - avoid high impact exercises",
        },
        {
          id: "3",
          name: "Michael Johnson",
          email: "michael.johnson@email.com",
          phone: "+1234567892",
          joinDate: "2023-03-10",
          status: "Inactive",
          packages: ["Group Class"],
          lastActivity: "2023-05-15",
          address: "789 Pine St, City, State 12345",
          emergencyContact: "Sarah Johnson",
          emergencyPhone: "+1234567897",
          dateOfBirth: "1992-12-03",
          notes: "Interested in nutrition counseling",
        },
        {
          id: "4",
          name: "Emily Williams",
          email: "emily.williams@email.com",
          phone: "+1234567893",
          joinDate: "2023-04-05",
          status: "Active",
          packages: ["Personal Training", "Group Class"],
          lastActivity: "2023-06-12",
          address: "321 Elm St, City, State 12345",
          emergencyContact: "David Williams",
          emergencyPhone: "+1234567896",
          dateOfBirth: "1988-03-18",
          notes: "Training for marathon",
        },
        {
          id: "5",
          name: "Robert Brown",
          email: "robert.brown@email.com",
          phone: "+1234567894",
          joinDate: "2023-05-12",
          status: "Active",
          packages: ["Group Class"],
          lastActivity: "2023-06-11",
          address: "654 Maple Ave, City, State 12345",
          emergencyContact: "Lisa Brown",
          emergencyPhone: "+1234567895",
          dateOfBirth: "1995-07-09",
          notes: "New member - needs orientation",
        },
      ]

      const allMembers = [...storedMembers, ...defaultMembers]
      const foundMember = allMembers.find((m) => m.id === params.id)

      if (foundMember) {
        setMember(foundMember)
        setFormData({
          name: foundMember.name || "",
          email: foundMember.email || "",
          phone: foundMember.phone || "",
          status: normalizeStatus(foundMember.status),
          address: foundMember.address || "",
          emergencyContact: foundMember.emergencyContact || "",
          emergencyPhone: foundMember.emergencyPhone || "",
          dateOfBirth: foundMember.dateOfBirth || "",
          notes: foundMember.notes || "",
        })
      } else {
        toast({
          title: "Member Not Found",
          description: "The requested member could not be found.",
          variant: "destructive",
        })
        router.push("/admin/members")
      }
    } catch (error) {
      console.error("Error loading member:", error)
      toast({
        title: "Error Loading Member",
        description: "Failed to load member data.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)

      // Validate required fields
      if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        })
        return
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        })
        return
      }

      // Update member data
      const updatedMember = {
        ...member,
        ...formData,
        status: normalizeStatus(formData.status),
      }

      // Update in localStorage if it's a custom member
      const storedMembers = JSON.parse(localStorage.getItem("gym-members") || "[]")
      const isCustomMember = !["1", "2", "3", "4", "5"].includes(member!.id)

      if (isCustomMember) {
        const updatedStoredMembers = storedMembers.map((m: Member) => (m.id === member!.id ? updatedMember : m))
        localStorage.setItem("gym-members", JSON.stringify(updatedStoredMembers))
      }

      // Log activity
      const activities = JSON.parse(localStorage.getItem("admin-activities") || "[]")
      activities.unshift({
        id: `activity-${Date.now()}`,
        type: "member_updated",
        message: `${formData.name} profile updated`,
        timestamp: new Date().toISOString(),
        memberId: member!.id,
        memberName: formData.name,
      })
      localStorage.setItem("admin-activities", JSON.stringify(activities.slice(0, 50)))

      toast({
        title: "Member Updated",
        description: `${formData.name}'s profile has been successfully updated.`,
      })

      router.push("/admin/members")
    } catch (error) {
      console.error("Error saving member:", error)
      toast({
        title: "Save Failed",
        description: "Failed to save member changes.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" asChild className="mr-2">
            <Link href="/admin/members">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" asChild className="mr-2">
            <Link href="/admin/members">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Member Not Found</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" asChild className="mr-2">
            <Link href="/admin/members">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back to Members</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Edit Member</h1>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Member Information
          </CardTitle>
          <CardDescription>Update member details and contact information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter full name"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Enter email address"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="Enter phone number"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange("status", value)}
                disabled={isSaving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Enter address"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergencyContact">Emergency Contact</Label>
              <Input
                id="emergencyContact"
                value={formData.emergencyContact}
                onChange={(e) => handleInputChange("emergencyContact", e.target.value)}
                placeholder="Enter emergency contact name"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergencyPhone">Emergency Phone</Label>
              <Input
                id="emergencyPhone"
                value={formData.emergencyPhone}
                onChange={(e) => handleInputChange("emergencyPhone", e.target.value)}
                placeholder="Enter emergency contact phone"
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Enter any additional notes about the member"
              rows={4}
              disabled={isSaving}
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Member Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Member ID:</span> {member.id}
              </div>
              <div>
                <span className="text-blue-700">Join Date:</span> {new Date(member.joinDate).toLocaleDateString()}
              </div>
              <div>
                <span className="text-blue-700">Last Activity:</span>{" "}
                {new Date(member.lastActivity).toLocaleDateString()}
              </div>
              <div>
                <span className="text-blue-700">Packages:</span> {member.packages.length} active
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
