"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { PhoneInputField } from "@/components/ui/phone-input";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";
import { ArrowLeft, User, Phone, FileText, Package } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { useTheme } from "@/components/theme-provider";

interface NewMember {
	name: string;
	email: string;
	phone: string;
	dateOfBirth: string;
	gender: string;
	address: string;
	emergencyContactName: string;
	emergencyContactPhone: string;
	medicalConditions: string;
	fitnessGoals: string;
	startDate: string;
	notes: string;
	height: string;
	weight: string;
	waiverSigned: boolean;
}

interface Package {
	id: string;
	name: string;
	price: number;
	duration_days?: number;
	session_count?: number;
	is_active?: boolean;
}

export default function NewMemberPage() {
	const router = useRouter();
	const { toast } = useToast();
	const [isLoading, setIsLoading] = useState(false);
	const [member, setMember] = useState<NewMember>({
		name: "",
		email: "",
		phone: "",
		dateOfBirth: "",
		gender: "",
		address: "",
		emergencyContactName: "",
		emergencyContactPhone: "",
		medicalConditions: "",
		fitnessGoals: "",
		startDate: new Date().toISOString().split("T")[0],
		notes: "",
		height: "",
		weight: "",
		waiverSigned: false,
	});
	const [packages, setPackages] = useState<Package[]>([]);
	const [selectedPackageId, setSelectedPackageId] = useState<string>("");
	const { theme } = useTheme();
	
	useEffect(() => {
		// Fetch all active packages
		createClient()
			.from("packages")
			.select("id, name, price, duration_days, session_count, is_active")
			.eq("is_active", true)
			.then(({ data }) => setPackages(data || []));
	}, []);

	const membershipTypes = [
		"Basic Membership",
		"Premium Membership",
		"VIP Membership",
		"Student Membership",
		"Senior Membership",
		"Family Membership",
	];

	const paymentMethods = [
		"Credit Card",
		"Debit Card",
		"Bank Transfer",
		"Cash",
		"Check",
	];

	const handleInputChange = (field: keyof NewMember, value: string) => {
		setMember((prev) => ({ ...prev, [field]: value }));
	};

	const validateForm = (): boolean => {
		const requiredFields = ["name", "phone", "startDate"];
		const missingFields = requiredFields.filter(
			(field) => !member[field as keyof NewMember]
		);

		if (missingFields.length > 0) {
			toast({
				title: "Validation Error",
				description: `Please fill in the following required fields: ${missingFields.join(
					", "
				)}`,
				variant: "destructive",
			});
			return false;
		}

		// Email validation
		// const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		// if (!emailRegex.test(member.email)) {
		// 	toast({
		// 		title: "Invalid Email",
		// 		description: "Please enter a valid email address",
		// 		variant: "destructive",
		// 	});
		// 	return false;
		// }

		// Phone validation (basic)
		if (!member.phone || member.phone.length < 8) {
			toast({
				title: "Invalid Phone Number",
				description: "Please enter a valid phone number",
				variant: "destructive",
			});
			return false;
		}

		return true;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		setIsLoading(true);

		try {
			console.log("Starting member creation process for:", member.email);
			const supabase = createClient();

			// Create emergency contact string
			const emergencyContact =
				member.emergencyContactName && member.emergencyContactPhone
					? `${member.emergencyContactName} - ${member.emergencyContactPhone}`
					: member.emergencyContactName || member.emergencyContactPhone || null;

			console.log("Emergency contact string:", emergencyContact);

			// IMPORTANT: User Creation Process
			// =====================================
			// 1. First create user in auth.users using admin API
			// 2. Then create corresponding profile in public.profiles with same ID
			// 3. Finally create member record linking to the profile
			//
			// This ensures proper foreign key relationships:
			// profiles.id -> auth.users.id (profiles_id_fkey constraint)
			// members.user_id -> profiles.id
			//
			// CONFIGURATION REQUIRED:
			// To use auth.admin.createUser(), you need to:
			// 1. Set up service role key in environment variables
			// 2. Use createClient() with service role key for admin operations
			// OR implement server-side API route for user creation

			// Generate a temporary password - user will need to reset it
			const tempPassword = `TempPass${Date.now().toString().slice(-6)}!`;

			let userId: string;
			let authData: any;

			try {
				console.log("Creating auth user via API...");
				// Use API route for user creation
				const response = await fetch("/api/admin/create-user", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						email: member.email,
						phone: member.phone,
						password: tempPassword,
						userData: {
							full_name: member.name,
							email: member.email,
							phone: member.phone,
							date_of_birth: member.dateOfBirth,
							gender: member.gender,
							address: member.address,
							emergency_contact: emergencyContact,
							medical_conditions: member.medicalConditions,
							fitness_goals: member.fitnessGoals,
							waiver_signed: member.waiverSigned,
							height: member.height,
							weight: member.weight,
							role: "member",
						},
					}),
				});

				const result = await response.json();
				console.log("Auth user creation response:", result);

				if (!response.ok) {
					console.error("Auth user creation failed:", result);
					throw new Error(result.error || "Failed to create user");
				}

				authData = result;
				userId = result.user.id;
				console.log("Auth user created successfully with ID:", userId);
			} catch (authError: any) {
				// Handle API errors
				console.error("Auth admin error:", authError);

				if (authError.message?.includes("User not allowed")) {
					toast({
						title: "Admin Permission Required",
						description:
							"Please configure the SUPABASE_SERVICE_ROLE_KEY environment variable for user creation.",
						variant: "destructive",
					});
				} else {
					toast({
						title: "Authentication Error",
						description: `Failed to create user account: ${authError.message}`,
						variant: "destructive",
					});
				}
				return;
			}

			// Create user profile in profiles table using admin API (bypasses RLS)
			console.log("Creating profile via API for user ID:", userId);
			const profileResponse = await fetch("/api/admin/create-profile", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					id: userId, // Use the auth.users ID
					email: member.email,
					full_name: member.name,
					phone: member.phone,
					role: "member",
					is_active: true,
				}),
			});

			const profileResult = await profileResponse.json();

			if (!profileResponse.ok) {
				// If profile creation fails, clean up the auth user
				try {
					await fetch("/api/admin/delete-user", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({ userId }),
					});
				} catch (cleanupError) {
					console.error("Failed to cleanup auth user:", cleanupError);
				}
				throw new Error(profileResult.error || "Failed to create profile");
			}

			const profileData = profileResult.profile;
			console.log("Profile created successfully:", profileData);

			// Check if member already exists for this user
			console.log("Checking for existing member for user:", profileData.id);
			const { data: existingMembers, error: memberCheckError } = await supabase
				.from("members")
				.select("id, member_number")
				.eq("user_id", profileData.id);

			if (memberCheckError) {
				console.error("Error checking for existing member:", memberCheckError);
				throw memberCheckError;
			}

			const existingMember =
				existingMembers && existingMembers.length > 0
					? existingMembers[0]
					: null;
			console.log("Existing member check result:", existingMember);

			let memberData;
			let memberNumber;

			if (existingMember) {
				// Member already exists, use existing data
				console.log("Using existing member:", existingMember);
				memberData = existingMember;
				memberNumber = existingMember.member_number;
			} else {
				// Generate member number
				memberNumber = `MEM${Date.now().toString().slice(-6)}`;
				console.log("Creating new member with number:", memberNumber);

				// Create new member record
				const { data: newMemberData, error: memberError } = await supabase
					.from("members")
					.insert({
						user_id: profileData.id,
						emergency_contact: emergencyContact,
						medical_conditions: member.medicalConditions || null,
						date_of_birth: member.dateOfBirth || null,
						gender: member.gender || null,
						address: member.address || null,
						joined_at: member.startDate,
						membership_status: "active",
						member_number: memberNumber,
						fitness_goals: member.fitnessGoals || null,
						waiver_signed: member.waiverSigned,
						height: member.height || null,
						weight: member.weight || null,
					})
					.select()
					.single();

				if (memberError) {
					console.error("Error creating member:", memberError);
					throw memberError;
				}
				console.log("Member created successfully:", newMemberData);
				memberData = newMemberData;
			}

			// Create welcome notification
			console.log("Creating welcome notification for user:", profileData.id);
			const { error: notificationError } = await supabase
				.from("notifications")
				.insert({
					user_id: profileData.id,
					title: "Welcome to the Gym!",
					message: `Welcome ${member.name}! Your membership has been activated. We're excited to have you as part of our community.`,
					type: "system",
					is_read: false,
					metadata: {
						member_number: memberNumber,
						start_date: member.startDate,
					},
				});

			if (notificationError) {
				console.error(
					"Error creating welcome notification:",
					notificationError
				);
			} else {
				console.log("Welcome notification created successfully");
			}

			// In handleSubmit, after member creation, if selectedPackageId, create member_packages
			if (selectedPackageId) {
				const pkg = packages.find((p) => p.id === selectedPackageId);
				if (pkg) {
					const startDate = member.startDate;
					const endDate = pkg.duration_days
						? new Date(
								new Date(startDate).getTime() +
									pkg.duration_days * 24 * 60 * 60 * 1000
						  )
								.toISOString()
								.split("T")[0]
						: null;
					await supabase.from("member_packages").insert({
						member_id: memberData.id,
						package_id: pkg.id,
						start_date: startDate,
						end_date: endDate,
						status: "active",
						sessions_remaining: pkg.session_count || 0,
						sessions_total: pkg.session_count || 0,
						purchased_at: new Date().toISOString(),
					});
				}
			}

			console.log(
				"All operations completed successfully, showing toast and redirecting"
			);

			toast({
				title: "Member Created Successfully",
				description: `${member.name} has been added to the system with member number ${memberNumber}. Temporary password: ${tempPassword}`,
			});

			// Redirect to member list
			router.push("/admin/members");
		} catch (error) {
			console.error("Error creating member:", error);
			toast({
				title: "Error",
				description: "Failed to create member. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="container mx-auto max-w-7xl py-6 space-y-6 px-4">
			{/* Header */}
			<PageHeader
				title="Add New Member"
				subtitle="Create a new member profile with all necessary information"
				icon={User}
				hasAddButton={false}
			/>
			{/* <div className="relative mb-8">
				<div className="absolute inset-0 h-32 bg-gradient-to-br from-blue-900/60 to-gray-900/80 rounded-2xl blur-lg -z-10" />
				<div className="flex items-center gap-6 p-6 rounded-2xl shadow-xl bg-background/80 dark:bg-background/60 backdrop-blur border border-border">
					<Button variant="ghost" size="icon" asChild className="mr-2">
						<Link href="/admin/members">
							<ArrowLeft className="h-5 w-5" />
							<span className="sr-only">Back to Members</span>
						</Link>
					</Button>
					<div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-3xl font-bold border-4 border-primary shadow-lg">
						<User className="w-10 h-10 text-primary" />
					</div>
					<div>
						<div className="font-bold text-2xl flex items-center gap-2">
							Add New Member
						</div>
						<div className="text-muted-foreground text-sm">
							Create a new member profile with all necessary information
						</div>
					</div>
				</div>
			</div> */}

			<form onSubmit={handleSubmit} className="space-y-8">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Personal Information */}
					<Card className="lg:col-span-2 rounded-2xl shadow-xl dark:bg-background/80 mb-6">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<User className="h-5 w-5" />
								Personal Information
							</CardTitle>
							<CardDescription>
								Basic member details and contact information
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="name">Full Name *</Label>
									<Input
										id="name"
										value={member.name}
										onChange={(e) => handleInputChange("name", e.target.value)}
										placeholder="Enter full name"
										required
										className="px-4 py-3 text-left"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="email">Email Address</Label>
									<Input
										id="email"
										type="email"
										value={member.email}
										onChange={(e) => handleInputChange("email", e.target.value)}
										placeholder="Enter email address"
										className="px-4 py-3 text-left"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="phone">Phone Number *</Label>
									<PhoneInputField
										id="phone"
										value={member.phone}
										onChange={(value) =>
											handleInputChange("phone", value || "")
										}
										placeholder="Enter phone number"
										required
										className="px-4 py-3 text-left"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="dateOfBirth">Date of Birth</Label>
									<Input
										id="dateOfBirth"
										type="date"
										value={member.dateOfBirth}
										onChange={(e) =>
											handleInputChange("dateOfBirth", e.target.value)
										}
										className="px-4 py-3 text-left"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="gender">Gender</Label>
									<Select
										value={member.gender}
										onValueChange={(value) =>
											handleInputChange("gender", value)
										}>
										<SelectTrigger>
											<SelectValue placeholder="Select gender" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="male">Male</SelectItem>
											<SelectItem value="female">Female</SelectItem>
											<SelectItem value="other">Other</SelectItem>
											<SelectItem value="prefer-not-to-say">
												Prefer not to say
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label htmlFor="address">Address</Label>
									<Input
										id="address"
										value={member.address}
										onChange={(e) =>
											handleInputChange("address", e.target.value)
										}
										placeholder="Enter address"
										className="px-4 py-3 text-left"
									/>
								</div>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="height">Height (cm)</Label>
									<Input
										id="height"
										type="number"
										value={member.height}
										onChange={(e) =>
											handleInputChange("height", e.target.value)
										}
										placeholder="e.g. 175"
										className="px-4 py-3 text-left"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="weight">Weight (kg)</Label>
									<Input
										id="weight"
										type="number"
										value={member.weight}
										onChange={(e) =>
											handleInputChange("weight", e.target.value)
										}
										placeholder="e.g. 70"
										className="px-4 py-3 text-left"
									/>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Membership Details */}
					<Card className="rounded-2xl shadow-xl dark:bg-background/80 mb-6">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Package className="h-5 w-5" />
								Membership Details
							</CardTitle>
							<CardDescription>
								Membership type and payment information
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="startDate">Start Date *</Label>
								<Input
									id="startDate"
									type="date"
									value={member.startDate}
									onChange={(e) =>
										handleInputChange("startDate", e.target.value)
									}
									required
									className="px-4 py-3 text-left"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="package">Select Package</Label>
								<Select
									value={selectedPackageId}
									onValueChange={setSelectedPackageId}>
									<SelectTrigger>
										<SelectValue placeholder="Select a package (optional)" />
									</SelectTrigger>
									<SelectContent>
										{packages.map((pkg) => (
											<SelectItem key={pkg.id} value={pkg.id}>
												{pkg.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{selectedPackageId && (
									<div className="mt-2 text-sm text-muted-foreground">
										{(() => {
											const pkg = packages.find(
												(p) => p.id === selectedPackageId
											);
											if (!pkg) return null;
											return (
												<div className="space-y-1">
													<div>
														<b>Sessions:</b> {pkg.session_count || "-"}
													</div>
													<div>
														<b>Duration:</b>{" "}
														{pkg.duration_days
															? `${pkg.duration_days} days`
															: "-"}
													</div>
													<div>
														<b>Price:</b> ${pkg.price.toFixed(2)}
													</div>
												</div>
											);
										})()}
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Emergency Contact */}
				<Card className="rounded-2xl shadow-xl dark:bg-background/80 mb-6">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Phone className="h-5 w-5" />
							Emergency Contact
						</CardTitle>
						<CardDescription>
							Emergency contact information for safety purposes
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="emergencyContactName">
									Emergency Contact Name
								</Label>
								<Input
									id="emergencyContactName"
									value={member.emergencyContactName}
									onChange={(e) =>
										handleInputChange("emergencyContactName", e.target.value)
									}
									placeholder="Enter emergency contact name"
									className="px-4 py-3 text-left"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="emergencyContactPhone">
									Emergency Contact Phone
								</Label>
								<PhoneInputField
									id="emergencyContactPhone"
									value={member.emergencyContactPhone}
									onChange={(value) =>
										handleInputChange("emergencyContactPhone", value || "")
									}
									placeholder="Enter emergency contact phone"
									className="px-4 py-3 text-left"
								/>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Health & Fitness Information */}
				<Card className="rounded-2xl shadow-xl dark:bg-background/80 mb-6">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<FileText className="h-5 w-5" />
							Health & Fitness Information
						</CardTitle>
						<CardDescription>
							Medical conditions, fitness goals, and additional notes
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="medicalConditions">Medical Conditions</Label>
							<Textarea
								id="medicalConditions"
								value={member.medicalConditions}
								onChange={(e) =>
									handleInputChange("medicalConditions", e.target.value)
								}
								placeholder="List any medical conditions, allergies, or health concerns"
								rows={3}
								className="px-4 py-3 text-left"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="fitnessGoals">Fitness Goals</Label>
							<Textarea
								id="fitnessGoals"
								value={member.fitnessGoals}
								onChange={(e) =>
									handleInputChange("fitnessGoals", e.target.value)
								}
								placeholder="Describe fitness goals and objectives"
								rows={3}
								className="px-4 py-3 text-left"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="notes">Additional Notes</Label>
							<Textarea
								id="notes"
								value={member.notes}
								onChange={(e) => handleInputChange("notes", e.target.value)}
								placeholder="Any additional notes or comments"
								rows={3}
								className="px-4 py-3 text-left"
							/>
						</div>
						<div className="flex items-center gap-2 mt-4">
							<input
								type="checkbox"
								id="waiverSigned"
								checked={member.waiverSigned}
								onChange={(e) =>
									setMember((prev) => ({
										...prev,
										waiverSigned: e.target.checked,
									}))
								}
								className="w-5 h-5"
							/>
							<Label htmlFor="waiverSigned">Waiver Signed</Label>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<span className="ml-1 cursor-pointer">?</span>
									</TooltipTrigger>
									<TooltipContent>
										Check if the member has signed the liability waiver.
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
					</CardContent>
				</Card>

				{/* Form Actions */}
				<div className="flex items-center justify-end gap-4 pt-6 border-t">
					<Button type="button" variant="outline" asChild>
						<Link href="/admin/members">Cancel</Link>
					</Button>
					<Button
						type="submit"
						disabled={isLoading}
						className="flex items-center gap-2">
						{isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : null}
						{isLoading ? "Creating Member..." : "Create Member"}
					</Button>
				</div>
			</form>
		</div>
	);
}
