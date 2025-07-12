"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, User, Phone, FileText, Package } from "lucide-react"

interface NewMember {
  name: string
  email: string
  phone: string
  dateOfBirth: string
  gender: string
  address: string
  emergencyContactName: string
  emergencyContactPhone: string
  medicalConditions: string
  fitnessGoals: string
  membershipType: string
  startDate: string
  paymentMethod: string
  notes: string
}

export default function NewMemberPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [member, setMember] = useState<NewMember>({
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    medicalConditions: "",
    fitnessGoals: "",
    membershipType: "",
    startDate: new Date().toISOString().split("T")[0],
    paymentMethod: "",
    notes: "",
  })

  const membershipTypes = [
    "Basic Membership",
    "Premium Membership",
    "VIP Membership",
    "Student Membership",
    "Senior Membership",
    "Family Membership",
  ]

  const paymentMethods = ["Credit Card", "Debit Card", "Bank Transfer", "Cash", "Check"]

  const handleInputChange = (field: keyof NewMember, value: string) => {
    setMember((prev) => ({ ...prev, [field]: value }))
  }

  const validateForm = (): boolean => {
    const requiredFields = ["name", "email", "phone", "membershipType", "startDate"]
    const missingFields = requiredFields.filter((field) => !member[field as keyof NewMember])

    if (missingFields.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please fill in the following required fields: ${missingFields.join(", ")}`,
        variant: "destructive",
      })
      return false
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(member.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return false
    }

    // Phone validation (basic)
    const phoneRegex = /^[+]?[1-9][\d]{0,15}$/
    if (!phoneRegex.test(member.phone.replace(/[\s\-$$$$]/g, ""))) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      // Generate member ID
      const memberId = `member-${Date.now()}`

      // Create member object
      const newMember = {
        id: memberId,
        ...member,
        status: "Active",
        joinDate: member.startDate,
        lastActivity: new Date().toISOString(),
        packages: [],
        createdAt: new Date().toISOString(),
        createdBy: "admin",
      }

      // Save to localStorage
      const existingMembers = JSON.parse(localStorage.getItem("gym-members") || "[]")
      existingMembers.push(newMember)
      localStorage.setItem("gym-members", JSON.stringify(existingMembers))

      // Log activity
      const activities = JSON.parse(localStorage.getItem("admin-activities") || "[]")
      activities.unshift({
        id: `activity-${Date.now()}`,
        type: "member_created",
        category: "members",
        message: `New member ${member.name} registered`,
        details: `${member.membershipType} membership, joined on ${member.startDate}`,
        timestamp: new Date().toISOString(),
        memberId: memberId,
        memberName: member.name,
        membershipType: member.membershipType,
        status: "success",
        priority: "medium",
      })
      localStorage.setItem("admin-activities", JSON.stringify(activities.slice(0, 50)))

      toast({
        title: "Member Created Successfully",
        description: `${member.name} has been added to the system`,
      })

      // Redirect to member list or member details
      router.push("/admin/members")
    } catch (error) {
      console.error("Error creating member:", error)
      toast({
        title: "Error",
        description: "Failed to create member. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-7xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/members">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to Members</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add New Member</h1>
          <p className="text-muted-foreground">Create a new member profile with all necessary information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Personal Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Basic member details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={member.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={member.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={member.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="Enter phone number"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={member.dateOfBirth}
                    onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={member.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={member.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder="Enter address"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Membership Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Membership Details
              </CardTitle>
              <CardDescription>Membership type and payment information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="membershipType">Membership Type *</Label>
                <Select
                  value={member.membershipType}
                  onValueChange={(value) => handleInputChange("membershipType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select membership type" />
                  </SelectTrigger>
                  <SelectContent>
                    {membershipTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={member.startDate}
                  onChange={(e) => handleInputChange("startDate", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={member.paymentMethod}
                  onValueChange={(value) => handleInputChange("paymentMethod", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Emergency Contact
            </CardTitle>
            <CardDescription>Emergency contact information for safety purposes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                <Input
                  id="emergencyContactName"
                  value={member.emergencyContactName}
                  onChange={(e) => handleInputChange("emergencyContactName", e.target.value)}
                  placeholder="Enter emergency contact name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                <Input
                  id="emergencyContactPhone"
                  type="tel"
                  value={member.emergencyContactPhone}
                  onChange={(e) => handleInputChange("emergencyContactPhone", e.target.value)}
                  placeholder="Enter emergency contact phone"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Health & Fitness Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Health & Fitness Information
            </CardTitle>
            <CardDescription>Medical conditions, fitness goals, and additional notes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="medicalConditions">Medical Conditions</Label>
              <Textarea
                id="medicalConditions"
                value={member.medicalConditions}
                onChange={(e) => handleInputChange("medicalConditions", e.target.value)}
                placeholder="List any medical conditions, allergies, or health concerns"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fitnessGoals">Fitness Goals</Label>
              <Textarea
                id="fitnessGoals"
                value={member.fitnessGoals}
                onChange={(e) => handleInputChange("fitnessGoals", e.target.value)}
                placeholder="Describe fitness goals and objectives"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={member.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Any additional notes or comments"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/members">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating Member..." : "Create Member"}
          </Button>
        </div>
      </form>
    </div>
  )
}
