"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Check, X } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function RemovePackagePage({ params }) {
  const router = useRouter()
  const { id } = params
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    // Fetch member data
    const fetchMember = () => {
      setLoading(true)
      try {
        // In a real app, this would be an API call
        // For now, we'll use mock data
        const mockMember = {
          id,
          name: "John Doe",
          email: "john.doe@example.com",
          phone: "+1 234 567 890",
          status: "Active",
          joinDate: "2023-01-15",
          packages: [
            {
              id: "pkg1",
              name: "Personal Training",
              sessions: 10,
              remaining: 6,
              expiryDate: "2023-12-31",
              type: "Personal",
            },
            {
              id: "pkg2",
              name: "Group Classes",
              sessions: 20,
              remaining: 15,
              expiryDate: "2023-12-31",
              type: "Group",
            },
            {
              id: "pkg3",
              name: "Nutrition Consultation",
              sessions: 5,
              remaining: 4,
              expiryDate: "2023-12-31",
              type: "Nutrition",
            },
          ],
        }

        // Check if we have this member in localStorage
        const storedMembers = JSON.parse(localStorage.getItem("gym-members") || "[]")
        const storedMember = storedMembers.find((m) => m.id === id)

        if (storedMember) {
          // If the member exists in localStorage, use that data
          setMember({
            ...storedMember,
            packages: storedMember.packages || mockMember.packages, // Use mock packages if none exist
          })
        } else {
          // Otherwise use mock data
          setMember(mockMember)
        }

        setLoading(false)
      } catch (err) {
        setError("Failed to load member data")
        setLoading(false)
      }
    }

    fetchMember()
  }, [id])

  const handleRemovePackage = (packageId) => {
    if (confirm("Are you sure you want to remove this package?")) {
      // In a real app, this would be an API call
      // For now, we'll update the local state
      const updatedPackages = member.packages.filter((pkg) => pkg.id !== packageId)

      // Update member in state
      setMember({
        ...member,
        packages: updatedPackages,
      })

      // Update member in localStorage if they exist there
      const storedMembers = JSON.parse(localStorage.getItem("gym-members") || "[]")
      const memberIndex = storedMembers.findIndex((m) => m.id === id)

      if (memberIndex !== -1) {
        storedMembers[memberIndex] = {
          ...storedMembers[memberIndex],
          packages: updatedPackages,
        }
        localStorage.setItem("gym-members", JSON.stringify(storedMembers))
      }

      setSuccessMessage("Package removed successfully")

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("")
      }, 3000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading member data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link href="/admin/members">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to Members</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Remove Package</h1>
      </div>

      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Member Details</CardTitle>
          <CardDescription>Review member information before removing packages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p>{member.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p>{member.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Phone</p>
              <p>{member.phone}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={member.status === "Active" ? "default" : "secondary"}>{member.status}</Badge>
            </div>
          </div>

          <h3 className="text-lg font-medium mb-4">Current Packages</h3>
          {member.packages && member.packages.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Remaining Sessions</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {member.packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">{pkg.name}</TableCell>
                    <TableCell>{pkg.type}</TableCell>
                    <TableCell>
                      {pkg.remaining}/{pkg.sessions}
                    </TableCell>
                    <TableCell>{pkg.expiryDate}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="destructive" size="sm" onClick={() => handleRemovePackage(pkg.id)}>
                        <X className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4 border rounded-md">
              <p className="text-muted-foreground">No packages found for this member</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" asChild>
            <Link href="/admin/members">Cancel</Link>
          </Button>
          <Button asChild>
            <Link href={`/admin/members/${id}/add-package`}>Add New Package</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
