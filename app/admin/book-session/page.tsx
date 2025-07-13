"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/utils/supabase/client"
import { ArrowLeft, Search, Users, UserCheck, ChevronRight } from "lucide-react"

interface Member {
  id: string
  name: string
  email: string
  phone: string
  status: string
  packages: any[]
  joinDate: string
  lastActivity: string
}

export default function AdminBookSessionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMembers()
  }, [])

  useEffect(() => {
    filterMembers()
  }, [members, searchQuery])

  const loadMembers = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Load members with their profile information and packages
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select(`
          id,
          user_id,
          joined_at,
          membership_status,
          profiles (
            id,
            email,
            full_name,
            phone
          )
        `)
        .eq('membership_status', 'active')
        .order('joined_at', { ascending: false })

      if (membersError) {
        throw membersError
      }

      // Load member packages to get current packages for each member
      const { data: memberPackagesData, error: packagesError } = await supabase
        .from('member_packages')
        .select(`
          id,
          member_id,
          sessions_remaining,
          status,
          start_date,
          end_date,
          packages (
            id,
            name,
            package_type,
            session_count
          )
        `)
        .eq('status', 'active')
        .gt('sessions_remaining', 0)

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

      // Process and transform the data
      const processedMembers: Member[] = (membersData || [])
        .map(member => {
          // Get packages for this member
          const memberPackages = (memberPackagesData || [])
            .filter(mp => mp.member_id === member.id)
            .map(mp => ({
              id: mp.id,
              name: (mp.packages as any)?.name || 'Unknown Package',
              sessions: (mp.packages as any)?.session_count || 0,
              remaining: mp.sessions_remaining || 0,
              expiryDate: mp.end_date,
              type: (mp.packages as any)?.package_type || 'Unknown'
            }))

          // Get last activity for this member
          const memberBookings = (bookingsData || [])
            .filter(b => b.member_id === member.id)
            .sort((a, b) => new Date(b.booking_time).getTime() - new Date(a.booking_time).getTime())
          
          const lastActivity = memberBookings.length > 0 
            ? memberBookings[0].booking_time
            : member.joined_at

          return {
            id: member.id,
            name: (member.profiles as any)?.full_name || 'No Name',
            email: (member.profiles as any)?.email || 'No Email',
            phone: (member.profiles as any)?.phone || 'No Phone',
            joinDate: member.joined_at,
            status: 'Active',
            packages: memberPackages,
            lastActivity: lastActivity
          }
        })
        .filter(member => {
          // Only show members who have packages with remaining sessions
          const hasAvailablePackages = member.packages?.some((pkg: any) => {
            const remaining = pkg.remaining || 0
            return remaining > 0
          })
          return hasAvailablePackages
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
      setLoading(false)
    }
  }

  const filterMembers = () => {
    if (!searchQuery) {
      setFilteredMembers(members)
      return
    }

    const filtered = members.filter(
      (member) =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.phone.includes(searchQuery),
    )

    setFilteredMembers(filtered)
  }

  const handleSelectMember = (member: Member) => {
    // Navigate to session selection with the selected member
    router.push(
      `/admin/book-session/select-session?memberId=${member.id}&memberName=${encodeURIComponent(member.name)}`,
    )
  }

  const getAvailablePackagesCount = (member: Member) => {
    if (!member.packages) return 0
    return member.packages.filter((pkg: any) => {
      const remaining = typeof pkg === "object" && pkg.remaining ? pkg.remaining : 0
      return remaining > 0
    }).length
  }

  const getTotalRemainingSessions = (member: Member) => {
    if (!member.packages) return 0
    return member.packages.reduce((total: number, pkg: any) => {
      const remaining = typeof pkg === "object" && pkg.remaining ? pkg.remaining : 0
      return total + remaining
    }, 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link href="/admin">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to Dashboard</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Book Session for Member</h1>
          <p className="text-muted-foreground">Step 1: Select a member to book a session for</p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find Member
          </CardTitle>
          <CardDescription>Search for an active member with available sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Members with Available Sessions ({filteredMembers.length})
          </CardTitle>
          <CardDescription>Select a member to proceed with booking a session</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Loading members...</p>
            </div>
          )}

          {!loading && filteredMembers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">
                {searchQuery ? "No members found matching your search." : "No active members with available sessions."}
              </p>
              {searchQuery && (
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              )}
            </div>
          )}

          {!loading && filteredMembers.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Available Packages</TableHead>
                    <TableHead>Total Sessions Left</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              <UserCheck className="h-3 w-3 mr-1" />
                              {member.status}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{member.email}</div>
                          <div className="text-muted-foreground">{member.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {member.packages?.map((pkg: any, index: number) => {
                            const remaining = typeof pkg === "object" && pkg.remaining ? pkg.remaining : 0
                            const name = typeof pkg === "object" && pkg.name ? pkg.name : pkg
                            if (remaining <= 0) return null
                            return (
                              <div key={index} className="text-xs">
                                <span className="font-medium">{name}</span>
                                <span className="text-muted-foreground ml-1">({remaining} left)</span>
                              </div>
                            )
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <span className="text-lg font-semibold text-green-600">
                            {getTotalRemainingSessions(member)}
                          </span>
                          <div className="text-xs text-muted-foreground">sessions</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {new Date(member.lastActivity).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button onClick={() => handleSelectMember(member)} className="flex items-center gap-2">
                          Select Member
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
