"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { TableStatusBadge } from "@/components/ui/status-badge"
import { StatusFilter } from "@/components/ui/status-filter"
import { normalizeStatus, isActiveStatus } from "@/types/status"
import { createClient } from "@/utils/supabase/client"
import {
  ArrowLeft,
  Search,
  MoreHorizontal,
  UserPlus,
  Edit,
  Package,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  UserX,
} from "lucide-react"

export default function MembersPage() {
  const { toast } = useToast()
  const [members, setMembers] = useState([])
  const [filteredMembers, setFilteredMembers] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const itemsPerPage = 10

  useEffect(() => {
    loadMembers()
  }, [])

  useEffect(() => {
    filterMembers()
  }, [members, searchQuery, statusFilter])

  const loadMembers = async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()

      // Load members with their profile information and packages
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select(`
          id,
          user_id,
          emergency_contact,
          medical_conditions,
          date_of_birth,
          gender,
          address,
          height,
          weight,
          profile_photo_url,
          joined_at,
          membership_status,
          member_number,
          fitness_goals,
          waiver_signed,
          profiles (
            id,
            email,
            full_name,
            phone,
            avatar_url,
            last_login_at
          )
        `)
        .order('joined_at', { ascending: false })

      if (membersError) {
        throw membersError
      }

      // Load member packages to get current packages for each member
      const { data: memberPackagesData, error: packagesError } = await supabase
        .from('member_packages')
        .select(`
          member_id,
          status,
          packages (
            id,
            name,
            package_type
          )
        `)
        .eq('status', 'active')

      if (packagesError) {
        console.error("Error loading member packages:", packagesError)
      }

      // Load recent bookings to determine last activity
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('member_id, booking_time, attended')
        .order('booking_time', { ascending: false })

      if (bookingsError) {
        console.error("Error loading bookings:", bookingsError)
      }

      // Process and transform the data to match the expected format
      const processedMembers = (membersData || []).map(member => {
        // Get packages for this member
        const memberPackages = (memberPackagesData || [])
          .filter(mp => mp.member_id === member.id)
          .map(mp => mp.packages?.name || 'Unknown Package')

        // Get last activity for this member
        const memberBookings = (bookingsData || [])
          .filter(b => b.member_id === member.id)
          .sort((a, b) => new Date(b.booking_time).getTime() - new Date(a.booking_time).getTime())
        
        const lastActivity = memberBookings.length > 0 
          ? memberBookings[0].booking_time
          : member.joined_at

        return {
          id: member.id,
          name: member.profiles?.full_name || 'No Name',
          email: member.profiles?.email || 'No Email',
          phone: member.profiles?.phone || 'No Phone',
          joinDate: member.joined_at,
          status: normalizeStatus(member.membership_status || 'inactive'),
          packages: memberPackages,
          lastActivity: lastActivity,
          memberNumber: member.member_number,
          profilePhoto: member.profile_photo_url || member.profiles?.avatar_url,
          emergencyContact: member.emergency_contact,
          medicalConditions: member.medical_conditions,
          dateOfBirth: member.date_of_birth,
          gender: member.gender,
          address: member.address,
          height: member.height,
          weight: member.weight,
          fitnessGoals: member.fitness_goals,
          waiverSigned: member.waiver_signed,
          userId: member.user_id
        }
      })

      setMembers(processedMembers)
    } catch (error) {
      console.error("Error loading members:", error)
      toast({
        title: "Error Loading Members",
        description: "Failed to load member data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filterMembers = () => {
    let filtered = members

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (member) =>
          member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.phone.includes(searchQuery),
      )
    }

    // Status filter using normalized values
    if (statusFilter !== "all") {
      const targetStatus = statusFilter === "active" ? "Active" : "Inactive"
      filtered = filtered.filter((member) => member.status === targetStatus)
    }

    setFilteredMembers(filtered)
    setCurrentPage(1)
  }

  const updateMemberStatus = async (memberId, newStatus) => {
    try {
      setIsLoading(true)
      const supabase = createClient()
      const normalizedStatus = normalizeStatus(newStatus)
      const dbStatus = normalizedStatus.toLowerCase() // Convert to database format

      // Update member status in database
      const { error } = await supabase
        .from('members')
        .update({ 
          membership_status: dbStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId)

      if (error) {
        throw error
      }

      // Update local state
      const updatedMembers = members.map((member) => {
        if (member.id === memberId) {
          return { ...member, status: normalizedStatus }
        }
        return member
      })

      setMembers(updatedMembers)

      // Log activity in notifications table
      const memberInfo = members.find((member) => member.id === memberId)
      if (memberInfo) {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: memberInfo.userId,
            title: 'Membership Status Updated',
            message: `Your membership status has been updated to ${normalizedStatus}`,
            type: 'system',
            is_read: false,
            metadata: {
              previous_status: memberInfo.status,
              new_status: normalizedStatus,
              updated_by: 'admin'
            }
          })

        if (notificationError) {
          console.error("Error creating notification:", notificationError)
        }
      }

      toast({
        title: "Member Status Updated",
        description: `${memberInfo?.name} has been marked as ${normalizedStatus}.`,
      })
    } catch (error) {
      console.error("Error updating member status:", error)
      toast({
        title: "Update Failed",
        description: "Failed to update member status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate statistics with normalized status
  const stats = {
    totalMembers: members.length,
    activeMembers: members.filter((member) => isActiveStatus(member.status)).length,
    inactiveMembers: members.filter((member) => !isActiveStatus(member.status)).length,
  }

  // Pagination
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedMembers = filteredMembers.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" asChild className="mr-2">
            <Link href="/admin/dashboard">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back to Dashboard</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Member Management</h1>
        </div>
        <Button asChild>
          <Link href="/admin/members/new">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Member
          </Link>
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Members</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.inactiveMembers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Members</CardTitle>
          <CardDescription>Manage gym members and their information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <StatusFilter
              value={statusFilter}
              onValueChange={setStatusFilter}
              className="w-[180px]"
              disabled={isLoading}
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Packages</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{member.phone}</TableCell>
                    <TableCell>{new Date(member.joinDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <TableStatusBadge status={member.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {member.packages?.map((pkg: any, index: number) => {
                          const label =
                            typeof pkg === "string"
                              ? pkg
                              : // Support object shape { name: string, ... }
                                typeof pkg?.name === "string"
                                ? pkg.name
                                : JSON.stringify(pkg) // Fallback for unexpected shapes
                          return (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                            >
                              {label}
                            </span>
                          )
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={isLoading}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/members/${member.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Member
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/members/${member.id}/add-package`}>
                              <Package className="mr-2 h-4 w-4" />
                              Manage Packages
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/members/${member.id}/body-composition`}>
                              <BarChart3 className="mr-2 h-4 w-4" />
                              Body Composition
                            </Link>
                          </DropdownMenuItem>
                          {isActiveStatus(member.status) ? (
                            <DropdownMenuItem
                              onClick={() => updateMemberStatus(member.id, "Inactive")}
                              className="text-red-600"
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => updateMemberStatus(member.id, "Active")}
                              className="text-green-600"
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              Activate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {filteredMembers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No members found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
