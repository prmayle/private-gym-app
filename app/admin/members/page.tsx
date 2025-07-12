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

  const loadMembers = () => {
    try {
      setIsLoading(true)
      const storedMembers = JSON.parse(localStorage.getItem("gym-members") || "[]")

      // Default members with normalized status
      const defaultMembers = [
        {
          id: "1",
          name: "John Doe",
          email: "john.doe@email.com",
          phone: "+1234567890",
          joinDate: "2023-01-15",
          status: "Active",
          packages: ["Personal Training", "Group Class"],
          lastActivity: "2023-06-10",
        },
        {
          id: "2",
          name: "Jane Smith",
          email: "jane.smith@email.com",
          phone: "+1234567891",
          joinDate: "2023-02-20",
          status: "Active",
          packages: ["Personal Training"],
          lastActivity: "2023-06-08",
        },
        {
          id: "3",
          name: "Michael Johnson",
          email: "michael.johnson@email.com",
          phone: "+1234567892",
          joinDate: "2023-03-10",
          status: "Inactive",
          packages: ["Group Class"],
          lastActivity: "2023-05-15",
        },
        {
          id: "4",
          name: "Emily Williams",
          email: "emily.williams@email.com",
          phone: "+1234567893",
          joinDate: "2023-04-05",
          status: "Active",
          packages: ["Personal Training", "Group Class"],
          lastActivity: "2023-06-12",
        },
        {
          id: "5",
          name: "Robert Brown",
          email: "robert.brown@email.com",
          phone: "+1234567894",
          joinDate: "2023-05-12",
          status: "Active",
          packages: ["Group Class"],
          lastActivity: "2023-06-11",
        },
      ]

      // Normalize status for all members
      const normalizedMembers = [...storedMembers, ...defaultMembers].map((member) => ({
        ...member,
        status: normalizeStatus(member.status),
      }))

      setMembers(normalizedMembers)
    } catch (error) {
      console.error("Error loading members:", error)
      toast({
        title: "Error Loading Members",
        description: "Failed to load member data.",
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
      const normalizedStatus = normalizeStatus(newStatus)

      const updatedMembers = members.map((member) => {
        if (member.id === memberId) {
          return { ...member, status: normalizedStatus }
        }
        return member
      })

      setMembers(updatedMembers)

      // Update localStorage
      const storedMembers = updatedMembers.filter((member) => !["1", "2", "3", "4", "5"].includes(member.id))
      localStorage.setItem("gym-members", JSON.stringify(storedMembers))

      // Log activity
      const memberInfo = members.find((member) => member.id === memberId)
      const activities = JSON.parse(localStorage.getItem("admin-activities") || "[]")
      activities.unshift({
        id: `activity-${Date.now()}`,
        type: "member_status_updated",
        message: `${memberInfo.name} status updated to ${normalizedStatus}`,
        timestamp: new Date().toISOString(),
        memberId: memberInfo.id,
        memberName: memberInfo.name,
      })
      localStorage.setItem("admin-activities", JSON.stringify(activities.slice(0, 50)))

      toast({
        title: "Member Status Updated",
        description: `${memberInfo.name} has been marked as ${normalizedStatus}.`,
      })
    } catch (error) {
      console.error("Error updating member status:", error)
      toast({
        title: "Update Failed",
        description: "Failed to update member status.",
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
