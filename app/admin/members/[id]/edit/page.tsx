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
import { createClient } from "@/utils/supabase/client"
import { activityLogger } from "@/lib/activity-logger"

interface Member {
  id: string
  user_id: string
  name: string
  email: string
  phone: string
  joinDate: string
  status: string
  address?: string
  emergencyContact?: string
  emergencyPhone?: string
  dateOfBirth?: string
  notes?: string
  gender?: string
  height?: number
  weight?: number
  medicalConditions?: string
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
    status: "active",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    dateOfBirth: "",
    notes: "",
    gender: "",
    height: "",
    weight: "",
    medicalConditions: "",
  })

  useEffect(() => {
    loadMember()
  }, [params.id])

  const loadMember = async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()

      if (!params.id) {
        toast({
          title: "Invalid Member ID",
          description: "No member ID provided.",
          variant: "destructive",
        })
        router.push("/admin/members")
        return
      }

      // Load member with profile data
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select(`
          id,
          user_id,
          emergency_contact,
          medical_conditions,
          date_of_birth,
          gender,
          address,
          height,
          weight,
          joined_at,
          membership_status,
          profiles!members_user_id_fkey (
            id,
            full_name,
            email,
            phone
          )
        `)
        .eq('id', params.id)
        .single()

      if (memberError) {
        console.error("Error loading member:", memberError)
        toast({
          title: "Member Not Found",
          description: "The requested member could not be found.",
          variant: "destructive",
        })
        router.push("/admin/members")
        return
      }

      if (memberData) {
        const member = {
          id: memberData.id,
          user_id: memberData.user_id,
          name: memberData.profiles?.full_name || "",
          email: memberData.profiles?.email || "",
          phone: memberData.profiles?.phone || "",
          joinDate: memberData.joined_at,
          status: memberData.membership_status,
          address: memberData.address || "",
          emergencyContact: memberData.emergency_contact || "",
          emergencyPhone: "", // This field needs to be added to the database schema
          dateOfBirth: memberData.date_of_birth || "",
          notes: "", // This field needs to be added to the database schema
          gender: memberData.gender || "",
          height: memberData.height || 0,
          weight: memberData.weight || 0,
          medicalConditions: memberData.medical_conditions || "",
        }

        setMember(member)
        setFormData({
          name: member.name,
          email: member.email,
          phone: member.phone,
          status: member.status,
          address: member.address,
          emergencyContact: member.emergencyContact,
          emergencyPhone: member.emergencyPhone,
          dateOfBirth: member.dateOfBirth,
          notes: member.notes,
          gender: member.gender,
          height: member.height ? member.height.toString() : "",
          weight: member.weight ? member.weight.toString() : "",
          medicalConditions: member.medicalConditions,
        })
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

      if (!member) {
        toast({
          title: "Error",
          description: "Member data not loaded.",
          variant: "destructive",
        })
        return
      }

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

      const supabase = createClient()

      // Update profile table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.name,
          email: formData.email,
          phone: formData.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', member.user_id)

      if (profileError) {
        console.error("Error updating profile:", profileError)
        throw profileError
      }

      // Update member table
      const { error: memberError } = await supabase
        .from('members')
        .update({
          emergency_contact: formData.emergencyContact || null,
          medical_conditions: formData.medicalConditions || null,
          date_of_birth: formData.dateOfBirth || null,
          gender: formData.gender || null,
          address: formData.address || null,
          height: formData.height ? parseFloat(formData.height) : null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          membership_status: formData.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', member.id)

      if (memberError) {
        console.error("Error updating member:", memberError)
        throw memberError
      }

      // Log activity
      await activityLogger.logActivity(
        'member_updated',
        'member',
        member.id,
        {
          memberName: formData.name,
          updatedFields: Object.keys(formData)
        }
      )

      toast({
        title: "Member Updated",
        description: `${formData.name}'s profile has been successfully updated.`,
      })

      router.push("/admin/members")
    } catch (error) {
      console.error("Error saving member:", error)
      toast({
        title: "Save Failed",
        description: "Failed to save member changes. Please try again.",
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
              <Label htmlFor="status">Membership Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange("status", value)}
                disabled={isSaving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
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
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => handleInputChange("gender", value)}
                disabled={isSaving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Not specified</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                value={formData.height}
                onChange={(e) => handleInputChange("height", e.target.value)}
                placeholder="Enter height in cm"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                value={formData.weight}
                onChange={(e) => handleInputChange("weight", e.target.value)}
                placeholder="Enter weight in kg"
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="medicalConditions">Medical Conditions</Label>
            <Textarea
              id="medicalConditions"
              value={formData.medicalConditions}
              onChange={(e) => handleInputChange("medicalConditions", e.target.value)}
              placeholder="Enter any medical conditions or health notes"
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
                <span className="text-blue-700">User ID:</span> {member.user_id}
              </div>
              <div>
                <span className="text-blue-700">Join Date:</span> {new Date(member.joinDate).toLocaleDateString()}
              </div>
              <div>
                <span className="text-blue-700">Current Status:</span> {member.status}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
