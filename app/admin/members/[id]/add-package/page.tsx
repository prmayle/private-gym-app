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

const availablePackages = [
  { id: "1", name: "Personal Training", sessions: 10, price: 500, duration: 30 },
  { id: "2", name: "Group Class", sessions: 12, price: 240, duration: 30 },
  { id: "3", name: "Fitness Assessment", sessions: 4, price: 200, duration: 15 },
  { id: "4", name: "Nutrition Consultation", sessions: 6, price: 300, duration: 30 },
  { id: "5", name: "Monthly Pass", sessions: 20, price: 150, duration: 30 },
  { id: "6", name: "Premium Package", sessions: 15, price: 750, duration: 60 },
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
    const member = members.find((m) => m.id === params.id)
    return member?.name || "Unknown Member"
  }

  const calculateEndDate = (startDate, duration) => {
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
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const packageInfo = availablePackages.find((pkg) => pkg.id === selectedPackage)
      const endDate = calculateEndDate(startDate, packageInfo.duration)
      const memberName = getMemberName()

      // Create package record for packages list
      const packageRecord = {
        id: `pkg-${Date.now()}`,
        memberId: params.id,
        memberName: memberName,
        packageType: packageInfo.name,
        sessions: packageInfo.sessions,
        remainingSessions: packageInfo.sessions,
        price: packageInfo.price,
        startDate,
        endDate,
        paymentStatus: paymentStatus.toLowerCase(),
        status: "Active", // Use normalized status
        purchaseDate: new Date().toISOString(),
        createdBy: "admin",
        createdAt: new Date().toISOString(),
      }

      // Save to member-packages-records for packages list view
      const existingPackages = JSON.parse(localStorage.getItem("member-packages-records") || "[]")
      existingPackages.push(packageRecord)
      localStorage.setItem("member-packages-records", JSON.stringify(existingPackages))

      // Update member packages for session booking functionality
      const memberPackages = JSON.parse(localStorage.getItem("member-packages") || "{}")
      if (!memberPackages[params.id]) {
        memberPackages[params.id] = {}
      }
      memberPackages[params.id][packageInfo.name] = {
        remaining: packageInfo.sessions,
        total: packageInfo.sessions,
        expiry: endDate,
        status: "active",
        paymentStatus: paymentStatus.toLowerCase(),
      }
      localStorage.setItem("member-packages", JSON.stringify(memberPackages))

      // Log activity for dashboard
      const activities = JSON.parse(localStorage.getItem("admin-activities") || "[]")
      activities.unshift({
        id: `activity-${Date.now()}`,
        type: "package_assigned",
        category: "packages",
        message: `Package assigned to member`,
        details: `${packageInfo.name} package assigned to ${memberName}`,
        timestamp: new Date().toISOString(),
        memberId: params.id,
        memberName: memberName,
      })
      localStorage.setItem("admin-activities", JSON.stringify(activities.slice(0, 50))) // Keep last 50 activities

      toast({
        title: "Package Added Successfully",
        description: `${packageInfo.name} package has been added to ${memberName}'s account with ${paymentStatus.toLowerCase()} status.`,
      })

      // Navigate back to packages page to see the new package
      router.push("/admin/packages")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add package. Please try again.",
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
