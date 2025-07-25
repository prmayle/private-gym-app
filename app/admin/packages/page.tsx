"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/utils/supabase/client";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { TableStatusBadge } from "@/components/ui/status-badge";
import { normalizeStatus } from "@/types/status";
import { logActivity } from "@/utils/activity-logger";
import { useAuth } from "@/contexts/AuthContext";
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
	CheckCircle,
	Loader2,
} from "lucide-react";
import type {
	MemberPackage as DBMemberPackage,
	Package as DBPackage,
} from "@/lib/supabase";

interface PackageType {
	id: string;
	name: string;
	description: string;
	sessionCount: number;
	price: number;
	duration: number;
	isActive: boolean;
	createdAt: string;
	type?: {
		id: string;
		name: string;
		description: string;
		color: string;
		icon: string;
		isActive: boolean;
	} | null;
}

interface AssignedPackage {
	id: string;
	memberId: string;
	memberName: string;
	packageTypeId: string;
	packageType: string; // This will be the name of the package type
	sessionCount: number;
	remainingSessions: number;
	price: number;
	startDate: string;
	endDate: string;
	paymentStatus: "paid" | "unpaid";
	status?: string;
	purchaseDate?: string;
	createdBy?: string;
	createdAt?: string;
}

// Remove the local Member and Package interfaces to avoid conflicts
// interface Member { ... }
// interface Package { ... }

// Use the imported types and update MemberPackageWithJoins
type MemberProfileWithName = {
	profiles?: {
		full_name?: string | null;
		email?: string | null;
	} | null;
} | null;

interface MemberPackageWithJoins extends DBMemberPackage {
	members?: MemberProfileWithName;
	packages?: DBPackage | null;
}

// For UI state, define a type for members actually used in the table
interface AssignedMember {
	id: string;
	name: string;
	email: string;
	status: string;
}

// Import package types from database
import { getPackageTypes, getPackagesWithTypes } from "@/lib/package-types";
import type { PackageType as DBPackageTypeImport } from "@/types/package-types";

