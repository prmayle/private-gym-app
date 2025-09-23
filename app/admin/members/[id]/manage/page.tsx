"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInputField } from "@/components/ui/phone-input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { logActivity } from "@/utils/activity-logger";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Edit, Trash2, User } from "lucide-react";
import { Loader2 } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { MemberProfileHeader } from "@/components/member-profile-header";
import { PageHeader } from "@/components/page-header";

// --- Types ---
interface Profile {
	id: string;
	email: string;
	full_name?: string | null;
	phone?: string | null;
	avatar_url?: string | null;
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
	profiles?: any;
	notes?: string | null;
}

interface Package {
	id: string;
	name: string;
	description?: string;
	price: number;
	duration_days?: number;
	session_count?: number;
	features?: any;
	is_active?: boolean;
}

interface MemberPackage {
	id: string;
	member_id: string;
	package_id: string;
	start_date: string;
	end_date?: string;
	sessions_remaining?: number;
	status?: string;
	purchased_at?: string;
	packages?: Package;
}

interface MemberGoal {
	id: string;
	member_id: string;
	goal_type: string;
	target_value?: number;
	target_unit?: string;
	current_value?: number;
	target_date?: string;
	status?: string;
	notes?: string;
	created_at?: string;
	updated_at?: string;
}

// Add PackageRequest interface
interface PackageRequest {
	id: string;
	member_id: string;
	package_id: string;
	status: string;
	requested_at: string;
	notes?: string;
	packages?: {
		name: string;
		price: number;
		session_count: number;
	};
}

