"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { TableStatusBadge } from "@/components/ui/status-badge";
import { StatusFilter } from "@/components/ui/status-filter";
import { normalizeStatus, isActiveStatus } from "@/types/status";
import { createClient } from "@/utils/supabase/client";
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
	Loader2,
	Trash2,
	Ban,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { logActivity } from "@/utils/activity-logger";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";

// Member and Profile interfaces based on DB schema
interface Profile {
	id: string;
	email: string;
	full_name?: string | null;
	phone?: string | null;
	avatar_url?: string | null;
	last_login_at?: string | null;
}

interface Member {
	id: string;
	user_id: string;
	emergency_contact?: string | null;
	medical_conditions?: string | null;
	date_of_birth?: string | null;
	gender?: string | null;
	address?: string | null;
	height?: number | null;
	weight?: number | null;
	profile_photo_url?: string | null;
	joined_at?: string | null;
	membership_status?: string | null;
	member_number?: string | null;
	fitness_goals?: string | null;
	waiver_signed?: boolean | null;
	profiles?: any; // Accept any shape from Supabase
}

// Add a type for the display data
interface MemberDisplay {
	id: string;
	name: string;
	email: string;
	phone: string;
	joinDate: string;
	status: string;
	packages: string[];
	lastActivity: string;
	memberNumber: string | null;
	profilePhoto: string | null;
	emergencyContact: string | null;
	medicalConditions: string | null;
	dateOfBirth: string | null;
	gender: string | null;
	address: string | null;
	height: number | null;
	weight: number | null;
	fitnessGoals: string | null;
	waiverSigned: boolean | null;
	userId: string;
	packageRequests: number; // Add package requests count
}

interface PackageRequest {
	id: string;
	member_id: string;
	package_id: string;
	status: string;
	requested_at: string;
	notes?: string;
	members?: {
		profiles?: {
			full_name?: string;
			email?: string;
		};
	};
	packages?: {
		name: string;
		price: number;
		session_count: number;
	};
}

