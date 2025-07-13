"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/utils/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { TableStatusBadge } from "@/components/ui/status-badge"
import { StatusFilter } from "@/components/ui/status-filter"
import { normalizeStatus } from "@/types/status"
import { ActivityLogger } from "@/utils/activity-logger"
import { useAuth } from "@/contexts/AuthContext"
import {
  ArrowLeft,
  Search,
  MoreHorizontal,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Package,
  TrendingUp,
  Calendar,
  Plus,
  Edit,
  Trash2,
} from "lucide-react"

interface PackageType {
  id: string
  name: string
  description: string
  sessionCount: number
  price: number
  duration: number // days
  category: string
  isActive: boolean
  createdAt: string
}

interface AssignedPackage {
  id: string
  memberId: string
  memberName: string
  packageTypeId: string
  packageType: string
  sessionCount: number
  remainingSessions: number
  price: number
  startDate: string
  endDate: string
  paymentStatus: "paid" | "unpaid"
  status: "Active" | "Inactive" | "Expired"
  purchaseDate: string
  createdBy: string
  createdAt: string
}

// Default categories for new package types

const defaultCategories = [
  "Personal Training",
  "Group Class",
  "Yoga",
  "HIIT",
  "Pilates",
  "Strength Training",
  "Cardio",
  "Physio",
]

