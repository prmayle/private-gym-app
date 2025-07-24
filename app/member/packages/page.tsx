"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { createClient } from "@/utils/supabase/client"
import { ArrowLeft, CheckCircle, Package } from "lucide-react"

export default function ManagePackagesPage() {
  const router = useRouter()
  const auth = useAuth()
  const { toast } = useToast()
  const [selectedPackage, setSelectedPackage] = useState("")
  const [requestNote, setRequestNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentPackages, setCurrentPackages] = useState([])
  const [availablePackages, setAvailablePackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentMemberId, setCurrentMemberId] = useState(null)

  useEffect(() => {
    if (auth.user) {
      loadPackageData()
    }
  }, [auth.user])

  const loadPackageData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      if (!auth.user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view your packages.",
          variant: "destructive",
        })
        return
      }

      // Get member profile
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', auth.user.id)
        .single()

      if (memberError || !memberData) {
        toast({
          title: "Member Profile Not Found",
          description: "Please contact admin to set up your member profile.",
          variant: "destructive",
        })
        return
      }

      setCurrentMemberId(memberData.id)

      // Load member's current packages
      const { data: memberPackagesData, error: memberPackagesError } = await supabase
        .from('member_packages')
        .select(`
          id,
          sessions_remaining,
          sessions_total,
          start_date,
          end_date,
          status,
          packages (
            id,
            name,
            package_type,
            session_count
          )
        `)
        .eq('member_id', memberData.id)
        .in('status', ['active', 'expired'])
        .order('start_date', { ascending: false })

      if (memberPackagesError) {
        console.error("Error loading member packages:", memberPackagesError)
      } else {
        const transformedCurrentPackages = (memberPackagesData || []).map(pkg => ({
          id: pkg.id,
          name: pkg.packages?.name || 'Unknown Package',
          remaining: pkg.sessions_remaining || 0,
          total: pkg.sessions_total || pkg.packages?.session_count || 0,
          expiry: new Date(pkg.end_date).toLocaleDateString(),
          status: pkg.status
        }))
        setCurrentPackages(transformedCurrentPackages)
      }

      // Load all available packages for requesting
      const { data: packagesData, error: packagesError } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (packagesError) {
        console.error("Error loading available packages:", packagesError)
      } else {
        const transformedAvailablePackages = (packagesData || []).map(pkg => ({
          id: pkg.id,
          name: pkg.name,
          sessions: pkg.session_count,
          price: pkg.price,
          description: pkg.description || 'No description available',
          packageType: pkg.package_type
        }))
        setAvailablePackages(transformedAvailablePackages)
      }

    } catch (error) {
      console.error("Error loading package data:", error)
      toast({
        title: "Error Loading Packages",
        description: "Failed to load package data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitRequest = async () => {
    if (!selectedPackage) {
      toast({
        title: "Package Required",
        description: "Please select a package to request.",
        variant: "destructive",
      })
      return
    }

    if (!currentMemberId) {
      toast({
        title: "Authentication Required",
        description: "Please log in to submit a package request.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createClient()
      const packageDetails = availablePackages.find((pkg) => pkg.id === selectedPackage)

      if (!packageDetails) {
        throw new Error("Package not found")
      }

      // Create package request in the database
      const { data: requestData, error: requestError } = await supabase
        .from('package_requests')
        .insert({
          member_id: currentMemberId,
          package_id: selectedPackage,
          notes: requestNote || null,
          status: 'pending',
          requested_at: new Date().toISOString()
        })
        .select()
        .single()

      if (requestError) {
        throw requestError
      }

      // Create notification for admin
      const memberName = auth.userProfile?.full_name || auth.user?.user_metadata?.full_name || auth.user?.email?.split('@')[0] || "Member"
      
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: null, // Admin notification (no specific user)
          title: 'New Package Request',
          message: `${memberName} has requested a ${packageDetails.name} package.${requestNote ? ` Note: ${requestNote}` : ''}`,
          type: 'package_request',
          is_read: false,
          created_at: new Date().toISOString(),
          metadata: {
            member_id: currentMemberId,
            member_name: memberName,
            package_id: selectedPackage,
            package_name: packageDetails.name,
            package_price: packageDetails.price,
            package_sessions: packageDetails.sessions,
            request_id: requestData.id
          }
        })

      if (notificationError) {
        console.error("Error creating notification:", notificationError)
        // Don't fail the whole request if notification fails
      }

      toast({
        title: "Request Submitted",
        description: `Your request for the ${packageDetails.name} package has been sent to the admin.`,
      })

      setSelectedPackage("")
      setRequestNote("")
    } catch (error) {
      console.error("Error submitting package request:", error)
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Manage Packages</h1>
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
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
          {currentPackages.length > 0 ? (
            <div className="space-y-4">
              {currentPackages.map((pkg) => (
                <div key={pkg.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{pkg.name}</h3>
                      {pkg.status === 'expired' && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Expired</span>
                      )}
                    </div>
                    <span className={`text-sm font-medium ${pkg.remaining === 0 ? "text-red-500" : ""}`}>
                      {pkg.remaining}/{pkg.total} sessions remaining
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Expires: {pkg.expiry}</p>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${pkg.status === 'expired' ? 'bg-red-500' : 'bg-primary'}`}
                      style={{ width: `${(pkg.remaining / pkg.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Packages Yet</h3>
              <p className="text-muted-foreground">
                You don't have any packages yet. Request a package below to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request New Package</CardTitle>
          <CardDescription>Submit a request to add a new package to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {availablePackages.length > 0 ? (
            <>
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
            </>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Packages Available</h3>
              <p className="text-muted-foreground">
                There are currently no packages available for request. Please contact admin for more information.
              </p>
            </div>
          )}
        </CardContent>
        {availablePackages.length > 0 && (
          <CardFooter>
            <Button className="w-full" onClick={handleSubmitRequest} disabled={!selectedPackage || isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </CardFooter>
        )}
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
