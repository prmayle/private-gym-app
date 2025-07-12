"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react"

// Mock data for notification templates
const mockTemplates = [
  {
    id: "1",
    name: "Session Reminder",
    subject: "Your upcoming session reminder",
    lastModified: "2023-06-10",
    type: "Email",
  },
  {
    id: "2",
    name: "Welcome Message",
    subject: "Welcome to our gym!",
    lastModified: "2023-05-15",
    type: "Email & SMS",
  },
  {
    id: "3",
    name: "Package Expiry",
    subject: "Your package is about to expire",
    lastModified: "2023-06-05",
    type: "Email",
  },
  {
    id: "4",
    name: "Payment Reminder",
    subject: "Payment reminder for your membership",
    lastModified: "2023-06-01",
    type: "Email & SMS",
  },
  {
    id: "5",
    name: "Session Cancellation",
    subject: "Your session has been cancelled",
    lastModified: "2023-05-20",
    type: "Email",
  },
]

export default function NotificationTemplatesPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filter templates based on search query
  const filteredTemplates = mockTemplates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Calculate pagination
  const totalPages = Math.ceil(filteredTemplates.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedTemplates = filteredTemplates.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2" aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Notification Templates</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Management</CardTitle>
          <CardDescription>Manage notification templates for various purposes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Button asChild>
              <Link href="/admin/notifications/templates/new">
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Link>
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead className="hidden md:table-cell">Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden md:table-cell">Last Modified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{template.subject}</TableCell>
                    <TableCell>{template.type}</TableCell>
                    <TableCell className="hidden md:table-cell">{template.lastModified}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/notifications/templates/${template.id}`}>Edit</Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/notifications/templates/${template.id}/preview`}>Preview</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

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
        </CardContent>
      </Card>
    </div>
  )
}