export default function PackagesPage() {
	const { toast } = useToast();
	const auth = useAuth();
	const [activeTab, setActiveTab] = useState("assigned");

	// Assigned Packages State
	const [assignedPackages, setAssignedPackages] = useState<AssignedPackage[]>(
		[]
	);
	const [filteredPackages, setFilteredPackages] = useState<AssignedPackage[]>(
		[]
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [paymentFilter, setPaymentFilter] = useState("all");
	const [packageTypeFilter, setPackageTypeFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [currentPage, setCurrentPage] = useState(1);

	// Package Types State
	const [packageTypes, setPackageTypes] = useState<PackageType[]>([]);
	const [availableCategories, setAvailableCategories] = useState<string[]>([]);
	const [isCreatePackageOpen, setIsCreatePackageOpen] = useState(false);
	const [isCreateTypeOpen, setIsCreateTypeOpen] = useState(false);
	const [editingType, setEditingType] = useState<PackageType | null>(null);

	// New Package Form State
	const [newPackage, setNewPackage] = useState({
		memberId: "",
		packageTypeId: "",
		startDate: "",
		paymentStatus: "unpaid" as "paid" | "unpaid",
	});

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
	});

	const [members, setMembers] = useState<AssignedMember[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isLoadingPackages, setIsLoadingPackages] = useState(false);
	const [isLoadingMembers, setIsLoadingMembers] = useState(false);
	const [isCreatingPackage, setIsCreatingPackage] = useState(false);
	const [isCreatingType, setIsCreatingType] = useState(false);
	const itemsPerPage = 10;

	// Add state for editing a package
	const [isEditPackageOpen, setIsEditPackageOpen] = useState(false);
	const [editingPackage, setEditingPackage] = useState<AssignedPackage | null>(
		null
	);
	// Update editForm state to include endDate
	const [editForm, setEditForm] = useState({
		packageTypeId: "",
		startDate: "",
		endDate: "",
	});

	// Add state for package types management tab
	const [packageTypesList, setPackageTypesList] = useState<any[]>([]);
	const [isLoadingPackageTypes, setIsLoadingPackageTypes] = useState(false);
	const [isEditPackageTypeOpen, setIsEditPackageTypeOpen] = useState(false);
	const [editingPackageType, setEditingPackageType] = useState<any | null>(
		null
	);
	const [packageTypeForm, setPackageTypeForm] = useState({
		name: "",
		description: "",
		color: "",
		icon: "",
		is_active: true,
	});

	// 1. Add state for delete dialog at the top of the component:
	const [pendingDeleteCategory, setPendingDeleteCategory] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	// --- New state for monthly revenue and attendance rate ---
	const [monthlyRevenue, setMonthlyRevenue] = useState(0);
	const [attendanceRate, setAttendanceRate] = useState(0);

	useEffect(() => {
		loadData();
	}, []);

	useEffect(() => {
		filterPackages();
	}, [
		assignedPackages,
		searchQuery,
		paymentFilter,
		packageTypeFilter,
		statusFilter,
	]);

	const loadData = async () => {
		try {
			setIsLoading(true);
			const supabase = createClient();

			// --- Monthly Revenue Calculation ---
			const now = new Date();
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
			const endOfMonth = new Date(
				now.getFullYear(),
				now.getMonth() + 1,
				0,
				23,
				59,
				59,
				999
			);

			const { data: legitPayments, error: legitPaymentsError } = await supabase
				.from("payments")
				.select("amount, status, payment_date, transaction_id, invoice_number")
				.eq("status", "completed")
				.neq("transaction_id", null)
				.neq("invoice_number", null)
				.gte("payment_date", startOfMonth.toISOString())
				.lte("payment_date", endOfMonth.toISOString());

			let monthlyRevenueValue = 0;
			if (!legitPaymentsError && legitPayments) {
				monthlyRevenueValue = legitPayments.reduce(
					(sum, payment) => sum + (Number(payment.amount) || 0),
					0
				);
			}
			setMonthlyRevenue(monthlyRevenueValue);

			// --- Attendance Rate Calculation ---
			const { data: monthSessions, error: monthSessionsError } = await supabase
				.from("sessions")
				.select("id, start_time, max_capacity, current_bookings")
				.gte("start_time", startOfMonth.toISOString())
				.lte("start_time", endOfMonth.toISOString());

			let attendanceRateValue = 0;
			if (!monthSessionsError && monthSessions && monthSessions.length > 0) {
				const totalCapacity = monthSessions.reduce(
					(sum, s) => sum + (s.max_capacity || 0),
					0
				);
				const totalAttended = monthSessions.reduce(
					(sum, s) => sum + (s.current_bookings || 0),
					0
				);
				attendanceRateValue =
					totalCapacity > 0
						? Math.round((totalAttended / totalCapacity) * 100)
						: 0;
			}
			setAttendanceRate(attendanceRateValue);

			// Load packages with joined package_types
			const { data: packagesData, error: packagesError } = await supabase
				.from("packages")
				.select(
					`
					id,
					name,
					description,
					price,
					duration_days,
					session_count,
					features,
					is_active,
					created_at,
					updated_at,
					package_type_id,
					package_types (
						id,
						name,
						description,
						color,
						icon,
						is_active
					)
				`
				)
				.order("created_at", { ascending: false });

			if (packagesError) {
				console.error("Error loading packages:", packagesError);
			}

			// Transform package data to match expected format
			const transformedPackageTypes: PackageType[] = (packagesData || []).map(
				(pkg) => {
					// If package_types is an array, use the first element
					const pkgType = Array.isArray(pkg.package_types)
						? pkg.package_types[0]
						: pkg.package_types;
					return {
						id: pkg.id,
						name: pkg.name,
						description: pkg.description || "",
						sessionCount: pkg.session_count || 0,
						price: Number(pkg.price) || 0,
						duration: pkg.duration_days || 30,
						isActive: pkg.is_active || false,
						createdAt: pkg.created_at,
						type: pkgType
							? {
									id: pkgType.id,
									name: pkgType.name,
									description: pkgType.description,
									color: pkgType.color,
									icon: pkgType.icon,
									isActive: pkgType.is_active,
							  }
							: null,
					};
				}
			);
			setPackageTypes(transformedPackageTypes);

			// Load package_types for management tab
			setIsLoadingPackageTypes(true);
			const { data: packageTypesListData, error: packageTypesListError } =
				await supabase.from("package_types").select("*").order("name");
			setIsLoadingPackageTypes(false);
			if (!packageTypesListError)
				setPackageTypesList(packageTypesListData || []);

			// Load package types from database
			const packageTypesData = await getPackageTypes();
			const categoryNames = packageTypesData.map((pt) => pt.name);
			setAvailableCategories(categoryNames);

			// Load assigned packages (member_packages)
			const { data: memberPackagesData, error: memberPackagesError } =
				await supabase
					.from("member_packages")
					.select(
						`
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
            price,
            session_count
          )
        `
					)
					.order("purchased_at", { ascending: false });
			if (memberPackagesError) {
				console.error("Error loading member packages:", memberPackagesError);
			}

			// Load payment data to get actual payment status
			const { data: paymentsData, error: paymentsError } = await supabase
				.from("payments")
				.select("member_id, package_id, status, amount");

			if (paymentsError) {
				console.error("Error loading payments:", paymentsError);
			}

			// Transform assigned packages data
			const transformedAssignedPackages: AssignedPackage[] = (
				(memberPackagesData as unknown as MemberPackageWithJoins[]) || []
			).map((mp) => {
				// Determine package status based on date range and sessions remaining
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				const startDate = new Date(mp.start_date ?? "1970-01-01");
				startDate.setHours(0, 0, 0, 0);
				const endDate = new Date(mp.end_date ?? "1970-01-01");
				endDate.setHours(0, 0, 0, 0);

				let status = "Expired";

				if (startDate > today) {
					status = "Upcoming";
				} else if ((mp.sessions_remaining ?? 0) <= 0) {
					status = "Inactive"; // No sessions left
				} else if (startDate <= today && today <= endDate) {
					status = "Active"; // Within valid date range with sessions
				} else if (today > endDate) {
					status = "Expired"; // Past expiration date
				}

				// Find corresponding payment
				const payment = (paymentsData || []).find(
					(p) =>
						p.member_id === mp.member_id &&
						p.package_id === (mp.packages?.id || "")
				);
				const paymentStatus =
					payment?.status === "completed" ? "paid" : "unpaid";

				return {
					id: mp.id ?? "",
					memberId: mp.member_id,
					memberName: mp.members?.profiles?.full_name || "Unknown Member",
					packageTypeId: mp.packages?.id || "",
					packageType: mp.packages?.name || "Unknown Package",
					sessionCount: mp.sessions_total ?? mp.packages?.session_count ?? 0,
					remainingSessions: mp.sessions_remaining ?? 0,
					price: Number(mp.packages?.price) || 0,
					startDate: mp.start_date ?? "",
					endDate: mp.end_date ?? "",
					paymentStatus: paymentStatus,
					status: normalizeStatus(status) as "Active" | "Inactive" | "Expired",
					purchaseDate: mp.purchased_at,
					createdBy: "admin",
					createdAt: mp.purchased_at,
				};
			});

			setAssignedPackages(transformedAssignedPackages);

			// Load active members
			const { data: membersData, error: membersError } = await supabase
				.from("members")
				.select(
					`
          id,
          membership_status,
          profiles (
            id,
            full_name,
            email
          )
        `
				)
				.eq("membership_status", "active");

			if (membersError) {
				console.error("Error loading members:", membersError);
			}

			// Transform members data
			const transformedMembers: AssignedMember[] = (membersData || []).map(
				(member: any) => ({
					id: member.id,
					name: member.profiles?.full_name || "Unknown",
					email: member.profiles?.email || "Unknown",
					status: "Active",
				})
			);

			setMembers(transformedMembers);
		} catch (error) {
			console.error("Error loading data:", error);
			toast({
				title: "Error Loading Data",
				description:
					"Failed to load package data. Please check your database connection.",
				variant: "destructive",
			});
			// No fallback - show empty state
			setPackageTypes([]);
			setAvailableCategories([]);
			setAssignedPackages([]);
			setMembers([]);
		} finally {
			setIsLoading(false);
		}
	};

	const filterPackages = () => {
		let filtered = assignedPackages;

		// Search filter
		if (searchQuery) {
			filtered = filtered.filter(
				(pkg) =>
					pkg.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
					pkg.packageType.toLowerCase().includes(searchQuery.toLowerCase())
			);
		}

		// Payment status filter
		if (paymentFilter !== "all") {
			filtered = filtered.filter((pkg) => pkg.paymentStatus === paymentFilter);
		}

		// Package type filter
		if (packageTypeFilter !== "all") {
			filtered = filtered.filter(
				(pkg) => pkg.packageType === packageTypeFilter
			);
		}

		// Status filter
		if (statusFilter !== "all") {
			const targetStatus = statusFilter;
			// Filter packages by their status - comparing the package's current status
			// with the target status determined from the filter selection
			filtered = filtered.filter(
				(pkg) => normalizeStatus(pkg.status) === targetStatus
			);
		}

		setFilteredPackages(filtered);
		setCurrentPage(1);
	};

	// Note: Session type syncing is no longer needed since we store session_type as text in database

	const handleCreatePackage = async () => {
		if (
			!newPackage.memberId ||
			!newPackage.packageTypeId ||
			!newPackage.startDate
		) {
			toast({
				title: "Missing Information",
				description: "Please fill in all required fields.",
				variant: "destructive",
			});
			return;
		}

		try {
			setIsCreatingPackage(true);
			const supabase = createClient();

			const selectedMember = members.find((m) => m.id === newPackage.memberId);
			const selectedType = packageTypes.find(
				(t) => t.id === newPackage.packageTypeId
			);

			if (!selectedMember || !selectedType) {
				throw new Error("Invalid member or package type selected");
			}

			const startDate = new Date(newPackage.startDate);
			const endDate = new Date(startDate);
			endDate.setDate(startDate.getDate() + selectedType.duration);

			// Create optimistic update first
			const tempId = `temp-${Date.now()}`;
			const newAssignedPackage: AssignedPackage = {
				id: tempId,
				memberId: selectedMember.id,
				memberName: selectedMember.name,
				packageTypeId: selectedType.id,
				packageType: selectedType.name,
				sessionCount: selectedType.sessionCount,
				remainingSessions: selectedType.sessionCount,
				price: selectedType.price,
				startDate: newPackage.startDate,
				endDate: endDate.toISOString().split("T")[0],
				paymentStatus: newPackage.paymentStatus,
				status: "Active",
				purchaseDate: new Date().toISOString(),
				createdBy: "admin",
				createdAt: new Date().toISOString(),
			};

			// Optimistically update UI
			setAssignedPackages((prev) => [newAssignedPackage, ...prev]);

			// Insert into member_packages table
			const { data: memberPackageData, error: memberPackageError } =
				await supabase
					.from("member_packages")
					.insert({
						member_id: selectedMember.id,
						package_id: selectedType.id,
						start_date: newPackage.startDate,
						end_date: endDate.toISOString().split("T")[0],
						sessions_remaining: selectedType.sessionCount,
						sessions_total: selectedType.sessionCount,
						status: "active",
						purchased_at: new Date().toISOString(),
						activated_at: new Date().toISOString(),
						auto_renew: false,
					})
					.select()
					.single();

			if (memberPackageError) {
				// Revert optimistic update
				setAssignedPackages((prev) => prev.filter((pkg) => pkg.id !== tempId));
				throw memberPackageError;
			}

			// Create payment record
			const { data: paymentData, error: paymentError } = await supabase
				.from("payments")
				.insert({
					member_id: selectedMember.id,
					package_id: selectedType.id,
					amount: selectedType.price,
					payment_method: "admin_assigned",
					transaction_id: `pkg_${Date.now()}`,
					payment_date: new Date().toISOString(),
					status: newPackage.paymentStatus === "paid" ? "completed" : "pending",
					currency: "USD",
					invoice_number: `INV_${Date.now()}`,
					processed_by: null,
				});

			if (paymentError) {
				console.error("Error creating payment record:", paymentError);
			}

			// Update with real data from database
			setAssignedPackages((prev) =>
				prev.map((pkg) =>
					pkg.id === tempId
						? {
								...newAssignedPackage,
								id: memberPackageData.id,
						  }
						: pkg
				)
			);

			// Log activity to activity_logs table
			if (auth.user && memberPackageData) {
				await logActivity({
					action_type: "create",
					entity_type: "package",
					entity_id: memberPackageData.id,
					entity_name: selectedType.name,
					description: `Package "${selectedType.name}" assigned to ${selectedMember.name}`,
					performed_by: auth.user.id,
					metadata: {
						member_name: selectedMember.name,
						package_type: selectedType.name,
						price: selectedType.price,
						sessions: selectedType.sessionCount,
					},
				});
			}

			// Reset form
			setNewPackage({
				memberId: "",
				packageTypeId: "",
				startDate: "",
				paymentStatus: "unpaid",
			});

			setIsCreatePackageOpen(false);

			toast({
				title: "Package Created Successfully",
				description: `${selectedType.name} package has been assigned to ${selectedMember.name}.`,
			});
		} catch (error) {
			console.error("Error creating package:", error);
			toast({
				title: "Error",
				description: "Failed to create package. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsCreatingPackage(false);
		}
	};

	const handleCreatePackageType = async () => {
		if (!newPackageType.name) {
			toast({
				title: "Missing Information",
				description: "Please enter a package name.",
				variant: "destructive",
			});
			return;
		}

		const finalCategory = newPackageType.useCustomCategory
			? newPackageType.customCategory.trim()
			: newPackageType.category;

		if (!finalCategory) {
			toast({
				title: "Missing Information",
				description: "Please select or enter a Package Type.",
				variant: "destructive",
			});
			return;
		}

		try {
			setIsLoading(true);
			const supabase = createClient();

			// First, check if package type exists, if not create it
			let packageTypeId = "";
			if (newPackageType.useCustomCategory) {
				// Create new package type
				const { data: newPackageTypeData, error: packageTypeError } =
					await supabase
						.from("package_types")
						.insert({
							name: finalCategory,
							description: `Package type for ${finalCategory}`,
							color: "#3B82F6", // Default blue color
							icon: null,
							sort_order: 999,
							is_active: true,
						})
						.select()
						.single();

				if (packageTypeError) {
					throw packageTypeError;
				}
				packageTypeId = newPackageTypeData.id;
			} else {
				// Find existing package type
				const { data: existingPackageType, error: findError } = await supabase
					.from("package_types")
					.select("id")
					.eq("name", finalCategory)
					.single();

				if (findError) {
					throw new Error("Package type not found");
				}
				packageTypeId = existingPackageType.id;
			}

			// Insert into packages table
			const { data: packageData, error: packageError } = await supabase
				.from("packages")
				.insert({
					name: newPackageType.name,
					description: newPackageType.description,
					price: newPackageType.price,
					duration_days: newPackageType.duration,
					session_count: newPackageType.sessionCount,
					package_type_id: packageTypeId,
					features: {},
					is_active: true,
				})
				.select()
				.single();

			if (packageError) {
				throw packageError;
			}

			// Log activity to activity_logs table
			if (auth.user && packageData) {
				await logActivity({
					action_type: "create",
					entity_type: "package",
					entity_id: packageData.id,
					entity_name: newPackageType.name,
					description: `Package type "${newPackageType.name}" created with ${newPackageType.sessionCount} sessions at $${newPackageType.price}`,
					performed_by: auth.user.id,
					metadata: {
						package_type: finalCategory,
						sessions: newPackageType.sessionCount,
						price: newPackageType.price,
						duration: newPackageType.duration,
					},
				});
			}

			// Reload data to get fresh from database
			await loadData();

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
			});

			setIsCreateTypeOpen(false);

			toast({
				title: "Package Created",
				description: `${newPackageType.name} package has been created successfully.`,
			});
		} catch (error) {
			console.error("Error creating package:", error);
			toast({
				title: "Error",
				description: "Failed to create package. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleEditPackageType = (type: PackageType) => {
		setEditingType(type);
		setNewPackageType({
			name: type.name,
			description: type.description,
			sessionCount: type.sessionCount,
			price: type.price,
			duration: type.duration,
			category: type.type?.name || "",
			customCategory: "",
			useCustomCategory: false,
		});
		setIsCreateTypeOpen(true);
	};

	const handleUpdatePackageType = async () => {
		if (!editingType) return;

		const finalCategory = newPackageType.useCustomCategory
			? newPackageType.customCategory.trim()
			: newPackageType.category;

		if (!finalCategory) {
			toast({
				title: "Missing Information",
				description: "Please select or enter a category.",
				variant: "destructive",
			});
			return;
		}

		try {
			setIsLoading(true);
			const supabase = createClient();

			// First, check if package type exists, if not create it
			let packageTypeId = "";
			if (newPackageType.useCustomCategory) {
				// Create new package type
				const { data: newPackageTypeData, error: packageTypeError } =
					await supabase
						.from("package_types")
						.insert({
							name: finalCategory,
							description: `Package type for ${finalCategory}`,
							color: "#3B82F6", // Default blue color
							icon: null,
							sort_order: 999,
							is_active: true,
						})
						.select()
						.single();

				if (packageTypeError) {
					throw packageTypeError;
				}
				packageTypeId = newPackageTypeData.id;
			} else {
				// Find existing package type
				const { data: existingPackageType, error: findError } = await supabase
					.from("package_types")
					.select("id")
					.eq("name", finalCategory)
					.single();

				if (findError) {
					throw new Error("Package type not found");
				}
				packageTypeId = existingPackageType.id;
			}

			// Update package in database
			const { error: updateError } = await supabase
				.from("packages")
				.update({
					name: newPackageType.name,
					description: newPackageType.description,
					price: newPackageType.price,
					duration_days: newPackageType.duration,
					session_count: newPackageType.sessionCount,
					package_type_id: packageTypeId,
					updated_at: new Date().toISOString(),
				})
				.eq("id", editingType.id);

			if (updateError) {
				throw updateError;
			}

			// Log activity to activity_logs table
			if (auth.user) {
				await logActivity({
					action_type: "update",
					entity_type: "package",
					entity_id: editingType.id,
					entity_name: newPackageType.name,
					description: `Package type "${newPackageType.name}" updated`,
					performed_by: auth.user.id,
					metadata: {
						package_type: finalCategory,
						sessions: newPackageType.sessionCount,
						price: newPackageType.price,
						duration: newPackageType.duration,
					},
				});
			}

			// Reload data to get fresh from database
			await loadData();

			setEditingType(null);
			setNewPackageType({
				name: "",
				description: "",
				sessionCount: 10,
				price: 100,
				duration: 30,
				category: "",
				customCategory: "",
				useCustomCategory: false,
			});
			setIsCreateTypeOpen(false);

			toast({
				title: "Package Updated",
				description: `${newPackageType.name} has been updated successfully.`,
			});
		} catch (error) {
			console.error("Error updating package:", error);
			toast({
				title: "Error",
				description: "Failed to update package. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleTogglePackageTypeStatus = async (
		typeId: string,
		currentStatus: boolean
	) => {
		try {
			setIsLoading(true);
			const supabase = createClient();

			const newStatus = !currentStatus;
			const actionText = newStatus ? "activated" : "deactivated";

			// Toggle package status
			const { error: updateError } = await supabase
				.from("packages")
				.update({
					is_active: newStatus,
					updated_at: new Date().toISOString(),
				})
				.eq("id", typeId);

			if (updateError) {
				throw updateError;
			}

			// Reload data to get fresh from database
			await loadData();

			toast({
				title: `Package ${
					actionText.charAt(0).toUpperCase() + actionText.slice(1)
				}`,
				description: `Package has been ${actionText} successfully.`,
			});
		} catch (error) {
			console.error("Error updating package status:", error);
			toast({
				title: "Error",
				description: "Failed to update package status. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleDeletePackageType = async (typeId: string) => {
		// Find the package to get its name for the confirmation dialog
		const packageToDelete = packageTypes.find((pkg) => pkg.id === typeId);
		const packageName = packageToDelete?.name || "this package";

		try {
			setIsLoading(true);
			const supabase = createClient();

			// Check if package is being used by any member packages
			const { data: memberPackages, error: checkError } = await supabase
				.from("member_packages")
				.select("id")
				.eq("package_id", typeId)
				.limit(1);

			if (checkError) {
				throw checkError;
			}

			if (memberPackages && memberPackages.length > 0) {
				toast({
					title: "Cannot Delete This Package",
					description:
						"This package is currently assigned to members. Please deactivate it instead.",
					variant: "destructive",
				});
				setIsLoading(false);
				return;
			}

			// Check if package has any related payments
			const { data: payments, error: paymentsError } = await supabase
				.from("payments")
				.select("id")
				.eq("package_id", typeId)
				.limit(1);

			if (paymentsError) {
				throw paymentsError;
			}

			if (payments && payments.length > 0) {
				// Show a popup warning that the package cannot be deleted due to payment records
				await new Promise<void>((resolve) => {
					const dialog = document.createElement("div");
					dialog.className =
						"fixed inset-0 z-50 bg-black/50 flex items-center justify-center";
					dialog.innerHTML = `
						<div class="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
							<div class="flex items-center gap-3 mb-4">
								<div class="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
									<svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
									</svg>
								</div>
								<div>
									<h3 class="text-lg font-semibold text-gray-900">Cannot Delete Package</h3>
									<p class="text-sm text-gray-500">This package has payment records and cannot be deleted.</p>
								</div>
							</div>
							<p class="text-gray-600 mb-6">
								The package <strong>${packageName}</strong> has payment records associated with it. Deletion is not allowed to preserve payment history.
							</p>
							<div class="flex gap-3 justify-end">
								<button id="ok-btn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
									OK
								</button>
							</div>
						</div>
					`;
					document.body.appendChild(dialog);
					const okBtn = dialog.querySelector("#ok-btn");
					const cleanup = () => {
						document.body.removeChild(dialog);
					};
					okBtn?.addEventListener("click", () => {
						cleanup();
						resolve();
					});
					// Close on escape key
					const handleEscape = (e: KeyboardEvent) => {
						if (e.key === "Escape") {
							cleanup();
							resolve();
							document.removeEventListener("keydown", handleEscape);
						}
					};
					document.addEventListener("keydown", handleEscape);
				});
				setIsLoading(false);
				return;
			}

			// If no payments, show confirmation dialog and proceed to delete
			const confirmed = await new Promise<boolean>((resolve) => {
				const dialog = document.createElement("div");
				dialog.className =
					"fixed inset-0 z-50 bg-black/50 flex items-center justify-center";
				dialog.innerHTML = `
					<div class="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
						<div class="flex items-center gap-3 mb-4">
							<div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
								<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
								</svg>
							</div>
							<div>
								<h3 class="text-lg font-semibold text-gray-900">Delete Package</h3>
								<p class="text-sm text-gray-500">This action cannot be undone</p>
							</div>
						</div>
						<p class="text-gray-600 mb-6">
							Are you sure you want to delete "<strong>${packageName}</strong>"? This will permanently remove the package and all associated data.
						</p>
						<div class="flex gap-3 justify-end">
							<button id="cancel-btn" class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
								Cancel
							</button>
							<button id="delete-btn" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
								Delete Package
							</button>
						</div>
					</div>
				`;
				document.body.appendChild(dialog);
				const cancelBtn = dialog.querySelector("#cancel-btn");
				const deleteBtn = dialog.querySelector("#delete-btn");
				const cleanup = () => {
					document.body.removeChild(dialog);
				};
				cancelBtn?.addEventListener("click", () => {
					cleanup();
					resolve(false);
				});
				deleteBtn?.addEventListener("click", () => {
					cleanup();
					resolve(true);
				});
				// Close on escape key
				const handleEscape = (e: KeyboardEvent) => {
					if (e.key === "Escape") {
						cleanup();
						resolve(false);
						document.removeEventListener("keydown", handleEscape);
					}
				};
				document.addEventListener("keydown", handleEscape);
			});

			if (!confirmed) {
				setIsLoading(false);
				return;
			}

			// If confirmed, delete the package
			const { error: deleteError } = await supabase
				.from("packages")
				.delete()
				.eq("id", typeId);

			if (deleteError) {
				throw deleteError;
			}

			// Reload data to get fresh from database
			await loadData();

			toast({
				title: "Package is Deleted",
				description: "Package is deleted successfully.",
			});
		} catch (error) {
			console.error("Error deleting package:", error);
			toast({
				title: "Error",
				description: "Failed to delete package. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const updatePaymentStatus = async (
		memberPackageId: string,
		newStatus: "paid" | "unpaid"
	) => {
		try {
			const supabase = createClient();

			// Find the member package first
			const packageInfo = assignedPackages.find(
				(pkg) => pkg.id === memberPackageId
			);
			if (!packageInfo) {
				throw new Error("Package not found");
			}

			// Optimistically update UI first
			const oldStatus = packageInfo.paymentStatus;
			setAssignedPackages((prev) =>
				prev.map((pkg) =>
					pkg.id === memberPackageId
						? { ...pkg, paymentStatus: newStatus }
						: pkg
				)
			);

			// Update payment status in payments table for this specific package
			const { error: paymentError } = await supabase
				.from("payments")
				.update({
					status: newStatus === "paid" ? "completed" : "pending",
					updated_at: new Date().toISOString(),
				})
				.eq("member_id", packageInfo.memberId)
				.eq("package_id", packageInfo.packageTypeId);

			if (paymentError) {
				// Revert optimistic update on error
				setAssignedPackages((prev) =>
					prev.map((pkg) =>
						pkg.id === memberPackageId
							? { ...pkg, paymentStatus: oldStatus }
							: pkg
					)
				);
				console.error("Error updating payment:", paymentError);
				throw paymentError;
			}

			// Log activity to activity_logs table
			if (auth.user) {
				await logActivity({
					action_type: "update",
					entity_type: "package",
					entity_id: memberPackageId,
					entity_name: packageInfo.packageType,
					description: `Payment status updated to ${newStatus} for ${packageInfo.memberName}'s ${packageInfo.packageType} package`,
					performed_by: auth.user.id,
					metadata: {
						member_name: packageInfo.memberName,
						old_status: oldStatus,
						new_status: newStatus,
					},
				});
			}

			toast({
				title: "Payment Status Updated",
				description: `Package payment status has been updated to ${newStatus}.`,
			});
		} catch (error) {
			console.error("Error updating payment status:", error);
			toast({
				title: "Update Failed",
				description: "Failed to update payment status.",
				variant: "destructive",
			});
		}
	};

	const handleDeleteMemberPackage = async (memberPackageId: string) => {
		try {
			const supabase = createClient();

			// Find the member package first
			const packageInfo = assignedPackages.find(
				(pkg) => pkg.id === memberPackageId
			);
			if (!packageInfo) {
				throw new Error("Package not found");
			}

			// Optimistically remove from UI
			setAssignedPackages((prev) =>
				prev.filter((pkg) => pkg.id !== memberPackageId)
			);

			// Delete from member_packages table
			const { error: deleteError } = await supabase
				.from("member_packages")
				.delete()
				.eq("id", memberPackageId);

			if (deleteError) {
				// Revert optimistic update on error
				setAssignedPackages((prev) => [...prev, packageInfo]);
				throw deleteError;
			}

			// Also delete related payment records (optional, or you might want to keep for audit)
			const { error: paymentDeleteError } = await supabase
				.from("payments")
				.delete()
				.eq("member_id", packageInfo.memberId)
				.eq("package_id", packageInfo.packageTypeId);

			if (paymentDeleteError) {
				console.error("Error deleting payment records:", paymentDeleteError);
				// Don't fail the whole operation
			}

			// Log activity to activity_logs table
			if (auth.user) {
				await logActivity({
					action_type: "delete",
					entity_type: "package",
					entity_id: memberPackageId,
					entity_name: packageInfo.packageType,
					description: `Package "${packageInfo.packageType}" deleted for ${packageInfo.memberName}`,
					performed_by: auth.user.id,
					metadata: {
						member_name: packageInfo.memberName,
						package_type: packageInfo.packageType,
						price: packageInfo.price,
					},
				});
			}

			toast({
				title: "Package Deleted",
				description: `Package has been removed from ${packageInfo.memberName}.`,
			});
		} catch (error) {
			console.error("Error deleting member package:", error);
			toast({
				title: "Delete Failed",
				description: "Failed to delete package. Please try again.",
				variant: "destructive",
			});
		}
	};

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
		);
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const getUniquePackageTypes = () => {
		const types = [...new Set(assignedPackages.map((pkg) => pkg.packageType))];
		return types.sort();
	};

	// Calculate statistics
	const stats = {
		totalPackages: assignedPackages.length,
		activePackages: assignedPackages.filter((pkg) => pkg.status === "Active")
			.length,
		paidPackages: assignedPackages.filter((pkg) => pkg.paymentStatus === "paid")
			.length,
		monthlyRevenue, // new, accurate
		attendanceRate, // new, accurate
	};

	// Pagination
	const totalPages = Math.ceil(filteredPackages.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedPackages = filteredPackages.slice(
		startIndex,
		startIndex + itemsPerPage
	);

	// Handler to open edit dialog
	const handleEditPackage = (pkg: AssignedPackage) => {
		setEditingPackage(pkg);
		setEditForm({
			packageTypeId: pkg.packageTypeId,
			startDate: pkg.startDate,
			endDate: pkg.endDate,
		});
		setIsEditPackageOpen(true);
	};

	// Helper to get duration for a package type
	const getPackageDuration = (packageTypeId: string) => {
		const pkg = packageTypes.find((p) => p.id === packageTypeId);
		return pkg?.duration || 30;
	};

	// When packageTypeId or startDate changes, recalculate endDate
	useEffect(() => {
		if (!editForm.packageTypeId || !editForm.startDate) return;
		const duration = getPackageDuration(editForm.packageTypeId);
		const start = new Date(editForm.startDate);
		if (isNaN(start.getTime())) return;
		const end = new Date(start);
		end.setDate(start.getDate() + duration);
		setEditForm((prev) => ({
			...prev,
			endDate: end.toISOString().split("T")[0],
		}));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [editForm.packageTypeId, editForm.startDate]);

	// Handler to save edit
	const handleSaveEditPackage = async () => {
		if (!editingPackage) return;
		setIsLoadingPackages(true);
		try {
			const supabase = createClient();

			// Store old values for rollback
			const oldValues = {
				packageTypeId: editingPackage.packageTypeId,
				startDate: editingPackage.startDate,
				endDate: editingPackage.endDate,
			};

			// Find the new package type name
			const newPackageType = packageTypes.find(
				(p) => p.id === editForm.packageTypeId
			);
			const newPackageTypeName =
				newPackageType?.name || editingPackage.packageType;

			// Optimistically update UI first
			setAssignedPackages((prev) =>
				prev.map((pkg) =>
					pkg.id === editingPackage.id
						? {
								...pkg,
								packageTypeId: editForm.packageTypeId,
								packageType: newPackageTypeName,
								startDate: editForm.startDate,
								endDate: editForm.endDate,
								sessionCount: newPackageType?.sessionCount || pkg.sessionCount,
								price: newPackageType?.price || pkg.price,
						  }
						: pkg
				)
			);

			// Update the member_packages row
			const { error } = await supabase
				.from("member_packages")
				.update({
					package_id: editForm.packageTypeId,
					start_date: editForm.startDate,
					end_date: editForm.endDate,
					sessions_total:
						newPackageType?.sessionCount || editingPackage.sessionCount,
					updated_at: new Date().toISOString(),
				})
				.eq("id", editingPackage.id);

			if (error) {
				// Revert optimistic update on error
				setAssignedPackages((prev) =>
					prev.map((pkg) =>
						pkg.id === editingPackage.id
							? {
									...pkg,
									packageTypeId: oldValues.packageTypeId,
									packageType: editingPackage.packageType,
									startDate: oldValues.startDate,
									endDate: oldValues.endDate,
									sessionCount: editingPackage.sessionCount,
									price: editingPackage.price,
							  }
							: pkg
					)
				);
				throw error;
			}

			// Log activity to activity_logs table
			if (auth.user) {
				await logActivity({
					action_type: "update",
					entity_type: "package",
					entity_id: editingPackage.id,
					entity_name: newPackageTypeName,
					description: `Package updated for ${editingPackage.memberName} - changed to ${newPackageTypeName}`,
					performed_by: auth.user.id,
					metadata: {
						member_name: editingPackage.memberName,
						old_package: editingPackage.packageType,
						new_package: newPackageTypeName,
						old_dates: `${oldValues.startDate} to ${oldValues.endDate}`,
						new_dates: `${editForm.startDate} to ${editForm.endDate}`,
					},
				});
			}

			setIsEditPackageOpen(false);
			setEditingPackage(null);
			toast({
				title: "Package Updated",
				description: "The assigned package has been updated.",
			});
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to update package. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsLoadingPackages(false);
		}
	};

	// Helper to get the start of the current week (Monday)
	const getStartOfWeek = () => {
		const now = new Date();
		const day = now.getDay();
		const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
		const monday = new Date(now.setDate(diff));
		return monday.toISOString().split("T")[0];
	};
	const minStartDate = getStartOfWeek();

	// Compute unique normalized statuses from loaded packages
	const uniqueStatuses = useMemo(() => {
		return Array.from(
			new Set(assignedPackages.map((pkg) => normalizeStatus(pkg.status)))
		);
	}, [assignedPackages]);

	// Toggle active status for package_types (category)
	const handleToggleCategoryStatus = async (
		typeId: string,
		currentStatus: boolean
	) => {
		try {
			setIsLoadingPackageTypes(true);
			const supabase = createClient();
			const newStatus = !currentStatus;
			const actionText = newStatus ? "activated" : "deactivated";
			const { error } = await supabase
				.from("package_types")
				.update({ is_active: newStatus })
				.eq("id", typeId);
			if (error) throw error;
			await loadData();
			toast({
				title: `Category ${
					actionText.charAt(0).toUpperCase() + actionText.slice(1)
				}`,
				description: `Category has been ${actionText} successfully.`,
			});
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to update category status. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsLoadingPackageTypes(false);
		}
	};

	// Delete a package_type (category) if not in use
	const handleDeleteCategory = async (typeId: string) => {
		const category = packageTypesList.find((t) => t.id === typeId);
		const categoryName = category?.name || "this category";
		try {
			setIsLoadingPackageTypes(true);
			const supabase = createClient();
			// Check if any packages use this category
			const { data: packages, error: packagesError } = await supabase
				.from("packages")
				.select("id")
				.eq("package_type_id", typeId)
				.limit(1);
			if (packagesError) throw packagesError;
			if (packages && packages.length > 0) {
				toast({
					title: "Cannot Delete Category",
					description:
						"This category is used by packages. Please deactivate it instead.",
					variant: "destructive",
				});
				setIsLoadingPackageTypes(false);
				return;
			}
			// Instead of confirm, open dialog
			setPendingDeleteCategory({ id: typeId, name: categoryName });
			setIsDeleteDialogOpen(true);
			setIsLoadingPackageTypes(false);
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to check category usage. Please try again.",
				variant: "destructive",
			});
			setIsLoadingPackageTypes(false);
		}
	};

	// 3. Add a function to actually perform the deletion after confirmation:
	const confirmDeleteCategory = async () => {
		if (!pendingDeleteCategory) return;
		try {
			setIsLoadingPackageTypes(true);
			const supabase = createClient();
			const { error: deleteError } = await supabase
				.from("package_types")
				.delete()
				.eq("id", pendingDeleteCategory.id);
			if (deleteError) throw deleteError;
			await loadData();
			toast({
				title: "Category Deleted",
				description: `Category '${pendingDeleteCategory.name}' has been deleted successfully.`,
			});
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to delete category. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsDeleteDialogOpen(false);
			setPendingDeleteCategory(null);
			setIsLoadingPackageTypes(false);
		}
	};

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
			<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Packages Assigned
						</CardTitle>
						<Package className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.totalPackages}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Active Packages
						</CardTitle>
						<Calendar className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">
							{stats.activePackages}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Paid Packages Assigned
						</CardTitle>
						<DollarSign className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.paidPackages}</div>
						<p className="text-xs text-muted-foreground">
							{stats.totalPackages > 0
								? ((stats.paidPackages / stats.totalPackages) * 100).toFixed(1)
								: 0}
							% payment rate
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Monthly Revenue
						</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							${stats.monthlyRevenue.toLocaleString()}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Attendance Rate
						</CardTitle>
						<Calendar className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.attendanceRate}%</div>
					</CardContent>
				</Card>
			</div>

			{/* Tabs */}
			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="assigned">Assigned Packages</TabsTrigger>
					<TabsTrigger value="types">Packages</TabsTrigger>
					<TabsTrigger value="packageTypes">Package Types</TabsTrigger>
				</TabsList>

				{/* Assigned Packages Tab */}
				<TabsContent value="assigned" className="space-y-4">
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle>Assigned Packages</CardTitle>
									<CardDescription>
										View and manage all member packages
									</CardDescription>
								</div>
								<Dialog
									open={isCreatePackageOpen}
									onOpenChange={setIsCreatePackageOpen}>
									<DialogTrigger asChild>
										<Button disabled={isLoading || isLoadingMembers}>
											{isLoading || isLoadingMembers ? (
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											) : (
												<Plus className="mr-2 h-4 w-4" />
											)}
											New Package Assignment
										</Button>
									</DialogTrigger>
									<DialogContent className="sm:max-w-[500px]">
										<DialogHeader>
											<DialogTitle>Assign New Package</DialogTitle>
											<DialogDescription>
												Select a member and package type to create a new package
												assignment.
											</DialogDescription>
										</DialogHeader>
										<div className="grid gap-4 py-4">
											<div className="grid gap-2">
												<Label htmlFor="member">Member *</Label>
												<Select
													value={newPackage.memberId}
													onValueChange={(value) =>
														setNewPackage((prev) => ({
															...prev,
															memberId: value,
														}))
													}
													disabled={isLoadingMembers}>
													<SelectTrigger>
														<SelectValue placeholder="Select a member" />
													</SelectTrigger>
													<SelectContent className="max-h-48">
														{isLoadingMembers ? (
															<div className="p-2">Loading members...</div>
														) : (
															members
																.sort((a, b) => a.name.localeCompare(b.name))
																.map((member) => (
																	<SelectItem key={member.id} value={member.id}>
																		<div className="flex flex-col">
																			<span className="font-medium">
																				{member.name}
																			</span>
																			<span className="text-xs text-muted-foreground">
																				{member.email}
																			</span>
																		</div>
																	</SelectItem>
																))
														)}
													</SelectContent>
												</Select>
											</div>

											<div className="grid gap-2">
												<Label htmlFor="packageType">Package Type *</Label>
												<Select
													value={newPackage.packageTypeId}
													onValueChange={(value) =>
														setNewPackage((prev) => ({
															...prev,
															packageTypeId: value,
														}))
													}
													disabled={isLoadingPackages}>
													<SelectTrigger>
														<SelectValue placeholder="Select a package type" />
													</SelectTrigger>
													<SelectContent className="max-h-48">
														{isLoadingPackages ? (
															<div className="p-2">Loading packages...</div>
														) : (
															packageTypes
																.filter((t) => t.isActive)
																.sort(
																	(a, b) =>
																		(a.type?.name || "").localeCompare(
																			b.type?.name || ""
																		) || a.name.localeCompare(b.name)
																)
																.map((type) => (
																	<SelectItem key={type.id} value={type.id}>
																		<div className="flex flex-col">
																			<span className="font-medium">
																				{type.name}
																			</span>
																			<span className="text-xs text-muted-foreground">
																				{type.sessionCount} sessions • $
																				{type.price} • {type.type?.name}
																			</span>
																		</div>
																	</SelectItem>
																))
														)}
													</SelectContent>
												</Select>
											</div>

											<div className="grid gap-2">
												<Label htmlFor="startDate">Start Date *</Label>
												<Input
													id="startDate"
													type="date"
													value={newPackage.startDate}
													onChange={(e) =>
														setNewPackage((prev) => ({
															...prev,
															startDate: e.target.value,
														}))
													}
													min={new Date().toISOString().split("T")[0]}
												/>
											</div>

											<div className="grid gap-2">
												<Label htmlFor="paymentStatus">Payment Status *</Label>
												<Select
													value={newPackage.paymentStatus}
													onValueChange={(value: "paid" | "unpaid") =>
														setNewPackage((prev) => ({
															...prev,
															paymentStatus: value,
														}))
													}>
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
											<Button
												variant="outline"
												onClick={() => setIsCreatePackageOpen(false)}>
												Cancel
											</Button>
											<Button
												onClick={handleCreatePackage}
												disabled={isCreatingPackage}>
												{isCreatingPackage ? (
													<>
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
														Creating...
													</>
												) : (
													"Create Package"
												)}
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
										placeholder="Search by member name or packages..."
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

								<Select
									value={packageTypeFilter}
									onValueChange={setPackageTypeFilter}>
									<SelectTrigger className="w-[180px]">
										<SelectValue placeholder="Package Type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Packages</SelectItem>
										{getUniquePackageTypes().map((type) => (
											<SelectItem key={type} value={type}>
												{type}
											</SelectItem>
										))}
									</SelectContent>
								</Select>

								{/* Replace StatusFilter with a Select for dynamic status options */}
								<Select
									value={statusFilter}
									onValueChange={setStatusFilter}
									disabled={isLoading}>
									<SelectTrigger className="w-[180px]">
										<SelectValue placeholder="Status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Statuses</SelectItem>
										{uniqueStatuses.map((status) => (
											<SelectItem key={status} value={status}>
												{status}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Table */}
							<div className="rounded-md border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Member Name</TableHead>
											<TableHead>Package Name</TableHead>
											<TableHead>Session Count</TableHead>
											<TableHead>Start Date</TableHead>
											<TableHead>End Date</TableHead>
											<TableHead>Payment Status</TableHead>
											<TableHead>Package Status</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{isLoading
											? // Show 3 animated skeleton rows while loading, using bg-gray-200 and rounded
											  Array.from({ length: 3 }).map((_, idx) => (
													<TableRow key={"skeleton-" + idx}>
														<TableCell className="font-medium">
															<div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
														</TableCell>
														<TableCell>
															<div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
														</TableCell>
														<TableCell>
															<div className="text-sm">
																<div className="h-4 w-16 mb-1 bg-gray-200 rounded animate-pulse" />
																<div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
															</div>
														</TableCell>
														<TableCell>
															<div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
														</TableCell>
														<TableCell>
															<div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
														</TableCell>
														<TableCell>
															<div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
														</TableCell>
														<TableCell>
															<div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
														</TableCell>
														<TableCell className="text-right">
															<div className="h-8 w-8 rounded-full mx-auto bg-gray-200 animate-pulse" />
														</TableCell>
													</TableRow>
											  ))
											: paginatedPackages.map((pkg) => (
													<TableRow key={pkg.id}>
														<TableCell className="font-medium">
															{pkg.memberName}
														</TableCell>
														<TableCell>{pkg.packageType}</TableCell>
														<TableCell>
															<div className="text-sm">
																<div>
																	{pkg.remainingSessions} / {pkg.sessionCount}
																</div>
																<div className="text-muted-foreground">
																	remaining
																</div>
															</div>
														</TableCell>
														<TableCell>{formatDate(pkg.startDate)}</TableCell>
														<TableCell>{formatDate(pkg.endDate)}</TableCell>
														<TableCell>
															{getPaymentBadge(pkg.paymentStatus)}
														</TableCell>
														<TableCell>
															<TableStatusBadge status={pkg.status || ""} />
														</TableCell>
														<TableCell className="text-right">
															<DropdownMenu>
																<DropdownMenuTrigger asChild>
																	<Button
																		variant="ghost"
																		size="sm"
																		disabled={isLoadingPackages}>
																		<MoreHorizontal className="h-4 w-4" />
																	</Button>
																</DropdownMenuTrigger>
																<DropdownMenuContent align="end">
																	<DropdownMenuItem
																		onClick={() => handleEditPackage(pkg)}
																		className="text-blue-600">
																		<Edit className="mr-2 h-4 w-4" />
																		Edit Package
																	</DropdownMenuItem>
																	{pkg.paymentStatus === "unpaid" ? (
																		<DropdownMenuItem
																			onClick={() =>
																				updatePaymentStatus(pkg.id, "paid")
																			}
																			className="text-green-600">
																			<DollarSign className="mr-2 h-4 w-4" />
																			Mark as Paid
																		</DropdownMenuItem>
																	) : (
																		<DropdownMenuItem
																			onClick={() =>
																				updatePaymentStatus(pkg.id, "unpaid")
																			}
																			className="text-red-600">
																			<DollarSign className="mr-2 h-4 w-4" />
																			Mark as Unpaid
																		</DropdownMenuItem>
																	)}
																	{(pkg.status === "Expired" ||
																		pkg.status === "Inactive") && (
																		<DropdownMenuItem
																			onClick={() =>
																				handleDeleteMemberPackage(pkg.id)
																			}
																			className="text-red-600">
																			<Trash2 className="mr-2 h-4 w-4" />
																			Delete Package
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
							{!isLoading && totalPages > 1 && (
								<div className="flex items-center justify-end space-x-2 mt-4">
									<Button
										variant="outline"
										size="sm"
										onClick={() =>
											setCurrentPage((prev) => Math.max(prev - 1, 1))
										}
										disabled={currentPage === 1}>
										<ChevronLeft className="h-4 w-4" />
									</Button>
									<span className="text-sm">
										Page {currentPage} of {totalPages}
									</span>
									<Button
										variant="outline"
										size="sm"
										onClick={() =>
											setCurrentPage((prev) => Math.min(prev + 1, totalPages))
										}
										disabled={currentPage === totalPages}>
										<ChevronRight className="h-4 w-4" />
									</Button>
								</div>
							)}

							{!isLoading && filteredPackages.length === 0 && (
								<div className="text-center py-8">
									<p className="text-muted-foreground">
										No packages found matching your criteria.
									</p>
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
									<CardTitle>Packages</CardTitle>
									<CardDescription>
										Manage available packages and their configurations
									</CardDescription>
								</div>
								<Dialog
									open={isCreateTypeOpen}
									onOpenChange={(open) => {
										setIsCreateTypeOpen(open);
										if (!open) {
											setEditingType(null);
											setNewPackageType({
												name: "",
												description: "",
												sessionCount: 10,
												price: 100,
												duration: 30,
												category: "",
												customCategory: "",
												useCustomCategory: false,
											});
										}
									}}>
									<DialogTrigger asChild>
										<Button>
											<Plus className="mr-2 h-4 w-4" />
											New Package Type
										</Button>
									</DialogTrigger>
									<DialogContent className="sm:max-w-[500px]">
										<DialogHeader>
											<DialogTitle>
												{editingType
													? "Edit Package Type"
													: "Create New Package Type"}
											</DialogTitle>
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
													onChange={(e) =>
														setNewPackageType((prev) => ({
															...prev,
															name: e.target.value,
														}))
													}
													placeholder="e.g., Personal Training"
												/>
											</div>

											<div className="grid gap-2">
												<Label htmlFor="typeCategory">Package Type *</Label>
												<div className="space-y-3">
													<Select
														value={
															newPackageType.useCustomCategory
																? ""
																: newPackageType.category
														}
														onValueChange={(value) =>
															setNewPackageType((prev) => ({
																...prev,
																category: value,
																useCustomCategory: false,
															}))
														}
														disabled={newPackageType.useCustomCategory}>
														<SelectTrigger>
															<SelectValue placeholder="Select existing package type" />
														</SelectTrigger>
														<SelectContent>
															{availableCategories.map((category) => (
																<SelectItem key={category} value={category}>
																	{category}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
											</div>

											<div className="grid gap-2">
												<Label htmlFor="typeDescription">Description</Label>
												<Input
													id="typeDescription"
													value={newPackageType.description}
													onChange={(e) =>
														setNewPackageType((prev) => ({
															...prev,
															description: e.target.value,
														}))
													}
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
																sessionCount:
																	Number.parseInt(e.target.value) || 10,
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
														setNewPackageType((prev) => ({
															...prev,
															duration: Number.parseInt(e.target.value) || 30,
														}))
													}
												/>
											</div>
										</div>
										<DialogFooter>
											<Button
												variant="outline"
												onClick={() => setIsCreateTypeOpen(false)}>
												Cancel
											</Button>
											<Button
												onClick={
													editingType
														? handleUpdatePackageType
														: handleCreatePackageType
												}>
												{editingType
													? "Update Package Type"
													: "Create Package Type"}
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
											<TableHead>Package Name</TableHead>
											<TableHead>Package Type</TableHead>
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
												<TableCell className="font-medium">
													{type.name}
												</TableCell>
												<TableCell>
													<Badge variant="outline">{type?.type?.name}</Badge>
												</TableCell>
												<TableCell className="max-w-xs truncate">
													{type.description}
												</TableCell>
												<TableCell>{type.sessionCount}</TableCell>
												<TableCell>${type.price}</TableCell>
												<TableCell>{type.duration} days</TableCell>
												<TableCell>
													<Badge
														variant={type.isActive ? "default" : "secondary"}>
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
															<DropdownMenuItem
																onClick={() => handleEditPackageType(type)}>
																<Edit className="mr-2 h-4 w-4" />
																Edit
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() =>
																	handleTogglePackageTypeStatus(
																		type.id,
																		type.isActive
																	)
																}
																className={
																	type.isActive
																		? "text-orange-600"
																		: "text-green-600"
																}>
																{type.isActive ? (
																	<>
																		<Trash2 className="mr-2 h-4 w-4" />
																		Deactivate
																	</>
																) : (
																	<>
																		<CheckCircle className="mr-2 h-4 w-4" />
																		Activate
																	</>
																)}
															</DropdownMenuItem>
															{!type.isActive && (
																<DropdownMenuItem
																	onClick={() =>
																		handleDeletePackageType(type.id)
																	}
																	className="text-red-600">
																	<Trash2 className="mr-2 h-4 w-4" />
																	Delete Permanently
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

							{packageTypes.length === 0 && (
								<div className="text-center py-8">
									<Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
									<p className="text-muted-foreground mb-4">
										No package types available.
									</p>
									<Button onClick={() => setIsCreateTypeOpen(true)}>
										<Plus className="mr-2 h-4 w-4" />
										Create First Package Type
									</Button>
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				{/* Package Types Management Tab */}
				<TabsContent value="packageTypes" className="space-y-4">
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle>Package Types</CardTitle>
									<CardDescription>
										Manage package types (categories) used for packages
									</CardDescription>
								</div>
								<Button
									onClick={() => {
										setEditingPackageType(null);
										setPackageTypeForm({
											name: "",
											description: "",
											color: "",
											icon: "",
											is_active: true,
										});
										setIsEditPackageTypeOpen(true);
									}}>
									<Plus className="mr-2 h-4 w-4" /> New Package Type
								</Button>
							</div>
						</CardHeader>
						<CardContent>
							<div className="rounded-md border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Name</TableHead>
											<TableHead>Description</TableHead>
											<TableHead>Color</TableHead>
											<TableHead>Icon</TableHead>
											<TableHead>Status</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{isLoadingPackageTypes ? (
											<TableRow>
												<TableCell colSpan={6}>Loading...</TableCell>
											</TableRow>
										) : (
											packageTypesList.map((type) => (
												<TableRow key={type.id}>
													<TableCell>{type.name}</TableCell>
													<TableCell>{type.description}</TableCell>
													<TableCell>{type.color}</TableCell>
													<TableCell>{type.icon}</TableCell>
													<TableCell>
														<Badge
															variant={
																type.is_active ? "default" : "secondary"
															}>
															{type.is_active ? "Active" : "Inactive"}
														</Badge>
													</TableCell>
													<TableCell className="text-right">
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button size="icon" variant="ghost">
																	<MoreHorizontal className="h-4 w-4" />
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																<DropdownMenuItem
																	onClick={() => {
																		setEditingPackageType(type);
																		setPackageTypeForm({
																			name: type.name,
																			description: type.description,
																			color: type.color,
																			icon: type.icon,
																			is_active: type.is_active,
																		});
																		setIsEditPackageTypeOpen(true);
																	}}>
																	Edit
																</DropdownMenuItem>
																<DropdownMenuItem
																	onClick={() =>
																		handleToggleCategoryStatus(
																			type.id,
																			type.is_active
																		)
																	}
																	className={
																		type.is_active
																			? "text-orange-600"
																			: "text-green-600"
																	}>
																	{type.is_active ? "Deactivate" : "Activate"}
																</DropdownMenuItem>
																{!type.is_active && (
																	<DropdownMenuItem
																		onClick={() =>
																			handleDeleteCategory(type.id)
																		}
																		className="text-red-600">
																		Delete Permanently
																	</DropdownMenuItem>
																)}
															</DropdownMenuContent>
														</DropdownMenu>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</div>
						</CardContent>
					</Card>
					{/* Edit/Create Package Type Dialog */}
					<Dialog
						open={isEditPackageTypeOpen}
						onOpenChange={setIsEditPackageTypeOpen}>
						<DialogContent className="sm:max-w-[400px]">
							<DialogHeader>
								<DialogTitle>
									{editingPackageType
										? "Edit Package Type"
										: "New Package Type"}
								</DialogTitle>
							</DialogHeader>
							<div className="grid gap-4 py-4">
								<div className="grid gap-2">
									<Label htmlFor="typeName">Name</Label>
									<Input
										id="typeName"
										value={packageTypeForm.name}
										onChange={(e) =>
											setPackageTypeForm((f) => ({
												...f,
												name: e.target.value,
											}))
										}
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="typeDescription">Description</Label>
									<Input
										id="typeDescription"
										value={packageTypeForm.description}
										onChange={(e) =>
											setPackageTypeForm((f) => ({
												...f,
												description: e.target.value,
											}))
										}
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="typeColor">Color</Label>
									<Input
										id="typeColor"
										value={packageTypeForm.color}
										onChange={(e) =>
											setPackageTypeForm((f) => ({
												...f,
												color: e.target.value,
											}))
										}
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="typeIcon">Icon</Label>
									<Input
										id="typeIcon"
										value={packageTypeForm.icon}
										onChange={(e) =>
											setPackageTypeForm((f) => ({
												...f,
												icon: e.target.value,
											}))
										}
									/>
								</div>
							</div>
							<DialogFooter>
								<Button
									variant="outline"
									onClick={() => setIsEditPackageTypeOpen(false)}>
									Cancel
								</Button>
								<Button
									onClick={async () => {
										setIsLoadingPackageTypes(true);
										const supabase = createClient();
										if (editingPackageType) {
											// Update
											await supabase
												.from("package_types")
												.update(packageTypeForm)
												.eq("id", editingPackageType.id);
										} else {
											// Create
											await supabase
												.from("package_types")
												.insert(packageTypeForm);
										}
										setIsEditPackageTypeOpen(false);
										await loadData();
										setIsLoadingPackageTypes(false);
									}}>
									{editingPackageType ? "Save Changes" : "Create"}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</TabsContent>
			</Tabs>

			{/* Edit Package Dialog */}
			<Dialog open={isEditPackageOpen} onOpenChange={setIsEditPackageOpen}>
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle>Edit Assigned Package</DialogTitle>
						<DialogDescription>
							Change the assigned package type, start date, and end date for
							this member.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="editPackageType">Package</Label>
							<Select
								value={editForm.packageTypeId}
								onValueChange={(value) =>
									setEditForm((prev) => ({ ...prev, packageTypeId: value }))
								}>
								<SelectTrigger>
									<SelectValue placeholder="Select a package type" />
								</SelectTrigger>
								<SelectContent>
									{packageTypes
										.sort((a, b) => a.name.localeCompare(b.name))
										.map((type) => (
											<SelectItem key={type.id} value={type.id}>
												{type.name} {type.isActive ? "" : "(Inactive)"}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="editStartDate">Start Date</Label>
							<Input
								id="editStartDate"
								type="date"
								value={editForm.startDate}
								min={minStartDate}
								onChange={(e) =>
									setEditForm((prev) => ({
										...prev,
										startDate: e.target.value,
									}))
								}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="editEndDate">End Date</Label>
							<Input
								id="editEndDate"
								type="date"
								value={editForm.endDate}
								readOnly
							/>
						</div>
					</div>
					<DialogFooter className="flex flex-row gap-2 justify-between">
						<Button
							variant="destructive"
							onClick={async () => {
								if (!editingPackage) return;
								setIsLoadingPackages(true);
								await handleDeleteMemberPackage(editingPackage.id);
								setIsLoadingPackages(false);
								setIsEditPackageOpen(false);
							}}
							disabled={isLoadingPackages}>
							{isLoadingPackages ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								"Delete"
							)}
						</Button>
						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={() => setIsEditPackageOpen(false)}>
								Cancel
							</Button>
							<Button
								onClick={handleSaveEditPackage}
								disabled={isLoadingPackages}>
								{isLoadingPackages ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									"Save Changes"
								)}
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Category Dialog */}
			<Dialog
				open={isDeleteDialogOpen}
				onOpenChange={(open) => {
					setIsDeleteDialogOpen(open);
					if (!open) setPendingDeleteCategory(null);
				}}>
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle>Delete Category</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete{" "}
							<b>{pendingDeleteCategory?.name}</b>? This action cannot be
							undone.
						</DialogDescription>
					</DialogHeader>
					<div className="flex gap-2 justify-end mt-4">
						<Button
							variant="outline"
							onClick={() => {
								setIsDeleteDialogOpen(false);
								setPendingDeleteCategory(null);
							}}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={confirmDeleteCategory}
							disabled={isLoadingPackageTypes}>
							{isLoadingPackageTypes ? "Deleting..." : "Delete Permanently"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
