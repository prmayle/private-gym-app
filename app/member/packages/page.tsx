"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { ArrowLeft, CheckCircle, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// 1. Add interfaces for package data and requests
interface PackageData {
	id: string;
	name: string;
	remaining: number;
	total: number;
	expiry: string;
	status: string;
}
interface AvailablePackage {
	id: string;
	name: string;
	sessions: number;
	price: number;
	description: string;
	packageType: string;
}
interface PackageRequest {
	id: string;
	package_id: string;
	status: string;
	requested_at: string;
	notes?: string;
	packages: {
		name: string;
		price: number;
		session_count: number;
	};
}

export default function ManagePackagesPage() {
	const router = useRouter();
	const auth = useAuth();
	const { toast } = useToast();
	const [selectedPackage, setSelectedPackage] = useState("");
	const [requestNote, setRequestNote] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [currentPackages, setCurrentPackages] = useState<PackageData[]>([]);
	const [availablePackages, setAvailablePackages] = useState<
		AvailablePackage[]
	>([]);
	const [packageRequests, setPackageRequests] = useState<PackageRequest[]>([]);
	const [loading, setLoading] = useState(true);
	const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);

	useEffect(() => {
		if (auth.user) {
			loadPackageData();
		}
	}, [auth.user]);

	const loadPackageData = async () => {
		try {
			setLoading(true);
			const supabase = createClient();
			if (!auth.user) {
				toast({
					title: "Authentication Required",
					description: "Please log in to view your packages.",
					variant: "destructive",
				});
				setLoading(false);
				return;
			}
			// Get member profile
			const { data: memberData, error: memberError } = await supabase
				.from("members")
				.select("id")
				.eq("user_id", auth.user.id)
				.single();
			if (memberError || !memberData) {
				toast({
					title: "Member Profile Not Found",
					description: "Please contact admin to set up your member profile.",
					variant: "destructive",
				});
				setLoading(false);
				return;
			}
			setCurrentMemberId(memberData.id);
			// Load member's current packages
			const { data: memberPackagesData, error: memberPackagesError } =
				await supabase
					.from("member_packages")
					.select(
						`
          id,
          sessions_remaining,
          sessions_total,
          start_date,
          end_date,
          status,
          packages (name)
        `
					)
					.eq("member_id", memberData.id)
					.in("status", ["active", "expired"])
					.order("start_date", { ascending: false });
			if (memberPackagesError) {
				console.error("Error loading member packages:", memberPackagesError);
			} else {
				const transformedCurrentPackages = (memberPackagesData || []).map(
					(pkg: any) => ({
						id: pkg.id,
						name: pkg.packages?.name || "Unknown Package",
						remaining: pkg.sessions_remaining || 0,
						total: pkg.sessions_total || 0,
						expiry: pkg.end_date
							? new Date(pkg.end_date).toLocaleDateString()
							: "-",
						status: pkg.status,
					})
				);
				setCurrentPackages(transformedCurrentPackages);
			}
			// Load all available packages for requesting
			const { data: packagesData, error: packagesError } = await supabase
				.from("packages")
				.select(
					"id, name, session_count, price, description, package_types(name)"
				)
				.eq("is_active", true)
				.order("name", { ascending: true });
			if (packagesError) {
				console.error("Error loading available packages:", packagesError);
			} else {
				const transformedAvailablePackages = (packagesData || []).map(
					(pkg: any) => ({
						id: pkg.id,
						name: pkg.name,
						sessions: pkg.session_count,
						price: pkg.price,
						description: pkg.description || "No description available",
						packageType: pkg.package_types?.name || "",
					})
				);
				setAvailablePackages(transformedAvailablePackages);
			}
			// Load package requests
			const { data: requestsData, error: requestsError } = await supabase
				.from("package_requests")
				.select(
					`
          id,
          package_id,
          status,
          requested_at,
          notes,
          packages (
            name,
            price,
            session_count
          )
        `
				)
				.eq("member_id", memberData.id)
				.order("requested_at", { ascending: false });
			if (requestsError) {
				console.error("Error loading package requests:", requestsError);
			} else {
				const transformedRequests = (requestsData || []).map(
					(request: any) => ({
						id: request.id,
						package_id: request.package_id,
						status: request.status,
						requested_at: request.requested_at,
						notes: request.notes,
						packages: Array.isArray(request.packages)
							? request.packages[0]
							: request.packages,
					})
				);
				setPackageRequests(transformedRequests);
			}
		} catch (error) {
			console.error("Error loading package data:", error);
			toast({
				title: "Error Loading Packages",
				description: "Failed to load package data. Please try again.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleSubmitRequest = async () => {
		if (!selectedPackage) {
			toast({
				title: "Package Required",
				description: "Please select a package to request.",
				variant: "destructive",
			});
			return;
		}
		if (!currentMemberId) {
			toast({
				title: "Authentication Required",
				description: "Please log in to submit a package request.",
				variant: "destructive",
			});
			return;
		}
		setIsSubmitting(true);
		try {
			const supabase = createClient();
			const packageDetails = availablePackages.find(
				(pkg) => pkg.id === selectedPackage
			);
			if (!packageDetails) {
				throw new Error("Package not found");
			}
			// Create package request in the database
			const { data: requestData, error: requestError } = await supabase
				.from("package_requests")
				.insert({
					member_id: currentMemberId,
					package_id: selectedPackage,
					notes: requestNote || null,
					status: "pending",
					requested_at: new Date().toISOString(),
				})
				.select()
				.single();
			if (requestError) {
				throw requestError;
			}
			// Create notification for admin
			const memberName =
				auth.userProfile?.full_name ||
				auth.user?.user_metadata?.full_name ||
				auth.user?.email?.split("@")[0] ||
				"Member";
			await supabase.from("notifications").insert({
				user_id: null, // Admin notification (no specific user)
				title: "New Package Request",
				message: `${memberName} has requested a ${
					packageDetails.name
				} package.${requestNote ? ` Note: ${requestNote}` : ""}`,
				type: "alert", // Use a valid enum value
				is_read: false,
				created_at: new Date().toISOString(),
				metadata: {
					member_id: currentMemberId,
					member_name: memberName,
					package_id: selectedPackage,
					package_name: packageDetails.name,
					package_price: packageDetails.price,
					package_sessions: packageDetails.sessions,
					request_id: requestData.id,
				},
			});
			toast({
				title: "Request Submitted",
				description: `Your request for the ${packageDetails.name} package has been sent!`,
			});
			setSelectedPackage("");
			setRequestNote("");
			// Reload data to show the new request
			loadPackageData();
		} catch (error) {
			console.error("Error submitting package request:", error);
			toast({
				title: "Error Submitting Request",
				description: "Failed to submit your package request. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
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

	if (loading) {
		return (
			<div className="container mx-auto py-6 space-y-6">
				<div className="flex items-center">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => router.back()}
						className="mr-2"
						aria-label="Go back">
						<ArrowLeft className="h-5 w-5" />
					</Button>
					<h1 className="text-2xl font-bold">Manage Packages</h1>
				</div>
				<div className="space-y-4">
					{[1, 2].map((i) => (
						<Card key={i}>
							<CardHeader>
								<div className="h-6 bg-gray-200 rounded animate-pulse"></div>
								<div className="h-4 bg-gray-200 rounded animate-pulse"></div>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div className="h-4 bg-gray-200 rounded animate-pulse"></div>
									<div className="h-4 bg-gray-200 rounded animate-pulse"></div>
									<div className="h-4 bg-gray-200 rounded animate-pulse"></div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-6 space-y-6">
			<div className="relative mb-8">
				<div className="absolute inset-0 h-32 bg-gradient-to-br from-blue-900/60 to-gray-900/80 rounded-2xl blur-lg -z-10" />
				<div className="flex items-center gap-6 p-6 rounded-2xl shadow-xl bg-background/80 dark:bg-background/60 backdrop-blur border border-border">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => router.back()}
						className="mr-2"
						aria-label="Go back">
						<ArrowLeft className="h-5 w-5" />
					</Button>
					<div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-3xl font-bold border-4 border-primary shadow-lg">
						<Package className="h-10 w-10" />
					</div>
					<div>
						<div className="font-bold text-2xl flex items-center gap-2">
							Your Packages
						</div>
						<div className="text-muted-foreground text-sm">
							Manage your active and expired packages
						</div>
					</div>
				</div>
			</div>
			{/* Current Packages */}
			<Card className="rounded-2xl shadow-xl dark:bg-background/80 mb-6">
				<CardHeader>
					<CardTitle className="flex items-center">
						<Package className="mr-2 h-5 w-5" />
						Current Packages
					</CardTitle>
					<CardDescription>Your active and expired packages</CardDescription>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="space-y-4">
							<div className="h-4 bg-gray-200 rounded animate-pulse"></div>
							<div className="h-4 bg-gray-200 rounded animate-pulse"></div>
							<div className="h-4 bg-gray-200 rounded animate-pulse"></div>
						</div>
					) : currentPackages.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							No packages found.
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{currentPackages.map((pkg) => (
								<div key={pkg.id} className="border rounded-lg p-4">
									<h3 className="font-medium">{pkg.name}</h3>
									<div className="mt-2 space-y-1">
										<p className="text-sm">
											<span className="text-muted-foreground">Remaining: </span>
											<span
												className={
													pkg.remaining === 0
														? "text-red-500 font-medium"
														: "font-medium"
												}>
												{pkg.remaining}/{pkg.total}
											</span>
										</p>
										<p className="text-sm">
											<span className="text-muted-foreground">Expires: </span>
											<span>{pkg.expiry}</span>
										</p>
										<p className="text-sm">
											<span className="text-muted-foreground">Status: </span>
											<Badge
												variant={
													pkg.status === "active" ? "default" : "secondary"
												}>
												{pkg.status}
											</Badge>
										</p>
									</div>
									<div className="w-full bg-muted rounded-full h-2 mt-2">
										<div
											className="bg-primary h-2 rounded-full"
											style={{
												width: `${(pkg.remaining / (pkg.total || 1)) * 100}%`,
											}}></div>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
			{/* Package Requests */}
			{packageRequests.length > 0 && (
				<Card className="rounded-2xl shadow-xl dark:bg-background/80 mb-6">
					<CardHeader>
						<CardTitle className="flex items-center">
							<Package className="mr-2 h-5 w-5" />
							My Package Requests
						</CardTitle>
						<CardDescription>
							Track the status of your package requests
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{packageRequests.map((request) => (
								<div key={request.id} className="border rounded-lg p-4">
									<div className="flex items-center justify-between">
										<div>
											<h3 className="font-medium">
												{request.packages?.name || "Unknown Package"}
											</h3>
											<p className="text-sm text-muted-foreground">
												Requested on{" "}
												{new Date(request.requested_at).toLocaleDateString()}
											</p>
											{request.notes && (
												<p className="text-sm text-muted-foreground mt-1">
													Note: {request.notes}
												</p>
											)}
										</div>
										{getStatusBadge(request.status)}
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
			{/* Request New Package */}
			<Card className="rounded-2xl shadow-xl dark:bg-background/80 mb-6">
				<CardHeader>
					<CardTitle className="flex items-center">
						<Package className="mr-2 h-5 w-5" />
						Request New Package
					</CardTitle>
					<CardDescription>
						Request a new package from the available options
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-6">
						<div className="space-y-2">
							<label className="text-sm font-medium text-foreground">
								Select Package
							</label>
							<Select
								value={selectedPackage}
								onValueChange={setSelectedPackage}
								disabled={loading || isSubmitting}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Choose a package to request" />
								</SelectTrigger>
								<SelectContent>
									{availablePackages.map((pkg) => (
										<SelectItem key={pkg.id} value={pkg.id}>
											<div className="flex flex-col">
												<div className="font-medium">{pkg.name}</div>
												<div className="text-sm text-muted-foreground">
													{pkg.sessions} sessions • ${pkg.price}
												</div>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium text-foreground">
								Additional Notes (Optional)
							</label>
							<Textarea
								placeholder="Add any special requests or notes for your package request..."
								value={requestNote}
								onChange={(e) => setRequestNote(e.target.value)}
								disabled={loading || isSubmitting}
								className="min-h-[80px] resize-none"
							/>
						</div>

						<Button
							onClick={handleSubmitRequest}
							disabled={loading || isSubmitting || !selectedPackage}
							className="w-full h-11 font-medium">
							{isSubmitting ? (
								<>
									<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
									Submitting Request...
								</>
							) : (
								<>
									<Package className="w-4 h-4 mr-2" />
									Request Package
								</>
							)}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
