"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { PhoneInputField } from "@/components/ui/phone-input";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useToast } from "@/hooks/use-toast";
import { ActivityLogger } from "@/utils/activity-logger";
import { useAuth } from "@/contexts/AuthContext";
import {
	ArrowLeft,
	Search,
	Plus,
	Edit,
	Trash2,
	User,
	DollarSign,
	Clock,
	Award,
	UserCheck,
	UserX,
	Upload,
	Camera,
} from "lucide-react";

interface Trainer {
	id: string;
	user_id: string;
	specializations: string[];
	certifications: string[];
	bio: string;
	hourly_rate: number;
	profile_photo_url: string | null;
	is_available: boolean;
	created_at: string;
	updated_at: string;
	experience_years: number;
	hire_date: string;
	max_sessions_per_day: number;
	// Joined from profiles table
	full_name: string;
	email: string;
	phone: string | null;
}

interface NewTrainer {
	email: string;
	full_name: string;
	phone: string;
	specializations: string[];
	certifications: string[];
	bio: string;
	hourly_rate: number;
	experience_years: number;
	max_sessions_per_day: number;
	profile_photo_url?: string;
}

const defaultSpecializations = [
	"Personal Training",
	"Weight Loss",
	"Strength Training",
	"Cardio Training",
	"Yoga",
	"Pilates",
	"HIIT",
	"Crossfit",
	"Sports Training",
	"Rehabilitation",
	"Nutrition Coaching",
	"Senior Fitness",
];

const defaultCertifications = [
	"ACSM Certified Personal Trainer",
	"NASM Certified Personal Trainer",
	"ACE Personal Trainer",
	"NSCA Certified Strength & Conditioning Specialist",
	"Yoga Alliance RYT-200",
	"Pilates Comprehensive Certification",
	"Crossfit Level 1 Trainer",
	"First Aid/CPR Certified",
	"Nutrition Specialist",
	"Corrective Exercise Specialist",
];

