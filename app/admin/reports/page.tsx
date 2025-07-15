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
import { createClient } from "@/utils/supabase/client"
import { useAuth } from "@/contexts/AuthContext"

const REPORT_TYPES = [
  { value: "revenue-per-package", label: "Revenue per Package", icon: Package },
  { value: "sessions-by-status", label: "Sessions by Status", icon: Calendar },
  { value: "income-per-date", label: "Income per Date", icon: DollarSign },
  { value: "income-per-member", label: "Income per Member", icon: Users },
  { value: "attendance-per-session", label: "Attendance per Session", icon: FileText },
]

const SESSION_STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
]

interface Member {
  id: string
  name: string
  email: string
}

interface Package {
  id: string
  name: string
  package_type: string
}

interface ReportData {
  [key: string]: any
}

interface FormData {
  reportType: string
  startDate: string
  endDate: string
  packageFilter: string
  memberFilter: string
  sessionStatus: string
  emailAddress: string
  notes: string
}

export default function ReportsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const auth = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [packages, setPackages] = useState<Package[]>([])

  const [formData, setFormData] = useState<FormData>({
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
    if (!auth.user) {
      router.push("/login")
      return
    }
    setFormData((prev) => ({ ...prev, emailAddress: auth.user?.email || '' }))

    // Load data for filters
    loadFilterData()
  }, [router, auth.user])

  const loadFilterData = async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()

      // Load members with profiles
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select(`
          id,
          user_id,
          membership_status,
          profiles (
            full_name,
            email
          )
        `)
        .eq('membership_status', 'active')
        .order('joined_at', { ascending: false })

      if (membersError) {
        console.error('Error loading members:', membersError)
      } else {
        const transformedMembers: Member[] = (membersData || []).map(member => ({
          id: member.id,
          name: (member.profiles as any)?.full_name || `Member ${member.id}`,
          email: (member.profiles as any)?.email || 'No email'
        }))
        setMembers(transformedMembers)
      }

      // Load packages
      const { data: packagesData, error: packagesError } = await supabase
        .from('packages')
        .select('id, name, package_type')
        .eq('is_active', true)

      if (packagesError) {
        console.error('Error loading packages:', packagesError)
      } else {
        const transformedPackages: Package[] = (packagesData || []).map(pkg => ({
          id: pkg.id,
          name: pkg.name,
          package_type: pkg.package_type
        }))
        setPackages(transformedPackages)
      }

    } catch (error) {
      console.error('Error loading filter data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
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
      // Generate the report using Supabase data
      const reportData = await generateReportFromDatabase(formData)

      // Save report to database
      await saveReportToDatabase(reportData, formData)

      toast({
        title: "Report Generated Successfully",
        description: `Report has been generated and will be sent to ${formData.emailAddress}`,
      })

      // Reset form
      setFormData({
        reportType: "",
        startDate: "",
        endDate: "",
        packageFilter: "all",
        memberFilter: "all",
        sessionStatus: "all",
        emailAddress: auth.user?.email || "",
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

  const generateReportFromDatabase = async (formData: FormData): Promise<ReportData> => {
    const supabase = createClient()
    const { reportType, startDate, endDate, packageFilter, memberFilter, sessionStatus } = formData

    switch (reportType) {
      case 'revenue-per-package':
        return await generateRevenuePerPackageReport(supabase, startDate, endDate)
      case 'sessions-by-status':
        return await generateSessionsByStatusReport(supabase, startDate, endDate)
      case 'income-per-date':
        return await generateIncomePerDateReport(supabase, startDate, endDate)
      case 'income-per-member':
        return await generateIncomePerMemberReport(supabase, startDate, endDate)
      case 'attendance-per-session':
        return await generateAttendancePerSessionReport(supabase, startDate, endDate)
      default:
        throw new Error('Invalid report type')
    }
  }

  const generateRevenuePerPackageReport = async (supabase: any, startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('member_packages')
      .select(`
        price,
        packages (name, package_type)
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (error) throw error

    const revenue: { [key: string]: number } = {}
    data.forEach((mp: any) => {
      const packageName = mp.packages?.name || 'Unknown'
      revenue[packageName] = (revenue[packageName] || 0) + (mp.price || 0)
    })

    return { revenue, totalRevenue: Object.values(revenue).reduce((a: number, b: number) => a + b, 0) }
  }

  const generateSessionsByStatusReport = async (supabase: any, startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('sessions')
      .select('status')
      .gte('start_time', startDate)
      .lte('start_time', endDate)

    if (error) throw error

    const statusCounts: { [key: string]: number } = {}
    data.forEach((session: any) => {
      statusCounts[session.status] = (statusCounts[session.status] || 0) + 1
    })

    return { statusCounts, totalSessions: data.length }
  }

  const generateIncomePerDateReport = async (supabase: any, startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('member_packages')
      .select('price, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at')

    if (error) throw error

    const dailyIncome: { [key: string]: number } = {}
    data.forEach((mp: any) => {
      const date = new Date(mp.created_at).toISOString().split('T')[0]
      dailyIncome[date] = (dailyIncome[date] || 0) + (mp.price || 0)
    })

    return { dailyIncome, totalIncome: Object.values(dailyIncome).reduce((a: number, b: number) => a + b, 0) }
  }

  const generateIncomePerMemberReport = async (supabase: any, startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('member_packages')
      .select(`
        price,
        member_id,
        members (
          profiles (
            full_name
          )
        )
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (error) throw error

    const memberIncome: { [key: string]: number } = {}
    data.forEach((mp: any) => {
      const memberName = (mp.members as any)?.profiles?.full_name || 'Unknown Member'
      memberIncome[memberName] = (memberIncome[memberName] || 0) + (mp.price || 0)
    })

    return { memberIncome, totalIncome: Object.values(memberIncome).reduce((a: number, b: number) => a + b, 0) }
  }

  const generateAttendancePerSessionReport = async (supabase: any, startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        id,
        title,
        start_time,
        max_capacity,
        current_bookings,
        bookings (attended)
      `)
      .gte('start_time', startDate)
      .lte('start_time', endDate)

    if (error) throw error

    const attendanceData = data.map((session: any) => {
      const attendedCount = session.bookings?.filter((b: any) => b.attended).length || 0
      const attendanceRate = session.current_bookings > 0 ? (attendedCount / session.current_bookings) * 100 : 0
      
      return {
        sessionTitle: session.title,
        date: new Date(session.start_time).toISOString().split('T')[0],
        capacity: session.max_capacity,
        booked: session.current_bookings,
        attended: attendedCount,
        attendanceRate: Math.round(attendanceRate * 100) / 100
      }
    })

    return { attendanceData, totalSessions: data.length }
  }

  const saveReportToDatabase = async (reportData: ReportData, formData: FormData) => {
    const supabase = createClient()
    
    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          type: formData.reportType,
          start_date: formData.startDate,
          end_date: formData.endDate,
          sent_to: formData.emailAddress,
          filters: {
            package: formData.packageFilter,
            member: formData.memberFilter,
            sessionStatus: formData.sessionStatus,
          },
          notes: formData.notes,
          data: reportData,
          created_by: auth.user?.id
        })

      if (error) {
        console.error('Error saving report:', error)
      }
    } catch (error) {
      console.error('Error saving report to database:', error)
    }
  }

  if (!auth.user) {
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