export default function MembersPage() {
	const { toast } = useToast();
	const auth = useAuth();
	const router = useRouter();
	const [members, setMembers] = useState<MemberDisplay[]>([]);
	const [filteredMembers, setFilteredMembers] = useState<MemberDisplay[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [itemsPerPage] = useState(10);
	const [packageRequests, setPackageRequests] = useState<PackageRequest[]>([]);
	const [activeTab, setActiveTab] = useState("members");
	const [disableDialogOpen, setDisableDialogOpen] = useState<string | null>(
		null
	);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
	const [actionLoading, setActionLoading] = useState(false);
	const [selectedMember, setSelectedMember] = useState<MemberDisplay | null>(
		null
	);
	const [activateDialogOpen, setActivateDialogOpen] = useState<string | null>(
		null
	);

	useEffect(() => {
		loadMembers();
	}, []);

	useEffect(() => {
		filterMembers();
	}, [members, searchTerm, statusFilter]);

	const loadMembers = async () => {
		try {
			setLoading(true);
			const supabase = createClient();

			// Load package requests
			const { data: requestsData, error: requestsError } = await supabase
				.from("package_requests")
				.select(
					`
					id,
					member_id,
					package_id,
					status,
					requested_at,
					notes,
					members (
						profiles (
							full_name,
							email
						)
					),
					packages (
						name,
						price,
						session_count
					)
				`
				)
				.order("requested_at", { ascending: false });

			if (requestsError) {
				console.error("Error loading package requests:", requestsError);
			} else {
				const transformedRequests = (requestsData || []).map(
					(request: any) => ({
						id: request.id,
						member_id: request.member_id,
						package_id: request.package_id,
						status: request.status,
						requested_at: request.requested_at,
						notes: request.notes,
						members: Array.isArray(request.members)
							? request.members[0]
							: request.members,
						packages: Array.isArray(request.packages)
							? request.packages[0]
							: request.packages,
					})
				);
				setPackageRequests(transformedRequests);
			}

			// Load member packages
			const { data: memberPackagesData, error: packagesError } = await supabase
				.from("member_packages")
				.select(
					`
					id,
					member_id,
					package_id,
					status,
					sessions_remaining,
					sessions_total,
					end_date,
					packages (
						name,
						price,
						session_count
					)
				`
				)
				.eq("status", "active");

			if (packagesError) {
				console.error("Error loading member packages:", packagesError);
			}

			// Load members with profiles
			const { data: membersData, error: membersError } = await supabase
				.from("members")
				.select(
					`
					*,
					profiles (
						id,
						email,
						full_name,
						phone,
						avatar_url,
						last_login_at
					)
				`
				)
				.order("created_at", { ascending: false });

			if (membersError) {
				console.error("Error loading members:", membersError);
				toast({
					title: "Error Loading Members",
					description: "Failed to load members data.",
					variant: "destructive",
				});
				return;
			}

			// Transform the data
			const transformedMembers: MemberDisplay[] = (membersData || []).map(
				(member: Member) => {
					const profile = member.profiles;
					const memberRequests = (requestsData || []).filter(
						(req) => req.member_id === member.id
					);

					// Get member's active packages
					const memberPackages = (memberPackagesData || []).filter(
						(mp) => mp.member_id === member.id && mp.status === "active"
					);

					const packageNames = memberPackages.map((mp) => {
						const pkg = Array.isArray(mp.packages)
							? mp.packages[0]
							: mp.packages;
						return pkg?.name || "Unknown Package";
					});

					return {
						id: member.id,
						name: profile?.full_name || "Unknown Member",
						email: profile?.email || "No email",
						phone: profile?.phone || "No phone",
						joinDate: member.joined_at
							? new Date(member.joined_at).toLocaleDateString()
							: "Unknown",
						status: normalizeStatus(member.membership_status),
						packages: packageNames,
						lastActivity: profile?.last_login_at
							? new Date(profile.last_login_at).toLocaleDateString()
							: "Never",
						memberNumber: member.member_number || null,
						profilePhoto:
							member.profile_photo_url || profile?.avatar_url || null,
						emergencyContact: member.emergency_contact || null,
						medicalConditions: member.medical_conditions || null,
						dateOfBirth: member.date_of_birth || null,
						gender: member.gender || null,
						address: member.address || null,
						height: member.height || null,
						weight: member.weight || null,
						fitnessGoals: member.fitness_goals || null,
						waiverSigned: member.waiver_signed || null,
						userId: member.user_id,
						packageRequests: memberRequests.length,
					};
				}
			);

			setMembers(transformedMembers);
			setFilteredMembers(transformedMembers);
			setTotalPages(Math.ceil(transformedMembers.length / itemsPerPage));
		} catch (error) {
			console.error("Error in loadMembers:", error);
			toast({
				title: "Error",
				description: "An unexpected error occurred while loading members.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const filterMembers = () => {
		let filtered = members;

		// Search filter
		if (searchTerm) {
			filtered = filtered.filter(
				(member) =>
					member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
					member.phone.includes(searchTerm)
			);
		}

		// Status filter using normalized values
		if (statusFilter !== "all") {
			const targetStatus = statusFilter === "active" ? "Active" : "Inactive";
			filtered = filtered.filter((member) => member.status === targetStatus);
		}

		setFilteredMembers(filtered);
		setCurrentPage(1);
	};

	const updateMemberStatus = async (memberId: string, newStatus: string) => {
		try {
			setLoading(true);
			const supabase = createClient();
			const normalizedStatus = normalizeStatus(newStatus);
			const dbStatus = normalizedStatus.toLowerCase(); // Convert to database format

			// Update member status in database
			const { error } = await supabase
				.from("members")
				.update({
					membership_status: dbStatus,
					updated_at: new Date().toISOString(),
				})
				.eq("id", memberId);

			if (error) {
				throw error;
			}

			// Update local state
			const updatedMembers = members.map((member) => {
				if (member.id === memberId) {
					return { ...member, status: normalizedStatus };
				}
				return member;
			});

			setMembers(updatedMembers);

			// Log activity in notifications table
			const memberInfo = members.find((member) => member.id === memberId);
			if (memberInfo) {
				const { error: notificationError } = await supabase
					.from("notifications")
					.insert({
						user_id: memberInfo.userId,
						title: "Membership Status Updated",
						message: `Your membership status has been updated to ${normalizedStatus}`,
						type: "system",
						is_read: false,
						metadata: {
							previous_status: memberInfo.status,
							new_status: normalizedStatus,
							updated_by: auth.user?.id || "admin",
						},
					});

				if (notificationError) {
					console.error("Error creating notification:", notificationError);
				}

				// Log activity in activity_logs table
				if (auth.user?.id) {
					await logActivity({
						action_type: "update",
						entity_type: "member",
						entity_id: memberInfo.id,
						entity_name: memberInfo.name,
						description: `Membership status changed to ${normalizedStatus}`,
						performed_by: auth.user.id,
						metadata: {
							previous_status: memberInfo.status,
							new_status: normalizedStatus,
						},
					});
				}
			}

			toast({
				title: "Member Status Updated",
				description: `${memberInfo?.name} has been marked as ${normalizedStatus}.`,
			});
		} catch (error) {
			console.error("Error updating member status:", error);
			toast({
				title: "Update Failed",
				description: "Failed to update member status. Please try again.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleApproveRequest = async (requestId: string) => {
		try {
			const supabase = createClient();
			const request = packageRequests.find((r) => r.id === requestId);
			if (!request) return;

			// Update request status
			const { error: updateError } = await supabase
				.from("package_requests")
				.update({
					status: "approved",
					approved_by: auth.user?.id,
					approved_at: new Date().toISOString(),
				})
				.eq("id", requestId);

			if (updateError) throw updateError;

			// Create member package
			const { error: packageError } = await supabase
				.from("member_packages")
				.insert({
					member_id: request.member_id,
					package_id: request.package_id,
					start_date: new Date().toISOString().split("T")[0],
					end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
						.toISOString()
						.split("T")[0], // 1 year from now
					sessions_remaining: request.packages?.session_count || 0,
					sessions_total: request.packages?.session_count || 0,
					status: "active",
					activated_at: new Date().toISOString(),
				});

			if (packageError) throw packageError;

			// Create notification for member
			await supabase.from("notifications").insert({
				user_id: request.member_id, // Use member_id directly since we don't have profile id
				title: "Package Request Approved",
				message: `Your request for ${request.packages?.name} package has been approved!`,
				type: "alert",
				is_read: false,
				created_at: new Date().toISOString(),
			});

			// Log activity
			await logActivity({
				action_type: "update",
				entity_type: "member",
				entity_id: request.member_id,
				entity_name: request.members?.profiles?.full_name || "Unknown Member",
				description: `Package request approved: ${request.packages?.name}`,
				performed_by: auth.user?.id || "admin",
				metadata: {
					memberName: request.members?.profiles?.full_name,
					packageName: request.packages?.name,
					packagePrice: request.packages?.price,
				},
			});

			// Update local state
			setPackageRequests((prev) => prev.filter((r) => r.id !== requestId));
			loadMembers(); // Reload to update counts

			toast({
				title: "Request Approved",
				description:
					"Package request has been approved and member package created.",
			});
		} catch (error) {
			console.error("Error approving request:", error);
			toast({
				title: "Error",
				description: "Failed to approve package request.",
				variant: "destructive",
			});
		}
	};

	const handleRejectRequest = async (requestId: string) => {
		try {
			const supabase = createClient();
			const request = packageRequests.find((r) => r.id === requestId);
			if (!request) return;

			// Update request status
			const { error: updateError } = await supabase
				.from("package_requests")
				.update({
					status: "rejected",
					approved_by: auth.user?.id,
					approved_at: new Date().toISOString(),
				})
				.eq("id", requestId);

			if (updateError) throw updateError;

			// Create notification for member
			await supabase.from("notifications").insert({
				user_id: request.member_id, // Use member_id directly since we don't have profile id
				title: "Package Request Rejected",
				message: `Your request for ${request.packages?.name} package has been rejected. Please contact admin for more information.`,
				type: "alert",
				is_read: false,
				created_at: new Date().toISOString(),
			});

			// Log activity
			await logActivity({
				action_type: "update",
				entity_type: "member",
				entity_id: request.member_id,
				entity_name: request.members?.profiles?.full_name || "Unknown Member",
				description: `Package request rejected: ${request.packages?.name}`,
				performed_by: auth.user?.id || "admin",
				metadata: {
					memberName: request.members?.profiles?.full_name,
					packageName: request.packages?.name,
				},
			});

			// Update local state
			setPackageRequests((prev) => prev.filter((r) => r.id !== requestId));
			loadMembers(); // Reload to update counts

			toast({
				title: "Request Rejected",
				description: "Package request has been rejected.",
			});
		} catch (error) {
			console.error("Error rejecting request:", error);
			toast({
				title: "Error",
				description: "Failed to reject package request.",
				variant: "destructive",
			});
		}
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "pending":
				return <Badge variant="secondary">Pending</Badge>;
			case "approved":
				return <Badge variant="default">Approved</Badge>;
			case "rejected":
				return <Badge variant="destructive">Rejected</Badge>;
			default:
				return <Badge variant="outline">{status}</Badge>;
		}
	};

	// Calculate statistics with normalized status
	const stats = {
		totalMembers: members.length,
		activeMembers: members.filter((member) => isActiveStatus(member.status))
			.length,
		inactiveMembers: members.filter((member) => !isActiveStatus(member.status))
			.length,
	};

	// Pagination
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedMembers = filteredMembers.slice(
		startIndex,
		startIndex + itemsPerPage
	);

	// Disable member handler
	const handleDisableMember = async (member: MemberDisplay) => {
		setActionLoading(true);
		try {
			const supabase = createClient();
			// 1. Set profile is_active to false
			const { error: profileError } = await supabase
				.from("profiles")
				.update({ is_active: false, updated_at: new Date().toISOString() })
				.eq("id", member.userId);
			// 2. Set membership_status to 'inactive'
			const { error: memberError } = await supabase
				.from("members")
				.update({
					membership_status: "inactive",
					updated_at: new Date().toISOString(),
				})
				.eq("id", member.id);
			if (profileError || memberError) {
				throw profileError || memberError;
			}
			// 3. Log activity
			await logActivity({
				action_type: "update",
				entity_type: "member",
				entity_id: member.id,
				entity_name: member.name,
				description: `Member disabled`,
				performed_by: auth.user?.id || "admin",
				metadata: { previous_status: member.status, new_status: "Inactive" },
			});
			// 4. Update local state
			setMembers((prev) =>
				prev.map((m) => (m.id === member.id ? { ...m, status: "Inactive" } : m))
			);
			toast({
				title: "Member Disabled",
				description: `${member.name} has been disabled.`,
			});
		} catch (error) {
			console.error("Error disabling member:", error);
			toast({
				title: "Disable Failed",
				description: "Failed to disable member.",
				variant: "destructive",
			});
		} finally {
			setActionLoading(false);
			setDisableDialogOpen(null);
		}
	};
	// Delete member handler
	const handleDeleteMember = async (member: MemberDisplay) => {
		setActionLoading(true);
		try {
			// Call API route to delete user
			const res = await fetch("/api/admin/delete-user", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId: member.userId }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to delete user");
			// Log activity
			await logActivity({
				action_type: "delete",
				entity_type: "member",
				entity_id: member.id,
				entity_name: member.name,
				description: `Member deleted`,
				performed_by: auth.user?.id || "admin",
				metadata: { email: member.email },
			});
			// Remove from local state
			setMembers((prev) => prev.filter((m) => m.id !== member.id));
			toast({
				title: "Member Deleted",
				description: `${member.name} has been deleted.`,
			});
		} catch (error) {
			console.error("Error deleting member:", error);
			toast({
				title: "Delete Failed",
				description: "Failed to delete member.",
				variant: "destructive",
			});
		} finally {
			setActionLoading(false);
			setDeleteDialogOpen(null);
		}
	};

	// Activate member handler
	const handleActivateMember = async (member: MemberDisplay) => {
		setActionLoading(true);
		try {
			const supabase = createClient();
			// 1. Set profile is_active to true
			const { error: profileError } = await supabase
				.from("profiles")
				.update({ is_active: true, updated_at: new Date().toISOString() })
				.eq("id", member.userId);
			// 2. Set membership_status to 'active'
			const { error: memberError } = await supabase
				.from("members")
				.update({
					membership_status: "active",
					updated_at: new Date().toISOString(),
				})
				.eq("id", member.id);
			if (profileError || memberError) {
				throw profileError || memberError;
			}
			// 3. Log activity
			await logActivity({
				action_type: "update",
				entity_type: "member",
				entity_id: member.id,
				entity_name: member.name,
				description: `Member activated`,
				performed_by: auth.user?.id || "admin",
				metadata: { previous_status: member.status, new_status: "Active" },
			});
			// 4. Update local state
			setMembers((prev) =>
				prev.map((m) => (m.id === member.id ? { ...m, status: "Active" } : m))
			);
			toast({
				title: "Member Activated",
				description: `${member.name} has been activated.`,
			});
		} catch (error) {
			console.error("Error activating member:", error);
			toast({
				title: "Activate Failed",
				description: "Failed to activate member.",
				variant: "destructive",
			});
		} finally {
			setActionLoading(false);
			setActivateDialogOpen(null);
		}
	};

	return (
		<div className="container mx-auto max-w-7xl py-6 space-y-6">
			{/* Header */}
			<div className="relative mb-8">
				<div className="absolute inset-0 h-32 bg-gradient-to-br from-blue-900/60 to-gray-900/80 rounded-2xl blur-lg -z-10" />
				<div className="flex items-center justify-between gap-6 p-6 rounded-2xl shadow-xl bg-background/80 dark:bg-background/60 backdrop-blur border border-border">
					<div className="flex items-center gap-6">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => router.push("/admin")}
							className="mr-2"
							aria-label="Go back">
							<ArrowLeft className="h-5 w-5" />
						</Button>
						<div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-3xl font-bold border-4 border-primary shadow-lg">
							<Users className="w-10 h-10 text-primary" />
						</div>
						<div>
							<div className="font-bold text-2xl flex items-center gap-2">
								Members Management
							</div>
							<div className="text-muted-foreground text-sm">
								Manage gym members, view profiles, and handle package requests
							</div>
						</div>
					</div>
					<Button asChild>
						<Link href="/admin/members/new">
							<UserPlus className="mr-2 h-4 w-4" />
							Add Member
						</Link>
					</Button>
				</div>
			</div>

			{/* Tabs */}
			<div className="flex space-x-4 border-b">
				<button
					onClick={() => setActiveTab("members")}
					className={`pb-2 px-1 border-b-2 font-medium text-sm ${
						activeTab === "members"
							? "border-primary text-primary"
							: "border-transparent text-muted-foreground hover:text-foreground"
					}`}>
					Members ({members.length})
				</button>
				<button
					onClick={() => setActiveTab("requests")}
					className={`pb-2 px-1 border-b-2 font-medium text-sm ${
						activeTab === "requests"
							? "border-primary text-primary"
							: "border-transparent text-muted-foreground hover:text-foreground"
					}`}>
					Package Requests (
					{packageRequests.filter((r) => r.status === "pending").length})
				</button>
			</div>

			{/* Members Tab */}
			{activeTab === "members" && (
				<>
					{/* Search and Filters */}
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-4">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
								<Input
									placeholder="Search members by name, email, or phone..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="max-w-sm pl-10"
								/>
							</div>
							<StatusFilter
								value={statusFilter}
								onValueChange={setStatusFilter}
								className="w-[180px]"
								disabled={loading}
							/>
						</div>
					</div>

					{/* Members Table */}
					<Card className="rounded-2xl shadow-xl dark:bg-background/80 mb-6">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Users className="h-5 w-5" />
								Members
							</CardTitle>
							<CardDescription>
								{filteredMembers.length} member
								{filteredMembers.length !== 1 ? "s" : ""} found
							</CardDescription>
						</CardHeader>
						<CardContent>
							{loading ? (
								<div className="flex items-center justify-center h-32">
									<p className="text-muted-foreground">Loading members...</p>
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Member</TableHead>
											<TableHead>Contact</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Join Date</TableHead>
											<TableHead>Packages</TableHead>
											<TableHead>Package Requests</TableHead>
											<TableHead>Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{paginatedMembers.map(
											(member) => (
												console.log(member),
												(
													<TableRow key={member.id}>
														<TableCell>
															<div className="flex items-center space-x-3">
																<div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
																	{member.profilePhoto ? (
																		<img
																			src={member.profilePhoto}
																			alt={member.name}
																			className="w-10 h-10 rounded-full object-cover"
																		/>
																	) : (
																		<span className="text-sm font-medium">
																			{member.name.charAt(0).toUpperCase()}
																		</span>
																	)}
																</div>
																<div>
																	<div className="font-medium">
																		{member.name}
																	</div>
																	<div className="text-sm text-muted-foreground">
																		{member.memberNumber || "No member number"}
																	</div>
																</div>
															</div>
														</TableCell>
														<TableCell>
															<div>
																<div className="text-sm">{member.email}</div>
																<div className="text-sm text-muted-foreground">
																	{member.phone}
																</div>
															</div>
														</TableCell>
														<TableCell>
															<TableStatusBadge status={member.status} />
														</TableCell>
														<TableCell>{member.joinDate}</TableCell>
														<TableCell>
															{member.packages.length > 0 ? (
																<div className="flex flex-wrap gap-1">
																	{member.packages.map((pkg, index) => (
																		<Badge
																			key={index}
																			variant="outline"
																			className="text-xs">
																			{pkg}
																		</Badge>
																	))}
																</div>
															) : (
																<span className="text-muted-foreground">
																	No packages
																</span>
															)}
														</TableCell>
														<TableCell>
															{member.packageRequests > 0 ? (
																<Badge variant="secondary">
																	{member.packageRequests} request
																	{member.packageRequests !== 1 ? "s" : ""}
																</Badge>
															) : (
																<span className="text-muted-foreground">
																	None
																</span>
															)}
														</TableCell>
														<TableCell>
															<DropdownMenu>
																<DropdownMenuTrigger asChild>
																	<Button
																		variant="ghost"
																		size="sm"
																		disabled={loading}>
																		<MoreHorizontal className="h-4 w-4" />
																	</Button>
																</DropdownMenuTrigger>
																<DropdownMenuContent align="end">
																	<DropdownMenuItem asChild>
																		<Link
																			href={`/admin/members/${member.id}/manage`}>
																			<Edit className="mr-2 h-4 w-4" />
																			Edit Member
																		</Link>
																	</DropdownMenuItem>
																	{member.status === "inactive" ? (
																		<DropdownMenuItem
																			onClick={() => {
																				setSelectedMember(member);
																				setActivateDialogOpen(member.id);
																			}}
																			disabled={loading}>
																			<UserCheck className="mr-2 h-4 w-4 text-green-600" />
																			Activate Member
																		</DropdownMenuItem>
																	) : (
																		<DropdownMenuItem
																			onClick={() => {
																				setSelectedMember(member);
																				setDisableDialogOpen(member.id);
																			}}
																			disabled={
																				loading || member.status === "Inactive"
																			}>
																			<Ban className="mr-2 h-4 w-4 text-yellow-600" />
																			Disable Member
																		</DropdownMenuItem>
																	)}
																	<DropdownMenuItem
																		onClick={() => {
																			setSelectedMember(member);
																			setDeleteDialogOpen(member.id);
																		}}
																		disabled={loading}>
																		<Trash2 className="mr-2 h-4 w-4 text-red-600" />
																		Delete Member
																	</DropdownMenuItem>
																</DropdownMenuContent>
															</DropdownMenu>
														</TableCell>
													</TableRow>
												)
											)
										)}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between">
							<div className="text-sm text-muted-foreground">
								Showing {startIndex + 1} to{" "}
								{Math.min(startIndex + itemsPerPage, filteredMembers.length)} of{" "}
								{filteredMembers.length} members
							</div>
							<div className="flex items-center space-x-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage(currentPage - 1)}
									disabled={currentPage === 1}>
									<ChevronLeft className="h-4 w-4" />
									Previous
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage(currentPage + 1)}
									disabled={currentPage === totalPages}>
									Next
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</>
			)}

			{/* Package Requests Tab */}
			{activeTab === "requests" && (
				<Card>
					<CardHeader>
						<CardTitle>Package Requests</CardTitle>
						<CardDescription>
							Manage member requests for new packages
						</CardDescription>
					</CardHeader>
					<CardContent>
						{loading ? (
							<div className="flex items-center justify-center h-32">
								<p className="text-muted-foreground">
									Loading package requests...
								</p>
							</div>
						) : packageRequests.length === 0 ? (
							<div className="text-center py-8">
								<Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
								<p className="text-muted-foreground">
									No package requests found
								</p>
							</div>
						) : (
							<div className="space-y-4">
								{packageRequests.map((request) => (
									<div
										key={request.id}
										className="p-4 border rounded-lg hover:bg-muted/50">
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<h4 className="font-medium">
													{request.packages?.name} Package Request
												</h4>
												<p className="text-sm text-muted-foreground">
													Requested by:{" "}
													{request.members?.profiles?.full_name ||
														"Unknown Member"}
												</p>
												<p className="text-sm text-muted-foreground">
													Email:{" "}
													{request.members?.profiles?.email || "No email"}
												</p>
												<p className="text-sm text-muted-foreground">
													Requested on:{" "}
													{new Date(request.requested_at).toLocaleDateString()}
												</p>
												<p className="text-sm text-muted-foreground">
													Price: ${request.packages?.price}
												</p>
												<p className="text-sm text-muted-foreground">
													Sessions: {request.packages?.session_count}
												</p>
												{request.notes && (
													<p className="text-sm text-muted-foreground mt-2">
														<strong>Notes:</strong> {request.notes}
													</p>
												)}
											</div>
											<div className="flex flex-col items-end gap-2">
												{getStatusBadge(request.status)}
												{request.status === "pending" && (
													<div className="flex gap-2">
														<Button
															variant="outline"
															size="sm"
															onClick={() => handleApproveRequest(request.id)}
															className="text-green-600 hover:text-green-700">
															Approve
														</Button>
														<Button
															variant="outline"
															size="sm"
															onClick={() => handleRejectRequest(request.id)}
															className="text-red-600 hover:text-red-700">
															Reject
														</Button>
													</div>
												)}
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			)}
			{/* Disable Member Dialog */}
			<Dialog
				open={!!disableDialogOpen}
				onOpenChange={(open) =>
					setDisableDialogOpen(open ? disableDialogOpen : null)
				}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Disable Member</DialogTitle>
					</DialogHeader>
					<p>
						Are you sure you want to disable <b>{selectedMember?.name}</b>? This
						will prevent them from logging in or booking sessions, but their
						data will be retained.
					</p>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDisableDialogOpen(null)}
							disabled={actionLoading}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() =>
								selectedMember && handleDisableMember(selectedMember)
							}
							disabled={actionLoading}>
							{actionLoading ? (
								<Loader2 className="animate-spin w-4 h-4 mr-2" />
							) : null}
							Disable
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			{/* Delete Member Dialog */}
			<Dialog
				open={!!deleteDialogOpen}
				onOpenChange={(open) =>
					setDeleteDialogOpen(open ? deleteDialogOpen : null)
				}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Member</DialogTitle>
					</DialogHeader>
					<p>
						Are you sure you want to <b>permanently delete</b>{" "}
						<b>{selectedMember?.name}</b>? This action cannot be undone and will
						remove all their data.
					</p>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDeleteDialogOpen(null)}
							disabled={actionLoading}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() =>
								selectedMember && handleDeleteMember(selectedMember)
							}
							disabled={actionLoading}>
							{actionLoading ? (
								<Loader2 className="animate-spin w-4 h-4 mr-2" />
							) : null}
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			{/* Activate Member Dialog */}
			<Dialog
				open={!!activateDialogOpen}
				onOpenChange={(open) =>
					setActivateDialogOpen(open ? activateDialogOpen : null)
				}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Activate Member</DialogTitle>
					</DialogHeader>
					<p>
						Are you sure you want to activate <b>{selectedMember?.name}</b>?
						This will allow them to log in and book sessions again.
					</p>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setActivateDialogOpen(null)}
							disabled={actionLoading}>
							Cancel
						</Button>
						<Button
							variant="default"
							onClick={() =>
								selectedMember && handleActivateMember(selectedMember)
							}
							disabled={actionLoading}>
							{actionLoading ? (
								<Loader2 className="animate-spin w-4 h-4 mr-2" />
							) : null}
							Activate
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