// --- Main Page ---
export default function ManageMemberPage() {
	const params = useParams();
	const router = useRouter();
	const searchParams = useSearchParams();
	const { toast } = useToast();
	const { user } = useAuth();
	const memberId = Array.isArray(params.id) ? params.id[0] : params.id;
	// --- Tab state respects ?tab= param ---
	const initialTab = searchParams.get("tab") || "info";
	const [tab, setTab] = useState(initialTab);
	const [member, setMember] = useState<Member | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [packages, setPackages] = useState<MemberPackage[]>([]);
	const [allPackages, setAllPackages] = useState<Package[]>([]);
	const [goals, setGoals] = useState<MemberGoal[]>([]);
	const [packageRequests, setPackageRequests] = useState<PackageRequest[]>([]);
	const [loading, setLoading] = useState(true);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editForm, setEditForm] = useState<any>({});
	const [packageDialogOpen, setPackageDialogOpen] = useState(false);
	const [goalDialogOpen, setGoalDialogOpen] = useState(false);
	const [goalEdit, setGoalEdit] = useState<MemberGoal | null>(null);
	const [goalForm, setGoalForm] = useState<any>({});

	// --- Data reload helpers ---
	const loadMember = async () => {
		const supabase = createClient();
		const { data, error } = await supabase
			.from("members")
			.select(
				`*, profiles!members_user_id_fkey (id, email, full_name, phone, avatar_url), member_goals (id, goal_type, target_value, target_unit, current_value, target_date, status, notes, created_at, updated_at)`
			)
			.eq("id", memberId)
			.single();
		if (!error && data) {
			setMember(data);
			setProfile(
				Array.isArray(data.profiles) ? data.profiles[0] : data.profiles
			);
			setEditForm({
				full_name:
					(Array.isArray(data.profiles)
						? data.profiles[0]?.full_name
						: data.profiles?.full_name) || "",
				email:
					(Array.isArray(data.profiles)
						? data.profiles[0]?.email
						: data.profiles?.email) || "",
				phone:
					(Array.isArray(data.profiles)
						? data.profiles[0]?.phone
						: data.profiles?.phone) || "",
				address: data.address || "",
				emergency_contact: data.emergency_contact || "",
				medical_conditions: data.medical_conditions || "",
				date_of_birth: data.date_of_birth || "",
				gender: data.gender || "",
				height: data.height || "",
				weight: data.weight || "",
				fitness_goals: data.fitness_goals || "",
				notes: data.notes || "",
			});
		}
	};
	const loadPackages = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("member_packages")
			.select(`*, packages (id, name, price, duration_days, session_count)`)
			.eq("member_id", memberId);
		setPackages(data || []);
	};
	const loadAllPackages = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("packages")
			.select("*")
			.eq("is_active", true);
		setAllPackages(data || []);
	};
	const loadGoals = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("member_goals")
			.select("*")
			.eq("member_id", memberId)
			.order("created_at", { ascending: false });
		setGoals(data || []);
	};
	const loadPackageRequests = async () => {
		const supabase = createClient();
		const { data, error } = await supabase
			.from("package_requests")
			.select(
				`id, member_id, package_id, status, requested_at, notes, packages (name, price, session_count)`
			)
			.eq("member_id", memberId)
			.order("requested_at", { ascending: false });
		if (!error && data) {
			const transformed = (data || []).map((request: any) => ({
				...request,
				packages: Array.isArray(request.packages)
					? request.packages[0]
					: request.packages,
			}));
			setPackageRequests(transformed);
		}
	};

	// --- Load Data on mount and after actions ---
	useEffect(() => {
		if (!memberId) return;
		setLoading(true);
		Promise.all([
			loadMember(),
			loadPackages(),
			loadAllPackages(),
			loadGoals(),
			loadPackageRequests(), // Add this
		]).finally(() => setLoading(false));
	}, [memberId]);

	// --- Tab URL sync ---
	useEffect(() => {
		const url = new URL(window.location.href);
		url.searchParams.set("tab", tab);
		window.history.replaceState({}, "", url.toString());
	}, [tab]);

	// --- Edit Member Info ---
	const handleEditSave = async () => {
		if (!member || !user) return;
		setLoading(true);
		const supabase = createClient();
		const { error: memberError } = await supabase
			.from("members")
			.update({
				address: editForm.address,
				emergency_contact: editForm.emergency_contact,
				medical_conditions: editForm.medical_conditions,
				date_of_birth: editForm.date_of_birth,
				gender: editForm.gender,
				height: editForm.height ? Number(editForm.height) : null,
				weight: editForm.weight ? Number(editForm.weight) : null,
				fitness_goals: editForm.fitness_goals || null,
				notes: editForm.notes || null,
			})
			.eq("id", member.id);
		const { error: profileError } = await supabase
			.from("profiles")
			.update({
				full_name: editForm.full_name,
				email: editForm.email,
				phone: editForm.phone,
			})
			.eq("id", member.user_id);
		if (!memberError && !profileError) {
			toast({ title: "Saved", description: "Member info updated." });
			setEditDialogOpen(false);
			await logActivity({
				action_type: "update",
				entity_type: "member",
				entity_id: member.id,
				entity_name: editForm.full_name,
				description: "Member info updated",
				performed_by: user.id,
				metadata: { ...editForm },
			});
			await loadMember();
		} else {
			toast({
				title: "Error",
				description: "Failed to update member info.",
				variant: "destructive",
			});
		}
		setLoading(false);
	};

	// --- Add Package ---
	const [selectedPackageId, setSelectedPackageId] = useState("");
	const [packageStartDate, setPackageStartDate] = useState("");
	const handleAddPackage = async () => {
		if (!member || !user || !selectedPackageId || !packageStartDate) return;
		setLoading(true);
		const supabase = createClient();
		const pkg = allPackages.find((p) => p.id === selectedPackageId);
		if (!pkg) return;
		const endDate = pkg.duration_days
			? new Date(
					new Date(packageStartDate).getTime() +
						pkg.duration_days * 24 * 60 * 60 * 1000
			  )
					.toISOString()
					.split("T")[0]
			: null;
		const { error } = await supabase.from("member_packages").insert({
			member_id: member.id,
			package_id: pkg.id,
			start_date: packageStartDate,
			end_date: endDate,
			status: "active",
			sessions_remaining: pkg.session_count || 0,
			sessions_total: pkg.session_count || 0,
			purchased_at: new Date().toISOString(),
		});
		if (!error) {
			toast({ title: "Package Added" });
			setPackageDialogOpen(false);
			await logActivity({
				action_type: "create",
				entity_type: "package",
				entity_id: pkg.id,
				entity_name: pkg.name,
				description: `Package assigned to member ${profile?.full_name}`,
				performed_by: user.id,
				metadata: { package: pkg, member: member.id },
			});
			await loadPackages();
		} else {
			toast({
				title: "Error",
				description: "Failed to add package.",
				variant: "destructive",
			});
		}
		setLoading(false);
	};

	// --- Remove Package ---
	const handleRemovePackage = async (memberPackageId: string) => {
		if (!member || !user) return;
		setLoading(true);
		const supabase = createClient();
		const { error } = await supabase
			.from("member_packages")
			.delete()
			.eq("id", memberPackageId);
		if (!error) {
			toast({ title: "Package Removed" });
			await logActivity({
				action_type: "delete",
				entity_type: "package",
				entity_id: memberPackageId,
				entity_name: "Member Package",
				description: `Package removed from member ${profile?.full_name}`,
				performed_by: user.id,
				metadata: { member: member.id },
			});
			await loadPackages();
		} else {
			toast({
				title: "Error",
				description: "Failed to remove package.",
				variant: "destructive",
			});
		}
		setLoading(false);
	};

	// --- Add/Edit Goal/Body Composition ---
	const handleGoalSave = async () => {
		if (!member || !user) return;
		setLoading(true);
		const supabase = createClient();
		let error;
		if (goalEdit) {
			({ error } = await supabase
				.from("member_goals")
				.update({ ...goalForm, updated_at: new Date().toISOString() })
				.eq("id", goalEdit.id));
		} else {
			({ error } = await supabase.from("member_goals").insert({
				...goalForm,
				member_id: member.id,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			}));
		}
		if (!error) {
			toast({ title: "Goal Saved" });
			setGoalDialogOpen(false);
			await logActivity({
				action_type: goalEdit ? "update" : "create",
				entity_type: "member",
				entity_id: goalEdit ? goalEdit.id : "new",
				entity_name: goalForm.goal_type,
				description: goalEdit ? "Goal updated" : "Goal created",
				performed_by: user.id,
				metadata: { ...goalForm },
			});
			await loadGoals();
		} else {
			toast({
				title: "Error",
				description: "Failed to save goal.",
				variant: "destructive",
			});
		}
		setLoading(false);
	};
	const handleGoalDelete = async (goalId: string) => {
		if (!member || !user) return;
		setLoading(true);
		const supabase = createClient();
		const { error } = await supabase
			.from("member_goals")
			.delete()
			.eq("id", goalId);
		if (!error) {
			toast({ title: "Goal Deleted" });
			await logActivity({
				action_type: "delete",
				entity_type: "member",
				entity_id: goalId,
				entity_name: "Goal",
				description: "Goal deleted",
				performed_by: user.id,
				metadata: {},
			});
			await loadGoals();
		} else {
			toast({
				title: "Error",
				description: "Failed to delete goal.",
				variant: "destructive",
			});
		}
		setLoading(false);
	};

	// --- Approve/Reject Package Request Handlers ---
	const handleApproveRequest = async (requestId: string) => {
		if (!user) return;
		setLoading(true);
		const supabase = createClient();
		const request = packageRequests.find((r) => r.id === requestId);
		if (!request) return;
		// Update request status
		const { error: updateError } = await supabase
			.from("package_requests")
			.update({
				status: "approved",
				approved_by: user.id,
				approved_at: new Date().toISOString(),
			})
			.eq("id", requestId);
		if (updateError) {
			toast({
				title: "Error",
				description: "Failed to approve request.",
				variant: "destructive",
			});
			setLoading(false);
			return;
		}
		// Create member package
		const { error: packageError } = await supabase
			.from("member_packages")
			.insert({
				member_id: request.member_id,
				package_id: request.package_id,
				start_date: new Date().toISOString().split("T")[0],
				end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0],
				sessions_remaining: request.packages?.session_count || 0,
				sessions_total: request.packages?.session_count || 0,
				status: "active",
				activated_at: new Date().toISOString(),
			});
		if (packageError) {
			toast({
				title: "Error",
				description: "Failed to create member package.",
				variant: "destructive",
			});
			setLoading(false);
			return;
		}
		await supabase.from("notifications").insert({
			user_id: request.member_id,
			title: "Package Request Approved",
			message: `Your request for ${request.packages?.name} package has been approved!`,
			type: "alert",
			is_read: false,
			created_at: new Date().toISOString(),
		});
		await logActivity({
			action_type: "update",
			entity_type: "member",
			entity_id: request.member_id,
			entity_name: profile?.full_name || "Unknown Member",
			description: `Package request approved: ${request.packages?.name}`,
			performed_by: user.id,
			metadata: {
				memberName: profile?.full_name,
				packageName: request.packages?.name,
				packagePrice: request.packages?.price,
			},
		});
		await loadPackageRequests();
		await loadPackages();
		toast({
			title: "Request Approved",
			description:
				"Package request has been approved and member package created.",
		});
		setLoading(false);
	};

	const handleRejectRequest = async (requestId: string) => {
		if (!user) return;
		setLoading(true);
		const supabase = createClient();
		const request = packageRequests.find((r) => r.id === requestId);
		if (!request) return;
		const { error: updateError } = await supabase
			.from("package_requests")
			.update({
				status: "rejected",
				approved_by: user.id,
				approved_at: new Date().toISOString(),
			})
			.eq("id", requestId);
		if (updateError) {
			toast({
				title: "Error",
				description: "Failed to reject request.",
				variant: "destructive",
			});
			setLoading(false);
			return;
		}
		await supabase.from("notifications").insert({
			user_id: request.member_id,
			title: "Package Request Rejected",
			message: `Your request for ${request.packages?.name} package has been rejected.`,
			type: "alert",
			is_read: false,
			created_at: new Date().toISOString(),
		});
		await logActivity({
			action_type: "update",
			entity_type: "member",
			entity_id: request.member_id,
			entity_name: profile?.full_name || "Unknown Member",
			description: `Package request rejected: ${request.packages?.name}`,
			performed_by: user.id,
			metadata: {
				memberName: profile?.full_name,
				packageName: request.packages?.name,
				packagePrice: request.packages?.price,
			},
		});
		await loadPackageRequests();
		toast({
			title: "Request Rejected",
			description: "Package request has been rejected.",
		});
		setLoading(false);
	};

	// --- Render ---
	if (loading)
		return (
			<div className="flex items-center justify-center min-h-[300px]">
				<Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
			</div>
		);
	if (!member) return <div className="p-8">Member not found.</div>;

	return (
		<div className="container mx-auto py-6 max-w-4xl">
			{/* <div className="relative mb-8">
				<div className="absolute inset-0 h-40 bg-gradient-to-br from-blue-900/60 to-gray-900/80 rounded-2xl blur-lg -z-10" />
				<div className="flex items-center gap-6 p-6 rounded-2xl shadow-xl bg-background/80 dark:bg-background/60 backdrop-blur border border-border">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => router.push("/admin/members")}
						className="mr-2">
						<span className="sr-only">Back</span>&larr;
					</Button>
					{profile?.avatar_url ? (
						<img
							src={profile.avatar_url}
							alt="Avatar"
							className="w-20 h-20 rounded-full object-cover border-4 border-primary shadow-lg"
						/>
					) : (
						<div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-3xl font-bold border-4 border-primary shadow-lg">
							{profile?.full_name?.[0] || "?"}
						</div>
					)}
					<div>
						<div className="font-bold text-2xl flex items-center gap-2">
							{profile?.full_name}
							{member?.membership_status && (
								<Badge
									variant={
										member.membership_status === "active"
											? "default"
											: "destructive"
									}
									className="ml-2">
									{member.membership_status.charAt(0).toUpperCase() +
										member.membership_status.slice(1)}
								</Badge>
							)}
						</div>
						<div className="text-muted-foreground text-sm">
							{profile?.email}
						</div>
						<div className="text-muted-foreground text-xs">
							Joined:{" "}
							{member?.joined_at
								? new Date(member.joined_at).toLocaleDateString()
								: "-"}
						</div>
					</div>
				</div>
			</div> */}

			<PageHeader
				title={profile?.full_name || ""}
				subtitle={member.membership_status?.charAt(0).toUpperCase() +
					member.membership_status?.slice(1) + " - " + profile?.email + " - joined at" + new Date(member.joined_at).toLocaleDateString()}
				icon={User}
			/>
			<Tabs value={tab} onValueChange={setTab} className="w-full">
				<TabsList className="mb-4">
					<TabsTrigger value="info">Info</TabsTrigger>
					<TabsTrigger value="packages">Packages</TabsTrigger>
					<TabsTrigger value="goals">Goals / Body Composition</TabsTrigger>
				</TabsList>
				{/* Info Tab */}
				<TabsContent value="info">
					<Card className="mb-6 rounded-2xl shadow-xl dark:bg-background/80">
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle>Member Info</CardTitle>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setEditDialogOpen(true)}
								className="ml-2">
								<Edit className="w-4 h-4 mr-1" />
								Edit
							</Button>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label>Name</Label>
									<div>{profile?.full_name}</div>
								</div>
								<div>
									<Label>Email</Label>
									<div>{profile?.email}</div>
								</div>
								<div>
									<Label>Phone</Label>
									<div>{profile?.phone}</div>
								</div>
								<div>
									<Label>Address</Label>
									<div>{member.address}</div>
								</div>
								<div>
									<Label>Emergency Contact</Label>
									<div>{member.emergency_contact}</div>
								</div>
								<div>
									<Label>Medical Conditions</Label>
									<div>{member.medical_conditions}</div>
								</div>
								<div>
									<Label>Date of Birth</Label>
									<div>{member.date_of_birth}</div>
								</div>
								<div>
									<Label>Gender</Label>
									<div>{member.gender}</div>
								</div>
								<div>
									<Label>Height</Label>
									<div>{member.height}</div>
								</div>
								<div>
									<Label>Weight</Label>
									<div>{member.weight}</div>
								</div>
								<div>
									<Label>Fitness Goals</Label>
									<div>{member.fitness_goals}</div>
								</div>
								<div>
									<Label>Notes</Label>
									<div>{member.notes}</div>
								</div>
							</div>
						</CardContent>
					</Card>
					{/* Edit Dialog */}
					<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
						<DialogContent className="p-6 rounded-xl">
							<DialogHeader>
								<DialogTitle>Edit Member Info</DialogTitle>
							</DialogHeader>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label>Name</Label>
									<Input
										value={editForm.full_name}
										onChange={(e) =>
											setEditForm((f: typeof editForm) => ({
												...f,
												full_name: e.target.value,
											}))
										}
									/>
								</div>
								<div>
									<Label>Email</Label>
									<Input
										value={editForm.email}
										onChange={(e) =>
											setEditForm((f: typeof editForm) => ({
												...f,
												email: e.target.value,
											}))
										}
									/>
								</div>
								<div>
									<Label>Phone</Label>
									<PhoneInputField
										value={editForm.phone}
										onChange={(value) =>
											setEditForm((f: typeof editForm) => ({
												...f,
												phone: value || "",
											}))
										}
									/>
								</div>
								<div>
									<Label>Address</Label>
									<Input
										value={editForm.address}
										onChange={(e) =>
											setEditForm((f: typeof editForm) => ({
												...f,
												address: e.target.value,
											}))
										}
									/>
								</div>
								<div>
									<Label>Emergency Contact</Label>
									<Input
										value={editForm.emergency_contact}
										onChange={(e) =>
											setEditForm((f: typeof editForm) => ({
												...f,
												emergency_contact: e.target.value,
											}))
										}
									/>
								</div>
								<div>
									<Label>Medical Conditions</Label>
									<Input
										value={editForm.medical_conditions}
										onChange={(e) =>
											setEditForm((f: typeof editForm) => ({
												...f,
												medical_conditions: e.target.value,
											}))
										}
									/>
								</div>
								<div>
									<Label>Date of Birth</Label>
									<Input
										type="date"
										value={editForm.date_of_birth}
										onChange={(e) =>
											setEditForm((f: typeof editForm) => ({
												...f,
												date_of_birth: e.target.value,
											}))
										}
									/>
								</div>
								<div>
									<Label>Gender</Label>
									<Input
										value={editForm.gender}
										onChange={(e) =>
											setEditForm((f: typeof editForm) => ({
												...f,
												gender: e.target.value,
											}))
										}
									/>
								</div>
								<div>
									<Label>Height</Label>
									<Input
										type="number"
										value={editForm.height}
										onChange={(e) =>
											setEditForm((f: typeof editForm) => ({
												...f,
												height: e.target.value,
											}))
										}
									/>
								</div>
								<div>
									<Label>Weight</Label>
									<Input
										type="number"
										value={editForm.weight}
										onChange={(e) =>
											setEditForm((f: typeof editForm) => ({
												...f,
												weight: e.target.value,
											}))
										}
									/>
								</div>
								<div>
									<Label>Fitness Goals</Label>
									<Textarea
										value={editForm.fitness_goals || ""}
										onChange={(e) =>
											setEditForm((f: typeof editForm) => ({
												...f,
												fitness_goals: e.target.value,
											}))
										}
									/>
								</div>
								<div>
									<Label>Notes</Label>
									<Textarea
										value={editForm.notes || ""}
										onChange={(e) =>
											setEditForm((f: typeof editForm) => ({
												...f,
												notes: e.target.value,
											}))
										}
									/>
								</div>
							</div>
							<DialogFooter>
								<Button onClick={handleEditSave} disabled={loading}>
									{loading ? (
										<Loader2 className="animate-spin w-4 h-4 mr-2" />
									) : null}
									Save
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</TabsContent>
				{/* Packages Tab */}
				<TabsContent value="packages">
					<Card className="mb-6 rounded-2xl shadow-xl dark:bg-background/80">
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle>Packages</CardTitle>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setPackageDialogOpen(true)}
								className="ml-2">
								<Plus className="w-4 h-4 mr-1" />
								Add Package
							</Button>
						</CardHeader>
						<CardContent>
							<table className="w-full text-sm rounded-xl overflow-hidden">
								<thead className="bg-muted/60 dark:bg-muted/40">
									<tr>
										<th className="text-left px-4 py-3">Name</th>
										<th className="text-left px-4 py-3">Sessions</th>
										<th className="text-left px-4 py-3">Start</th>
										<th className="text-left px-4 py-3">End</th>
										<th className="text-left px-4 py-3">Status</th>
										<th></th>
									</tr>
								</thead>
								<tbody>
									{packages.map((mp, i) => (
										<tr
											key={mp.id}
											className={
												i % 2 === 0
													? "bg-background dark:bg-muted/30"
													: "bg-muted/10 dark:bg-background/40"
											}>
											<td className="text-left px-4 py-3 align-middle">
												{mp.packages?.name}
											</td>
											<td className="text-left px-4 py-3 align-middle">
												{mp.sessions_remaining} / {mp.packages?.session_count}
											</td>
											<td className="text-left px-4 py-3 align-middle">
												{mp.start_date}
											</td>
											<td className="text-left px-4 py-3 align-middle">
												{mp.end_date}
											</td>
											<td className="text-left px-4 py-3 align-middle">
												<Badge
													variant={
														mp.status === "active" ? "default" : "secondary"
													}>
													{mp.status}
												</Badge>
											</td>
											<td className="text-left px-4 py-3 align-middle">
												<TooltipProvider>
													<Tooltip>
														<TooltipTrigger asChild>
															<Button
																variant="ghost"
																size="icon"
																onClick={() => handleRemovePackage(mp.id)}>
																{loading ? (
																	<Loader2 className="animate-spin w-4 h-4" />
																) : (
																	<Trash2 className="w-4 h-4" />
																)}
															</Button>
														</TooltipTrigger>
														<TooltipContent>Remove Package</TooltipContent>
													</Tooltip>
												</TooltipProvider>
											</td>
										</tr>
									))}
								</tbody>
							</table>
							{/* Package Requests Section */}
							<div className="mt-8">
								<h3 className="font-semibold text-lg mb-2">Package Requests</h3>
								{loading ? (
									<div className="flex items-center justify-center h-20">
										<Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
									</div>
								) : packageRequests.length === 0 ? (
									<div className="text-muted-foreground">
										No package requests found.
									</div>
								) : (
									<div className="space-y-4">
										{packageRequests.map((request) => (
											<div
												key={request.id}
												className="p-4 border rounded-lg bg-muted/30">
												<div className="flex items-start justify-between">
													<div className="flex-1">
														<div className="font-medium">
															{request.packages?.name} Package Request
														</div>
														<div className="text-sm text-muted-foreground">
															Requested on:{" "}
															{new Date(
																request.requested_at
															).toLocaleDateString()}
														</div>
														<div className="text-sm text-muted-foreground">
															Price: ${request.packages?.price}
														</div>
														<div className="text-sm text-muted-foreground">
															Sessions: {request.packages?.session_count}
														</div>
														{request.notes && (
															<div className="text-sm text-muted-foreground mt-2">
																<strong>Notes:</strong> {request.notes}
															</div>
														)}
													</div>
													<div className="flex flex-col items-end gap-2">
														<Badge
															variant={
																request.status === "pending"
																	? "secondary"
																	: request.status === "approved"
																	? "default"
																	: "destructive"
															}>
															{request.status.charAt(0).toUpperCase() +
																request.status.slice(1)}
														</Badge>
														{request.status === "pending" && (
															<div className="flex gap-2">
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() =>
																		handleApproveRequest(request.id)
																	}
																	className="text-green-600 hover:text-green-700">
																	Approve
																</Button>
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() =>
																		handleRejectRequest(request.id)
																	}
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
							</div>
						</CardContent>
					</Card>
					{/* Add Package Dialog */}
					<Dialog open={packageDialogOpen} onOpenChange={setPackageDialogOpen}>
						<DialogContent className="p-6 rounded-xl">
							<DialogHeader>
								<DialogTitle>Add Package</DialogTitle>
							</DialogHeader>
							<div className="space-y-4">
								<Label>Package</Label>
								<Select
									value={selectedPackageId}
									onValueChange={setSelectedPackageId}>
									<SelectTrigger>
										<SelectValue placeholder="Select package" />
									</SelectTrigger>
									<SelectContent>
										{allPackages.map((pkg) => (
											<SelectItem key={pkg.id} value={pkg.id}>
												{pkg.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Label>Start Date</Label>
								<Input
									type="date"
									value={packageStartDate}
									onChange={(e) => setPackageStartDate(e.target.value)}
								/>
							</div>
							<DialogFooter>
								<Button onClick={handleAddPackage} disabled={loading}>
									{loading ? (
										<Loader2 className="animate-spin w-4 h-4 mr-2" />
									) : null}
									Add
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</TabsContent>
				{/* Goals/Body Composition Tab */}
				<TabsContent value="goals">
					<Card className="mb-6 rounded-2xl shadow-xl dark:bg-background/80">
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle>Goals & Body Composition</CardTitle>
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									setGoalEdit(null);
									setGoalForm({});
									setGoalDialogOpen(true);
								}}
								className="ml-2">
								<Plus className="w-4 h-4 mr-1" />
								Add Goal/Body Data
							</Button>
						</CardHeader>
						<CardContent>
							<table className="w-full text-sm rounded-xl overflow-hidden">
								<thead className="bg-muted/60 dark:bg-muted/40">
									<tr>
										<th className="text-left px-4 py-3">Type</th>
										<th className="text-left px-4 py-3">Target</th>
										<th className="text-left px-4 py-3">Current</th>
										<th className="text-left px-4 py-3">Unit</th>
										<th className="text-left px-4 py-3">Date</th>
										<th className="text-left px-4 py-3">Status</th>
										<th className="text-left px-4 py-3">Notes</th>
										<th></th>
									</tr>
								</thead>
								<tbody>
									{goals.map((goal) => (
										<tr key={goal.id}>
											<td className="text-left px-4 py-3 align-middle">
												{goal.goal_type}
											</td>
											<td className="text-left px-4 py-3 align-middle">
												{goal.target_value}
											</td>
											<td className="text-left px-4 py-3 align-middle">
												{goal.current_value}
											</td>
											<td className="text-left px-4 py-3 align-middle">
												{goal.target_unit}
											</td>
											<td className="text-left px-4 py-3 align-middle">
												{goal.target_date}
											</td>
											<td className="text-left px-4 py-3 align-middle">
												<Badge
													variant={
														goal.status === "active" ? "default" : "secondary"
													}>
													{goal.status}
												</Badge>
											</td>
											<td className="text-left px-4 py-3 align-middle">
												{goal.notes}
											</td>
											<td className="text-left px-4 py-3 align-middle">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => {
														setGoalEdit(goal);
														setGoalForm(goal);
														setGoalDialogOpen(true);
													}}>
													{loading ? (
														<Loader2 className="animate-spin w-4 h-4" />
													) : (
														<Edit className="w-4 h-4" />
													)}
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleGoalDelete(goal.id)}>
													{loading ? (
														<Loader2 className="animate-spin w-4 h-4" />
													) : (
														<Trash2 className="w-4 h-4" />
													)}
												</Button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</CardContent>
					</Card>
					{/* Add/Edit Goal Dialog */}
					<Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
						<DialogContent className="p-6 rounded-xl">
							<DialogHeader>
								<DialogTitle>
									{goalEdit ? "Edit Goal/Body Data" : "Add Goal/Body Data"}
								</DialogTitle>
							</DialogHeader>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label>Type</Label>
									<Input
										value={goalForm.goal_type || ""}
										onChange={(e) =>
											setGoalForm((f: typeof goalForm) => ({
												...f,
												goal_type: e.target.value,
											}))
										}
										placeholder="e.g. weight, body_fat, muscle_mass, ..."
									/>
								</div>
								<div>
									<Label>Target Value</Label>
									<Input
										type="number"
										value={goalForm.target_value || ""}
										onChange={(e) =>
											setGoalForm((f: typeof goalForm) => ({
												...f,
												target_value: e.target.value,
											}))
										}
									/>
								</div>
								<div>
									<Label>Current Value</Label>
									<Input
										type="number"
										value={goalForm.current_value || ""}
										onChange={(e) =>
											setGoalForm((f: typeof goalForm) => ({
												...f,
												current_value: e.target.value,
											}))
										}
									/>
								</div>
								<div>
									<Label>Unit</Label>
									<Input
										value={goalForm.target_unit || ""}
										onChange={(e) =>
											setGoalForm((f: typeof goalForm) => ({
												...f,
												target_unit: e.target.value,
											}))
										}
										placeholder="kg, %, cm, ..."
									/>
								</div>
								<div>
									<Label>Target Date</Label>
									<Input
										type="date"
										value={goalForm.target_date || ""}
										onChange={(e) =>
											setGoalForm((f: typeof goalForm) => ({
												...f,
												target_date: e.target.value,
											}))
										}
									/>
								</div>
								<div>
									<Label>Status</Label>
									<Input
										value={goalForm.status || "active"}
										onChange={(e) =>
											setGoalForm((f: typeof goalForm) => ({
												...f,
												status: e.target.value,
											}))
										}
										placeholder="active, completed, ..."
									/>
								</div>
								<div className="md:col-span-2">
									<Label>Notes</Label>
									<Textarea
										value={goalForm.notes || ""}
										onChange={(e) =>
											setGoalForm((f: typeof goalForm) => ({
												...f,
												notes: e.target.value,
											}))
										}
									/>
								</div>
							</div>
							<DialogFooter>
								<Button onClick={handleGoalSave} disabled={loading}>
									{loading ? (
										<Loader2 className="animate-spin w-4 h-4 mr-2" />
									) : null}
									{goalEdit ? "Save Changes" : "Add Goal"}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</TabsContent>
			</Tabs>
		</div>
	);
}