export default function PackagesPage() {
  const { toast } = useToast()
  const auth = useAuth()
  const [activeTab, setActiveTab] = useState("assigned")

  // Assigned Packages State
  const [assignedPackages, setAssignedPackages] = useState<AssignedPackage[]>([])
  const [filteredPackages, setFilteredPackages] = useState<AssignedPackage[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [packageTypeFilter, setPackageTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)

  // Package Types State
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([])
  const [availableCategories, setAvailableCategories] = useState<string[]>(defaultCategories)
  const [isCreatePackageOpen, setIsCreatePackageOpen] = useState(false)
  const [isCreateTypeOpen, setIsCreateTypeOpen] = useState(false)
  const [editingType, setEditingType] = useState<PackageType | null>(null)

  // New Package Form State
  const [newPackage, setNewPackage] = useState({
    memberId: "",
    packageTypeId: "",
    startDate: "",
    paymentStatus: "unpaid" as "paid" | "unpaid",
  })

  // New Package Type Form State
  const [newPackageType, setNewPackageType] = useState({
    name: "",
    description: "",
    sessionCount: 10,
    price: 100,
    duration: 30,
    category: "",
    customCategory: "",
    useCustomCategory: false,
  })

  const [members, setMembers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const itemsPerPage = 10

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterPackages()
  }, [assignedPackages, searchQuery, paymentFilter, packageTypeFilter, statusFilter])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()

      // Load package types from database (only active ones)
      const { data: packagesData, error: packagesError } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (packagesError) {
        console.error("Error loading packages:", packagesError)
      }

      // Transform package data to match expected format
      const transformedPackageTypes: PackageType[] = (packagesData || []).map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description || '',
        sessionCount: pkg.session_count || 0,
        price: Number(pkg.price) || 0,
        duration: pkg.duration_days || 30,
        category: pkg.package_type || 'Unknown',
        isActive: pkg.is_active || false,
        createdAt: pkg.created_at
      }))

      setPackageTypes(transformedPackageTypes)

      // Get unique categories from packages
      const uniqueCategories = [...new Set(transformedPackageTypes.map(pkg => pkg.category))]
      const allCategories = [...new Set([...defaultCategories, ...uniqueCategories])]
      setAvailableCategories(allCategories)

      // Load assigned packages (member_packages)
      const { data: memberPackagesData, error: memberPackagesError } = await supabase
        .from('member_packages')
        .select(`
          id,
          member_id,
          start_date,
          end_date,
          sessions_remaining,
          sessions_total,
          status,
          purchased_at,
          auto_renew,
          members (
            id,
            profiles (
              full_name
            )
          ),
          packages (
            id,
            name,
            package_type,
            price,
            session_count
          )
        `)
        .order('purchased_at', { ascending: false })

      if (memberPackagesError) {
        console.error("Error loading member packages:", memberPackagesError)
      }

      // Load payment data to get actual payment status
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('member_id, package_id, status, amount')

      if (paymentsError) {
        console.error("Error loading payments:", paymentsError)
      }

      // Transform assigned packages data
      const transformedAssignedPackages: AssignedPackage[] = (memberPackagesData || []).map(mp => {
        const today = new Date()
        const startDate = new Date(mp.start_date)
        const endDate = new Date(mp.end_date)

        let status = "Expired"
        if (mp.sessions_remaining <= 0) {
          status = "Inactive"
        } else if (startDate <= today && today <= endDate) {
          status = "Active"
        } else if (today > endDate) {
          status = "Expired"
        }

        // Find corresponding payment
        const payment = (paymentsData || []).find(p => 
          p.member_id === mp.member_id && p.package_id === (mp.packages?.id || '')
        )
        const paymentStatus = payment?.status === 'completed' ? 'paid' : 'unpaid'

        return {
          id: mp.id,
          memberId: mp.member_id,
          memberName: mp.members?.profiles?.full_name || 'Unknown Member',
          packageTypeId: mp.packages?.id || '',
          packageType: mp.packages?.name || 'Unknown Package',
          sessionCount: mp.sessions_total || mp.packages?.session_count || 0,
          remainingSessions: mp.sessions_remaining || 0,
          price: Number(mp.packages?.price) || 0,
          startDate: mp.start_date,
          endDate: mp.end_date,
          paymentStatus: paymentStatus,
          status: normalizeStatus(status) as "Active" | "Inactive" | "Expired",
          purchaseDate: mp.purchased_at,
          createdBy: "admin",
          createdAt: mp.purchased_at
        }
      })

      setAssignedPackages(transformedAssignedPackages)

      // Load active members
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select(`
          id,
          membership_status,
          profiles (
            id,
            full_name,
            email
          )
        `)
        .eq('membership_status', 'active')

      if (membersError) {
        console.error("Error loading members:", membersError)
      }

      // Transform members data
      const transformedMembers = (membersData || []).map(member => ({
        id: member.id,
        name: member.profiles?.full_name || 'Unknown',
        email: member.profiles?.email || 'Unknown',
        status: 'Active'
      }))

      setMembers(transformedMembers)

    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error Loading Data",
        description: "Failed to load package data. Please check your database connection.",
        variant: "destructive",
      })
      // No fallback - show empty state
      setPackageTypes([])
      setAvailableCategories(defaultCategories)
      setAssignedPackages([])
      setMembers([])
    } finally {
      setIsLoading(false)
    }
  }

  const filterPackages = () => {
    let filtered = assignedPackages

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (pkg) =>
          pkg.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pkg.packageType.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Payment status filter
    if (paymentFilter !== "all") {
      filtered = filtered.filter((pkg) => pkg.paymentStatus === paymentFilter)
    }

    // Package type filter
    if (packageTypeFilter !== "all") {
      filtered = filtered.filter((pkg) => pkg.packageType === packageTypeFilter)
    }

    // Status filter
    if (statusFilter !== "all") {
      const targetStatus = statusFilter === "active" ? "Active" : statusFilter === "inactive" ? "Inactive" : "Expired"
      filtered = filtered.filter((pkg) => pkg.status === targetStatus)
    }

    setFilteredPackages(filtered)
    setCurrentPage(1)
  }

  // Note: Session type syncing is no longer needed since we store session_type as text in database

  const handleCreatePackage = async () => {
    if (!newPackage.memberId || !newPackage.packageTypeId || !newPackage.startDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      const supabase = createClient()

      const selectedMember = members.find((m) => m.id === newPackage.memberId)
      const selectedType = packageTypes.find((t) => t.id === newPackage.packageTypeId)

      if (!selectedMember || !selectedType) {
        throw new Error("Invalid member or package type selected")
      }

      const startDate = new Date(newPackage.startDate)
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + selectedType.duration)

      // Insert into member_packages table
      const { data: memberPackageData, error: memberPackageError } = await supabase
        .from('member_packages')
        .insert({
          member_id: selectedMember.id,
          package_id: selectedType.id,
          start_date: newPackage.startDate,
          end_date: endDate.toISOString().split("T")[0],
          sessions_remaining: selectedType.sessionCount,
          sessions_total: selectedType.sessionCount,
          status: 'active',
          purchased_at: new Date().toISOString(),
          activated_at: new Date().toISOString(),
          auto_renew: false
        })
        .select()
        .single()

      if (memberPackageError) {
        throw memberPackageError
      }

      // Create payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          member_id: selectedMember.id,
          package_id: selectedType.id,
          amount: selectedType.price,
          payment_method: 'admin_assigned',
          transaction_id: `pkg_${Date.now()}`,
          payment_date: new Date().toISOString(),
          status: newPackage.paymentStatus === 'paid' ? 'completed' : 'pending',
          currency: 'USD',
          invoice_number: `INV_${Date.now()}`,
          processed_by: null // Would be the admin user ID
        })

      if (paymentError) {
        console.error("Error creating payment record:", paymentError)
        // Don't fail the whole operation, just log the error
      }

      // Log activity
      if (auth.user && memberPackageData) {
        await ActivityLogger.packageCreated(
          selectedType.name,
          selectedMember.name,
          memberPackageData.id,
          auth.user.id
        )
      }

      // Reload data to get fresh from database
      await loadData()

      // Reset form
      setNewPackage({
        memberId: "",
        packageTypeId: "",
        startDate: "",
        paymentStatus: "unpaid",
      })

      setIsCreatePackageOpen(false)

      toast({
        title: "Package Created Successfully",
        description: `${selectedType.name} package has been assigned to ${selectedMember.name}.`,
      })
    } catch (error) {
      console.error("Error creating package:", error)
      toast({
        title: "Error",
        description: "Failed to create package. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreatePackageType = async () => {
    if (!newPackageType.name) {
      toast({
        title: "Missing Information",
        description: "Please enter a package name.",
        variant: "destructive",
      })
      return
    }

    const finalCategory = newPackageType.useCustomCategory
      ? newPackageType.customCategory.trim()
      : newPackageType.category

    if (!finalCategory) {
      toast({
        title: "Missing Information",
        description: "Please select or enter a category.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      const supabase = createClient()

      // Insert into packages table
      const { data: packageData, error: packageError } = await supabase
        .from('packages')
        .insert({
          name: newPackageType.name,
          description: newPackageType.description,
          price: newPackageType.price,
          duration_days: newPackageType.duration,
          session_count: newPackageType.sessionCount,
          package_type: finalCategory,
          features: {},
          is_active: true
        })
        .select()
        .single()

      if (packageError) {
        throw packageError
      }

      // Reload data to get fresh from database
      await loadData()

      // Reset form
      setNewPackageType({
        name: "",
        description: "",
        sessionCount: 10,
        price: 100,
        duration: 30,
        category: "",
        customCategory: "",
        useCustomCategory: false,
      })

      setIsCreateTypeOpen(false)

      toast({
        title: "Package Type Created",
        description: `${newPackageType.name} package type has been created successfully.`,
      })
    } catch (error) {
      console.error("Error creating package type:", error)
      toast({
        title: "Error",
        description: "Failed to create package type. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditPackageType = (type: PackageType) => {
    setEditingType(type)
    setNewPackageType({
      name: type.name,
      description: type.description,
      sessionCount: type.sessionCount,
      price: type.price,
      duration: type.duration,
      category: type.category,
      customCategory: "",
      useCustomCategory: false,
    })
    setIsCreateTypeOpen(true)
  }

  const handleUpdatePackageType = async () => {
    if (!editingType) return

    const finalCategory = newPackageType.useCustomCategory
      ? newPackageType.customCategory.trim()
      : newPackageType.category

    if (!finalCategory) {
      toast({
        title: "Missing Information",
        description: "Please select or enter a category.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      const supabase = createClient()

      // Update package in database
      const { error: updateError } = await supabase
        .from('packages')
        .update({
          name: newPackageType.name,
          description: newPackageType.description,
          price: newPackageType.price,
          duration_days: newPackageType.duration,
          session_count: newPackageType.sessionCount,
          package_type: finalCategory,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingType.id)

      if (updateError) {
        throw updateError
      }

      // Reload data to get fresh from database
      await loadData()

      setEditingType(null)
      setNewPackageType({
        name: "",
        description: "",
        sessionCount: 10,
        price: 100,
        duration: 30,
        category: "",
        customCategory: "",
        useCustomCategory: false,
      })
      setIsCreateTypeOpen(false)

      toast({
        title: "Package Type Updated",
        description: `${newPackageType.name} has been updated successfully.`,
      })
    } catch (error) {
      console.error("Error updating package type:", error)
      toast({
        title: "Error",
        description: "Failed to update package type. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePackageType = async (typeId: string) => {
    try {
      setIsLoading(true)
      const supabase = createClient()

      // Deactivate package instead of deleting (safer approach)
      const { error: deleteError } = await supabase
        .from('packages')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', typeId)

      if (deleteError) {
        throw deleteError
      }

      // Reload data to get fresh from database
      await loadData()

      toast({
        title: "Package Type Deleted",
        description: "Package type has been deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting package type:", error)
      toast({
        title: "Error",
        description: "Failed to delete package type. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updatePaymentStatus = async (memberPackageId: string, newStatus: "paid" | "unpaid") => {
    try {
      setIsLoading(true)
      const supabase = createClient()

      // Find the member package first
      const packageInfo = assignedPackages.find(pkg => pkg.id === memberPackageId)
      if (!packageInfo) {
        throw new Error("Package not found")
      }

      // Update payment status in payments table for this specific package
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: newStatus === 'paid' ? 'completed' : 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('member_id', packageInfo.memberId)
        .eq('package_id', packageInfo.packageTypeId)

      if (paymentError) {
        console.error("Error updating payment:", paymentError)
        throw paymentError
      }

      // Reload data to reflect changes
      await loadData()

      toast({
        title: "Payment Status Updated",
        description: `Package payment status has been updated to ${newStatus}.`,
      })
    } catch (error) {
      console.error("Error updating payment status:", error)
      toast({
        title: "Update Failed",
        description: "Failed to update payment status.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getPaymentBadge = (paymentStatus: string) => {
    return paymentStatus === "paid" ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <DollarSign className="h-3 w-3 mr-1" />
        Paid
      </Badge>
    ) : (
      <Badge variant="destructive" className="bg-red-100 text-red-800">
        <DollarSign className="h-3 w-3 mr-1" />
        Unpaid
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getUniquePackageTypes = () => {
    const types = [...new Set(assignedPackages.map((pkg) => pkg.packageType))]
    return types.sort()
  }

  // Calculate statistics
  const stats = {
    totalPackages: assignedPackages.length,
    activePackages: assignedPackages.filter((pkg) => pkg.status === "Active").length,
    paidPackages: assignedPackages.filter((pkg) => pkg.paymentStatus === "paid").length,
    totalRevenue: assignedPackages
      .filter((pkg) => pkg.paymentStatus === "paid")
      .reduce((sum, pkg) => sum + pkg.price, 0),
  }

  // Pagination
  const totalPages = Math.ceil(filteredPackages.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedPackages = filteredPackages.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" asChild className="mr-2">
            <Link href="/admin">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back to Dashboard</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Package Management</h1>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Packages</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPackages}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Packages</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activePackages}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Packages</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paidPackages}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalPackages > 0 ? ((stats.paidPackages / stats.totalPackages) * 100).toFixed(1) : 0}% payment
              rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assigned">Assigned Packages</TabsTrigger>
          <TabsTrigger value="types">Package Types</TabsTrigger>
        </TabsList>

        {/* Assigned Packages Tab */}
        <TabsContent value="assigned" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Assigned Packages</CardTitle>
                  <CardDescription>View and manage all member packages</CardDescription>
                </div>
                <Dialog open={isCreatePackageOpen} onOpenChange={setIsCreatePackageOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      New Package
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Assign New Package</DialogTitle>
                      <DialogDescription>
                        Select a member and package type to create a new package assignment.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="member">Member *</Label>
                        <Select
                          value={newPackage.memberId}
                          onValueChange={(value) => setNewPackage((prev) => ({ ...prev, memberId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a member" />
                          </SelectTrigger>
                          <SelectContent className="max-h-48">
                            {members
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{member.name}</span>
                                    <span className="text-xs text-muted-foreground">{member.email}</span>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="packageType">Package Type *</Label>
                        <Select
                          value={newPackage.packageTypeId}
                          onValueChange={(value) => setNewPackage((prev) => ({ ...prev, packageTypeId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a package type" />
                          </SelectTrigger>
                          <SelectContent className="max-h-48">
                            {packageTypes
                              .filter((t) => t.isActive)
                              .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
                              .map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{type.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {type.sessionCount} sessions • ${type.price} • {type.category}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="startDate">Start Date *</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={newPackage.startDate}
                          onChange={(e) => setNewPackage((prev) => ({ ...prev, startDate: e.target.value }))}
                          min={new Date().toISOString().split("T")[0]}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="paymentStatus">Payment Status *</Label>
                        <Select
                          value={newPackage.paymentStatus}
                          onValueChange={(value: "paid" | "unpaid") =>
                            setNewPackage((prev) => ({ ...prev, paymentStatus: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paid">
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                                Paid
                              </div>
                            </SelectItem>
                            <SelectItem value="unpaid">
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 mr-2 text-red-600" />
                                Unpaid
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreatePackageOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreatePackage} disabled={isLoading}>
                        {isLoading ? "Creating..." : "Create Package"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex items-center space-x-2 flex-1">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by member name or package type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                  />
                </div>

                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Payment Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payment Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={packageTypeFilter} onValueChange={setPackageTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Package Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Package Types</SelectItem>
                    {getUniquePackageTypes().map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <StatusFilter
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  className="w-[180px]"
                  disabled={isLoading}
                />
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member Name</TableHead>
                      <TableHead>Package Type</TableHead>
                      <TableHead>Session Count</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Package Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPackages.map((pkg) => (
                      <TableRow key={pkg.id}>
                        <TableCell className="font-medium">{pkg.memberName}</TableCell>
                        <TableCell>{pkg.packageType}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>
                              {pkg.remainingSessions} / {pkg.sessionCount}
                            </div>
                            <div className="text-muted-foreground">remaining</div>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(pkg.startDate)}</TableCell>
                        <TableCell>{formatDate(pkg.endDate)}</TableCell>
                        <TableCell>{getPaymentBadge(pkg.paymentStatus)}</TableCell>
                        <TableCell>
                          <TableStatusBadge status={pkg.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          {pkg.status === "Active" && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" disabled={isLoading}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {pkg.paymentStatus === "unpaid" ? (
                                  <DropdownMenuItem
                                    onClick={() => updatePaymentStatus(pkg.id, "paid")}
                                    className="text-green-600"
                                  >
                                    <DollarSign className="mr-2 h-4 w-4" />
                                    Mark as Paid
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => updatePaymentStatus(pkg.id, "unpaid")}
                                    className="text-red-600"
                                  >
                                    <DollarSign className="mr-2 h-4 w-4" />
                                    Mark as Unpaid
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
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

              {filteredPackages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No packages found matching your criteria.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Package Types Tab */}
        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Package Types</CardTitle>
                  <CardDescription>Manage available package types and their configurations</CardDescription>
                </div>
                <Dialog
                  open={isCreateTypeOpen}
                  onOpenChange={(open) => {
                    setIsCreateTypeOpen(open)
                    if (!open) {
                      setEditingType(null)
                      setNewPackageType({
                        name: "",
                        description: "",
                        sessionCount: 10,
                        price: 100,
                        duration: 30,
                        category: "",
                        customCategory: "",
                        useCustomCategory: false,
                      })
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      New Package Type
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>{editingType ? "Edit Package Type" : "Create New Package Type"}</DialogTitle>
                      <DialogDescription>
                        {editingType
                          ? "Update the package type details."
                          : "Define a new package type that can be assigned to members."}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="typeName">Package Name *</Label>
                        <Input
                          id="typeName"
                          value={newPackageType.name}
                          onChange={(e) => setNewPackageType((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Personal Training"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="typeCategory">Category *</Label>
                        <div className="space-y-3">
                          <Select
                            value={newPackageType.useCustomCategory ? "" : newPackageType.category}
                            onValueChange={(value) =>
                              setNewPackageType((prev) => ({
                                ...prev,
                                category: value,
                                useCustomCategory: false,
                              }))
                            }
                            disabled={newPackageType.useCustomCategory}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select existing category" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableCategories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="useCustomCategory"
                              checked={newPackageType.useCustomCategory}
                              onChange={(e) =>
                                setNewPackageType((prev) => ({
                                  ...prev,
                                  useCustomCategory: e.target.checked,
                                  category: e.target.checked ? "" : prev.category,
                                }))
                              }
                              className="rounded"
                            />
                            <Label htmlFor="useCustomCategory" className="text-sm">
                              Create new category
                            </Label>
                          </div>

                          {newPackageType.useCustomCategory && (
                            <Input
                              placeholder="Enter new category name (e.g., Physio)"
                              value={newPackageType.customCategory}
                              onChange={(e) =>
                                setNewPackageType((prev) => ({
                                  ...prev,
                                  customCategory: e.target.value,
                                }))
                              }
                            />
                          )}
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="typeDescription">Description</Label>
                        <Input
                          id="typeDescription"
                          value={newPackageType.description}
                          onChange={(e) => setNewPackageType((prev) => ({ ...prev, description: e.target.value }))}
                          placeholder="Brief description of the package"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="sessionCount">Session Count</Label>
                          <Input
                            id="sessionCount"
                            type="number"
                            min="1"
                            max="100"
                            value={newPackageType.sessionCount}
                            onChange={(e) =>
                              setNewPackageType((prev) => ({
                                ...prev,
                                sessionCount: Number.parseInt(e.target.value) || 10,
                              }))
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="price">Price ($)</Label>
                          <Input
                            id="price"
                            type="number"
                            min="0"
                            step="0.01"
                            value={newPackageType.price}
                            onChange={(e) =>
                              setNewPackageType((prev) => ({
                                ...prev,
                                price: Number.parseFloat(e.target.value) || 100,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="duration">Duration (days)</Label>
                        <Input
                          id="duration"
                          type="number"
                          min="1"
                          max="365"
                          value={newPackageType.duration}
                          onChange={(e) =>
                            setNewPackageType((prev) => ({ ...prev, duration: Number.parseInt(e.target.value) || 30 }))
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateTypeOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={editingType ? handleUpdatePackageType : handleCreatePackageType}>
                        {editingType ? "Update Package Type" : "Create Package Type"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Sessions</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packageTypes.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell className="font-medium">{type.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{type.category}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{type.description}</TableCell>
                        <TableCell>{type.sessionCount}</TableCell>
                        <TableCell>${type.price}</TableCell>
                        <TableCell>{type.duration} days</TableCell>
                        <TableCell>
                          <Badge variant={type.isActive ? "default" : "secondary"}>
                            {type.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditPackageType(type)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeletePackageType(type.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {packageTypes.length === 0 && (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No package types available.</p>
                  <Button onClick={() => setIsCreateTypeOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Package Type
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
