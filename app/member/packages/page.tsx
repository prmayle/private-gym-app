"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, CheckCircle } from "lucide-react"

// Mock data for current packages
const currentPackages = [
  {
    id: "pkg1",
    name: "Personal Training",
    remaining: 5,
    total: 10,
    expiry: "2023-12-31",
  },
  {
    id: "pkg2",
    name: "Group Class",
    remaining: 8,
    total: 12,
    expiry: "2023-12-31",
  },
  {
    id: "pkg3",
    name: "Fitness Assessment",
    remaining: 0,
    total: 2,
    expiry: "2023-12-31",
  },
]

// Mock data for available packages
const availablePackages = [
  {
    id: "new1",
    name: "Personal Training",
    sessions: 10,
    price: 500,
    description: "One-on-one training sessions with a personal trainer",
  },
  {
    id: "new2",
    name: "Group Class",
    sessions: 12,
    price: 240,
    description: "Access to all group fitness classes",
  },
  {
    id: "new3",
    name: "Fitness Assessment",
    sessions: 4,
    price: 200,
    description: "Comprehensive fitness and body composition assessments",
  },
  {
    id: "new4",
    name: "Nutrition Consultation",
    sessions: 6,
    price: 300,
    description: "Personalized nutrition planning and consultations",
  },
]

export default function ManagePackagesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedPackage, setSelectedPackage] = useState("")
  const [requestNote, setRequestNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitRequest = async () => {
    if (!selectedPackage) {
      toast({
        title: "Package Required",
        description: "Please select a package to request.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const packageDetails = availablePackages.find((pkg) => pkg.id === selectedPackage)

      // Create admin notification for package request
      const adminNotification = {
        id: Date.now().toString(),
        title: "New Package Request",
        message: `Member John Doe has requested a ${packageDetails.name} package. ${requestNote ? `Note: ${requestNote}` : ""}`,
        type: "package_request",
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        read: false,
        memberName: "John Doe",
        packageName: packageDetails.name,
        packagePrice: packageDetails.price,
        packageSessions: packageDetails.sessions,
        requestNote: requestNote,
        status: "pending",
      }

      // Save admin notification
      const existingAdminNotifications = JSON.parse(localStorage.getItem("admin-notifications") || "[]")
      existingAdminNotifications.unshift(adminNotification)
      localStorage.setItem("admin-notifications", JSON.stringify(existingAdminNotifications))

      toast({
        title: "Request Submitted",
        description: `Your request for the ${packageDetails.name} package has been sent to the admin.`,
      })

      setSelectedPackage("")
      setRequestNote("")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2" aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Manage Packages</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Current Packages</CardTitle>
          <CardDescription>Active packages and remaining sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currentPackages.map((pkg) => (
              <div key={pkg.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">{pkg.name}</h3>
                  <span className={`text-sm font-medium ${pkg.remaining === 0 ? "text-red-500" : ""}`}>
                    {pkg.remaining}/{pkg.total} sessions remaining
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Expires: {pkg.expiry}</p>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${(pkg.remaining / pkg.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request New Package</CardTitle>
          <CardDescription>Submit a request to add a new package to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Package</label>
            <Select value={selectedPackage} onValueChange={setSelectedPackage}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a package" />
              </SelectTrigger>
              <SelectContent>
                {availablePackages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name} - {pkg.sessions} sessions (${pkg.price})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPackage && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <h3 className="font-medium">Package Details</h3>
              <div className="mt-2 space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Name: </span>
                  {availablePackages.find((pkg) => pkg.id === selectedPackage)?.name}
                </p>
                <p>
                  <span className="text-muted-foreground">Sessions: </span>
                  {availablePackages.find((pkg) => pkg.id === selectedPackage)?.sessions}
                </p>
                <p>
                  <span className="text-muted-foreground">Price: </span>$
                  {availablePackages.find((pkg) => pkg.id === selectedPackage)?.price}
                </p>
                <p>
                  <span className="text-muted-foreground">Description: </span>
                  {availablePackages.find((pkg) => pkg.id === selectedPackage)?.description}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Notes (Optional)</label>
            <Textarea
              placeholder="Any specific requirements or questions about the package..."
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleSubmitRequest} disabled={!selectedPackage || isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Select a Package</h3>
                <p className="text-sm text-muted-foreground">
                  Choose from our available packages that best suits your fitness goals.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Submit Your Request</h3>
                <p className="text-sm text-muted-foreground">
                  Send your package request to our admin team for processing.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Payment Processing</h3>
                <p className="text-sm text-muted-foreground">Our team will contact you for payment arrangements.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Package Activation</h3>
                <p className="text-sm text-muted-foreground">
                  Once payment is confirmed, your new package will be activated and ready to use.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
