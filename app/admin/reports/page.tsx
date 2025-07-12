"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Download, Mail, FileText, Calendar, Users, Package, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { getCurrentUser } from "@/utils/auth"
import { generateReport } from "@/utils/reports"

const REPORT_TYPES = [
  { value: "revenue-per-package", label: "Revenue per Package", icon: Package },
  { value: "sessions-by-status", label: "Sessions by Status", icon: Calendar },
  { value: "income-per-date", label: "Income per Date", icon: DollarSign },
  { value: "income-per-member", label: "Income per Member", icon: Users },
  { value: "attendance-per-session", label: "Attendance per Session", icon: FileText },
]

const SESSION_STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
  { value: "Full", label: "Full" },
]

export default function ReportsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [members, setMembers] = useState([])
  const [packages, setPackages] = useState([])

  const [formData, setFormData] = useState({
    reportType: "",
    startDate: "",
    endDate: "",
    packageFilter: "all",
    memberFilter: "all",
    sessionStatus: "all",
    emailAddress: "",
    notes: "",
  })

  useEffect(() => {
    // Check authentication
    const user = getCurrentUser()
    if (!user || user.role !== "admin") {
      router.push("/login")
      return
    }
    setCurrentUser(user)
    setFormData((prev) => ({ ...prev, emailAddress: user.email }))

    // Load data for filters
    loadFilterData()
  }, [router])

  const loadFilterData = () => {
    try {
      // Load members
      const storedMembers = JSON.parse(localStorage.getItem("gym-members") || "[]")
      const defaultMembers = [
        { id: "1", name: "John Doe", email: "john@example.com" },
        { id: "2", name: "Jane Smith", email: "jane@example.com" },
        { id: "3", name: "Michael Johnson", email: "michael@example.com" },
        { id: "4", name: "Emily Williams", email: "emily@example.com" },
        { id: "5", name: "Robert Brown", email: "robert@example.com" },
      ]
      const allMembers = storedMembers.length > 0 ? [...storedMembers, ...defaultMembers] : defaultMembers
      setMembers(allMembers)

      // Load packages
      const packageTypes = [
        { id: "personal-training", name: "Personal Training" },
        { id: "group-class", name: "Group Class" },
        { id: "nutrition-consultation", name: "Nutrition Consultation" },
        { id: "fitness-assessment", name: "Fitness Assessment" },
      ]
      setPackages(packageTypes)
    } catch (error) {
      console.error("Error loading filter data:", error)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.reportType) {
      toast({
        title: "Error",
        description: "Please select a report type",
        variant: "destructive",
      })
      return
    }

    if (!formData.startDate || !formData.endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      })
      return
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast({
        title: "Error",
        description: "Start date must be before end date",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Generate the report
      const reportData = await generateReport(formData)

      // Simulate email sending (in a real app, this would be a server action)
      await simulateEmailSending(reportData, formData)

      toast({
        title: "Report Generated Successfully",
        description: `Report has been generated and sent to ${formData.emailAddress}`,
      })

      // Reset form
      setFormData({
        reportType: "",
        startDate: "",
        endDate: "",
        packageFilter: "all",
        memberFilter: "all",
        sessionStatus: "all",
        emailAddress: currentUser?.email || "",
        notes: "",
      })
    } catch (error) {
      console.error("Error generating report:", error)
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const simulateEmailSending = async (reportData, formData) => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // In a real application, this would send the email via an API route
    console.log("Report would be sent to:", formData.emailAddress)
    console.log("Report data:", reportData)

    // Store the report in localStorage for demo purposes
    const reports = JSON.parse(localStorage.getItem("admin-reports") || "[]")
    const newReport = {
      id: Date.now().toString(),
      type: formData.reportType,
      dateRange: `${formData.startDate} to ${formData.endDate}`,
      generatedAt: new Date().toISOString(),
      sentTo: formData.emailAddress,
      filters: {
        package: formData.packageFilter,
        member: formData.memberFilter,
        sessionStatus: formData.sessionStatus,
      },
      notes: formData.notes,
      data: reportData,
    }

    reports.unshift(newReport)
    localStorage.setItem("admin-reports", JSON.stringify(reports.slice(0, 50))) // Keep last 50 reports
  }

  const getReportTypeIcon = (reportType) => {
    const type = REPORT_TYPES.find((t) => t.value === reportType)
    return type ? type.icon : FileText
  }

  if (!currentUser) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Generate and export gym reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Generate Report</CardTitle>
              <CardDescription>Select report parameters and filters to generate a comprehensive report</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Report Type */}
                <div className="space-y-2">
                  <Label htmlFor="reportType">Report Type *</Label>
                  <Select value={formData.reportType} onValueChange={(value) => handleInputChange("reportType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_TYPES.map((type) => {
                        const Icon = type.icon
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange("startDate", e.target.value)}
                      max={formData.endDate || undefined}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange("endDate", e.target.value)}
                      min={formData.startDate || undefined}
                    />
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="packageFilter">Package Filter</Label>
                    <Select
                      value={formData.packageFilter}
                      onValueChange={(value) => handleInputChange("packageFilter", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Packages</SelectItem>
                        {packages.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="memberFilter">Member Filter</Label>
                    <Select
                      value={formData.memberFilter}
                      onValueChange={(value) => handleInputChange("memberFilter", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Members</SelectItem>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sessionStatus">Session Status</Label>
                    <Select
                      value={formData.sessionStatus}
                      onValueChange={(value) => handleInputChange("sessionStatus", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SESSION_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-2">
                  <Label htmlFor="emailAddress">Email Address *</Label>
                  <Input
                    id="emailAddress"
                    type="email"
                    value={formData.emailAddress}
                    onChange={(e) => handleInputChange("emailAddress", e.target.value)}
                    placeholder="Enter email address to receive the report"
                    required
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="Add any additional notes or comments about this report..."
                    rows={3}
                  />
                </div>

                {/* Submit Button */}
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Generating Report...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Generate & Send Report
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Report Types Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Reports</CardTitle>
              <CardDescription>Overview of report types and their contents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {REPORT_TYPES.map((type) => {
                const Icon = type.icon
                return (
                  <div key={type.value} className="flex items-start gap-3 p-3 border rounded-lg">
                    <Icon className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium">{type.label}</h4>
                      <p className="text-sm text-muted-foreground">
                        {type.value === "revenue-per-package" && "Breakdown of revenue generated by each package type"}
                        {type.value === "sessions-by-status" && "Analysis of sessions grouped by their current status"}
                        {type.value === "income-per-date" && "Daily income tracking over the selected date range"}
                        {type.value === "income-per-member" && "Revenue contribution from each individual member"}
                        {type.value === "attendance-per-session" &&
                          "Attendance rates and patterns for training sessions"}
                      </p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Report Delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Download className="h-4 w-4 text-primary" />
                <span>Excel format (.xlsx)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-primary" />
                <span>Sent via email attachment</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-primary" />
                <span>Includes charts and summaries</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
