"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, DollarSign } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { activityLogger } from '@/lib/activity-logger'

const availablePackages = [
  { id: "1", name: "Personal Training", sessions: 10, price: 500, duration: 30, package_type: "personal_training" },
  { id: "2", name: "Group Class", sessions: 12, price: 240, duration: 30, package_type: "group_class" },
  { id: "3", name: "Fitness Assessment", sessions: 4, price: 200, duration: 15, package_type: "fitness_assessment" },
  { id: "4", name: "Nutrition Consultation", sessions: 6, price: 300, duration: 30, package_type: "nutrition_consultation" },
  { id: "5", name: "Monthly Pass", sessions: 20, price: 150, duration: 30, package_type: "monthly" },
  { id: "6", name: "Premium Package", sessions: 15, price: 750, duration: 60, package_type: "monthly" },
]

export default function AddPackagePage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [selectedPackage, setSelectedPackage] = useState("")
  const [paymentStatus, setPaymentStatus] = useState("")
  const [startDate, setStartDate] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Get member name for display
  const getMemberName = () => {
    const members = JSON.parse(localStorage.getItem("gym-members") || "[]")
    const memberId = Array.isArray(params.id) ? params.id[0] : params.id
    const member = members.find((m: any) => m.id === memberId)
    return member?.name || "Unknown Member"
  }

  const calculateEndDate = (startDate: string, duration: number) => {
    if (!startDate) return ""
    const start = new Date(startDate)
    const end = new Date(start)
    end.setDate(start.getDate() + duration)
    return end.toISOString().split("T")[0]
  }

  const handleSubmit = async () => {
    if (!selectedPackage || !paymentStatus || !startDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields including payment status.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()
      const packageInfo = availablePackages.find((pkg) => pkg.id === selectedPackage)
      
      if (!packageInfo) {
        toast({
          title: "Error",
          description: "Selected package not found.",
          variant: "destructive",
        })
        return
      }

      const memberId = Array.isArray(params.id) ? params.id[0] : params.id
      if (!memberId) {
        toast({
          title: "Error",
          description: "Member ID not found.",
          variant: "destructive",
        })
        return
      }

      const endDate = calculateEndDate(startDate, packageInfo.duration)

      // First, ensure the package exists in the packages table
      let { data: existingPackage, error: packageCheckError } = await supabase
        .from('packages')
        .select('id')
        .eq('name', packageInfo.name)
        .eq('package_type', packageInfo.package_type)
        .single()

      if (packageCheckError && packageCheckError.code !== 'PGRST116') {
        throw packageCheckError
      }

      // Create package if it doesn't exist
      if (!existingPackage) {
        const { data: newPackage, error: createPackageError } = await supabase
          .from('packages')
          .insert({
            name: packageInfo.name,
            description: `${packageInfo.name} package with ${packageInfo.sessions} sessions`,
            price: packageInfo.price,
            duration_days: packageInfo.duration,
            session_count: packageInfo.sessions,
            package_type: packageInfo.package_type,
            features: [packageInfo.name],
            is_active: true
          })
          .select('id')
          .single()

        if (createPackageError) {
          throw createPackageError
        }
        existingPackage = newPackage
      }

      // Create member package assignment
      const { data: memberPackage, error: memberPackageError } = await supabase
        .from('member_packages')
        .insert({
          member_id: memberId,
          package_id: existingPackage.id,
          start_date: startDate,
          end_date: endDate,
          sessions_remaining: packageInfo.sessions,
          sessions_total: packageInfo.sessions,
          status: 'active',
          purchased_at: new Date().toISOString()
        })
        .select()
        .single()

      if (memberPackageError) {
        throw memberPackageError
      }

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          member_id: memberId,
          package_id: existingPackage.id,
          amount: packageInfo.price,
          payment_method: 'manual',
          status: paymentStatus.toLowerCase() === 'paid' ? 'completed' : 'pending',
          payment_date: paymentStatus.toLowerCase() === 'paid' ? new Date().toISOString() : null
        })

      if (paymentError) {
        console.error('Payment record creation failed:', paymentError)
        // Don't throw error, just log it since member package was created successfully
      }

      // Log activity
      await activityLogger.logActivity(
        'package_assigned',
        'member',
        memberId,
        {
          packageName: packageInfo.name,
          memberName: 'Member',
          packageId: existingPackage.id,
          sessions: packageInfo.sessions,
          price: packageInfo.price,
          paymentStatus: paymentStatus.toLowerCase()
        }
      )

      toast({
        title: "Package Added Successfully",
        description: `${packageInfo.name} package has been assigned successfully with ${paymentStatus.toLowerCase()} status.`,
      })

      // Navigate back to packages page
      router.push("/admin/packages")
      
    } catch (error) {
      console.error("Error adding package:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add package. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const selectedPackageInfo = availablePackages.find((pkg) => pkg.id === selectedPackage)

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Add Package to {getMemberName()}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Package Assignment</CardTitle>
          <CardDescription>Select a package and set payment status for this member</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Package Type *</Label>
            <Select value={selectedPackage} onValueChange={setSelectedPackage}>
              <SelectTrigger>
                <SelectValue placeholder="Select a package" />
              </SelectTrigger>
              <SelectContent>
                {availablePackages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name} - {pkg.sessions} sessions (${pkg.price}) - {pkg.duration} days
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Payment Status *</Label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Paid">
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                    Paid
                  </div>
                </SelectItem>
                <SelectItem value="Unpaid">
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-red-600" />
                    Unpaid
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Start Date *</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          {selectedPackageInfo && startDate && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-medium">Package Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Package:</span>
                  <p className="font-medium">{selectedPackageInfo.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Price:</span>
                  <p className="font-medium">${selectedPackageInfo.price}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Sessions:</span>
                  <p className="font-medium">{selectedPackageInfo.sessions}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <p className="font-medium">{selectedPackageInfo.duration} days</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Start Date:</span>
                  <p className="font-medium">{startDate}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">End Date:</span>
                  <p className="font-medium">{calculateEndDate(startDate, selectedPackageInfo.duration)}</p>
                </div>
              </div>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
            {isLoading ? "Adding Package..." : "Add Package"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
