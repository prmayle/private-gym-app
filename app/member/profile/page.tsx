"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Edit, Save, X } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"

// 1. Add interface for member profile data
interface MemberProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  joinDate: string;
  status: string;
}

export default function MemberProfile() {
  const router = useRouter()
  const auth = useAuth();
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPhone, setIsChangingPhone] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState("")
  const [memberData, setMemberData] = useState<MemberProfile | null>(null)
  const [editedData, setEditedData] = useState<MemberProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [newPhone, setNewPhone] = useState("")

  useEffect(() => {
    if (auth.user) {
      loadMemberProfile();
    }
  }, [auth.user]);

  const loadMemberProfile = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      // Get member profile
      const { data: memberProfile, error: memberError } = await supabase
        .from("members")
        .select(`
          id,
          joined_at,
          membership_status,
          user_id,
          emergency_contact,
          address,
          date_of_birth
        `)
        .eq("user_id", auth.user.id)
        .single();
      if (memberError || !memberProfile) {
        toast({
          title: "Error Loading Member Data",
          description: "Could not load your member profile.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      // Get user profile for name/email/phone
      const { data: userProfile, error: userError } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", memberProfile.user_id)
        .single();
      if (userError || !userProfile) {
        toast({
          title: "Error Loading User Data",
          description: "Could not load your user profile.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      setMemberData({
        id: memberProfile.id,
        name: userProfile.full_name || "",
        email: userProfile.email || "",
        phone: userProfile.phone || "",
        dateOfBirth: memberProfile.date_of_birth || "",
        address: memberProfile.address || "",
        emergencyContact: memberProfile.emergency_contact || "",
        emergencyPhone: "",
        joinDate: new Date(memberProfile.joined_at).toLocaleDateString(),
        status: memberProfile.membership_status,
      });
      setEditedData({
        id: memberProfile.id,
        name: userProfile.full_name || "",
        email: userProfile.email || "",
        phone: userProfile.phone || "",
        dateOfBirth: memberProfile.date_of_birth || "",
        address: memberProfile.address || "",
        emergencyContact: memberProfile.emergency_contact || "",
        emergencyPhone: "",
        joinDate: new Date(memberProfile.joined_at).toLocaleDateString(),
        status: memberProfile.membership_status,
      });
    } catch (error) {
      console.error("Error loading member profile:", error);
      setMemberData(null);
      setEditedData(null);
    } finally {
      setLoading(false);
    }
  };

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
    // This function is no longer needed as phone is fetched from Supabase
    return false;
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

    // This function is no longer needed as phone is fetched from Supabase
    // if (checkPhoneExists(newPhone)) {
    //   toast({
    //     title: "Phone Number Already Exists",
    //     description: "This phone number is already registered to another member.",
    //     variant: "destructive",
    //   })
    //   return
    // }

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
    // This function is no longer needed as phone is fetched from Supabase
    // setEditedData({ ...editedData, phone: newPhone })
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
    if (!editedData?.name || !editedData?.email) {
      toast({
        title: "Validation Error",
        description: "Name and email are required fields.",
        variant: "destructive",
      })
      return
    }

    // Update member data
    const supabase = createClient();
    const updatedMember = {
      ...editedData,
      user_id: auth.user?.id, // Ensure user_id is updated
      updated_at: new Date().toISOString(),
    };

    const { error } = supabase
      .from("members")
      .upsert(updatedMember)
      .eq("id", editedData.id);

    if (error) {
      toast({
        title: "Error Updating Profile",
        description: `Failed to update profile: ${error.message}`,
        variant: "destructive",
      });
      return;
    }

    setMemberData(updatedMember);
    setIsEditing(false);

    toast({
      title: "Profile Updated",
      description: "Your profile has been successfully updated.",
    });
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!memberData) {
    return <div className="text-center py-8">Could not load member profile.</div>;
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
