"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Edit, Save, X } from "lucide-react"

// Mock current member data - in real app this would come from authentication
const CURRENT_MEMBER_ID = "1"

export default function MemberProfile() {
  const router = useRouter()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPhone, setIsChangingPhone] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState("")
  const [memberData, setMemberData] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    joinDate: "",
    status: "Active",
  })
  const [editedData, setEditedData] = useState(memberData)
  const [newPhone, setNewPhone] = useState("")

  useEffect(() => {
    // Load member data from localStorage
    const storedMembers = JSON.parse(localStorage.getItem("gym-members") || "[]")

    // Try to find current member in stored members
    let currentMember = storedMembers.find((member) => member.id === CURRENT_MEMBER_ID)

    // If not found, use default member data
    if (!currentMember) {
      currentMember = {
        id: "1",
        name: "John Doe",
        email: "john.doe@example.com",
        phone: "+1 234 567 890",
        dateOfBirth: "1990-05-15",
        address: "123 Main St, City, State 12345",
        emergencyContact: "Jane Doe",
        emergencyPhone: "+1 234 567 891",
        joinDate: "2023-01-15",
        status: "Active",
      }
    }

    setMemberData(currentMember)
    setEditedData(currentMember)
  }, [])

  const handleEdit = () => {
    setIsEditing(true)
    setEditedData(memberData)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setIsChangingPhone(false)
    setOtpStep(false)
    setEditedData(memberData)
    setNewPhone("")
    setOtp("")
  }

  const checkPhoneExists = (phone) => {
    const storedMembers = JSON.parse(localStorage.getItem("gym-members") || "[]")
    return storedMembers.some((member) => member.phone === phone && member.id !== CURRENT_MEMBER_ID)
  }

  const handlePhoneChange = () => {
    if (!newPhone) {
      toast({
        title: "Error",
        description: "Please enter a new phone number.",
        variant: "destructive",
      })
      return
    }

    if (checkPhoneExists(newPhone)) {
      toast({
        title: "Phone Number Already Exists",
        description: "This phone number is already registered to another member.",
        variant: "destructive",
      })
      return
    }

    setIsChangingPhone(true)
    setOtpStep(true)

    toast({
      title: "OTP Sent",
      description: `A verification code has been sent to ${newPhone}.`,
    })
  }

  const handleOtpVerification = () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive",
      })
      return
    }

    // Simulate OTP verification
    setEditedData({ ...editedData, phone: newPhone })
    setIsChangingPhone(false)
    setOtpStep(false)
    setNewPhone("")
    setOtp("")

    toast({
      title: "Phone Number Updated",
      description: "Your phone number has been successfully updated.",
    })
  }

  const handleSave = () => {
    // Validate required fields
    if (!editedData.name || !editedData.email) {
      toast({
        title: "Validation Error",
        description: "Name and email are required fields.",
        variant: "destructive",
      })
      return
    }

    // Update member data
    const storedMembers = JSON.parse(localStorage.getItem("gym-members") || "[]")
    const updatedMembers = storedMembers.map((member) => (member.id === CURRENT_MEMBER_ID ? editedData : member))

    // If member not found in stored members, add them
    if (!storedMembers.find((member) => member.id === CURRENT_MEMBER_ID)) {
      updatedMembers.push(editedData)
    }

    localStorage.setItem("gym-members", JSON.stringify(updatedMembers))
    setMemberData(editedData)
    setIsEditing(false)

    toast({
      title: "Profile Updated",
      description: "Your profile has been successfully updated.",
    })
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2" aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">My Profile</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Manage your account details and preferences</CardDescription>
          </div>
          {!isEditing ? (
            <Button onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={editedData.name}
                onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editedData.email}
                onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex space-x-2">
                <Input id="phone" value={editedData.phone} disabled={true} />
                {isEditing && (
                  <Button variant="outline" onClick={() => setIsChangingPhone(true)}>
                    Change
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={editedData.dateOfBirth}
                onChange={(e) => setEditedData({ ...editedData, dateOfBirth: e.target.value })}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={editedData.address}
              onChange={(e) => setEditedData({ ...editedData, address: e.target.value })}
              disabled={!isEditing}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
              <Input
                id="emergencyContact"
                value={editedData.emergencyContact}
                onChange={(e) => setEditedData({ ...editedData, emergencyContact: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
              <Input
                id="emergencyPhone"
                value={editedData.emergencyPhone}
                onChange={(e) => setEditedData({ ...editedData, emergencyPhone: e.target.value })}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="joinDate">Join Date</Label>
              <Input id="joinDate" value={editedData.joinDate} disabled={true} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Input id="status" value={editedData.status} disabled={true} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phone Change Modal */}
      {isChangingPhone && (
        <Card>
          <CardHeader>
            <CardTitle>Change Phone Number</CardTitle>
            <CardDescription>
              {otpStep ? "Enter the verification code sent to your new phone number" : "Enter your new phone number"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!otpStep ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="newPhone">New Phone Number</Label>
                  <Input
                    id="newPhone"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Enter new phone number"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handlePhoneChange}>Send OTP</Button>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleOtpVerification}>Verify & Update</Button>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