export default function TrainersPage() {
	const { toast } = useToast();
	const auth = useAuth();
	const [trainers, setTrainers] = useState<Trainer[]>([]);
	const [filteredTrainers, setFilteredTrainers] = useState<Trainer[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [loading, setLoading] = useState(true);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null);

	const [newTrainer, setNewTrainer] = useState<NewTrainer>({
		email: "",
		full_name: "",
		phone: "",
		specializations: [],
		certifications: [],
		bio: "",
		hourly_rate: 50,
		experience_years: 0,
		max_sessions_per_day: 8,
		profile_photo_url: "",
	});

	const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

	useEffect(() => {
		loadTrainers();
	}, []);

	useEffect(() => {
		filterTrainers();
	}, [trainers, searchQuery, statusFilter]);

	const loadTrainers = async () => {
		try {
			setLoading(true);
			const supabase = createClient();

			const { data: trainersData, error } = await supabase
				.from("trainers")
				.select(
					`
          *,
          profiles!trainers_user_id_fkey (
            full_name,
            email,
            phone
          )
        `
				)
				.order("created_at", { ascending: false });

			if (error) {
				console.error("Error loading trainers:", error);
				toast({
					title: "Error Loading Trainers",
					description: "Failed to load trainers. Please try again.",
					variant: "destructive",
				});
				return;
			}

			const transformedTrainers = (trainersData || []).map((trainer) => ({
				...trainer,
				full_name: trainer.profiles?.full_name || "No Name",
				email: trainer.profiles?.email || "No Email",
				phone: trainer.profiles?.phone || null,
				specializations: trainer.specializations || [],
				certifications: trainer.certifications || [],
			}));

			setTrainers(transformedTrainers);
		} catch (error) {
			console.error("Error loading trainers:", error);
			toast({
				title: "Error",
				description: "Failed to load trainers data.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const filterTrainers = () => {
		let filtered = trainers;

		// Filter by search query
		if (searchQuery) {
			filtered = filtered.filter(
				(trainer) =>
					trainer.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					trainer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
					trainer.specializations.some((spec) =>
						spec.toLowerCase().includes(searchQuery.toLowerCase())
					)
			);
		}

		// Filter by status
		if (statusFilter === "available") {
			filtered = filtered.filter((trainer) => trainer.is_available);
		} else if (statusFilter === "unavailable") {
			filtered = filtered.filter((trainer) => !trainer.is_available);
		}

		setFilteredTrainers(filtered);
	};

	const handleImageUpload = async (
		file: File,
		isNewTrainer: boolean = true
	) => {
		try {
			setIsUploadingPhoto(true);
			// Validate file
			if (!file.type.startsWith("image/")) {
				toast({
					title: "Invalid File",
					description: "Please select an image file.",
					variant: "destructive",
				});
				return;
			}
			if (file.size > 5 * 1024 * 1024) {
				// 5MB limit
				toast({
					title: "File Too Large",
					description: "Please select an image smaller than 5MB.",
					variant: "destructive",
				});
				return;
			}
			// Upload to /api/upload with section/field for Vercel Blob
			const formData = new FormData();
			formData.append("file", file);
			formData.append("section", "trainer");
			formData.append("field", "profile_photo");
			const response = await fetch("/api/upload", {
				method: "POST",
				body: formData,
			});
			if (!response.ok) {
				const errorData = await response
					.json()
					.catch(() => ({ error: "Upload failed" }));
				throw new Error(errorData.error || "Upload failed");
			}
			const result = await response.json();
			const imageUrl = result.filePath;
			if (!imageUrl) throw new Error("No image URL returned from upload");
			// Update the appropriate trainer state
			if (isNewTrainer) {
				setNewTrainer((prev) => ({ ...prev, profile_photo_url: imageUrl }));
			} else if (editingTrainer) {
				setEditingTrainer((prev) =>
					prev ? { ...prev, profile_photo_url: imageUrl } : prev
				);
			}
			toast({
				title: "Image Uploaded",
				description: "Profile photo has been uploaded successfully.",
			});
		} catch (error) {
			console.error("Error uploading image:", error);
			toast({
				title: "Upload Failed",
				description:
					error instanceof Error
						? error.message
						: "Failed to upload image. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsUploadingPhoto(false);
		}
	};

	const handleCreateTrainer = async () => {
		try {
			// Use the API route to create trainer with proper admin permissions
			const response = await fetch("/api/admin/create-trainer", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: newTrainer.email,
					full_name: newTrainer.full_name,
					phone: newTrainer.phone,
					specializations: newTrainer.specializations,
					certifications: newTrainer.certifications,
					bio: newTrainer.bio,
					hourly_rate: newTrainer.hourly_rate,
					experience_years: newTrainer.experience_years,
					max_sessions_per_day: newTrainer.max_sessions_per_day,
					profile_photo_url: newTrainer.profile_photo_url,
				}),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "Failed to create trainer");
			}

			const trainerData = result.trainer;

			// Log activity
			if (auth.user && trainerData) {
				await ActivityLogger.trainerCreated(
					newTrainer.full_name,
					trainerData.id,
					auth.user.id
				);
			}

			toast({
				title: "Trainer Created",
				description: `${newTrainer.full_name} has been added as a trainer.`,
			});

			// Reset form and reload
			setNewTrainer({
				email: "",
				full_name: "",
				phone: "",
				specializations: [],
				certifications: [],
				bio: "",
				hourly_rate: 50,
				experience_years: 0,
				max_sessions_per_day: 8,
				profile_photo_url: "",
			});
			setIsCreateDialogOpen(false);
			loadTrainers();
		} catch (error) {
			console.error("Error creating trainer:", error);
			toast({
				title: "Error",
				description: "Failed to create trainer. Please try again.",
				variant: "destructive",
			});
		}
	};

	const handleEditTrainer = async () => {
		if (!editingTrainer) return;

		try {
			const supabase = createClient();

			// Update trainer record
			const { error: trainerError } = await supabase
				.from("trainers")
				.update({
					specializations: editingTrainer.specializations,
					certifications: editingTrainer.certifications,
					bio: editingTrainer.bio,
					hourly_rate: editingTrainer.hourly_rate,
					experience_years: editingTrainer.experience_years,
					max_sessions_per_day: editingTrainer.max_sessions_per_day,
					is_available: editingTrainer.is_available,
					profile_photo_url: editingTrainer.profile_photo_url,
					updated_at: new Date().toISOString(),
				})
				.eq("id", editingTrainer.id);

			if (trainerError) {
				throw trainerError;
			}

			// Update profile
			const { error: profileError } = await supabase
				.from("profiles")
				.update({
					full_name: editingTrainer.full_name,
					phone: editingTrainer.phone,
					updated_at: new Date().toISOString(),
				})
				.eq("id", editingTrainer.user_id);

			if (profileError) {
				throw profileError;
			}

			toast({
				title: "Trainer Updated",
				description: `${editingTrainer.full_name}'s information has been updated.`,
			});

			setIsEditDialogOpen(false);
			setEditingTrainer(null);
			loadTrainers();
		} catch (error) {
			console.error("Error updating trainer:", error);
			toast({
				title: "Error",
				description: "Failed to update trainer. Please try again.",
				variant: "destructive",
			});
		}
	};

	const toggleTrainerAvailability = async (trainer: Trainer) => {
		try {
			const supabase = createClient();

			const { error } = await supabase
				.from("trainers")
				.update({
					is_available: !trainer.is_available,
					updated_at: new Date().toISOString(),
				})
				.eq("id", trainer.id);

			if (error) {
				throw error;
			}

			toast({
				title: "Status Updated",
				description: `${trainer.full_name} is now ${
					!trainer.is_available ? "available" : "unavailable"
				}.`,
			});

			loadTrainers();
		} catch (error) {
			console.error("Error updating trainer availability:", error);
			toast({
				title: "Error",
				description: "Failed to update trainer status.",
				variant: "destructive",
			});
		}
	};

	const handleSpecializationToggle = (
		specialization: string,
		isNew: boolean = false
	) => {
		if (isNew) {
			setNewTrainer((prev) => ({
				...prev,
				specializations: prev.specializations.includes(specialization)
					? prev.specializations.filter((s) => s !== specialization)
					: [...prev.specializations, specialization],
			}));
		} else if (editingTrainer) {
			setEditingTrainer((prev) =>
				prev
					? {
							...prev,
							specializations: prev.specializations.includes(specialization)
								? prev.specializations.filter((s) => s !== specialization)
								: [...prev.specializations, specialization],
					  }
					: prev
			);
		}
	};

	const handleCertificationToggle = (
		certification: string,
		isNew: boolean = false
	) => {
		if (isNew) {
			setNewTrainer((prev) => ({
				...prev,
				certifications: prev.certifications.includes(certification)
					? prev.certifications.filter((c) => c !== certification)
					: [...prev.certifications, certification],
			}));
		} else if (editingTrainer) {
			setEditingTrainer((prev) =>
				prev
					? {
							...prev,
							certifications: prev.certifications.includes(certification)
								? prev.certifications.filter((c) => c !== certification)
								: [...prev.certifications, certification],
					  }
					: prev
			);
		}
	};

	return (
		<div className="container mx-auto py-6 space-y-6">
			{/* Header */}
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div className="flex items-center gap-4">
					<Button variant="outline" size="icon" asChild>
						<Link href="/admin/dashboard">
							<ArrowLeft className="h-4 w-4" />
						</Link>
					</Button>
					<div>
						<h1 className="text-2xl font-bold">Trainer Management</h1>
						<p className="text-muted-foreground">
							Manage trainer profiles and information
						</p>
					</div>
				</div>
				<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
					<DialogTrigger asChild>
						<Button className="bg-orange-500 hover:bg-orange-600 text-white">
							<Plus className="mr-2 h-4 w-4" />
							Add Trainer
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>Add New Trainer</DialogTitle>
							<DialogDescription>
								Create a new trainer profile with their information and
								credentials.
							</DialogDescription>
						</DialogHeader>
						<div className="grid gap-4 py-4">
							{/* Profile Photo Upload */}
							<div className="space-y-2">
								<Label>Profile Photo</Label>
								<div className="flex items-center gap-4">
									<Avatar className="h-16 w-16">
										<AvatarImage src={newTrainer.profile_photo_url || ""} />
										<AvatarFallback>
											<Camera className="h-6 w-6 text-muted-foreground" />
										</AvatarFallback>
									</Avatar>
									<div className="flex-1">
										<input
											type="file"
											accept="image/*"
											onChange={(e) => {
												const file = e.target.files?.[0];
												if (file) {
													handleImageUpload(file, true);
												}
											}}
											className="hidden"
											id="photo-upload-new"
											disabled={isUploadingPhoto}
										/>
										<Label
											htmlFor="photo-upload-new"
											className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-md text-sm">
											<Upload className="h-4 w-4" />
											{isUploadingPhoto ? "Uploading..." : "Upload Photo"}
										</Label>
										<p className="text-xs text-muted-foreground mt-1">
											JPG, PNG or WebP. Max 5MB.
										</p>
									</div>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="full_name">Full Name</Label>
									<Input
										id="full_name"
										value={newTrainer.full_name}
										onChange={(e) =>
											setNewTrainer((prev) => ({
												...prev,
												full_name: e.target.value,
											}))
										}
										placeholder="Enter full name"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="email">Email</Label>
									<Input
										id="email"
										type="email"
										value={newTrainer.email}
										onChange={(e) =>
											setNewTrainer((prev) => ({
												...prev,
												email: e.target.value,
											}))
										}
										placeholder="Enter email"
									/>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="phone">Phone</Label>
									<PhoneInputField
										id="phone"
										value={newTrainer.phone}
										onChange={(value) =>
											setNewTrainer((prev) => ({
												...prev,
												phone: value || "",
											}))
										}
										placeholder="Enter phone number"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
									<Input
										id="hourly_rate"
										type="number"
										value={newTrainer.hourly_rate}
										onChange={(e) =>
											setNewTrainer((prev) => ({
												...prev,
												hourly_rate: parseFloat(e.target.value),
											}))
										}
										placeholder="50"
									/>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="experience_years">Experience (Years)</Label>
									<Input
										id="experience_years"
										type="number"
										value={newTrainer.experience_years}
										onChange={(e) =>
											setNewTrainer((prev) => ({
												...prev,
												experience_years: parseInt(e.target.value),
											}))
										}
										placeholder="0"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="max_sessions">Max Sessions/Day</Label>
									<Input
										id="max_sessions"
										type="number"
										value={newTrainer.max_sessions_per_day}
										onChange={(e) =>
											setNewTrainer((prev) => ({
												...prev,
												max_sessions_per_day: parseInt(e.target.value),
											}))
										}
										placeholder="8"
									/>
								</div>
							</div>
							<div className="space-y-2">
								<Label>Specializations</Label>
								<div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
									{defaultSpecializations.map((spec) => (
										<label
											key={spec}
											className="flex items-center space-x-2 text-sm">
											<input
												type="checkbox"
												checked={newTrainer.specializations.includes(spec)}
												onChange={() => handleSpecializationToggle(spec, true)}
												className="rounded border-gray-300"
											/>
											<span>{spec}</span>
										</label>
									))}
								</div>
							</div>
							<div className="space-y-2">
								<Label>Certifications</Label>
								<div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
									{defaultCertifications.map((cert) => (
										<label
											key={cert}
											className="flex items-center space-x-2 text-sm">
											<input
												type="checkbox"
												checked={newTrainer.certifications.includes(cert)}
												onChange={() => handleCertificationToggle(cert, true)}
												className="rounded border-gray-300"
											/>
											<span>{cert}</span>
										</label>
									))}
								</div>
							</div>
							<div className="space-y-2">
								<Label htmlFor="bio">Bio</Label>
								<Textarea
									id="bio"
									value={newTrainer.bio}
									onChange={(e) =>
										setNewTrainer((prev) => ({ ...prev, bio: e.target.value }))
									}
									placeholder="Enter trainer bio..."
									rows={3}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => setIsCreateDialogOpen(false)}>
								Cancel
							</Button>
							<Button
								onClick={handleCreateTrainer}
								disabled={!newTrainer.full_name || !newTrainer.email}
								className="bg-orange-500 hover:bg-orange-600 text-white">
								Create Trainer
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			{/* Filters */}
			<Card>
				<CardContent className="pt-6">
					<div className="flex flex-col md:flex-row gap-4">
						<div className="flex-1">
							<div className="relative">
								<Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Search trainers..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-9"
								/>
							</div>
						</div>
						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger className="w-full md:w-48">
								<SelectValue placeholder="Filter by status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Trainers</SelectItem>
								<SelectItem value="available">Available</SelectItem>
								<SelectItem value="unavailable">Unavailable</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* Trainers Stats */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Trainers
						</CardTitle>
						<User className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{trainers.length}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Available</CardTitle>
						<UserCheck className="h-4 w-4 text-green-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">
							{trainers.filter((t) => t.is_available).length}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Unavailable</CardTitle>
						<UserX className="h-4 w-4 text-red-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-red-600">
							{trainers.filter((t) => !t.is_available).length}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Avg Rate</CardTitle>
						<DollarSign className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							$
							{trainers.length > 0
								? Math.round(
										trainers.reduce((sum, t) => sum + t.hourly_rate, 0) /
											trainers.length
								  )
								: 0}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Trainers Table */}
			<Card>
				<CardHeader>
					<CardTitle>All Trainers</CardTitle>
					<CardDescription>
						Manage trainer profiles, specializations, and availability
					</CardDescription>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="space-y-4">
							{[...Array(5)].map((_, i) => (
								<div
									key={i}
									className="h-16 bg-gray-100 rounded animate-pulse"
								/>
							))}
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Trainer</TableHead>
									<TableHead>Specializations</TableHead>
									<TableHead>Experience</TableHead>
									<TableHead>Rate/Hour</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredTrainers.map((trainer) => (
									<TableRow key={trainer.id}>
										<TableCell>
											<div className="flex items-center gap-3">
												<Avatar>
													<AvatarImage src={trainer.profile_photo_url || ""} />
													<AvatarFallback>
														{trainer.full_name
															.split(" ")
															.map((n) => n[0])
															.join("")}
													</AvatarFallback>
												</Avatar>
												<div>
													<div className="font-medium">{trainer.full_name}</div>
													<div className="text-sm text-muted-foreground">
														{trainer.email}
													</div>
												</div>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex flex-wrap gap-1">
												{trainer.specializations.slice(0, 2).map((spec) => (
													<Badge
														key={spec}
														variant="secondary"
														className="text-xs">
														{spec}
													</Badge>
												))}
												{trainer.specializations.length > 2 && (
													<Badge variant="outline" className="text-xs">
														+{trainer.specializations.length - 2}
													</Badge>
												)}
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												<Clock className="h-3 w-3 text-muted-foreground" />
												<span className="text-sm">
													{trainer.experience_years} years
												</span>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												<DollarSign className="h-3 w-3 text-muted-foreground" />
												<span className="font-medium">
													${trainer.hourly_rate}
												</span>
											</div>
										</TableCell>
										<TableCell>
											<Badge
												variant={
													trainer.is_available ? "default" : "secondary"
												}>
												{trainer.is_available ? "Available" : "Unavailable"}
											</Badge>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<Button
													variant="outline"
													size="sm"
													onClick={() => {
														setEditingTrainer(trainer);
														setIsEditDialogOpen(true);
													}}>
													<Edit className="h-4 w-4" />
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => toggleTrainerAvailability(trainer)}>
													{trainer.is_available ? (
														<UserX className="h-4 w-4" />
													) : (
														<UserCheck className="h-4 w-4" />
													)}
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Edit Dialog */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Edit Trainer</DialogTitle>
						<DialogDescription>
							Update trainer information and credentials.
						</DialogDescription>
					</DialogHeader>
					{editingTrainer && (
						<div className="grid gap-4 py-4">
							{/* Profile Photo Upload */}
							<div className="space-y-2">
								<Label>Profile Photo</Label>
								<div className="flex items-center gap-4">
									<Avatar className="h-16 w-16">
										<AvatarImage src={editingTrainer.profile_photo_url || ""} />
										<AvatarFallback>
											<Camera className="h-6 w-6 text-muted-foreground" />
										</AvatarFallback>
									</Avatar>
									<div className="flex-1">
										<input
											type="file"
											accept="image/*"
											onChange={(e) => {
												const file = e.target.files?.[0];
												if (file) {
													handleImageUpload(file, false);
												}
											}}
											className="hidden"
											id="photo-upload-edit"
											disabled={isUploadingPhoto}
										/>
										<Label
											htmlFor="photo-upload-edit"
											className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-md text-sm">
											<Upload className="h-4 w-4" />
											{isUploadingPhoto ? "Uploading..." : "Change Photo"}
										</Label>
										<p className="text-xs text-muted-foreground mt-1">
											JPG, PNG or WebP. Max 5MB.
										</p>
									</div>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="edit_full_name">Full Name</Label>
									<Input
										id="edit_full_name"
										value={editingTrainer.full_name}
										onChange={(e) =>
											setEditingTrainer((prev) =>
												prev ? { ...prev, full_name: e.target.value } : prev
											)
										}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="edit_phone">Phone</Label>
									<PhoneInputField
										id="edit_phone"
										value={editingTrainer.phone || ""}
										onChange={(value) =>
											setEditingTrainer((prev) =>
												prev ? { ...prev, phone: value || "" } : prev
											)
										}
									/>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="edit_hourly_rate">Hourly Rate ($)</Label>
									<Input
										id="edit_hourly_rate"
										type="number"
										value={editingTrainer.hourly_rate}
										onChange={(e) =>
											setEditingTrainer((prev) =>
												prev
													? { ...prev, hourly_rate: parseFloat(e.target.value) }
													: prev
											)
										}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="edit_experience_years">
										Experience (Years)
									</Label>
									<Input
										id="edit_experience_years"
										type="number"
										value={editingTrainer.experience_years}
										onChange={(e) =>
											setEditingTrainer((prev) =>
												prev
													? {
															...prev,
															experience_years: parseInt(e.target.value),
													  }
													: prev
											)
										}
									/>
								</div>
							</div>
							<div className="space-y-2">
								<Label>Specializations</Label>
								<div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
									{defaultSpecializations.map((spec) => (
										<label
											key={spec}
											className="flex items-center space-x-2 text-sm">
											<input
												type="checkbox"
												checked={editingTrainer.specializations.includes(spec)}
												onChange={() => handleSpecializationToggle(spec, false)}
												className="rounded border-gray-300"
											/>
											<span>{spec}</span>
										</label>
									))}
								</div>
							</div>
							<div className="space-y-2">
								<Label>Certifications</Label>
								<div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
									{defaultCertifications.map((cert) => (
										<label
											key={cert}
											className="flex items-center space-x-2 text-sm">
											<input
												type="checkbox"
												checked={editingTrainer.certifications.includes(cert)}
												onChange={() => handleCertificationToggle(cert, false)}
												className="rounded border-gray-300"
											/>
											<span>{cert}</span>
										</label>
									))}
								</div>
							</div>
							<div className="space-y-2">
								<Label htmlFor="edit_bio">Bio</Label>
								<Textarea
									id="edit_bio"
									value={editingTrainer.bio}
									onChange={(e) =>
										setEditingTrainer((prev) =>
											prev ? { ...prev, bio: e.target.value } : prev
										)
									}
									rows={3}
								/>
							</div>
							<div className="space-y-2">
								<Label>Availability Status</Label>
								<Select
									value={
										editingTrainer.is_available ? "available" : "unavailable"
									}
									onValueChange={(value) =>
										setEditingTrainer((prev) =>
											prev
												? { ...prev, is_available: value === "available" }
												: prev
										)
									}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="available">Available</SelectItem>
										<SelectItem value="unavailable">Unavailable</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					)}
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setIsEditDialogOpen(false);
								setEditingTrainer(null);
							}}>
							Cancel
						</Button>
						<Button
							onClick={handleEditTrainer}
							className="bg-orange-500 hover:bg-orange-600 text-white">
							Update Trainer
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
