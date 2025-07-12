"use client"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Mail, Phone, Calendar } from "lucide-react"

// Mock session data with members
const mockSessionMembers = {
  "1": {
    sessionType: "Personal Training",
    trainer: "Mike Johnson",
    date: "2023-06-20",
    time: "10:00 AM - 11:00 AM",
    members: [
      {
        id: "1",
        name: "John Doe",
        email: "john.doe@example.com",
        phone: "+1 234 567 890",
        joinDate: "2023-01-15",
        membershipType: "Premium",
        status: "Active",
      },
    ],
  },
  "2": {
    sessionType: "Group Class",
    trainer: "Sarah Williams",
    date: "2023-06-19",
    time: "11:00 AM - 12:00 PM",
    members: [
      {
        id: "2",
        name: "Jane Smith",
        email: "jane.smith@example.com",
        phone: "+1 234 567 891",
        joinDate: "2023-02-20",
        membershipType: "Standard",
        status: "Active",
      },
      {
        id: "3",
        name: "Michael Brown",
        email: "michael.brown@example.com",
        phone: "+1 234 567 892",
        joinDate: "2023-03-10",
        membershipType: "Basic",
        status: "Active",
      },
      {
        id: "4",
        name: "Emily Davis",
        email: "emily.davis@example.com",
        phone: "+1 234 567 893",
        joinDate: "2023-04-05",
        membershipType: "Premium",
        status: "Active",
      },
    ],
  },
}

export default function SessionMembersPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

  const sessionData = mockSessionMembers[sessionId]

  if (!sessionData) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Session Not Found</h1>
          <Button onClick={() => router.back()}>Go Back</Button>
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
        <h1 className="text-2xl font-bold">Session Members</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{sessionData.sessionType} - Members List</CardTitle>
          <CardDescription>
            {sessionData.trainer} • {sessionData.date} • {sessionData.time}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">Total Members: {sessionData.members.length}</p>
          </div>

          {sessionData.members.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden md:table-cell">Phone</TableHead>
                    <TableHead className="hidden md:table-cell">Membership</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Join Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionData.members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center">
                          <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                          {member.email}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center">
                          <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                          {member.phone}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">{member.membershipType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.status === "Active" ? "default" : "secondary"}>{member.status}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          {member.joinDate}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No members registered for this session yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
